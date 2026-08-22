import { finalizeEvent } from 'nostr-tools'
import { getMnemonicByHash } from 'src/wallet'
import { deriveMlsKeys, deriveMlsHpkeIkms } from 'src/wallet/mls'
import * as relayService from 'src/services/nostr-chat'
import * as mls from 'src/services/mls'
import { leafToNodeIndex } from 'ts-mls/treemath.js'
import { Store } from 'src/store'
import { applyFileMarkupToMessage } from 'src/utils/chat-markup'
import {
  syncRoomToServer,
  updateRoomOnServer,
  touchRoomOnServer,
  deleteRoomOnServer,
} from './actions.js'

const MAX_MLS_MEMBERS = 50
// After this many failed process attempts across sessions, an undecodable MLS
// event is dropped permanently instead of being retried on every history fetch.
const MAX_EVENT_PROCESS_ATTEMPTS = 3

// Prefix for encrypted MLS control messages that carry group-role metadata
// (owner / admins). Members decode these (they're E2E encrypted like any other
// MLS message) and update their local room instead of showing them as a chat
// message. The leading zero-width space makes an accidental collision with
// ordinary chat text practically impossible.
const MLS_META_PREFIX = '\u200bpaytaca:mls-meta:'

// Return 'owner', 'admin', or null for the current wallet's role in a room.
function myMlsRole(ws, roomId) {
  const room = ws.rooms?.find(r => r.id === roomId)
  if (!room || room.type !== 'mls-group') return null
  const me = ws.keys?.pubKeyHex
  if (!me) return null
  if (room.owner === me) return 'owner'
  if (Array.isArray(room.admins) && room.admins.includes(me)) return 'admin'
  return null
}

// Throw unless the current wallet is the owner or an admin of the room.
function requireMlsManager(ws, roomId) {
  const role = myMlsRole(ws, roomId)
  if (role !== 'owner' && role !== 'admin') {
    throw new Error('Only the group owner or an admin can do that')
  }
  return role
}

const mlsProcessingQueues = new Map()

// Diagnostic helper: own-leaf application ratchet generation (the generation
// the next message we send for this group will use). If this does not advance
// across sends, the stored group state is not being persisted/reloaded.
function ownAppRatchetGen(clientState) {
  try {
    const nodeIndex = leafToNodeIndex(clientState.privatePath.leafIndex)
    return clientState.secretTree[nodeIndex]?.application?.generation ?? '?'
  } catch {
    return '?'
  }
}

async function withMlsProcessingLock(mlsGroupIdHex, fn) {
  const prev = mlsProcessingQueues.get(mlsGroupIdHex) || Promise.resolve()
  const next = prev.then(fn, fn)
  mlsProcessingQueues.set(mlsGroupIdHex, next.catch(() => {}))
  return next
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function getCurrentWalletHash() {
  try {
    const wallet = Store.getters['global/getWallet']('bch')
    return wallet?.walletHash || null
  } catch {
    return null
  }
}

function getWalletState(state) {
  const hash = getCurrentWalletHash()
  if (!hash) return {}
  if (!state.byWallet) return {}
  if (!state.byWallet[hash]) return {}
  return state.byWallet[hash]
}

function mlsMemberPubkeys(clientState) {
  return mls.getMlsGroupMembers(clientState).map(m => new TextDecoder().decode(m.credential.identity))
}

function decodeKeyPackageContent(content) {
  try {
    const parsed = JSON.parse(content)
    if (parsed && parsed.data && typeof parsed.data.mlsKeyPackage === 'string') {
      return base64ToBytes(parsed.data.mlsKeyPackage)
    }
  } catch {
    // Raw base64 (pre-JSON-wrapping) — keep as-is
  }
  return base64ToBytes(content)
}

// Decode an MLS event's content (NIP-78 JSON envelope) back to its original
// MLS kind and base64 MLS payload. Returns { kind, bytes } where kind is the
// original 30117/30118/30119, or { kind: null } for non-MLS 30078 events
// (e.g. KeyPackage events that arrive in the same subscription stream).
function decodeMlsEventContent(content) {
  try {
    const parsed = JSON.parse(content)
    if (parsed && parsed.data && typeof parsed.data.mlsMessage === 'string') {
      return { kind: parsed.data.mlsKind, bytes: base64ToBytes(parsed.data.mlsMessage) }
    }
  } catch {
    // Not a JSON envelope — not an MLS message
  }
  return { kind: null, bytes: null }
}

// ---- Initialization ----

export async function initMls({ commit, state, dispatch }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) throw new Error('Nostr keys not available')

  const walletHash = getCurrentWalletHash()
  const mnemonic = await getMnemonicByHash(walletHash).catch(() => null)
  if (!mnemonic) throw new Error('No mnemonic available')

  const { impl, clientConfig } = await mls.ensureMlsCrypto()

  const mlsKeys = deriveMlsKeys(mnemonic)
  const hpkeIkms = deriveMlsHpkeIkms(mnemonic)
  const nostrPubkeyHex = ws.keys.pubKeyHex

  // Preserve the current relay KeyPackage in local history before publishing a
  // new one. The relay only keeps the latest (replaceable d-tag), so when we
  // overwrite it the old ref is lost. Storing it locally lets joinMlsGroup
  // fall back to the exact KeyPackage the inviter committed to the tree.
  try {
    const currentKpEvents = await relayService.fetchMlsKeyPackage(state.relays, nostrPubkeyHex)
    for (const e of currentKpEvents) {
      commit('PUSH_MLS_KP_HISTORY', { content: e.content, publishedAt: e.created_at })
    }
  } catch {}

  const { publicPackage } = await mls.generateMlsKeyPackage(
    { publicKey: mlsKeys.publicKey, privateKey: mlsKeys.privateKey },
    nostrPubkeyHex,
    hpkeIkms,
  )

  const unsignedEvent = mls.buildMlsKeyPackageEvent(publicPackage, nostrPubkeyHex)
  const signedEvent = finalizeEvent(unsignedEvent, hexToBytes(ws.keys.privKeyHex))
  await relayService.publishEvent(state.relays, signedEvent)

  commit('PUSH_MLS_KP_HISTORY', { content: signedEvent.content, publishedAt: signedEvent.created_at })

  commit('SET_MLS_KEY_PACKAGE', {
    credentialIdentity: nostrPubkeyHex,
    publishedAt: Math.floor(Date.now() / 1000),
  })
  commit('SET_MLS_READY', true)

  // Honor our own NIP-09 deletions BEFORE subscribing/fetching history:
  // welcomes we declined on this or another device were "deleted" on the
  // relay, but relays still serve the original events. Loading the deleted
  // ids first guarantees receiveMlsMessage can filter them out.
  try {
    const deletedIds = await relayService.fetchOwnDeletionEventIds(state.relays, nostrPubkeyHex)
    if (deletedIds.size) {
      commit('MERGE_DECLINED_WELCOMES', [...deletedIds])
    }
  } catch (err) {
    console.warn('[MLS] Failed to load own deletion events:', err.message)
  }

  relayService.subscribeMlsEvents(state.relays, nostrPubkeyHex, {
    onEvent(event) {
      dispatch('receiveMlsMessage', event)
    },
  })

  relayService.fetchMlsHistory(state.relays, nostrPubkeyHex, {
    onEvent(event) {
      dispatch('receiveMlsMessage', event)
    },
  })

  // Repair pass: seedRoomsFromMessages used to mislabel MLS rooms as type
  // 'private' on Watchtower (a 2-member group's messages look like a DM when
  // the room is missing from the local list). Re-publish each active MLS room
  // so the server row carries the correct 'mls-group' metadata again.
  try {
    const mlsRooms = Object.keys(ws.mls.roomMlsMap || {})
      .map(roomId => getWalletState(state).rooms.find(r => r.id === roomId))
      .filter(Boolean)
    for (const room of mlsRooms) {
      await syncRoomToServer(room)
    }
  } catch {}
}

