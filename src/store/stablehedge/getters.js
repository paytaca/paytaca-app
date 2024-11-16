/** @typedef {ReturnType<import("./state").default>} State */

/** ------------ <Balance ------------ */
/**
 * @param {State} state 
 */
export function tokenBalances(state, getters, rootState, rootGetters) {
  const chipnet = rootGetters['global/isChipnet']
  const walletIndex = rootGetters['global/getWalletIndex']
  const walletData = rootGetters['global/getWallet']('bch')

  const balance = state.balances[walletIndex]
  if(!balance) return []
  if(balance.walletHash !== walletData?.walletHash) return []

  return chipnet ? balance.chipnet : balance.mainnet
}

/**
 * @param {State} state 
 */
export function token(state) {
  return (category) => state.fiatTokens.find(data => data?.category === category)
}

export function minTokenBalanceTimestamp(state, getters) {
  const tokenBalances = getters.tokenBalances

  if (!tokenBalances?.length) return null

  let minTimestamp = Infinity
  for(var index = 0; index < tokenBalances?.length; index++) {
    const tokenBalance = tokenBalances[index];

    const token = getters.token?.(tokenBalance?.category);
    const timestamp = token?.timestamp;
    if (Number.isNaN(timestamp)) return 0;

    if (timestamp < minTimestamp) minTimestamp = timestamp
  }

  return minTimestamp
}

export function tokenBalancesWithSats(state, getters) {
  const tokenBalances = getters.tokenBalances

  if (!Array.isArray(tokenBalances)) return []

  return tokenBalances.map(tokenBalance => {
    const token = getters.token?.(tokenBalance?.category)
    const decimals = parseInt(token?.decimals) || 0
    const price = token?.price / 10 ** decimals
    const timestamp = token?.timestamp
    let bch = null
    if (Number.isNaN(price)) {
      console.warn(`Stablehedge fiat token '${tokenBalance?.category}' has no price`)
    } else {
      bch = Math.floor(tokenBalance?.amount / price)
    }
    return {
      ...tokenBalance,
      satoshis: bch * 10 ** 8,
      bch: bch,
      price: price,
      timestamp: timestamp,
    }
  })
}

/**
 * @param {State} state 
 * @param {Object} getters 
 */
export function totalTokenBalancesInSats(state, getters) {
  const tokenBalancesWithSats = getters.tokenBalancesWithSats

  if (!Array.isArray(tokenBalancesWithSats)) return null
  return tokenBalancesWithSats
    .map(tokenBalance => tokenBalance?.satoshis)
    .filter(Boolean)
    .reduce((subtotal, value) => value + subtotal, 0)
}

/** ------------ Balance> ------------ */
