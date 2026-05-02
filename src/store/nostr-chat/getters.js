import sha256 from 'js-sha256'

export function myNpub (state) {
  return state.keys?.npub
}

export function myPubKey (state) {
  return state.keys?.pubKeyHex
}

export function myPrivKey (state) {
  return state.keys?.privKeyHex
}

export function getContacts (state) {
  return state.contacts
}

export function getContactByNpub (state) {
  return (npub) => state.contacts.find(c => c.npub === npub) || null
}

export function getContactPubKey (state) {
  return (npub) => {
    const contact = state.contacts.find(c => c.npub === npub)
    return contact?.pubKeyHex || null
  }
}

export function getRooms (state) {
  const myPubKey = state.keys?.pubKeyHex
  if (!myPubKey) return []
  return state.rooms
    .filter(r => r.members?.includes(myPubKey))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

export function getRoom (state) {
  const myPubKey = state.keys?.pubKeyHex
  if (!myPubKey) return () => undefined
  return (roomId) => state.rooms.find(r => r.id === roomId && r.members?.includes(myPubKey))
}

export function getRoomByContact (state, getters) {
  return (contactNpub) => {
    const contact = getters.getContactByNpub(contactNpub)
    if (!contact) return undefined
    const myPubKey = state.keys?.pubKeyHex
    if (!myPubKey) return undefined
    const roomId = getters.computeRoomId([myPubKey, contact.pubKeyHex])
    return state.rooms.find(r => r.id === roomId && r.members?.includes(myPubKey))
  }
}

export function getMessages (state) {
  const myPubKey = state.keys?.pubKeyHex
  if (!myPubKey) return () => []
  return (roomId) => {
    const room = state.rooms.find(r => r.id === roomId && r.members?.includes(myPubKey))
    if (!room) return []
    return state.messages[roomId] || []
  }
}

export function getLastMessage (state) {
  const myPubKey = state.keys?.pubKeyHex
  if (!myPubKey) return () => null
  return (roomId) => {
    const room = state.rooms.find(r => r.id === roomId && r.members?.includes(myPubKey))
    if (!room) return null
    const msgs = state.messages[roomId] || []
    return msgs.length ? msgs[msgs.length - 1] : null
  }
}

export function getRelays (state) {
  return state.relays || []
}

export function getRelayStatus (state) {
  return state.relayStatus || {}
}

export function isReady (state) {
  return state.isReady
}

export function isInitialized (state) {
  return state.initialized
}

export function computeRoomId (state, getters) {
  return (pubkeys) => {
    const sorted = pubkeys.slice().sort()
    const hashInput = sorted.join(',')
    return sha256(hashInput)
  }
}
