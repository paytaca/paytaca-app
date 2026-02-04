import { Store } from 'src/store'
import { getInitialWalletState } from './state'

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
 * Get or initialize wallet-specific state
 * @param {Object} state - Ramp store state
 * @param {string} walletHash - Optional wallet hash, if not provided uses current wallet
 * @returns {Object} Wallet-specific state
 */
function getOrInitWalletState(state, walletHash = null) {
  const hash = walletHash || getCurrentWalletHash()
  if (!hash) {
    console.warn('No wallet hash available for ramp state')
    return null
  }
  
  // Ensure byWallet exists
  if (!state.byWallet) {
    state.byWallet = {}
  }
  
  // Initialize wallet state if it doesn't exist
  if (!state.byWallet[hash]) {
    // Set directly - Vuex will make it reactive
    state.byWallet[hash] = getInitialWalletState()
  }
  
  return state.byWallet[hash]
}

/**
 * Initialize wallet state for a specific wallet hash
 * @param {Object} state - Ramp store state
 * @param {string} walletHash - Wallet hash
 */
export function initializeWalletState(state, walletHash) {
  if (!walletHash) {
    console.warn('initializeWalletState: walletHash is required')
    return
  }
  
  // Ensure byWallet exists
  if (!state.byWallet) {
    state.byWallet = {}
  }
  
  if (!state.byWallet[walletHash]) {
    state.byWallet[walletHash] = getInitialWalletState()
  }
}

export function updateFeatureToggles (state, data) {
  state.featureToggles = data
}

export function updateShowAdLimitMessage (state, data) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.showAdLimitMessage = data
  }
}

export function updateCashinOrderList (state, data) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.cashinOrderList = data
  }
}

export function updateCashinOrderListPage (state, value) {
  if (!value) value = 1
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.cashinOrderListPage = value
  }
}

export function updateCashinOrderListTotalPage (state, value) {
  if (!value) value = 1
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.cashinOrderListTotalPage = value
  }
}

export function resetCashinOrderList (state) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.cashinOrderList = []
  }
}

export function resetCashinOrderListPage (state) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.cashinOrderListPage = 1
  }
}

export function resetCashinOrderListTotalPage (state) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.cashinOrderListTotalPage = 1
  }
}

export function updateStoreListingTab (state, tab) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.storeListingTab = tab
  }
}

export function updateAdListingTab (state, tab) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.adListingTab = tab
  }
}

export function updateOrderListingTab (state, tab) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.orderListingTab = tab
  }
}

export function updateAppealListingTab (state, tab) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.appealListingTab = tab
  }
}

export function resetStoreListingTab (state) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.storeListingTab = 'SELL'
  }
}

export function resetAdListingTab (state) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.adListingTab = 'BUY'
  }
}

export function resetOrderListingTab (state) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.orderListingTab = 'ONGOING'
  }
}

export function resetAppealListingTab (state) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.appealListingTab = 'PENDING'
  }
}

export function resetListingTabs (state) {
  resetStoreListingTab(state)
  resetAdListingTab(state)
  resetOrderListingTab(state)
  resetAppealListingTab(state)
}

export function updateStoreBuyFilters (state, { filters = {}, currency = null }) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (!currency) {
    walletState.storeBuyFilters = {}
    return
  }
  if (!walletState.storeBuyFilters) walletState.storeBuyFilters = {}
  walletState.storeBuyFilters[currency] = filters
}

export function updateStoreSellFilters (state, { filters = {}, currency = null }) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (!currency) {
    walletState.storeSellFilters = {}
    return
  }
  if (!walletState.storeSellFilters) walletState.storeSellFilters = {}
  walletState.storeSellFilters[currency] = filters
}

export function updateOngoingOrderFilters (state, { filters = {}, currency = null }) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (!currency) {
    walletState.ongoingOrderFilters = {}
    return
  }
  if (!walletState.ongoingOrderFilters) walletState.ongoingOrderFilters = {}
  walletState.ongoingOrderFilters[currency] = filters
}

export function updateCompletedOrderFilters (state, { filters = {}, currency = null }) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (!currency) {
    walletState.completedOrderFilters = {}
    return
  }
  if (!walletState.completedOrderFilters) walletState.completedOrderFilters = {}
  walletState.completedOrderFilters[currency] = filters
}

export function resetOrderFilters (state, currency) {
  resetOngoingOrderFilters(state, currency)
  resetCompletedOrderFilters(state, currency)
}

