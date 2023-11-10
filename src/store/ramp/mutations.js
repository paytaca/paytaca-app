export function updateStoreBuyFilters (state, filters) {
  state.storeBuyFilters = filters
  console.log('Updated BUY Filters:', state.storeBuyFilters)
}

export function updateStoreSellFilters (state, filters) {
  state.storeSellFilters = filters
  console.log('Updated SELL Filters:', state.storeSellFilters)
}

export function resetStoreFilters (state) {
  resetStoreBuyFilters(state)
  resetStoreSellFilters(state)
}

export function resetStoreBuyFilters (state) {
  state.storeBuyFilters = {
    price_order: 'descending',
    price_types: ['FIXED', 'FLOATING'],
    payment_types: [],
    time_limits: [5, 15, 30, 60, 300, 720, 1440]
  }
  console.log('--storeBuyFilters:', state.storeBuyFilters)
}

export function resetStoreSellFilters (state) {
  state.storeSellFilters = {
    price_order: 'ascending',
    price_types: ['FIXED', 'FLOATING'],
    payment_types: [],
    time_limits: [5, 15, 30, 60, 300, 720, 1440]
  }
  console.log('--storeBuyFilters:', state.storeSellFilters)
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
}

// ~ store mutations ~ //

export function updateStoreBuyListings (state, { overwrite = false, data }) {
  if (overwrite) state.storeBuyListings = []
  state.storeBuyListings.push(...data.ads)
  state.storeBuyTotalPages = data.total_pages
  state.storeBuyItemsCount = data.count
}

export function updateStoreSellListings (state, { overwrite = false, data }) {
  if (overwrite) state.storeSellListings = []
  state.storeSellListings.push(...data.ads)
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
