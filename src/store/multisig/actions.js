export function saveWalletDraft ({ commit }, { m, n, signers, template }) {
  commit('saveWalletDraft', { m, n, signers, template })
  // TODO: mutate watchtower
}

export function deleteWalletDraft ({ commit }) {
  commit('deleteWalletDraft')
  // TODO: mutate watchtower
}

export function commitWalletDraft ({ commit }, { m, n, address, lockingBytecode, signers, template }) {
  commit('commitWalletDraft', { m, n, address, lockingBytecode, signers, template })
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
export function signatureRequest ({ commit }, { address, signatureRequest }) {
  commit('signatureRequest', { address, signatureRequest })
}
