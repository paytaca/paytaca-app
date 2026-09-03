import { finalizeEvent, nip59, getEventHash } from 'nostr-tools'
import { getMnemonicByHash } from 'src/wallet'
import { deriveMlsKeys, deriveMlsHpkeIkms } from 'src/wallet/mls'
import { unwrapGiftWrap } from 'src/wallet/nostr'
import * as relayService from 'src/services/nostr-chat'
import * as mls from 'src/services/mls'
import { leafToNodeIndex } from 'ts-mls/treemath.js'
import { Store } from 'src/store'
import { applyFileMarkupToMessage } from 'src/utils/chat-markup'
import { hexToBytes, bytesToHex, randomUUID } from 'src/utils/encoding'
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
  const room = ws.rooms?.find((r) => r.id === roomId)
  if (!room) return null
  if (room.owner === ws.keys.pubKeyHex) return 'owner'
  if (room.admins?.includes(ws.keys.pubKeyHex)) return 'admin'
  return 'regular'
}

function requireMlsManager(ws, roomId) {
  const role = myMlsRole(ws, roomId)
  if (role !== 'owner' && role !== 'admin') {
    throw new Error('Only the group owner or an admin can perform this action.')
  }
  return role
}

const RECENTLY_SENT_TTL_MS = 5 * 60 * 1000
const recentlySentEvents = new Map() // eventId → timestamp (own published events)

function markRecentlySent(eventId) {
  if (eventId) recentlySentEvents.set(eventId, Date.now())
}

function isRecentlySent(eventId) {
  const t = recentlySentEvents.get(eventId)
  if (!t) return false
  if (Date.now() - t > RECENTLY_SENT_TTL_MS) {
    recentlySentEvents.delete(eventId)
    return false
  }
  return true
}

// Own app ratchet generation helper via the ClientState secret tree. Used for
// send/receive divergence diagnostics.
function ownAppRatchetGen(clientState) {
  try {
    if (!clientState?.privatePath?.leafIndex || !clientState.secretTree) return '?'
    const nodeIndex = leafToNodeIndex(clientState.privatePath.leafIndex)
    return clientState.secretTree[nodeIndex]?.application?.generation ?? '?'
  } catch {
    return '?'
  }
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
  if (!hash) return null
  return state.byWallet?.[hash] || null
}

function mlsMemberPubkeys(clientState) {
  return mls.getMlsGroupMembers(clientState).map((m) => {
    const identity = m.credential?.identity || m.identityBytes
    return identity instanceof Uint8Array ? new TextDecoder().decode(identity) : identity
  })
}

// Resolve the identity at a given MLS leaf index. NIP-EE envelopes are signed
// with an ephemeral key, so the leaf credential is the only trustworthy sender
// identity.
function memberIdentityAt(clientState, leafIndex) {
  if (leafIndex == null || leafIndex < 0 || !clientState) return null
  try {
    const members = mls.getMlsGroupMembers(clientState)
    const member = members[leafIndex]
    if (!member) return null
    const identity = member.credential?.identity || member.identityBytes
    if (!(identity instanceof Uint8Array)) return null
    return new TextDecoder().decode(identity)
  } catch {
    return null
  }
}

// Decode a kind-443 content hex payload into an MLS KeyPackage object.
function decodeNipEeKeyPackage(content) {
  try {
    if (
      typeof content !== 'string' ||
      !content.length ||
      content.length % 2 !== 0 ||
      /[^0-9a-f]/i.test(content)
    ) {
      return null
    }
    const mlsMsg = mls.decodeMlsMsg(hexToBytes(content))
    return mlsMsg?.wireformat === 'mls_key_package' ? mlsMsg.keyPackage : null
  } catch {
    return null
  }
}

// The nostr_group_id of a group, read from the 0xF2EE group extension.
function nostrGroupIdHexFromState(clientState) {
  try {
    const ext = clientState?.groupContext?.extensions?.find(
      (e) => e.extensionType === mls.NOSTR_GROUP_DATA_EXTENSION_TYPE
    )
    if (!ext) return null
    return mls.parseNipEeGroupData(ext.extensionData)?.nostrGroupIdHex || null
  } catch {
    return null
  }
}

// Given a NIP-EE nostr_group_id (h tag), resolve the local MLS group id.
function resolveMlsGroupIdHex(ws, nostrGroupIdHex) {
  if (!nostrGroupIdHex) return null
  for (const [roomId, nHex] of Object.entries(ws.mls.roomMlsNostrMap || {})) {
    if (nHex === nostrGroupIdHex) return ws.mls.roomMlsMap?.[roomId] || null
  }
  for (const [gHex, st] of Object.entries(ws.mls.groupStates || {})) {
    if (st && nostrGroupIdHexFromState(st) === nostrGroupIdHex) return gHex
  }
  return null
}

function resolveRoomIdByMlsGroupId(ws, mlsGroupIdHex) {
  for (const [roomId, gHex] of Object.entries(ws.mls.roomMlsMap || {})) {
    if (gHex === mlsGroupIdHex) return roomId
  }
  return null
}

// Build (and optionally finalize) a signed NIP-EE group event (kind 445) for
// an MLSMessage. The event is encrypted+sealed with the exporter secret derived
// from the CURRENT epoch so receivers at the same epoch can decrypt it.
async function buildSignedNipEeGroupEvent(clientState, mlsMessageObj) {
  const nostrGroupIdHex = nostrGroupIdHexFromState(clientState)
  if (!nostrGroupIdHex) {
    throw new Error('Group state is missing the nostr_group_data extension')
  }
  const exporterSecretBytes = await mls.getNostrExporterSecret(clientState)
  const mlsMessageBytes = mls.encodeMlsMsg(mlsMessageObj)
  return mls.buildNipEeGroupEvent({
    nostrGroupIdHex,
    mlsMessageBytes,
    exporterSecretBytes,
  })
}

const mlsProcessingQueues = new Map()

function withMlsProcessingLock(mlsGroupIdHex, fn) {
  const prev = mlsProcessingQueues.get(mlsGroupIdHex) || Promise.resolve()
  const next = prev.then(fn, fn)
  mlsProcessingQueues.set(mlsGroupIdHex, next)
  return next
}

// ── Init / lifecycle ────────────────────────────────────────────────────

