export function saveWallet ({ commit }, wallet) {
  commit('saveWallet', wallet)
  // TODO: mutate watchtower
}

export function deleteWallet ({ commit }, { address }) {
  commit('deleteWallet', { address })
  // TODO: mutate watchtower
}

export function deleteAllWallets ({ commit }) {
  commit('deleteAllWallets')
  // TODO: mutate watchtower
}
/**
 * request is a wallet connect session request
 */
export function walletConnectSignTransactionRequest ({ commit }, { address, sessionRequest }) {
  commit('walletConnectSignTransactionRequest', { address, sessionRequest })
}

export function savePst ({ commit }, pst) {
  console.log('saving pst', pst)
  commit('savePst', pst)
}

export function deletePstById ({ commit }, { id }) {
  commit('deletePstById', { id })
}

export function deleteAllPsts ({ commit }) {
  commit('deleteAllPsts')
}
