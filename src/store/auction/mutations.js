export function setListings(state, listings) {
  state.listings = listings
}

export function setLoading(state, loading) {
  state.isLoading = loading
}

export function updateAuctionFilters(state, auctionFilters) {
  state.auctionFilters = { ...state.auctionFilters, ...auctionFilters }
}

export function setLotSearchQuery(state, query) {
  state.lotSearchQuery = query;
}