export async function initMls({ commit, state, dispatch }) {
  const ws = getWalletState(state)
  if (!ws?.keys?.privKeyHex || !ws.mls) return false
  const nostrPubkeyHex = ws.keys.pubKeyHex

  // Load previously-published key packages first so the history reflects what
  // other clients/receivers know about, in case the current publish fails.
  try {
    const currentKpEvents = await relayService.fetchNipEeKeyPackage(state.relays, nostrPubkeyHex)
    for (const event of currentKpEvents) {
      if (decodeNipEeKeyPackage(event.content)) {
        commit('PUSH_MLS_KP_HISTORY', { content: event.content, publishedAt: event.created_at })
      }
    }
  } catch (err) {
    console.warn('[MLS] Failed to fetch existing key packages:', err.message)
  }

  const walletHash = getCurrentWalletHash()
  const mnemonic = walletHash ? await getMnemonicByHash(walletHash).catch(() => null) : null
  if (!mnemonic) {
    throw new Error('No mnemonic available to initialize MLS')
  }
  const mlsKeys = deriveMlsKeys(mnemonic)
  const hpkeIkms = deriveMlsHpkeIkms(mnemonic)

  const { publicPackage } = await mls.generateMlsKeyPackage(
    { publicKey: mlsKeys.publicKey, privateKey: mlsKeys.privateKey },
    nostrPubkeyHex,
    hpkeIkms
  )

  let published = false
  const serialized = bytesToHex(mls.encodeKeyPackageForPublish(publicPackage))

  // Publish to each relay until one accepts the write.
  for (const relay of state.relays) {
    try {
      const unsignedEvent = mls.buildNipEeKeyPackageEvent({
        keyPackageHex: serialized,
        nostrPubkeyHex,
        relays: state.relays,
      })
      const signedEvent = finalizeEvent(unsignedEvent, hexToBytes(ws.keys.privKeyHex))
      await relayService.publishEvent([relay], signedEvent)
      commit('PUSH_MLS_KP_HISTORY', { content: serialized, publishedAt: signedEvent.created_at })
      published = true
      break
    } catch (err) {
      console.warn('[MLS] Failed to publish key package to', relay, ':', err.message)
    }
  }

  if (!published) {
    console.warn('[MLS] Could not publish key package; continuing with local state')
  }

  // Publish the NIP-EE relay list (kind 10051) so other devices/clients can
  // look up the relays this identity routes its groups on.
  try {
    const unsignedRelayList = mls.buildNipEeRelayListEvent(state.relays, nostrPubkeyHex)
    const signedRelayList = finalizeEvent(unsignedRelayList, hexToBytes(ws.keys.privKeyHex))
    await relayService.publishEvent(state.relays, signedRelayList)
  } catch (err) {
    console.warn('[MLS] Failed to publish NIP-EE relay list:', err.message)
  }

  commit('SET_MLS_KEY_PACKAGE', { serialized, credentialIdentity: nostrPubkeyHex })
  commit('SET_MLS_READY', true)

  // Tombstone declined invites on this identity so they never resurface.
  try {
    const deletedEventIds = await relayService.fetchOwnDeletionEventIds(state.relays, nostrPubkeyHex)
    if (deletedEventIds.length > 0) {
      commit('MERGE_DECLINED_WELCOMES', deletedEventIds)
    }
  } catch (err) {
    console.warn('[MLS] Failed to fetch own deletion events:', err.message)
  }

  // Subscribe to NIP-EE group events (kind 445) scoped to our groups' h tags,
  // plus historic catch-up. Welcomes arrive as gift-wrapped kind-444 rumors
  // through the NIP-17 pipeline and are surfaced as invitations.
  const nostrGroupHexes = [...new Set(Object.values(ws.mls.roomMlsNostrMap || {}).filter(Boolean))]
  try {
    relayService.subscribeMlsEvents(state.relays, nostrPubkeyHex, nostrGroupHexes, {
      async onEvent(event) {
        await dispatch('receiveMlsMessage', event)
      },
    })
    relayService.fetchMlsHistory(state.relays, nostrGroupHexes, {
      async onEvent(event) {
        await dispatch('receiveMlsMessage', event)
      },
    })
  } catch (err) {
    console.warn('[MLS] Failed to subscribe to NIP-EE group events:', err.message)
  }

  // Repair server-side room rows so MLS rooms that were removed/deleted on the
  // server but still exist locally get re-uploaded (used by multi-device).
  try {
    const mlsRooms = Object.keys(ws.mls.roomMlsMap || {})
    for (const roomId of mlsRooms) {
      const room = ws.rooms?.find((r) => r.id === roomId)
      if (room && room.type === 'mls-group' && room.deletedAt) {
        await updateRoomOnServer(room.id, { ...room, deletedAt: undefined })
      }
    }
  } catch (err) {
    console.warn('[MLS] Failed to repair server room rows:', err.message)
  }

  return true
}

export async function createMlsGroup({ commit, state }, { name, members = [] }) {
  const ws = getWalletState(state)
  if (!ws?.keys?.privKeyHex) throw new Error('Nostr keys not available')
  if (!ws.mls.ready) throw new Error('MLS not initialized')

  // The creator occupies one slot; invited members fill the rest.
  if (members.length + 1 > MAX_MLS_MEMBERS) {
    throw new Error(`MLS groups are limited to ${MAX_MLS_MEMBERS} members total`)
  }

  const walletHash = getCurrentWalletHash()
  const mnemonic = walletHash ? await getMnemonicByHash(walletHash).catch(() => null) : null
  if (!mnemonic) throw new Error('No mnemonic available')

  const mlsKeys = deriveMlsKeys(mnemonic)
  const hpkeIkms = deriveMlsHpkeIkms(mnemonic)
  const nostrPubkeyHex = ws.keys.pubKeyHex

  const { publicPackage, privatePackage } = await mls.generateMlsKeyPackage(
    { publicKey: mlsKeys.publicKey, privateKey: mlsKeys.privateKey },
    nostrPubkeyHex,
    hpkeIkms
  )

  const groupId = new Uint8Array(32)
  crypto.getRandomValues(groupId)
  const groupIdHex = bytesToHex(groupId)

  // Public (NIP-EE) group id — random 32 bytes used in kind-445 h tags and as
  // the nostr_group_id in the 0xF2EE extension. Unlike the MLS groupId this is
  // published on the relay.
  const nostrGroupId = new Uint8Array(32)
  crypto.getRandomValues(nostrGroupId)
  const nostrGroupIdHex = bytesToHex(nostrGroupId)

  const clientState = await mls.createMlsGroup(
    groupId,
    publicPackage,
    privatePackage,
    nostrGroupIdHex,
    {
      name: name || 'MLS Group',
      adminPubkeys: [nostrPubkeyHex],
      relays: state.relays,
    }
  )

  // Post-create identity guard: we must sit at the leaf matching our identity.
  {
    const members = mls.getMlsGroupMembers(clientState)
    const identities = members.map((m) =>
      new TextDecoder().decode(m.credential?.identity || m.identityBytes)
    )
    const myIdx = identities.findIndex((id) => id === nostrPubkeyHex)
    if (myIdx !== -1 && clientState.privatePath.leafIndex !== myIdx) {
      throw new Error(
        `MLS create leafIndex mismatch: privatePath ${clientState.privatePath.leafIndex} vs tree position ${myIdx}`
      )
    }
  }

  const roomId = randomUUID()

  await mls.saveMlsState(groupIdHex, clientState)
  commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex: groupIdHex, clientState })
  commit('SET_MLS_ROOM_MAP', { roomId, mlsGroupIdHex: groupIdHex, nostrGroupIdHex })

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

