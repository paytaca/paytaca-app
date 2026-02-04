import axios from 'axios'
import {
  decodeCashAddress,
} from 'bitauth-libauth-v3'
import { generateAuthCredentialsForFirstSignerWithPrivateKey, generateAuthCredentialsForXPub } from 'src/utils/multisig-utils'
import { watchtowerUtxoToCommonUtxo } from 'src/utils/utxo-utils'
import Watchtower from 'src/lib/watchtower'

const projectId = {
  mainnet: process.env.WATCHTOWER_PROJECT_ID,
  chipnet: process.env.WATCHTOWER_CHIP_PROJECT_ID
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



/**
 * !!! Sync wallet with Watchtower  
 */
export async function syncWallet ({ commit, rootGetters },  wallet ) {

  const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
    signers: wallet.signers,
    walletVault: rootGetters['global/getVault'] 
  })
  
  const response = await axios.post(`${rootGetters['global/getWatchtowerBaseUrl']}/api/multisig/wallets/${wallet.getWalletHash()}/sync/`, wallet, { headers: { ...authCredentials } })
  
  return response.data
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

export async function deleteWallet ({ commit, rootGetters }, { multisigWallet, sync }) {
  
  const signers = structuredClone(multisigWallet.signers)
  
  commit('deleteWallet', { multisigWallet })

  const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
    signers,
    walletVault: rootGetters['global/getVault'] 
  })
  const watchtower = rootGetters['global/getWatchtowerBaseUrl']
  if (sync) {
    await axios.delete(
      `${watchtower}/api/multisig/wallets/${multisigWallet.id}/`,
      { headers: { ...authCredentials } }
    )
  }
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


export async function broadcastTransaction ({ commit, rootGetters, dispatch }, { multisigWallet, multisigTransaction }) {
  const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
    multisigWallet,
    walletVault: rootGetters['global/getVault'] 
  })
  const watchtower = rootGetters['global/getWatchtowerBaseUrl']
  const response = await axios.post(
    `${watchtower}/api/multisig/transaction-proposals/${multisigTransaction.id}/broadcast/`,
    {},
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
// --------------------
export async function savePst ({ commit }, { pst, sync = false }) {
  console.log('Dispatching', pst)
  commit('savePst', pst)
  if (sync) {
    const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
      multisigWallet,
      walletVault: rootGetters['global/getVault'] 
    })
    console.log('Auth Credentials', authCredentials)
    if (authCredentials) {
      const watchtower = rootGetters['global/getWatchtowerBaseUrl']
      const response = await axios.post(
        `${watchtower}/api/multisig/psts/`,
        pst,
        { headers: { 'Content-Type': 'application/json', ...authCredentials } }
      )
      if (response.data?.id) {
        commit('updatePstId', { unsignedTransactionHash: pst.unsignedTransactionHash, newId: response.data.id })
      }
    }
  }
  return pst
}

export async function deletePsbt ({ commit }, { pst, sync = false }) {
  commit('deletePst', pst)
  if (sync) {
    const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
      multisigWallet,
      walletVault: rootGetters['global/getVault'] 
    })
    console.log('Auth Credentials', authCredentials)
    if (authCredentials) {
      const watchtower = rootGetters['global/getWatchtowerBaseUrl']
      const response = await axios.delete(
        `${watchtower}/api/multisig/psts/${pst.unsignedTransactionHash}`,
        { headers: { 'Content-Type': 'application/json', ...authCredentials } }
      )
    }
  }
  return pst
}

export async function subscribeWalletAddress ({ rootGetters }, address) {
  const watchtower = new Watchtower(rootGetters['global/isChipnet'])
  return await watchtower.subscribeAddress(address)
}

export async function subscribeWalletAddressIndex ({ rootGetters }, { wallet, addressIndex, type = 'pair' }) {
  const walletHash = wallet.getWalletHash()
  const receiveAddress = wallet.getDepositAddress(addressIndex, wallet.cashAddressNetworkPrefix).address
  const changeAddress = wallet.getChangeAddress(addressIndex, wallet.cashAddressNetworkPrefix).address
  
  let addresses = {}
  
  if (type === 'pair') {
    changeAddress.receiving = receiveAddress
    changeAddress.change = changeAddress
  }

  if (type === 'deposit') {
    addresses.receiving = receiveAddress
  }
  
  if (type === 'change') {
    addresses.change = changeAddress
  }
  
  const watchtower = new Watchtower(rootGetters['global/isChipnet'])

  return await watchtower.subscribe({
    projectId: projectId[rootGetters['global/isChipnet'] ? 'chipnet' : 'mainnet'],
    walletHash,
    addresses,
    addressIndex
  })
}

