import { finalizeEvent } from 'nostr-tools'
import { getMnemonicByHash } from 'src/wallet'
import { deriveMlsKeys, deriveMlsHpkeIkms } from 'src/wallet/mls'
import * as relayService from 'src/services/nostr-chat'
import * as mls from 'src/services/mls'
import { Store } from 'src/store'

const MAX_MLS_MEMBERS = 50

const mlsProcessingQueues = new Map()

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

  const { publicPackage } = await mls.generateMlsKeyPackage(
    { publicKey: mlsKeys.publicKey, privateKey: mlsKeys.privateKey },
    nostrPubkeyHex,
    hpkeIkms,
  )

  const unsignedEvent = mls.buildMlsKeyPackageEvent(publicPackage, nostrPubkeyHex)
  const signedEvent = finalizeEvent(unsignedEvent, hexToBytes(ws.keys.privKeyHex))
  await relayService.publishEvent(state.relays, signedEvent)

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

  // Fetch our own published KeyPackage from the relay so we have the public
  // part that matches the deterministic private keys.
  const kpEvent = await relayService.fetchMlsKeyPackage(state.relays, nostrPubkeyHex)
  if (!kpEvent) throw new Error('No published KeyPackage found — call initMls first')

  const kpBytes = decodeKeyPackageContent(kpEvent.content)
  const kpMlsMessage = mls.decodeMlsMsg(kpBytes)
  if (kpMlsMessage.wireformat !== 'mls_key_package') throw new Error('Invalid KeyPackage')
  const publicPackage = kpMlsMessage.keyPackage

  const { bytes: welcomeBytes } = decodeMlsEventContent(welcomeEvent.content)
  const welcome = mls.decodeWelcomeFromBytes(welcomeBytes)

  const clientState = await mls.joinMlsGroup(welcome, publicPackage, privatePackage)

  const groupIdHex = Array.from(clientState.groupContext.group_id).map(b => b.toString(16).padStart(2, '0')).join('')

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

  return { clientState, groupIdHex }
}

// ---- Sending messages ----

export async function sendMlsMessage({ commit, state }, { roomId, text, replyTo }) {
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

  const { privateMessage, newState } = await mls.encryptMlsMessage(clientState, text, impl)

  const wrapped = mls.wrapPrivateMessage(privateMessage)
  const unsignedEvent = mls.buildMlsNostrEvent(wrapped, 30117, mlsGroupIdHex, roomId, ws.keys.pubKeyHex, mlsMemberPubkeys(clientState))
  const signedEvent = finalizeEvent(unsignedEvent, hexToBytes(ws.keys.privKeyHex))

  await relayService.publishEvent(state.relays, signedEvent)

  await mls.saveMlsState(mlsGroupIdHex, newState)
  commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex, clientState: newState })

  const message = {
    id: signedEvent.id,
    roomId,
    sender: ws.keys.pubKeyHex,
    content: text,
    kind: 30117,
    created_at: unsignedEvent.created_at,
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
      // Skip if we're already a member of this room — e.g. the creator
      // processing the welcome event it published (relay echoes it back via
      // the authors subscription). Joining our own group would fail because
      // the welcome is encrypted to the invitee's KeyPackage, not ours.
      if (ws.mls.roomMlsMap?.[rTag[1]]) return
      await dispatch('joinMlsGroup', { roomId: rTag[1], welcomeEvent: event })
    }
    return
  }

  const hTag = event.tags?.find(t => t[0] === 'h')
  if (!hTag) return
  const mlsGroupIdHex = hTag[1]

  await withMlsProcessingLock(mlsGroupIdHex, async () => {
    let clientState = await mls.loadMlsState(mlsGroupIdHex, impl, {})
    if (!clientState && ws.mls.groupStates[mlsGroupIdHex]) {
      clientState = ws.mls.groupStates[mlsGroupIdHex]
    }
    if (!clientState) return

    try {
      const result = await mls.processMlsMessage(clientState, contentBytes, impl)

      await mls.saveMlsState(mlsGroupIdHex, result.newState)
      commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex, clientState: result.newState })

      if (result.plaintext) {
        const rTag = event.tags?.find(t => t[0] === 'r')
        const roomId = rTag ? rTag[1] : null

        commit('ADD_MESSAGE', {
          roomId,
          message: {
            id: event.id,
            roomId,
            sender: event.pubkey,
            content: result.plaintext,
            kind,
            created_at: event.created_at,
          },
        })
        commit('TOUCH_ROOM_LAST_MESSAGE_AT', roomId)
      }
    } catch (err) {
      console.warn('[MLS] Failed to process message:', err.message)
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

  const kpEvent = await relayService.fetchMlsKeyPackage(state.relays, memberPubKey)
  if (!kpEvent) throw new Error('KeyPackage not found for member')

  const kpBytes = decodeKeyPackageContent(kpEvent.content)
  const kpMlsMessage = mls.decodeMlsMsg(kpBytes)
  if (kpMlsMessage.wireformat !== 'mls_key_package') throw new Error('Invalid KeyPackage event')
  const inviteeKeyPackage = kpMlsMessage.keyPackage

  const { newState, commit: commitMsg, welcome } = await mls.addMlsMember(clientState, inviteeKeyPackage, impl)

  const commitEvent = mls.buildMlsNostrEvent(commitMsg, 30118, mlsGroupIdHex, roomId, ws.keys.pubKeyHex, mlsMemberPubkeys(clientState))
  const signedCommit = finalizeEvent(commitEvent, hexToBytes(ws.keys.privKeyHex))
  await relayService.publishEvent(state.relays, signedCommit)

  if (welcome) {
    const welcomeMlsMsg = { version: 'mls10', wireformat: 'mls_welcome', welcome }
    const welcomeUnsigned = mls.buildMlsNostrEvent(welcomeMlsMsg, 30119, mlsGroupIdHex, roomId, ws.keys.pubKeyHex)
    welcomeUnsigned.tags.push(['p', memberPubKey])
    const room = ws.rooms.find(r => r.id === roomId)
    if (room?.name) {
      welcomeUnsigned.tags.push(['n', room.name])
    }
    const signedWelcome = finalizeEvent(welcomeUnsigned, hexToBytes(ws.keys.privKeyHex))
    await relayService.publishEvent(state.relays, signedWelcome)
  }

  await mls.saveMlsState(mlsGroupIdHex, newState)
  commit('SET_MLS_GROUP_STATE', { mlsGroupIdHex, clientState: newState })

  const room = ws.rooms.find(r => r.id === roomId)
  if (room && !room.members.includes(memberPubKey)) {
    commit('UPDATE_ROOM', { id: roomId, members: [...room.members, memberPubKey] })
  }
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
    commit('UPDATE_ROOM', { id: roomId, members: room.members.filter(m => m !== memberPubkey) })
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

  const room = ws.rooms.find(r => r.id === roomId)
  if (room) {
    commit('REMOVE_ROOM', roomId)
  }
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