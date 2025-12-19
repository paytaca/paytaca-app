import { deleteMnemonic, deleteMnemonicByHash } from './../../wallet'
import { deleteAuthToken as deleteP2PExchangeAuthToken } from 'src/exchange/auth'
import { removeWalletName } from 'src/utils/wallet-name-cache'

/**
 * Get default wallet settings
 */
function getDefaultWalletSettings() {
  return {
    isChipnet: false,
    autoGenerateAddress: true,
    enableStablhedge: false,
    enableSLP: false,
    denomination: 'BCH',
    theme: 'glassmorphic-blue',
    language: 'en-us',
    country: {
      name: 'United States',
      code: 'US'
    },
    darkMode: true,
    currency: { name: 'United States Dollar', symbol: 'USD' },
    preferredSecurity: 'pin' // 'pin' or 'biometric'
  }
}

export function setWalletsRecovered (state, value) {
  state.walletsRecovered = Boolean(value)
}

export function setWalletRecoveryMessage(state, value) {
  state.walletRecoveryMessage = value
}

export function updateAppControl (state, data) {
  state.appControl = data
}

export function updateMerchantActivity (state, data) {
  state.merchantActivity.active = data.active
  state.merchantActivity.verified = data.verified
}

function getWalletData (state, details) {
  const isChipnet = details.isChipnet === undefined ? state.isChipnet : details.isChipnet
  const walletType = details.type
  const hasTestnetWallets = ['bch', 'slp']

  if (hasTestnetWallets.includes(walletType)) {
    if (isChipnet) {
      return state.chipnet__wallets[walletType]
    }
  }
  return state.wallets[walletType]
}

export function setNetwork (state, network) {
  switch (network) {
    case 'BCH':
      state.network = 'BCH'
      break
    default:
      state.network = 'BCH'
  }
}

export function updateVault (state, details) {
  // Extract walletHash with better error handling
  const newWalletHash = details?.wallet?.bch?.walletHash
  
  let targetIndex = -1 // Track which index was actually modified
  
  // Simple approach: if vault is empty, create first entry, otherwise push new entry
  if (!state.vault || state.vault.length === 0) {
    state.vault = [details]
    targetIndex = 0 // First entry is at index 0
  } else {
    // Check for duplicate walletHash - only match when both are non-null and equal
    // This prevents new wallets from replacing incomplete entries (null walletHash)
    const normalizedNew = newWalletHash ? String(newWalletHash).trim() : null
    const existingIndex = state.vault.findIndex((v, idx) => {
      if (!v || v.deleted) return false
      const existingHash = v?.wallet?.bch?.walletHash
      const normalizedExisting = existingHash ? String(existingHash).trim() : null
      return normalizedExisting !== null && normalizedNew !== null && normalizedExisting === normalizedNew
    })
    
    if (existingIndex !== -1) {
      // Update existing entry, but preserve settings if they exist
      const existingSettings = state.vault[existingIndex].settings
      const existingName = state.vault[existingIndex].name
      const existingDeleted = state.vault[existingIndex].deleted
      
      // Merge details while preserving important fields
      state.vault[existingIndex] = {
        ...details,
        settings: existingSettings && Object.keys(existingSettings).length > 0 ? existingSettings : details.settings,
        name: existingName || details.name || '',
        deleted: existingDeleted || false
      }
      targetIndex = existingIndex // Track the index that was updated
    } else {
      // No matching walletHash found - create new entry
      state.vault.push(details)
      targetIndex = state.vault.length - 1 // New entry is at the end
    }
  }
  
  // Ensure the entry has a name and settings
  // Use the tracked targetIndex instead of always using the last entry
  // This applies to both empty vault (targetIndex = 0) and non-empty vault cases
  if (targetIndex !== -1 && state.vault[targetIndex]) {
    if (!state.vault[targetIndex].name) {
      state.vault[targetIndex].name = ''
    }
    // Initialize settings if not present
    if (!state.vault[targetIndex].settings) {
      state.vault[targetIndex].settings = getDefaultWalletSettings()
    }
  }
}

export function clearVault (state) {
  state.vault = []
}

/**
 * Remove a vault entry at the specified index
 * This actually removes it from the array (unlike deleteWallet which just marks it as deleted)
 * @param {Object} state
 * @param {number} index - Index of the vault entry to remove
 */
export function removeVaultEntry (state, index) {
  if (index >= 0 && index < state.vault.length) {
    state.vault.splice(index, 1)
  }
}

