// ====================
// INDEX PAGE MUTATIONS
// ====================

// SETS ALL listing data (listings is an array)
export function setListings(state, listings) {
  state.listings = listings
}

// SETS last time listings was fetched
export function setListingsLastFetched(state) {
  state.listingsLastFetched = Date.now()
}

// SETS index page's auction type
export function setIndexAuctionType(state, indexAuctionType) {
  state.indexAuctionType = indexAuctionType
}

// SETS index page's auction query
export function setIndexAuctionQuery(state, indexAuctionQuery) {
  state.indexAuctionQuery = indexAuctionQuery
}

// ADDS a new auction to the listing
export function addListing(state, auction) {
  const existingAuction = state.listings.some(item => Number(item.id) === Number(auction.id))
  if (existingAuction) return
  state.listings.push(auction)  
}

// UPDATES an auction from the listing
export function updateListing(state, auctionData) {
  if(!state.listings || !auctionData) return 

  const auction = state.listings.find(item => Number(item.id) === Number(auctionData.id))
  if (!auction) return
  
  Object.assign(auction, auctionData)
  if (auctionData.status) auction.refreshStatus()
}

// REMOVES an auction from the listing
export function removeListing(state, auctionId) {
  state.listings = state.listings.filter(auction => Number(auction.id) !== Number(auctionId))
}


// =======================
// ACTIVITY PAGE MUTATIONS
// =======================

// SETS the activity type (Bids or Auctions)
export function setActivityType(state, activityType) {
  state.activityType = activityType
}

// SETS the activity auction type (English, Dutch, or All)
export function setActivityAuctionType(state, activityAuctionType) {
  state.activityAuctionType = activityAuctionType
}

// SETS the activity auction query
export function setActivityAuctionQuery(state, activityAuctionQuery) {
  state.activityAuctionQuery = activityAuctionQuery
}

// SETS the activity bid lot category (Physical or Digital)
export function setActivityLotCategory(state, activityLotCategory) {
  state.activityLotCategory = activityLotCategory
}

// SETS the activity bid lot query
export function setActivityLotQuery(state, activityLotQuery) {
  state.activityLotQuery = activityLotQuery
}

// SETS ALL bidding data (myBiddings is an array)
export function setMyBiddings(state, myBiddings) {
  state.myBiddings = myBiddings
}

// SETS last time my biddings were fetched
export function setMyBiddingsLastFetched(state) {
  state.myBiddingsLastFetched = Date.now()
}

// UPDATES an existing bid
export function updateMyBidding(state, biddingData) {
  const lot = state.myBiddings.find(item => Number(item.id) === Number(biddingData.lot))
  if (!lot) return

  lot.bid_id = biddingData.id
  lot.bid_status = biddingData.status
  if (['Highest', 'Winner'].includes(biddingData.status)) {
    lot.threshold_bid_bch = Number(biddingData.bid_price_bch)
    lot.threshold_bid_fiat = Number(biddingData.bid_price_fiat)
  }
}

// SETS ALL my auctions data (myAuctions is an array)
export function setMyAuctions(state, myAuctions) {
  state.myAuctions = myAuctions
}

// SETS last time my auctions were fetched
export function setMyAuctionsLastFetched(state) {
  state.myAuctionsLastFetched = Date.now()
}

// ADDS a new auction to my auctions
export function addMyAuction(state, auction) {
  if (state.myAuctions.some(item => Number(item.id) === Number(auction.id))) return
  state.myAuctions.push(auction)
}

// UPDATES an existing auction
export function updateMyAuction(state, auctionData) {
  const auction = state.myAuctions.find(item => Number(item.id) === Number(auctionData.id))
  if (!auction) return

  Object.assign(auction, auctionData)
  if (auctionData.status) {
    auction.status = auctionData.status
    auction.refreshStatus()
  }
}

// REMOVES an auction from my auctions
export function removeMyAuction(state, auctionId) {
  state.myAuctions = state.myAuctions.filter(auction => Number(auction.id) !== Number(auctionId))
}

// Auction Details Page mutations
export function setAuctionData(state, auctionData) {
  state.auctionData = auctionData
}

export function setAuctionDataLastFetched(state) {
  state.auctionDataLastFetched = Date.now()
}

export function updateAuctionData(state, {attribute_name, data}) {
  state.auctionData[attribute_name] = data
  if (attribute_name == 'status') state.auctionData.refreshStatus()
}

