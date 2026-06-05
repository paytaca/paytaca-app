export async function filterAuctionItems({ commit }, type) {
  commit('updateFilters', { auctionType: type })
}

export async function updateSearchQuery({ commit }, query) {
  commit('updateFilters', { search: query })
}

export async function refreshCatalog({ commit }) {
  commit('setLoading', true)
    
  // Test delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  commit('setLoading', false)
}