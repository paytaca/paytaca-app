export function saveWalletDraft ({ commit }, { m, n, signers, template }) {
  commit('saveWalletDraft', { m, n, signers, template })
}

export function deleteWalletDraft ({ commit }) {
  commit('deleteWalletDraft')
}

export function commitWalletDraft ({ commit }, { m, n, cashaddress, lockingBytecode, signers, template }) {
  commit('commitWalletDraft', { m, n, cashaddress, lockingBytecode, signers, template })
  // TODO: save template in watchtower
}
