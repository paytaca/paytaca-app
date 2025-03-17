export function getWallet (state) {
  return ({ cashaddress }) => {
    const wallet = state.wallets.filter((wallet) => {
      return wallet.cashaddress === cashaddress
    })
    return wallet?.[0]
  }
}

export function getWallets (state) {
  return state.wallets
}
