import { Store } from 'src/store'
import { getInitialWalletState } from './state'

function getCurrentWalletHash () {
  try {
    const wallet = Store.getters['global/getWallet']('bch')
    return wallet?.walletHash || null
  } catch (error) {
    return null
  }
}

function getOrInitWalletState (state, walletHash = null) {
  const hash = walletHash || getCurrentWalletHash()
  if (!hash) {
    console.warn('No wallet hash available for nostr-chat state')
    return null
  }

  if (!state.byWallet) state.byWallet = {}

  if (!state.byWallet[hash]) {
    state.byWallet[hash] = getInitialWalletState()
  }

  return state.byWallet[hash]
}

export function initializeWalletState (state, walletHash) {
  if (!walletHash) {
    console.warn('initializeWalletState: walletHash is required')
    return
  }

  if (!state.byWallet) state.byWallet = {}

  if (!state.byWallet[walletHash]) {
    state.byWallet[walletHash] = getInitialWalletState()
  }
}

export function removeWalletState (state, walletHash) {
  if (state.byWallet && walletHash) {
    delete state.byWallet[walletHash]
  }
}

// ---- Per-wallet mutations ----

export function SET_KEYS (state, keys) {
  const ws = getOrInitWalletState(state)
  if (ws) ws.keys = keys
}

export function SET_READY (state, ready) {
  const ws = getOrInitWalletState(state)
  if (ws) ws.isReady = ready
}

export function SET_INITIALIZED (state, val) {
  const ws = getOrInitWalletState(state)
  if (ws) ws.initialized = val
}

export function SET_RELAY_STATUS (state, { url, status }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  ws.relayStatus = { ...ws.relayStatus, [url]: status }
}

export function SET_SUBSCRIBED (state, val) {
  const ws = getOrInitWalletState(state)
  if (ws) ws.isSubscribed = val
}

// ---- Global mutations (contacts, relays) ----

export function ADD_CONTACT (state, contact) {
  if (!state.contacts.find(c => c.npub === contact.npub)) {
    state.contacts.push(contact)
  }
}

export function UPDATE_CONTACT (state, contact) {
  const index = state.contacts.findIndex(c => c.npub === contact.npub)
  if (index >= 0) {
    state.contacts[index] = { ...state.contacts[index], ...contact }
  }
}

export function REMOVE_CONTACT (state, npub) {
  state.contacts = state.contacts.filter(c => c.npub !== npub)
}

export function SET_RELAYS (state, relays) {
  state.relays = relays
}

// ---- Per-wallet room mutations ----

export function ADD_ROOM (state, room) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.rooms.find(r => r.id === room.id)) {
    ws.rooms.push(room)
  }
}

export function UPDATE_ROOM (state, room) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  const index = ws.rooms.findIndex(r => r.id === room.id)
  if (index >= 0) {
    ws.rooms[index] = { ...ws.rooms[index], ...room }
  }
}

export function UPDATE_ROOM_SUBJECT (state, { roomId, subject }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  const room = ws.rooms.find(r => r.id === roomId)
  if (room) {
    room.subject = subject
    if (subject) {
      room.name = subject
    }
    room.updatedAt = Math.floor(Date.now() / 1000)
  }
}

export function UPDATE_ROOM_NAME (state, { roomId, name }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  const room = ws.rooms.find(r => r.id === roomId)
  if (room) {
    room.name = name
    room.updatedAt = Math.floor(Date.now() / 1000)
  }
}

export function UPDATE_ROOM_TYPE (state, { roomId, type }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  const room = ws.rooms.find(r => r.id === roomId)
  if (room) {
    room.type = type
  }
}

export function REMOVE_ROOM (state, roomId) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.deletedRooms) ws.deletedRooms = {}
  const messages = ws.messages[roomId] || []
  const knownMessageIds = {}
  for (const msg of messages) {
    if (msg.id) knownMessageIds[msg.id] = true
  }
  ws.deletedRooms[roomId] = {
    deletedAt: Date.now(),
    knownMessageIds,
  }
  ws.rooms = ws.rooms.filter(r => r.id !== roomId)
  delete ws.messages[roomId]
}

