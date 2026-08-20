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
    state.byWallet[hash].mls = { ready: false, keyPackage: null, groupStates: {}, roomMlsMap: {} }
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
  console.log('[MLS] SET_MLS_ROOM_MAP roomId:', roomId, 'mlsGroupIdHex:', mlsGroupIdHex, 'ws exists:', !!ws, 'walletHash:', getCurrentWalletHash())
  if (ws) ws.mls.roomMlsMap[roomId] = mlsGroupIdHex
  console.log('[MLS] after SET_MLS_ROOM_MAP roomMlsMap:', JSON.stringify(ws?.mls?.roomMlsMap))
}

export function REMOVE_MLS_ROOM_MAP(state, roomId) {
  const ws = getOrInitWalletState(state)
  if (ws) delete ws.mls.roomMlsMap[roomId]
}

export function RESET_MLS_WALLET_DATA(state) {
  const ws = getOrInitWalletState(state)
  if (ws) {
    ws.mls.ready = false
    ws.mls.keyPackage = null
    ws.mls.groupStates = {}
    ws.mls.roomMlsMap = {}
  }
}