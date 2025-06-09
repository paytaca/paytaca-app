import { getMultisigCashAddress, getLockingBytecode, findMultisigWalletByLockingData } from 'src/lib/multisig'
import { hashTransaction, binToHex } from 'bitauth-libauth-v3'

export function saveWallet (state, multisigWallet) {
  const lockingBytecode = getLockingBytecode({ template: multisigWallet.template, lockingData: multisigWallet.lockingData })
  const lockingBytecodeHex = binToHex(lockingBytecode.bytecode)	
  const index = state.wallets.findIndex((wallet) => {
    const existingLockingBytecode = getLockingBytecode({ template: wallet.template, lockingData: wallet.lockingData })
    const existingLockingBytecodeHex = binToHex(existingLockingBytecode.bytecode)
    return lockingBytecodeHex === existingLockingBytecodeHex
  })
  if (index === -1) {
   return state.wallets.push(multisigWallet) 
  }
  if (state.wallets[index].enabled) {
    multisigWallet.enabled = true
  }
  state.wallets.splice(index, 1, multisigWallet)
}

export function updateWallet(state, { id, multisigWallet }) {
  const index = state.wallets.findIndex((wallet) => {
    return wallet.id === id
  })
  if (index === -1) return
  state.wallets?.splice(index, 1, multisigWallet)
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

export function enableWallet(state, multisigWallet) {
  const wallet = findMultisigWalletByLockingData({
	  multisigWallets: state.wallets,
	  template: multisigWallet.template,
	  lockingData: multisigWallet.lockingData
  })
  if (!wallet) return
  wallet.enabled = true
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
  console.log('multisigTransaction')
  const index = state.transactions.findIndex((storedMultisigTransaction) => {
    return (
      hashTransaction(multisigTransaction.transaction) ===
        hashTransaction(storedMultisigTransaction.transaction)
    )
  })
  if (index !== -1) {
    return state.transactions.splice(index, 1, multisigTransaction)
  }
  state.transactions.push(multisigTransaction)
}

export function updateTransaction (state, { id, multisigTransaction }) {
  console.log('STATE', state.transactions, id)
  const index = state.transactions.find(t => t.id === id) 
  if (index === -1) return
  state.transactions.splice(index, 1, multisigTransaction)
}

export function updateTransactionStatus (state, { index, status } ) {
 if (index >= 0) {
  const transaction = state.transactions[index]
  if (transaction) {
   transaction.metadata.status = status
  }
 }
}

export function addTransactionSignatures (state, { index, signerSignatures }) {
    const { signer, signatures } = signerSignatures
    if (!state.transactions?.[index]) return
    signatures.forEach((signature) => {
      const signatureIndex = state.transactions[index].signatures?.findIndex((sig) => {
	 return sig.inputIndex == signature.inputIndex && sig.sigKey === signature.sigKey
      })
      
      const sigDoesNotYetExist = signatureIndex === -1

      if(sigDoesNotYetExist) {
        return state.transactions[index].signatures.push(signatures)
      }
      state.transactions[index].signatures.splice(signatureIndex, 1, signature)
    })
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
