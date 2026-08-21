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
  // is carried in the welcome event's "n" tag (set by the creator).
  const nTag = welcomeEvent.tags?.find(t => t[0] === 'n')
  const room = {
    id: roomId,
    type: 'mls-group',
    name: nTag?.[1] || 'MLS Group',
    members: mls.getMlsGroupMembers(clientState).map(m => new TextDecoder().decode(m.credential.identity)),
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

  // Publish a kind-5 delete for the welcome event so the stale invitation
  // doesn't re-sync to other devices. Best-effort: if the delete fails the
  // local decline still proceeds.
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

      if (result.plaintext) {
        const rTag = event.tags?.find(t => t[0] === 'r')
        const roomId = rTag ? rTag[1] : null

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

      // Guard: a re-key commit we cannot process, on a group WE also re-keyed
      // to the same epoch, is the signature of a competing re-key. Two members
      // each built an empty commit on the same base epoch, so both reached the
      // same epoch number but with divergent trees — neither can ever process
      // the other's commit. The group is permanently split and no further
      // re-keying can recover it.
      if (
        kind === 30118 &&
        ws.mls.rekeyEpochs?.[mlsGroupIdHex] != null &&
        clientState.groupContext?.epoch === ws.mls.rekeyEpochs[mlsGroupIdHex] &&
        !ws.mls.splitGroups?.[mlsGroupIdHex]
      ) {
        commit('MARK_MLS_GROUP_SPLIT', mlsGroupIdHex)
        console.error(
          '[MLS] Competing re-key detected for group', mlsGroupIdHex.slice(0, 12),
          '— another member also re-keyed to the same epoch. Group is split and cannot be recovered by re-keying. Re-create the group or re-invite members.',
        )
      }
    }
  })
}

// ---- Member management ----

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
 * Re-key the group: commit an empty update path, advancing the epoch and
 * resetting all application ratchets. This recovers a group whose ratchets
 * have diverged between members (e.g. after a stale-state race left one
 * member's ratchet ahead, causing every message after the first to fail with
 * "Desired gen in the past"). All members that process the commit get fresh
 * ratchets and messaging resumes in both directions.
 */
export async function rekeyMlsGroup({ commit, state }, { roomId }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) throw new Error('Nostr keys not available')

  const mlsGroupIdHex = ws.mls.roomMlsMap[roomId]
  if (!mlsGroupIdHex) throw new Error('Unknown MLS room')

  const { impl } = mls.getMlsCrypto()

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
    if (!clientState) throw new Error('MLS group state not found')

    // Only one member may re-key a group. A re-key is an empty commit built on
    // this member's current epoch; every OTHER member must be on that same
    // epoch and apply it to converge. If a second member concurrently re-keys
    // from the same epoch, both advance to the same epoch but with divergent
    // trees, and neither can ever process the other's commit — the group is
    // permanently split. Guard against re-keying a group we already marked split.
    if (ws.mls.splitGroups?.[mlsGroupIdHex]) {
      throw new Error('This group is split (a competing re-key was detected) and cannot be fixed by re-keying. Re-create the group or re-invite members instead.')
    }

    const { newState, commit: commitMsg } = await mls.rekeyMlsGroup(clientState, impl)

    const commitEvent = mls.buildMlsNostrEvent(commitMsg, 30118, mlsGroupIdHex, roomId, ws.keys.pubKeyHex, mlsMemberPubkeys(clientState))
    const signedCommit = finalizeEvent(commitEvent, hexToBytes(ws.keys.privKeyHex))
    const publish = await relayService.publishEvent(state.relays, signedCommit)
    if (!publish.accepted.length) {
      const reason = publish.errors[0]?.reason || 'relay rejected the commit'
      console.warn('[MLS] Re-key commit rejected:', JSON.stringify(publish.errors))
      throw new Error(`MLS re-key commit was rejected by the relay: ${reason}`)
    }

    await mls.saveMlsState(mlsGroupIdHex, newState)
    commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex, clientState: newState })
    commit('SET_MLS_REKEY_EPOCH', { mlsGroupIdHex, epoch: newState.groupContext.epoch })
  })
}

// ---- Diagnostics ----