export function resetOngoingOrderFilters (state, currency) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (!currency) {
    walletState.ongoingOrderFilters = {}
    return
  }
  const paymentTypes = walletState.paymentTypes?.[currency] || []
  if (!walletState.ongoingOrderFilters) walletState.ongoingOrderFilters = {}
  walletState.ongoingOrderFilters[currency] = {
    sort_type: 'descending',
    sort_by: 'created_at',
    status: ['SBM', 'CNF', 'ESCRW_PN', 'ESCRW', 'PD_PN', 'PD', 'APL', 'RLS_PN', 'RFN_PN'],
    appealable: true,
    not_appealable: true,
    payment_types: paymentTypes.map(p => p.id),
    time_limits: [15, 30, 45, 60],
    ownership: {
      owned: true,
      notOwned: true
    },
    trade_type: {
      buy: true,
      sell: true
    }
  }
}

export function resetCompletedOrderFilters (state, currency) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (!currency) {
    walletState.completedOrderFilters = {}
    return
  }
  const paymentTypes = walletState.paymentTypes?.[currency] || []
  if (!walletState.completedOrderFilters) walletState.completedOrderFilters = {}
  walletState.completedOrderFilters[currency] = {
    sort_type: 'descending',
    sort_by: 'last_modified_at',
    status: ['CNCL', 'RLS', 'RFN'],
    payment_types: paymentTypes.map(p => p.id),
    time_limits: [15, 30, 45, 60],
    ownership: {
      owned: true,
      notOwned: true
    },
    trade_type: {
      buy: true,
      sell: true
    }
  }
}

export function updateStoreFilterPaymentTypes (state, { paymentTypes = [], currency = null }) {
  if (!currency) currency = 'All'
  paymentTypes = paymentTypes.map(paymenttype => paymenttype.id)
  updateStoreSellFilterPaymentTypes(state, { paymentTypes: paymentTypes, currency: currency })
  updateStoreBuyFilterPaymentTypes(state, { paymentTypes: paymentTypes, currency: currency })
}

export function updateStoreSellFilterPaymentTypes (state, { paymentTypes = [], currency = null }) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (!currency) currency = 'All'
  if (!walletState.storeSellFilters) {
    walletState.storeSellFilters = {}
    walletState.storeSellFilters[currency] = {
      sort_type: 'ascending',
      price_type: {
        fixed: true,
        floating: true
      },
      payment_types: paymentTypes,
      time_limits: [15, 30, 45, 60],
      order_amount: null,
      order_amount_currency: null
    }
  } else {
    if (!walletState.storeSellFilters[currency]) walletState.storeSellFilters[currency] = {}
    walletState.storeSellFilters[currency].payment_types = paymentTypes
  }
}

export function updateStoreBuyFilterPaymentTypes (state, { paymentTypes = [], currency = null }) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (!currency) currency = 'All'
  if (!walletState.storeBuyFilters) {
    walletState.storeBuyFilters = {}
    walletState.storeBuyFilters[currency] = {
      sort_type: 'descending',
      price_type: {
        fixed: true,
        floating: true
      },
      payment_types: paymentTypes,
      time_limits: [15, 30, 45, 60],
      order_amount: null,
      order_amount_currency: null
    }
  } else {
    if (!walletState.storeBuyFilters[currency]) walletState.storeBuyFilters[currency] = {}
    walletState.storeBuyFilters[currency].payment_types = paymentTypes
  }
}

export function updateOngoingOrderFilterPaymentTypes (state, { paymentTypes = [], currency = null }) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (!currency) currency = 'All'
  if (!walletState.ongoingOrderFilters) {
    walletState.ongoingOrderFilters = {}
    walletState.ongoingOrderFilters[currency] = {
      sort_type: 'descending',
      sort_by: 'created_at',
      status: ['SBM', 'CNF', 'ESCRW_PN', 'ESCRW', 'PD_PN', 'PD', 'APL', 'RLS_PN', 'RFN_PN'],
      appealable: true,
      not_appealable: true,
      payment_types: paymentTypes.map(p => p.id),
      time_limits: [15, 30, 45, 60],
      ownership: {
        owned: true,
        notOwned: true
      },
      trade_type: {
        buy: true,
        sell: true
      }
    }
  } else {
    if (!walletState.ongoingOrderFilters[currency]) walletState.ongoingOrderFilters[currency] = {}
    walletState.ongoingOrderFilters[currency].payment_types = paymentTypes
  }
}

export function updateCompletedOrderFilterPaymentTypes (state, { paymentTypes = [], currency = null }) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (!currency) currency = 'All'
  if (!walletState.completedOrderFilters) {
    walletState.completedOrderFilters = {}
    walletState.completedOrderFilters[currency] = {
      sort_type: 'descending',
      sort_by: 'last_modified_at',
      status: ['CNCL', 'RLS', 'RFN'],
      payment_types: paymentTypes.map(p => p.id),
      time_limits: [15, 30, 45, 60],
      ownership: {
        owned: true,
        notOwned: true
      },
      trade_type: {
        buy: true,
        sell: true
      }
    }
  } else {
    if (!walletState.completedOrderFilters[currency]) walletState.completedOrderFilters[currency] = {}
    walletState.completedOrderFilters[currency].payment_types = paymentTypes
  }
}