export async function joinMlsGroup({ commit, state }, { roomId, welcomeRumor }) {
  if (!welcomeRumor) throw new Error('Missing MLS welcome rumor')
  const welcome = mls.decodeWelcomeFromBytes(hexToBytes(welcomeRumor.content))

  const ws = getWalletState(state)
  if (!ws?.keys?.privKeyHex) throw new Error('Nostr keys not available')

  const walletHash = getCurrentWalletHash()
  const mnemonic = walletHash ? await getMnemonicByHash(walletHash).catch(() => null) : null
  if (!mnemonic) throw new Error('No mnemonic available')

  const mlsKeys = deriveMlsKeys(mnemonic)
  const hpkeIkms = deriveMlsHpkeIkms(mnemonic)
  const nostrPubkeyHex = ws.keys.pubKeyHex

  const { publicPackage, privatePackage } = await mls.generateMlsKeyPackage(
    { publicKey: mlsKeys.publicKey, privateKey: mlsKeys.privateKey },
    nostrPubkeyHex,
    hpkeIkms
  )

  // Key package candidates in precedence order:
  // 1. Freshly fetched NIP-EE key packages (kind 443) for this identity.
  // 2. Locally cached key package history.
  // 3. The currently-generated (deterministic) key package.
  // Because all generations derive from the same seed, the same privatePackage
  // unlocks every candidate.
  const candidates = []
  const seen = new Set()

  try {
    const kpEvents = await relayService.fetchNipEeKeyPackage(state.relays, nostrPubkeyHex)
    for (const event of kpEvents) {
      const kp = decodeNipEeKeyPackage(event.content)
      if (!kp) continue
      const ref = bytesToHex(await mls.makeKeyPackageRef(kp))
      if (!seen.has(ref)) {
        seen.add(ref)
        candidates.push({ kp, ref })
      }
    }
  } catch (err) {
    console.warn('[MLS] Failed to fetch key packages for join:', err.message)
  }

  for (const historyEntry of ws.mls.kpHistory || []) {
    const kp = decodeNipEeKeyPackage(historyEntry.content)
    if (!kp) continue
    const ref = bytesToHex(await mls.makeKeyPackageRef(kp))
    if (!seen.has(ref)) {
      seen.add(ref)
      const kpIsCurrent = historyEntry.content === (ws.mls.keyPackage?.serialized || '')
      if (!kpIsCurrent) {
        candidates.push({ kp, ref, isHistory: true })
      }
    }
  }

  const fallbackRef = bytesToHex(await mls.makeKeyPackageRef(publicPackage))
  if (!seen.has(fallbackRef)) {
    seen.add(fallbackRef)
    candidates.push({ kp: publicPackage, ref: fallbackRef, isFallback: true })
  }

  let joinedClientState = null
  let lastJoinError = null
  for (const candidate of candidates) {
    try {
      joinedClientState = await mls.joinMlsGroup(welcome, candidate.kp, privatePackage)
      break
    } catch (err) {
      lastJoinError = err
      console.warn('[MLS] join with candidate', candidate.ref.slice(0, 12) + '…', 'failed:', err.message)
    }
  }
  if (!joinedClientState) {
    throw new Error(
      'Failed to join MLS group: ' + (lastJoinError?.message || 'no key package matched the welcome')
    )
  }

  // Post-commit identity guard: we must sit at a leaf whose credential matches
  // our Nostr pubkey, at the right tree position.
  {
    const members = mls.getMlsGroupMembers(joinedClientState)
    const identities = members.map((m) =>
      new TextDecoder().decode(m.credential?.identity || m.identityBytes)
    )
    const myIdx = identities.findIndex((id) => id === nostrPubkeyHex)
    if (myIdx === -1) {
      throw new Error(
        'Your identity was not found in the joined group — the inviter may have used a stale key package. Ask them to re-invite you.'
      )
    }
    if (joinedClientState.privatePath?.leafIndex !== undefined && joinedClientState.privatePath.leafIndex !== myIdx) {
      throw new Error(
        `MLS join leafIndex mismatch: privatePath ${joinedClientState.privatePath.leafIndex} vs tree position ${myIdx}`
      )
    }
  }

  const groupIdHex = bytesToHex(joinedClientState.groupContext.groupId)
  const nostrGroupIdHex = nostrGroupIdHexFromState(joinedClientState)

  const groupData = (() => {
    try {
      const ext = joinedClientState.groupContext.extensions?.find(
        (e) => e.extensionType === mls.NOSTR_GROUP_DATA_EXTENSION_TYPE
      )
      return ext ? mls.parseNipEeGroupData(ext.extensionData) : null
    } catch {
      return null
    }
  })()

  const existingRoomId = resolveRoomIdByMlsGroupId(ws, groupIdHex)
  const finalRoomId = existingRoomId || roomId

  await mls.saveMlsState(groupIdHex, joinedClientState)
  commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex: groupIdHex, clientState: joinedClientState })
  commit('SET_MLS_ROOM_MAP', { roomId: finalRoomId, mlsGroupIdHex: groupIdHex, nostrGroupIdHex })

  const members = mlsMemberPubkeys(joinedClientState)
  const room = {
    id: finalRoomId,
    type: 'mls-group',
    name: groupData?.name || 'MLS Group',
    members,
    owner: groupData?.adminPubkeys?.[0] || members[0] || nostrPubkeyHex,
    admins: [],
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
  }

  const roomExists = (ws.rooms || []).some((r) => r.id === finalRoomId)
  if (roomExists) {
    commit('UPDATE_ROOM', room)
    await updateRoomOnServer(finalRoomId, room)
  } else {
    commit('ADD_ROOM', room)
    await syncRoomToServer(room)
  }

  return { roomId: finalRoomId, groupIdHex, nostrGroupIdHex, clientState: joinedClientState }
}

