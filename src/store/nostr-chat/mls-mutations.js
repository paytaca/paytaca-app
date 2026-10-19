import { Store } from 'src/store'
import { getInitialWalletState } from './state'

// Cap on the per-group processed-445-event tombstones. Bounds localStorage
// growth while comfortably covering any realistic group history replay window.
const MAX_PROCESSED_EVENT_IDS = 2000

function getCurrentWalletHash() {
  try {
    const wallet = Store.getters['global/getWallet']('bch')
    return wallet?.walletHash || null
  } catch {
    return null
  }
}

function getOrInitWalletState(state, walletHash = null) {
  const hash = walletHash || getCurrentWalletHash()
  if (!hash) return null
  if (!state.byWallet) state.byWallet = {}
  if (!state.byWallet[hash]) state.byWallet[hash] = getInitialWalletState()
  // Restored state may predate the MLS feature; ensure the mls sub-state exists.
  if (typeof state.byWallet[hash].mls !== 'object' || state.byWallet[hash].mls === null) {
    state.byWallet[hash].mls = { ready: false, keyPackage: null, groupStates: {}, roomMlsMap: {}, roomMlsNostrMap: {}, pendingInvitations: {}, declinedWelcomeIds: {}, handledWelcomeIds: {}, failedEventAttempts: {}, processedEventIds: {}, pendingInvitees: {}, kpHistory: [] }
  }
  if (typeof state.byWallet[hash].mls.roomMlsNostrMap !== 'object' || state.byWallet[hash].mls.roomMlsNostrMap === null) {
    state.byWallet[hash].mls.roomMlsNostrMap = {}
  }
  if (!Array.isArray(state.byWallet[hash].mls.kpHistory)) {
    state.byWallet[hash].mls.kpHistory = []
  }
  if (typeof state.byWallet[hash].mls.declinedWelcomeIds !== 'object' || state.byWallet[hash].mls.declinedWelcomeIds === null) {
    state.byWallet[hash].mls.declinedWelcomeIds = {}
  }
  if (typeof state.byWallet[hash].mls.handledWelcomeIds !== 'object' || state.byWallet[hash].mls.handledWelcomeIds === null) {
    state.byWallet[hash].mls.handledWelcomeIds = {}
  }
  if (typeof state.byWallet[hash].mls.failedEventAttempts !== 'object' || state.byWallet[hash].mls.failedEventAttempts === null) {
    state.byWallet[hash].mls.failedEventAttempts = {}
  }
  if (typeof state.byWallet[hash].mls.processedEventIds !== 'object' || state.byWallet[hash].mls.processedEventIds === null) {
    state.byWallet[hash].mls.processedEventIds = {}
  }
  if (typeof state.byWallet[hash].mls.pendingInvitees !== 'object' || state.byWallet[hash].mls.pendingInvitees === null) {
    state.byWallet[hash].mls.pendingInvitees = {}
  }
  return state.byWallet[hash]
}

export function SET_MLS_READY(state, ready) {
  const ws = getOrInitWalletState(state)
  if (ws) ws.mls.ready = ready
}

export function SET_MLS_KEY_PACKAGE(state, kp) {
  const ws = getOrInitWalletState(state)
  if (ws) ws.mls.keyPackage = kp
}

export function SET_MLS_GROUP_STATE(state, { mlsGroupIdHex, clientState }) {
  const ws = getOrInitWalletState(state)
  if (ws) ws.mls.groupStates[mlsGroupIdHex] = clientState
}

export function CLEAR_MLS_GROUP_STATE(state, mlsGroupIdHex) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  delete ws.mls.groupStates[mlsGroupIdHex]
  // The group's ratchet state is gone, so the processed-event tombstones are
  // meaningless too (a rebuilt group starts at a fresh epoch).
  if (ws.mls.processedEventIds) delete ws.mls.processedEventIds[mlsGroupIdHex]
  if (ws.mls.pendingInvitees) delete ws.mls.pendingInvitees[mlsGroupIdHex]
}

/**
 * Record that a member was invited but has not accepted yet. An MLS Add commit
 * inserts the invitee into the tree immediately, so this set — not tree
 * membership — is what separates "Invited" from "Joined" in Group Info.
 */
export function MARK_MLS_INVITEE_PENDING(state, { mlsGroupIdHex, memberPubKey }) {
  const ws = getOrInitWalletState(state)
  if (!ws || !mlsGroupIdHex || !memberPubKey) return
  if (!ws.mls.pendingInvitees) ws.mls.pendingInvitees = {}
  if (!ws.mls.pendingInvitees[mlsGroupIdHex]) ws.mls.pendingInvitees[mlsGroupIdHex] = {}
  ws.mls.pendingInvitees[mlsGroupIdHex][memberPubKey] = Math.floor(Date.now() / 1000)
}

/** Clear the pending flag once the invitee has demonstrably joined. */
export function CLEAR_MLS_INVITEE_PENDING(state, { mlsGroupIdHex, memberPubKey }) {
  const ws = getOrInitWalletState(state)
  if (!ws || !mlsGroupIdHex || !memberPubKey) return
  const pending = ws.mls.pendingInvitees?.[mlsGroupIdHex]
  if (!pending) return
  delete pending[memberPubKey]
  if (!Object.keys(pending).length) delete ws.mls.pendingInvitees[mlsGroupIdHex]
}

