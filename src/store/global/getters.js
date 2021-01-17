export function assets (state) {
  return state.assets
}

export function balances (state) {
  const account = state.isPrivateMode ? 'private' : 'escrow'
  return state.accounts[account].balances
}

export function transactions (state) {
  const account = state.isPrivateMode ? 'private' : 'escrow'
  return state.accounts[account].transactions
}

export function isPrivateMode (state) {
  return state.user.privateMode
}

export const getWIF = (state) => (address) => {
  return state.vault.privateKeys[address]
}
