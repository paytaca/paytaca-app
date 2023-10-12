export function getArbiter (state) {
  return state.arbiter
}
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

// orders getters //
export function getOngoingOrders (state) {
  return state.ongoingOrders
}

export function getCompletedOrders(state) {
  return state.completedOrders
}

export function getOrdersTotalPages (state) {
  return function (orderState) {
    switch (orderState) {
      case 'ONGOING':
        return state.ongoingOrdersTotalPages
      case 'COMPLETED':
        return state.completedOrdersTotalPages
      default:
        return null
    }
  }
}

export function getOrdersPageNumber (state) {
  return function (orderState) {
    switch (orderState) {
      case 'ONGOING':
        return state.ongoingOrdersPageNumber
      case 'COMPLETED':
        return state.completedOrdersPageNumber
      default:
        return null
    }
  }
}

// orders getters //

// appeals getters //
export function pendingAppeals (state) {
  return state.pendingAppeals
}

export function resolvedAppeals (state) {
  return state.resolvedAppeals
}

export function appealsTotalPages (state) {
  return function (appealState) {
    switch (appealState) {
      case 'PENDING':
        return state.pendingAppealsTotalPages
      case 'RESOLVED':
        return state.resolvedAppealsTotalPages
      default:
        return null
    }
  }
}

export function appealsPageNumber (state) {
  return function (appealState) {
    switch (appealState) {
      case 'PENDING':
        return state.pendingAppealsPageNumber
      case 'RESOLVED':
        return state.resolvedAppealsPageNumber
      default:
        return null
    }
  }
}
// appeals getters //

export function getTxidHistory (state) {
  return state.txids
}

export function getOrderTxid (state) {
  return function (id, action) {
    if (action) return state.txids[id][action]
    return state.txids[id]
  }
}

export function wallet (state) {
  return state.wallet
}

export function authHeaders (state) {
  return state.authHeaders
}
