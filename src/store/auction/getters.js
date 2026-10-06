import { AuctionList, LotsList } from "src/auction/object"

export function filteredListings(state) {
  const currentListings = state.listings ?? []
  const activeTypeFilter = (state.indexAuctionType ?? 'All').toLowerCase()

  return (activeTypeFilter === 'all') 
    ? currentListings 
    : currentListings.filter(item => {
      const typeLabel = item.type ?? 'N/A'
      return typeLabel.toLowerCase() === activeTypeFilter
    })
}

// Options getters
export function auctionTypeOptions(state) {
  return state.auctionTypeOptions ?? ['English', 'Dutch', 'All']
}

export function lotCategoryOptions(state) {
  return state.lotCategoryOptions ?? ['Physical', 'Digital', 'All']
}

export function filteredLots(state) {
  const currentAuctionLots = state.auctionLots ?? []
  const activeTypeFilter = (state.auctionLotCategory ?? 'All').toLowerCase()

  return (activeTypeFilter === 'all') 
    ? currentAuctionLots
    : currentAuctionLots.filter(lot => {
      const typeLabel = lot.category ?? 'N/A'
      return typeLabel.toLowerCase() === activeTypeFilter
    })
}


// Index getters
export function listings(state) {
  return state.listings ?? []
}

export function listingsLastFetched(state) {
  return state.listingsLastFetched ?? 0
}

export function indexAuctionType(state) {
  return state.indexAuctionType ?? ''
}

export function indexAuctionQuery(state) {
  return state.indexAuctionQuery ?? ''
}


// Auction Details getters
export function auctionId(state){
  return state.auctionData['id'] ?? null
}

export function auctionData(state){
  return state.auctionData ?? AuctionList({})
}

export function auctionLots(state) {
  return state.auctionLots ?? []
}

export function auctionLotsLastFetched(state) {
  return state.auctionLotsLastFetched ?? 0
}

export function auctionLotCategory(state) {
  return state.auctionLotCategory ?? 'All'
}

export function auctionLotsImages(state) {
  return state.auctionLotsImages ?? []
}

// Lot Details getters
export function lotId(state) {
  return state.lotData['id'] ?? null
}

export function lotData(state) {
  return state.lotData ?? LotsList({})
}

export function lotDataLastFetched(state) {
  return state.lotDataLastFetched ?? 0
}

export function lotImages(state) {
  return state.lotImages ?? []
}

export function lotBids(state) {
  return state.lotBids ?? []
}

export function highestBid(state) {
  return state.highestBid ?? {}
}

export function highestBidLastFetched(state) {
  return state.highestBidLastFetched ?? 0
}

export function deliveryData(state) {
  return state.deliveryData ?? {}
}

export function deliveryDataLastFetched(state) {
  return state.deliveryDataLastFetched ?? 0
}

export function disputeData(state) {
  return state.disputeData ?? {}
}

export function disputeDataLastFetched(state) {
  return state.disputeDataLastFetched ?? 0
}

// Activity getters
export function activityAuctionType(state) {
  return state.activityAuctionType ?? 'All'
}

export function activityAuctionQuery(state) {
  return state.activityAuctionQuery ?? ''
}

export function activityLotCategory(state) {
  return state.activityLotCategory ?? 'All'
}

export function activityLotQuery(state) {
  return state.activityLotQuery ?? ''
}

export function activityType(state) {
  return state.activityType ?? 'My Bids'
}

export function myBiddings(state) {
  return state.myBiddings ?? []
}

export function myBiddingsLastFetched(state) {
  return state.myBiddingsLastFetched ?? 0
}

export function myAuctions(state) {
  return state.myAuctions ?? []
}

export function myAuctionsLastFetched(state) {
  return state.myAuctionsLastFetched ?? 0
}


// Arbiter and Servicer Public Key Getters
export function arbiterPublicKey(state) {
  return state.arbiterPublicKey ?? null
}

export function arbiterLastFetched(state) {
  return state.arbiterLastFetched ?? 0
}

export function servicerPublicKey(state) {
  return state.servicerPublicKey ?? null
}

export function servicerLastFetched(state) {
  return state.servicerLastFetched ?? 0
}


// User Details Getters
// Getter for stored username
export function username(state) {
  return state.username ?? false
}

// Getter for stored isArbiter
export function isArbiter(state) {
  return state.isArbiter ?? false
}

// Getter for stored hasNetworkError (related to network errors during API calls)
export function hasNetworkError(state) {
  return state.hasNetworkError ?? false
}