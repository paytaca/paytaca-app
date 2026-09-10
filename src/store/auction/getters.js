export function processedItems(state) {
  const currentListings = state.listings || []
  const activeTypeFilter = (state.auctionType || 'All').toLowerCase()

  if (activeTypeFilter === 'all') return currentListings
  
  return currentListings.filter(item => {
    let typeLabel = ''
    
    if (item.raw?.type_id?.type) {
      typeLabel = item.raw.type_id.type
    } else if (item.raw?.type?.type) {
      typeLabel = item.raw.type.type
    } else {
      const typeId = Number(item.type_id || item.raw?.type_id)
      if (typeId === 1) typeLabel = 'English'
      if (typeId === 2) typeLabel = 'Dutch'
    }

    return typeLabel.toLowerCase() === activeTypeFilter
  })
}

// Options getters
export function auctionTypeOptions(state) {
  return state.auctionTypeOptions || ['English', 'Dutch', 'All']
}

export function lotTypeOptions(state) {
  return state.lotTypeOptions || ['Physical', 'Digital', 'All']
}


// Index getters
export function listingsLastFetched(state) {
  return state.listingsLastFetched || 0
}

export function auctionTypeIndex(state) {
  return state.auctionTypeIndex || ''
}

export function auctionQueryIndex(state) {
  return state.auctionQueryIndex || ''
}


// Auction Details getters
export function auctionId(state){
  return state.auctionId 
}

export function auctionLots(state) {
  return state.auctionLots || []
}

export function auctionLotsLastFetched(state) {
  return state.auctionLotsLastFetched || 0
}

export function lotTypeAuction(state) {
  return state.lotTypeAuction || 'All'
}

// Lot Details getters
export function lotId(state) {
  return state.lotId 
}

export function lotData(state) {
  return state.lotData 
}

export function lotDataLastFetched(state) {
  return state.lotDataLastFetched || 0
}

// Activity getters
export function auctionTypeActivity(state) {0
  return state.auctionTypeActivity || 'All'
}

export function auctionQueryActivity(state) {
  return state.auctionQueryActivity | ''
}

export function lotTypeActivity(state) {
  return state.lotTypeActivity || 'All'
}

export function lotQueryActivity(state) {
  return state.lotQueryActivity || ''
}

export function activityType(state) {
  return state.activityType || 'My Bids'
}

export function myBiddings(state) {
  return state.myBiddings || []
}

export function myBiddingsLastFetched(state) {
  return state.myBiddingsLastFetched || 0
}

export function myAuctions(state) {
  return state.myAuctions || []
}

export function myAuctionsLastFetched(state) {
  return state.myAuctionsLastFetched || 0
}


// Arbiter and Servicer Public Key Getters
export function arbiterPublicKey(state) {
  return state.arbiterPublicKey
}

export function servicerPublicKey(state) {
  return state.servicerPublicKey
}


// User Details Getters
// Getter for stored username
export function username(state) {
  return state.username
}

// Getter for stored isArbiter
export function isArbiter(state) {
  return state.isArbiter
}

// Getter for stored hasNetworkError (related to network errors during API calls)
export function hasNetworkError(state) {
  return state.hasNetworkError
}