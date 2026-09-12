
// Index page mutations
export function setListings(state, listings) {
  state.listings = listings
}

export function setListingsLastFetched(state) {
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
}

export function setMyBiddingsLastFetched(state) {
  state.myBiddingsLastFetched = Date.now()
}

export function setMyAuctions(state, myAuctions) {
  state.myAuctions = myAuctions
}

export function setMyAuctionsLastFetched(state) {
  state.myAuctionsLastFetched = Date.now()
}

// Auction Details Page mutations
export function setAuctionId(state, auctionId) {
  state.auctionId = auctionId
}

export function setAuctionData(state, auctionData) {
  state.auctionData = auctionData
}

export function setAuctionDataLastFetched(state) {
  state.auctionDataLastFetched = Date.now()
}

export function updateAuctionData(state, {attribute_name, data}) {
  state.auctionData[attribute_name] = data
}

export function setAuctionLots(state, auctionLots) {
  state.auctionLots = auctionLots
}

export function setAuctionLotsLastFetched(state) {
  state.auctionLotsLastFetched = Date.now()
}

export function updateAuctionLotsData(state, {attribute_name, data}) {
  state.auctionLots.forEach(lot => {
    lot[attribute_name] = data
  })
}

export function setAuctionLotsImages(state, auctionLotsImages) {
  state.auctionLotsImages = auctionLotsImages
}

export function updateLotTypeAuction(state, lotTypeAuction) {
  state.lotTypeAuction = lotTypeAuction
}

// Lot Details Page mutations
export function setLotId(state, lotId) {
  state.lotId = lotId
}

export function setLotData(state, lotData) {
  state.lotData = lotData
}

export function setLotDataLastFetched(state) {
  state.lotDataLastFetched = Date.now()
}

export function setLotImages(state, lotImages) {
  state.lotImages = lotImages
}

export function setLotBids(state, lotBids) {
  state.lotBids = lotBids
}

export function setLotBidsLastFetched(state) {
  state.lotBidsLastFetched = Date.now()
}

export function updateLotData(state, {attribute_name, data}) {
  state.lotData[attribute_name] = data
}

export function setHighestBid(state, highestBid) {
  state.highestBid = highestBid
}

export function setHighestBidLastFetched(state) {
  state.highestBidLastFetched = Date.now()
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