import axios from 'axios'
import {
  CashAddressNetworkPrefix,
  decodeCashAddress,
} from 'bitauth-libauth-v3'
import * as ms from 'src/lib/multisig'
import { generateAuthCredentialsForFirstSignerWithPrivateKey, generateAuthCredentialsForXPub } from 'src/utils/multisig-utils'
import { watchtowerUtxoToCommonUtxo } from 'src/utils/utxo-utils'
import Watchtower from 'src/lib/watchtower'


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

// export async function syncPst ({ commit, rootGetters }, { pst }) {
  
//   console.log('Syncing PST', pst)

//   const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
//     signers: pst.wallet.signers,
//     walletVault: rootGetters['global/getVault']
//   })

//   console.log('Auth Credentials', authCredentials)
//     if (authCredentials) {
//       const watchtower = rootGetters['global/getWatchtowerBaseUrl']
//       const response = await axios.post(
//         `${watchtower}/api/multisig/psts/${pst.unsignedTransactionHash}`,
//         { headers: { 'Content-Type': 'application/json', ...authCredentials } }
//       )
//     }
//   return pst
// }

// export async function addPstPartialSignature({ commit }, { pst, inputIndex, partialSignature, sync = false }) {
//   commit('addPstPartialSignature', { pst, inputIndex, partialSignature })
//   if (sync) {
//     const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
//       multisigWallet,
//       walletVault: rootGetters['global/getVault'] 
//     })
//     console.log('Auth Credentials', authCredentials)
//     if (authCredentials) {
//       const watchtower = rootGetters['global/getWatchtowerBaseUrl']
//       const response = await axios.post(
//         `${watchtower}/api/multisig/psts/${pst.unsignedTransactionHash}/sign/`,
//         pst,
//         { headers: { 'Content-Type': 'application/json', ...authCredentials } }
//       )
//       if (response.data?.id) {
//         commit('updatePstId', { unsignedTransactionHash: pst.unsignedTransactionHash, newId: response.data.id })
//       }
//     }
//   }
//   return pst
// }


// export async function updateWalletLastIssuedDepositAddressIndex({ commit, rootGetters }, { wallet, lastIssuedDepositAddressIndex }) {
//   commit('updateWalletLastIssuedDepositAddressIndex', { wallet, lastIssuedDepositAddressIndex })
//   return
//   const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
//     wallet,
//     walletVault: rootGetters['global/getVault'] 
//   })
//   if (authCredentials) {
//     const watchtower = rootGetters['global/getWatchtowerBaseUrl']
//     await axios.post(
//       `${watchtower}/api/multisig/wallets/${wallet.id}/last-issued-deposit-address-index/`,
//       { lastIssuedDepositAddressIndex },
//       { headers: { 'Content-Type': 'application/json', ...authCredentials } }
//     )
//   }
// }

// export async function updateWalletLastIssuedChangeAddressIndex({ commit, rootGetters }, { wallet, lastIssuedChangeAddressIndex }) {
//   commit('updateWalletLastIssuedChangeAddressIndex', { wallet, lastIssuedChangeAddressIndex })
//   return
//   const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
//     wallet,
//     walletVault: rootGetters['global/getVault'] 
//   })
//   if (authCredentials) {
//     const watchtower = rootGetters['global/getWatchtowerBaseUrl']
//     await axios.post(
//       `${watchtower}/api/multisig/wallets/${wallet.id}/last-issued-change-address-index/`,
//       { lastIssuedChangeAddressIndex },
//       { headers: { 'Content-Type': 'application/json', ...authCredentials } }
//     )
//   }
// }

// export async function updateWalletLastUsedDepositAddressIndex({ commit, rootGetters }, { wallet, lastUsedDepositAddressIndex }) {
//   console.log('Updating last used deposit address indexz', wallet, lastUsedDepositAddressIndex)
//   commit('updateWalletLastUsedDepositAddressIndex', { wallet, lastUsedDepositAddressIndex })
//   return
//   const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
//     wallet,
//     walletVault: rootGetters['global/getVault'] 
//   })
//   if (authCredentials) {
//     const watchtower = rootGetters['global/getWatchtowerBaseUrl']
//     await axios.post(
//       `${watchtower}/api/multisig/wallets/${wallet.id}/last-used-deposit-address-index/`,
//       { lastUsedDepositAddressIndex },
//       { headers: { 'Content-Type': 'application/json', ...authCredentials } }
//     )
//   }
// }

// export async function updateWalletLastUsedChangeAddressIndex({ commit, rootGetters }, { wallet, lastUsedChangeAddressIndex }) {
//   commit('updateWalletLastUsedChangeAddressIndex', { wallet, lastUsedChangeAddressIndex })
//   return
//   const authCredentials = await generateAuthCredentialsForFirstSignerWithPrivateKey({ 
//     wallet,
//     walletVault: rootGetters['global/getVault'] 
//   })
//   if (authCredentials) {
//     const watchtower = rootGetters['global/getWatchtowerBaseUrl']
//     await axios.post(
//       `${watchtower}/api/multisig/wallets/${wallet.id}/last-used-change-address-index/`,
//       { lastUsedDepositAddressIndex },
//       { headers: { 'Content-Type': 'application/json', ...authCredentials } }
//     )
//   }
// }

// export async function updatePstBroadcastResult({ commit }, { pst, broadcastResult }) {
//   commit('updatePstBroadcastResult', { pst, broadcastResult })
// }

export async function subscribeWalletAddress ({ rootGetters }, address) {
  const watchtower = new Watchtower(rootGetters['global/isChipnet'])
  return await watchtower.subscribeAddress(address)
}


