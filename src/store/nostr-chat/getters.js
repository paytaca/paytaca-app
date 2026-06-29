import { ACTIVE_THRESHOLD_MS } from './state'
import sha256 from 'js-sha256'
import { Store } from 'src/store'

function getCurrentWalletHash () {
  try {
    const wallet = Store.getters['global/getWallet']('bch')
    return wallet?.walletHash || null
  } catch (error) {
    return null
  }
}

function getWalletState (state, walletHash = null) {
  const hash = walletHash || getCurrentWalletHash()
  if (!hash) return {}
  if (!state.byWallet) return {}
  if (!state.byWallet[hash]) return {}
  return state.byWallet[hash]
}

export function getWalletStateByHash (state) {
  return function (walletHash) {
    return getWalletState(state, walletHash)
  }
}

// ---- Per-wallet identity getters ----

export function myNpub (state) {
  return getWalletState(state).keys?.npub
}

export function myPubKey (state) {
  return getWalletState(state).keys?.pubKeyHex
}

export function myPrivKey (state) {
  return getWalletState(state).keys?.privKeyHex
}

// ---- Global getters (contacts, relays) ----

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

export function getRelays (state) {
  return state.relays || []
}

export function getActiveStatus (state) {
  return (pubKeyHex) => {
    const activeStatus = state.activeStatus || {}
    const entry = activeStatus[pubKeyHex]
    if (!entry || !entry.lastActiveAt) return { isActive: false, lastActiveAt: null }
    const elapsed = Date.now() - new Date(entry.lastActiveAt).getTime()
    return { isActive: elapsed <= ACTIVE_THRESHOLD_MS, lastActiveAt: entry.lastActiveAt }
  }
}

export function getActiveStatusMap (state) {
  return state.activeStatus || {}
}

// ---- Per-wallet room getters ----

export function getRooms (state) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys?.pubKeyHex
  if (!myPubKey) return []
  return (ws.rooms || [])
    .filter(r => r.members?.includes(myPubKey) && !r.archived)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

export function getArchivedRooms (state) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys?.pubKeyHex
  if (!myPubKey) return []
  return (ws.rooms || [])
    .filter(r => r.members?.includes(myPubKey) && r.archived)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

export function getRoom (state) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys?.pubKeyHex
  if (!myPubKey) return () => undefined
  return (roomId) => (ws.rooms || []).find(r => r.id === roomId && r.members?.includes(myPubKey))
}

export function getRoomByContact (state, getters) {
  return (contactNpub) => {
    const contact = getters.getContactByNpub(contactNpub)
    if (!contact) return undefined
    const ws = getWalletState(state)
    const myPubKey = ws.keys?.pubKeyHex
    if (!myPubKey) return undefined
    const roomId = getters.computeRoomId([myPubKey, contact.pubKeyHex])
    return (ws.rooms || []).find(r => r.id === roomId && r.members?.includes(myPubKey))
  }
}

export function getRoomByMember (state) {
  const ws = getWalletState(state)
  return (memberPubKeyHex) => {
    const myPubKey = ws.keys?.pubKeyHex
    if (!myPubKey) return undefined
    return (ws.rooms || []).find(r => {
      return r.members?.includes(memberPubKeyHex) &&
        r.members?.includes(myPubKey) &&
        r.members.length === 2
    })
  }
}

export function getRoomById (state) {
  const ws = getWalletState(state)
  return (roomId) => (ws.rooms || []).find(r => r.id === roomId) || null
}

// ---- Per-wallet message getters ----

export function getAllMessages (state) {
  return getWalletState(state).messages || {}
}

export function getReadMessageIds (state) {
  return getWalletState(state).readMessageIds || {}
}

export function getMessages (state) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys?.pubKeyHex
  if (!myPubKey) return () => []
  return (roomId) => {
    const room = (ws.rooms || []).find(r => r.id === roomId && r.members?.includes(myPubKey))
    if (!room) return []
    return ws.messages?.[roomId] || []
  }
}

