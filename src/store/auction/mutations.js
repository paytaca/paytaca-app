export function setListings(state, listings) {
  state.listings = listings
}

export function setLoading(state, loading) {
  state.isLoading = loading
}

export function updateAuctionType(state, auctionType) {
  state.auctionType = { ...state.auctionType, ...auctionType }
}