// ---- Group management ----

export async function createMlsGroup({ commit, state }, { name, members = [] }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) throw new Error('Nostr keys not available')
  if (!ws.mls.ready) throw new Error('MLS not initialized')

  // The creator occupies one slot; invited members fill the rest.
  if (members.length + 1 > MAX_MLS_MEMBERS) {
    throw new Error(`MLS groups are limited to ${MAX_MLS_MEMBERS} members total`)
  }

  const walletHash = getCurrentWalletHash()
  const mnemonic = await getMnemonicByHash(walletHash).catch(() => null)
  if (!mnemonic) throw new Error('No mnemonic available')

  const { impl, clientConfig } = mls.getMlsCrypto()
  const mlsKeys = deriveMlsKeys(mnemonic)
  const hpkeIkms = deriveMlsHpkeIkms(mnemonic)
  const nostrPubkeyHex = ws.keys.pubKeyHex

  const { publicPackage, privatePackage } = await mls.generateMlsKeyPackage(
    { publicKey: mlsKeys.publicKey, privateKey: mlsKeys.privateKey },
    nostrPubkeyHex,
    hpkeIkms,
  )

  const groupId = new Uint8Array(32)
  crypto.getRandomValues(groupId)
  const groupIdHex = Array.from(groupId).map(b => b.toString(16).padStart(2, '0')).join('')

  const clientState = await mls.createMlsGroup(groupId, publicPackage, privatePackage)

  {
    const members = mls.getMlsGroupMembers(clientState)
    const identities = members.map(m => new TextDecoder().decode(m.credential.identity))
    const myIdx = identities.findIndex(id => id === nostrPubkeyHex)
    if (myIdx !== -1 && clientState.privatePath.leafIndex !== myIdx) {
      throw new Error(`MLS create leafIndex mismatch: privatePath ${clientState.privatePath.leafIndex} vs tree position ${myIdx}`)
    }
  }

  const roomId = crypto.randomUUID()

  await mls.saveMlsState(groupIdHex, clientState)

  commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex: groupIdHex, clientState })
  commit('SET_MLS_ROOM_MAP', { roomId, mlsGroupIdHex: groupIdHex })

  const room = {
    id: roomId,
    type: 'mls-group',
    name: name || 'MLS Group',
    members: [nostrPubkeyHex],
    owner: nostrPubkeyHex,
    admins: [],
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
  }

  commit('ADD_ROOM', room)
  await syncRoomToServer(room)
  return { roomId, room }
}

