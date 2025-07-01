import { deleteMnemonic, deletePin, getMnemonic } from './../../wallet'
import { deleteAuthToken as deleteP2PExchangeAuthToken } from 'src/exchange/auth'

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
    case 'sBCH':
      state.network = 'sBCH'
      break
    default:
      state.network = 'BCH'
  }
}

export function updateVault (state, details) {
  console.log('[updateVault] Updating vault with details:', details)
  
  // Simple approach: if vault is empty, create first entry, otherwise push new entry
  if (!state.vault || state.vault.length === 0) {
    state.vault = [details]
  } else {
    state.vault.push(details)
  }
  
  // Ensure the entry has a name
  const targetIndex = state.vault.length - 1
  if (state.vault[targetIndex] && !state.vault[targetIndex].name) {
    state.vault[targetIndex].name = ''
  }
}

export function clearVault (state) {
  console.log('[clearVault] Clearing vault')
  state.vault = []
}

export function updateWalletIndex (state, index) {
  state.walletIndex = index
}

export function updateWalletName (state, details) {
  state.vault[details.index].name = details.name
}

export function updateWalletSnapshot (state, details) {
  console.log('[updateWalletSnapshot] Updating wallet snapshot for index:', details.index)
  
  let wallet = details.walletSnapshot
  wallet = JSON.stringify(wallet)
  wallet = JSON.parse(wallet)

  let chipnet = details.chipnetSnapshot
  chipnet = JSON.stringify(chipnet)
  chipnet = JSON.parse(chipnet)

  state.vault[details.index].wallet = wallet
  state.vault[details.index].chipnet = chipnet
  state.vault[details.index].name = details.name
}

export function updateCurrentWallet (state, index) {
  console.log('[updateCurrentWallet] Updating current wallet for index:', index)
  
  // Safety check: ensure vault exists and index is valid
  if (!state.vault || !Array.isArray(state.vault)) {
    console.error('[updateCurrentWallet] Vault is not initialized or not an array')
    return
  }
  
  const vault = state.vault[index]
  
  if (!vault) {
    console.error('[updateCurrentWallet] No vault found at index', index, 'Available indices:', state.vault.map((v, i) => v ? i : null).filter(i => i !== null))
    return
  }

  // Special check for index 1
  if (index === 1) {
    console.log('[updateCurrentWallet] DEBUG: Processing wallet index 1')
    console.log('[updateCurrentWallet] DEBUG: Vault entry structure:', Object.keys(vault))
    console.log('[updateCurrentWallet] DEBUG: Has wallet:', !!vault.wallet)
    console.log('[updateCurrentWallet] DEBUG: Has chipnet:', !!vault.chipnet)
  }

  if (!vault.wallet || !vault.chipnet) {
    console.error('[updateCurrentWallet] Invalid vault structure at index', index, vault)
    return
  }

  let wallet = vault.wallet
  wallet = JSON.stringify(wallet)
  wallet = JSON.parse(wallet)

  state.wallets = wallet

  let chipnet = vault.chipnet
  chipnet = JSON.stringify(chipnet)
  chipnet = JSON.parse(chipnet)

  state.chipnet__wallets = chipnet
  
  console.log('[updateCurrentWallet] Successfully updated current wallet. New state.wallets:', state.wallets)
  console.log('[updateCurrentWallet] New state.chipnet__wallets:', state.chipnet__wallets)
}

export function deleteWallet (state, index) {
  // Mark wallet as deleted
  state.vault[index].deleted = true
  
  // Note: deletePin and deleteMnemonic should be handled in actions, not mutations
  // These async operations will be handled by the calling action
}

export function toggleIsChipnet (state) {
  state.isChipnet = !state.isChipnet
  deleteP2PExchangeAuthToken()
}

export function toggleAutoGenerateAddress (state) {
  state.autoGenerateAddress = !state.autoGenerateAddress
}

export function showTokens (state) {
  state.showTokens = !state.showTokens
}

export function enableStablhedge(state, value) {
  value = value === undefined ? !state.enableStablhedge : Boolean(value)
  state.enableStablhedge = value
}

export function enableSmartBCH (state) {
  state.enableSmartBCH = !state.enableSmartBCH
}

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
}

export function setCountry (state, data) {
  state.country.name = data.country.name
  state.country.code = data.country.code
  state.theme = data.country.code === 'HK' ? 'payhero' : 'default'
  state.denomination = !['BCH', 'mBCH', 'Satoshis'].includes(data.denomination) ? 'BCH' : data.denomination
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
}

export function setTheme (state, theme) {
  state.theme = theme
}

export function setWalletLastAddressAndIndex(state, lastAddressAndIndex) {
  if (state.isChipnet) {
    state.chipnet__wallets.bch.lastAddressAndIndex = lastAddressAndIndex
  } else {
    state.wallets.bch.lastAddressAndIndex = lastAddressAndIndex
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

export function updateVaultFromHydration (state, vault) {
  console.log('[updateVaultFromHydration] Restoring vault data from hydration:', vault)
  state.vault = vault
}


