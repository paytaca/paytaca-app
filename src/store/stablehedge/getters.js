import { tokenToSatoshis } from "src/wallet/stablehedge/token-utils"

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

  const results = chipnet ? balance.chipnet : balance.mainnet
  if (!Array.isArray(results)) return []
  return results
}

export function tokenBalancesAsAssets(state, getters, rootState, rootGetters) {
  const assets = rootGetters['assets/getAssets']

  const tokenBalances = getters['tokenBalances']
  return tokenBalances.map(tokenBalance => {
    const assetId = `ct/${tokenBalance?.category}`
    const asset = assets?.find?.(asset => asset?.id === assetId)

    return {
      ...asset,
      id: assetId,
      logo: asset?.logo || 'assets/img/stablehedge/stablehedge-bch.svg',
      balance: tokenBalance?.amount,
      spendable: tokenBalance?.amount,
    }
  })
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
    const timestamp = token?.priceMessage?.messageTimestamp;
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
    const price = token?.priceMessage?.priceValue
    const timestamp = token?.timestamp
    let satoshis = null
    let bch = null
    if (Number.isFinite(price)) {
      const _satoshis = tokenToSatoshis(tokenBalance?.amount, price)
      bch = Number(_satoshis / BigInt(10 ** 8))
      satoshis = Number(_satoshis)
    } else {
      console.warn(`Stablehedge fiat token '${tokenBalance?.category}' has no price`)
    }
    return {
      ...tokenBalance,
      satoshis: satoshis,
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
