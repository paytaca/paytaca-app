export function getSettings (state) {
  return state.settings
}

export function getWallet (state) {
  return ({ address }) => {
    const wallet = state.wallets.filter((wallet) => {
      return wallet.address === decodeURIComponent(address)
    })
    return wallet?.[0]
  }
}

export function getWallets (state) {
  return state.wallets
}

export function getTransactionsByAddress (state) {
  return ({ address }) => {
    return state.transactions.filter((t) => t.address === decodeURIComponent(address))
  }
}

export function getPsts (state) {
  return state.psts
}

export function getPstById (state) {
  return ({ id }) => {
    return state.psts.filter((i) => i.id === id)[0]
  }
}
