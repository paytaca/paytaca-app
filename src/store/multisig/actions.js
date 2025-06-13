import axios from 'axios'
import { stringify, binToHex } from 'bitauth-libauth-v3'
import * as ms from 'src/lib/multisig'

import { getMnemonic, getHdKeys, signMessageWithHdPrivateKey } from 'src/wallet'

export async function uploadWallet({ commit, getters, rootGetters }, { address, multisigWallet }) {
  const watchtower = rootGetters['global/getWatchtowerBaseUrl']
  let identifier = multisigWallet.id
  let response
  if (!identifier) {
   const { lockingData, template } = multisigWallet
   identifier  = binToHex(ms.getLockingBytecode({ lockingData, template }).bytecode)
   response = await axios.get(`${watchtower}/api/multisig/wallets/${identifier}/`)
  }
  if (!response) {
   response = await axios.post(`${watchtower}/api/multisig/wallets/`, multisigWallet)
  }
  if (response.data?.id) {
   commit('updateWallet', { id: multisigWallet.id, multisigWallet: response.data })
  }
  console.log('axios response', response.data)
  return response?.data
}

export async function saveWallet ({ commit, getters, rootGetters, dispatch }, multisigWallet) {
  
  commit('saveWallet', multisigWallet)
  dispatch('uploadWallet', { multisigWallet })

  // const signerLocalWallets = rootGetters['global/getVault']

  // if (!signerLocalWallet) { throw new Error('Signer\'s xpub not found on this device!') }

  // let nominatedUploader = null

  // for (const signerEntityKey in multisigWallet.lockingData.hdKeys.hdPublicKeys) {
  //   const wallet = signerLocalWallets.find((localWallet) => {
  //     return localWallet.wallet.bch.xPubKey === multisigWallet.lockingData.hdKeys.hdPublicKeys[signerEntityKey]
  //   })
  //   if (wallet) {
  //     const hdKeys = await getHdKeys({ vaultIndex: wallet.vaultIndex })
  //     nominatedUploaderSignerIndex = signerIndex
  //     nominatedUploader = {
  //       signerEntityKey,
  //       hdKeys
  //     }
  //     break
  //   }
  // }

  // if (!nominatedUploader || nominatedUploader?.hdKeys.hdPublicKey !== multisigWallet.signers[uploaderSignerId].xpub) { throw new Error('Sync requires atleast 1 signer can sign on this device.') }

  // const watchtower = rootGetters['global/getWatchtowerBaseUrl']
  // const getNonceResp = await fetch(`${watchtower}/api/nonce?length=15`)
  // if (!getNonceResp.ok) throw new Error('Problem contacting server. Please try again later.')
  // const resJson = await getNonceResp.json()
  // const message = `${resJson.data.nonce}|${hdKeys.hdPublicKey}`
  // const signature = signMessageWithHdPrivateKey({ message: '', hdPrivateKey: nominatedUploader.hdKeys.hdPrivateKey, addressIndex: 0 })
  // const postMultisigWalletResp = await fetch(`${watchtower}/api/multisig/wallets`, {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     ...multisigWallet

  //   })
  // })
}

export async function fetchWallets({ commit, rootGetters }, { xpub }) {
  const watchtower = rootGetters['global/getWatchtowerBaseUrl']
  const response = await axios.get(`${watchtower}/api/multisig/wallets/?xpub=${xpub}`)
  console.log('axios response fetch wallet', response.data)
  response?.data?.forEach((multisigWallet) => {
    commit('saveWallet', multisigWallet)
  })
  return response.data
}

export async function deleteWallet ({ commit, rootGetters }, { multisigWallet }) {
  return commit('deleteWallet', { multisigWallet })
  const watchtower = rootGetters['global/getWatchtowerBaseUrl']
  const response = await axios.delete(`${watchtower}/api/multisig/wallets/${multisigWallet.id}/`)
  console.log('delete wallet', response.data)
}

export function deleteAllWallets ({ commit }) {
  commit('deleteAllWallets')
  // TODO: mutate watchtower
}
/**
 * request is a wallet connect session request
 */
export function walletConnectSignTransactionRequest ({ commit }, { address, sessionRequest }) {
  commit('walletConnectSignTransactionRequest', { address, sessionRequest })
}

export function saveTransaction ({ commit, dispatch }, multisigTransaction) {
  commit('saveTransaction', multisigTransaction)
}

export async function addTransactionSignatures ({ commit, state, rootGetters }, { multisigTransaction, signerSignatures }) {
  const { signer, signatures } = signerSignatures
  const signaturesExportFormat = ms.signatureValuesToHex({ signatures })
  if (ms.isMultisigTransactionSynced(multisigTransaction)) {
    const watchtower = rootGetters['global/getWatchtowerBaseUrl']
    const response = await axios.post(`${watchtower}/api/multisig/transaction-proposals/${multisigTransaction.id}/signatures/${signer}/`, signaturesExportFormat)
    if (response.data) {
    	const signaturesImportFormat = ms.signatureValuesToUint8Array({ signatures: response.data})
        commit('syncTransactionSignatures', { multisigTransaction, signatures: signaturesImportFormat })
    }
  }
}

