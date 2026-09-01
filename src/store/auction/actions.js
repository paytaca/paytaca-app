import { callAPI } from 'src/auction/api'
import { AuctionList, LotsList } from 'src/auction/object'
import { getWallet } from '../../auction/payment'

/* 
===================
PAGE UPDATE ACTIONS
===================
*/

// Filtering auction items by type (English, Dutch, or All)
export async function filterAuctionItems({ commit }, type) {
  commit('updateAuctionType', type)
}

// Filtering user activities
export async function filterActivities({ commit }, type) {
  commit('updateActivityType', type)
}

// Refreshing list of auctions 
export async function refreshCatalog({ commit }) {
  try {
    const response = await callAPI('auctions')
    
    if (response && response.success && Array.isArray(response.data)) {
      const allAuctions = response.data.map(item => AuctionList.parse(item))
      commit('setListings', allAuctions)
    }
  } catch (error) {
    apiErrorHandler('filterAuctionItems', error, commit)
  }
}

/* 
====================
CURRENT USER ACTIONS
====================
*/

// Fetching CURRENT USER'S bids
export async function fetchMyBiddings({ commit }) {
  let lots = []

  try {
    const result = await callAPI('my-biddings/lots')

    if (result && result.success && Array.isArray(result.data)) {
      const lotPromises = result.data.map(async (item) => {
        const lot = LotsList.parse(item)

        const [auctionResult, imageResult] = await Promise.all([
          callAPI('auctions', lot.auction),
          callAPI('lot-images-by-lot', lot.id)
        ])

        if (auctionResult && auctionResult.success && auctionResult.data) {
          const auctionData = auctionResult.data instanceof AuctionList
            ? auctionResult.data
            : AuctionList.parse(auctionResult.data)

          lot.start_date = auctionData.start_date || null
          lot.end_date = auctionData.end_date || null
          lot.auction_type = auctionData.type || null
          lot.is_fiat = auctionData.is_fiat
        }

        if (imageResult && imageResult.success && Array.isArray(imageResult.data)) {
          lot.image = imageResult.data[0]?.image || null
        }

        return lot
      })

      lots = (await Promise.all(lotPromises)).filter(Boolean)
    }
  } catch (error) {
    apiErrorHandler('fetchMyBiddings', error, commit)
    lots = []
  }

  commit('setMyBiddings', lots)
}

// Fetching CURRENT USER username
export async function fetchUsername({ commit }) {
  try {
    console.log('[actions:fetchUsername] Fetching username from server...')
    // Clear current user information
    commit('setUsername', '')
    commit('setIsArbiter', false)
    
    // Using PK to fetch user details from server
    const wallet = await getWallet()
    const publicKey = await wallet.BCH.getPublicKey(`0/0`)
    const response = await callAPI('user-details-by-public-key', publicKey)

    if (response && response.success) {
      console.log('[actions:fetchUsername] Response generated: ', response.data)

      // Set the user info like username and if they're an arbiter
      commit('setUsername', response.data.username)
      commit('setIsArbiter', response.data.is_arbiter)
      commit('hasNetworkError', false) // no network error
    }
  } catch (error) {
    apiErrorHandler('fetchUsername', error, commit)
  } 
}

/* 
================================================================
FETCHING AUCTION INFORMATION FOR CONTRACT CREATION/INSTANTIATION
================================================================
*/

// Fetching ArbiterPK for contract instantiation/creation
export async function fetchArbiterPublicKey({ commit }) {
  try {
    const response = await callAPI('arbiter-pk')
    if (response && response.success) {
      const arbiterPk = response.data.arbiter_pk
      commit('setArbiterPublicKey', arbiterPk)
    }
  } catch (error) {
    apiErrorHandler('fetchArbiterPublicKey', error, commit)
  } 
}

// Fetching ServicerPK for contract instantiation/creation
export async function fetchServicerPublicKey({ commit }) {
  try {
    const response = await callAPI('servicer-pk')
    if (response && response.success) {
      const servicerPk = response.data.servicer_pk
      commit('setServicerPublicKey', servicerPk)
    }
  } catch (error) {
    apiErrorHandler('fetchServicerPublicKey', error, commit)
  } 
}

/* 
================
HELPER FUNCTIONS
================
*/

// Handles api-related errors (different actions per type of error)
function apiErrorHandler(functionName, error, commit) {
  if(error.response) {
    // API WORKING (no match found)
    console.error(`[actions:${functionName}] API Sync Error inside ${functionName}: `, error)
    commit('hasNetworkError', false)
    return
  } else if(error.request) {
    // API NOT WORKING (network error)
    console.error(`[actions:${functionName}] Network error encountered. Possibly not connected to API: `, error)
    commit('hasNetworkError', true) // network error occurred
    return
  } 

  // Something happened b4 the request was sent
  console.error(`[actions:${functionName}] An error occurred before executing fetchServicerPublicKey:`, error)
  commit('hasNetworkError', false)
}