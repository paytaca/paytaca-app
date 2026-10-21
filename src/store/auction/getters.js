import { Auction, Lot } from "src/auction/object"

// Returns the filtered listings value from auction state.
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
// Returns the auction type options value from auction state.
export function auctionTypeOptions(state) {
  return state.auctionTypeOptions ?? ['English', 'Dutch', 'All']
}

// Returns the lot category options value from auction state.
export function lotCategoryOptions(state) {
  return state.lotCategoryOptions ?? ['Physical', 'Digital', 'All']
}

// Returns the filtered lots value from auction state.
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
// Returns the listings value from auction state.
export function listings(state) {
  return state.listings ?? []
}

// Returns the listings last fetched value from auction state.
export function listingsLastFetched(state) {
  return state.listingsLastFetched ?? 0
}

// Returns the index auction type value from auction state.
export function indexAuctionType(state) {
  return state.indexAuctionType ?? ''
}

// Returns the index auction query value from auction state.
export function indexAuctionQuery(state) {
  return state.indexAuctionQuery ?? ''
}


// Auction Details getters
// Returns the auction id value from auction state.
export function auctionId(state){
  return state.auctionData['id'] ?? null
}

// Returns the auction data value from auction state.
export function auctionData(state){
  return state.auctionData ?? Auction.parse({})
}

// Returns the auction lots value from auction state.
export function auctionLots(state) {
  return state.auctionLots ?? []
}

// Returns the auction lots last fetched value from auction state.
export function auctionLotsLastFetched(state) {
  return state.auctionLotsLastFetched ?? 0
}

// Returns the auction lot category value from auction state.
export function auctionLotCategory(state) {
  return state.auctionLotCategory ?? 'All'
}

// Returns the auction lots images value from auction state.
export function auctionLotsImages(state) {
  return state.auctionLotsImages ?? []
}

// Lot Details getters
// Returns the lot id value from auction state.
export function lotId(state) {
  return state.lotData['id'] ?? null
}

// Returns the lot data value from auction state.
export function lotData(state) {
  return state.lotData ?? Lot.parse({})
}

// Returns the lot data last fetched value from auction state.
export function lotDataLastFetched(state) {
  return state.lotDataLastFetched ?? 0
}

// Returns the lot images value from auction state.
export function lotImages(state) {
  return state.lotImages ?? []
}

// Returns the lot bids value from auction state.
export function lotBids(state) {
  return state.lotBids ?? []
}

// Returns the highest bid value from auction state.
export function highestBid(state) {
  return state.highestBid ?? {}
}

// Returns the highest bid last fetched value from auction state.
export function highestBidLastFetched(state) {
  return state.highestBidLastFetched ?? 0
}

// Returns the delivery data value from auction state.
export function deliveryData(state) {
  return state.deliveryData ?? {}
}

// Returns the delivery data last fetched value from auction state.
export function deliveryDataLastFetched(state) {
  return state.deliveryDataLastFetched ?? 0
}

// Returns the dispute data value from auction state.
export function disputeData(state) {
  return state.disputeData ?? {}
}

// Returns the dispute data last fetched value from auction state.
export function disputeDataLastFetched(state) {
  return state.disputeDataLastFetched ?? 0
}

// Activity getters
// Returns the activity auction type value from auction state.
export function activityAuctionType(state) {
  return state.activityAuctionType ?? 'All'
}

// Returns the activity auction query value from auction state.
export function activityAuctionQuery(state) {
  return state.activityAuctionQuery ?? ''
}

// Returns the activity lot category value from auction state.
export function activityLotCategory(state) {
  return state.activityLotCategory ?? 'All'
}

// Returns the activity lot query value from auction state.
export function activityLotQuery(state) {
  return state.activityLotQuery ?? ''
}

// Returns the activity type value from auction state.
export function activityType(state) {
  return state.activityType ?? 'My Bids'
}

// Returns the my biddings value from auction state.
export function myBiddings(state) {
  return state.myBiddings ?? []
}

// Returns the my biddings last fetched value from auction state.
export function myBiddingsLastFetched(state) {
  return state.myBiddingsLastFetched ?? 0
}

// Returns the my auctions value from auction state.
export function myAuctions(state) {
  return state.myAuctions ?? []
}

// Returns the my auctions last fetched value from auction state.
export function myAuctionsLastFetched(state) {
  return state.myAuctionsLastFetched ?? 0
}


// Arbiter and Servicer Public Key Getters
// Returns the auctioneer public key value from auction state.
export function auctioneerPublicKey(state) {
  return state.auctioneerPublicKey ?? null
}

// Returns the arbiter public key value from auction state.
export function arbiterPublicKey(state) {
  return state.arbiterPublicKey ?? null
}

// Returns the arbiter last fetched value from auction state.
export function arbiterLastFetched(state) {
  return state.arbiterLastFetched ?? 0
}

// Returns the servicer public key value from auction state.
export function servicerPublicKey(state) {
  return state.servicerPublicKey ?? null
}

// Returns the servicer last fetched value from auction state.
export function servicerLastFetched(state) {
  return state.servicerLastFetched ?? 0
}


// User Details Getters
// Returns the username value from auction state.
export function username(state) {
  return state.username ?? false
}

// Returns the is arbiter value from auction state.
export function isArbiter(state) {
  return state.isArbiter ?? false
}

// Returns the has network error value from auction state.
export function hasNetworkError(state) {
  return state.hasNetworkError ?? false
}