export function resetStoreFilters (state, currency) {
  resetStoreBuyFilters(state, currency)
  resetStoreSellFilters(state, currency)
}

export function resetStoreBuyFilters (state, currency) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (!currency) {
    walletState.storeBuyFilters = {}
    return
  }
  const paymentTypes = walletState.paymentTypes?.[currency] || []
  if (!walletState.storeBuyFilters) walletState.storeBuyFilters = {}
  walletState.storeBuyFilters[currency] = {
    sort_type: 'descending',
    price_type: {
      fixed: true,
      floating: true
    },
    payment_types: paymentTypes.map(p => p.id),
    time_limits: [15, 30, 45, 60],
    order_amount: null,
    order_amount_currency: null
  }
}

export function resetStoreSellFilters (state, currency) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (!currency) {
    walletState.storeSellFilters = {}
    return
  }
  const paymentTypes = walletState.paymentTypes?.[currency] || []
  if (!walletState.storeSellFilters) walletState.storeSellFilters = {}
  walletState.storeSellFilters[currency] = {
    sort_type: 'ascending',
    price_type: {
      fixed: true,
      floating: true
    },
    payment_types: paymentTypes.map(p => p.id),
    time_limits: [15, 30, 45, 60],
    order_amount: null,
    order_amount_currency: null
  }
}

export function updateUser (state, user) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.user = user
  }
}

export function resetUser (state, walletHash = null) {
  const walletState = getOrInitWalletState(state, walletHash)
  if (walletState) {
    walletState.user = null
    walletState.wallet = null
  }
}

export function saveTxid (state, data) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (!walletState.txids) walletState.txids = {}
  if (!walletState.txids[data.id]) {
    walletState.txids[data.id] = {}
  }
  walletState.txids[data.id][data.txidInfo.action] = data.txidInfo.txid
}

export function clearOrderTxids (state, id) {
  const walletState = getOrInitWalletState(state)
  if (!walletState || !walletState.txids) return
  delete walletState.txids[id]
  console.log(`cleared order ${id} txids`)
}

// ~ store mutations ~ //

export function updateStoreBuyListings (state, { overwrite = false, data }) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (overwrite) walletState.storeBuyListings = data.ads
  else walletState.storeBuyListings.push(...data.ads)
  walletState.storeBuyTotalPages = data.total_pages
  walletState.storeBuyItemsCount = data.count
}

export function updateStoreSellListings (state, { overwrite = false, data }) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (overwrite) walletState.storeSellListings = data.ads
  else walletState.storeSellListings.push(...data.ads)
  walletState.storeSellTotalPages = data.total_pages
  walletState.storeSellItemsCount = data.count
}

export function incStoreBuyPage (state) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.storeBuyPageNumber = (walletState.storeBuyPageNumber || 0) + 1
  }
}

export function incStoreSellPage (state) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.storeSellPageNumber = (walletState.storeSellPageNumber || 0) + 1
  }
}

export function resetStorePagination (state, walletHash = null) {
  const walletState = getOrInitWalletState(state, walletHash)
  if (!walletState) return
  walletState.storeBuyPageNumber = null
  walletState.storeBuyTotalPages = null
  walletState.storeBuyItemsCount = 0

  walletState.storeSellPageNumber = null
  walletState.storeSellTotalPages = null
  walletState.storeSellItemsCount = 0
}

export function resetStoreData (state, walletHash = null) {
  const walletState = getOrInitWalletState(state, walletHash)
  if (!walletState) return
  walletState.storeBuyListings = []
  walletState.storeSellListings = []
}

// ~ store mutations ~ //

// ~ ads mutations ~ //

export function updateAdsBuyListings (state, { overwrite = false, data }) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (overwrite) walletState.adsBuyListings = []
  walletState.adsBuyListings.push(...data.ads)
  walletState.adsBuyTotalPages = data.total_pages
}

export function updateAdsSellListings (state, { overwrite = false, data }) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (overwrite) walletState.adsSellListings = []
  walletState.adsSellListings.push(...data.ads)
  walletState.adsSellTotalPages = data.total_pages
}

export function incAdsBuyPage (state) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.adsBuyPageNumber = (walletState.adsBuyPageNumber || 0) + 1
  }
}

export function incAdsSellPage (state) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.adsSellPageNumber = (walletState.adsSellPageNumber || 0) + 1
  }
}

export function resetAdsPagination (state, walletHash = null) {
  const walletState = getOrInitWalletState(state, walletHash)
  if (!walletState) return
  walletState.adsBuyPageNumber = null
  walletState.adsBuyTotalPages = null

  walletState.adsSellPageNumber = null
  walletState.adsSellTotalPages = null
}