export function getLastMessage (state) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys?.pubKeyHex
  if (!myPubKey) return () => null
  return (roomId) => {
    const room = (ws.rooms || []).find(r => r.id === roomId && r.members?.includes(myPubKey))
    if (!room) return null
    const msgs = ws.messages?.[roomId] || []
    return msgs.length ? msgs[msgs.length - 1] : null
  }
}

// ---- Per-wallet blocked contacts ----

export function isContactBlocked (state) {
  const ws = getWalletState(state)
  return (pubKeyHex) => (ws.blockedContacts || []).includes(pubKeyHex) || false
}

export function getBlockedContacts (state) {
  const ws = getWalletState(state)
  return ws.blockedContacts || []
}

// ---- Per-wallet blocked groups ("left" groups) ----

export function isGroupBlocked (state) {
  const ws = getWalletState(state)
  return (roomId) => (ws.blockedGroups || []).includes(roomId) || false
}

export function getBlockedGroups (state) {
  const ws = getWalletState(state)
  return ws.blockedGroups || []
}

// ---- Per-wallet read receipts ----

export function getMessageReadBy (state) {
  const ws = getWalletState(state)
  return (roomId) => ws.messageReadBy?.[roomId] || {}
}

export function getReadReceipt (state) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys?.pubKeyHex
  if (!myPubKey) return () => null
  return (roomId, pubKey) => {
    const room = (ws.rooms || []).find(r => r.id === roomId && r.members?.includes(myPubKey))
    if (!room) return null
    return ws.readReceipts?.[roomId]?.[pubKey] || null
  }
}

export function isMessageRead (state, getters) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys?.pubKeyHex
  if (!myPubKey) return () => false
  return (roomId, message) => {
    const room = (ws.rooms || []).find(r => r.id === roomId && r.members?.includes(myPubKey))
    if (!room) return false
    if (message.sender !== myPubKey) return false

    const receipts = ws.readReceipts?.[roomId] || {}
    return room.members.some(memberPubKey => {
      if (memberPubKey === myPubKey) return false
      const readAt = receipts[memberPubKey]
      return readAt && readAt >= message.created_at
    })
  }
}

// ---- Per-wallet reactions ----

export function getMessageReactions (state) {
  const ws = getWalletState(state)
  return (roomId, messageId) => {
    return ws.reactions?.[roomId]?.[messageId] || []
  }
}

// ---- Per-wallet unread counts ----

export function getUnreadCount (state) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys?.pubKeyHex
  if (!myPubKey) return () => 0
  return (roomId) => {
    const room = (ws.rooms || []).find(r => r.id === roomId && r.members?.includes(myPubKey))
    if (!room) return 0
    const msgs = ws.messages?.[roomId] || []
    const readIds = ws.readMessageIds?.[roomId] || {}
    return msgs.filter(m => m.sender !== myPubKey && !readIds[m.id]).length
  }
}

export function getTotalUnreadCount (state) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys?.pubKeyHex
  if (!myPubKey) return 0
  let total = 0
  for (const room of (ws.rooms || [])) {
    if (!room.members?.includes(myPubKey)) continue
    const msgs = ws.messages?.[room.id] || []
    const readIds = ws.readMessageIds?.[room.id] || {}
    total += msgs.filter(m => m.sender !== myPubKey && !readIds[m.id]).length
  }
  return total
}

// ---- Per-wallet profile ----

export function getProfile (state) {
  return getWalletState(state).profile || {}
}

export function getShowActiveStatus (state) {
  return getWalletState(state).showActiveStatus !== false
}

// ---- Per-wallet runtime flags ----

export function isReady (state) {
  return getWalletState(state).isReady || false
}

export function isInitialized (state) {
  return getWalletState(state).initialized || false
}

export function isSubscribed (state) {
  return getWalletState(state).isSubscribed || false
}

export function getRelayStatus (state) {
  return getWalletState(state).relayStatus || {}
}

// ---- Utility ----

export function computeRoomId (state, getters) {
  return (pubkeys) => {
    const sorted = pubkeys.slice().sort()
    const hashInput = sorted.join(',')
    return sha256(hashInput)
  }
}
