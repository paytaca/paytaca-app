export function getAddress (state) {
  return function (walletType) {
    return state.vault.wallets[walletType].lastAddress
  }
}

export function isPrivateMode (state) {
  return state.privateMode
}

export const getWIF = (state) => (address) => {
  return state.vault.privateKeys[address]
}

export const getMnemonic = (state) => () => {
  return state.vault.mnemonic
}
