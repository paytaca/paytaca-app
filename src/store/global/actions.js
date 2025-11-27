import axios from 'axios'
import Watchtower from 'watchtower-cash-js'
import { decodePrivateKeyWif } from '@bitauth/libauth'
import WatchtowerExtended from '../../lib/watchtower'
import { deleteAuthToken } from 'src/exchange/auth'
import { decryptWalletName } from 'src/marketplace/chat/encryption'
import { saveWalletName, getWalletName, removeWalletName } from 'src/utils/wallet-name-cache'
import { loadLibauthHdWallet, loadWallet, deleteMnemonic, getMnemonic, getMnemonicByHash, deleteMnemonicByHash, deleteAllWalletData, computeWalletHash } from '../../wallet'
import { getVaultIndexByWalletHashAsync } from 'src/utils/wallet-storage'
import { Plugins } from '@capacitor/core'

const { SecureStoragePlugin } = Plugins
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
  const vault = context.getters.getVault
  
  // Safety check: ensure vault entry exists at current index
  // This can happen after wallet deletion when indices shift
  if (!vault || !vault[currentIndex]) {
    console.warn(`[syncCurrentWalletToVault] Vault entry does not exist at index ${currentIndex}. Vault length: ${vault?.length || 0}`)
    // Don't switch wallets here - just return early
    // The caller (switchWallet or ensureValidWalletIndex) should handle wallet switching
    return
  }
  
  const wallet = context.getters.getAllWalletTypes
  const chipnet = context.getters.getAllChipnetTypes

  const walletName = vault[currentIndex].name || ''

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

/**
 * Switch wallet by wallet hash or index
 * @param {Object} context - Vuex context
 * @param {string|number} walletHashOrIndex - Wallet hash (string) or vault index (number)
 */
export async function switchWallet (context, walletHashOrIndex) {
  console.log('[switchWallet] ===== Starting wallet switch =====')
  console.log('[switchWallet] Input (walletHashOrIndex):', walletHashOrIndex, typeof walletHashOrIndex)
  console.log('[switchWallet] Current wallet index before switch:', context.getters.getWalletIndex)
  
  // Determine target index/hash SYNCHRONOUSLY before the async setTimeout
  // This allows immediate index update so router guard sees correct index
  let walletHash = null
  let index = null
  let newWallet = null
  const vault = context.state.vault
  console.log('[switchWallet] Vault length:', vault?.length || 0)
  
  // Determine if input is wallet hash or index (synchronously for index, async for hash lookup)
  if (typeof walletHashOrIndex === 'string' && walletHashOrIndex.length >= 32) {
    // Wallet hash provided - need to find index (async, but we'll do it in the setTimeout)
    walletHash = walletHashOrIndex
    console.log('[switchWallet] Wallet hash provided, will find index in async block...')
  } else {
    // Index provided (backward compatibility) - can validate synchronously
    index = walletHashOrIndex
    console.log('[switchWallet] Index provided:', index)
    newWallet = vault[index]
    console.log('[switchWallet] Wallet at index exists:', !!newWallet, 'deleted:', newWallet?.deleted)
    
    if (!newWallet || newWallet.deleted === true) {
      console.error(`[switchWallet] Cannot switch to wallet at index ${index}: wallet does not exist or is deleted`)
      return Promise.reject(new Error(`Wallet at index ${index} does not exist`))
    }
    
    // Extract wallet hash from wallet
    walletHash = newWallet?.wallet?.bch?.walletHash || 
                newWallet?.wallet?.BCH?.walletHash ||
                newWallet?.BCH?.walletHash || 
                newWallet?.bch?.walletHash ||
                newWallet?.walletHash
    console.log('[switchWallet] Extracted wallet hash:', walletHash || 'none')
    
    // Update wallet index IMMEDIATELY (synchronously) so router guard sees correct index
    console.log('[switchWallet] Updating wallet index IMMEDIATELY to:', index)
    context.commit('updateWalletIndex', index)
    context.commit('updateCurrentWallet', index)
    console.log('[switchWallet] Wallet index updated synchronously, new index:', context.getters.getWalletIndex)
  }
  
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        // If wallet hash was provided, find index now
        if (walletHash && index === null) {
          console.log('[switchWallet] Finding index for wallet hash...')
          index = await getVaultIndexByWalletHashAsync(walletHash)
          console.log('[switchWallet] Found index for wallet hash:', index)
          
          if (index === null || index === -1) {
            console.error(`[switchWallet] Wallet hash ${walletHash} not found in vault`)
            reject(new Error(`Wallet hash ${walletHash} not found in vault`))
            return
          }
          
          newWallet = vault[index]
          // Update index now that we found it
          context.commit('updateWalletIndex', index)
          context.commit('updateCurrentWallet', index)
        }
        
        console.log('[switchWallet] Target wallet index:', index)
        console.log('[switchWallet] Target wallet hash:', walletHash || 'none')
        console.log('[switchWallet] Target wallet name:', newWallet?.name || 'none')
        
        // Sync current wallet to vault BEFORE switching (saves current wallet state)
        console.log('[switchWallet] Syncing current wallet to vault...')
        await context.dispatch('syncCurrentWalletToVault')
        console.log('[switchWallet] Sync completed')
        
        // Index was already updated synchronously above, but ensure it's still correct
        if (context.getters.getWalletIndex !== index) {
          console.log('[switchWallet] Re-updating wallet index to:', index, '(was:', context.getters.getWalletIndex, ')')
          context.commit('updateWalletIndex', index)
          context.commit('updateCurrentWallet', index)
        }
        
        context.commit('assets/updatedCurrentAssets', index, { root: true })
        
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
        // Note: wallet index was already updated above
        
        // Sync settings to darkmode and market modules
        console.log('[switchWallet] Syncing settings to modules...')
        context.dispatch('syncSettingsToModules')
        console.log('[switchWallet] Settings synced')

        console.log('[switchWallet] Final wallet index:', context.getters.getWalletIndex)
        console.log('[switchWallet] ===== Wallet switch completed successfully =====')
        resolve()
      } catch (error) {
        console.error('[switchWallet] Error during wallet switch:', error)
        console.error('[switchWallet] Error stack:', error.stack)
        reject(error)
      }
    }, 1000)
  })
}

