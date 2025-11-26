import axios from 'axios'
import Watchtower from 'watchtower-cash-js'
import { decodePrivateKeyWif } from '@bitauth/libauth'
import WatchtowerExtended from '../../lib/watchtower'
import { deleteAuthToken } from 'src/exchange/auth'
import { decryptWalletName } from 'src/marketplace/chat/encryption'
import { saveWalletName, getWalletName, removeWalletName } from 'src/utils/wallet-name-cache'
import { loadLibauthHdWallet, loadWallet, deleteMnemonic, getMnemonic } from '../../wallet'
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
  if (!walletHash) {
    // No wallet exists yet (e.g., during initial app load before wallet creation)
    // Return early instead of rejecting to avoid uncaught errors
    return
  }
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
  if (!walletHash) {
    // No wallet exists yet (e.g., during initial app load before wallet creation)
    // Return early instead of rejecting to avoid uncaught errors
    return
  }
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

/**
 * Migrate existing wallets to have wallet-specific settings
 * This should be called once during app initialization to migrate existing wallets
 */
export function migrateWalletSettings (context) {
  // Get current values from all modules
  const darkMode = context.rootGetters['darkmode/getStatus']
  const currency = context.rootGetters['market/selectedCurrency']
  
  // Call mutation with current values
  context.commit('migrateWalletSettings', {
    darkMode: darkMode,
    currency: currency
  })
  
  // After migration, sync current wallet's settings to modules
  context.dispatch('syncSettingsToModules')
}

/**
 * Update darkMode and currency module states when switching wallets
 * This ensures components that directly access state (not getters) work correctly
 */
export function syncSettingsToModules (context) {
  const vault = context.getters.getVault
  const walletIndex = context.getters.getWalletIndex
  
  if (vault && vault[walletIndex] && vault[walletIndex].settings) {
    const settings = vault[walletIndex].settings
    
    // Update darkmode module state
    if (settings.darkMode !== undefined) {
      context.commit('darkmode/setDarkmodeSatus', settings.darkMode, { root: true })
    }
    
    // Update market module state
    if (settings.currency) {
      context.commit('market/updateSelectedCurrency', settings.currency, { root: true })
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
        // Sync settings to darkmode and market modules
        context.dispatch('syncSettingsToModules')

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
      const currentWalletIndex = context.getters.getWalletIndex
      const isDeletingCurrentWallet = index === currentWalletIndex
      
      // Mark wallet as deleted
      context.commit('deleteWallet', index)
      
      // If we're deleting the current wallet, switch to the first undeleted wallet
      if (isDeletingCurrentWallet) {
        const vault = context.getters.getVault
        const undeletedWallets = []
        
        vault.forEach((wallet, idx) => {
          if (wallet.deleted !== true) {
            undeletedWallets.push(idx)
          }
        })
        
        if (undeletedWallets.length > 0) {
          // Switch to the first undeleted wallet
          context.dispatch('switchWallet', undeletedWallets[0]).catch(console.error)
        } else {
          // No wallets left - clear vault (caller should handle routing)
          context.commit('clearVault')
        }
      }
      
      resolve()
    }, 1000)
  })
}

/**
 * Ensure the current wallet index points to an undeleted wallet
 * If the current wallet is deleted, null, or invalid, switch to the first valid wallet
 * Returns a promise that resolves when the wallet switch is complete (if needed)
 */
export async function ensureValidWalletIndex (context) {
  const vault = context.getters.getVault
  if (!vault || vault.length === 0) return

  const currentWalletIndex = context.getters.getWalletIndex
  const currentWallet = vault[currentWalletIndex]

  // Check if current wallet is valid (not null, not deleted, and has a walletHash)
  const isCurrentWalletValid = currentWallet && 
    currentWallet.deleted !== true && 
    currentWallet.wallet?.bch?.walletHash

  if (!isCurrentWalletValid) {
    // Find first valid (non-null, non-deleted, with walletHash) wallet
    const validWallets = []
    vault.forEach((wallet, index) => {
      // Skip null entries, deleted wallets, and wallets without walletHash
      if (wallet && 
          wallet.deleted !== true && 
          wallet.wallet?.bch?.walletHash) {
        validWallets.push(index)
      }
    })

    if (validWallets.length > 0) {
      // Switch to the first valid wallet
      const firstValidIndex = validWallets[0]
      // Only switch if it's different from current index to avoid unnecessary reloads
      if (firstValidIndex !== currentWalletIndex) {
        // Wait for the switch to complete before returning
        await context.dispatch('switchWallet', firstValidIndex).catch(console.error)
      }
    } else {
      // No valid wallets left - clear vault
      context.commit('clearVault')
    }
  }
}

/**
 * Clean up null and deleted vault entries on app startup
 * Removes entries that are null, marked as deleted, or don't have mnemonics
 */