export async function joinMlsGroup({ commit, state }, { roomId, welcomeEvent }) {
  const ws = getWalletState(state)
  if (!ws.mls.keyPackage) throw new Error('No KeyPackage — call initMls first')

  const { impl, clientConfig } = mls.getMlsCrypto()
  const walletHash = getCurrentWalletHash()
  const mnemonic = await getMnemonicByHash(walletHash).catch(() => null)
  if (!mnemonic) throw new Error('No mnemonic available')

  const hpkeIkms = deriveMlsHpkeIkms(mnemonic)
  const nostrPubkeyHex = ws.keys.pubKeyHex

  // Derive the deterministic HPKE keypairs to reconstruct the private package
  // that matches the KeyPackage published on the relay.
  const initKeys = await impl.hpke.deriveKeyPair(hpkeIkms.initIkm)
  const hpkeKeys = await impl.hpke.deriveKeyPair(hpkeIkms.hpkeIkm)

  const privatePackage = {
    initPrivateKey: await impl.hpke.exportPrivateKey(initKeys.privateKey),
    hpkePrivateKey: await impl.hpke.exportPrivateKey(hpkeKeys.privateKey),
    signaturePrivateKey: hexToBytes(deriveMlsKeys(mnemonic).privateKeyHex),
  }

  // Fetch our own published KeyPackage from the relay FIRST — it has the
  // same crypto keys (initKey, HPKE key, signature key are all deterministic)
  // and is the KeyPackage the inviter encrypted the welcome to. Regenerating
  // a fresh KeyPackage before trying would overwrite the relay one, changing
  // the ref and making the welcome undecryptable.
  const kpEvents = await relayService.fetchMlsKeyPackage(state.relays, nostrPubkeyHex)

  const { bytes: welcomeBytes } = decodeMlsEventContent(welcomeEvent.content)
  const welcome = mls.decodeWelcomeFromBytes(welcomeBytes)

  // Build candidate public packages:
  // 1. Current relay KeyPackage (the one the inviter likely committed)
  // 2. Locally-stored historical KPs (from before relay overwrites)
  // 3. Freshly derived deterministic KP as fallback
  const candidates = []
  for (const kpEvent of kpEvents) {
    const kpBytes = decodeKeyPackageContent(kpEvent.content)
    const kpMlsMessage = mls.decodeMlsMsg(kpBytes)
    if (kpMlsMessage && kpMlsMessage.wireformat === 'mls_key_package') {
      candidates.push(kpMlsMessage.keyPackage)
    }
  }
  const kpHistoryEntries = (ws.mls.kpHistory || []).filter(h => h.content)
  for (const histEntry of kpHistoryEntries) {
    const histKpBytes = decodeKeyPackageContent(histEntry.content)
    const histKpMlsMessage = mls.decodeMlsMsg(histKpBytes)
    if (histKpMlsMessage && histKpMlsMessage.wireformat === 'mls_key_package') {
      candidates.push(histKpMlsMessage.keyPackage)
    }
  }
  const mlsKeys = deriveMlsKeys(mnemonic)
  const { publicPackage: fallbackKp } = await mls.generateMlsKeyPackage(
    { publicKey: mlsKeys.publicKey, privateKey: mlsKeys.privateKey },
    nostrPubkeyHex,
    hpkeIkms,
  )
  candidates.push(fallbackKp)

  let clientState = null
  let lastErr = null
  for (const publicPackage of candidates) {
    try {
      clientState = await mls.joinMlsGroup(welcome, publicPackage, privatePackage)
      const members = mls.getMlsGroupMembers(clientState)
      const identities = members.map(m => new TextDecoder().decode(m.credential.identity))
      const myIdx = identities.findIndex(id => id === nostrPubkeyHex)
      if (myIdx !== -1 && clientState.privatePath.leafIndex !== myIdx) {
        throw new Error(`Joined but leafIndex mismatch: privatePath ${clientState.privatePath.leafIndex} vs tree position ${myIdx}`)
      }
      break
    } catch (err) {
      lastErr = err
      console.warn('[MLS] Skipping mismatched KeyPackage:', err.message)
    }
  }
  if (!clientState) {
    // Diagnose the failure: compare the welcome's expected KeyPackage refs
    // against the refs of the KeyPackages we can decrypt with. If none match,
    // the welcome was encrypted to an older KeyPackage we no longer control.
    const bytesToHex = bytes => (bytes != null) ? Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('') : ''
    const welcomeRefs = (welcome.secrets || []).map(s => bytesToHex(s.newMember))
    const ourRefs = []
    for (const kp of candidates) {
      try {
        ourRefs.push(bytesToHex(await mls.makeKeyPackageRef(kp, impl.hash)))
      } catch {
        ourRefs.push('')
      }
    }
    const anyMatch = welcomeRefs.some(wr => ourRefs.includes(wr))
    if (!anyMatch) {
      throw new Error('This invitation was encrypted to an outdated KeyPackage. Ask the inviter to send a new invitation.')
    }
    throw lastErr || new Error('Failed to join MLS group: no matching KeyPackage')
  }

  const groupIdHex = Array.from(clientState.groupContext.groupId).map(b => b.toString(16).padStart(2, '0')).join('')

  await mls.saveMlsState(groupIdHex, clientState)

  commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex: groupIdHex, clientState })
  commit('SET_MLS_ROOM_MAP', { roomId, mlsGroupIdHex: groupIdHex })

  // Add the room to the local list so it shows up on the chat index for the
  // invitee. Members are derived from the joined MLS state; the group name
  // is carried in the welcome event's "n" tag (set by the creator). Owner and
  // admins are carried in "owner"/"admin" tags so the invitee knows who
  // manages the group from the moment they join.
  const nTag = welcomeEvent.tags?.find(t => t[0] === 'n')
  const ownerTag = welcomeEvent.tags?.find(t => t[0] === 'owner')
  const adminTags = (welcomeEvent.tags || []).filter(t => t[0] === 'admin')
  const room = {
    id: roomId,
    type: 'mls-group',
    name: nTag?.[1] || 'MLS Group',
    members: mls.getMlsGroupMembers(clientState).map(m => new TextDecoder().decode(m.credential.identity)),
    owner: ownerTag?.[1] || null,
    admins: adminTags.map(t => t[1]).filter(Boolean),
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
  }
  commit('ADD_ROOM', room)
  await syncRoomToServer(room)

  return { clientState, groupIdHex }
}

export async function acceptMlsInvite({ commit, state, dispatch }, { roomId }) {
  const ws = getWalletState(state)
  const invite = ws.mls.pendingInvitations?.[roomId]
  if (!invite) throw new Error('Invitation not found')
  if (ws.mls.roomMlsMap?.[roomId]) {
    commit('REMOVE_MLS_INVITE', roomId)
    return { alreadyJoined: true }
  }
  await dispatch('joinMlsGroup', { roomId, welcomeEvent: invite.welcomeEvent })
  commit('REMOVE_MLS_INVITE', roomId)
  // Catch up on any messages sent to the group between our KeyPackage
  // publish and the moment we joined (live #p subscription may have missed
  // them, and the initial fetchMlsHistory at MLS init ran before this group
  // existed). A direct #h query for the group finds them regardless of #p.
  try {
    const mlsGroupIdHex = getWalletState(state).mls?.roomMlsMap?.[roomId]
    if (mlsGroupIdHex) {
      const events = await relayService.fetchMlsGroupEvents(state.relays, mlsGroupIdHex, 100)
      for (const event of events) {
        await dispatch('receiveMlsMessage', event)
      }
    }
  } catch {}
  return { alreadyJoined: false }
}

export async function declineMlsInvite({ commit, state }, { roomId }) {
  const ws = getWalletState(state)
  const invite = ws.mls.pendingInvitations?.[roomId]

  // Publish a kind-5 delete for the welcome event so other devices sharing
  // our keys can filter it out (relays keep serving the original event; the
  // delete is honored client-side at init). Best-effort: if the delete fails
  // the local decline still proceeds.
  if (invite?.welcomeEvent?.id) {
    try {
      const deleteEvent = finalizeEvent({
        kind: 5,
        pubkey: ws.keys.pubKeyHex,
        created_at: Math.floor(Date.now() / 1000),
        content: '',
        tags: [
          ['e', invite.welcomeEvent.id],
          ['p', ws.keys.pubKeyHex],
        ],
      }, hexToBytes(ws.keys.privKeyHex))
      await relayService.publishEvent(state.relays, deleteEvent)
    } catch (err) {
      console.warn('[MLS] Failed to publish delete for declined invite:', err.message)
    }
    // Tombstone locally so this device never re-surfaces it either.
    commit('ADD_DECLINED_WELCOME', invite.welcomeEvent.id)
  }

  commit('REMOVE_MLS_INVITE', roomId)
}

