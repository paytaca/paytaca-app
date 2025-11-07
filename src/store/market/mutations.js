/**
 * @param {Object} state vuex module state
 * @param {{ id: String, name: String, symbol: String, platforms: Object }[]} coinsList
 * @see {@link https://www.coingecko.com/en/api/documentation}
 */
export function updateCoinsList (state, coinsList) {
  if (!Array.isArray(coinsList)) return
  state.coinsList = coinsList
}

/**
 *
 * @param {Object} state vuex model state
 * @param {{symbol: String, name: String}[]} currencyOptions
 */
export function updateCurrencyOptions (state, currencyOptions) {
  if (!Array.isArray(currencyOptions) || !currencyOptions.length) return
  state.currencyOptions = currencyOptions
}

export function updateSelectedCurrency (state, currency) {
  if (!Array.isArray(state.currencyOptions) || state.currencyOptions.indexOf(currency) < 0) return

  state.selectedCurrency = currency
}

/**
 *
 * @param {Object} state vuex module state
 * @param {{ assetId: String, prices: Map<String, Number>, coinId: String }[]} assetPrices
 */
export function updateAssetPrices (state, assetPrices) {
  if (!Array.isArray(assetPrices)) return

  assetPrices.forEach(assetPrice => {
    if (!assetPrice?.assetId) return
    
    let updated = false
    for (var i = 0; i < state.assetPrices.length; i++) {
      if (state.assetPrices[i].assetId === assetPrice.assetId) {
        updated = true
        // Merge prices if they exist to allow incremental updates
        if (assetPrice.prices && state.assetPrices[i].prices) {
          state.assetPrices[i].prices = {
            ...state.assetPrices[i].prices,
            ...assetPrice.prices
          }
        } else {
          state.assetPrices[i] = assetPrice
        }
      }
    }
    if (!updated) state.assetPrices.push(assetPrice)
  })
}

export function clearAssetPrices (state) {
  state.assetPrices = []
}

/**
 *
 * @param {Object} state vuex module state
 * @param {{ symbol:String, rate:Number, timestamp?:Number }[]} data
 */
export function updateUsdRates (state, data) {
  if (!Array.isArray(data)) return

  if (!state.usdRates) state.usdRates = {}
  data.forEach(rateInfo => {
    if (typeof rateInfo.symbol !== 'string') return
    state.usdRates[rateInfo.symbol] = rateInfo.rate
    state.usdRatesLastUpdate[rateInfo.symbol] = data?.timestamp || Date.now()
  })
}
