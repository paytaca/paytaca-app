export function processedItems(state) {
  const currentListings = state.listings || []
  const activeTypeFilter = (state.auctionType || 'All').toLowerCase()

  if (activeTypeFilter === 'all') {
    return currentListings
  }
  
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

export function myBiddings(state) {
  return state.myBiddings || []
}

// Getter for stored arbiter PK
export function arbiterPublicKey(state) {
  return state.arbiterPublicKey
}

// Getter for stored servicer PK
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