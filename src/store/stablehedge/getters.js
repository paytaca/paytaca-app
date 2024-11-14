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

  console.log({ tokenBalances })
  if (!tokenBalances?.length) return null

  let minTimestamp = Infinity
  for(var index = 0; index < tokenBalances?.length; index++) {
    const tokenBalance = tokenBalances[index];

    const token = getters.token?.(tokenBalance?.category);
    const timestamp = token?.timestamp;
    console.log({ tokenBalance, token })
    if (Number.isNaN(timestamp)) return 0;

    if (timestamp < minTimestamp) minTimestamp = timestamp
  }

  return minTimestamp
}

/**
 * @param {State} state 
 * @param {Object} getters 
 */
export function totalTokenBalancesInSats(state, getters) {
  const tokenBalances = getters.tokenBalances

  if (!Array.isArray(tokenBalances)) return null

  const satsValues = tokenBalances.map(tokenBalance => {
    const token = getters.token?.(tokenBalance?.category)
    const price = token?.price
    if (Number.isNaN(price)) {
      console.warn(`Stablehedge fiat token '${tokenBalance?.category}' has no price`)
      return 0
    }
    const satoshis = tokenBalance?.amount / price
    return satoshis
  })

  return satsValues.reduce((subtotal, value) => value + subtotal, 0)
}

/** ------------ Balance> ------------ */