export function SET_MLS_ROOM_MAP(state, { roomId, mlsGroupIdHex, nostrGroupIdHex }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  ws.mls.roomMlsMap[roomId] = mlsGroupIdHex
  if (nostrGroupIdHex) {
    if (!ws.mls.roomMlsNostrMap) ws.mls.roomMlsNostrMap = {}
    ws.mls.roomMlsNostrMap[roomId] = nostrGroupIdHex
  }
}

export function REMOVE_MLS_ROOM_MAP(state, roomId) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  delete ws.mls.roomMlsMap[roomId]
  if (ws.mls.roomMlsNostrMap) delete ws.mls.roomMlsNostrMap[roomId]
}

export function PUSH_MLS_KP_HISTORY(state, { content, publishedAt }) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  ws.mls.kpHistory.unshift({ content, publishedAt })
  if (ws.mls.kpHistory.length > 3) ws.mls.kpHistory.length = 3
  // Remove duplicates that share the same content (e.g. a re-published KP
  // after an app restart that hasn't changed). Keep the most recent one.
  for (let i = ws.mls.kpHistory.length - 1; i >= 1; i--) {
    if (ws.mls.kpHistory[i].content === ws.mls.kpHistory[0].content) {
      ws.mls.kpHistory.splice(i, 1)
    }
  }
}

export function ADD_MLS_INVITE(state, invite) {
  const ws = getOrInitWalletState(state)
  if (ws) {
    if (!ws.mls.pendingInvitations) ws.mls.pendingInvitations = {}
    ws.mls.pendingInvitations[invite.roomId] = invite
  }
}

export function REMOVE_MLS_INVITE(state, roomId) {
  const ws = getOrInitWalletState(state)
  if (ws?.mls?.pendingInvitations) {
    delete ws.mls.pendingInvitations[roomId]
  }
}

export function ADD_DECLINED_WELCOME(state, eventId) {
  const ws = getOrInitWalletState(state)
  if (ws && eventId) ws.mls.declinedWelcomeIds[eventId] = Math.floor(Date.now() / 1000)
}

export function MERGE_DECLINED_WELCOMES(state, eventIds) {
  const ws = getOrInitWalletState(state)
  if (!ws || !Array.isArray(eventIds)) return
  const now = Math.floor(Date.now() / 1000)
  for (const id of eventIds) {
    if (id && !ws.mls.declinedWelcomeIds[id]) ws.mls.declinedWelcomeIds[id] = now
  }
}

export function MARK_WELCOME_HANDLED(state, { rumorId, wrapId } = {}) {
  const ws = getOrInitWalletState(state)
  if (!ws) return
  if (!ws.mls.handledWelcomeIds) ws.mls.handledWelcomeIds = {}
  const now = Math.floor(Date.now() / 1000)
  if (rumorId) ws.mls.handledWelcomeIds[rumorId] = now
  if (wrapId) ws.mls.handledWelcomeIds[wrapId] = now
}

export function RECORD_EVENT_PROCESS_FAILURE(state, { eventId, error }) {
  const ws = getOrInitWalletState(state)
  if (!ws || !eventId) return
  const prev = ws.mls.failedEventAttempts[eventId]
  ws.mls.failedEventAttempts[eventId] = {
    count: (prev?.count || 0) + 1,
    lastError: String(error || '').slice(0, 200),
    lastAttemptAt: Math.floor(Date.now() / 1000),
  }
}

export function CLEAR_EVENT_PROCESS_FAILURES(state, eventId) {
  const ws = getOrInitWalletState(state)
  if (ws && eventId) delete ws.mls.failedEventAttempts[eventId]
}

// Mark a kind-445 event as fully processed for its group. Any event that
// consumed the sender's ratchet — application messages, edits, role-control
// messages, and handshake commits/proposals — lands here, so re-delivered
// copies (relay history replay, resubscribe, restart) are skipped instead of
// being re-processed and rejected as "Desired gen in the past".
export function MARK_EVENT_PROCESSED(state, { mlsGroupIdHex, eventId } = {}) {
  const ws = getOrInitWalletState(state)
  if (!ws || !mlsGroupIdHex || !eventId) return
  if (!ws.mls.processedEventIds) ws.mls.processedEventIds = {}
  if (!ws.mls.processedEventIds[mlsGroupIdHex]) ws.mls.processedEventIds[mlsGroupIdHex] = {}
  const record = ws.mls.processedEventIds[mlsGroupIdHex]
  record[eventId] = Math.floor(Date.now() / 1000)
  // Bound the tombstone set so it can't grow without limit in localStorage.
  const ids = Object.keys(record)
  if (ids.length > MAX_PROCESSED_EVENT_IDS) {
    ids
      .sort((a, b) => record[a] - record[b])
      .slice(0, ids.length - MAX_PROCESSED_EVENT_IDS)
      .forEach((id) => delete record[id])
  }
}
