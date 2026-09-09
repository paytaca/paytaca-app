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
  return state.auctionTypeOptions
}

export function lotTypeOptions(state) {
  return state.lotTypeOptions
}


// Index getters
export function listingsLastFetched(state) {
  return state.listingsLastFetched
}

export function auctionTypeIndex(state) {
  return state.auctionTypeIndex
}

export function auctionQueryIndex(state) {
  return state.auctionTypeIndex
}


// Auction Details getters
export function auctionId(state){
  return state.auctionId
}

export function auctionLots(state) {
  return state.auctionLots || []
}

export function auctionLotsLastFetched(state) {
  return state.auctionLotsLastFetched
}

// Lot Details getters
export function lotId(state) {
  return state.lotId 
}

export function lotData(state) {
  return state.lotData 
}

export function lotDataLastFetched(state) {
  return state.lotDataLastFetched
}

// Activity getters
export function auctionTypeActivity(state) {0
  return state.auctionTypeActivity
}

export function auctionQueryActivity(state) {
  return state.auctionQueryActivity
}

export function lotTypeActivity(state) {
  return state.lotTypeActivity
}

export function lotQueryActivity(state) {
  return state.lotQueryActivity
}

export function activityType(state) {
  return state.activityType
}

export function myBiddings(state) {
  return state.myBiddings || []
}

export function myBiddingsLastFetched(state) {
  return state.myBiddingsLastFetched 
}

export function myAuctions(state) {
  return state.myAuctions || []
}

export function myAuctionsLastFetched(state) {
  return state.myAuctionsLastFetched 
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