export async function acceptMlsInvite({ commit, state, dispatch }, { roomId }) {
  const ws = getWalletState(state)
  if (!ws?.keys?.privKeyHex || !ws.mls) return
  if (ws.mls.roomMlsMap?.[roomId]) return

  const invite = ws.mls.pendingInvitations?.[roomId]
  if (!invite) {
    throw new Error('Invite not found')
  }

  const joined = await dispatch('joinMlsGroup', { roomId, welcomeRumor: invite.welcomeRumor })

  // Catch up on group events published before we joined (the live subscription
  // may have missed pre-join messages).
  try {
    const preJoinEvents = (await relayService.fetchMlsGroupEvents(state.relays, joined.nostrGroupIdHex, 100))
      .sort((a, b) => a.created_at - b.created_at)
    for (const event of preJoinEvents) {
      await dispatch('receiveMlsMessage', event)
    }
  } catch (err) {
    console.warn('[MLS] Failed to fetch pre-join group events:', err.message)
  }

  commit('REMOVE_MLS_INVITE', roomId)
  return joined.mlsGroupIdHex || joined.groupIdHex
}

export async function declineMlsInvite({ commit, state }, { roomId }) {
  const ws = getWalletState(state)
  if (!ws?.keys?.privKeyHex || !ws.mls) return false

  const invite = ws.mls.pendingInvitations?.[roomId]
  commit('REMOVE_MLS_INVITE', roomId)
  if (invite?.welcomeEvent?.id) {
    // The welcome reached us gift-wrapped. Delete the gift-wrap EVENT (the
    // relay event id), not the rumor id. Other devices sharing this identity
    // honor the kind-5 tombstone via fetchOwnDeletionEventIds.
    const signedEvent = finalizeEvent(
      {
        kind: 5,
        pubkey: ws.keys.pubKeyHex,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['e', invite.welcomeEvent.id]],
        content: '',
      },
      hexToBytes(ws.keys.privKeyHex)
    )
    commit('ADD_DECLINED_WELCOME', invite.welcomeEvent.id)
    try {
      await relayService.publishEvent(state.relays, signedEvent)
      return true
    } catch (err) {
      console.warn('[MLS] Failed to publish decline:', err.message)
    }
  }
  return false
}

/**
 * Surface a NIP-EE welcome (kind 444) that arrived as a gift-wrapped rumor
 * through the NIP-17 pipeline. Validates the payload is a real MLS Welcome
 * before queueing an invitation for the user to accept or decline.
 */
export function receiveMlsWelcomeRumor({ commit, state }, { giftWrap, welcomeRumor }) {
  const ws = getWalletState(state)
  if (!ws?.keys?.privKeyHex || !ws.mls) return

  const wrapId = giftWrap?.id
  if (wrapId && ws.mls.declinedWelcomeIds?.[wrapId]) return
  if (welcomeRumor?.kind !== mls.NIP_EE_WELCOME_KIND) return

  // Dedupe against invitations already queued for the same gift-wrap or rumor.
  const pending = ws.mls.pendingInvitations || {}
  for (const invite of Object.values(pending)) {
    if (invite.welcomeEvent?.id && invite.welcomeEvent.id === wrapId) return
    if (invite.welcomeRumor?.id && welcomeRumor.id && invite.welcomeRumor.id === welcomeRumor.id) return
  }

  // Validate the payload is a real MLS Welcome before surfacing it.
  try {
    mls.decodeWelcomeFromBytes(hexToBytes(welcomeRumor.content))
  } catch (err) {
    console.warn('[MLS] Ignoring invalid welcome rumor:', err.message)
    return
  }

  commit('ADD_MLS_INVITE', {
    roomId: randomUUID(),
    inviterPubKey: welcomeRumor.pubkey,
    name: 'MLS Group',
    createdAt: welcomeRumor.created_at || Math.floor(Date.now() / 1000),
    welcomeEvent: giftWrap,
    welcomeRumor,
  })
}

// ---- Sending messages ----

export async function sendMlsMessage({ commit, state }, { roomId, text, replyTo }) {
  const ws = getWalletState(state)
  if (!ws?.keys?.privKeyHex) throw new Error('Nostr keys not available')

  const mlsGroupIdHex = ws.mls.roomMlsMap?.[roomId]
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
    if (!clientState && ws.mls.groupStates?.[mlsGroupIdHex]) {
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
      const wrapped = mls.wrapPrivateMessage(privateMessage)
      const event = await buildSignedNipEeGroupEvent(clientState, wrapped)

      console.log(
        '[MLS] send', mlsGroupIdHex.slice(0, 8), 'attempt', attempt,
        '| ratchet gen', genBefore, '->', ownAppRatchetGen(newState),
      )
      signedEvent = event

      // Persist the advanced (ratchet-consumed) state BEFORE publishing. If the
      // publish fails we roll the stored state back so a retry doesn't reuse a
      // ratchet key the receiver has already seen.
      await mls.saveMlsState(mlsGroupIdHex, newState)
      commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex, clientState: newState })

      const { accepted, errors } = await relayService.publishEvent(state.relays, signedEvent)
      if (accepted.length) {
        createdAt = event.created_at
        markRecentlySent(signedEvent.id)
        break
      }

      lastErrors = errors
      await mls.saveMlsState(mlsGroupIdHex, clientState)
      commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex, clientState })
      if (attempt < MAX_SEND_ATTEMPTS) {
        console.warn(`[MLS] publish attempt ${attempt}/${MAX_SEND_ATTEMPTS} failed, retrying:`, JSON.stringify(errors))
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
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
    kind: mls.NIP_EE_GROUP_EVENT_KIND,
    created_at,
    replyTo,
  }

  return { message, roomId }
}

// ---- Receiving messages ----

