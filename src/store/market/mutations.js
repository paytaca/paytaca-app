/**
 * 
 * @param {Object} state vuex module state
 * @param {{ id: String, name: String, symbol: String, platforms: Object }[]} coinsList 
 * @see {@link https://www.coingecko.com/en/api/documentation}
 */
export function updateCoinsList(state, coinsList) {
  if (!Array.isArray(coinsList) || !coinsList.length) return

  state.coinsList = coinsList
}

/**
 * 
 * @param {Object} state vuex model state
 * @param {String[]} currencyOptions 
 */
 export function updateCurrencyOptions(state, currencyOptions) {
  if (!Array.isArray(currencyOptions) || !currencyOptions.length) return
  state.currencyOptions = currencyOptions
}

export function updateSelectedCurrency(state, currency) {
  if (!Array.isArray(state.currencyOptions) || state.currencyOptions.indexOf(currency) < 0) return

  state.selectedCurrency = currency
}

/**
 * 
 * @param {Object} state vuex module state
 * @param {{ assetId: String, prices: Map<String, Number>, coinId: String }[]} assetPrices 
 */
export function updateAssetPrices(state, assetPrices) {
  if (!Array.isArray(state.assetPrices)) state.assetPrices = []

  assetPrices.forEach(assetPrice => {
    let updated = false
    for (var i=0; i < state.assetPrices.length; i++) {
      if(state.assetPrices[i].assetId === assetPrice.assetId) {
        updated = true
        state.assetPrices[i] = assetPrice
      }
    }
    if (!updated) state.assetPrices.push(assetPrice)
  })
}

export function clearAssetPrices(state) {
  state.assetPrices = []
}