export function resetAdsData (state, walletHash = null) {
  const walletState = getOrInitWalletState(state, walletHash)
  if (!walletState) return
  walletState.adsBuyListings = []
  walletState.adsSellListings = []
}

// ~ ads mutations ~ //

// ~ orders mutations ~ //

export function updateOngoingOrders (state, { overwrite = false, data }) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (overwrite) walletState.ongoingOrders = []
  walletState.ongoingOrders.push(...data.orders)
  walletState.ongoingOrdersTotalPages = data.total_pages
}

export function updateCompletedOrders (state, { overwrite = false, data }) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (overwrite) walletState.completedOrders = []
  walletState.completedOrders.push(...data.orders)
  walletState.completedOrdersTotalPages = data.total_pages
}

export function incOngoingOrdersPage (state) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.ongoingOrdersPageNumber = (walletState.ongoingOrdersPageNumber || 0) + 1
  }
}

export function incCompletedOrdersPage (state) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.completedOrdersPageNumber = (walletState.completedOrdersPageNumber || 0) + 1
  }
}

export function resetOrdersPagination (state, walletHash = null) {
  const walletState = getOrInitWalletState(state, walletHash)
  if (!walletState) return
  walletState.ongoingOrdersPageNumber = null
  walletState.ongoingOrdersTotalPages = null

  walletState.completedOrdersPageNumber = null
  walletState.completedOrdersTotalPages = null
}

export function resetOrdersData (state, walletHash = null) {
  const walletState = getOrInitWalletState(state, walletHash)
  if (!walletState) return
  walletState.ongoingOrders = []
  walletState.completedOrders = []
}

// ~ orders mutations ~ //

/** cashin orders */

// ~ appeals mutations ~ //
export function updatePendingAppeals (state, { overwrite = false, data }) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (overwrite) walletState.pendingAppeals = []
  walletState.pendingAppeals.push(...data.appeals)
  walletState.pendingAppealsTotalPages = data.total_pages
}

export function updateResolvedAppeals (state, { overwrite = false, data }) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (overwrite) walletState.resolvedAppeals = []
  walletState.resolvedAppeals.push(...data.appeals)
  walletState.resolvedAppealsTotalPages = data.total_pages
}

export function incPendingAppealsPage (state) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.pendingAppealsPageNumber = (walletState.pendingAppealsPageNumber || 0) + 1
  }
}

export function incResolvedAppealsPage (state) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.resolvedAppealsPageNumber = (walletState.resolvedAppealsPageNumber || 0) + 1
  }
}

export function resetAppealsPagination (state, walletHash = null) {
  const walletState = getOrInitWalletState(state, walletHash)
  if (!walletState) return
  walletState.pendingAppealsPageNumber = null
  walletState.pendingAppealsTotalPages = null

  walletState.resolvedAppealsPageNumber = null
  walletState.resolvedAppealsTotalPages = null
}

export function resetAppealsData (state, walletHash = null) {
  const walletState = getOrInitWalletState(state, walletHash)
  if (!walletState) return
  walletState.pendingAppeals = []
  walletState.resolvedAppeals = []
}
// ~ appeals mutations ~ //

export function resetPagination (state, walletHash = null) {
  resetStorePagination(state, walletHash)
  resetAdsPagination(state, walletHash)
  resetOrdersPagination(state, walletHash)
  resetAppealsPagination(state, walletHash)
}

export function resetData (state, walletHash = null) {
  resetStoreData(state, walletHash)
  resetAdsData(state, walletHash)
  resetOrdersData(state, walletHash)
  resetAppealsData(state, walletHash)
}

export function updateWallet (state, wallet) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.wallet = wallet
  }
}

export function updatePaymentTypes (state, { paymentTypes = [], currency = null }) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (!currency) currency = 'All'
  if (!walletState.paymentTypes) walletState.paymentTypes = {}
  walletState.paymentTypes[currency] = paymentTypes
}

export function resetPaymentTypes (state, walletHash = null) {
  const walletState = getOrInitWalletState(state, walletHash)
  if (walletState) {
    walletState.paymentTypes = {}
  }
}

export function updateChatIdentity (state, data) {
  const walletState = getOrInitWalletState(state)
  if (!walletState) return
  if (!walletState.chatIdentity) walletState.chatIdentity = {}
  walletState.chatIdentity[data.ref] = data.chatIdentity
}

export function resetChatIdentity (state, walletHash = null) {
  const walletState = getOrInitWalletState(state, walletHash)
  if (walletState) {
    walletState.chatIdentity = {}
  }
}

export function setStoreOrderFiltersMigrate (state, value) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.migrateStoreOrderFilters = value
  }
}

export function setOrdersCurrency (state, value) {
  const walletState = getOrInitWalletState(state)
  if (walletState) {
    walletState.ordersCurrency = value
  }
}
