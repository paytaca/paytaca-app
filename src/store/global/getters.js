export function getAddress (state) {
  return function (walletType) {
    return state.wallets[walletType].lastAddress
  }
}

export function getLastAddressIndex (state) {
  return function (walletType) {
    return state.wallets[walletType].lastAddressIndex
  }
}

export function getChangeAddress (state) {
  return function (walletType) {
    return state.wallets[walletType].lastChangeAddress
  }
}

export function getWallet (state) {
  return function (walletType) {
    return state.wallets[walletType]
  }
}
