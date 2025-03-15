export function getWallet (state, { address }) {
  const wallet = state.wallets.filter((wallet) => {
    return wallet.address === address
  })
  return wallet
}

export function getWallets (state) {
  return state.wallets
}
