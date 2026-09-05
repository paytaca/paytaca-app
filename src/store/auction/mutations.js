export function setListings(state, allAuctions) {
  state.listings = allAuctions
}

export function setMyBiddings(state, myBiddings) {
  state.myBiddings = myBiddings
}

export function setMyAuctions(state, myAuctions) {
  state.myAuctions = myAuctions
}

export function updateAuctionQueryIndex(state, auctionQueryIndex) {
  state.auctionQueryIndex = auctionQueryIndex
}

export function updateAuctionQueryActivity(state, auctionQueryActivity) {
  state.auctionQueryActivity = auctionQueryActivity
}

export function updateAuctionTypeIndex(state, auctionTypeIndex) {
  state.auctionTypeIndex = auctionTypeIndex
}

export function updateAuctionTypeActivity(state, auctionTypeActivity) {
  state.auctionTypeActivity = auctionTypeActivity
}

export function updateLotTypeActivity(state, lotTypeActivity) {
  state.lotTypeActivity = lotTypeActivity
}

export function updateLotQueryActivity(state, lotQueryActivity) {
  state.lotQueryActivity = lotQueryActivity
}

export function updateActivityType(state, activityType) {
  state.activityType = activityType
}

export function setArbiterPublicKey(state, arbiterPk) {
  state.arbiterPublicKey = arbiterPk
}

export function setServicerPublicKey(state, servicerPk) {
  state.servicerPublicKey = servicerPk
}

export function setUsername(state, username) {
  state.username = username
}

export function setIsArbiter(state, isArbiter) {
  state.isArbiter = isArbiter
}

export function setHasNetworkError(state, hasNetworkError) {
  state.hasNetworkError = hasNetworkError
}