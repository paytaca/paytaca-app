export async function filterAuctionItems({ commit }, type) {
  commit('updateAuctionType', type)
}

export async function refreshCatalog({ commit }) {
  commit('setLoading', true)
    
  // Test delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  commit('setLoading', false)
}