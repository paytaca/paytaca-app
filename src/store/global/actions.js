import axios from 'axios'
import Watchtower from 'watchtower-cash-js'
import { decodePrivateKeyWif } from '@bitauth/libauth'
import WatchtowerExtended from '../../lib/watchtower'
import { deleteAuthToken } from 'src/exchange/auth'
import { decryptWalletName } from 'src/marketplace/chat/encryption'
import { saveWalletName, getWalletName } from 'src/utils/wallet-name-cache'
import { loadLibauthHdWallet, loadWallet } from '../../wallet'
import { privateKeyToCashAddress } from '../../wallet/walletconnect2/tx-sign-utils'
import { toP2pkhTestAddress } from '../../utils/address-utils'
import { backend } from 'src/exchange/backend'
import { backend as posBackend } from 'src/wallet/pos'
import { toTokenAddress } from 'src/utils/crypto'
import { getWalletByNetwork } from 'src/wallet/chipnet'

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

  // Check cache first for offline support
  const cachedName = getWalletName(walletHash)
  if (cachedName) {
    // Update Vuex with cached name
    context.commit('updateWalletName', { index: opts?.walletIndex, name: cachedName })
  }

  try {
    // Try to fetch from server
    const walletName = await context.dispatch('fetchWalletName', walletHash) ?? ''
    if (walletName) {
      const decryptedName = decryptWalletName(walletName, walletHash)
      // Save to cache for offline use
      saveWalletName(walletHash, decryptedName)
      context.commit('updateWalletName', { index: opts?.walletIndex, name: decryptedName })
      return decryptedName
    }
  } catch (error) {
    // If fetch fails (e.g., offline), use cached name if available
    if (cachedName) {
      return cachedName
    }
    // Re-throw if no cache available
    throw error
  }

  // If no server response and no cache, return cached name or empty string
  return cachedName || ''
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
    // Save to cache for offline use
    saveWalletName(walletHash, decryptedName)
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
      if (!vault[0].hasOwnProperty('chipnet') || !vault[0].hasOwnProperty('wallet')) {
        // Clear all cached wallet names when clearing vault
        const allCachedNames = getAllWalletNames()
        Object.keys(allCachedNames).forEach(walletHash => {
          removeWalletName(walletHash)
        })
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

import { migrateGlobalToWalletSpecific } from 'src/utils/wallet-migration'

export async function switchWallet (context, index) {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        context.dispatch('syncCurrentWalletToVault', )
        context.commit('assets/updatedCurrentAssets', index, { root: true })
        
        // Get wallet hash for the new wallet to initialize state
        const vault = context.state.vault
        const newWallet = vault[index]
        const walletHash = newWallet?.BCH?.walletHash || newWallet?.walletHash
        
        // Initialize wallet-specific state if hash is available
        if (walletHash) {
          // Initialize ramp store state for the new wallet
          context.commit('ramp/initializeWalletState', walletHash, { root: true })
          
          // Initialize paytacapos store state for the new wallet
          context.commit('paytacapos/initializeWalletState', walletHash, { root: true })
          
          // Trigger migration if needed (try to migrate, but don't fail if it doesn't work)
          // Import migration dynamically to avoid circular dependencies
          try {
            const { migrateGlobalToWalletSpecific } = await import('src/utils/wallet-migration')
            await migrateGlobalToWalletSpecific(walletHash)
          } catch (migrationError) {
            // Migration errors are non-critical - app can continue with fresh state
            console.warn('Migration failed (non-critical):', migrationError)
          }
        }
        
        // Removed all reset/clear commits - data is now wallet-specific and persists
        // No need to clear data when switching wallets since each wallet has its own state
        
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

/**
 * @param {Object} context 
 * @param {Object} opts 
 * @param {String} [opts.walletType = 'all']
 * @param {String} [opts.tokenId]
 */
export async function autoGenerateAddress(context, opts) {
  const autoGenerateAddress = context.getters['autoGenerateAddress']
  if (!autoGenerateAddress) return { enabled: false, message: 'Auto generate disabled' }

  const walletType = opts?.walletType || 'bch'

  const address = context.getters['getAddress'](walletType)
  const lastAddressIndex = context.getters['getLastAddressIndex'](walletType)

  const baseUrl = this.isChipnet ? 'https://chipnet.watchtower.cash' : 'https://watchtower.cash'

  const promises = []
  if (walletType === 'slp') {
    let url = `${baseUrl}/api/balance/slp/${address}/`
    if (opts?.tokenId) url = url + `/${opts?.tokenId}/`
    promises.push(
      axios.get(`${baseUrl}/api/balance/bch/${address}/`).catch(() => false)
    )
  } else {
    promises.push(
      axios.get(`${baseUrl}/api/balance/bch/${address}/?include_token_sats=true`).catch(() => false)
    )

    if (opts?.tokenId) {
      const tokenAddress = toTokenAddress(address)
      promises.push(
        axios.get(`${baseUrl}/api/balance/ct/${tokenAddress}/${opts?.tokenId}/`).catch(() => false)
      )
    }
  }

  const promiseResults = await Promise.all(promises)
  const generateNewAddress = promiseResults.some(response => {
    return response?.data?.balance > 0
  })

  if (!generateNewAddress) return { address, message: 'Address has no balance',  }

  const newAddressIndex = parseInt(lastAddressIndex)+1 || 0
  const wallet = await loadWallet(context.getters['getWalletIndex'])
  if (walletType === 'slp') {
    await getWalletByNetwork(wallet, walletType).getNewAddressSet(newAddressIndex).then(function (addresses) {
      context.commit('generateNewAddressSet', {
        type: 'slp',
        lastAddress: addresses.receiving,
        lastChangeAddress: addresses.change,
        lastAddressIndex: newAddressIndex
      })
    })
  } else {
    await getWalletByNetwork(wallet, walletType).getNewAddressSet(newAddressIndex).then(function (result) {
      const addresses = result.addresses
      context.commit('generateNewAddressSet', {
        type: 'bch',
        lastAddress: addresses.receiving,
        lastChangeAddress: addresses.change,
        lastAddressIndex: newAddressIndex
      })
    })

    if (walletType === 'Smart BCH') {
      await wallet.sBCH.getOrInitWallet().then(() => {
        wallet.sBCH.subscribeWallet()
      })
    }
  }
  return { success: true }
}
