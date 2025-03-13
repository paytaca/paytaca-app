export function saveWalletDraft ({ commit }, { m, n, cosigners, template }) {
  commit('saveWalletDraft', { m, n, cosigners, template })
}

export function deleteWalletDraft ({ commit }) {
  commit('deleteWalletDraft')
}

export function commitWalletDraft ({ commit }, { m, n, address, lockingBytecode, cosigners, template }) {
  commit('commitWalletDraft', { m, n, address, lockingBytecode, cosigners, template })
  // TODO: save template in watchtower
}
