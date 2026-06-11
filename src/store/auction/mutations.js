export function setListings(state, allAuctions) {
  state.listings = allAuctions
}

export function setLoading(state, loading) {
  state.isLoading = loading
}

export function updateAuctionType(state, auctionType) {
  state.auctionType = auctionType
}

export function updateActivityType(state, activityType) {
  state.activityType = activityType
}