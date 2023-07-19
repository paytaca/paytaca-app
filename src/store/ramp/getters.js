export function getUser (state) {
  return state.user
}

export function getStoreBuyListings (state) {
  return state.storeBuyListings
}

export function getStoreSellListings (state) {
  return state.storeSellListings
}

export function getTotalPages (state) {
  return function ({ component = null, transactionType = null }) {
    console.log('component:', component, 'transactionType:', transactionType)
    if (component === 'store') {
      switch (transactionType) {
        case 'SELL':
          console.log('>>> state.storeSellTotalPages:', state.storeSellTotalPages)
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

export function getStoreTotalPages (state) {
  return function (transactionType) {
    console.log('getStoreTotalPages (tx_type):', transactionType)
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
    console.log('getStorePageNumber (tx_type):', transactionType)
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