export function saveWalletDraft ({ commit }, { m, n, signers, template }) {
  commit('saveWalletDraft', { m, n, signers, template })
  // TODO: mutate watchtower
}

export function deleteWalletDraft ({ commit }) {
  commit('deleteWalletDraft')
  // TODO: mutate watchtower
}

export function commitWalletDraft ({ commit }, { m, n, cashaddress, lockingBytecode, signers, template }) {
  commit('commitWalletDraft', { m, n, cashaddress, lockingBytecode, signers, template })
  // TODO: mutate watchtower
}

export function deleteWallet ({ commit }, { cashaddress }) {
  commit('deleteWallet', { cashaddress })
  // TODO: mutate watchtower
}

export function deleteAllWallets ({ commit }) {
  commit('deleteAllWallets')
  // TODO: mutate watchtower
}
