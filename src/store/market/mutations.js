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
 * Set selected currency without strict validation (for fallback cases)
 * This mutation allows setting a currency even if it's not in currencyOptions
 * @param {Object} state vuex module state
 * @param {{symbol: String, name: String}} currency
 */
export function setSelectedCurrency (state, currency) {
  if (!currency || typeof currency !== 'object') return
  state.selectedCurrency = currency
}

/**
 *
 * @param {Object} state vuex module state
 * @param {{ assetPrices: Array, isFullUpdate?: Boolean } | Array} payload - Either an array of asset prices (backwards compatible) or an object with assetPrices and optional isFullUpdate flag
 */
export function updateAssetPrices (state, payload) {
  // Handle backwards compatibility: if payload is an array, treat it as assetPrices
  const assetPrices = Array.isArray(payload) ? payload : payload?.assetPrices
  const isFullUpdate = Array.isArray(payload) ? false : (payload?.isFullUpdate ?? false)
  
  if (!Array.isArray(assetPrices)) return

  // For full updates, remove assets not in the new update to prevent stale data
  if (isFullUpdate && assetPrices.length > 0) {
    const updatedAssetIds = new Set(assetPrices.map(ap => ap?.assetId).filter(Boolean))
    state.assetPrices = state.assetPrices.filter(ap => updatedAssetIds.has(ap?.assetId))
  }

  assetPrices.forEach(assetPrice => {
    if (!assetPrice?.assetId) return
    
    let updated = false
    for (var i = 0; i < state.assetPrices.length; i++) {
      if (state.assetPrices[i].assetId === assetPrice.assetId) {
        updated = true
        // Merge prices if they exist to allow incremental updates
        if (assetPrice.prices && Object.keys(assetPrice.prices).length > 0) {
          // Ensure we have a prices object to merge into
          if (!state.assetPrices[i].prices) {
            state.assetPrices[i].prices = {}
          }
          // Merge prices - this creates a new object to ensure Vue reactivity
          const mergedPrices = {
            ...state.assetPrices[i].prices,
            ...assetPrice.prices
          }
          // Replace the entire entry to ensure reactivity is triggered
          state.assetPrices[i] = {
            ...state.assetPrices[i],
            prices: mergedPrices
          }
        } else if (assetPrice.prices) {
          // If new prices object exists but is empty, still update to ensure consistency
          state.assetPrices[i] = assetPrice
        }
        break
      }
    }
    if (!updated && assetPrice.prices && Object.keys(assetPrice.prices).length > 0) {
      state.assetPrices.push(assetPrice)
    }
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