export async function receiveMlsMessage({ commit, state }, event) {
  const ws = getWalletState(state)
  if (!ws?.keys?.privKeyHex) return

  // Gift-wrapped NIP-EE welcome (kind 1059) delivered directly through an MLS
  // subscription (e.g. when the wrapper filters on group relay lists). Unwrap
  // and route to the welcome handler.
  if (event?.kind === 1059 || (event?.kind === mls.NIP_EE_WELCOME_KIND && event.tags?.some((t) => t[0] === 'p'))) {
    try {
      const { rumor } = unwrapGiftWrap(event, ws.keys.privKeyHex)
      if (!rumor.id) rumor.id = getEventHash(rumor)
      receiveMlsWelcomeRumor({ commit, state }, { giftWrap: event, welcomeRumor: rumor })
    } catch (err) {
      console.warn('[MLS] Failed to unwrap MLS welcome gift-wrap:', err.message)
    }
    return
  }

  if (event?.kind !== mls.NIP_EE_GROUP_EVENT_KIND) return

  // NIP-EE group events are signed with an ephemeral key, so the event's pubkey
  // is meaningless. Events authored by this wallet (this device or a sibling
  // device sharing its keys) are identified purely by event id, which we
  // temporarily track for our own sends this session.
  if (isRecentlySent(event.id)) return
  // Application message already added to the timeline (own sends, the group
  // history replay after a fresh-device rebuild, or an echo arriving before
  // the live subscription); dedupe here so it is not decrypted twice.
  const hTag = event.tags?.find((t) => t[0] === 'h')
  if (!hTag) return
  const nostrGroupIdHex = hTag[1]
  const mlsGroupIdHex = resolveMlsGroupIdHex(ws, nostrGroupIdHex)
  if (!mlsGroupIdHex) {
    console.warn(
      '[MLS] Dropping 445 event', event.id.slice(0, 8),
      'for unknown nostr_group_id', nostrGroupIdHex?.slice(0, 16),
      '(roomMlsNostrMap has', Object.keys(ws.mls.roomMlsNostrMap || {}).length, 'entries)',
    )
    return
  }

  // Add this room's already-added message ids to avoid duplicate processing.
  const roomId = resolveRoomIdByMlsGroupId(ws, mlsGroupIdHex)
  const alreadyAdded = roomId && (ws.messages?.[roomId] || []).some((m) => m.id === event.id)
  if (alreadyAdded) return

  // Undecodable-event suppression: relays re-serve history forever, so an
  // event we can never decrypt would be retried on every history fetch.
  const failedAttempts = ws.mls.failedEventAttempts?.[event.id]
  if (failedAttempts && failedAttempts.count >= MAX_EVENT_PROCESS_ATTEMPTS) {
    return
  }

  const { impl } = mls.getMlsCrypto()

  await withMlsProcessingLock(mlsGroupIdHex, async () => {
    let clientState = null
    try {
      clientState = await mls.loadMlsState(mlsGroupIdHex, impl, {})
    } catch (err) {
      console.warn('[MLS] loadMlsState threw for group', mlsGroupIdHex.slice(0, 12), ':', err.message)
    }
    if (!clientState && ws.mls.groupStates?.[mlsGroupIdHex]) {
      clientState = ws.mls.groupStates[mlsGroupIdHex]
    }
    if (!clientState) {
      console.warn(
        '[MLS] Dropping 445 event', event.id.slice(0, 8),
        'for group', mlsGroupIdHex.slice(0, 12),
        '— no local group state (roomMlsMap has', Object.keys(ws.mls.roomMlsMap || {}).length, 'rooms)',
      )
      return
    }

    let processedResult = null
    try {
      // NIP-EE content is sealed with the group exporter secret of the epoch
      // the sender was on. Decrypt with OUR current exporter secret — sender
      // and receiver share the epoch's key schedule, so this succeeds when we
      // are in sync.
      const exporterSecret = await mls.getNostrExporterSecret(clientState)
      let contentBytes
      try {
        contentBytes = mls.decryptMlsMessageWithExporter(event.content, exporterSecret)
      } catch (err) {
        throw new Error(`Exporter decrypt failed: ${err.message}`)
      }

      processedResult = await mls.processMlsMessage(clientState, contentBytes, impl)
      const result = processedResult

      await mls.saveMlsState(mlsGroupIdHex, result.newState)
      commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex, clientState: result.newState })
      commit('CLEAR_EVENT_PROCESS_FAILURES', event.id)

      if (result.plaintext) {
        // Encrypted group-role control message (owner/admins metadata). Apply
        // it to the room locally and don't surface it as a chat message. Only
        // the CURRENT owner may change roles — any member can encrypt to the
        // group, so without this check a member could promote themselves.
        if (typeof result.plaintext === 'string' && result.plaintext.startsWith(MLS_META_PREFIX)) {
          try {
            const meta = JSON.parse(result.plaintext.slice(MLS_META_PREFIX.length))
            const resolvedRoomId = roomId || resolveRoomIdByMlsGroupId(ws, mlsGroupIdHex)
            if (resolvedRoomId && meta && (meta.owner !== undefined || meta.admins !== undefined)) {
              backfillMlsOwner(commit, ws, resolvedRoomId, clientState)
              const currentRoom = ws.rooms?.find((r) => r.id === resolvedRoomId)
              const currentOwner = currentRoom?.owner
              // Authorize the control message via the MLS leaf index of the
              // sender — the NIP-EE envelope carries no trustworthy pubkey.
              const senderIdentity = memberIdentityAt(result.newState, result.senderLeafIndex)
              if (!currentOwner || !senderIdentity || senderIdentity !== currentOwner) {
                console.warn(
                  '[MLS] Ignoring role control message from non-owner', senderIdentity?.slice(0, 8),
                  'for room', resolvedRoomId.slice(0, 8),
                  '(owner:', currentOwner ? currentOwner.slice(0, 8) : 'unknown', ')',
                )
                return
              }
              applyRoomRoles(commit, ws, resolvedRoomId, meta)
              await updateRoomOnServer(resolvedRoomId, {
                owner: meta.owner !== undefined ? meta.owner : null,
                admins: meta.admins !== undefined ? meta.admins : [],
              })
            }
          } catch {
            // Not valid JSON — fall through and show as a message.
          }
        } else if (roomId) {
          const senderIdentity = memberIdentityAt(result.newState, result.senderLeafIndex)
          console.log(
            '[MLS] Received 445 event', event.id.slice(0, 8),
            'from leaf', result.senderLeafIndex, senderIdentity?.slice(0, 8) || '(unknown)',
            'for group', mlsGroupIdHex.slice(0, 12),
            'room', roomId?.slice(0, 8) || '(none)',
            'text:', JSON.stringify(result.plaintext.slice(0, 40)),
          )

          commit('ADD_MESSAGE', {
            roomId,
            message: applyFileMarkupToMessage({
              id: event.id,
              roomId,
              sender: senderIdentity || event.pubkey, // ephemeral pubkey fallback
              content: result.plaintext,
              kind: mls.NIP_EE_GROUP_EVENT_KIND,
              created_at: event.created_at,
            }),
          })
          commit('TOUCH_ROOM_LAST_MESSAGE_AT', roomId)
          if (roomId) {
            await touchRoomOnServer(roomId, new Date(event.created_at * 1000).toISOString())
          }
        }
      }
    } catch (err) {
      // Decrypt/process failures here are the other classic symptom: the
      // sender's group state has diverged from ours (different epoch / ratchet),
      // so their message cannot be unwrapped. Log every leaf's current ratchet
      // generation so a desync is visible on both sides.
      const allRatchetGen = (() => {
        try {
          const members = mls.getMlsGroupMembers(clientState)
          return members.map((m, i) => {
            const identity = m.credential?.identity || m.identityBytes
            const idStr = identity instanceof Uint8Array ? new TextDecoder().decode(identity).slice(0, 8) : '?'
            return `${idStr}#${i}=${clientState.secretTree[leafToNodeIndex(i)]?.application?.generation ?? '?'}`
          }).join(', ')
        } catch {
          return '?'
        }
      })()
      console.warn(
        '[MLS] Failed to process 445 event', event.id.slice(0, 8),
        'for group', mlsGroupIdHex.slice(0, 12),
        '— sender leaf', processedResult?.senderLeafIndex, '| own leafIndex:', clientState?.privatePath?.leafIndex,
        '| all leaves:', allRatchetGen,
        '|', err.message,
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
  const room = ws.rooms?.find((r) => r.id === roomId)
  if (!room || room.owner || !clientState) return
  try {
    const members = mls.getMlsGroupMembers(clientState)
    const leaf0 = members[0]
    if (!leaf0) return
    const identity = leaf0.credential?.identity || leaf0.identityBytes
    if (!(identity instanceof Uint8Array)) return
    const owner = new TextDecoder().decode(identity)
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
  if (!ws?.keys?.privKeyHex) throw new Error('Nostr keys not available')

  const mlsGroupIdHex = ws.mls.roomMlsMap?.[roomId]
  if (!mlsGroupIdHex) throw new Error('Unknown MLS room')

  const { impl } = mls.getMlsCrypto()

  return withMlsProcessingLock(mlsGroupIdHex, async () => {
    let clientState = await mls.loadMlsState(mlsGroupIdHex, impl, {}).catch(() => null)
    if (!clientState && ws.mls.groupStates?.[mlsGroupIdHex]) {
      clientState = ws.mls.groupStates[mlsGroupIdHex]
    }
    if (!clientState) throw new Error('MLS group state not found')

    backfillMlsOwner(commit, ws, roomId, clientState)

    // Only the owner or an admin may add members.
    requireMlsManager(ws, roomId)

    const currentMembers = mls.getMlsGroupMembers(clientState)
    const memberIdentities = mlsMemberPubkeys(clientState)
    if (memberIdentities.includes(memberPubKey)) {
      return
    }
    if (currentMembers.length >= MAX_MLS_MEMBERS) {
      throw new Error(`MLS groups are limited to ${MAX_MLS_MEMBERS} members total`)
    }

    let kpEvents = await relayService.fetchNipEeKeyPackage(state.relays, memberPubKey)
    if (!kpEvents.length) {
      // Key packages may briefly be absent during relay sync — retry once.
      await new Promise((r) => setTimeout(r, 1500))
      kpEvents = await relayService.fetchNipEeKeyPackage(state.relays, memberPubKey)
    }
    if (!kpEvents.length) throw new Error('KeyPackage not found for member')

    // Encrypt the welcome to the newest published KeyPackage — the invitee
    // tries its published packages newest-first, so this is the one it matches.
    const inviteeKeyPackage = decodeNipEeKeyPackage(kpEvents[0].content)
    if (!inviteeKeyPackage) throw new Error('Invalid KeyPackage event')

    const { newState, commit: commitMsg, welcome } = await mls.addMlsMember(clientState, inviteeKeyPackage, impl)

    {
      const identities = mlsMemberPubkeys(newState)
      const myIdx = identities.findIndex((id) => id === ws.keys.pubKeyHex)
      if (myIdx !== -1 && newState.privatePath.leafIndex !== myIdx) {
        console.error('[MLS] addMlsMember produced leafIndex mismatch', { privatePath: newState.privatePath.leafIndex, myIdx, identities: identities.map((i) => i?.slice(0, 8)) })
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
      const freshKpEvents = await relayService.fetchNipEeKeyPackage(state.relays, memberPubKey)
      if (freshKpEvents.length) {
        const freshKp = decodeNipEeKeyPackage(freshKpEvents[0].content)
        const freshRef = freshKp ? bytesToHex(await mls.makeKeyPackageRef(freshKp)) : null
        const welcomeRefs = (welcome.secrets || []).map((s) => bytesToHex(s.newMember))
        if (freshRef && !welcomeRefs.includes(freshRef)) {
          throw new Error(
            "The invitee's KeyPackage changed while creating the invitation. " +
            'Ask them to open Paytaca again (to publish their updated KeyPackage), then re-invite.'
          )
        }
      }
    }

    // Build a signed NIP-EE group event (kind 445) for the Add commit. The
    // exporter secret is derived from the PRE-commit epoch state, which our
    // peers are also on until they process the commit.
    const signedCommit = await buildSignedNipEeGroupEvent(clientState, commitMsg)
    const commitPublish = await relayService.publishEvent(state.relays, signedCommit)
    if (!commitPublish.accepted.length) {
      const reason = commitPublish.errors[0]?.reason || 'relay rejected the commit'
      console.warn('[MLS] Commit publish rejected:', JSON.stringify(commitPublish.errors))
      throw new Error(`MLS commit was rejected by the relay: ${reason}`)
    }
    markRecentlySent(signedCommit.id)

    if (welcome) {
      const welcomeMlsMsg = { version: 'mls10', wireformat: 'mls_welcome', welcome }
      const welcomeHex = bytesToHex(mls.encodeMlsMsg(welcomeMlsMsg))

      const welcomeUnsigned = mls.buildNipEeWelcomeEvent({
        welcomeHex,
        keyPackageEventId: kpEvents[0].id,
        relays: state.relays,
        nostrPubkeyHex: ws.keys.pubKeyHex,
      })

      // NIP-EE welcoms are gift-wrapped (NIP-59) to the invitee; the relay
      // never sees the inner kind-444 event directly.
      const giftWrappedWelcome = nip59.wrapEvent(welcomeUnsigned, hexToBytes(ws.keys.privKeyHex), memberPubKey)

      // The commit is already on the relay at this point, so the group epoch
      // has advanced for everyone. The welcome MUST reach the invitee — retry
      // the publish before giving up.
      let welcomePublished = false
      let welcomeLastErr = null
      for (let attempt = 1; attempt <= 3 && !welcomePublished; attempt++) {
        try {
          const welcomePublish = await relayService.publishEvent(state.relays, giftWrappedWelcome)
          if (!welcomePublish.accepted.length) {
            throw new Error(welcomePublish.errors[0]?.reason || 'relay rejected the welcome')
          }
          welcomePublished = true
        } catch (err) {
          welcomeLastErr = err
          console.warn(`[MLS] Welcome publish attempt ${attempt}/3 failed:`, err.message)
          if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
        }
      }
      if (!welcomePublished) {
        console.warn('[MLS] Welcome rejected after 3 attempts:', JSON.stringify(welcomeLastErr?.message))
        await mls.saveMlsState(mlsGroupIdHex, newState)
        commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex, clientState: newState })
        const failureRoom = ws.rooms.find((r) => r.id === roomId)
        if (failureRoom && !failureRoom.members.includes(memberPubKey)) {
          const updatedMembers = [...failureRoom.members, memberPubKey]
          commit('UPDATE_ROOM', { id: roomId, members: updatedMembers })
          await updateRoomOnServer(roomId, { members: updatedMembers })
        }
        throw new Error(
          `The member was added but their invitation could not be published (${welcomeLastErr?.message || 'relay rejected the welcome'}). ` +
          'Try removing and re-adding them.'
        )
      }
    }

    await mls.saveMlsState(mlsGroupIdHex, newState)
    commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex, clientState: newState })

    const room = ws.rooms.find((r) => r.id === roomId)
    if (room && !room.members.includes(memberPubKey)) {
      const updatedMembers = [...room.members, memberPubKey]
      commit('UPDATE_ROOM', { id: roomId, members: updatedMembers })
      await updateRoomOnServer(roomId, { members: updatedMembers })
    }
  }).finally(async () => {
    // Broadcast the current roles to the (now larger) group so the invitee
    // learns the owner/admins once they join and catch up. NIP-EE welcoms do
    // not carry room metadata tags, so this replaces the old n/owner/admin
    // tags on the welcome event.
    try {
      await broadcastMlsRoomRoles({ commit, state }, { roomId })
    } catch (err) {
      console.warn('[MLS] Failed to broadcast roles after adding member:', err.message)
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
  let clientState = await mls.loadMlsState(mlsGroupIdHex, impl, {}).catch(() => null)
  if (!clientState && ws.mls.groupStates?.[mlsGroupIdHex]) {
    clientState = ws.mls.groupStates[mlsGroupIdHex]
  }
  if (!clientState) return null
  backfillMlsOwner(commit, ws, roomId, clientState)
  return mlsMemberPubkeys(clientState)
}

export async function removeMlsMember({ commit, state }, { roomId, memberPubkey }) {
  const ws = getWalletState(state)
  if (!ws?.keys?.privKeyHex) throw new Error('Nostr keys not available')

  const mlsGroupIdHex = ws.mls.roomMlsMap?.[roomId]
  if (!mlsGroupIdHex) throw new Error('Unknown MLS room')

  const { impl } = mls.getMlsCrypto()

  await withMlsProcessingLock(mlsGroupIdHex, async () => {
    let clientState = await mls.loadMlsState(mlsGroupIdHex, impl, {}).catch(() => null)
    if (!clientState && ws.mls.groupStates?.[mlsGroupIdHex]) {
      clientState = ws.mls.groupStates[mlsGroupIdHex]
    }
    if (!clientState) throw new Error('MLS group state not found')

    backfillMlsOwner(commit, ws, roomId, clientState)

    // Only the owner or an admin may remove members.
    const myRole = requireMlsManager(ws, roomId)

    const room = ws.rooms.find((r) => r.id === roomId)
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
      const identity = members[i].credential?.identity || members[i].identityBytes
      const idStr = identity instanceof Uint8Array ? new TextDecoder().decode(identity) : ''
      if (idStr === memberPubkey) {
        leafIndex = i
        break
      }
    }
    if (leafIndex === -1) throw new Error('Member not found in MLS group')

    const { newState, commit: commitMsg } = await mls.removeMlsMember(clientState, leafIndex, impl)

    const signedCommit = await buildSignedNipEeGroupEvent(clientState, commitMsg)
    const publish = await relayService.publishEvent(state.relays, signedCommit)
    if (!publish.accepted.length) {
      // Do NOT advance local state — if the commit isn't on the relay, other
      // members still see the removed member in the tree and our epoch would
      // run ahead of theirs, making future messages undecryptable.
      const reason = publish.errors[0]?.reason || 'relay rejected the commit'
      console.warn('[MLS] Remove-member commit rejected:', JSON.stringify(publish.errors))
      throw new Error(`MLS removal was rejected by the relay: ${reason}`)
    }
    markRecentlySent(signedCommit.id)

    await mls.saveMlsState(mlsGroupIdHex, newState)
    commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex, clientState: newState })

    if (room) {
      const updatedMembers = room.members.filter((m) => m !== memberPubkey)
      commit('UPDATE_ROOM', { id: roomId, members: updatedMembers, admins: (room.admins || []).filter((a) => a !== memberPubkey) })
      await updateRoomOnServer(roomId, { members: updatedMembers, admins: (room.admins || []).filter((a) => a !== memberPubkey) })
    }
  })
}

