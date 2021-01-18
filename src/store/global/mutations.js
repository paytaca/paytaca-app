export function updateMnemonic (state, encryptedMnemonic) {
  state.vault.mnemonic = encryptedMnemonic
}

export function updateAddresses (state, addresses) {
  state.accounts.escrow.address = addresses.escrow.address

  state.vault.privateKeys[addresses.escrow.address] = addresses.escrow.privateKey

  state.accounts.private.address = addresses.private.address
  state.vault.privateKeys[addresses.private.address] = addresses.private.privateKey
}

export function updatePrivateAddress (state, privateAddress) {
  state.accounts.private.address = privateAddress.address
  state.vault.privateKeys[privateAddress.address] = privateAddress.privateKey
}

export function updatePublicAddress (state, escrow) {
  state.accounts.escrow.address = escrow.address
  state.vault.privateKeys[escrow.address] = escrow.privateKey
}

export function updateOnboardingStep (state, status) {
  state.user.onboardingStep = status
}

export function updatePrivateBalance (state, balance) {
  state.user.privateBalance = balance
  // We store the last update, this is related to rate limiting for bch-js
  state.user.privateBalance.lastUpdate = Date.now()
}

export function updateEscrowBalance (state, balance) {
  state.user.escrowBalance = balance
  // We store the last update, this is related to rate limiting for bch-js
  state.user.escrowBalance.lastUpdate = Date.now()
}

export function setPrivateMode(state, privateMode) {
  state.privateMode = Boolean(privateMode)
}