/**
 * Reorder vault entries by moving an item from one index to another
 * @param {Object} state - Global state
 * @param {Object} payload - Reorder payload
 * @param {number} payload.fromIndex - Source index in vault array
 * @param {number} payload.toIndex - Destination index in vault array
 */
export function reorderVault (state, { fromIndex, toIndex }) {
  if (fromIndex === toIndex) {
    return // No change needed
  }

  if (fromIndex < 0 || fromIndex >= state.vault.length || toIndex < 0 || toIndex >= state.vault.length) {
    console.warn('[reorderVault] Invalid indices:', { fromIndex, toIndex, vaultLength: state.vault.length })
    return
  }

  // Get the wallet being moved
  const walletToMove = state.vault[fromIndex]
  
  // Remove from original position
  state.vault.splice(fromIndex, 1)
  
  // Insert at new position
  state.vault.splice(toIndex, 0, walletToMove)

  // Update walletIndex if the currently active wallet was moved
  const currentWalletIndex = state.walletIndex
  if (currentWalletIndex === fromIndex) {
    // The active wallet was moved, update walletIndex to its new position
    state.walletIndex = toIndex
  } else if (currentWalletIndex > fromIndex && currentWalletIndex <= toIndex) {
    // A wallet before the active one was moved forward, shift walletIndex back
    state.walletIndex = currentWalletIndex - 1
  } else if (currentWalletIndex < fromIndex && currentWalletIndex >= toIndex) {
    // A wallet after the active one was moved backward, shift walletIndex forward
    state.walletIndex = currentWalletIndex + 1
  }
}

export function updateWalletIndex (state, index) {
  state.walletIndex = index
  // Note: Settings sync to modules is handled by syncSettingsToModules action
  // which should be called after updateCurrentWallet
}

export function updateWalletName (state, details) {
  state.vault[details.index].name = details.name
}

export function updateWalletSnapshot (state, details) {
  let wallet = details.walletSnapshot
  wallet = JSON.stringify(wallet)
  wallet = JSON.parse(wallet)

  let chipnet = details.chipnetSnapshot
  chipnet = JSON.stringify(chipnet)
  chipnet = JSON.parse(chipnet)

  if (!state.vault[details.index]) state.vault[details.index] = {}
  state.vault[details.index].wallet = wallet
  state.vault[details.index].chipnet = chipnet
  state.vault[details.index].name = details.name
  state.vault[details.index].deleted = details.deleted
  // Preserve existing settings or initialize if missing
  if (!state.vault[details.index].settings) {
    state.vault[details.index].settings = getDefaultWalletSettings()
  }
}

export function updateCurrentWallet (state, index) {
  const vault = state.vault[index]

  // Safety check: ensure vault entry exists and has wallet/chipnet properties
  if (!vault) {
    console.warn(`updateCurrentWallet: Vault entry at index ${index} does not exist`)
    return
  }

  if (!vault.wallet) {
    console.warn(`updateCurrentWallet: Vault entry at index ${index} does not have wallet property`)
    // Initialize empty wallet structure if missing
    state.wallets = {}
    state.chipnet__wallets = {}
    return
  }

  let wallet = vault.wallet
  wallet = JSON.stringify(wallet)
  wallet = JSON.parse(wallet)

  state.wallets = wallet

  let chipnet = vault.chipnet
  if (chipnet) {
    chipnet = JSON.stringify(chipnet)
    chipnet = JSON.parse(chipnet)
    state.chipnet__wallets = chipnet
  } else {
    // Initialize empty chipnet if missing
    state.chipnet__wallets = {}
  }

  // Load wallet-specific settings and apply to global state
  if (vault.settings) {
    state.isChipnet = vault.settings.isChipnet !== undefined ? vault.settings.isChipnet : state.isChipnet
    state.autoGenerateAddress = vault.settings.autoGenerateAddress !== undefined ? vault.settings.autoGenerateAddress : state.autoGenerateAddress
    state.enableStablhedge = vault.settings.enableStablhedge !== undefined ? vault.settings.enableStablhedge : state.enableStablhedge
    state.enableSLP = vault.settings.enableSLP !== undefined ? vault.settings.enableSLP : state.enableSLP
    state.denomination = vault.settings.denomination || state.denomination
    state.theme = vault.settings.theme || state.theme
    state.language = vault.settings.language || state.language
    if (vault.settings.country) {
      state.country = vault.settings.country
    }
    // Note: darkMode and currency are loaded via getters that check vault
  } else {
    // Initialize settings if missing
    vault.settings = getDefaultWalletSettings()
    // Apply defaults to global state
    const defaults = getDefaultWalletSettings()
    state.isChipnet = defaults.isChipnet
    state.autoGenerateAddress = defaults.autoGenerateAddress
    state.enableStablhedge = defaults.enableStablhedge
    state.enableSLP = defaults.enableSLP
    state.denomination = defaults.denomination
    state.theme = defaults.theme
    state.language = defaults.language
    state.country = defaults.country
  }
}

