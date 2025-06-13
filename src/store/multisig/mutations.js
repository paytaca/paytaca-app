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

export function deleteWallet (state, { multisigWallet }) {
  //const index = state.wallets.findIndex((wallet) => {
    //return getMultisigCashAddress({
      //...wallet, cashAddressNetworkPrefix: address.split(':')[0]
    //}) === address
  //})
  //if (index === -1) return
  //state.wallets?.splice(index, 1)
  const index = state.wallets.findIndex((wallet) => {
    return wallet.id == multisigWallet.id
  })
  if (index === -1) return
  state.wallets.splice(index, 1)
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

export function syncTransactionSignatures(state, { multisigTransaction, signatures }) {
  const foundMultisigTransaction = state.transactions.find((m) => m.id === multisigTransaction.id)
  console.log('syncing', foundMultisigTransaction, signatures)
  if (!foundMultisigTransaction) return
  signatures.forEach((signature) => {
    const i = foundMultisigTransaction.signatures.findIndex((s) => {
	    return Number(s.inputIndex) === Number(signature.inputIndex) && s.sigKey === signature.sigKey 
    })
    if (i === -1) {
      return foundMultisigTransaction.signatures.push(signature)
    }
    foundMultisigTransaction.signatures[i] = { ...foundMultisigTransaction.signatures[i], ...signature}
  })
}

export function finalizeTransaction(state, { multisigTransaction, finalCompilationResult }) {
  const foundMultisigTransaction = state.transactions?.find(m => m.id == multisigTransaction.id)
  if (!foundMultisigTransaction) return
  foundMultisigTransaction.signedTransaction = finalCompilationResult.signedTransaction
  foundMultisigTransaction.signedTransactionHash = finalCompilationResult.signedTransactionHash
}

export function updateTransactionStatus(state, { multisigStransaction, status }) {
  const foundMultisigTransaction = state.transactions?.find(m => m.id == multisigTransaction.id)
  if (!foundMultisigTransaction) return
  foundMultisigTransaction.status = status
}

export function deleteTransaction (state, { index }) {
  state.transactions.splice(index, 1)
}

export function deleteAllTransactions (state) {
  state.transactions = []
}

