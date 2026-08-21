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
    state.byWallet[hash].mls = { ready: false, keyPackage: null, groupStates: {}, roomMlsMap: {}, pendingInvitations: {}, kpHistory: [], rekeyEpochs: {}, splitGroups: {} }
  }
  if (!Array.isArray(state.byWallet[hash].mls.kpHistory)) {
    state.byWallet[hash].mls.kpHistory = []
  }
  if (typeof state.byWallet[hash].mls.rekeyEpochs !== 'object' || state.byWallet[hash].mls.rekeyEpochs === null) {
    state.byWallet[hash].mls.rekeyEpochs = {}
  }
  if (typeof state.byWallet[hash].mls.splitGroups !== 'object' || state.byWallet[hash].mls.splitGroups === null) {
    state.byWallet[hash].mls.splitGroups = {}
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

export function RESET_MLS_WALLET_DATA(state) {
  const ws = getOrInitWalletState(state)
  if (ws) {
    ws.mls.ready = false
    ws.mls.keyPackage = null
    ws.mls.groupStates = {}
    ws.mls.roomMlsMap = {}
    ws.mls.pendingInvitations = {}
    ws.mls.kpHistory = []
    ws.mls.rekeyEpochs = {}
    ws.mls.splitGroups = {}
  }
}

export function SET_MLS_REKEY_EPOCH(state, { mlsGroupIdHex, epoch }) {
  const ws = getOrInitWalletState(state)
  if (ws) ws.mls.rekeyEpochs[mlsGroupIdHex] = epoch
}

export function CLEAR_MLS_REKEY_EPOCH(state, mlsGroupIdHex) {
  const ws = getOrInitWalletState(state)
  if (ws) delete ws.mls.rekeyEpochs[mlsGroupIdHex]
}

export function MARK_MLS_GROUP_SPLIT(state, mlsGroupIdHex) {
  const ws = getOrInitWalletState(state)
  if (ws) ws.mls.splitGroups[mlsGroupIdHex] = true
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