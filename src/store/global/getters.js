export function address (state) {
  if (state.privateMode) {
    return state.user.privateAddress
  } else {
    return state.user.escrowAddress
  }
}

export function assets (state) {
  return state.assets
}

export function balances (state) {
  const account = state.isPrivateMode ? 'private' : 'escrow'
  return state.accounts[account].balances
}

export function isPrivateMode (state) {
  return state.user.privateMode
}

export const getWIF = (state) => (address) => {
  return state.vault.privateKeys[address]
}
