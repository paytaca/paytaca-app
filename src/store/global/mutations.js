export function setTestnet(state, value) {
  state.testnet = Boolean(value)
}

export function setNetwork(state, network) {
  switch(network) {
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

export function updateWallet (state, details) {
  state.wallets[details.type].walletHash = details.walletHash
  state.wallets[details.type].derivationPath = details.derivationPath
  state.wallets[details.type].lastAddress = details.lastAddress
  state.wallets[details.type].lastChangeAddress = details.lastChangeAddress
  state.wallets[details.type].lastAddressIndex = details.lastAddressIndex
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
