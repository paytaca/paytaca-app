import { Store } from 'src/store'
import { getInitialWalletState } from './state'

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
    state.byWallet[hash].mls = { ready: false, keyPackage: null, groupStates: {}, roomMlsMap: {}, pendingInvitations: {}, declinedWelcomeIds: {}, failedEventAttempts: {}, kpHistory: [] }
  }
  if (!Array.isArray(state.byWallet[hash].mls.kpHistory)) {
    state.byWallet[hash].mls.kpHistory = []
  }
  if (typeof state.byWallet[hash].mls.declinedWelcomeIds !== 'object' || state.byWallet[hash].mls.declinedWelcomeIds === null) {
    state.byWallet[hash].mls.declinedWelcomeIds = {}
  }
  if (typeof state.byWallet[hash].mls.failedEventAttempts !== 'object' || state.byWallet[hash].mls.failedEventAttempts === null) {
    state.byWallet[hash].mls.failedEventAttempts = {}
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
  if (ws) delete ws.mls.groupStates[mlsGroupIdHex]
}

export function SET_MLS_ROOM_MAP(state, { roomId, mlsGroupIdHex }) {
  const ws = getOrInitWalletState(state)
  if (ws) ws.mls.roomMlsMap[roomId] = mlsGroupIdHex
}

export function REMOVE_MLS_ROOM_MAP(state, roomId) {
  const ws = getOrInitWalletState(state)
  if (ws) delete ws.mls.roomMlsMap[roomId]
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