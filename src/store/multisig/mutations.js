import { MultisigWallet, getMultisigCashAddress } from 'src/lib/multisig'
import { hashTransaction } from 'bitauth-libauth-v3'

export function saveWallet (state, wallet) {
  state.wallets.push(wallet)
}

export function updateWallet(state, { address, multisigWallet }) {
  const index = state.wallets.findIndex((wallet) => {
    return getMultisigCashAddress({
      ...wallet, cashAddressNetworkPrefix: address.split(':')[0]
    }) === address
  })
  if (index === -1) return
  const updated = { ...state.wallets[index], ...multisigWallet }
  state.wallets?.splice(index, 1, updated)
}

export function deleteWallet (state, { address }) {
  const index = state.wallets.findIndex((wallet) => {
    return getMultisigCashAddress({
      ...wallet, cashAddressNetworkPrefix: address.split(':')[0]
    }) === address
  })
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
  const index = state.transactions.findIndex((storedMultisigTransaction) => {
    return (
      hashTransaction(multisigTransaction.transaction) ===
        hashTransaction(storedMultisigTransaction.transaction)
    )
  })
  if (index !== -1) return
  state.transactions.push(multisigTransaction)
}

export function updateTransaction (state, { index, multisigTransaction }) {
  if (index >= 0) {
    state.transactions.splice(index, 1, multisigTransaction)
  }
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
