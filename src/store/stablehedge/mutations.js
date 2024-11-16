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
 * @param {Object} data
 * @param {String} data.category
 * @param {String} data.category
 * @param {Number} data.price
 * @param {Number} data.decimals
 * @param {Number | String | Date} data.timestamp
 * @param {{ category: String, price: Number, currency: String, timestamp: Number | String | Date }} data
 */
export function saveTokenPrice(state, data) {
  if (typeof data.timestamp === 'string') {
    data.timestamp = new Date(data.timestamp) * 1
  }
  if (data?.timestamp instanceof Date) {
    data.timestamp = data.timestamp * 1
  }

  if (Number.isNaN(data.timestamp)) data.timestamp = Date.now()
  const index = state.fiatTokens.find(tokenPrice => tokenPrice.category === data?.category)
  if (index >= 0) Object.assign(state.fiatTokens[index], data)
  else state.fiatTokens.push(data)
}