/**
 * Gather a structured diagnostic report for an MLS group and log it to the
 * console. Pulls local state, IndexedDB group state, the MLS member tree
 * (with per-leaf ratchet generations), compares it against the room's member
 * list, checks live subscription health, and queries the relays for recent
 * events addressed to the group (#h) so we can tell whether a missing message
 * is a publish/transport failure vs a local decrypt/state failure.
 * @returns {Promise<object>} the report (also console.log'ed)
 */
export async function diagnoseMlsGroup({ state, dispatch }, { roomId }) {
  const ws = getWalletState(state)
  const myPub = ws.keys?.pubKeyHex
  const relays = state.relays || []

  const report = {
    at: new Date().toISOString(),
    roomId,
    myPubKey: myPub ? `${myPub.slice(0, 8)}…` : null,
    roomType: null,
    mlsGroupIdHex: null,
    local: {},
    ws: {},
    tree: {},
    members: {},
    subscription: null,
    relay: {},
    findings: [],
  }

  const room = (ws.rooms || []).find(r => r.id === roomId)
  report.roomType = room?.type || null
  const roomMembers = room?.members || []

  const mlsGroupIdHex = ws.mls?.roomMlsMap?.[roomId]
  report.mlsGroupIdHex = mlsGroupIdHex

  report.local = {
    roomExists: !!room,
    roomMemberCount: roomMembers.length,
    roomMembers: roomMembers.map(m => `${m.slice(0, 8)}…`),
    inRoomMemberList: myPub ? roomMembers.includes(myPub) : false,
    hasGroupState: mlsGroupIdHex ? !!ws.mls?.groupStates?.[mlsGroupIdHex] : false,
    rekeyEpoch: mlsGroupIdHex ? (ws.mls?.rekeyEpochs?.[mlsGroupIdHex] ?? null) : null,
    split: mlsGroupIdHex ? !!ws.mls?.splitGroups?.[mlsGroupIdHex] : false,
  }

  if (report.local.split) {
    report.findings.push('group is marked SPLIT by a competing re-key — unrecoverable, recreate or re-invite members')
  }

  let clientState = null
  if (mlsGroupIdHex) {
    try {
      const { impl } = mls.getMlsCrypto()
      clientState = await mls.loadMlsState(mlsGroupIdHex, impl, {})
      report.ws = {
        hasState: !!clientState,
        epoch: clientState?.groupContext?.epoch?.toString() ?? null,
        ownLeafIndex: clientState?.privatePath?.leafIndex ?? null,
        loadError: null,
      }
    } catch (err) {
      report.ws = { hasState: false, loadError: err.message }
    }
  } else {
    report.ws = { hasState: false, loadError: 'no mlsGroupIdHex for room' }
  }

  if (clientState) {
    const members = mls.getMlsGroupMembers(clientState)
    const identities = members.map(m => new TextDecoder().decode(m.credential?.identity || new Uint8Array()))
    report.tree = {
      memberCount: members.length,
      members: identities.map(i => `${i.slice(0, 8)}…`),
    }

    const ratchets = []
    for (let i = 0; i < identities.length; i++) {
      const gen = clientState.secretTree?.[leafToNodeIndex(i)]?.application?.generation ?? '?'
      ratchets.push({ leafIndex: i, identity: `${identities[i].slice(0, 8)}…`, ratchetGen: gen })
    }
    report.tree.ratchets = ratchets

    // Compare tree membership against room member list.
    const treeSet = new Set(identities)
    const roomSet = new Set(roomMembers)
    const inTreeNotRoom = identities.filter(i => !roomSet.has(i))
    const inRoomNotTree = roomMembers.filter(m => !treeSet.has(m))
    report.members = {
      inTreeNotRoom: inTreeNotRoom.map(m => `${m.slice(0, 8)}…`),
      inRoomNotTree: inRoomNotTree.map(m => `${m.slice(0, 8)}…`),
      selfInTree: myPub ? treeSet.has(myPub) : false,
    }
    if (inTreeNotRoom.length) report.findings.push(`MLS tree has ${inTreeNotRoom.length} member(s) absent from the room list`)
    if (inRoomNotTree.length) report.findings.push(`room list has ${inRoomNotTree.length} member(s) absent from the MLS tree — they will not receive messages`)
    if (myPub && !treeSet.has(myPub)) report.findings.push('your pubkey is NOT in the MLS tree — you are not an MLS member of this group')
    if (myPub && treeSet.has(myPub)) {
      const myIndexInTree = identities.findIndex(id => id === myPub)
      const ownLeaf = clientState.privatePath?.leafIndex
      if (ownLeaf != null && myIndexInTree !== -1 && ownLeaf !== myIndexInTree) {
        report.findings.push(`leaf-index mismatch: privatePath leafIndex is ${ownLeaf} but your identity is at tree position ${myIndexInTree} — private keys are for the WRONG leaf (stale KeyPackage at join). Group must be recreated.`)
      }
    }
  }

  report.subscription = relayService.getMlsSubscriptionStatus()

  // Query the relays for events addressed to this group.
  if (mlsGroupIdHex) {
    const events = await relayService.fetchMlsGroupEvents(relays, mlsGroupIdHex, 100)
    const byAuthor = {}
    const byKind = {}
    const messagesFromOthers = []
    const storedMessageIds = new Set((ws.messages?.[roomId] || []).map(m => m.id))
    for (const e of events) {
      const { kind } = decodeMlsEventContent(e.content)
      byKind[kind] = (byKind[kind] || 0) + 1
      const author = `${e.pubkey.slice(0, 8)}…`
      byAuthor[author] = (byAuthor[author] || 0) + 1
      if (kind === 30117 && e.pubkey !== myPub) {
        const pTags = (e.tags || []).filter(t => t[0] === 'p').map(t => t[1])
        const rTag = (e.tags || []).find(t => t[0] === 'r')?.[1] || null
        messagesFromOthers.push({
          id: e.id.slice(0, 8),
          fullId: e.id,
          author,
          createdAt: new Date(e.created_at * 1000).toISOString(),
          storedInRoom: storedMessageIds.has(e.id),
          hasMyPtag: pTags.includes(myPub),
          rTag: rTag ? `${rTag.slice(0, 8)}…` : null,
          rTagMatchesRoom: rTag === roomId,
        })
      }
    }
    report.relay = {
      relayCount: relays.length,
      eventCount: events.length,
      byAuthor,
      byKind,
      hasMyPubkeyAsPtag: events.some(e => (e.tags || []).some(t => t[0] === 'p' && t[1] === myPub)),
      messagesFromOthers,
    }
    if (report.relay.eventCount === 0) {
      report.findings.push('no kind-30078 events found on the relay for this group (#h) — the other member may not have published here, or is on different relays')
    }
    if (report.relay.hasMyPubkeyAsPtag === false && report.relay.eventCount > 0) {
      report.findings.push('relay has group events but none include your pubkey as a #p — you will not be subscribed to them')
    }
    const undelivered = messagesFromOthers.filter(m => !m.storedInRoom)
    if (undelivered.length) {
      report.findings.push(`${undelivered.length} message(s) from other member(s) are ON the relay but NOT in your local room — they are being dropped between subscription and store (likely a decrypt/ratchet failure). Check the [MLS] Failed to process logs.`)
    }
    if (messagesFromOthers.length && !undelivered.length) {
      report.findings.push('all relayed messages from other members are present in the local store — any missing messages were never published to the shared relay')
    }

    // Decisive test: attempt to actually process the oldest undelivered
    // message from another member with our current group state. This is the
    // exact path receiveMlsMessage runs, so it pinpoints whether the failure
    // is decrypt/state divergence (throws) vs. the event never reaching us.
    // Only test undelivered events — re-processing an already-stored message
    // would fail with "gen in the past" even when healthy.
    if (clientState) {
      const { impl } = mls.getMlsCrypto()
      const undeliveredEvents = events.filter(e => e.pubkey !== myPub && !storedMessageIds.has(e.id))
      const otherMsgs = undeliveredEvents
        .map(e => ({ e, kind: decodeMlsEventContent(e.content).kind }))
        .filter(x => x.kind === 30117)
        .sort((a, b) => a.e.created_at - b.e.created_at)
      const latest = otherMsgs[0]
      if (latest) {
        let decryptTest = null
        try {
          const res = await mls.processMlsMessage(clientState, decodeMlsEventContent(latest.e.content).bytes, impl)
          decryptTest = {
            ok: true,
            actionTaken: res.actionTaken ?? null,
            plaintextPreview: res.plaintext ? JSON.stringify(res.plaintext.slice(0, 40)) : null,
            usedStateEpoch: clientState.groupContext?.epoch?.toString() ?? null,
          }
        } catch (err) {
          decryptTest = {
            ok: false,
            error: err.message,
            epoch: clientState.groupContext?.epoch?.toString() ?? null,
            ratchetGens: (() => {
              try {
                const members = mls.getMlsGroupMembers(clientState)
                return members.map((m, i) => {
                  const id = new TextDecoder().decode(m.credential?.identity || new Uint8Array()).slice(0, 8)
                  return `${id}@${leafToNodeIndex(i)}=${clientState.secretTree?.[leafToNodeIndex(i)]?.application?.generation ?? '?'}`
                })
              } catch { return '?' }
            })(),
          }
        }
        report.relay.decryptTest = decryptTest
        if (decryptTest.ok) {
          report.findings.push('your current group state CAN decrypt the other member\'s undelivered message — it would appear in the room if processed. Missing display is likely a store/filter issue, not crypto.')
        } else {
          report.findings.push('your group state CANNOT decrypt the other member\'s latest undelivered message: ' + decryptTest.error + '. This is state divergence — recreate the group or re-invite members (re-keying will NOT fix an epoch/ratchet split).')
        }
        if (decryptTest?.ok && undelivered.length) {
          let repaired = 0
          for (const m of undelivered) {
            const evt = events.find(e => e.id.slice(0, 8) === m.id)
            if (evt) {
              try { await dispatch('receiveMlsMessage', evt); repaired++ } catch {}
            }
          }
          if (repaired) report.findings.push(`auto-repaired ${repaired} missed message(s) — re-ran receiveMlsMessage; check the conversation for "Testing 1".`)
        }
      }
    }
  }

  console.log('[MLS-DIAG] diagnostic for room', roomId, JSON.stringify(report, null, 2))
  return report
}

