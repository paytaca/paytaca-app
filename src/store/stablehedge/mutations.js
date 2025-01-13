/** @typedef {ReturnType<import("./state").default>} State */

export function reset(state) {
  console.log('RESETTING DATA')
  const stateModule = require('./state')
  Object.assign(state, stateModule.default())
}

/**
 * @param {State} state 
 * @param {Object} data 
 * @param {Object} data.walletHash
 * @param {Boolean} data.chipnet
 * @param {Number} data.walletIndex
 * @param {Object[]} data.balances
 */
export function saveFiatTokenBalances(state, data) {
  if (!Array.isArray(state.balances)) state.balances = []
  const index = parseInt(data.walletIndex)

  if (!state.balances[index]) state.balances[index] = {}
  state.balances[index].walletHash = data.walletHash

  const network = data?.chipnet ? 'chipnet' : 'mainnet'
  state.balances[index][network] = data.balances.map(balance => {
    const parsedBalance = {
      ...balance,
      category: balance?.category,
      currency: balance?.currency,
      amount: parseFloat(balance?.total_amount),
    }

    delete parsedBalance.total_amount

    return parsedBalance
  })
}


/**
 * @param {State} state
 * @param {ReturnType<import("src/wallet/stablehedge/token-utils").parseTokenData>} data
 */
export function saveTokenData(state, data) {
  const index = state.fiatTokens.findIndex(tokenPrice => tokenPrice.category === data?.category)
  if (index >= 0) Object.assign(state.fiatTokens[index], data)
  else state.fiatTokens.push(data)
}

/**
 * @param {State} state
 * @param {ReturnType<import("src/wallet/stablehedge/token-utils").parseTokenData>} data
 */
export function saveTokenPrice(state, data) {
  const index = state.fiatTokens.findIndex(tokenPrice => tokenPrice.category === data?.category)
  if (index >= 0) Object.assign(state.fiatTokens[index], data)
  else state.fiatTokens.push(data)
}
