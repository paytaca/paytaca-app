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
