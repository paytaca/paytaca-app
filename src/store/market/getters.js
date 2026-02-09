export function currencyOptions (state) {
  if (!Array.isArray(state.currencyOptions)) return []
  return state.currencyOptions
}

export function selectedCurrency (state, getters, rootState) {
  // Check if wallet-specific settings exist in vault
  if (rootState && rootState.global && rootState.global.vault && rootState.global.vault[rootState.global.walletIndex]) {
    const vaultSettings = rootState.global.vault[rootState.global.walletIndex].settings
    if (vaultSettings && vaultSettings.currency) {
      return vaultSettings.currency
    }
  }
  // Fallback to module state
  if (typeof state.selectedCurrency === 'object') {
    return state.selectedCurrency
  } else {
    return { name: 'United States Dollar', symbol: 'USD' }
  }
}

export function assetPrices (state) {
  if (!Array.isArray(state.assetPrices)) return []
  return state.assetPrices
}

export function isUpdatingPrices (state) {
  return Boolean(state.isUpdatingPrices)
}

export function lastCurrencySwitchAt (state) {
  return Number(state.lastCurrencySwitchAt) || 0
}

export function pendingCurrencySymbol (state) {
  return state.pendingCurrencySymbol ? String(state.pendingCurrencySymbol).toUpperCase() : null
}

export function assetPricesLastUpdate (state) {
  return state.assetPricesLastUpdate || {}
}

export function usdRatesLastUpdate (state) {
  return state.usdRatesLastUpdate || {}
}

export function getAssetPrice (state) {
  return (assetId, currencySymbol) => {
    const STALE_TTL_MS = 5 * 60 * 1000
    // 1. check if asset price for assetId exists
    if (!Array.isArray(state.assetPrices)) return null
    const assetPrice = state.assetPrices.find(assetPrice => assetPrice && assetPrice.assetId === assetId)
    if (!assetPrice || !assetPrice.prices) return null
    
    // Ensure prices object is not empty
    const priceKeys = Object.keys(assetPrice.prices)
    if (priceKeys.length === 0) return null

    // 2. check if resolved asset price has the currency it is looking for
    const parsedCurrencySymbol = String(currencySymbol).toLowerCase()
    if (assetPrice.prices[parsedCurrencySymbol]) {
      return assetPrice.prices[parsedCurrencySymbol]
    }

    // 3. step 2 has none, check if has usd rates & calculate
    const fxKey = parsedCurrencySymbol.toUpperCase()
    if (!state.usdRates || !state.usdRates[fxKey]) return null
    if (!assetPrice.prices.usd) return null

    // Refuse to use stale FX/price data (prevents wrong conversions after currency switches).
    const fxLast = Number(state.usdRatesLastUpdate?.[fxKey]) || 0
    if (!fxLast || Date.now() - fxLast > STALE_TTL_MS) return null

    const priceLast = Number(state.assetPricesLastUpdate?.[assetId]) || 0
    if (!priceLast || Date.now() - priceLast > STALE_TTL_MS) return null

    return Number(state.usdRates[parsedCurrencySymbol.toUpperCase()]) * Number(assetPrice.prices.usd)
  }
}

export function getAssetPriceId (state) {
  return (assetId, currencySymbol) => {
    // 1. check if asset price for assetId exists
    if (!Array.isArray(state.assetPrices)) return null
    const assetPrice = state.assetPrices.find(assetPrice => assetPrice && assetPrice.assetId === assetId)
    if (!assetPrice || !assetPrice.priceIds) return null
    
    // 2. check if resolved asset price has the currency it is looking for
    const parsedCurrencySymbol = String(currencySymbol).toLowerCase()
    if (assetPrice.priceIds[parsedCurrencySymbol]) {
      return assetPrice.priceIds[parsedCurrencySymbol]
    }

    return null
  }
}

export function getAssetConversion(state) {
  return (fromCurrency, toCurrency) => {
    const fromCurrencyRate = state.usdRates[fromCurrency]
    const toCurrencyRate = state.usdRates[toCurrency]
    return toCurrencyRate/fromCurrencyRate
  }
}