export function ARCHIVE_ROOM (state, roomId) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  const room = ws.rooms.find(r => r.id === roomId)
  if (room) {
    room.archived = true
    room.updatedAt = Math.floor(Date.now() / 1000)
  }
}

export function UNARCHIVE_ROOM (state, roomId) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  const room = ws.rooms.find(r => r.id === roomId)
  if (room) {
    room.archived = false
    room.updatedAt = Math.floor(Date.now() / 1000)
  }
}

// ---- Per-wallet blocked contacts ----

export function BLOCK_CONTACT (state, pubKeyHex) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.blockedContacts.includes(pubKeyHex)) {
    ws.blockedContacts.push(pubKeyHex)
  }
}

export function UNBLOCK_CONTACT (state, pubKeyHex) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  ws.blockedContacts = ws.blockedContacts.filter(k => k !== pubKeyHex)
}

// ---- Per-wallet message mutations ----

export function ADD_MESSAGE (state, { roomId, message }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.messages[roomId]) {
    ws.messages[roomId] = []
  }
  const exists = ws.messages[roomId].find(m => m.id === message.id)
  if (!exists) {
    const arr = ws.messages[roomId]
    let i = arr.length
    while (i > 0 && arr[i - 1].created_at > message.created_at) i--
    arr.splice(i, 0, message)
    const room = ws.rooms.find(r => r.id === roomId)
    if (room) {
      room.updatedAt = Math.max(room.updatedAt || 0, message.created_at)
    }
  }
}

export function SET_MESSAGES_FOR_ROOM (state, { roomId, messages }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  ws.messages[roomId] = messages.slice().sort((a, b) => a.created_at - b.created_at)
}

export function UPDATE_MESSAGE (state, { roomId, messageId, newContent }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  const messages = ws.messages[roomId]
  if (!messages) return
  const msg = messages.find(m => m.id === messageId)
  if (msg) {
    msg.content = newContent
    msg.edited = true
  }
}

export function DELETE_MESSAGE (state, { roomId, messageId }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  const messages = ws.messages[roomId]
  if (!messages) return
  const msg = messages.find(m => m.id === messageId)
  if (msg) {
    msg.deleted = true
    msg.content = ''
  }
}

// ---- Per-wallet read receipts ----

export function SET_READ_RECEIPT (state, { roomId, pubKey, timestamp }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.readReceipts) ws.readReceipts = {}
  if (!ws.readReceipts[roomId]) ws.readReceipts[roomId] = {}
  ws.readReceipts[roomId][pubKey] = timestamp
}

export function MARK_MESSAGES_AS_READ (state, { roomId, messageIds }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.readMessageIds) ws.readMessageIds = {}
  if (!ws.readMessageIds[roomId]) ws.readMessageIds[roomId] = {}
  for (const id of messageIds) {
    ws.readMessageIds[roomId][id] = true
  }
}

export function SET_MESSAGE_READ_BY (state, { roomId, messageId, readerPubKey }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.messageReadBy) ws.messageReadBy = {}
  if (!ws.messageReadBy[roomId]) ws.messageReadBy[roomId] = {}
  if (!ws.messageReadBy[roomId][messageId]) ws.messageReadBy[roomId][messageId] = {}
  ws.messageReadBy[roomId][messageId][readerPubKey] = true
}

// ---- Per-wallet reactions ----

export function ADD_MESSAGE_REACTION (state, { roomId, messageId, reactorPubKey, emoji, createdAt }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.reactions) ws.reactions = {}
  if (!ws.reactions[roomId]) ws.reactions[roomId] = {}
  if (!ws.reactions[roomId][messageId]) ws.reactions[roomId][messageId] = []

  const reactions = ws.reactions[roomId][messageId]
  const existing = reactions.findIndex(r => r.reactorPubKey === reactorPubKey && r.emoji === emoji)
  if (existing >= 0) {
    reactions.splice(existing, 1)
  }
  reactions.push({ emoji, reactorPubKey, createdAt: createdAt || Date.now() })
}

