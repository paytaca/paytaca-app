import axios from 'axios'
import {
  stringify,
  binToHex,
  CashAddressNetworkPrefix,
  cashAddressToLockingBytecode,
  lockingBytecodeToCashAddress,
  decodeCashAddress,
} from 'bitauth-libauth-v3'
import * as ms from 'src/lib/multisig'
import { watchtowerUtxoToCommonUtxo } from 'src/utils/utxo-utils'
import { getMnemonic, getHdKeys, signMessageWithHdPrivateKey } from 'src/wallet'
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
  const response = await axios.post(`${rootGetters['global/getWatchtowerBaseUrl']}/api/multisig/wallets/`, multisigWallet)
  if (response?.data?.id) {
    commit('updateWallet', { oldMultisigWallet: multisigWallet, newMultisigWallet: response.data })
  }
  return response?.data
}

export async function syncWallet ({ commit, getWatchtowerBaseUrletters, rootGetters, dispatch },  multisigWallet ) {
    axios.get(`${rootGetters['global/getWatchtowerBaseUrl']}/api/multisig/wallets/${multisigWallet.id}/`)
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

export async function createWallet ({ commit, getters, rootGetters, dispatch }, multisigWallet) {
  const lockingBytecodeHex = ms.generateTempId(multisigWallet)
  const existingWallet = getters.getWalletByLockingBytecode({ lockingBytecodeHex })
  dispatch('subscribeWalletAddress', multisigWallet)
  if (existingWallet) return existingWallet
  multisigWallet.id = lockingBytecodeHex
  commit('createWallet', multisigWallet)
  dispatch('uploadWallet', multisigWallet )
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

export async function fetchWallets ({ commit, rootGetters }, { xpub }) {
  const watchtower = rootGetters['global/getWatchtowerBaseUrl']
  const response = await axios.get(`${watchtower}/api/multisig/wallets/?xpub=${xpub}`)
  response?.data?.forEach((multisigWallet) => {
    commit('saveWallet', multisigWallet)
  })
  return response.data
}

export async function deleteWallet ({ commit, rootGetters, getters }, { multisigWallet }) {
  commit('deleteWallet', { multisigWallet })

  const watchtower = rootGetters['global/getWatchtowerBaseUrl']
  await axios.delete(`${watchtower}/api/multisig/wallets/${multisigWallet.id}/`)
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

export function createTransaction ({ commit, dispatch }, { multisigWallet, multisigTransaction }) {
  multisigTransaction.id = ms.generateTempProposalId(multisigTransaction)
  multisigTransaction.signatures = []
  commit('saveTransaction', multisigTransaction)
  dispatch('uploadTransaction', { multisigWallet, multisigTransaction })
}

export async function addTransactionSignatures ({ commit, state, rootGetters }, { multisigTransaction, signerSignatures }) {
  const { signer, signatures } = signerSignatures
  const signaturesExportFormat = ms.signatureValuesToHex({ signatures })
  if (ms.isMultisigTransactionSynced(multisigTransaction)) {
    const watchtower = rootGetters['global/getWatchtowerBaseUrl']
    const response = await axios.post(`${watchtower}/api/multisig/transaction-proposals/${multisigTransaction.id}/signatures/${signer}/`, signaturesExportFormat)
    if (response.data) {
      const signaturesImportFormat = ms.signatureValuesToUint8Array({ signatures: response.data })
      commit('syncTransactionSignatures', { multisigTransaction, signatures: signaturesImportFormat })
    }
  }
}

export async function syncTransactionSignatures ({ commit, state, rootGetters }, { multisigTransaction }) {
  if (ms.isMultisigTransactionSynced(multisigTransaction)) {
    let signaturesExportFormat = [] 
    if (multisigTransaction.signatures?.length > 0) { 
      signaturesExportFormat = ms.signatureValuesToHex({ signatures: multisigTransaction.signatures }) 
    }
    const watchtower = rootGetters['global/getWatchtowerBaseUrl']
    const response = await axios.post(`${watchtower}/api/multisig/transaction-proposals/${multisigTransaction.id}/signatures/?sync=true`, signaturesExportFormat) 
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
  if (response?.data?.broadcastStatus) {
    commit('updateBroadcastStatus', { multisigTransaction, broadcastStatus: response.data.broadcastStatus })
  }
}

// TODO: Add deleteById, deleteByIndex
export async function deleteTransactionById ({ commit, rootGetters }, { id, sync = true }) {
  commit('deleteTransactionById', { id })
  if(sync) {
    const watchtower = rootGetters['global/getWatchtowerBaseUrl']
    await axios.delete(`${watchtower}/api/multisig/transaction-proposals/${id}/`)
  }
}

export function deleteAllTransactions ({ commit }) {
  commit('deleteAllTransactions')
  // TODO: mutate watchtower
}

export async function fetchTransactions ({ commit, rootGetters }, multisigWallet) {
  const watchtower = rootGetters['global/getWatchtowerBaseUrl']
  const response = await axios.get(`${watchtower}/api/multisig/wallets/${multisigWallet.id}/transaction-proposals/`)
  response.data?.forEach((multisigTransaction) => {
    const transaction = ms.importPst({ pst: multisigTransaction })
    commit('saveTransaction', transaction)
  })
}

export async function uploadTransaction ({ commit, rootGetters }, { multisigWallet, multisigTransaction }) {
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
      { headers: { 'Content-Type': 'application/json' } }
    )
    if (response.data) {
      const importedTransaction = ms.importPst({ pst: response.data })
      commit('updateTransaction', { id: multisigTransaction.id, multisigTransaction: importedTransaction })
    }
  }
}

export async function finalizeTransaction ({ commit, rootGetters, dispatch }, { multisigTransaction, multisigWallet }) {
  const finalCompilationResult = ms.finalizeTransaction({ multisigTransaction, multisigWallet })
  if (finalCompilationResult.success && finalCompilationResult.vmVerificationSuccess) {
    commit('finalizeTransaction', { multisigTransaction, finalCompilationResult })
    const watchtower = rootGetters['global/getWatchtowerBaseUrl']
    await axios.post(
      `${watchtower}/api/multisig/transaction-proposals/${multisigTransaction.id}/finalize/`,
      { headers: { 'Content-Type': 'application/json' } }
    )
  }
  return finalCompilationResult
}

export async function broadcastTransaction ({ commit, rootGetters, dispatch }, multisigTransaction) {
  const watchtower = rootGetters['global/getWatchtowerBaseUrl']
  const response = await axios.post(
    `${watchtower}/api/multisig/transaction-proposals/${multisigTransaction.id}/broadcast/`,
    { headers: { 'Content-Type': 'application/json' } }
  )
  if (response?.success || response?.error?.includes('tx-already-known')) {
    commit('updateTransactionBroadcastStatus', { id: multisigTransaction.id, broadcastStatus: 'done' })
    commit('updateTransactionTxid'), { id: multisigTransaction.id, txid: response.txid}
    dispatch('deleteTransaction', { id: multisigTransaction.id, sync: false })
  }
  return response
}

export async function fetchWalletUtxos ({ commit, rootGetters }, cashAddress) {
  const decoded = decodeCashAddress(cashAddress)

  let watchtower = 'https://watchtower.cash'
  if (decoded.prefix === 'bchtest') {
    watchtower = 'https://chipnet.watchtower.cash'
  }

  const tokenAddress = lockingBytecodeToCashAddress({
    bytecode: cashAddressToLockingBytecode(cashAddress).bytecode,
    prefix: decoded.prefix,
    tokenSupport: true
  }).address
  const bchUtxosUrl = `${watchtower}/api/utxo/bch/${cashAddress}/`
  const tokenUtxosUrl = `${watchtower}/api/utxo/ct/${tokenAddress}/`
  commit('clearWalletUtxos', { walletAddress: cashAddress })
  const fetchBchUtxos = async () => {
    const response = await axios.get(bchUtxosUrl)
    if (response.status === 200) {
      const utxos = response.data.utxos.map((utxo) => watchtowerUtxoToCommonUtxo(utxo))
      commit('addWalletUtxos', { walletAddress: cashAddress, utxos })
    }
  }
  const fetchTokenUtxos = async () => {
    const response = await axios.get(tokenUtxosUrl)
    if (response.status === 200) {
      const utxos = response.data.utxos.map((utxo) => watchtowerUtxoToCommonUtxo(utxo))
      commit('addWalletUtxos', { walletAddress: cashAddress, utxos })
    }
  }
  await Promise.all([fetchBchUtxos(), fetchTokenUtxos()])
}
