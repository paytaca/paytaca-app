import { callAPI } from 'src/auction/api'
import { AuctionList } from 'src/auction/object'

export async function filterAuctionItems({ commit }, type) {
  commit('updateAuctionType', type)
}

export async function filterActivities({ commit }, type) {
  commit('updateActivityType', type)
}

export async function refreshCatalog({ commit }) {
  commit('setLoading', true)
  
  try {
    const response = await callAPI('auctions')
    
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

// Fetching ArbiterPk for contract creation
export async function fetchArbiterPublicKey({ commit }) {
  try {
    const response = await callAPI('arbiter-pk')

    if (response && response.success) {
      const arbiterPk = response.data.arbiter_pk
      commit('setArbiterPublicKey', arbiterPk)
    }
  } catch (error) {
    console.error('API Sync Error inside fetchArbiterPublicKey:', error)
  } 
}

// Fetching ServicerPk for contract creation
export async function fetchServicerPublicKey({ commit }) {
  try {
    const response = await callAPI('servicer-pk')

    if (response && response.success) {
      const servicerPk = response.data.servicer_pk
      commit('setServicerPublicKey', servicerPk)
    }
  } catch (error) {
    console.error('API Sync Error inside fetchServicerPublicKey:', error)
  } 
}