// ---- Sending messages ----

export async function sendMlsMessage({ commit, state }, { roomId, text, replyTo, recipientPubKey }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) throw new Error('Nostr keys not available')

  const mlsGroupIdHex = ws.mls.roomMlsMap[roomId]
  if (!mlsGroupIdHex) throw new Error('Unknown MLS room')

  const { impl } = mls.getMlsCrypto()

  // Send under the same per-group processing lock as receiveMlsMessage. A
  // concurrent receive can otherwise load the pre-send state and, by writing
  // it back after this send's advanced state is persisted, REVERT the sender's
  // ratchet — after which every message after the first is rejected by the
  // other side as "Desired gen in the past".
  const { event: signedEvent, created_at } = await withMlsProcessingLock(mlsGroupIdHex, async () => {
    let clientState = null
    try {
      clientState = await mls.loadMlsState(mlsGroupIdHex, impl, {})
    } catch (err) {
      console.warn('[MLS] loadMlsState threw for group', mlsGroupIdHex.slice(0, 12), ':', err.message)
    }
    if (!clientState && ws.mls.groupStates[mlsGroupIdHex]) {
      clientState = ws.mls.groupStates[mlsGroupIdHex]
    }
    if (!clientState) throw new Error('MLS group state not found')

    // Retry the publish up to MAX_SEND_ATTEMPTS times. Each attempt encrypts
    // fresh from the current state; on failure the advanced (ratchet-consumed)
    // state is rolled back first so a retry never reuses a ratchet key the
    // receiver has already seen.
    const MAX_SEND_ATTEMPTS = 3
    let signedEvent = null
    let createdAt = null
    let lastErrors = null
    for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
      const genBefore = ownAppRatchetGen(clientState)
      const { privateMessage, newState } = await mls.encryptMlsMessage(clientState, text, impl)
      // Decrypt our own senderData to confirm the generation the message actually
      // claims (the receiver's decrypt must agree with this).
      let claimedGen = '?'
      try {
        const { decryptSenderData } = await import('ts-mls/privateMessage.js')
        const sd = await decryptSenderData(privateMessage, newState.keySchedule.senderDataSecret, impl)
        claimedGen = `${sd?.leafIndex ?? '?'}/${sd?.generation ?? '?'}`
      } catch (err) {
        claimedGen = 'err:' + err.message
      }
      console.log('[MLS] send', mlsGroupIdHex.slice(0, 8), 'attempt', attempt, '| ratchet gen', genBefore, '->', ownAppRatchetGen(newState), '| claimed senderData leaf/gen:', claimedGen)

      const wrapped = mls.wrapPrivateMessage(privateMessage)
      const unsignedEvent = mls.buildMlsNostrEvent(wrapped, 30117, mlsGroupIdHex, roomId, ws.keys.pubKeyHex, mlsMemberPubkeys(clientState))
      if (recipientPubKey) {
        unsignedEvent.tags.push(['p', recipientPubKey])
      }
      signedEvent = finalizeEvent(unsignedEvent, hexToBytes(ws.keys.privKeyHex))

      // Persist the advanced (ratchet-consumed) state BEFORE publishing. If the
      // publish fails we roll the stored state back so a retry doesn't reuse a
      // ratchet key the receiver has already seen (which would make every message
      // after the first undecryptable on the other side).
      await mls.saveMlsState(mlsGroupIdHex, newState)
      commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex, clientState: newState })

      const { accepted, errors } = await relayService.publishEvent(state.relays, signedEvent)
      if (accepted.length) {
        createdAt = unsignedEvent.created_at
        break
      }

      lastErrors = errors
      await mls.saveMlsState(mlsGroupIdHex, clientState)
      commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex, clientState })
      if (attempt < MAX_SEND_ATTEMPTS) {
        console.warn(`[MLS] publish attempt ${attempt}/${MAX_SEND_ATTEMPTS} failed, retrying:`, JSON.stringify(errors))
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }

    if (!createdAt) {
      const reason = lastErrors?.[0]?.reason || 'relay rejected the message'
      console.warn('[MLS] Send rejected after', MAX_SEND_ATTEMPTS, 'attempts:', JSON.stringify(lastErrors))
      throw new Error(`MLS message was rejected by the relay: ${reason}`)
    }

    return { event: signedEvent, created_at: createdAt }
  })

  const message = {
    id: signedEvent.id,
    roomId,
    sender: ws.keys.pubKeyHex,
    content: text,
    kind: 30117,
    created_at,
    replyTo,
  }

  return { message, roomId }
}

// ---- Receiving messages ----

