import Watchtower from 'watchtower-cash-js'
import { decodePrivateKeyWif } from '@bitauth/libauth'
import WatchtowerExtended from '../../lib/watchtower'
import { deleteAuthToken } from 'src/exchange/auth'
import { decryptWalletName } from 'src/marketplace/chat/encryption'
import { loadLibauthHdWallet } from '../../wallet'
import { privateKeyToCashAddress } from '../../wallet/walletconnect2/tx-sign-utils'
import { toP2pkhTestAddress } from '../../utils/address-utils'
import { backend } from 'src/exchange/backend'
import { backend as posBackend } from 'src/wallet/pos'
const DEFAULT_BALANCE_MAX_AGE = 60 * 1000
const watchtower = new Watchtower()

export function fetchAppControl (context) {
  return new Promise((resolve, reject) => {
    backend.get('/app-control/')
      .then(response => {
        context.commit('updateAppControl', response.data)
        resolve(response.data)
      })
      .catch(error => {
        reject(error)
      })
  })
}

export function fetchMerchant (context, merchantId) {
  return new Promise((resolve, reject) => {
    posBackend.get(`/paytacapos/merchants/${merchantId}`, { authorize: true })
      .then(response => {
        context.commit('updateMerchantActivity', response.data)
        resolve(response.data)
      })
      .catch(error => {
        reject(error)
      })
  })
}

export function updateOnboardingStep (context, status) {
  context.commit('updateOnboardingStep', status)
}

export function updateAddresses (context, addresses) {
  context.commit('updateAddresses', addresses)
}

export function setPrivateMode (context, { privateMode }) {
  const val = Boolean(privateMode)
  context.commit('setPrivateMode', val)
  return Promise.resolve(val)
}

export function updateTransactions (context, data) {
  context.commit('updateTransactions', data)
}

/**
 *
 * @param {Object} context
 * @param {Object} data
 * @param {String} data.walletHash
 * @param {Number} data.age
 */
export async function updateUtxoScanTaskStatus (context, data) {
  const walletHash = data?.walletHash
  if (!walletHash) return { success: false, error: '`walletHash` required' }

  const taskInfo = context.getters.getUtxoScanInfo(walletHash)
  if (!taskInfo?.taskId) return { success: false, error: 'no ongoing task id found' }

  if (Number.isFinite(data.age)) {
    const expiryTimestamp = Date.now() - data.age
    const expired = taskInfo?.lastUpdate < expiryTimestamp
    if (!expired) return { success: false, error: 'last update is less than age' }
  }
  const { data: newTaskInfo } = await watchtower.BCH._api.get(`task/${taskInfo.taskId}/`)

  const updatedTaskInfo = {
    walletHash: walletHash,
    taskId: taskInfo.taskId,
    status: newTaskInfo.status,
    completedAt: newTaskInfo.date_done ? (new Date(newTaskInfo.date_done + '-0000')) * 1 : taskInfo.completedAt,
    queueInfo: newTaskInfo?.queue_info
  }
  context.commit('setUtxoScanTask', updatedTaskInfo)
  return { success: true, taskInfo: updatedTaskInfo }
}

export function updateConnectivityStatus (context, online) {
  context.commit('updateConnectivityStatus', online)
}

export async function refetchWalletPreferences (context) {
  const walletHash = context.getters.getWallet('bch')?.walletHash
  if (!walletHash) return Promise.reject('wallet hash not found')
  try {
    const preferencesResponse = await watchtower.BCH._api.get(`wallet/preferences/${walletHash}/`)
    context.dispatch('updateWalletPreferences', preferencesResponse?.data)
  } catch {}
}

export async function fetchWalletName (context, walletHash) {
  try {
    const response = await watchtower.BCH._api.get(`wallet/preferences/${walletHash}/`)
    return response?.data?.wallet_name
  } catch {}
}

/**
 * @param {Object} context
 * @param {Object} opts
 * @param {Number} opts.walletIndex
 */
export async function syncWalletName (context, opts) {
  const vault = context.getters.getVault?.[opts?.walletIndex]
  if (!vault) throw new Error('No vault found')

  const walletHash = vault?.wallet?.bch?.walletHash
  if (!walletHash) {
    console.error('No wallet hash found in vault:', vault)
    return // throw new Error('No wallet hash found')
  }

  const walletName = await context.dispatch('fetchWalletName', walletHash) ?? ''
  const decryptedName = decryptWalletName(walletName, walletHash)
  context.commit('updateWalletName', { index: opts?.walletIndex, name: decryptedName })
  return decryptedName
}

export async function updateWalletNameInPreferences (context, data) {
  const selectedCurrency = context.rootGetters['market/selectedCurrency']
  const walletHash = context.rootGetters['global/getVault'][data.walletIndex].wallet.bch.walletHash
  const payload = {
    wallet_hash: walletHash,
    selected_currency: selectedCurrency?.symbol,
    wallet_name: data.walletName
  }

  await watchtower.BCH._api.patch(`wallet/preferences/${walletHash}/`, payload)

  try {
    const decryptedName = decryptWalletName(data.walletName, walletHash)
    context.commit('updateWalletName', { index: data.walletIndex, name: decryptedName })
  } catch (error) {
    console.error(error)
    context.dispatch('syncWalletName', { walletIndex: data?.walletIndex })
  }
}

/**
 *
 * @param {Object} context
 * @param {Object} data
 * @param {String} data.selected_currency
 */
export async function updateWalletPreferences (context, data) {
  const selectedCurrency = data?.selected_currency
  if (selectedCurrency) {
    const currency = context.rootGetters['market/currencyOptions']?.find(currencyOpt => currencyOpt?.symbol === selectedCurrency)
    if (currency) context.commit('market/updateSelectedCurrency', currency, { root: true })
  }
}

