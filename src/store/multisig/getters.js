export function getWallet (state) {
  return ({ address }) => {
    const wallet = state.wallets.filter((wallet) => {
      return wallet.address === address
    })
    return wallet?.[0]
  }
}

export function getWallets (state) {
  return state.wallets
}
