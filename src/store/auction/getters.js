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

export function auctionTypeIndex(state) {
  return state.auctionTypeIndex
}

export function auctionQueryIndex(state) {
  return state.auctionTypeIndex
}

export function auctionTypeActivity(state) {
  return state.auctionTypeActivity
}

export function auctionQueryActivity(state) {
  return state.auctionQueryActivity
}

export function auctionTypeOptions(state) {
  return state.auctionTypeOptions
}

export function lotTypeOptions(state) {
  return state.lotTypeOptions
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

export function myAuctions(state) {
  return state.myAuctions || []
}

export function arbiterPublicKey(state) {
  return state.arbiterPublicKey
}

export function servicerPublicKey(state) {
  return state.servicerPublicKey
}

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