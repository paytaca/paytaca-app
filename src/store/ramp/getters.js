export function getUser (state) {
  return state.user
}

export function getTotalPages (state) {
  return function ({ component = null, transactionType = null }) {
    if (component === 'store') {
      switch (transactionType) {
        case 'SELL':
          return state.storeSellTotalPages
        case 'BUY':
          return state.storeBuyTotalPages
        default:
          return 1
      }
    }
    // TODO: total pages for other ramp components
    return 1
  }
}

export function getPageNumber (state) {
  return function ({ component = null, transactionType = null }) {
    if (component === 'store') {
      switch (transactionType) {
        case 'SELL':
          return state.storeSellTotalPages
        case 'BUY':
          return state.storeBuyTotalPages
        default:
          return 1
      }
    }

    return 1
  }
}

// store getters //

export function getStoreBuyListings (state) {
  return state.storeBuyListings
}

export function getStoreSellListings (state) {
  return state.storeSellListings
}

export function getStoreTotalPages (state) {
  return function (transactionType) {
    switch (transactionType) {
      case 'SELL':
        return state.storeSellTotalPages
      case 'BUY':
        return state.storeBuyTotalPages
      default:
        return 0
    }
  }
}

export function getStorePageNumber (state) {
  return function (transactionType) {
    switch (transactionType) {
      case 'SELL':
        return state.storeSellPageNumber
      case 'BUY':
        return state.storeBuyPageNumber
      default:
        return 0
    }
  }
}

// store getters //

// ads getters //
export function getAdsBuyListings (state) {
  return state.adsBuyListings
}

export function getAdsSellListings (state) {
  return state.adsSellListings
}

export function getAdsTotalPages (state) {
  return function (transactionType) {
    switch (transactionType) {
      case 'SELL':
        return state.adsSellTotalPages
      case 'BUY':
        return state.adsBuyTotalPages
      default:
        return null
    }
  }
}

export function getAdsPageNumber (state) {
  return function (transactionType) {
    switch (transactionType) {
      case 'SELL':
        return state.adsSellPageNumber
      case 'BUY':
        return state.adsBuyPageNumber
      default:
        return null
    }
  }
}

// ads getters //
