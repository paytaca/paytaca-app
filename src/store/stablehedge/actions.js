import { getStablehedgeBackend } from "src/wallet/stablehedge/api"

/** @typedef {ReturnType<import("./state").default>} State */
/**
 * @param {import("vuex").ActionContext<State, Getters>} context 
 */
export function updateTokenBalances(context) {
  const chipnet = context.rootGetters['global/isChipnet']
  const walletIndex = context.rootGetters['global/getWalletIndex']
  const walletData = context.rootGetters['global/getWallet']('bch')

  const backend = getStablehedgeBackend(chipnet)
  const params = { wallet_hash: walletData.walletHash }
  return backend.get(`stablehedge/redemption-contracts/get_fiat_token_balances/`, { params })
    .then(response => {
      const data = response?.data
      if (!Array.isArray(data)) return Promise.reject({ response })

      context.commit('saveFiatTokenBalances', {
        walletHash: params?.wallet_hash,
        walletIndex: walletIndex,
        chipnet: chipnet,
        balances: data,
      })

      return data
    })
}

/**
 * @param {import("vuex").ActionContext<State, Getters>} context 
 * @param {Object} opts
 * @param {Number} [opts.minAge] only update token prices have timestamps older than specified age
 */
export function updateTokenPrices(context, opts) {
  let categories = context.getters.tokenBalances?.map(balance => balance?.category)
  const chipnet = context.rootGetters['global/isChipnet']
  const backend = getStablehedgeBackend(chipnet)

  if (Number.isSafeInteger(opts?.minAge)) {
    const now = Date.now()
    categories = categories?.filter(category => {
      const token = context.state.fiatTokens.find(token => token?.category === category)
      const timestamp = token?.timestamp
      if (!Number.isNaN(timestamp)) return true
      return (now - timestamp) > opts?.minAge
    })
  }

  if (!categories?.length) return Promise.resolve()

  const params = {
    categories: categories.join(',')
  }
  return backend.get('stablehedge/fiat-tokens/latest_prices/', { params })
    .then(response => {
      const results = response?.data
      if (!Array.isArray(results)) return Promise.reject({ response })

      results.forEach(result => {
        context.commit('saveTokenPrice', {
          category: result?.category,
          price: result?.price,
          decimals: result?.decimals,
          currency: result?.currency,
          timestamp: new Date(result?.timestamp),
        })
      })

      return response
    })
}

/**
 * @param {import("vuex").ActionContext<State, Getters>} context 
 * @param {Object} opts
 * @param {Boolean} [opts.chipnet]
 * @param {String[]} opts.categories
 */
export function updateTokenData(context, opts) {
  const chipnet = typeof opts?.chipnet === 'boolean'
    ? opts?.chipnet
    : context.rootGetters['global/isChipnet']

  const backend = getStablehedgeBackend(chipnet)
  const params = {
    categories: opts?.categories?.join(',') || '',
  }
  return backend.get(`stablehedge/fiat-tokens/`, { params })
    .then(response => {
      let results = []
      if (Array.isArray(response?.data)) results = response?.data
      if (Array.isArray(response?.data?.results)) results = response?.data?.results

      results.forEach(result => {
        context.commit('saveTokenData', {
          category: result?.category,
          decimals: result?.decimals,
          currency: result?.currency,
        })
      })
    })
}
