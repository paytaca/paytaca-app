export function address (state) {
  if (state.privateMode) {
    return state.user.privateAddress
  } else {
    return state.user.escrowAddress
  }
}

export function balance (state) {
  if (state.privateMode) {
    return state.user.privateBalance
  } else {
    return state.user.escrowBalance
  }
}

export function isPrivateMode (state) {
  return state.user.privateMode
}

export const getWIF = (state) => (address) => {
  return state.vault.privateKeys[address]
}