export async function receiveMlsMessage({ commit, state, dispatch }, event) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) return

  if (event.pubkey === ws.keys.pubKeyHex) return

  const { impl } = mls.getMlsCrypto()

  const { kind, bytes: contentBytes } = decodeMlsEventContent(event.content)
  if (!kind) return // No non-MLS 30078 events (e.g. KeyPackage events)

  if (kind === 30119) {
    const rTag = event.tags?.find(t => t[0] === 'r')
    if (rTag) {
      const roomId = rTag[1]
      // Skip if we're already a member of this room — e.g. the creator
      // processing the welcome event it published (relay echoes it back via
      // the authors subscription). Joining our own group would fail because
      // the welcome is encrypted to the invitee's KeyPackage, not ours.
      if (ws.mls.roomMlsMap?.[roomId]) return

      // Skip invitations we (or another device with our keys) already
      // declined — relays keep serving the original welcome event even after
      // the NIP-09 delete, so without this check declined invites would
      // re-appear on every history fetch.
      if (ws.mls.declinedWelcomeIds?.[event.id]) return

      // Queue an explicit invitation instead of auto-joining, so the user can
      // accept or decline it from the Invitations tab.
      const nTag = event.tags?.find(t => t[0] === 'n')
      commit('ADD_MLS_INVITE', {
        roomId,
        inviterPubKey: event.pubkey,
        name: nTag?.[1] || 'MLS Group',
        createdAt: event.created_at,
        welcomeEvent: event,
      })
    }
    return
  }

  const hTag = event.tags?.find(t => t[0] === 'h')
  if (!hTag) return
  const mlsGroupIdHex = hTag[1]

  // Undecodable-event suppression: relays re-serve history forever, so an
  // event we can never decrypt (e.g. "Desired gen in the past" after a state
  // reset) would be retried on every session. Give up after a bounded number
  // of attempts across sessions.
  const failedAttempts = ws.mls.failedEventAttempts?.[event.id]
  if (failedAttempts && failedAttempts.count >= MAX_EVENT_PROCESS_ATTEMPTS) {
    return
  }

  await withMlsProcessingLock(mlsGroupIdHex, async () => {
    let clientState = null
    try {
      clientState = await mls.loadMlsState(mlsGroupIdHex, impl, {})
    } catch (err) {
      console.warn('[MLS] loadMlsState threw for group', mlsGroupIdHex.slice(0, 12), ':', err.message)
    }
    if (!clientState && ws.mls.groupStates[mlsGroupIdHex]) {
      clientState = ws.mls.groupStates[mlsGroupIdHex]
    }
    if (!clientState) {
      // This is the classic silent failure: an MLS message arrived for a group
      // we have no local state for. No index group state / stale IndexedDB.
      console.warn(
        '[MLS] Dropping', kind, 'event', event.id.slice(0, 8),
        'from', event.pubkey.slice(0, 8),
        'for unknown group', mlsGroupIdHex.slice(0, 12),
        '— no local group state (roomMlsMap has', Object.keys(ws.mls.roomMlsMap || {}).length, 'rooms)',
      )
      return
    }

    try {
      const result = await mls.processMlsMessage(clientState, contentBytes, impl)

      await mls.saveMlsState(mlsGroupIdHex, result.newState)
      commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex, clientState: result.newState })
      commit('CLEAR_EVENT_PROCESS_FAILURES', event.id)

      if (result.plaintext) {
        const rTag = event.tags?.find(t => t[0] === 'r')
        const roomId = rTag ? rTag[1] : null

        // Encrypted group-role control message (owner/admins metadata). Apply
        // it to the room locally and don't surface it as a chat message.
        if (typeof result.plaintext === 'string' && result.plaintext.startsWith(MLS_META_PREFIX)) {
          try {
            const meta = JSON.parse(result.plaintext.slice(MLS_META_PREFIX.length))
            if (roomId && meta && (meta.owner !== undefined || meta.admins !== undefined)) {
              applyRoomRoles(commit, ws, roomId, meta)
              await updateRoomOnServer(roomId, {
                owner: meta.owner !== undefined ? meta.owner : null,
                admins: meta.admins !== undefined ? meta.admins : [],
              })
            }
          } catch {
            // Not valid JSON — fall through and show as a message.
          }
        } else if (roomId) {
          console.log(
            '[MLS] Received', kind, 'event', event.id.slice(0, 8),
            'from', event.pubkey.slice(0, 8),
            'for group', mlsGroupIdHex.slice(0, 12),
            'room', roomId?.slice(0, 8) || '(none)',
            'text:', JSON.stringify(result.plaintext.slice(0, 40)),
          )

          commit('ADD_MESSAGE', {
            roomId,
            message: applyFileMarkupToMessage({
              id: event.id,
              roomId,
              sender: event.pubkey,
              content: result.plaintext,
              kind,
              created_at: event.created_at,
            }),
          })
          const roomCount = roomId ? (ws.messages?.[roomId]?.length ?? -1) : -1
          const roomInList = roomId ? (ws.rooms || []).some(r => r.id === roomId) : false
          const amMember = roomId ? (ws.rooms || []).some(r => r.id === roomId && r.members?.includes(ws.keys?.pubKeyHex)) : false
          console.log(
            '[MLS] Added to store — room', roomId?.slice(0, 8) || '(none)',
            'messages in store for this room:', roomCount,
            'room exists in ws.rooms:', roomInList,
            'i am a member of it:', amMember,
          )
          commit('TOUCH_ROOM_LAST_MESSAGE_AT', roomId)
          if (roomId) {
            await touchRoomOnServer(roomId, new Date(event.created_at * 1000).toISOString())
          }
        }
      }
    } catch (err) {
      // Decrypt failures here are the other classic symptom: the sender's group
      // state has diverged from ours (different epoch / ratchet), so their
      // message cannot be unwrapped even though it arrived. Log our current
      // ratchet generation for the sender's leaf so a desync is visible.
      const senderRatchetGen = (() => {
        try {
          const members = mls.getMlsGroupMembers(clientState)
          const idx = members.findIndex(m => new TextDecoder().decode(m.credential.identity) === event.pubkey)
          if (idx === -1) return '?'
          return clientState.secretTree[leafToNodeIndex(idx)]?.application?.generation ?? '?'
        } catch {
          return '?'
        }
      })()
      const allRatchets = (() => {
        try {
          const members = mls.getMlsGroupMembers(clientState)
          return members.map((m, i) => {
            const id = new TextDecoder().decode(m.credential.identity).slice(0, 8)
            const leafIdx = m.leafIndex ?? i
            const gen = clientState.secretTree[leafToNodeIndex(i)]?.application?.generation ?? '?'
            return `${id}#${leafIdx}=${gen}`
          }).join(', ')
        } catch {
          return '?'
        }
      })()
      console.warn(
        '[MLS] Failed to process', kind, 'event', event.id.slice(0, 8),
        'from', event.pubkey.slice(0, 8),
        'for group', mlsGroupIdHex.slice(0, 12),
        '— our ratchet gen for that sender is', senderRatchetGen,
        '| all leaves:', allRatchets,
        '| own leafIndex:', clientState.privatePath?.leafIndex,
        ':', err.message,
      )
      commit('RECORD_EVENT_PROCESS_FAILURE', { eventId: event.id, error: err.message })
    }
  })
}

// ---- Member management ----

// Groups created before owner/admins fields existed have no owner stored. The
// deterministic owner is leaf 0 of the MLS tree, so backfill it from the tree
// when missing so role enforcement keeps working on legacy groups.
function backfillMlsOwner(commit, ws, roomId, clientState) {
  const room = ws.rooms?.find(r => r.id === roomId)
  if (!room || room.owner || !clientState) return
  try {
    const members = mls.getMlsGroupMembers(clientState)
    const leaf0 = members[0]
    if (!leaf0) return
    const owner = new TextDecoder().decode(leaf0.credential.identity)
    commit('UPDATE_ROOM', { id: roomId, owner })
  } catch {}
}