// ---- Encrypted group-role control messages ----

/**
 * Broadcast the current owner/admins of an MLS group to all members as an
 * encrypted MLS application message. Members decrypt it and apply it to their
 * local room; it is never shown as a chat message. Called after any role change
 * (make/remove admin, transfer owner, owner leaves to a successor).
 */
export async function broadcastMlsRoomRoles({ commit, state }, { roomId }) {
  const ws = getWalletState(state)
  if (!ws?.keys?.privKeyHex) throw new Error('Nostr keys not available')

  const mlsGroupIdHex = ws.mls.roomMlsMap?.[roomId]
  if (!mlsGroupIdHex) throw new Error('Unknown MLS room')

  const { impl } = mls.getMlsCrypto()
  await ensureMlsOwnerBackfilled(commit, ws, roomId, impl)

  const room = ws.rooms.find((r) => r.id === roomId)
  if (!room) throw new Error('Room not found')

  const meta = {
    owner: room.owner || null,
    admins: room.admins || [],
  }
  const text = MLS_META_PREFIX + JSON.stringify(meta)

  // Reuse sendMlsMessage so ratchet/persist/retry semantics stay identical.
  await sendMlsMessage({ commit, state }, { roomId, text })
}

/**
 * Apply a role control payload to a room. Shared by receiveMlsMessage (from
 * the wire) and local role mutations (optimistic apply before broadcasting).
 */