export function mergeAuctionData(state, auctionData) {
  if (Number(state.auctionData.id) !== Number(auctionData.id)) return
  Object.assign(state.auctionData, auctionData)
  if (auctionData.status) state.auctionData.status = auctionData.status
  state.auctionData.refreshStatus?.()
}

export function removeAuctionData(state, auctionId) {
  if (Number(state.auctionData.id) === Number(auctionId)) state.auctionData = {}
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
    if (attribute_name == 'status') lot.refreshStatus()
  })
}
export function setLotQueryAuction(state, lotQueryAuction) {
  state.lotQueryAuction = lotQueryAuction
}

export function setAuctionLotsImages(state, auctionLotsImages) {
  state.auctionLotsImages = auctionLotsImages
}

export function setLotCategoryAuction(state, lotCategoryAuction) {
  state.lotCategoryAuction = lotCategoryAuction
}

// Lot Details Page mutations
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

export function updateLotBid(state, biddingData) {
  const bidIndex = state.lotBids.findIndex(
    bid => Number(bid.id) === Number(biddingData.id)
  )
  if (bidIndex < 0) {
    state.lotBids.push(biddingData)
    return
  }

  const bid = state.lotBids[bidIndex]
  Object.assign(bid, biddingData)
}

export function cancelLotBids(state, bidIds) {
  state.lotBids.forEach(bid => {
    if (bidIds.some(id => Number(id) === Number(bid.id))) {
      bid.status = 'Cancelled'
    }
  })
  if (bidIds.some(id => Number(id) === Number(state.highestBid.id))) {
    state.highestBid = {}
  }
}

export function setLotBidsLastFetched(state) {
  state.lotBidsLastFetched = Date.now()
}

export function updateLotData(state, {attribute_name, data}) {
  state.lotData[attribute_name] = data
}

export function mergeLotData(state, lotData) {
  if (Number(state.lotData.id) === Number(lotData.id)) {
    Object.assign(state.lotData, lotData)
    if (lotData.status) state.lotData.status = lotData.status
    state.lotData.is_sold = state.lotData.status === 'Sold'
    state.lotData.refreshStatus?.()
  }

  const lot = state.auctionLots.find(
    item => Number(item.id) === Number(lotData.id)
  )
  if (lot) {
    Object.assign(lot, lotData)
    if (lotData.status) lot.status = lotData.status
    lot.is_sold = lot.status === 'Sold'
    lot.refreshStatus?.()
  }

  const activityLot = state.myBiddings.find(
    item => Number(item.id) === Number(lotData.id)
  )
  if (activityLot) {
    Object.assign(activityLot, lotData)
    if (lotData.status) activityLot.status = lotData.status
    activityLot.is_sold = activityLot.status === 'Sold'
    activityLot.refreshStatus?.()
  }
}

export function updateLotStatus(state, { id, status }) {
  mergeLotData(state, { id, status })
}

export function removeLotData(state, lotId) {
  if (Number(state.lotData.id) === Number(lotId)) state.lotData = {}
  state.auctionLots = state.auctionLots.filter(
    lot => Number(lot.id) !== Number(lotId)
  )
  state.myBiddings = state.myBiddings.filter(
    lot => Number(lot.id) !== Number(lotId)
  )
}

export function setHighestBid(state, highestBid) {
  state.highestBid = highestBid
}

export function setHighestBidLastFetched(state) {
  state.highestBidLastFetched = Date.now()
}

export function setDeliveryData(state, deliveryData) {
  state.deliveryData = deliveryData
} 

export function setDeliveryDataLastFetched(state) {
  state.deliveryDataLastFetched = Date.now()
}

export function setDisputeData(state, disputeData) {
  state.disputeData = disputeData
} 

export function setDisputeDataLastFetched(state) {
  state.disputeDataLastFetched = Date.now()
}

// Arbiter and Servicer Public Key mutations
export function setArbiterPublicKey(state, arbiterPk) {
  state.arbiterPublicKey = arbiterPk
}

export function setArbiterLastFetched(state) {
  state.arbiterLastFetched = Date.now()
}

export function setServicerPublicKey(state, servicerPk) {
  state.servicerPublicKey = servicerPk
}

export function setServicerLastFetched(state, servicerPk) {
  state.servicerLastFetched = servicerPk
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
