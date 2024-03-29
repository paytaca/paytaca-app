export function updateStoreBuyFilters (state, filters) {
  state.storeBuyFilters = filters
}

export function updateStoreSellFilters (state, filters) {
  state.storeSellFilters = filters
}

export function updateOngoingOrderFilters (state, filters) {
  state.ongoingOrderFilters = filters
}

export function updateCompletedOrderFilters (state, filters) {
  state.completedOrderFilters = filters
}

export function resetOrderFilters (state) {
  resetOngoingOrderFilters(state)
  resetCompletedOrderFilters(state)
}

export function resetOngoingOrderFilters (state) {
  state.ongoingOrderFilters = {
    sort_type: 'ascending',
    sort_by: 'created_at',
    status: ['SBM', 'CNF', 'ESCRW_PN', 'ESCRW', 'PD_PN', 'PD', 'APL', 'RLS_PN', 'RFN_PN'],
    appealable: true,
    not_appealable: true,
    payment_types: state.paymentTypes.map(p => p.id),
    time_limits: [5, 15, 30, 60, 300, 720, 1440],
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

export function resetCompletedOrderFilters (state) {
  state.completedOrderFilters = {
    sort_type: 'descending',
    sort_by: 'last_modified_at',
    status: ['CNCL', 'RLS', 'RFN'],
    payment_types: state.paymentTypes.map(p => p.id),
    time_limits: [5, 15, 30, 60, 300, 720, 1440],
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

export function updateFilterPaymentTypes (state, paymentTypes) {
  updateSellFilterPaymentTypes(state, paymentTypes)
  updateBuyFilterPaymentTypes(state, paymentTypes)
}

export function updateSellFilterPaymentTypes (state, paymentTypes) {
  state.storeSellFilters.payment_types = paymentTypes
}

export function updateBuyFilterPaymentTypes (state, paymentTypes) {
  state.storeBuyFilters.payment_types = paymentTypes
}

export function resetStoreFilters (state) {
  resetStoreBuyFilters(state)
  resetStoreSellFilters(state)
}

export function resetStoreBuyFilters (state) {
  state.storeBuyFilters = {
    sort_type: 'descending',
    price_type: {
      fixed: true,
      floating: true
    },
    payment_types: state.paymentTypes.map(p => p.id),
    time_limits: [5, 15, 30, 60, 300, 720, 1440]
  }
}

export function resetStoreSellFilters (state) {
  state.storeSellFilters = {
    sort_type: 'ascending',
    price_type: {
      fixed: true,
      floating: true
    },
    payment_types: state.paymentTypes.map(p => p.id),
    time_limits: [5, 15, 30, 60, 300, 720, 1440]
  }
}

export function updateUser (state, user) {
  state.user = user
}

export function resetUser (state) {
  state.user = null
  state.wallet = null
  state.authHeaders = null
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

export function updateAuthHeaders (state, headers) {
  state.authHeaders = headers
}

export function updatePaymentTypes (state, paymentTypes) {
  state.paymentTypes = paymentTypes
}

export function resetPaymentTypes (state) {
  state.paymentTypes = []
}

export function updateChatIdentity (state, data) {
  if (!state.chatIdentity) state.chatIdentity = {}
  state.chatIdentity[data.ref] = data.chatIdentity
}

export function resetChatIdentity (state) {
  state.chatIdentity = {}
}
