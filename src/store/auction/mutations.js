
// Index page mutations
export function setListings(state, listings) {
  state.listings = listings
}

export function updateListing(state, auctionData) {
  const auction = state.listings.find(
    item => Number(item.id) === Number(auctionData.id)
  )
  if (!auction) return
  Object.assign(auction, auctionData)
  if (auctionData.status) auction.status_label = auctionData.status
  auction.refreshStatus?.()
}

export function addListing(state, auction) {
  if (state.listings.some(item => Number(item.id) === Number(auction.id))) return
  state.listings.push(auction)
}

export function removeListing(state, auctionId) {
  state.listings = state.listings.filter(
    auction => Number(auction.id) !== Number(auctionId)
  )
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

export function updateMyBidding(state, biddingData) {
  const lot = state.myBiddings.find(
    item => Number(item.id) === Number(biddingData.lot)
  )
  if (!lot) return
  lot.bid_id = biddingData.id
  lot.bid_status = biddingData.status
  if (['Highest', 'Winner'].includes(biddingData.status)) {
    lot.threshold_bid_bch = Number(biddingData.bid_price_bch)
    lot.threshold_bid_fiat = Number(biddingData.bid_price_fiat)
  }
}

export function setMyBiddingsLastFetched(state) {
  state.myBiddingsLastFetched = Date.now()
}

export function setMyAuctions(state, myAuctions) {
  state.myAuctions = myAuctions
}

export function updateMyAuction(state, auctionData) {
  const auction = state.myAuctions.find(
    item => Number(item.id) === Number(auctionData.id)
  )
  if (!auction) return
  Object.assign(auction, auctionData)
  if (auctionData.status) auction.status_label = auctionData.status
  auction.refreshStatus?.()
}

export function addMyAuction(state, auction) {
  if (state.myAuctions.some(item => Number(item.id) === Number(auction.id))) return
  state.myAuctions.push(auction)
}

export function removeMyAuction(state, auctionId) {
  state.myAuctions = state.myAuctions.filter(
    auction => Number(auction.id) !== Number(auctionId)
  )
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

export function mergeAuctionData(state, auctionData) {
  if (Number(state.auctionData.id) !== Number(auctionData.id)) return
  Object.assign(state.auctionData, auctionData)
  if (auctionData.status) state.auctionData.status_label = auctionData.status
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
    if (lotData.status) state.lotData.status_label = lotData.status
    state.lotData.is_sold = state.lotData.status_label === 'Sold'
    state.lotData.refreshStatus?.()
  }

  const lot = state.auctionLots.find(
    item => Number(item.id) === Number(lotData.id)
  )
  if (lot) {
    Object.assign(lot, lotData)
    if (lotData.status) lot.status_label = lotData.status
    lot.is_sold = lot.status_label === 'Sold'
    lot.refreshStatus?.()
  }

  const activityLot = state.myBiddings.find(
    item => Number(item.id) === Number(lotData.id)
  )
  if (activityLot) {
    Object.assign(activityLot, lotData)
    if (lotData.status) activityLot.status_label = lotData.status
    activityLot.is_sold = activityLot.status_label === 'Sold'
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