/**
 * Delete wallet by wallet hash or index
 * @param {Object} context - Vuex context
 * @param {string|number} walletHashOrIndex - Wallet hash (string) or vault index (number)
 */
export async function deleteWallet (context, walletHashOrIndex) {
  // Accept either wallet hash or index for backward compatibility
  let walletHash = null
  let index = null
  let wallet = null
  const vault = context.getters.getVault
  
  // Determine if input is wallet hash or index
  if (typeof walletHashOrIndex === 'string' && walletHashOrIndex.length >= 32) {
    // Wallet hash provided - find index
    walletHash = walletHashOrIndex
    index = await getVaultIndexByWalletHashAsync(walletHash)
    
    if (index === null || index === -1) {
      console.warn(`[Wallet Deletion] Wallet hash ${walletHash} not found in vault`)
      return
    }
    
    wallet = vault[index]
  } else {
    // Index provided (backward compatibility)
    index = walletHashOrIndex
    wallet = vault[index]
    
    if (!wallet) {
      console.warn(`[Wallet Deletion] No wallet found at index ${index}`)
      return
    }
    
    // Extract wallet hash from wallet
    walletHash = wallet?.wallet?.bch?.walletHash || 
                 wallet?.wallet?.BCH?.walletHash ||
                 wallet?.BCH?.walletHash ||
                 wallet?.bch?.walletHash ||
                 wallet?.walletHash
  }

  const currentWalletIndex = context.getters.getWalletIndex
  const isDeletingCurrentWallet = index === currentWalletIndex
  
  // Get wallet data before deletion for cleanup
  let mnemonic = null
  
  // Try to get mnemonic for PIN code deletion
  if (walletHash) {
    try {
      mnemonic = await getMnemonicByHash(walletHash).catch(() => null)
    } catch (err) {
      console.warn(`[Wallet Deletion] Could not retrieve mnemonic for cleanup:`, err)
    }
  }
  
  // Perform complete cleanup of all wallet data
  if (walletHash) {
    console.log(`[Wallet Deletion] Performing complete cleanup for wallet hash: ${walletHash}`)
    await deleteAllWalletData(walletHash, mnemonic, index).catch(err => {
      console.error(`[Wallet Deletion] Error during cleanup:`, err)
    })
  } else {
    // Fallback: try to delete using index if no wallet hash
    console.warn(`[Wallet Deletion] No wallet hash found, using index-based cleanup`)
    await deleteMnemonic(index).catch(err => {
      console.error(`[Wallet Deletion] Error deleting mnemonic:`, err)
    })
  }
  
  // Remove wallet name from cache
  if (walletHash) {
    removeWalletName(walletHash)
  }
  
  // Actually remove from vault (not just mark as deleted)
  context.commit('removeVaultEntry', index)
  
  // Adjust current wallet index BEFORE switching wallets
  // This ensures indices are correct after the array shift
  if (!isDeletingCurrentWallet && index < currentWalletIndex) {
    const newIndex = currentWalletIndex - 1
    context.commit('updateWalletIndex', newIndex)
  }
  
  // If we're deleting the current wallet, switch to the first undeleted wallet
  if (isDeletingCurrentWallet) {
    const updatedVault = context.getters.getVault
    const undeletedWallets = []
    
    updatedVault.forEach((wallet, idx) => {
      if (wallet && wallet.deleted !== true) {
        undeletedWallets.push(idx)
      }
    })
    
    if (undeletedWallets.length > 0) {
      // Switch to the first undeleted wallet
      // This will call syncCurrentWalletToVault, which now has safety checks
      await context.dispatch('switchWallet', undeletedWallets[0]).catch(console.error)
    } else {
      // No wallets left - clear vault (caller should handle routing)
      context.commit('clearVault')
      context.commit('updateWalletIndex', -1)
    }
  }
}

