export function getWalletDraft (state) {
  return state.walletDraft
}

export function getWallet (state, { address }) {
  const wallet = state.wallets.filter((wallet) => {
    return wallet.address === address
  })
  return wallet
}
