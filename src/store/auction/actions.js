import { callAPI } from 'src/auction/api'
import { AuctionList, LotsList, BidsList } from 'src/auction/object'
import { getWallet } from '../../auction/payment'
import noImage from 'src/assets/no-image.svg'
/* 
===================
PAGE UPDATE ACTIONS
===================
*/

// Filtering auction items by type (English, Dutch, or All)
export async function filterAuctionItems({ commit }, type, isIndex) {
  commit(`updateAuctionType${isIndex ? 'Index' : 'Activity'}`, type)
}

// Filtering user activities
export async function filterActivities({ commit }, type) {
  commit('updateActivityType', type)
}

// Refreshing list of auctions 
export async function refreshCatalog({ commit }) {
  const response = await callAPI('auctions')
  if (response && response.success && Array.isArray(response.data)) {
    const allAuctions = response.data.map(item => AuctionList.parse(item))
    commit('setListings', allAuctions)
    return
  }
  console.error(`[actions:refreshCatalog] Error encountered.`)
}

/* 
====================
CURRENT USER ACTIONS
====================
*/
// Fetching CURRENT USER'S bids
export async function fetchMyBiddings({ commit }) {
  let lots = []

  const response = await callAPI('my-biddings/lots')
  if (response && response.success && Array.isArray(response.data)) {
    const lotPromises = response.data.map(async (item) => {
      const lot = LotsList.parse(item)

      const [auctionResponse, imageResponse] = await Promise.all([
        callAPI('auctions', lot.auction),
        callAPI('lot-images-by-lot', lot.id)
      ])

      if (auctionResponse && auctionResponse.success && auctionResponse.data) {
        const auctionData = auctionResponse.data instanceof AuctionList
          ? auctionResponse.data
          : AuctionList.parse(auctionResponse.data)

        lot.start_date = auctionData.start_date || null
        lot.end_date = auctionData.end_date || null
        lot.auction_type = auctionData.type || null
        lot.is_fiat = auctionData.is_fiat
      }

      if (imageResponse && imageResponse.success && Array.isArray(imageResponse.data)) {
        lot.image = imageResponse.data[0]?.image || null
      }

      return lot
    })

    lots = (await Promise.all(lotPromises)).filter(Boolean)
  } else console.error(`[actions:fetchMyBiddings] Error encountered: `)
  commit('setMyBiddings', lots)
}

export async function fetchMyAuctions({ commit }) {
  let auctions = []
  const response = await callAPI('my-auctions')

  // successfully fetched data
  if (response && response.success && response.data) {
    auctions = Array.isArray(response.data) ?
      response.data.map(item => (!item) ? null : item instanceof AuctionList ? item : AuctionList.parse(item)) :
      AuctionList.parse(response.data)
  } else { // error occurred
    console.error('Failed to update auction details.')
  }
  commit('setMyAuctions', auctions)
}

// Fetching CURRENT USER username
export async function fetchUsername({ commit }) {
  let username = ''
  let isArbiter = false

  console.log('[actions:fetchUsername] Fetching username from server...')    
  // Using PK to fetch user details from server
  const wallet = await getWallet()
  const publicKey = await wallet.BCH.getPublicKey(`0/0`)
  const response = await callAPI('user-details-by-public-key', publicKey)

  if (response && response.success && response.data) {
    console.log('[actions:fetchUsername] Response generated: ', response.data)

    // Set the user info like username and if they're an arbiter
    username = response.data.username
    isArbiter = response.data.is_arbiter
    commit('setHasNetworkError', false) // no network error
  } else console.error(`[actions:fetchUsername] Error encountered.`)
  commit('setUsername', username)
  commit('setIsArbiter', isArbiter)
}

/*
============================
FETCHING AUCTION INFORMATION
============================
*/

export async function fetchAuctionData({commit, getters}) {
  const auctionId = getters['auctionId']
  const response = await callAPI('auctions', Number(auctionId))
  if (response && response.success && response.data) {
    commit('setAuctionData', AuctionList.parse(response.data))
    return
  }
  console.error('Failed to fetch auction details from server.')
}

export async function fetchExistingAuctionData({commit, getters}) {
  const auctions = getters['listings']
  const auctionId = getters['auctionId']
  const auctionData = auctions.find(item => Number(item.id) === Number(auctionId))
  if (auctionData) {
    console.log('Existing data found')
    commit('setAuctionData', AuctionList.parse(auctionData))
    return
  }
  console.error('Failed to fetch existing auction details.')
}

