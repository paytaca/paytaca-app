import axios from 'axios'
import { stringify, binToHex } from 'bitauth-libauth-v3'
import {
  getMultisigCashAddress,
  getLockingBytecode,
  importPst,
  signatureValuesToHex,
  signatureValuesToUint8Array,
  isMultisigTransactionSynced,
  isMultisigWalletSynced,
  exportPst
} from 'src/lib/multisig'
import { getMnemonic, getHdKeys, signMessageWithHdPrivateKey } from 'src/wallet'

export async function uploadWallet({ commit, getters, rootGetters }, { address, multisigWallet }) {
  const watchtower = rootGetters['global/getWatchtowerBaseUrl']
  let identifier = multisigWallet.id
  let response
  if (!identifier) {
   const { lockingData, template } = multisigWallet
   identifier  = binToHex(getLockingBytecode({ lockingData, template }).bytecode)
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


export function deleteWallet ({ commit }, { address }) {
  // TODO: mutate watchtower
  commit('deleteWallet', { address })
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

export function saveTransaction ({ commit }, multisigTransaction) {
  commit('saveTransaction', multisigTransaction)
}

export async function addTransactionSignatures ({ commit, state, rootGetters }, { multisigTransaction, signerSignatures }) {
  const { signer, signatures } = signerSignatures
  const signaturesExportFormat = signatureValuesToHex({ signatures })
  if (isMultisigTransactionSynced(multisigTransaction)) {
    const watchtower = rootGetters['global/getWatchtowerBaseUrl']
    const response = await axios.post(`${watchtower}/api/multisig/transaction-proposals/${multisigTransaction.id}/signatures/${signer}`, signaturesExportFormat)
    if (response.data) {
    	const signaturesImportFormat = signatureValuesToUint8Array({ signatures: response.data})
        commit('syncTransactionSignatures', { multisigTransaction, signatures: signaturesImportFormat })
    }
  }
}

//export async function syncTransactionSignatures ({ commit, state, rootGetters }, { multisigTransaction, signatures = [] }) {
//  if (signatures && signatures.length > 0) {
//    const signaturesImportFormat = signatureValuesToUint8Array({ signatures })
//    commit('syncTransactionSignatures', { multisigTransaction, signatures })
//    return
//  }
//} 

export function updateTransaction ({ commit }, { id, multisigTransaction }) {
  commit('updateTransaction', { id, multisigTransaction })
}

export function updateTransactionStatus ({ commit }, { index, status  }) {
 commit('updateTransactionStatus', { index, status })
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
     const transaction = importPst({ pst: multisigTransaction })
     commit('saveTransaction', transaction)
   })
}

export async function uploadTransaction({ commit, rootGetters }, { multisigWallet, multisigTransaction }) {
  let wallet_identifier = multisigWallet.id
  if (!wallet_identifier) {
    wallet_identifier = binToHex(getLockingBytecode({ template: multisigWallet.template, lockingData: multisigWallet.lockingData}).bytecode)
  }
  const multisigTransactionExportFormat = exportPst({
	  multisigTransaction,
	  addressIndex: multisigWallet.lockingData.hdKeys.addressIndex,
	  format: 'json'
  })
  if (isMultisigWalletSynced(multisigWallet)) { 	
   const watchtower = rootGetters['global/getWatchtowerBaseUrl']
   const response = await axios.post(
	   `${watchtower}/api/multisig/wallets/${multisigWallet.id}/transaction-proposals/`, 
	   multisigTransactionExportFormat,
	   {headers: { 'Content-Type': 'application/json'}}
   )
   if (response.data) {
      const importedTransaction = importPst({ pst: response.data })
      commit('updateTransaction', { id: multisigTransaction.id, multisigTransaction: importedTransaction }) 
   }
  }
}

//export async function broadcastTransaction({ commit, rootGetters }, multisigTransaction ) {
//   if (isMultisigWalletSynced(multisigTransaction)) { 	
//    const watchtower = rootGetters['global/getWatchtowerBaseUrl']
//    const response = await axios.post(
//	   `${watchtower}/api/multisig/wallets/${multisigWallet.id}/transaction-proposals/${multisigTransaction.id}/broadcast`, 
//	   JSON.parse(stringify(multisigTransaction)),
//	   {headers: { 'Content-Type': 'application/json'}}
//    )
//   }
//}