/**
 * Ensure the current wallet index points to an undeleted wallet
 * If the current wallet is deleted, null, or invalid, switch to the first valid wallet
 * Returns a promise that resolves when the wallet switch is complete (if needed)
 */
/**
 * Helper to check if wallet has a valid wallet hash
 * Checks all possible locations where wallet hash might be stored
 */
function hasValidWalletHash(wallet) {
  if (!wallet) return false
  return !!(
    wallet.wallet?.bch?.walletHash ||
    wallet.wallet?.BCH?.walletHash ||
    wallet.BCH?.walletHash ||
    wallet.bch?.walletHash ||
    wallet.walletHash
  )
}

export async function ensureValidWalletIndex (context) {
  console.log('[ensureValidWalletIndex] ===== Starting wallet index validation =====')
  const vault = context.getters.getVault
  console.log('[ensureValidWalletIndex] Vault length:', vault?.length || 0)
  
  if (!vault || vault.length === 0) {
    console.log('[ensureValidWalletIndex] Vault is empty, returning early')
    return
  }

  const currentWalletIndex = context.getters.getWalletIndex
  console.log('[ensureValidWalletIndex] Current wallet index:', currentWalletIndex)
  
  // Skip validation if index is invalid (might be during wallet switching)
  if (currentWalletIndex < 0 || currentWalletIndex >= vault.length) {
    console.warn('[ensureValidWalletIndex] Current wallet index is out of bounds:', currentWalletIndex, 'vault length:', vault.length)
    return
  }
  
  const currentWallet = vault[currentWalletIndex]
  console.log('[ensureValidWalletIndex] Current wallet at index', currentWalletIndex, ':', currentWallet ? 'exists' : 'MISSING')
  
  if (currentWallet) {
    console.log('[ensureValidWalletIndex] Current wallet details:', {
      deleted: currentWallet.deleted,
      hasWallet: !!currentWallet.wallet,
      hasChipnet: !!currentWallet.chipnet,
      name: currentWallet.name,
      walletHash: currentWallet.wallet?.bch?.walletHash || currentWallet.wallet?.BCH?.walletHash || currentWallet.BCH?.walletHash || currentWallet.bch?.walletHash || currentWallet.walletHash || 'none'
    })
  }

  // Check if current wallet is valid (not null, not deleted, and has a walletHash)
  const isCurrentWalletValid = currentWallet && 
    currentWallet.deleted !== true && 
    hasValidWalletHash(currentWallet)
  
  console.log('[ensureValidWalletIndex] Is current wallet valid?', isCurrentWalletValid)

  if (!isCurrentWalletValid) {
    console.log('[ensureValidWalletIndex] Current wallet is invalid, searching for valid wallets...')
    // Find first valid (non-null, non-deleted, with walletHash) wallet
    const validWallets = []
    vault.forEach((wallet, index) => {
      const isValid = wallet && 
          wallet.deleted !== true && 
          hasValidWalletHash(wallet)
      if (isValid) {
        validWallets.push(index)
        console.log('[ensureValidWalletIndex] Found valid wallet at index:', index, {
          name: wallet.name,
          walletHash: wallet.wallet?.bch?.walletHash || wallet.wallet?.BCH?.walletHash || wallet.BCH?.walletHash || wallet.bch?.walletHash || wallet.walletHash || 'none'
        })
      } else {
        console.log('[ensureValidWalletIndex] Wallet at index', index, 'is invalid:', {
          exists: !!wallet,
          deleted: wallet?.deleted,
          hasWalletHash: hasValidWalletHash(wallet)
        })
      }
    })

    console.log('[ensureValidWalletIndex] Found', validWallets.length, 'valid wallets:', validWallets)

    if (validWallets.length > 0) {
      // Switch to the first valid wallet
      const firstValidIndex = validWallets[0]
      console.log('[ensureValidWalletIndex] Switching to first valid wallet at index:', firstValidIndex)
      // Only switch if it's different from current index to avoid unnecessary reloads
      if (firstValidIndex !== currentWalletIndex) {
        // Update wallet index IMMEDIATELY (synchronously) before async switchWallet
        // This ensures the router guard sees the correct index
        context.commit('updateWalletIndex', firstValidIndex)
        context.commit('updateCurrentWallet', firstValidIndex)
        console.log('[ensureValidWalletIndex] Updated wallet index to:', firstValidIndex, '(synchronously)')
        
        // Then perform the full switch asynchronously (for state initialization, etc.)
        context.dispatch('switchWallet', firstValidIndex).catch((err) => {
          console.error('[ensureValidWalletIndex] Error switching to valid wallet:', err)
        })
        console.log('[ensureValidWalletIndex] Initiated async switch to wallet at index:', firstValidIndex)
      } else {
        console.log('[ensureValidWalletIndex] First valid wallet is already the current wallet, no switch needed')
      }
    } else {
      // No valid wallets left - log for debugging before clearing
      console.warn('[ensureValidWalletIndex] No valid wallets found in vault. Vault length:', vault.length)
      console.warn('[ensureValidWalletIndex] Vault contents:', vault.map((w, i) => ({
        index: i,
        deleted: w?.deleted,
        hasWallet: !!w?.wallet,
        walletHash: w?.wallet?.bch?.walletHash || w?.wallet?.BCH?.walletHash || w?.BCH?.walletHash || w?.bch?.walletHash || w?.walletHash || 'none'
      })))
      // Clear vault only if truly no valid wallets
      console.warn('[ensureValidWalletIndex] Clearing vault - no valid wallets found')
      context.commit('clearVault')
    }
  } else {
    console.log('[ensureValidWalletIndex] Current wallet is valid, no action needed')
  }
  
  console.log('[ensureValidWalletIndex] ===== Validation complete =====')
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
      
      // Perform complete cleanup for deleted/null wallets
      const walletHash = wallet?.wallet?.bch?.walletHash
      if (walletHash) {
        // Try to get mnemonic for complete cleanup (including PIN)
        let mnemonic = null
        try {
          mnemonic = await getMnemonicByHash(walletHash).catch(() => null)
        } catch (err) {
          // Couldn't get mnemonic, continue with cleanup without it
        }
        
        // Perform complete cleanup
        await deleteAllWalletData(walletHash, mnemonic, i).catch(err => {
          console.error(`[Wallet Cleanup] Error cleaning up wallet at index ${i}:`, err)
        })
      } else {
        // Fall back to index-based deletion if no wallet hash
        await deleteMnemonic(i).catch(console.error)
      }
      continue
    }
    
    // Check if mnemonic exists for this wallet
    // Check migration status first
    let migrationCompleted = false
    try {
      const migrationFlag = await SecureStoragePlugin.get({ key: 'mnemonic_migration_completed' })
      migrationCompleted = migrationFlag?.value === 'true'
    } catch (err) {
      // Flag doesn't exist, migration not completed
    }
    
    const walletHash = wallet?.wallet?.bch?.walletHash
    let mnemonic = null
    
    if (migrationCompleted) {
      // Migration completed - only use new scheme with wallet hash
      if (walletHash) {
        mnemonic = await getMnemonicByHash(walletHash).catch(() => null)
      }
      // If no wallet hash, cannot retrieve mnemonic (old scheme ignored)
    } else {
      // Migration not completed - use backward compatible logic
      if (walletHash) {
        // Check using wallet hash (new scheme) first
        mnemonic = await getMnemonicByHash(walletHash).catch(() => null)
      }
      
      // Fall back to index-based check if wallet hash check failed or doesn't exist
      if (!mnemonic) {
        mnemonic = await getMnemonic(i).catch(() => null)
      }
    }
    
    if (!mnemonic) {
      // No mnemonic exists - this is an orphaned vault entry, remove it
      indicesToRemove.push(i)
      
      // If this is the current wallet, mark it for removal
      if (i === currentWalletIndex) {
        currentWalletRemoved = true
      }
      
      // Perform cleanup for orphaned entry (we don't have mnemonic, so can't delete PIN)
      if (walletHash) {
        // Clean up what we can without mnemonic
        await deleteAllWalletData(walletHash, null, i).catch(err => {
          console.error(`[Wallet Cleanup] Error cleaning up orphaned wallet at index ${i}:`, err)
        })
      } else {
        // Fall back to index-based deletion if no wallet hash
        await deleteMnemonic(i).catch(console.error)
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
 * Performs complete cleanup of deleted duplicates (removes all traces)
 */
export async function cleanupDuplicateWallets (context) {
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

  // Delete duplicates with full cleanup (in reverse order to maintain indices)
  // We need to process them in reverse order and handle index adjustments
  const sortedIndices = indicesToDelete.sort((a, b) => b - a)
  
  for (const index of sortedIndices) {
    const wallet = vault[index]
    const walletHash = wallet?.wallet?.bch?.walletHash
    
    // Get mnemonic for complete cleanup
    let mnemonic = null
    if (walletHash) {
      try {
        mnemonic = await getMnemonicByHash(walletHash).catch(() => null)
      } catch (err) {
        // Couldn't get mnemonic, continue with cleanup without it
      }
    }
    
    // Perform complete cleanup
    if (walletHash) {
      await deleteAllWalletData(walletHash, mnemonic, index).catch(err => {
        console.error(`[Duplicate Cleanup] Error cleaning up duplicate wallet at index ${index}:`, err)
      })
    } else {
      await deleteMnemonic(index).catch(console.error)
    }
    
    // Remove from vault
    context.commit('removeVaultEntry', index)
  }
  
  // Adjust current wallet index if we removed entries before it
  if (sortedIndices.length > 0) {
    const removedBeforeCurrent = sortedIndices.filter(idx => idx < currentWalletIndex).length
    if (removedBeforeCurrent > 0) {
      const newIndex = currentWalletIndex - removedBeforeCurrent
      context.commit('updateWalletIndex', newIndex)
    }
  }
  
  // If we deleted the current wallet, switch to the kept duplicate
  if (currentWalletDeleted && walletToSwitchTo !== null) {
    // Adjust walletToSwitchTo if entries were removed before it
    const adjustedIndex = sortedIndices.reduce((idx, deletedIdx) => {
      return deletedIdx < idx ? idx - 1 : idx
    }, walletToSwitchTo)
    context.dispatch('switchWallet', adjustedIndex).catch(console.error)
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