// Load an MLS group's state (falling back to the in-memory copy) and ensure the
// room's owner field is backfilled from the tree for legacy groups. Returns the
// client state (or null when none is available).
async function ensureMlsOwnerBackfilled(commit, ws, roomId, impl) {
  const mlsGroupIdHex = ws.mls.roomMlsMap?.[roomId]
  if (!mlsGroupIdHex) return null
  let clientState = null
  try {
    clientState = await mls.loadMlsState(mlsGroupIdHex, impl, {})
  } catch {
    clientState = null
  }
  if (!clientState && ws.mls.groupStates?.[mlsGroupIdHex]) {
    clientState = ws.mls.groupStates[mlsGroupIdHex]
  }
  backfillMlsOwner(commit, ws, roomId, clientState)
  return clientState
}

export async function addMlsMember({ commit, state }, { roomId, memberPubKey }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) throw new Error('Nostr keys not available')

  const mlsGroupIdHex = ws.mls.roomMlsMap[roomId]
  if (!mlsGroupIdHex) throw new Error('Unknown MLS room')

  const { impl } = mls.getMlsCrypto()

  return withMlsProcessingLock(mlsGroupIdHex, async () => {
  let clientState = await mls.loadMlsState(mlsGroupIdHex, impl, {})
  if (!clientState && ws.mls.groupStates[mlsGroupIdHex]) {
    clientState = ws.mls.groupStates[mlsGroupIdHex]
  }
  if (!clientState) throw new Error('MLS group state not found')

  backfillMlsOwner(commit, ws, roomId, clientState)

  // Only the owner or an admin may add members.
  requireMlsManager(ws, roomId)

  const currentMembers = mls.getMlsGroupMembers(clientState)
  const memberIdentities = currentMembers.map(m => new TextDecoder().decode(m.credential.identity))
  if (memberIdentities.includes(memberPubKey)) {
    return
  }
  if (currentMembers.length >= MAX_MLS_MEMBERS) {
    throw new Error(`MLS groups are limited to ${MAX_MLS_MEMBERS} members total`)
  }

  let kpEvents = await relayService.fetchMlsKeyPackage(state.relays, memberPubKey)
  if (!kpEvents.length) {
    // Replaceable events can briefly disappear during replacement — retry once
    await new Promise(r => setTimeout(r, 1500))
    kpEvents = await relayService.fetchMlsKeyPackage(state.relays, memberPubKey)
  }
  if (!kpEvents.length) throw new Error('KeyPackage not found for member')

  // Encrypt the welcome to the newest published KeyPackage — the invitee
  // tries its published packages newest-first, so this is the one it matches.
  const kpBytes = decodeKeyPackageContent(kpEvents[0].content)
  const kpMlsMessage = mls.decodeMlsMsg(kpBytes)
  if (kpMlsMessage.wireformat !== 'mls_key_package') throw new Error('Invalid KeyPackage event')
  const inviteeKeyPackage = kpMlsMessage.keyPackage

  const { newState, commit: commitMsg, welcome } = await mls.addMlsMember(clientState, inviteeKeyPackage, impl)

  {
    const members = mls.getMlsGroupMembers(newState)
    const identities = members.map(m => new TextDecoder().decode(m.credential.identity))
    const myIdx = identities.findIndex(id => id === ws.keys.pubKeyHex)
    if (myIdx !== -1 && newState.privatePath.leafIndex !== myIdx) {
      console.error('[MLS] addMlsMember produced leafIndex mismatch', { privatePath: newState.privatePath.leafIndex, myIdx, identities: identities.map(i => i.slice(0, 8)) })
      throw new Error(`MLS addMember leafIndex mismatch: privatePath ${newState.privatePath.leafIndex} vs tree position ${myIdx}`)
    }
  }

  // Guard against the stale-KeyPackage race: the invitee's device may have
  // republished a newer KeyPackage after we fetched the one we just encrypted
  // the welcome to. If the welcome's target ref doesn't match their current
  // relay KeyPackage, the invitee would never be able to decrypt it — abort
  // BEFORE publishing anything so the group epoch doesn't advance with a
  // broken invite.
  if (welcome) {
    const freshKpEvents = await relayService.fetchMlsKeyPackage(state.relays, memberPubKey)
    if (freshKpEvents.length) {
      const freshKpBytes = decodeKeyPackageContent(freshKpEvents[0].content)
      const freshKpMlsMessage = mls.decodeMlsMsg(freshKpBytes)
      const freshRef = freshKpMlsMessage?.wireformat === 'mls_key_package'
        ? Buffer.from(await mls.makeKeyPackageRef(freshKpMlsMessage.keyPackage, impl.hash)).toString('hex')
        : null
      const welcomeRefs = (welcome.secrets || []).map(s => Buffer.from(s.newMember).toString('hex'))
      if (freshRef && !welcomeRefs.includes(freshRef)) {
        throw new Error(
          'The invitee\'s KeyPackage changed while creating the invitation. ' +
          'Ask them to open Paytaca again (to publish their updated KeyPackage), then re-invite.'
        )
      }
    }
  }

  const commitEvent = mls.buildMlsNostrEvent(commitMsg, 30118, mlsGroupIdHex, roomId, ws.keys.pubKeyHex, mlsMemberPubkeys(clientState))
  const signedCommit = finalizeEvent(commitEvent, hexToBytes(ws.keys.privKeyHex))
  const commitPublish = await relayService.publishEvent(state.relays, signedCommit)
  if (!commitPublish.accepted.length) {
    const reason = commitPublish.errors[0]?.reason || 'relay rejected the commit'
    console.warn('[MLS] Commit publish rejected:', JSON.stringify(commitPublish.errors))
    throw new Error(`MLS commit was rejected by the relay: ${reason}`)
  }

  if (welcome) {
    const welcomeMlsMsg = { version: 'mls10', wireformat: 'mls_welcome', welcome }
    const welcomeUnsigned = mls.buildMlsNostrEvent(welcomeMlsMsg, 30119, mlsGroupIdHex, roomId, ws.keys.pubKeyHex)
    welcomeUnsigned.tags.push(['p', memberPubKey])
    const room = ws.rooms.find(r => r.id === roomId)
    if (room?.name) {
      welcomeUnsigned.tags.push(['n', room.name])
    }
    if (room?.owner) {
      welcomeUnsigned.tags.push(['owner', room.owner])
    }
    for (const admin of (room?.admins || [])) {
      welcomeUnsigned.tags.push(['admin', admin])
    }
    const signedWelcome = finalizeEvent(welcomeUnsigned, hexToBytes(ws.keys.privKeyHex))
    const welcomePublish = await relayService.publishEvent(state.relays, signedWelcome)
    if (!welcomePublish.accepted.length) {
      const reason = welcomePublish.errors[0]?.reason || 'relay rejected the welcome'
      console.warn('[MLS] Welcome publish rejected:', JSON.stringify(welcomePublish.errors))
      throw new Error(`MLS welcome was rejected by the relay: ${reason}`)
    }
  }

  await mls.saveMlsState(mlsGroupIdHex, newState)
  commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex, clientState: newState })

  const room = ws.rooms.find(r => r.id === roomId)
  if (room && !room.members.includes(memberPubKey)) {
    const updatedMembers = [...room.members, memberPubKey]
    commit('UPDATE_ROOM', { id: roomId, members: updatedMembers })
    await updateRoomOnServer(roomId, { members: updatedMembers })
  }
  })
}

