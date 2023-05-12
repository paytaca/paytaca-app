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
  let wallet = details.snapshot
  wallet = JSON.stringify(wallet)
  wallet = JSON.parse(wallet)

  state.vault[details.index] = wallet
  state.vault[details.index].name = details.name
}

export function updateCurrentWallet (state, index) {
  let wallet = state.vault[index]
  wallet = JSON.stringify(wallet)
  wallet = JSON.parse(wallet)

  state.wallets = wallet
}

export function updateWallet (state, details) {
  state.wallets[details.type].walletHash = details.walletHash
  state.wallets[details.type].derivationPath = details.derivationPath
  state.wallets[details.type].lastAddress = details.lastAddress
  state.wallets[details.type].lastChangeAddress = details.lastChangeAddress
  state.wallets[details.type].lastAddressIndex = details.lastAddressIndex
}

export function setWalletSubscribed (state, details) {
  state.wallets[details.type].subscribed = details.subscribed
}

export function updateXPubKey (state, details) {
  state.wallets[details.type].xPubKey = details.xPubKey
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
  state.wallets[details.type].lastAddress = details.lastAddress
  state.wallets[details.type].lastChangeAddress = details.lastChangeAddress
  state.wallets[details.type].lastAddressIndex = details.lastAddressIndex
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
