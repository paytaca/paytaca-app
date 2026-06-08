export async function filterAuctionItems({ commit }, type) {
  commit('updateAuctionFilters', { type: type })
}

export async function updateSearchQuery({ commit }, query) {
  commit('updateAuctionFilters', { search: query })
}

export async function refreshCatalog({ commit }) {
  commit('setLoading', true)
    
  // Test delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  commit('setLoading', false)
}