export async function cleanupNullAndDeletedWallets (context) {
  const vault = context.getters.getVault
  if (!vault || vault.length === 0) return

  const currentWalletIndex = context.getters.getWalletIndex
  const indicesToRemove = []
  let currentWalletRemoved = false
  let newCurrentIndex = -1

  // Check each vault entry for validity
  for (let i = vault.length - 1; i >= 0; i--) {
    const wallet = vault[i]
    
    // Check if entry is null or deleted
    if (wallet === null || wallet === undefined || wallet.deleted === true) {
      indicesToRemove.push(i)
      
      // If this is the current wallet, mark it for removal
      if (i === currentWalletIndex) {
        currentWalletRemoved = true
      }
      
      // Delete mnemonic for this index
      const walletHash = wallet?.wallet?.bch?.walletHash
      if (walletHash) {
        removeWalletName(walletHash)
      }
      
      // Delete mnemonic from secure storage
      deleteMnemonic(i).catch(console.error)
      continue
    }
    
    // Check if mnemonic exists for this wallet index
    const mnemonic = await getMnemonic(i).catch(() => null)
    if (!mnemonic) {
      // No mnemonic exists - this is an orphaned vault entry, remove it
      indicesToRemove.push(i)
      
      // If this is the current wallet, mark it for removal
      if (i === currentWalletIndex) {
        currentWalletRemoved = true
      }
      
      // Delete wallet name cache if it exists
      const walletHash = wallet?.wallet?.bch?.walletHash
      if (walletHash) {
        removeWalletName(walletHash)
      }
      
      console.log(`[Wallet Cleanup] Removing vault entry at index ${i} - no mnemonic found`)
    }
  }

  // Remove entries in reverse order (to maintain indices)
  indicesToRemove.forEach(index => {
    context.commit('removeVaultEntry', index)
  })

  // If we removed the current wallet, find the first valid wallet and switch to it
  if (currentWalletRemoved) {
    const updatedVault = context.getters.getVault
    
    // Find first valid wallet
    for (let i = 0; i < updatedVault.length; i++) {
      const wallet = updatedVault[i]
      if (wallet && 
          wallet.deleted !== true && 
          wallet.wallet?.bch?.walletHash) {
        newCurrentIndex = i
        break
      }
    }
    
    if (newCurrentIndex !== -1) {
      // Switch to the first valid wallet
      context.dispatch('switchWallet', newCurrentIndex).catch(console.error)
    } else {
      // No valid wallets left - clear vault
      context.commit('clearVault')
    }
  } else if (indicesToRemove.length > 0) {
    // If we removed entries but not the current wallet, we need to adjust the current index
    // Count how many entries were removed before the current index
    const removedBeforeCurrent = indicesToRemove.filter(idx => idx < currentWalletIndex).length
    if (removedBeforeCurrent > 0) {
      const newIndex = currentWalletIndex - removedBeforeCurrent
      context.commit('updateWalletIndex', newIndex)
    }
  }
  
  if (indicesToRemove.length > 0) {
    console.log(`[Wallet Cleanup] Removed ${indicesToRemove.length} null/deleted vault entries`)
  }
}

/**
 * Clean up duplicate wallets in the vault based on walletHash
 * Keeps the wallet with a custom name (not "Personal Wallet #X") or the first one if both have generic names
 */
export function cleanupDuplicateWallets (context) {
  const vault = context.getters.getVault
  if (!vault || vault.length === 0) return

  const walletHashMap = new Map()
  const walletsToKeep = []
  const indicesToDelete = []
  const currentWalletIndex = context.getters.getWalletIndex
  let currentWalletDeleted = false
  let walletToSwitchTo = null

  vault.forEach((wallet, index) => {
    // Skip already deleted wallets
    if (wallet.deleted === true) {
      return
    }

    const walletHash = wallet?.wallet?.bch?.walletHash
    if (!walletHash) {
      // If no walletHash, keep it (might be incomplete wallet)
      walletsToKeep.push({ wallet, index })
      return
    }

    const normalizedHash = String(walletHash).trim()
    const existingEntry = walletHashMap.get(normalizedHash)

    if (!existingEntry) {
      // First occurrence of this walletHash
      walletsToKeep.push({ wallet, index })
      walletHashMap.set(normalizedHash, {
        index,
        wallet,
        hasCustomName: hasCustomWalletName(wallet.name)
      })
    } else {
      // Duplicate found - decide which one to keep
      const currentHasCustomName = hasCustomWalletName(wallet.name)

      // Prefer wallet with custom name, or if both have generic names, keep the first one
      if (currentHasCustomName && !existingEntry.hasCustomName) {
        // Current wallet has custom name, replace the existing one
        const existingKeepIndex = walletsToKeep.findIndex(w => w.index === existingEntry.index)
        if (existingKeepIndex !== -1) {
          walletsToKeep[existingKeepIndex] = { wallet, index }
          indicesToDelete.push(existingEntry.index)
          
          // If we're deleting the current wallet, remember which wallet to switch to
          if (existingEntry.index === currentWalletIndex) {
            currentWalletDeleted = true
            walletToSwitchTo = index
          }
        }
        walletHashMap.set(normalizedHash, {
          index,
          wallet,
          hasCustomName: true
        })
      } else {
        // Keep the existing entry, mark current as duplicate
        indicesToDelete.push(index)
        
        // If we're deleting the current wallet, remember which wallet to switch to
        if (index === currentWalletIndex) {
          currentWalletDeleted = true
          walletToSwitchTo = existingEntry.index
        }
      }
    }
  })

  // Mark duplicates as deleted (in reverse order to maintain indices)
  indicesToDelete.sort((a, b) => b - a).forEach(index => {
    context.commit('deleteWallet', index)
  })
  
  // If we deleted the current wallet, switch to the kept duplicate
  if (currentWalletDeleted && walletToSwitchTo !== null) {
    context.dispatch('switchWallet', walletToSwitchTo).catch(console.error)
  }
  
  // Ensure wallet index is still valid after cleanup (safety check)
  context.dispatch('ensureValidWalletIndex')
}

/**
 * Check if a wallet name is custom (not "Personal Wallet #X")
 */
function hasCustomWalletName (name) {
  if (!name || name === '') return false
  const genericNamePattern = /^Personal Wallet #\d+$/
  return !genericNamePattern.test(name)
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
