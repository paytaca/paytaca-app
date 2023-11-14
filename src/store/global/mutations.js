import { deleteMnemonic } from './../../wallet'

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
  const len = state.vault.push(details)

  state.vault[len - 1].name = ''
}

export function clearVault (state) {
  state.vault = []
}

export function updateWalletIndex (state, index) {
  state.walletIndex = index
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

  state.vault[details.index].wallet = wallet
  state.vault[details.index].chipnet = chipnet
  state.vault[details.index].name = details.name
}

export function updateCurrentWallet (state, index) {
  const vault = state.vault[index]

  let wallet = vault.wallet
  wallet = JSON.stringify(wallet)
  wallet = JSON.parse(wallet)

  state.wallets = wallet

  let chipnet = vault.chipnet
  chipnet = JSON.stringify(chipnet)
  chipnet = JSON.parse(chipnet)

  state.chipnet__wallets = chipnet
}

export function deleteWallet (state, index) {
  // Mark wallet as deleted
  state.vault[index].deleted = true
  // Delete the mnemonic seed phrase for this wallet
  deleteMnemonic(index)
}

export function toggleIsChipnet (state) {
  state.isChipnet = !state.isChipnet
}

export function showTokens (state) {
  state.showTokens = !state.showTokens
}

export function enableSmartBCH (state) {
  state.enableSmartBCH = !state.enableSmartBCH
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
  wallet.purelypeerVaultSigner = details.purelypeerVaultSigner ?? wallet.purelypeerVaultSigner
}

export function setLanguage (state, language) {
  state.language = language
}

export function setCountry (state, country) {
  state.country.name = country.name
  state.country.code = country.code
  if (country.code === 'HK') {
    state.theme = 'payhero'
    state.denomination = 'DEEM'
  } else {
    state.theme = 'default'
    state.denomination = 'BCH'
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
}

export function setTheme (state, theme) {
  state.theme = theme
}
