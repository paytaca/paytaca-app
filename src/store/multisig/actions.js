import axios from 'axios'
import {
  CashAddressNetworkPrefix,
  decodeCashAddress,
} from 'bitauth-libauth-v3'
import * as ms from 'src/lib/multisig'
import { generateAuthCredentialsForFirstSignerWithPrivateKey, generateAuthCredentialsForXPub } from 'src/utils/multisig-utils'
import { watchtowerUtxoToCommonUtxo } from 'src/utils/utxo-utils'
import Watchtower from 'src/lib/watchtower'

export async function subscribeWalletAddress ({ commit, getters, rootGetters }, multisigWallet) {
  const options = { ...multisigWallet }
  if (rootGetters['global/isChipnet']) {
    options.cashAddressNetworkPrefix = CashAddressNetworkPrefix.testnet
  }
  const address = ms.getMultisigCashAddress(options)
  const watchtower = new Watchtower(rootGetters['global/isChipnet'])
  return await  watchtower.subscribeAddress(address)
}

export async function uploadWallet ({ commit, getters, rootGetters }, multisigWallet ) {
  
  const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
    multisigWallet,
    walletVault: rootGetters['global/getVault'] 
  })

  const response = await axios.post(`${rootGetters['global/getWatchtowerBaseUrl']}/api/multisig/wallets/`, multisigWallet, { headers: { ...authCredentials } })
  if (response?.data?.id) {
    commit('updateWallet', { oldMultisigWallet: multisigWallet, newMultisigWallet: response.data })
  }
  return response?.data
}

export async function syncWallet ({ commit, rootGetters },  multisigWallet ) {
  const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
    multisigWallet,
    walletVault: rootGetters['global/getVault'] 
  })
    axios.get(`${rootGetters['global/getWatchtowerBaseUrl']}/api/multisig/wallets/${multisigWallet.id}/`, { headers: { ...authCredentials } })
	  .then(response => {
		if (response.data?.id && !ms.isMultisigWalletSynced(multisigWallet)) {
		      commit('updateWalletId', { oldId: multisigWallet.id, newId: response.data.id })
		}
	  })
	  .catch(error => {
	        if (error.response?.status === 404 && ms.isMultisigWalletSynced(multisigWallet)) {
		     commit('updateWalletId', { oldId: multisigWallet.id, newId: ms.generateTempId(multisigWallet) }) 
		}
	  })
}

export async function createWallet ({ commit, getters, dispatch }, multisigWallet) {
  const lockingBytecodeHex = ms.generateTempId(multisigWallet)
  const existingWallet = getters.getWalletByLockingBytecode({ lockingBytecodeHex })
  dispatch('subscribeWalletAddress', multisigWallet)
  if (existingWallet) return existingWallet
  multisigWallet.id = lockingBytecodeHex
  commit('createWallet', multisigWallet)
  dispatch('uploadWallet', multisigWallet )
}

export async function fetchWallets ({ commit, rootGetters }, { xpub }) {
  const authCredentials = await generateAuthCredentialsForXPub({ 
    xpub,
    walletVault: rootGetters['global/getVault'] 
  })
  const watchtower = rootGetters['global/getWatchtowerBaseUrl']
  const response = await axios.get(`${watchtower}/api/multisig/wallets/?xpub=${xpub}`, { headers: { ...authCredentials } })
  response?.data?.forEach((multisigWallet) => {
    commit('saveWallet', multisigWallet)
  })
  return response.data
}

export async function deleteWallet ({ commit, rootGetters }, { multisigWallet }) {
  commit('deleteWallet', { multisigWallet })
  const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
    multisigWallet,
    walletVault: rootGetters['global/getVault'] 
  })
  const watchtower = rootGetters['global/getWatchtowerBaseUrl']
  await axios.delete(
    `${watchtower}/api/multisig/wallets/${multisigWallet.id}/`,
    { headers: { ...authCredentials } }
  )
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

export async function createTransaction ({ commit, dispatch }, { multisigWallet, multisigTransaction }) {
  multisigTransaction.id = ms.generateTempProposalId(multisigTransaction)
  multisigTransaction.signatures = []
  commit('saveTransaction', multisigTransaction)
  await dispatch('uploadTransaction', { multisigWallet, multisigTransaction })
}

export async function addTransactionSignatures ({ commit, state, rootGetters }, { multisigWallet, multisigTransaction, signerSignatures }) {
  
  const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
    multisigWallet,
    walletVault: rootGetters['global/getVault'] 
  })

  const { signer, signatures } = signerSignatures
  const signaturesExportFormat = ms.signatureValuesToHex({ signatures })
  if (ms.isMultisigTransactionSynced(multisigTransaction)) {
    const watchtower = rootGetters['global/getWatchtowerBaseUrl']
    const response = await axios.post(
      `${watchtower}/api/multisig/transaction-proposals/${multisigTransaction.id}/signatures/${signer}/`,
      signaturesExportFormat, 
      { headers: { ...authCredentials} }
    )
    if (response.data) {
      const signaturesImportFormat = ms.signatureValuesToUint8Array({ signatures: response.data })
      commit('syncTransactionSignatures', { multisigTransaction, signatures: signaturesImportFormat })
    }
  }
}

