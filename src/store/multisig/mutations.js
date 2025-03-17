export function saveWalletDraft (state, { m, n, signers, template }) {
  if (!state.walletDraft) {
    state.walletDraft = {}
  }
  state.walletDraft.m = m
  state.walletDraft.n = n
  state.walletDraft.signers = signers
  state.walletDraft.template = template
}

export function deleteWalletDraft (state) {
  state.walletDraft = null
}

export function commitWalletDraft (state, { m, n, cashaddress, lockingBytecode, signers, template }) {
  state.wallets.push({ m, n, cashaddress, lockingBytecode, signers, template })
}

export function deleteWallet (state, { cashaddress }) {
  const index = state.wallets.findIndex((wallet) => wallet.cashaddress === cashaddress)
  if (index === -1) return
  state.wallets?.splice(index, 1)
}

export function deleteAllWallets (state) {
  state.wallets = []
}
