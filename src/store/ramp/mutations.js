export function updateUser (state, user) {
  state.user = user
}

export function clearProfile (state) {
  state.user = null
}

// ~ store mutations ~ //

export function updateStoreBuyListings (state, data) {
  state.storeBuyListings.push(...data.ads)
  // console.log('storeBuyListings:', state.storeBuyListings)
  state.storeBuyTotalPages = data.total_pages
  state.storeBuyItemsCount = data.count
}

export function updateStoreSellListings (state, data) {
  state.storeSellListings.push(...data.ads)
  // console.log('storeSellListings:', state.storeSellListings)
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
  state.itemsPerPage = 20
  state.storeBuyPageNumber = null
  state.storeBuyTotalPages = null
  state.storeBuyItemsCount = 0
  state.storeBuyListings = []

  state.storeSellPageNumber = null
  state.storeSellTotalPages = null
  state.storeSellItemsCount = 0
  state.storeSellListings = []
}

// ~ store mutations ~ //

// ~ ads mutations ~ //

export function updateAdsBuyListings (state, data) {
  state.adsBuyListings.push(...data.ads)
  console.log('adsBuyListings:', state.adsBuyListings)
  state.adsBuyTotalPages = data.total_pages
}

export function updateAdsSellListings (state, data) {
  state.adsSellListings.push(...data.ads)
  console.log('adsSellListings:', state.adsSellListings)
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
  state.adsBuyListings = []

  state.adsSellPageNumber = null
  state.adsSellTotalPages = null
  state.adsSellListings = []
}

// ~ ads mutations ~ //
