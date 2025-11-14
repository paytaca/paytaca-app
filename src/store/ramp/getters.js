import { Store } from 'src/store'

/**
 * Get current wallet hash from global store
 * @returns {string|null} Current wallet hash
 */
function getCurrentWalletHash() {
  try {
    const wallet = Store.getters['global/getWallet']('bch')
    return wallet?.walletHash || null
  } catch (error) {
    return null
  }
}

/**
 * Get wallet-specific state for current wallet
 * @param {Object} state - Ramp store state
 * @param {string} walletHash - Optional wallet hash, if not provided uses current wallet
 * @returns {Object} Wallet-specific state
 */
function getWalletState(state, walletHash = null) {
  const hash = walletHash || getCurrentWalletHash()
  if (!hash) {
    // Return empty state if no wallet hash available
    return {}
  }
  
  // Ensure byWallet exists
  if (!state.byWallet) {
    return {}
  }
  
  // Initialize wallet state if it doesn't exist
  if (!state.byWallet[hash]) {
    // Return empty object - state will be initialized by mutation when needed
    return {}
  }
  
  return state.byWallet[hash]
}

/**
 * Get wallet-specific state for a specific wallet hash
 * @param {Object} state - Ramp store state
 * @returns {Function} Function that takes walletHash and returns wallet state
 */
export function getWalletStateByHash(state) {
  return function(walletHash) {
    return getWalletState(state, walletHash)
  }
}

export function featureToggles (state) {
  return state.featureToggles
}

export function showAdLimitMessage (state) {
  const walletState = getWalletState(state)
  return walletState.showAdLimitMessage ?? true
}

export function cashinOrderList (state) {
  const walletState = getWalletState(state)
  return walletState.cashinOrderList || []
}

export function cashinOrderListPage (state) {
  const walletState = getWalletState(state)
  return walletState.cashinOrderListPage || 1
}

export function cashinOrderListTotalPage (state) {
  const walletState = getWalletState(state)
  return walletState.cashinOrderListTotalPage || 1
}

export function storeListingTab (state) {
  const walletState = getWalletState(state)
  return walletState.storeListingTab || 'SELL'
}

export function adListingTab (state) {
  const walletState = getWalletState(state)
  return walletState.adListingTab || 'BUY'
}

export function orderListingTab (state) {
  const walletState = getWalletState(state)
  return walletState.orderListingTab || 'ONGOING'
}

export function appealListingTab (state) {
  const walletState = getWalletState(state)
  return walletState.appealListingTab || 'PENDING'
}

export function ongoingOrderFilters (state) {
  const walletState = getWalletState(state)
  return function (currency) {
    return walletState.ongoingOrderFilters?.[currency] || {}
  }
}

export function completedOrderFilters (state) {
  const walletState = getWalletState(state)
  return function (currency) {
    return walletState.completedOrderFilters?.[currency] || {}
  }
}

export function storeBuyFilters (state) {
  const walletState = getWalletState(state)
  return function (currency) {
    return walletState.storeBuyFilters?.[currency] || walletState.storeBuyFilters || {}
  }
}

export function storeSellFilters (state) {
  const walletState = getWalletState(state)
  return function (currency) {
    return walletState.storeSellFilters?.[currency] || walletState.storeSellFilters || {}
  }
}

export function getArbiter (state) {
  const walletState = getWalletState(state)
  return walletState.arbiter || null
}

export function getUser (state) {
  const walletState = getWalletState(state)
  return walletState.user || null
}

export function getTotalPages (state) {
  const walletState = getWalletState(state)
  return function ({ component = null, transactionType = null }) {
    if (component === 'store') {
      switch (transactionType) {
        case 'SELL':
          return walletState.storeSellTotalPages || null
        case 'BUY':
          return walletState.storeBuyTotalPages || null
        default:
          return 1
      }
    }
    // TODO: total pages for other ramp components
    return 1
  }
}

export function getPageNumber (state) {
  const walletState = getWalletState(state)
  return function ({ component = null, transactionType = null }) {
    if (component === 'store') {
      switch (transactionType) {
        case 'SELL':
          return walletState.storeSellPageNumber || null
        case 'BUY':
          return walletState.storeBuyPageNumber || null
        default:
          return 1
      }
    }

    return 1
  }
}

// store getters //

export function getStoreBuyListings (state) {
  const walletState = getWalletState(state)
  return walletState.storeBuyListings || []
}