/**
 * Save a setting value to the current wallet's vault settings
 */
export function saveWalletSetting (state, { key, value }) {
  if (state.vault && state.vault[state.walletIndex]) {
    if (!state.vault[state.walletIndex].settings) {
      state.vault[state.walletIndex].settings = getDefaultWalletSettings()
    }
    state.vault[state.walletIndex].settings[key] = value
  }
}

/**
 * Update all settings for a wallet at a specific index
 * Used during wallet creation to preserve settings set during onboarding
 */
export function updateWalletSettings (state, { index, settings }) {
  if (state.vault && state.vault[index]) {
    if (!state.vault[index].settings) {
      state.vault[index].settings = getDefaultWalletSettings()
    }
    // Merge provided settings into existing settings
    Object.assign(state.vault[index].settings, settings)
  }
}

/**
 * Set preferred security method for current wallet
 * @param {Object} state - Global state
 * @param {string} preferredSecurity - 'pin' or 'biometric'
 */
export function setPreferredSecurity (state, preferredSecurity) {
  if (state.vault && state.vault[state.walletIndex]) {
    if (!state.vault[state.walletIndex].settings) {
      state.vault[state.walletIndex].settings = getDefaultWalletSettings()
    }
    state.vault[state.walletIndex].settings.preferredSecurity = preferredSecurity
  }
}

/**
 * Migrate existing wallets to have wallet-specific settings
 * Initializes settings from current global state for wallets that don't have settings yet
 * @param {Object} state - Global state
 * @param {Object} payload - Migration payload with darkMode and currency from other modules
 * @param {boolean} payload.darkMode - Current darkMode value
 * @param {Object} payload.currency - Current currency value
 */
export function migrateWalletSettings (state, payload) {
  if (!state.vault || state.vault.length === 0) {
    return
  }

  const darkMode = payload?.darkMode !== undefined ? payload.darkMode : true
  const currency = payload?.currency || { name: 'United States Dollar', symbol: 'USD' }

  // Get current global state values to use as defaults for migration
  // For preferredSecurity, try to get from localStorage (backward compatibility)
  let preferredSecurity = 'pin'
  try {
    const storedPref = typeof window !== 'undefined' && window.localStorage 
      ? window.localStorage.getItem('preferredSecurity') 
      : null
    preferredSecurity = storedPref || 'pin'
  } catch (e) {
    // Fallback to default
  }

  const currentSettings = {
    isChipnet: state.isChipnet,
    autoGenerateAddress: state.autoGenerateAddress,
    enableStablhedge: state.enableStablhedge,
    enableSLP: state.enableSLP,
    denomination: state.denomination,
    theme: state.theme,
    language: state.language,
    country: state.country ? { ...state.country } : { name: 'United States', code: 'US' },
    darkMode: darkMode,
    currency: currency,
    preferredSecurity: preferredSecurity
  }

  // Migrate each wallet that doesn't have settings
  let migratedCount = 0
  state.vault.forEach((wallet, index) => {
    if (!wallet.settings && wallet.wallet) {
      // Only migrate if wallet exists (not deleted)
      if (!wallet.deleted) {
        wallet.settings = { ...currentSettings }
        migratedCount++
        console.log(`[Migration] Initialized settings for wallet at index ${index}`)
      }
    }
  })

  if (migratedCount > 0) {
    console.log(`[Migration] Migrated settings for ${migratedCount} wallet(s)`)
  }
}

/**
 * @deprecated This mutation is kept for backward compatibility but is no longer used.
 * Wallet deletion is now handled entirely in the deleteWallet action which performs
 * complete cleanup and removes the wallet from vault.
 * 
 * The action now:
 * 1. Retrieves wallet data (walletHash, mnemonic)
 * 2. Calls deleteAllWalletData() to remove all traces (mnemonic, PIN, auth tokens)
 * 3. Removes wallet name from cache
 * 4. Removes wallet from vault using removeVaultEntry()
 * 5. Handles wallet switching if needed
 */
export function deleteWallet (state, index) {
  // This mutation is deprecated - deletion is now handled in the action
  // Keeping for backward compatibility but it should not be called directly
  console.warn('[Wallet Deletion] deleteWallet mutation called directly - this should be handled by the action')
  
  // Mark wallet as deleted (legacy behavior)
  if (state.vault[index]) {
    state.vault[index].deleted = true
  }
}