export function REMOVE_MESSAGE_REACTION (state, { roomId, messageId, reactorPubKey, emoji }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  const reactions = ws.reactions?.[roomId]?.[messageId]
  if (!reactions) return
  const existing = reactions.findIndex(r => r.reactorPubKey === reactorPubKey && r.emoji === emoji)
  if (existing >= 0) {
    reactions.splice(existing, 1)
  }
}

// ---- Per-wallet caches ----

export function CACHE_BCH_ADDRESS (state, { pubKeyHex, address }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.bchAddressCache) ws.bchAddressCache = {}
  ws.bchAddressCache[pubKeyHex] = { address, fetchedAt: Date.now() }
}

export function CACHE_DISPLAY_NAME (state, { pubKeyHex, displayName }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.displayNameCache) ws.displayNameCache = {}
  ws.displayNameCache[pubKeyHex] = { displayName, fetchedAt: Date.now() }
}

export function CACHE_AVATAR (state, { pubKeyHex, avatar }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.avatarCache) ws.avatarCache = {}
  ws.avatarCache[pubKeyHex] = { avatar, fetchedAt: Date.now() }
}

export function CLEAR_CACHE_BCH_ADDRESS (state, { pubKeyHex }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (ws.bchAddressCache && pubKeyHex) {
    delete ws.bchAddressCache[pubKeyHex]
  }
}

export function CLEAR_CACHE_DISPLAY_NAME (state, { pubKeyHex }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (ws.displayNameCache && pubKeyHex) {
    delete ws.displayNameCache[pubKeyHex]
  }
}

export function CLEAR_CACHE_AVATAR (state, { pubKeyHex }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (ws.avatarCache && pubKeyHex) {
    delete ws.avatarCache[pubKeyHex]
  }
}

// ---- Per-wallet profile mutations ----

export function SET_PROFILE_BCH_ADDRESS (state, { address, publishedAt }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.profile) ws.profile = {}
  ws.profile.bchAddress = address
  ws.profile.publishedAt = publishedAt
}

export function CLEAR_PROFILE_BCH_ADDRESS (state) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.profile) ws.profile = {}
  ws.profile.bchAddress = null
  ws.profile.publishedAt = null
}

export function SET_PROFILE_DISPLAY_NAME (state, { displayName, publishedAt }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.profile) ws.profile = {}
  ws.profile.displayName = displayName
  ws.profile.displayNamePublishedAt = publishedAt
}

export function CLEAR_PROFILE_DISPLAY_NAME (state) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.profile) ws.profile = {}
  ws.profile.displayName = null
  ws.profile.displayNamePublishedAt = null
}

export function SET_PROFILE_AVATAR (state, { avatar, publishedAt }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.profile) ws.profile = {}
  ws.profile.avatar = avatar
  ws.profile.avatarPublishedAt = publishedAt
}

export function CLEAR_PROFILE_AVATAR (state) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.profile) ws.profile = {}
  ws.profile.avatar = null
  ws.profile.avatarPublishedAt = null
}

export function RESET_PROFILE (state) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  ws.profile = {
    bchAddress: null,
    publishedAt: null,
    displayName: null,
    displayNamePublishedAt: null,
    avatar: null,
    avatarPublishedAt: null,
  }
}

// Direct mutation for deleting a deletedRooms entry (used by actions)
export function DELETE_ROOM_TRACKER (state, roomId) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (ws.deletedRooms?.[roomId]) delete ws.deletedRooms[roomId]
}

// Reset per-wallet chat data (conversations, caches) but keep keys and profile
export function RESET_WALLET_CHAT_DATA (state) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  ws.rooms = []
  ws.deletedRooms = {}
  ws.messages = {}
  ws.readReceipts = {}
  ws.readMessageIds = {}
  ws.messageReadBy = {}
  ws.reactions = {}
  ws.blockedContacts = []
  ws.bchAddressCache = {}
  ws.displayNameCache = {}
  ws.avatarCache = {}
  ws.isSubscribed = false
}