export function getStoreSellListings (state) {
  const walletState = getWalletState(state)
  return walletState.storeSellListings || []
}

export function getStoreTotalPages (state) {
  const walletState = getWalletState(state)
  return function (transactionType) {
    switch (transactionType) {
      case 'SELL':
        return walletState.storeSellTotalPages || null
      case 'BUY':
        return walletState.storeBuyTotalPages || null
      default:
        return 0
    }
  }
}

export function getStorePageNumber (state) {
  const walletState = getWalletState(state)
  return function (transactionType) {
    switch (transactionType) {
      case 'SELL':
        return walletState.storeSellPageNumber || null
      case 'BUY':
        return walletState.storeBuyPageNumber || null
      default:
        return 0
    }
  }
}

// store getters //

// ads getters //
export function getAdsBuyListings (state) {
  const walletState = getWalletState(state)
  return walletState.adsBuyListings || []
}

export function getAdsSellListings (state) {
  const walletState = getWalletState(state)
  return walletState.adsSellListings || []
}

export function getAdsTotalPages (state) {
  const walletState = getWalletState(state)
  return function (transactionType) {
    switch (transactionType) {
      case 'SELL':
        return walletState.adsSellTotalPages || null
      case 'BUY':
        return walletState.adsBuyTotalPages || null
      default:
        return null
    }
  }
}

export function getAdsPageNumber (state) {
  const walletState = getWalletState(state)
  return function (transactionType) {
    switch (transactionType) {
      case 'SELL':
        return walletState.adsSellPageNumber || null
      case 'BUY':
        return walletState.adsBuyPageNumber || null
      default:
        return null
    }
  }
}

// ads getters //

// orders getters //
export function getOngoingOrders (state) {
  const walletState = getWalletState(state)
  return walletState.ongoingOrders || []
}

export function getCompletedOrders (state) {
  const walletState = getWalletState(state)
  return walletState.completedOrders || []
}

export function getOrdersTotalPages (state) {
  const walletState = getWalletState(state)
  return function (orderState) {
    switch (orderState) {
      case 'ONGOING':
        return walletState.ongoingOrdersTotalPages || null
      case 'COMPLETED':
        return walletState.completedOrdersTotalPages || null
      default:
        return null
    }
  }
}

export function getOrdersPageNumber (state) {
  const walletState = getWalletState(state)
  return function (orderState) {
    switch (orderState) {
      case 'ONGOING':
        return walletState.ongoingOrdersPageNumber || null
      case 'COMPLETED':
        return walletState.completedOrdersPageNumber || null
      default:
        return null
    }
  }
}

/** cashin order getters */

// appeals getters //
export function pendingAppeals (state) {
  const walletState = getWalletState(state)
  return walletState.pendingAppeals || []
}

export function resolvedAppeals (state) {
  const walletState = getWalletState(state)
  return walletState.resolvedAppeals || []
}

export function appealsTotalPages (state) {
  const walletState = getWalletState(state)
  return function (appealState) {
    switch (appealState) {
      case 'PENDING':
        return walletState.pendingAppealsTotalPages || null
      case 'RESOLVED':
        return walletState.resolvedAppealsTotalPages || null
      default:
        return null
    }
  }
}

export function appealsPageNumber (state) {
  const walletState = getWalletState(state)
  return function (appealState) {
    switch (appealState) {
      case 'PENDING':
        return walletState.pendingAppealsPageNumber || null
      case 'RESOLVED':
        return walletState.resolvedAppealsPageNumber || null
      default:
        return null
    }
  }
}
// appeals getters //

export function getTxidHistory (state) {
  const walletState = getWalletState(state)
  return walletState.txids || {}
}

export function getOrderTxid (state) {
  const walletState = getWalletState(state)
  return function (id, action) {
    if (action && walletState.txids?.[id]) {
      return walletState.txids[id][action]
    }
    return walletState.txids?.[id]
  }
}

export function wallet (state) {
  const walletState = getWalletState(state)
  return walletState.wallet || null
}

export function paymentTypes (state) {
  const walletState = getWalletState(state)
  return function (currency) {
    return walletState.paymentTypes?.[currency] || []
  }
}

export function chatIdentity (state) {
  const walletState = getWalletState(state)
  return function (ref) {
    return walletState.chatIdentity?.[ref] || null
  }
}

export function ordersCurrency (state) {
  const walletState = getWalletState(state)
  return walletState.ordersCurrency || 'All'
}