export function toggleIsChipnet (state) {
  state.isChipnet = !state.isChipnet
  // Save to vault
  if (state.vault && state.vault[state.walletIndex]) {
    if (!state.vault[state.walletIndex].settings) {
      state.vault[state.walletIndex].settings = getDefaultWalletSettings()
    }
    state.vault[state.walletIndex].settings.isChipnet = state.isChipnet
  }
  deleteP2PExchangeAuthToken()
}

export function toggleAutoGenerateAddress (state) {
  state.autoGenerateAddress = !state.autoGenerateAddress
  // Save to vault
  if (state.vault && state.vault[state.walletIndex]) {
    if (!state.vault[state.walletIndex].settings) {
      state.vault[state.walletIndex].settings = getDefaultWalletSettings()
    }
    state.vault[state.walletIndex].settings.autoGenerateAddress = state.autoGenerateAddress
  }
}

export function enableStablhedge(state, value) {
  value = value === undefined ? !state.enableStablhedge : Boolean(value)
  state.enableStablhedge = value
  // Save to vault
  if (state.vault && state.vault[state.walletIndex]) {
    if (!state.vault[state.walletIndex].settings) {
      state.vault[state.walletIndex].settings = getDefaultWalletSettings()
    }
    state.vault[state.walletIndex].settings.enableStablhedge = value
  }
}

export function enableSLP (state) {  
  state.enableSLP = !state.enableSLP
  // Save to vault
  if (state.vault && state.vault[state.walletIndex]) {
    if (!state.vault[state.walletIndex].settings) {
      state.vault[state.walletIndex].settings = getDefaultWalletSettings()
    }
    state.vault[state.walletIndex].settings.enableSLP = state.enableSLP
  }
}

/**
 * Forcibly disable SmartBCH support (deprecated feature)
 * SmartBCH network is no longer supported in preparation for future deprecation
 */
export function disableSmartBCH (state) {
  state.enableSmartBCH = false
}

export function updateWallet (state, details) {
  const wallet = getWalletData(state, details)

  wallet.walletHash = details.walletHash
  wallet.derivationPath = details.derivationPath
  wallet.lastAddress = details.lastAddress
  wallet.lastChangeAddress = details.lastChangeAddress
  wallet.lastAddressIndex = details.lastAddressIndex
  wallet.connectedAddress = details.connectedAddress ?? wallet.connectedAddress
  wallet.connectedAddressIndex = details.connectedAddressIndex ?? wallet.connectedAddressIndex
  wallet.connectedSites = details.connectedSites ?? wallet.connectedSites
}

export function setLanguage (state, language) {
  state.language = language
  // Save to vault
  if (state.vault && state.vault[state.walletIndex]) {
    if (!state.vault[state.walletIndex].settings) {
      state.vault[state.walletIndex].settings = getDefaultWalletSettings()
    }
    state.vault[state.walletIndex].settings.language = language
  }
}

export function setCountry (state, data) {
  state.country.name = data.country.name
  state.country.code = data.country.code
  // Removed PayHero theme forcing for HK - use selected theme
  state.denomination = !['BCH', 'mBCH', 'Satoshis'].includes(data.denomination) ? 'BCH' : data.denomination
  // Save to vault
  if (state.vault && state.vault[state.walletIndex]) {
    if (!state.vault[state.walletIndex].settings) {
      state.vault[state.walletIndex].settings = getDefaultWalletSettings()
    }
    state.vault[state.walletIndex].settings.country = {
      name: data.country.name,
      code: data.country.code
    }
    state.vault[state.walletIndex].settings.denomination = state.denomination
  }
}

export function setConnectedAddress (state, details) {
  const wallet = getWalletData(state, details)

  wallet.connectedAddress = details.connectedAddress
  wallet.connectedAddressIndex = details.connectedAddressIndex
}

export function setConnectedSites (state, details) {
  const wallet = getWalletData(state, details)

  wallet.connectedSites = details.connectedSites
}

export function setWalletSubscribed (state, details) {
  state.wallets[details.type].subscribed = details.subscribed
}

export function updateXPubKey (state, details) {
  const wallet = getWalletData(state, details)
  wallet.xPubKey = details.xPubKey
}

export function updateAddresses (state, addresses) {
  state.accounts.escrow.address = addresses.escrow.address

  state.privateKeys[addresses.escrow.address] = addresses.escrow.privateKey

  state.accounts.private.address = addresses.private.address
  state.privateKeys[addresses.private.address] = addresses.private.privateKey
}