export async function fetchAuctionLots({commit, getters}) {
  console.log('FETCH AUCTION LOTS STARTED')
  const auctionId = getters['auctionId']
  const auctionData = getters['auctionData']
  let lots = []
  let lotsImages = []

  const response = await callAPI('lots-by-auction', Number(auctionId))  
  if (response && response.success && response.data) {
    lots = await Promise.all(
      response.data.map(async (item) => {
        const lot = LotsList.parse(item)
        lot.start_date = auctionData?.start_date || null
        lot.end_date = auctionData?.end_date || null
        
        const imageResponse = await callAPI('lot-images-by-lot', lot.id, 'get')
        if (imageResponse.success && Array.isArray(imageResponse.data) && imageResponse.data.length > 0) {
          lotsImages.push(imageResponse.data)
          const firstImageRecord = imageResponse.data[0]
          
          lot.image = typeof firstImageRecord === 'object' && firstImageRecord !== null 
            ? (firstImageRecord.image || '') 
            : firstImageRecord
        } else lot.image = noImage
        return lot
      })
    )
  } else console.error('Failed to fetch lots.')

  commit('setAuctionLots', lots)
  commit('setAuctionLotsImages', lotsImages)
}

/*
========================
FETCHING LOT INFORMATION
========================
*/
export async function fetchLotData({commit, dispatch, getters}) {
  const lotId = getters['lotId']
  let lotData = {}
  let lotImages = []

  const response = await callAPI('lots', lotId)
  if (response && response.success && response.data) {
    lotData = LotsList.parse(response.data)
    const imageResponse = await callAPI('lot-images-by-lot', lotId, 'get')
    if (imageResponse && imageResponse.success && Array.isArray(imageResponse.data))
      lotImages = imageResponse.data.map(item => item.image)
    else console.error('Failed to fetch lot images.')
  } else console.error('Failed to fetch lot data.')

  // Also fetch the lot's bids if there's any
  await dispatch('fetchLotBids')
  const hasBid = getters['lotBids'].length > 0
  lotData.hasBid = hasBid

  // Commit the lot data
  commit('setLotData', lotData)
  commit('setLotImages', lotImages)
}

export async function fetchExistingLotData({commit, dispatch, getters}) {
  const lots = getters['auctionLots']
  const lotId = getters['lotId']
  let lotData = {}

  const existingLot = lots.find(lot => Number(lot.id) === Number(lotId))
  if (existingLot) lotData = LotsList.parse(existingLot)
  else console.error('Failed to fetch existing lot details.')

  // Checking if lotBids is actually our lot
  await dispatch('fetchExistingLotBids')
  const hasBid = getters['lotBids'].length > 0
  lotData.hasBid = hasBid

  commit('setLotData', lotData)
}

export async function fetchLotBids({commit, getters}) {
  const lotId = getters['lotId']
  let lotBids = []
  const response = await callAPI('biddings-by-lot', lotId, 'get')
  if (response && response.success && response.data && Array.isArray(response.data)) 
    lotBids = response.data.map(bid => BidsList.parse(bid))
  else console.error('Failed to fetch lot bids.')
  commit('setLotBids', lotBids)
}

// REVIEW IF NEEDED, FOR NOW WE KEEP
export async function fetchExistingLotBids({commit, getters}) {
  const lotId = getters['lotId']
  const lotBids = getters['lotBids']
  const existingLotBids = lotBids.filter(bid => Number(bid.lot) === Number(lotId))
  if (existingLotBids.length === 0) console.error('Failed to fetch existing lot bids.')
  commit('setLotBids', existingLotBids)
}

export async function fetchHighestBid({commit, getters}) {
  const lotId = getters['lotId']
  let highestBid = {}
  const response = await callAPI(['lots', 'highest-bid'], lotId, 'get')
  if (response && response.success && response.data) 
    highestBid = BidsList.parse(response.data)
  else console.error('Failed to fetch highest bid.')
  commit('setHighestBid', highestBid)
}

export async function fetchExistingHighestBid({commit, getters}) {
  const lotBids = getters['lotBids']
  const existingBid = lotBids.find(bid => bid.is_final_bid)
  let highestBid = {}
  if (existingBid) highestBid = BidsList.parse(existingBid)
  else console.error('Failed to fetch existing highest bid.')
  commit('setHighestBid', highestBid)
}

/* 
================================================================
FETCHING PUBLIC KEYS FOR CONTRACT CREATION/INSTANTIATION
================================================================
*/

// Fetching ArbiterPK for contract instantiation/creation
export async function fetchArbiterPublicKey({ commit }) {
  let arbiterPk = ''
  const response = await callAPI('arbiter-pk')
  if (response && response.success && response.data) 
    arbiterPk = response.data.arbiter_pk
  else console.error(`[actions:fetchArbiterPublicKey] Error encountered.`)
  commit('setArbiterPublicKey', arbiterPk)
}

// Fetching ServicerPK for contract instantiation/creation
export async function fetchServicerPublicKey({ commit }) {
  let servicerPk = ''
  const response = await callAPI('servicer-pk')
  if (response && response.success && response.data) 
    servicerPk = response.data.servicer_pk
  else console.error(`[actions:fetchServicerPublicKey] Error encountered.`)
  commit('setServicerPublicKey', servicerPk)
}