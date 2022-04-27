export function coinsList(state) {
  if (Array.isArray(state.coinsList)) return []
  return state.coinsList
}

export function currencyOptions(state) {
  if (!Array.isArray(state.currencyOptions)) return []
  return state.currencyOptions
}

export function selectedCurrency(state) {
  return state.selectedCurrency
}

export function assetPrices(state) {
  if (!Array.isArray(state.assetPrices)) return []
  return state.assetPrices
}
