export function updateFeatureToggles (state, data) {
  state.featureToggles = data
}

export function updateShowAdLimitMessage (state, data) {
  state.showAdLimitMessage = data
}

export function updateCashinOrderList (state, data) {
  state.cashinOrderList = data
}

export function updateCashinOrderListPage (state, value) {
  if (!value) value = 1
  state.cashinOrderListPage = value
}

export function updateCashinOrderListTotalPage (state, value) {
  if (!value) value = 1
  state.cashinOrderListTotalPage = value
}

export function resetCashinOrderList (state) {
  state.cashinOrderList = []
}

export function resetCashinOrderListPage (state) {
  state.cashinOrderListPage = 1
}

export function resetCashinOrderListTotalPage (state) {
  state.cashinOrderListTotalPage = 1
}

export function updateStoreListingTab (state, tab) {
  state.storeListingTab = tab
}

export function updateAdListingTab (state, tab) {
  state.adListingTab = tab
}

export function updateOrderListingTab (state, tab) {
  state.orderListingTab = tab
}

export function updateAppealListingTab (state, tab) {
  state.appealListingTab = tab
}

export function resetStoreListingTab (state) {
  state.storeListingTab = 'SELL'
}

export function resetAdListingTab (state) {
  state.adListingTab = 'BUY'
}

export function resetOrderListingTab (state) {
  state.orderListingTab = 'ONGOING'
}

export function resetAppealListingTab (state) {
  state.appealListingTab = 'PENDING'
}

export function resetListingTabs (state) {
  resetStoreListingTab(state)
  resetAdListingTab(state)
  resetOrderListingTab(state)
  resetAppealListingTab(state)
}

export function updateStoreBuyFilters (state, { filters = {}, currency = null }) {
  if (!currency) return (() => { state.storeBuyFilters = {} })()
  state.storeBuyFilters[currency] = filters
}

export function updateStoreSellFilters (state, { filters = {}, currency = null }) {
  if (!currency) return (() => { state.storeSellFilters = {} })()
  state.storeSellFilters[currency] = filters
}

export function updateOngoingOrderFilters (state, { filters = {}, currency = null }) {
  if (!currency) return (() => { state.ongoingOrderFilters = {} })()
  state.ongoingOrderFilters[currency] = filters
}

export function updateCompletedOrderFilters (state, { filters = {}, currency = null }) {
  if (!currency) return (() => { state.completedOrderFilters = {} })()
  state.completedOrderFilters[currency] = filters
}

export function resetOrderFilters (state, currency) {
  resetOngoingOrderFilters(state, currency)
  resetCompletedOrderFilters(state, currency)
}