export async function syncTransactionSignatures ({ commit, state, rootGetters }, { multisigWallet, multisigTransaction }) {
  const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
    multisigWallet,
    walletVault: rootGetters['global/getVault'] 
  })

  if (ms.isMultisigTransactionSynced(multisigTransaction)) {
    let signaturesExportFormat = [] 
    if (multisigTransaction.signatures?.length > 0) { 
      signaturesExportFormat = ms.signatureValuesToHex({ signatures: multisigTransaction.signatures }) 
    }
    const watchtower = rootGetters['global/getWatchtowerBaseUrl']
    const response = await axios.post(
      `${watchtower}/api/multisig/transaction-proposals/${multisigTransaction.id}/signatures/?sync=true`,
      signaturesExportFormat,
      { headers : { ...authCredentials } }
    ) 
    if (response.status === 200) { 
      const signaturesImportFormat = ms.signatureValuesToUint8Array({ signatures: response.data })
      commit('syncTransactionSignatures', { multisigTransaction, signatures: signaturesImportFormat })
    }
  }
}

export function updateTransaction ({ commit }, { id, multisigTransaction }) {
  commit('updateTransaction', { id, multisigTransaction })
}

export async function updateBroadcastStatus ({ commit, rootGetters }, { multisigTransaction }) {
  const watchtower = rootGetters['global/getWatchtowerBaseUrl']
  const response = await axios.get(`${watchtower}/api/multisig/transaction-proposals/${multisigTransaction.id}/status/`)
  if (response.data?.broadcastStatus) {
    commit('updateBroadcastStatus', { multisigTransaction, broadcastStatus: response.data?.broadcastStatus })
  }
}

// TODO: Add deleteById, deleteByIndex
export async function deleteTransactionById ({ commit, rootGetters }, { id, multisigWallet, sync = true }) {
  commit('deleteTransactionById', { id })
  if(sync) {
    const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
      multisigWallet,
      walletVault: rootGetters['global/getVault'] 
    })
    const watchtower = rootGetters['global/getWatchtowerBaseUrl']
    await axios.delete(`${watchtower}/api/multisig/transaction-proposals/${id}/`, { headers: { ...authCredentials } })
  }
}

export function deleteAllTransactions ({ commit }) {
  commit('deleteAllTransactions')
  // TODO: mutate watchtower
}

export async function fetchTransactions ({ commit, rootGetters }, multisigWallet) {
  
  const watchtower = rootGetters['global/getWatchtowerBaseUrl']
  const walletVault = rootGetters['global/getVault']
  const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
    multisigWallet,
    walletVault
  })
  
  const response = await axios.get(
    `${watchtower}/api/multisig/wallets/${multisigWallet.id}/transaction-proposals/`,
    {
      headers: {
        ...authCredentials
      }
    }
  )
  
  response.data?.forEach((multisigTransaction) => {
    const transaction = ms.importPst({ pst: multisigTransaction })
    if (!transaction.address) {
      const cashAddressNetworkPrefix = rootGetters['global/isChipnet'] ? CashAddressNetworkPrefix.testnet: CashAddressNetworkPrefix.mainnet
      transaction.address = ms.getMultisigCashAddress({ 
        ...multisigWallet, cashAddressNetworkPrefix })
    }
    commit('saveTransaction', transaction)
  })
}

export async function uploadTransaction ({ commit, rootGetters }, { multisigWallet, multisigTransaction }) {
  const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
    multisigWallet,
    walletVault: rootGetters['global/getVault'] 
  })
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
      { headers: { 'Content-Type': 'application/json', ...authCredentials } }
    )
    if (response.data) {
      const importedTransaction = ms.importPst({ pst: response.data })
      commit('updateTransaction', { id: multisigTransaction.id, multisigTransaction: importedTransaction })
    }
  }
}

export async function finalizeTransaction ({ commit, rootGetters }, { multisigTransaction, multisigWallet }) {

  const finalCompilationResult = ms.finalizeTransaction({ multisigTransaction, multisigWallet })
  if (finalCompilationResult.success && finalCompilationResult.vmVerificationSuccess) {
    commit('finalizeTransaction', { multisigTransaction, finalCompilationResult })
    const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
      multisigWallet,
      walletVault: rootGetters['global/getVault'] 
    })
    const watchtower = rootGetters['global/getWatchtowerBaseUrl']
    await axios.post(
      `${watchtower}/api/multisig/transaction-proposals/${multisigTransaction.id}/finalize/`,
      { headers: { 'Content-Type': 'application/json', ...authCredentials } }
    )
  }
  return finalCompilationResult
}

export async function broadcastTransaction ({ commit, rootGetters, dispatch }, { multisigWallet, multisigTransaction }) {
  const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
    multisigWallet,
    walletVault: rootGetters['global/getVault'] 
  })
  const watchtower = rootGetters['global/getWatchtowerBaseUrl']
  const response = await axios.post(
    `${watchtower}/api/multisig/transaction-proposals/${multisigTransaction.id}/broadcast/`,
    { headers: { 'Content-Type': 'application/json', ...authCredentials } }
  )
  if (response.data?.success || response.data?.error?.includes('txn-already-known') || response.data?.error?.includes('txn-already-in-mempool')) {
    commit('updateTransactionBroadcastStatus', { id: multisigTransaction.id, broadcastStatus: 'done' })
    commit('updateTransactionTxid', { id: multisigTransaction.id, txid: response.data?.txid})
    dispatch('deleteTransactionById', { id: multisigTransaction.id, multisigWallet, sync: false })
  }
  return response
}

export async function fetchWalletUtxos ({ commit, rootGetters }, cashAddress) {
  const decoded = decodeCashAddress(cashAddress)
  const watchtower = new Watchtower(rootGetters['global/isChipnet'])
  const response = await watchtower.getMultisigWalletUtxos(cashAddress)
  const utxos = response.data?.map((utxo) => watchtowerUtxoToCommonUtxo(utxo))
  commit('updateWalletUtxos', { walletAddress: cashAddress, utxos })
  return utxos
}
