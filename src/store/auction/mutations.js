
// Index page mutations
export function setListings(state, listings) {
  state.listings = listings
  state.listingsLastFetched = Date.now()
}

export function updateAuctionTypeIndex(state, auctionTypeIndex) {
  state.auctionTypeIndex = auctionTypeIndex
}

export function updateAuctionQueryIndex(state, auctionQueryIndex) {
  state.auctionQueryIndex = auctionQueryIndex
}

// Activity page mutations
export function updateActivityType(state, activityType) {
  state.activityType = activityType
}

export function updateAuctionTypeActivity(state, auctionTypeActivity) {
  state.auctionTypeActivity = auctionTypeActivity
}

export function updateAuctionQueryActivity(state, auctionQueryActivity) {
  state.auctionQueryActivity = auctionQueryActivity
}

export function updateLotTypeActivity(state, lotTypeActivity) {
  state.lotTypeActivity = lotTypeActivity
}

export function updateLotQueryActivity(state, lotQueryActivity) {
  state.lotQueryActivity = lotQueryActivity
}

export function setMyBiddings(state, myBiddings) {
  state.myBiddings = myBiddings
  state.myBiddingsLastFetched = Date.now()
}

export function setMyAuctions(state, myAuctions) {
  state.myAuctions = myAuctions
  state.myAuctionsLastFetched = Date.now()
}

// Auction Details Page mutations
export function setAuctionId(state, auctionId) {
  state.auctionId = auctionId
}

export function setAuctionData(state, auctionData) {
  state.auctionData = auctionData
}

export function updateAuctionData(state, {attribute_name, data}) {
  state.auctionData[attribute_name] = data
}

export function updateAuctionLots(state, auctionLots) {
  state.auctionLots = auctionLots
  state.auctionLotsLastFetched = Date.now()
}

export function updateAuctionLotsData(state, {attribute_name, data}) {
  state.auctionLots.forEach(lot => {
    lot[attribute_name] = data
  })
}

// Arbiter and Servicer Public Key mutations
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