/**
 * Return the pubkeys of members who have completed the MLS join handshake
 * (present in the group's tree), or null when the room has no MLS state.
 * Used by Group Info to distinguish joined vs invited-pending members.
 */
export async function getMlsGroupMemberPubkeys({ commit, state }, { roomId }) {
  const ws = getWalletState(state)
  const mlsGroupIdHex = ws.mls?.roomMlsMap?.[roomId]
  if (!mlsGroupIdHex) return null
  const { impl } = mls.getMlsCrypto()
  let clientState = await mls.loadMlsState(mlsGroupIdHex, impl, {})
  if (!clientState && ws.mls.groupStates[mlsGroupIdHex]) {
    clientState = ws.mls.groupStates[mlsGroupIdHex]
  }
  if (!clientState) return null
  backfillMlsOwner(commit, ws, roomId, clientState)
  return mls.getMlsGroupMembers(clientState).map(m => new TextDecoder().decode(m.credential.identity))
}

export async function removeMlsMember({ commit, state }, { roomId, memberPubkey }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) throw new Error('Nostr keys not available')

  const mlsGroupIdHex = ws.mls.roomMlsMap[roomId]
  if (!mlsGroupIdHex) throw new Error('Unknown MLS room')

  const { impl } = mls.getMlsCrypto()

  let clientState = await mls.loadMlsState(mlsGroupIdHex, impl, {})
  if (!clientState && ws.mls.groupStates[mlsGroupIdHex]) {
    clientState = ws.mls.groupStates[mlsGroupIdHex]
  }
  if (!clientState) throw new Error('MLS group state not found')

  backfillMlsOwner(commit, ws, roomId, clientState)

  // Only the owner or an admin may remove members.
  const myRole = requireMlsManager(ws, roomId)

  const room = ws.rooms.find(r => r.id === roomId)
  const owner = room?.owner
  const admins = room?.admins || []

  // The owner cannot be removed by an admin; only the owner themselves may
  // (and they leave via leaveMlsGroup, not this action).
  if (owner && memberPubkey === owner) {
    throw new Error('The group owner cannot be removed')
  }
  // Only the owner may remove an admin.
  if (myRole === 'admin' && admins.includes(memberPubkey)) {
    throw new Error('Only the group owner can remove an admin')
  }

  const members = mls.getMlsGroupMembers(clientState)
  let leafIndex = -1
  for (let i = 0; i < members.length; i++) {
    const identity = new TextDecoder().decode(members[i].credential.identity)
    if (identity === memberPubkey) {
      leafIndex = i
      break
    }
  }
  if (leafIndex === -1) throw new Error('Member not found in MLS group')

  const { newState, commit: commitMsg } = await mls.removeMlsMember(clientState, leafIndex, impl)

  const commitEvent = mls.buildMlsNostrEvent(commitMsg, 30118, mlsGroupIdHex, roomId, ws.keys.pubKeyHex, mlsMemberPubkeys(clientState))
  const signedCommit = finalizeEvent(commitEvent, hexToBytes(ws.keys.privKeyHex))
  await relayService.publishEvent(state.relays, signedCommit)

  await mls.saveMlsState(mlsGroupIdHex, newState)
  commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex, clientState: newState })

  if (room) {
    const updatedMembers = room.members.filter(m => m !== memberPubkey)
    commit('UPDATE_ROOM', { id: roomId, members: updatedMembers, admins: (room.admins || []).filter(a => a !== memberPubkey) })
    await updateRoomOnServer(roomId, { members: updatedMembers, admins: (room.admins || []).filter(a => a !== memberPubkey) })
  }
}

// ---- Encrypted group-role control messages ----

/**
 * Broadcast the current owner/admins of an MLS group to all members as an
 * encrypted MLS application message (kind 30117). Members decrypt it and apply
 * it to their local room; it is never shown as a chat message. Called after any
 * role change (make/remove admin, transfer owner, owner leaves to a successor).
 */
export async function broadcastMlsRoomRoles({ commit, state }, { roomId }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) throw new Error('Nostr keys not available')

  const mlsGroupIdHex = ws.mls.roomMlsMap[roomId]
  if (!mlsGroupIdHex) throw new Error('Unknown MLS room')

  const { impl } = mls.getMlsCrypto()
  await ensureMlsOwnerBackfilled(commit, ws, roomId, impl)

  const room = ws.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')

  const meta = {
    owner: room.owner || null,
    admins: room.admins || [],
  }
  const text = MLS_META_PREFIX + JSON.stringify(meta)

  // Reuse sendMlsMessage so ratchet/persist/retry semantics stay identical.
  // replyTo defaults undefined; recipientPubKey omitted (broadcast to all).
  const { message } = await sendMlsMessage({ commit, state }, { roomId, text })
  // sendMlsMessage surfaces the control message through receiveMlsMessage on
  // our own relay subscription too; don't add it to the visible timeline here.
  void message
}

/**
 * Apply a role control payload to a room. Shared by receiveMlsMessage (from
 * the wire) and local role mutations (optimistic apply before broadcasting).
 */