export function resetOngoingOrderFilters (state, currency) {
  if (!currency) return (() => { state.ongoingOrderFilters = {} })()
  const paymentTypes = state.paymentTypes[currency] || []
  state.ongoingOrderFilters[currency] = {
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
  if (!currency) return (() => { state.completedOrderFilters = {} })()
  const paymentTypes = state.paymentTypes[currency] || []
  state.completedOrderFilters[currency] = {
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
  if (!currency) currency = 'All'
  if (!state.storeSellFilters) {
    state.storeSellFilters = {}
    state.storeSellFilters[currency] = {
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
    if (!state.storeSellFilters[currency]) state.storeSellFilters[currency] = {}
    state.storeSellFilters[currency].payment_types = paymentTypes
  }
}

export function updateStoreBuyFilterPaymentTypes (state, { paymentTypes = [], currency = null }) {
  if (!currency) currency = 'All'
  if (!state.storeBuyFilters) {
    state.storeBuyFilters = {}
    state.storeBuyFilters[currency] = {
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
    if (!state.storeBuyFilters[currency]) state.storeBuyFilters[currency] = {}
    state.storeBuyFilters[currency].payment_types = paymentTypes
  }
}

export function updateOngoingOrderFilterPaymentTypes (state, { paymentTypes = [], currency = null }) {
  if (!currency) currency = 'All'
  if (!state.ongoingOrderFilters) {
    state.ongoingOrderFilters = {}
    state.ongoingOrderFilters[currency] = {
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
    if (!state.ongoingOrderFilters[currency]) state.ongoingOrderFilters[currency] = {}
    state.ongoingOrderFilters[currency].payment_types = paymentTypes
  }
}

export function updateCompletedOrderFilterPaymentTypes (state, { paymentTypes = [], currency = null }) {
  if (!currency) currency = 'All'
  if (!state.completedOrderFilters) {
    state.completedOrderFilters = {}
    state.completedOrderFilters[currency] = {
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
    if (!state.completedOrderFilters[currency]) state.completedOrderFilters[currency] = {}
    state.completedOrderFilters[currency].payment_types = paymentTypes
  }
}

export function resetStoreFilters (state, currency) {
  resetStoreBuyFilters(state, currency)
  resetStoreSellFilters(state, currency)
}

export function resetStoreBuyFilters (state, currency) {
  if (!currency) return (() => { state.storeBuyFilters = {} })()
  const paymentTypes = state.paymentTypes[currency] || []
  state.storeBuyFilters[currency] = {
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
  if (!currency) return (() => { state.storeSellFilters = {} })()
  const paymentTypes = state.paymentTypes[currency] || []
  state.storeSellFilters[currency] = {
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
  state.user = user
}

export function resetUser (state) {
  state.user = null
  state.wallet = null
}

export function saveTxid (state, data) {
  if (!state.txids[data.id]) {
    state.txids[data.id] = {}
  }
  state.txids[data.id][data.txidInfo.action] = data.txidInfo.txid
}

export function clearOrderTxids (state, id) {
  delete state.txids[id]
  console.log(`cleared order ${id} txids`)
}

// ~ store mutations ~ //

export function updateStoreBuyListings (state, { overwrite = false, data }) {
  if (overwrite) state.storeBuyListings = data.ads
  else state.storeBuyListings.push(...data.ads)
  state.storeBuyTotalPages = data.total_pages
  state.storeBuyItemsCount = data.count
}

export function updateStoreSellListings (state, { overwrite = false, data }) {
  if (overwrite) state.storeSellListings = data.ads
  else state.storeSellListings.push(...data.ads)
  state.storeSellTotalPages = data.total_pages
  state.storeSellItemsCount = data.count
}

export function incStoreBuyPage (state) {
  state.storeBuyPageNumber++
}

export function incStoreSellPage (state) {
  state.storeSellPageNumber++
}

export function resetStorePagination (state) {
  state.storeBuyPageNumber = null
  state.storeBuyTotalPages = null
  state.storeBuyItemsCount = 0

  state.storeSellPageNumber = null
  state.storeSellTotalPages = null
  state.storeSellItemsCount = 0
}

export function resetStoreData (state) {
  state.storeBuyListings = []
  state.storeSellListings = []
}

// ~ store mutations ~ //

// ~ ads mutations ~ //

export function updateAdsBuyListings (state, { overwrite = false, data }) {
  if (overwrite) state.adsBuyListings = []
  state.adsBuyListings.push(...data.ads)
  state.adsBuyTotalPages = data.total_pages
}

export function updateAdsSellListings (state, { overwrite = false, data }) {
  if (overwrite) state.adsSellListings = []
  state.adsSellListings.push(...data.ads)
  state.adsSellTotalPages = data.total_pages
}

export function incAdsBuyPage (state) {
  state.adsBuyPageNumber++
}

export function incAdsSellPage (state) {
  state.adsSellPageNumber++
}

export function resetAdsPagination (state) {
  state.adsBuyPageNumber = null
  state.adsBuyTotalPages = null

  state.adsSellPageNumber = null
  state.adsSellTotalPages = null
}

export function resetAdsData (state) {
  state.adsBuyListings = []
  state.adsSellListings = []
}

// ~ ads mutations ~ //

// ~ orders mutations ~ //

export function updateOngoingOrders (state, { overwrite = false, data }) {
  if (overwrite) state.ongoingOrders = []
  state.ongoingOrders.push(...data.orders)
  state.ongoingOrdersTotalPages = data.total_pages
}

export function updateCompletedOrders (state, { overwrite = false, data }) {
  if (overwrite) state.completedOrders = []
  state.completedOrders.push(...data.orders)
  state.completedOrdersTotalPages = data.total_pages
}

export function incOngoingOrdersPage (state) {
  state.ongoingOrdersPageNumber++
}

export function incCompletedOrdersPage (state) {
  state.completedOrdersPageNumber++
}

export function resetOrdersPagination (state) {
  state.ongoingOrdersPageNumber = null
  state.ongoingOrdersTotalPages = null

  state.completedOrdersPageNumber = null
  state.completedOrdersTotalPages = null
}

export function resetOrdersData (state) {
  state.ongoingOrders = []
  state.completedOrders = []
}

// ~ orders mutations ~ //

/** cashin orders */

// ~ appeals mutations ~ //
export function updatePendingAppeals (state, { overwrite = false, data }) {
  if (overwrite) state.pendingAppeals = []
  state.pendingAppeals.push(...data.appeals)
  state.pendingAppealsTotalPages = data.total_pages
}

export function updateResolvedAppeals (state, { overwrite = false, data }) {
  if (overwrite) state.resolvedAppeals = []
  state.resolvedAppeals.push(...data.appeals)
  state.resolvedAppealsTotalPages = data.total_pages
}

export function incPendingAppealsPage (state) {
  state.pendingAppealsPageNumber++
}

export function incResolvedAppealsPage (state) {
  state.resolvedAppealsPageNumber++
}

export function resetAppealsPagination (state) {
  state.pendingAppealsPageNumber = null
  state.pendingAppealsTotalPages = null

  state.resolvedAppealsPageNumber = null
  state.resolvedAppealsTotalPages = null
}

export function resetAppealsData (state) {
  state.pendingAppeals = []
  state.resolvedAppeals = []
}
// ~ appeals mutations ~ //

export function resetPagination (state) {
  state.itemsPerPage = 20
  resetStorePagination(state)
  resetAdsPagination(state)
  resetOrdersPagination(state)
  resetAppealsPagination(state)
}

export function resetData (state) {
  resetStoreData(state)
  resetAdsData(state)
  resetOrdersData(state)
  resetAppealsData(state)
}

export function updateWallet (state, wallet) {
  state.wallet = wallet
}

export function updatePaymentTypes (state, { paymentTypes = [], currency = null }) {
  if (!currency) currency = 'All'
  if (!state.paymentTypes) state.paymentTypes = {}
  state.paymentTypes[currency] = paymentTypes
}

export function resetPaymentTypes (state) {
  state.paymentTypes = {}
}

export function updateChatIdentity (state, data) {
  if (!state.chatIdentity) state.chatIdentity = {}
  state.chatIdentity[data.ref] = data.chatIdentity
}

export function resetChatIdentity (state) {
  state.chatIdentity = {}
}

export function setStoreOrderFiltersMigrate (state, value) {
  state.migrateStoreOrderFilters = value
}

export function setOrdersCurrency (state, value) {
  state.ordersCurrency = value
}
