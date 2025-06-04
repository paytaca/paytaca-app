import axios from 'axios'
import { stringify, binToHex } from 'bitauth-libauth-v3'
import { getMultisigCashAddress, getLockingBytecode, importPst } from 'src/lib/multisig'
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

export async function saveWallet ({ commit, getters, rootGetters }, multisigWallet) {
  return commit('saveWallet', multisigWallet)

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

export async function addTransactionSignatures ({ commit, state }, { index, signerSignatures }) {
  const { signer, signatures } = signerSignatures
  const multisigTransaction = state.transactions[index]
  if (multisigTransaction.id) {
    const watchtower = rootGetters['global/getWatchtowerBaseUrl']
    const response = await axios.post(`${watchtower}/api/multisig/transaction-proposals/${multisigTransaction.transactionHash}/signatures/${signer}`, signatures)
    if (response.data?.id) {	    
      commit('addTransactionSignatures', { index, signerSignatures })
    }
    return
  } 
  commit('addTransactionSignatures', { index, signerSignatures })
}

export function updateTransaction ({ commit }, { index, multisigTransaction }) {
  commit('updateTransaction', { index, multisigTransaction })
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

export function savePst ({ commit }, pst) {
  console.log('saving pst', pst)
  commit('savePst', pst)
}

export function deletePstById ({ commit }, { id }) {
  commit('deletePstById', { id })
}

export function deleteAllPsts ({ commit }) {
  commit('deleteAllPsts')
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
  console.log('uploading pst', multisigWallet, multisigTransaction)
  let wallet_identifier = multisigWallet.id
  if (!wallet_identifier) {
    wallet_identifier = binToHex(getLockingBytecode({ template: multisigWallet.template, lockingData: multisigWallet.lockingData}).bytecode)
  }
  if (multisigWallet.id) { 	
   const watchtower = rootGetters['global/getWatchtowerBaseUrl']
   const response = await axios.post(
	   `${watchtower}/api/multisig/wallets/${multisigWallet.id}/transaction-proposals/`, 
	   JSON.parse(stringify(multisigTransaction)),
	   {headers: { 'Content-Type': 'application/json'}}
   )
   console.log('uploadPst response', response.data)
   if (response.data) {
      console.log('RESPONSE DATA')
      const importedTransaction = importPst({ pst: response.data })
      console.log('IMPORTED TRANSACTION', importedTransaction)
      commit('saveTransaction', importedTransaction) 
   }
  }
}
