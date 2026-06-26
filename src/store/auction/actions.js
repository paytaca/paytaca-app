import { callAPI } from 'src/auction/api'
import { AuctionList, LotsList } from 'src/auction/object'
import { getWallet } from '../../auction/payment'

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
    console.error('API Sync Error inside fetchLots:', error)
    lots = []
  }

  commit('setMyBiddings', lots)
}

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

// Fetching username
export async function fetchUsername({ commit }) {
  try {
    commit('setUsername', '')
    
    const wallet = await getWallet()
    const publicKey = await wallet.BCH.getPublicKey(`0/0`)
    const response = await callAPI('user-details-by-public-key', publicKey)

    console.log(response)

    if (response && response.success) {
      const username = response.data.username
      console.log(response.data)
      commit('setUsername', username)
    }
  } catch (error) {
    console.error('API Sync Error inside fetchUsername:', error)
  } 
}