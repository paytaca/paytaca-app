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

export function commitWalletDraft (state, { m, n, address, lockingBytecode, signers, template }) {
  state.wallets.push({ m, n, address, lockingBytecode, signers, template })
}

export function deleteWallet (state, { address }) {
  const index = state.wallets.findIndex((wallet) => wallet.address === address)
  if (index === -1) return
  state.wallets?.splice(index, 1)
}

export function deleteAllWallets (state) {
  state.wallets = []
}

export function newTransaction (state, { transaction, sourceOutputs, address, sessionRequest }) {
  state.transactions.push({ transaction, sourceOutputs, address, sessionRequest: sessionRequest })
}

export function walletConnectSignTransactionRequest (state, { address, sessionRequest }) {
  const transaction = sessionRequest.params.request.params.transaction
  const sourceOutputs = sessionRequest.params.request.params.sourceOutputs
  newTransaction(state, { transaction, sourceOutputs, address, sessionRequest })
}