export function updatePrivateAddress (state, privateAddress) {
  state.accounts.private.address = privateAddress.address
  state.privateKeys[privateAddress.address] = privateAddress.privateKey
}

export function updatePublicAddress (state, escrow) {
  state.accounts.escrow.address = escrow.address
  state.privateKeys[escrow.address] = escrow.privateKey
}

export function updateOnboardingStep (state, status) {
  state.user.onboardingStep = status
}

export function setPrivateMode (state, privateMode) {
  state.privateMode = Boolean(privateMode)
}

export function updateTransactions (state, data) {
  state.accounts[data.accountType].transactions[''] = data.transactions
  state.accounts[data.accountType].balances[0].balance = data.balance
}

export function generateNewAddressSet (state, details) {
  const wallet = getWalletData(state, details)

  wallet.lastAddress = details.lastAddress
  wallet.lastChangeAddress = details.lastChangeAddress
  wallet.lastAddressIndex = details.lastAddressIndex
}

/**
 * @param {Object} state
 * @param {Object} data
 * @param {String} data.walletHash
 * @param {String} data.taskId
 * @param {String} data.status
 * @param {Number} data.completedAt
 * @param {Object} [data.queueInfo]
 * @param {Number} data.queueInfo.time_start
 * @note More data might be in `data.queueInfo`
 */
export function setUtxoScanTask(state, data) {
  if (!data?.walletHash || !data?.taskId) return
  const existingTaskInfo = state.utxoScanTasks[data.walletHash]
  let newTask = existingTaskInfo?.taskId !== data.taskId
  state.utxoScanTasks[data.walletHash] = {
    timestamp: newTask ? Date.now() : existingTaskInfo?.timestamp,
    lastUpdate: Date.now(),
    taskId: data.taskId,
    status: data.status,
    completedAt: data?.completedAt,
    queueInfo: data?.queueInfo?.[1],
  }
}

export function removeUtxoScanTask(state, walletHash='') {
  delete state.utxoScanTasks[walletHash]
}

export function updateConnectivityStatus (state, online) {
  state.online = online
}

export function setDenomination (state, denomination) {
  state.denomination = denomination
  // Save to vault
  if (state.vault && state.vault[state.walletIndex]) {
    if (!state.vault[state.walletIndex].settings) {
      state.vault[state.walletIndex].settings = getDefaultWalletSettings()
    }
    state.vault[state.walletIndex].settings.denomination = denomination
  }
}

export function setTheme (state, theme) {
  state.theme = theme
  // Save to vault
  if (state.vault && state.vault[state.walletIndex]) {
    if (!state.vault[state.walletIndex].settings) {
      state.vault[state.walletIndex].settings = getDefaultWalletSettings()
    }
    state.vault[state.walletIndex].settings.theme = theme
  }
}

export function setWalletLastAddressAndIndex(state, lastAddressAndIndex) {
  if (state.isChipnet) {
    state.chipnet__wallets.bch.lastAddressAndIndex = lastAddressAndIndex
    // Also update lastAddressIndex if address_index is provided
    if (lastAddressAndIndex && typeof lastAddressAndIndex.address_index === 'number') {
      state.chipnet__wallets.bch.lastAddressIndex = lastAddressAndIndex.address_index
      if (lastAddressAndIndex.address) {
        state.chipnet__wallets.bch.lastAddress = lastAddressAndIndex.address
      }
    }
  } else {
    state.wallets.bch.lastAddressAndIndex = lastAddressAndIndex
    // Also update lastAddressIndex if address_index is provided
    if (lastAddressAndIndex && typeof lastAddressAndIndex.address_index === 'number') {
      state.wallets.bch.lastAddressIndex = lastAddressAndIndex.address_index
      if (lastAddressAndIndex.address) {
        state.wallets.bch.lastAddress = lastAddressAndIndex.address
      }
    }
  }
}

export function setWalletAddresses(state, walletAddresses) {
  if (state.isChipnet) {
    state.chipnet__wallets.bch.walletAddresses = walletAddresses
  } else {
    state.wallets.bch.walletAddresses = walletAddresses
  }
}

export function setWalletConnectedApps(state, connectedApps) {
  if (state.isChipnet) {
    state.chipnet__wallets.bch.connectedApps = connectedApps
  } else {
    state.wallets.bch.connectedApps = connectedApps
  }
}

export function cacheCashtokenIdentity(state, { category, cashtokenIdentity }) {
  state.cache.cashtokenIdentities[category] = cashtokenIdentity
}


