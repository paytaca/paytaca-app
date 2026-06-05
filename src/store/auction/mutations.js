export function setListings(state, listings) {
  state.listings = listings
}

export function setLoading(state, loading) {
  state.isLoading = loading
}

export function updateFilters(state, filters) {
  state.filters = { ...state.filters, ...filters }
}

export function setLotSearchQuery(state, query) {
  state.lotSearchQuery = query;
}