function applyRoomRoles(commit, ws, roomId, meta) {
  if (!roomId || !meta) return
  if (meta.owner === undefined && meta.admins === undefined) return
  const room = ws.rooms?.find(r => r.id === roomId)
  if (!room) return
  commit('UPDATE_ROOM', {
    id: roomId,
    owner: meta.owner !== undefined ? (meta.owner || null) : room.owner,
    admins: meta.admins !== undefined ? (Array.isArray(meta.admins) ? meta.admins : []) : room.admins,
  })
}

/**
 * Grant or revoke admin rights for a member. Only the owner may change admin
 * status. After applying locally, the new role set is broadcast to all members
 * as an encrypted control message.
 */
export async function setMlsAdmin({ commit, state }, { roomId, memberPubKey, isAdmin }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) throw new Error('Nostr keys not available')

  const mlsGroupIdHex = ws.mls.roomMlsMap[roomId]
  if (!mlsGroupIdHex) throw new Error('Unknown MLS room')

  const { impl } = mls.getMlsCrypto()

  // Backfill owner from the tree for legacy groups created before the field
  // existed, so the role gate below still resolves the real owner.
  await ensureMlsOwnerBackfilled(commit, ws, roomId, impl)

  // Only the owner may change admin status.
  if (myMlsRole(ws, roomId) !== 'owner') {
    throw new Error('Only the group owner can change admin roles')
  }

  const room = ws.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')
  if (!room.members?.includes(memberPubKey)) throw new Error('Member not in group')

  // An admin who is removed is just reverted to a regular member; the owner
  // can never be listed as an admin.
  let admins = room.admins || []
  if (isAdmin) {
    if (memberPubKey === room.owner) throw new Error('The group owner is already the owner')
    if (!admins.includes(memberPubKey)) admins = [...admins, memberPubKey]
  } else {
    admins = admins.filter(a => a !== memberPubKey)
  }

  const meta = { owner: room.owner, admins }
  applyRoomRoles(commit, ws, roomId, meta)
  await updateRoomOnServer(roomId, meta)
  await broadcastMlsRoomRoles({ commit, state }, { roomId })
}

/**
 * Transfer ownership to another member. Only the current owner may do this;
 * the recipient must be a current member (any role). The previous owner becomes
 * a regular member unless they are also an admin. The new role set is broadcast
 * to all members.
 */
export async function transferMlsOwnership({ commit, state }, { roomId, newOwnerPubKey }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) throw new Error('Nostr keys not available')

  const mlsGroupIdHex = ws.mls.roomMlsMap[roomId]
  if (!mlsGroupIdHex) throw new Error('Unknown MLS room')

  const { impl } = mls.getMlsCrypto()
  await ensureMlsOwnerBackfilled(commit, ws, roomId, impl)

  if (myMlsRole(ws, roomId) !== 'owner') {
    throw new Error('Only the group owner can transfer ownership')
  }

  const room = ws.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')
  if (!room.members?.includes(newOwnerPubKey)) throw new Error('New owner must be a group member')

  const oldOwner = room.owner
  if (oldOwner === newOwnerPubKey) return

  // Previous owner drops to a regular member (unless also an admin); the new
  // owner is removed from the admin list (they now hold the owner role).
  const admins = (room.admins || [])
    .filter(a => a !== newOwnerPubKey)
    .concat(oldOwner && (room.admins || []).includes(oldOwner) ? [oldOwner] : [])

  const meta = { owner: newOwnerPubKey, admins }
  applyRoomRoles(commit, ws, roomId, meta)
  await updateRoomOnServer(roomId, meta)
  await broadcastMlsRoomRoles({ commit, state }, { roomId })
}

export async function leaveMlsGroup({ commit, state, dispatch }, { roomId, successorPubKey }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) return

  const mlsGroupIdHex = ws.mls.roomMlsMap[roomId]
  if (!mlsGroupIdHex) return

  // Backfill the owner for legacy groups so the successor handoff below fires
  // even when the owner field predates the roles feature.
  const { impl } = mls.getMlsCrypto()
  await ensureMlsOwnerBackfilled(commit, ws, roomId, impl)

  const room = ws.rooms.find(r => r.id === roomId)

  // If the owner leaves, ownership must transfer to a designated successor
  // (the UI only offers admins). Broadcast the role change before departing so
  // the remaining members know who manages the group.
  if (room?.type === 'mls-group' && room.owner === ws.keys.pubKeyHex) {
    if (!successorPubKey) {
      throw new Error('The group owner must choose a successor before leaving')
    }
    if (!room.members?.includes(successorPubKey)) {
      throw new Error('The new owner must be a group member')
    }
    const admins = (room.admins || [])
      .filter(a => a !== successorPubKey)
      .concat((room.admins || []).includes(ws.keys.pubKeyHex) ? [ws.keys.pubKeyHex] : [])
    const meta = { owner: successorPubKey, admins }
    applyRoomRoles(commit, ws, roomId, meta)
    await updateRoomOnServer(roomId, meta)
    await broadcastMlsRoomRoles({ commit, state }, { roomId })
  }

  let clientState = await mls.loadMlsState(mlsGroupIdHex, impl, {})
  if (clientState && ws.mls.groupStates[mlsGroupIdHex]) {
    clientState = ws.mls.groupStates[mlsGroupIdHex]
  }

  if (clientState) {
    const ownLeaf = mls.getOwnLeafIndex(clientState)
    if (ownLeaf !== -1) {
      try {
        const { newState, commit: commitMsg } = await mls.removeMlsMember(clientState, ownLeaf, impl)
        const commitEvent = mls.buildMlsNostrEvent(commitMsg, 30118, mlsGroupIdHex, roomId, ws.keys.pubKeyHex, mlsMemberPubkeys(clientState))
        const signedCommit = finalizeEvent(commitEvent, hexToBytes(ws.keys.privKeyHex))
        await relayService.publishEvent(state.relays, signedCommit)
        await mls.saveMlsState(mlsGroupIdHex, newState)
      } catch (err) {
        console.warn('[MLS] Failed to self-remove:', err.message)
      }
    }
  }

  await mls.removeMlsState(mlsGroupIdHex)
  commit('CLEAR_MLS_GROUP_STATE', mlsGroupIdHex)
  commit('REMOVE_MLS_ROOM_MAP', roomId)

  if (room) {
    commit('REMOVE_ROOM', roomId)
  }
  await deleteRoomOnServer(roomId)
}

// ---- Helpers ----

function base64ToBytes(str) {
  const bin = atob(str)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i)
  }
  return bytes
}