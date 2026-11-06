import { ACTIVE_THRESHOLD_MS } from './state'
import { isMlsMemberPending } from './mls-membership.js'
import { isSelfDmRoom } from './self-chat.js'
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

// Messages the user hid on this device ("Delete for me"). The ids live in
// wallet state (persisted), so every read path must drop them — a relay
// refetch, history replay or MLS re-decrypt would otherwise re-surface a
// message the user already removed.
function visibleMessages (ws, roomId) {
  const messages = ws.messages?.[roomId]
  if (!Array.isArray(messages)) return []
  const hidden = ws.hiddenMessageIds?.[roomId]
  if (!hidden) return messages
  return messages.filter(m => !hidden[m.id])
}

// Newest stored message timestamp for a room, clamped to now. NIP-17
// randomizes created_at by up to 2 days, so a future-dated message could
// otherwise pin its room to the top forever.
function newestMessageActivity (ws, roomId) {
  const messages = visibleMessages(ws, roomId)
  if (!messages.length) return 0
  const newest = messages[messages.length - 1]
  const createdAt = newest?.created_at || 0
  const now = Math.floor(Date.now() / 1000)
  return createdAt > now ? now : createdAt
}

// Last activity time used for chat-list ordering. Falls back through
// updatedAt/createdAt because lastMessageAt is often missing entirely (server
// touch failures, rooms whose messages were never received while open) — those
// rooms would otherwise all sort as 0 below every other chat in arbitrary
// insertion order.
//
// The stored message timestamps are part of the max: lastMessageAt is only set
// on the live send/receive path, so a room that gained messages while its
// notification was handled elsewhere (offline catch-up, backfill, unknown-room
// path where the room object did not exist yet) keeps a stale lastMessageAt
// while already showing a new message and unread badge — it stayed parked in
// its old list position. Unread counts and ordering now both derive from the
// same stored messages, so they cannot disagree.
function roomLastActivity (ws, room) {
  return Math.max(
    room?.lastMessageAt || 0,
    newestMessageActivity(ws, room?.id),
    room?.updatedAt || 0,
    room?.createdAt || 0,
  )
}

export function getRooms (state) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys?.pubKeyHex
  if (!myPubKey) return []
  return (ws.rooms || [])
    .filter(r => r.members?.includes(myPubKey) && !r.archived && !isSelfDmRoom(r, myPubKey))
    .sort((a, b) => roomLastActivity(ws, b) - roomLastActivity(ws, a))
}

export function getArchivedRooms (state) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys?.pubKeyHex
  if (!myPubKey) return []
  return (ws.rooms || [])
    .filter(r => r.members?.includes(myPubKey) && r.archived && !isSelfDmRoom(r, myPubKey))
    .sort((a, b) => roomLastActivity(ws, b) - roomLastActivity(ws, a))
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

/**
 * Pubkeys invited to this room whose acceptance we have not observed yet.
 * An MLS Add commit inserts the invitee into the tree immediately, so this —
 * not tree membership — is what separates "Invited" from "Joined".
 */
export function getMlsPendingInvitees (state) {
  const ws = getWalletState(state)
  return (roomId) => {
    const mlsGroupIdHex = ws.mls?.roomMlsMap?.[roomId]
    if (!mlsGroupIdHex) return []
    const pending = ws.mls?.pendingInvitees?.[mlsGroupIdHex]
    const joined = ws.mls?.joinedMembers?.[mlsGroupIdHex]
    return Object.keys(pending || {}).filter((pubKey) => isMlsMemberPending(pubKey, { pending, joined }))
  }
}

export function getMlsPendingInvitations (state) {
  const ws = getWalletState(state)
  const invites = ws.mls?.pendingInvitations
  if (!invites) return []
  return Object.values(invites).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
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
  const ws = getWalletState(state)
  const messages = ws.messages || {}
  const hidden = ws.hiddenMessageIds
  // No hidden messages → hand back the raw map so consumers keep referential
  // identity (RoomList previews recompute on prop change).
  if (!hidden || !Object.keys(hidden).length) return messages
  const filtered = {}
  for (const roomId of Object.keys(messages)) {
    filtered[roomId] = visibleMessages(ws, roomId)
  }
  return filtered
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
    return visibleMessages(ws, roomId)
  }
}

export function getLastMessage (state) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys?.pubKeyHex
  if (!myPubKey) return () => null
  return (roomId) => {
    const room = (ws.rooms || []).find(r => r.id === roomId && r.members?.includes(myPubKey))
    if (!room) return null
    const msgs = visibleMessages(ws, roomId)
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

// ---- Per-wallet typing indicators ----

// Returns an array of pubKeyHexes currently typing in a room (excluding self).
// Entries older than TYPING_TIMEOUT_MS are treated as expired and excluded.
const TYPING_TIMEOUT_MS = 5000

export function getTypingUsers (state) {
  return (roomId) => {
    const ws = getWalletState(state)
    const myPubKey = ws.keys?.pubKeyHex
    const room = ws.typing?.[roomId]
    if (!room) return []
    const now = Date.now()
    return Object.keys(room).filter(pk => {
      if (pk === myPubKey) return false
      return now - room[pk] < TYPING_TIMEOUT_MS
    })
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
    const msgs = visibleMessages(ws, roomId)
    const readIds = ws.readMessageIds?.[roomId] || {}
    return msgs.filter(m => m.sender !== myPubKey && !readIds[m.id]).length
  }
}

export function getTotalUnreadCount (state) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys?.pubKeyHex
  if (!myPubKey) return 0
  let total = Object.keys(ws.mls?.pendingInvitations || {}).length
  for (const room of (ws.rooms || [])) {
    if (!room.members?.includes(myPubKey)) continue
    const msgs = visibleMessages(ws, room.id)
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

// Whether the first room-list fetch has finished for this wallet. The chat
// index uses it to tell "still loading" (no cached rooms yet → skeletons)
// apart from "no chats yet".
export function isRoomListLoaded (state) {
  // No active wallet (or nothing hydrated for it yet): there is no fetch to
  // wait for, so report loaded and let the empty state render.
  const ws = getWalletState(state)
  if (!ws.roomsLoaded && !Object.keys(ws).length) return true
  return ws.roomsLoaded || false
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