export async function syncTransactionSignatures ({ commit, state, rootGetters }, { multisigTransaction }) {
  if (multisigTransaction.signatures && multisigTransaction.signatures.length > 0) {
    const signaturesExportFormat = ms.signatureValuesToHex({ signatures: multisigTransaction.signatures })
    const watchtower = rootGetters['global/getWatchtowerBaseUrl']
    const response = await axios.post(`${watchtower}/api/multisig/transaction-proposals/${multisigTransaction.id}/signatures/`, signaturesExportFormat)
    if (response.data) {
      const signaturesImportFormat = ms.signatureValuesToUint8Array({ signatures: response.data })
      commit('syncTransactionSignatures', { multisigTransaction, signatures: signaturesImportFormat })
      console.log('signatures import format', signaturesImportFormat)
    }
  }
} 


export function updateTransaction ({ commit }, { id, multisigTransaction }) {
  commit('updateTransaction', { id, multisigTransaction })
}

export async function updateBroadcastStatus ({ commit, rootGetters }, { multisigTransaction }) {
 const watchtower = rootGetters['global/getWatchtowerBaseUrl']
 const response = await axios.get(`${watchtower}/api/multisig/transaction-proposals/${multisigTransaction.id}/status/`)
 if(response?.data?.broadcastStatus) {
   commit('updateBroadcastStatus', { multisigTransaction, broadcastStatus: response.data.broadcastStatus })
 }
}

export function deleteTransaction ({ commit }, { index }) {
  commit('deleteTransaction', { index })
  // TODO: mutate watchtower
}

export function deleteAllTransactions ({ commit }) {
  commit('deleteAllTransactions')
  // TODO: mutate watchtower
}

export async function fetchTransactions({ commit, rootGetters }, multisigWallet) {
   console.log('WALLET', multisigWallet) 
   const watchtower = rootGetters['global/getWatchtowerBaseUrl']
   const response = await axios.get(`${watchtower}/api/multisig/wallets/${multisigWallet.id}/transaction-proposals/`)
   console.log('fetch', response.data)
   response.data?.forEach((multisigTransaction) => {
     const transaction = ms.importPst({ pst: multisigTransaction })
     commit('saveTransaction', transaction)
   })
}

export async function uploadTransaction({ commit, rootGetters }, { multisigWallet, multisigTransaction }) {
  let wallet_identifier = multisigWallet.id
  if (!wallet_identifier) {
    wallet_identifier = binToHex(ms.getLockingBytecode({ template: multisigWallet.template, lockingData: multisigWallet.lockingData}).bytecode)
  }
  const multisigTransactionExportFormat = ms.exportPst({
	  multisigTransaction,
	  addressIndex: multisigWallet.lockingData.hdKeys.addressIndex,
	  format: 'json'
  })
  if (ms.isMultisigWalletSynced(multisigWallet)) { 	
   const watchtower = rootGetters['global/getWatchtowerBaseUrl']
   const response = await axios.post(
	   `${watchtower}/api/multisig/wallets/${multisigWallet.id}/transaction-proposals/`, 
	   multisigTransactionExportFormat,
	   {headers: { 'Content-Type': 'application/json'}}
   )
   if (response.data) {
      const importedTransaction = ms.importPst({ pst: response.data })
      commit('updateTransaction', { id: multisigTransaction.id, multisigTransaction: importedTransaction }) 
   }
  }
}

export async function finalizeTransaction({ commit, rootGetters, dispatch }, { multisigTransaction, multisigWallet }) {
    const finalCompilationResult = ms.finalizeTransaction({ multisigTransaction, multisigWallet })
    if (finalCompilationResult.success && finalCompilationResult.vmVerificationSuccess) {
      commit('finalizeTransaction', { multisigTransaction, finalCompilationResult })    
      const watchtower = rootGetters['global/getWatchtowerBaseUrl']
      const response = await axios.post(
	   `${watchtower}/api/multisig/transaction-proposals/${multisigTransaction.id}/finalize/`,
	   {headers: { 'Content-Type': 'application/json'}}
      )
    }
    return finalCompilationResult	
}

export async function broadcastTransaction({ commit, rootGetters }, multisigTransaction) {
     const watchtower = rootGetters['global/getWatchtowerBaseUrl']
     const response = await axios.post(
	 `${watchtower}/api/multisig/transaction-proposals/${multisigTransaction.id}/broadcast/`,
	 { headers: { 'Content-Type': 'application/json'} }
     )
     if (response?.data?.success || response?.data?.error?.includes('tx-already-known')) {
       commit('updateTransactionStatus', { multisigTransaction, status: 'broadcasted' })
     }
     console.log('BROADCAST RESPONSE DATA', response.data)
}
