import { callApi } from 'src/auction/api'
import { AuctionList } from 'src/auction/object'

export async function filterAuctionItems({ commit }, type) {
  commit('updateAuctionType', type)
}

export async function refreshCatalog({ commit }) {
  commit('setLoading', true)
  
  try {
    const response = await callApi('auctions', null)
    
    if (response && response.success && Array.isArray(response.data)) {
      const allAuctions = response.data.map(item => AuctionList.parse(item))
      commit('setListings', allAuctions)
    }
  } catch (error) {
    console.error('API Sync Error inside refreshCatalog:', error)
  } finally {
    commit('setLoading', false)
  }
}