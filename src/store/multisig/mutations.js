import { hashTransaction } from 'bitauth-libauth-v3'

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

export function saveTransaction (state, multisigTransaction) {
  const exists = state.transactions.find((storedMultisigTransaction) => {
    return (
      hashTransaction(multisigTransaction.transaction) ===
        hashTransaction(storedMultisigTransaction.transaction)
    )
  })
  if (exists) return
  state.transactions.push(multisigTransaction)
}

export function deleteTransaction (state, { index }) {
  state.transactions.splice(index, 1)
}

export function deleteAllTransactions (state) {
  state.transactions = []
}

export function savePst (state, pst) {
  const index = state.psts.findIndex(item => item.id === pst.id)
  if (index === -1) {
    return state.psts.push(pst)
  }
  state.psts[index] = pst
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
