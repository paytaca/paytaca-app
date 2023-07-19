export function updateUser (state, user) {
  state.user = user
}

export function clearProfile (state) {
  state.user = null
}

export function setCurrentPage (state, page) {
  state.currentPage = page
}

export function updateStoreBuyListings (state, data) {
  state.storeBuyListings.push(...data.ads)
  console.log('storeBuyListings:', state.storeBuyListings)
  state.storeBuyTotalPages = data.total_pages
  state.storeBuyItemsCount = data.count
}

export function updateStoreSellListings (state, data) {
  console.log('data:', data)
  state.storeSellListings.push(...data.ads)
  console.log('storeSellListings:', state.storeSellListings)
  state.storeSellTotalPages = data.total_pages
  state.storeSellItemsCount = data.count
}

export function setMoreDataAvailability (state, value) {
  state.moreDataAvailable = value
}

export function resetStorePagination (state) {
  state.itemsPerPage = 10
  state.storeBuyPageNumber = null
  state.storeBuyTotalPages = null
  state.storeBuyItemsCount = 0
  state.storeBuyListings = []

  state.storeSellPageNumber = null
  state.storeSellTotalPages = null
  state.storeSellItemsCount = 0
  state.storeSellListings = []
}

export function incStoreBuyPage (state) {
  state.storeBuyPageNumber++
}

export function incStoreSellPage (state) {
  state.storeSellPageNumber++
}
