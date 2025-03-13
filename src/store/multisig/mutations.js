export function saveWalletDraft (state, { m, n, cosigners, template }) {
  if (!state.walletDraft) {
    state.walletDraft = {}
  }
  state.walletDraft.m = m
  state.walletDraft.n = n
  state.walletDraft.cosigners = cosigners
  state.walletDraft.template = template
}

export function deleteWalletDraft (state) {
  state.walletDraft = null
}

export function commitWalletDraft (state, { m, n, address, lockingBytecode, cosigners, template }) {
  state.wallets.push({ m, n, address, lockingBytecode, cosigners, template })
}