export async function saveWalletPreferences (context) {
  const walletHash = context.getters.getWallet('bch')?.walletHash
  if (!walletHash) return Promise.reject('wallet hash not found')
  const data = {}

  const selectedCurrency = context.rootGetters['market/selectedCurrency']
  if (selectedCurrency?.symbol) data.selected_currency = selectedCurrency?.symbol

  const response = await watchtower.BCH._api.patch(`wallet/preferences/${walletHash}/`, data)
  if (response?.data?.wallet_hash) context.dispatch('updateWalletPreferences', response?.data)

  return response?.data
}

export async function saveExistingWallet (context) {
  const vault = context.getters.getVault

  // check if vault keys are valid
  if (vault.length > 0) {
    if (vault[0]) {
      if (!vault[0].hasOwnProperty('name') || !vault[0].hasOwnProperty('chipnet') || !vault[0].hasOwnProperty('wallet')) {
        context.commit('clearVault')
      }
    }
  }

  if (context.getters.isVaultEmpty) {
    const walletHash = context.getters.getWallet('bch')?.walletHash
    if (walletHash) {
      let wallet = context.getters.getAllWalletTypes
      wallet = JSON.stringify(wallet)
      wallet = JSON.parse(wallet)

      let chipnet = context.getters.getAllChipnetTypes
      chipnet = JSON.stringify(chipnet)
      chipnet = JSON.parse(chipnet)
      const info = {
        wallet: wallet,
        chipnet: chipnet
      }
      context.commit('updateVault', info)
    }
  }
}

export async function syncCurrentWalletToVault(context) {
  const currentIndex = context.getters.getWalletIndex
  const wallet = context.getters.getAllWalletTypes
  const chipnet = context.getters.getAllChipnetTypes

  const walletName = context.getters.getVault[currentIndex].name

  const info = {
    index: currentIndex,
    walletSnapshot: wallet,
    chipnetSnapshot: chipnet,
    name: walletName
  }

  const asset = context.rootGetters['assets/getAllAssets']

  context.commit('updateWalletSnapshot', info)
  context.commit(
    'assets/updateVaultSnapshot',
    { index: currentIndex, snapshot: asset },
    { root: true }
  )
}

export async function switchWallet (context, index) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        context.dispatch('syncCurrentWalletToVault', )
        context.commit('paytacapos/clearMerchantsInfo', {}, { root: true })
        context.commit('paytacapos/clearBranchInfo', {}, { root: true })
        context.commit('ramp/resetUser', {}, { root: true })
        context.commit('ramp/resetData', {}, { root: true })
        context.commit('ramp/resetChatIdentity', {}, { root: true })
        context.commit('ramp/resetPagination', {}, { root: true })
        deleteAuthToken()

        context.commit('updateWalletIndex', index)
        context.commit('updateCurrentWallet', index)

        resolve()
      } catch (error) {
        reject(error)
      }
    }, 1000)
  })
}

export async function deleteWallet (context, index) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      context.commit('deleteWallet', index)
      resolve()
    }, 1000)
  })
}

/**
 * Fetch and loads last address and index from server (watchtower)
 */
export async function loadWalletLastAddressIndex (context) {
  const w = new WatchtowerExtended(context.state.isChipnet)
  const wallet = context.state.isChipnet
    ? context.state.chipnet__wallets.bch
    : context.state.wallets.bch

  try {
    const lastAddressAndIndex = await w.getLastExternalAddressIndex(wallet.walletHash)
    context.commit('setWalletLastAddressAndIndex', lastAddressAndIndex)
  } catch (error) {
    // on error just use the existing
    context.commit('setWalletLastAddressAndIndex', {
      address: wallet.lastAddress,
      address_index: wallet.lastAddressIndex
    })
  }
}

/**
 * @return the BCH addresses of wallet
 */
export async function loadWalletAddresses (context) {
  let lastIndex =
    context.state.wallets.bch.lastAddressAndIndex?.address_index ||
    context.state.wallets.bch.lastAddressIndex

  if (context.state.isChipnet) {
    lastIndex =
    context.state.chipnet__wallets.bch.lastAddressAndIndex?.address_index ||
    context.state.chipnet__wallets.bch.lastAddressIndex
  }

  const walletIndex = context.getters.getWalletIndex
  const libauthWallet = await loadLibauthHdWallet(walletIndex, Boolean(context.state.isChipnet))

  const stopAtIndex = lastIndex + 1 // include lastIndex
  const walletAddresses = []
  for (let i = 0; i < stopAtIndex; i++) {
    try {
      const wif = libauthWallet.getPrivateKeyWifAt(`0/${i}`)
      const decodedPrivkey = decodePrivateKeyWif(wif)
      let cashAddress = privateKeyToCashAddress(decodedPrivkey.privateKey)

      if (context.state.isChipnet) {
        // to test address
        cashAddress = toP2pkhTestAddress(cashAddress)
      }
      walletAddresses.push({ address_index: i, address: cashAddress, wif: wif })
    } catch (error) {
      console.log(error)
      break
    }
  }
  context.commit('setWalletAddresses', walletAddresses)
}

// type ConnectedApp = {
//   app_url/*:string*/,
//   app_name/*:string*/,
//   app_icon: string,
//   wallet_address/*:string*/,
//   wallet_hash/*:string*/
// }

export async function loadWalletConnectedApps (context) {
  const w = new WatchtowerExtended(context.state.isChipnet)
  const walletHash = context.state.isChipnet
    ? context.state.chipnet__wallets.bch.walletHash
    : context.state.wallets.bch.walletHash
  const connectedApps = await w.getWalletConnectedApps(walletHash)
  context.commit('setWalletConnectedApps', connectedApps)
}
