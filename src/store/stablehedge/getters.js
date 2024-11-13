/** @typedef {ReturnType<import("./state").default>} State */

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
export function tokenPrice(state) {
  return (category) => state.fiatTokens.find(data => data?.category === category)?.price
}

/**
 * @param {State} state 
 * @param {Object} getters 
 */
export function totalTokenBalancesInSats(state, getters) {
  const tokenBalances = getters.tokenBalances

  if (!Array.isArray(tokenBalances)) return null

  const satsValues = tokenBalances.map(tokenBalance => {
    const price = getters.tokenPrice?.(tokenBalance?.category)
    if (Number.isNaN(price)) {
      console.warn(`Stablehedge fiat token '${tokenBalance?.category}' has no price`)
      return 0
    }
    const satoshis = tokenBalance?.amount / price
    return satoshis
  })

  return satsValues.reduce((subtotal, value) => value + subtotal, 0)
}
