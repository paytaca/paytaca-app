export function saveWallet (state, wallet) {
  state.wallets.push(wallet)
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

export function savePst (state, pst) {
  const exists = state.psts.find(item => item.id === pst.id)
  if (exists) return
  state.psts.push(pst)
}

export function deleteAllPsts (state) {
  state.psts = []
}

export function deletePstById (state, { id }) {
  const pstIndex = state.psts.findIndex(item => item.id === id)
  if (pstIndex !== -1) {
    state.psts.splice(pstIndex, 1)
  }
}
