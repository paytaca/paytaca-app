export function SET_KEYS (state, keys) {
  state.keys = keys
}

export function SET_READY (state, ready) {
  state.isReady = ready
}

export function SET_INITIALIZED (state, val) {
  state.initialized = val
}

export function SET_RELAY_STATUS (state, { url, status }) {
  state.relayStatus = { ...state.relayStatus, [url]: status }
}

export function SET_SUBSCRIBED (state, val) {
  state.isSubscribed = val
}

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

export function ADD_ROOM (state, room) {
  if (!state.rooms.find(r => r.id === room.id)) {
    state.rooms.push(room)
  }
}

export function UPDATE_ROOM (state, room) {
  const index = state.rooms.findIndex(r => r.id === room.id)
  if (index >= 0) {
    state.rooms[index] = { ...state.rooms[index], ...room }
  }
}

export function UPDATE_ROOM_SUBJECT (state, { roomId, subject }) {
  const room = state.rooms.find(r => r.id === roomId)
  if (room) {
    room.subject = subject
    if (subject) {
      room.name = subject
    }
    room.updatedAt = Math.floor(Date.now() / 1000)
  }
}

export function UPDATE_ROOM_NAME (state, { roomId, name }) {
  const room = state.rooms.find(r => r.id === roomId)
  if (room) {
    room.name = name
    room.updatedAt = Math.floor(Date.now() / 1000)
  }
}

export function UPDATE_ROOM_TYPE (state, { roomId, type }) {
  const room = state.rooms.find(r => r.id === roomId)
  if (room) {
    room.type = type
  }
}

export function REMOVE_ROOM (state, roomId) {
  state.rooms = state.rooms.filter(r => r.id !== roomId)
  delete state.messages[roomId]
}

export function ARCHIVE_ROOM (state, roomId) {
  const room = state.rooms.find(r => r.id === roomId)
  if (room) {
    room.archived = true
    room.updatedAt = Math.floor(Date.now() / 1000)
  }
}

export function UNARCHIVE_ROOM (state, roomId) {
  const room = state.rooms.find(r => r.id === roomId)
  if (room) {
    room.archived = false
    room.updatedAt = Math.floor(Date.now() / 1000)
  }
}

export function BLOCK_CONTACT (state, pubKeyHex) {
  if (!state.blockedContacts.includes(pubKeyHex)) {
    state.blockedContacts.push(pubKeyHex)
  }
}

export function UNBLOCK_CONTACT (state, pubKeyHex) {
  state.blockedContacts = state.blockedContacts.filter(k => k !== pubKeyHex)
}

export function ADD_MESSAGE (state, { roomId, message }) {
  if (!state.messages[roomId]) {
    state.messages[roomId] = []
  }
  const exists = state.messages[roomId].find(m => m.id === message.id)
  if (!exists) {
    state.messages[roomId].push(message)
    state.messages[roomId].sort((a, b) => a.created_at - b.created_at)
    const room = state.rooms.find(r => r.id === roomId)
    if (room) {
      room.updatedAt = Math.max(room.updatedAt || 0, message.created_at)
    }
  }
}

export function SET_MESSAGES_FOR_ROOM (state, { roomId, messages }) {
  state.messages[roomId] = messages.slice().sort((a, b) => a.created_at - b.created_at)
}

export function UPDATE_MESSAGE (state, { roomId, messageId, newContent }) {
  const messages = state.messages[roomId]
  if (!messages) return
  const msg = messages.find(m => m.id === messageId)
  if (msg) {
    msg.content = newContent
    msg.edited = true
  }
}

export function DELETE_MESSAGE (state, { roomId, messageId }) {
  const messages = state.messages[roomId]
  if (!messages) return
  const msg = messages.find(m => m.id === messageId)
  if (msg) {
    msg.deleted = true
    msg.content = ''
  }
}

export function SET_READ_RECEIPT (state, { roomId, pubKey, timestamp }) {
  if (!state.readReceipts) {
    state.readReceipts = {}
  }
  if (!state.readReceipts[roomId]) {
    state.readReceipts[roomId] = {}
  }
  state.readReceipts[roomId][pubKey] = timestamp
}

export function MARK_MESSAGES_AS_READ (state, { roomId, messageIds }) {
  if (!state.readMessageIds) {
    state.readMessageIds = {}
  }
  if (!state.readMessageIds[roomId]) {
    state.readMessageIds[roomId] = {}
  }
  for (const id of messageIds) {
    state.readMessageIds[roomId][id] = true
  }
}

export function SET_MESSAGE_READ_BY (state, { roomId, messageId, readerPubKey }) {
  if (!state.messageReadBy) {
    state.messageReadBy = {}
  }
  if (!state.messageReadBy[roomId]) {
    state.messageReadBy[roomId] = {}
  }
  if (!state.messageReadBy[roomId][messageId]) {
    state.messageReadBy[roomId][messageId] = {}
  }
  state.messageReadBy[roomId][messageId][readerPubKey] = true
}

export function ADD_MESSAGE_REACTION (state, { roomId, messageId, reactorPubKey, emoji, createdAt }) {
  if (!state.reactions) state.reactions = {}
  if (!state.reactions[roomId]) state.reactions[roomId] = {}
  if (!state.reactions[roomId][messageId]) state.reactions[roomId][messageId] = []

  const reactions = state.reactions[roomId][messageId]
  const existing = reactions.findIndex(r => r.reactorPubKey === reactorPubKey && r.emoji === emoji)
  if (existing >= 0) {
    reactions.splice(existing, 1)
  }
  reactions.push({ emoji, reactorPubKey, createdAt: createdAt || Date.now() })
}

export function REMOVE_MESSAGE_REACTION (state, { roomId, messageId, reactorPubKey, emoji }) {
  const reactions = state.reactions?.[roomId]?.[messageId]
  if (!reactions) return
  const existing = reactions.findIndex(r => r.reactorPubKey === reactorPubKey && r.emoji === emoji)
  if (existing >= 0) {
    reactions.splice(existing, 1)
  }
}

export function SET_RELAYS (state, relays) {
  state.relays = relays
}

export function SET_PROFILE_BCH_ADDRESS (state, { address, publishedAt }) {
  if (!state.profile) state.profile = {}
  state.profile.bchAddress = address
  state.profile.publishedAt = publishedAt
}

export function CLEAR_PROFILE_BCH_ADDRESS (state) {
  if (!state.profile) state.profile = {}
  state.profile.bchAddress = null
  state.profile.publishedAt = null
}