function applyRoomRoles(commit, ws, roomId, meta) {
  if (!roomId || !meta) return
  if (meta.owner === undefined && meta.admins === undefined) return
  const room = ws.rooms?.find((r) => r.id === roomId)
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
  if (!ws?.keys?.privKeyHex) throw new Error('Nostr keys not available')

  const mlsGroupIdHex = ws.mls.roomMlsMap?.[roomId]
  if (!mlsGroupIdHex) throw new Error('Unknown MLS room')

  const { impl } = mls.getMlsCrypto()
  await ensureMlsOwnerBackfilled(commit, ws, roomId, impl)

  // Only the owner may change admin status.
  if (myMlsRole(ws, roomId) !== 'owner') {
    throw new Error('Only the group owner can change admin roles')
  }

  const room = ws.rooms.find((r) => r.id === roomId)
  if (!room) throw new Error('Room not found')
  if (!room.members?.includes(memberPubKey)) throw new Error('Member not in group')

  // An admin who is removed is just reverted to a regular member; the owner
  // can never be listed as an admin.
  let admins = room.admins || []
  if (isAdmin) {
    if (memberPubKey === room.owner) throw new Error('The group owner is already the owner')
    if (!admins.includes(memberPubKey)) admins = [...admins, memberPubKey]
  } else {
    admins = admins.filter((a) => a !== memberPubKey)
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
  if (!ws?.keys?.privKeyHex) throw new Error('Nostr keys not available')

  const mlsGroupIdHex = ws.mls.roomMlsMap?.[roomId]
  if (!mlsGroupIdHex) throw new Error('Unknown MLS room')

  const { impl } = mls.getMlsCrypto()
  await ensureMlsOwnerBackfilled(commit, ws, roomId, impl)

  if (myMlsRole(ws, roomId) !== 'owner') {
    throw new Error('Only the group owner can transfer ownership')
  }

  const room = ws.rooms.find((r) => r.id === roomId)
  if (!room) throw new Error('Room not found')
  if (!room.members?.includes(newOwnerPubKey)) throw new Error('New owner must be a group member')

  const oldOwner = room.owner
  if (oldOwner === newOwnerPubKey) return

  // Previous owner drops to a regular member (unless also an admin); the new
  // owner is removed from the admin list (they now hold the owner role).
  const admins = (room.admins || [])
    .filter((a) => a !== newOwnerPubKey)
    .concat(oldOwner && (room.admins || []).includes(oldOwner) ? [oldOwner] : [])

  const meta = { owner: newOwnerPubKey, admins }
  applyRoomRoles(commit, ws, roomId, meta)
  await updateRoomOnServer(roomId, meta)
  await broadcastMlsRoomRoles({ commit, state }, { roomId })
}

export async function leaveMlsGroup({ commit, state }, { roomId, successorPubKey }) {
  const ws = getWalletState(state)
  if (!ws?.keys?.privKeyHex) return

  const mlsGroupIdHex = ws.mls.roomMlsMap?.[roomId]
  if (!mlsGroupIdHex) return

  // Backfill the owner for legacy groups so the successor handoff below fires
  // even when the owner field predates the roles feature.
  const { impl } = mls.getMlsCrypto()
  await ensureMlsOwnerBackfilled(commit, ws, roomId, impl)

  const room = ws.rooms.find((r) => r.id === roomId)

  // If the owner leaves, ownership must transfer to a designated successor
  // (the UI only offers admins). Broadcast the role change before departing so
  // the remaining members know who manages the group. A sole-member owner may
  // leave without a successor — there is nobody to hand off to, and no MLS
  // commit is needed since no other member is affected.
  const isSoleMember = !room?.members || room.members.length <= 1
  if (room?.type === 'mls-group' && room.owner === ws.keys.pubKeyHex) {
    if (!successorPubKey && !isSoleMember) {
      throw new Error('The group owner must choose a successor before leaving')
    }
    if (!isSoleMember) {
      if (!room.members?.includes(successorPubKey)) {
        throw new Error('The new owner must be a group member')
      }
      // Only admins are eligible successors (the UI only offers admins; keep
      // the store action consistent so a crafted call can't promote a regular
      // member to owner).
      if (!(room.admins || []).includes(successorPubKey)) {
        throw new Error('The new owner must be an admin')
      }
      const admins = (room.admins || [])
        .filter((a) => a !== successorPubKey)
        .concat((room.admins || []).includes(ws.keys.pubKeyHex) ? [ws.keys.pubKeyHex] : [])
      const meta = { owner: successorPubKey, admins }
      applyRoomRoles(commit, ws, roomId, meta)
      await updateRoomOnServer(roomId, meta)
      await broadcastMlsRoomRoles({ commit, state }, { roomId })
    }
  }

  let clientState = null
  try {
    clientState = await mls.loadMlsState(mlsGroupIdHex, impl, {})
  } catch (err) {
    console.warn('[MLS] leaveMlsGroup: failed to load state from IndexedDB:', err.message)
  }
  if (!clientState && ws.mls.groupStates?.[mlsGroupIdHex]) {
    clientState = ws.mls.groupStates[mlsGroupIdHex]
  }

  if (clientState && !isSoleMember) {
    await withMlsProcessingLock(mlsGroupIdHex, async () => {
      // Reload inside the lock to get the freshest copy; a concurrent send or
      // receive may have advanced the epoch since the load above.
      let lockedState = null
      try {
        lockedState = await mls.loadMlsState(mlsGroupIdHex, impl, {})
      } catch (err) {
        console.warn('[MLS] leaveMlsGroup: failed to load state from IndexedDB:', err.message)
      }
      if (!lockedState && ws.mls.groupStates?.[mlsGroupIdHex]) {
        lockedState = ws.mls.groupStates[mlsGroupIdHex]
      }
      if (!lockedState) return

      const ownLeaf = mls.getOwnLeafIndex(lockedState)
      if (ownLeaf === -1) return

      // Publish the self-remove commit with retries. Local state must only be
      // torn down once the commit is on the relay.
      let published = false
      let lastErr = null
      for (let attempt = 1; attempt <= 3 && !published; attempt++) {
        try {
          const { newState, commit: commitMsg } = await mls.removeMlsMember(lockedState, ownLeaf, impl)
          const signedCommit = await buildSignedNipEeGroupEvent(lockedState, commitMsg)
          const result = await relayService.publishEvent(state.relays, signedCommit)
          if (!result.accepted.length) throw new Error(result.errors[0]?.reason || 'relay rejected the commit')
          markRecentlySent(signedCommit.id)
          await mls.saveMlsState(mlsGroupIdHex, newState)
          published = true
        } catch (err) {
          lastErr = err
          console.warn(`[MLS] Self-remove publish attempt ${attempt}/3 failed:`, err.message)
        }
      }
      if (!published) {
        throw new Error(
          `Failed to notify the group that you left (${lastErr?.message || 'publish failed'}). ` +
          'You are still a member — try leaving again.'
        )
      }
    })
  }

  await mls.removeMlsState(mlsGroupIdHex)
  commit('CLEAR_MLS_GROUP_STATE', mlsGroupIdHex)
  commit('REMOVE_MLS_ROOM_MAP', roomId)

  if (room) {
    commit('REMOVE_ROOM', roomId)
  }
  await deleteRoomOnServer(roomId)
}