import { getMultisigCashAddress, getLockingBytecode, findMultisigWalletByLockingData, Pst, getWalletHash } from 'src/lib/multisig'
import { hashTransaction, binToHex } from 'bitauth-libauth-v3'
import { getWallet } from '../global/getters'

export function createWallet (state, multisigWallet) {
  state.wallets.push(multisigWallet)
}

export function updateWallet (state, { oldMultisigWallet, newMultisigWallet }) {
  const index = state.wallets.findIndex((wallet) => {
    return wallet.id === oldMultisigWallet.id
  })
  if (index === -1) return
  state.wallets?.splice(index, 1, newMultisigWallet)
}

export function updateWalletId(state, { oldId, newId }) {
  const wallet = state.wallets.find(wallet => {
      return wallet.id === oldId
  })
  if (!wallet) return
  wallet.id = newId
}

export function saveWallet (state, wallet) {
  const index = state.wallets.findIndex(savedWallet => {
    return getWalletHash(savedWallet) === getWalletHash(wallet)
  })

  if (index === -1) {
    return state.wallets.push(wallet) 
  }

  if (state.wallets[index].enabled) {
    wallet.enabled = true
  }

  state.wallets.splice(index, 1, wallet)

}

export function deleteWallet (state, { multisigWallet }) {
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
  const index = state.transactions.find(t => t.id === id) 
  if (index === -1) return
  state.transactions.splice(index, 1, multisigTransaction)
}

export function updateTransactionBroadcastStatus(state, { id, broadcastStatus }) {
 const transaction = state.transactions.find(t => t.id === id)
 if (transaction) {
   transaction.broadcastStatus = broadcastStatus
 } 
}

export function updateTransactionTxid(state, { id, txid }) {
 const multisigTransaction = state.transactions.find(t => t.id === id)
 if (multisigTransaction) {
   multisigTransaction.txid = txid
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

export function syncTransactionSignatures(state, { multisigTransaction, signatures }) {
  const foundMultisigTransaction = state.transactions.find((m) => m.id === multisigTransaction.id)
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

export function updateBroadcastStatus(state, { multisigTransaction, broadcastStatus }) {
  const foundMultisigTransaction = state.transactions?.find(m => m.id == multisigTransaction.id)
  if (!foundMultisigTransaction) return
  foundMultisigTransaction.broadcastStatus = broadcastStatus
}

export function deleteTransaction (state, { index }) {
  state.transactions.splice(index, 1)
}

export function deleteTransactionById(state, { id }) {
  const index = state.transactions.findIndex(t => t.id === id)
  if (index !== -1 ) {
    state.transactions.splice(index, 1)
  }
}

export function deleteAllTransactions (state) {
  state.transactions = []
}

export function clearWalletUtxos (state, { walletAddress }) {
  if (state.walletsUtxos[walletAddress]) {
    state.walletsUtxos[walletAddress] = { utxos: [], lastUpdate: Math.floor(Date.now() / 1000 )}
  }
}

export function updateWalletUtxos (state, { walletAddress, utxos }) {
  console.log('UPDATING UTXOS', utxos)
  if (!state.walletsUtxos[walletAddress]) {
    state.walletsUtxos[walletAddress] = {}
  }
  state.walletsUtxos[walletAddress] = {
    utxos,
    lastUpdate: Math.floor(Date.now() / 1000)
  }
}


export function savePst(state, pst) {
  const storedPst = state.psts.find(p => {
    const instance = Pst.fromObject(p)
    return instance.unsignedTransactionHash === pst.unsignedTransactionHash
  })
  if (storedPst) return 
  state.psts.push(pst)
}


export function deletePst(state, pst) {
  const index = state.psts.findIndex(p => {
    const instance = Pst.fromObject(p)
    return instance.unsignedTransactionHash === pst.unsignedTransactionHash
  })
  if (index === -1) return
  
  state.psts.splice(index, 1)
}

export function addPstPartialSignature(state, { pst, inputIndex, partialSignature }) {
  const index = state.psts.findIndex(p => {
    const instance = Pst.fromObject(p)
    return instance.unsignedTransactionHash === pst.unsignedTransactionHash
  })

  if (index === -1) return

  if (!state.psts[index].inputs[inputIndex].partialSignatures) {
    state.psts[index].inputs[inputIndex].partialSignatures = []
  }

  state.psts[index].inputs[inputIndex].partialSignatures.push(partialSignature)
}


export function updateWalletLastIssuedDepositAddressIndex(state, { wallet, lastIssuedDepositAddressIndex }) {
  const storedWallet = state.wallets.find(w => getWalletHash(w) === getWalletHash(wallet))
  if (!storedWallet) return
  storedWallet.lastIssuedDepositAddressIndex = lastIssuedDepositAddressIndex
}

export function updateWalletLastIssuedChangeAddressIndex(state, { wallet, lastIssuedChangeAddressIndex }) {
  const storedWallet = state.wallets.find(w => getWalletHash(w) === getWalletHash(wallet))
  if (!storedWallet) return
  storedWallet.lastIssuedChangeAddressIndex = lastIssuedChangeAddressIndex
}

export function updateWalletLastUsedDepositAddressIndex(state, { wallet, lastUsedDepositAddressIndex }) {
  const storedWallet = state.wallets.find(w => getWalletHash(w) === getWalletHash(wallet))
  if (!storedWallet) return
  storedWallet.lastUsedDepositAddressIndex = lastUsedDepositAddressIndex
}

export function updateWalletLastUsedChangeAddressIndex(state, { wallet, lastUsedChangeAddressIndex }) {
  const storedWallet = state.wallets.find(w => getWalletHash(w) === getWalletHash(wallet))
  if (!storedWallet) return
  storedWallet.lastUsedChangeAddressIndex = lastUsedChangeAddressIndex
}