export async function resetMlsForTesting({ commit }) {
  commit('RESET_MLS_WALLET_DATA')
  try {
    await mls.clearAllMlsStates()
    console.log('[MLS] Cleared all MLS data: vuex + IndexedDB')
  } catch (err) {
    console.warn('[MLS] clearAllMlsStates failed:', err.message)
  }
  return { ok: true }
}

/**
 * Re-invite a member who's already in the group (e.g. whose stale welcome
 * couldn't be decrypted). Removes them (which advances the epoch) then
 * re-adds them, re-fetching their current KeyPackage so the new welcome is
 * encrypted to keys they actually hold. Stale welcomes for that member are
 * also deleted from the relay. Best-effort: if the re-add fails, the member
 * stays removed so the creator can retry or re-create.
 */
export async function reinviteMlsMember({ commit, state }, { roomId, memberPubkey }) {
  const ws = getWalletState(state)

  // Delete the stale welcomes we published for this member first, so the
  // freshly-published welcome isn't caught up in the cleanup. Best-effort.
  try {
    const staleWelcomes = await relayService.fetchMlsWelcomeEvents(state.relays, ws.keys.pubKeyHex, memberPubkey)
    for (const welcome of staleWelcomes) {
      const deleteEvent = finalizeEvent({
        kind: 5,
        pubkey: ws.keys.pubKeyHex,
        created_at: Math.floor(Date.now() / 1000),
        content: '',
        tags: [
          ['e', welcome.id],
          ['p', ws.keys.pubKeyHex],
        ],
      }, hexToBytes(ws.keys.privKeyHex))
      await relayService.publishEvent(state.relays, deleteEvent)
    }
  } catch (err) {
    console.warn('[MLS] Failed to delete stale welcomes on re-invite:', err.message)
  }

  await removeMlsMember({ commit, state }, { roomId, memberPubkey })
  await addMlsMember({ commit, state }, { roomId, memberPubKey: memberPubkey })
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

  const room = ws.rooms.find(r => r.id === roomId)
  if (room) {
    const updatedMembers = room.members.filter(m => m !== memberPubkey)
    commit('UPDATE_ROOM', { id: roomId, members: updatedMembers })
    await updateRoomOnServer(roomId, { members: updatedMembers })
  }
}

export async function leaveMlsGroup({ commit, state, dispatch }, { roomId }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) return

  const mlsGroupIdHex = ws.mls.roomMlsMap[roomId]
  if (!mlsGroupIdHex) return

  const { impl } = mls.getMlsCrypto()
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
  commit('CLEAR_MLS_REKEY_EPOCH', mlsGroupIdHex)

  const room = ws.rooms.find(r => r.id === roomId)
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