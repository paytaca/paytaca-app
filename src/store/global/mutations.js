export function updateMnemonic (state, encryptedMnemonic) {
  state.vault.mnemonic = encryptedMnemonic
}

export function updateAddresses (state, addresses) {
  state.user.escrowAddress = addresses.escrow.address
  state.vault.privateKeys[addresses.escrow.address] = addresses.escrow.privateKey

  state.user.privateAddress = addresses.private.address
  state.vault.privateKeys[addresses.private.address] = addresses.private.privateKey
}

export function updateOnboardingStep (state, status) {
  state.user.onboardingStep = status
}

export function updatePrivateBalance (state, balance) {
  state.user.privateBalance = balance
}

export function updateEscrowBalance (state, balance) {
  state.user.escrowBalance = balance
}
