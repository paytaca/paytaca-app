export function getAddress (state) {
  return function (walletType) {
    return state.wallets[walletType].lastAddress
  }
}

export function getWallet (state) {
  return function (walletType) {
    return state.wallets[walletType]
  }
}
