import { callAPI } from 'src/auction/api'
import { AuctionList, LotsList, BidsList } from 'src/auction/object'
import { getWallet } from '../../auction/payment'
import noImage from 'src/assets/no-image.svg'

const bidStatusTransitions = {
  Pending: ['Cancelled', 'Outbid', 'Highest', 'Winner'],
  Highest: ['Outbid', 'Winner'],
  Outbid: ['Winner'],
  Cancelled: [],
  Winner: [],
}
/* 
===================
PAGE UPDATE ACTIONS
===================
*/

// Filtering auction items by type (English, Dutch, or All)
export async function filterAuctionItems({ commit }, { type, isIndex=false }) {
  commit(`updateAuctionType${isIndex ? 'Index' : 'Activity'}`, type)
}

export async function filterAuctionLots({ commit }, { type }) {
  commit('updateLotCategory', type)
}

// Filtering user activities
export async function filterActivities({ commit }, type) {
  commit('updateActivityType', type)
}

// Refreshing list of listings 
export async function fetchListings({ commit }) {
  const response = await callAPI('auctions')
  if (response && response.success && Array.isArray(response.data)) {
    const listings = response.data.map(item => AuctionList.parse(item))
    commit('setListings', listings)
    commit('setListingsLastFetched')
  } else 
  console.error(`[actions:fetchListings] Error encountered.`)
}

export async function updateListingFromWebsocket({ commit, state }, auctionData) {
  if (!auctionData?.id) return
  let data = auctionData

  // only auction id
  if (Object.keys(auctionData).length === 1) {
    const response = await callAPI('auctions', auctionData.id)
    if (!response?.success || !response.data) return
    data = response.data
  }

  // auction exists in listings
  if (state.listings.some(auction => Number(auction.id) === Number(data.id))) {
    commit('updateListing', data)
  } else {
    // auction DNE
    commit('addListing', AuctionList.parse(data))
  }

  commit('mergeAuctionData', data)
  commit('updateMyAuction', data)
}

export function removeListingFromWebsocket({ commit }, auctionId) {
  if (auctionId === undefined || auctionId === null) return
  commit('removeListing', auctionId)
}

export async function updateMyAuctionFromWebsocket({ commit, state }, auctionData) {
  if (!auctionData?.id) return
  let data = auctionData

  // only auction id
  if (Object.keys(auctionData).length === 1) {
    const response = await callAPI('auctions', auctionData.id)
    if (!response?.success || !response.data) return
    data = response.data
  }

  if (state.myAuctions.some(
    auction => Number(auction.id) === Number(data.id)
  )) {
    commit('updateMyAuction', data)
  } else {
    commit('addMyAuction', AuctionList.parse(data))
  }

  commit('updateListing', data)
  commit('mergeAuctionData', data)
}

export function removeMyAuctionFromWebsocket({ commit }, auctionId) {
  if (auctionId === undefined || auctionId === null) return
  commit('removeMyAuction', auctionId)
}

export function updateMyBiddingFromWebsocket({ commit }, biddingData) {
  if (!biddingData?.id || !biddingData?.lot) return
  commit('updateMyBidding', biddingData)
}

export function updateBidFromWebsocket({ commit, state, rootGetters }, biddingData) {
  if (!biddingData?.id || !biddingData?.lot) return
  if (Number(biddingData.lot) !== Number(state.lotId)) return

  const existingBid = state.lotBids.find(
    bid => Number(bid.id) === Number(biddingData.id)
  )
  if (
    existingBid?.status
    && biddingData.status
    && existingBid.status !== biddingData.status
    && !bidStatusTransitions[existingBid.status]?.includes(biddingData.status)
  ) return

  commit('updateLotBid', BidsList.parse(biddingData))
  const walletHash = rootGetters['global/getWallet']('bch')?.walletHash
  if (biddingData.user === walletHash) commit('updateMyBidding', biddingData)

  if (['Highest', 'Winner'].includes(biddingData.status)) {
    commit('setHighestBid', BidsList.parse(biddingData))
  } else if (
    ['Cancelled', 'Outbid'].includes(biddingData.status)
    && Number(state.highestBid.id) === Number(biddingData.id)
  ) {
    commit('setHighestBid', {})
  }

  if (biddingData.status === 'Highest') {
    commit('mergeLotData', {
      id: biddingData.lot,
      threshold_bid_bch: Number(biddingData.bid_price_bch),
      threshold_bid_fiat: Number(biddingData.bid_price_fiat),
    })
  }
}

export function cancelBidsFromWebsocket({ commit }, bidIds) {
  if (!Array.isArray(bidIds) || !bidIds.length) return
  commit('cancelLotBids', bidIds)
}

export function updateAuctionFromWebsocket({ commit }, auctionData) {
  if (!auctionData?.id) return
  commit('mergeAuctionData', auctionData)
  commit('updateListing', auctionData)
  commit('updateMyAuction', auctionData)
}

export function removeAuctionFromWebsocket({ commit }, auctionId) {
  if (auctionId === undefined || auctionId === null) return
  commit('removeAuctionData', auctionId)
  commit('removeListing', auctionId)
  commit('removeMyAuction', auctionId)
}

export function updateLotFromWebsocket({ commit }, lotData) {
  if (!lotData?.id) return
  commit('mergeLotData', lotData)
}

export function updateLotStatusFromWebsocket({ commit }, lotData) {
  if (!lotData?.id || !lotData?.status) return
  commit('updateLotStatus', lotData)
}

export function removeLotFromWebsocket({ commit }, lotId) {
  if (lotId === undefined || lotId === null) return
  commit('removeLotData', lotId)
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
    commit('setMyBiddingsLastFetched')

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
  let myAuctions = []
  const response = await callAPI('my-auctions')

  // successfully fetched data
  if (response && response.success && response.data) {
    commit('setMyAuctionsLastFetched')
    myAuctions = Array.isArray(response.data) ?
      response.data.map(item => (!item) ? null : item instanceof AuctionList ? item : AuctionList.parse(item)) :
      AuctionList.parse(response.data)
  } else { // error occurred
    console.error('Failed to update auction details.')
  }
  commit('setMyAuctions', myAuctions)
}

// Fetching CURRENT USER username
export async function fetchUsername({ commit }) {
  let username = ''
  let isArbiter = false

  // Using PK to fetch user details from server
  const wallet = await getWallet()
  const publicKey = await wallet.BCH.getPublicKey(`0/0`)
  const response = await callAPI('user-details-by-public-key', publicKey)

  if (response && response.success && response.data) {
    username = response.data.username ?? ''
    isArbiter = response.data.is_arbiter ?? false
    commit('setHasNetworkError', false) 
  } else console.error(`[actions:fetchUsername] Error encountered.`)

  commit('setUsername', username)
  commit('setIsArbiter', isArbiter)
}

/*
============================
FETCHING AUCTION INFORMATION
============================
*/

export async function fetchAuctionData({commit, dispatch}, auctionId) {
  const response = await callAPI('auctions', Number(auctionId))
  let auctionData = {}
  if (response && response.success && response.data) {
    auctionData = AuctionList.parse(response.data)
    dispatch('fetchAuctionLots', auctionId)
    commit('setAuctionDataLastFetched')
  } else console.error('Failed to fetch auction details from server.')
  commit('setAuctionData', auctionData)
}

export async function fetchExistingAuctionData({commit, getters}, auctionId) {
  const auctionData = getters['listings'].find(item => Number(item.id) === Number(auctionId))
  commit('setAuctionData', (auctionData) ? AuctionList.parse(auctionData) : {})
  if (!auctionData) console.error('Failed to fetch existing auction details.')
}

export async function fetchAuctionLots({commit, getters}, auctionId) {
  const { auctionData } = getters
  let lots = []
  let lotsImages = []

  const response = await callAPI('lots-by-auction', Number(auctionId))  
  if (response && response.success && response.data) {
    commit('setAuctionLotsLastFetched')

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
export async function fetchLotData({commit, dispatch}, lotId) {
  let lotData = {}
  let lotImages = []

  // Fetch lot data
  const response = await callAPI('lots', lotId)
  if (response && response.success && response.data) {
    commit('setLotDataLastFetched')

    lotData = LotsList.parse(response.data)
    const imageResponse = await callAPI('lot-images-by-lot', lotId, 'get')
    if (imageResponse && imageResponse.success && Array.isArray(imageResponse.data)){
      lotImages = imageResponse.data.map(item => item.image)
    } else console.error('Failed to fetch lot images.')

  } else console.error('Failed to fetch lot data.')

  commit('setLotData', lotData)
  commit('setLotImages', lotImages)

  await dispatch('fetchLotBids')

  // Commit the lot data
}

export async function fetchExistingLotData({commit, getters, dispatch}) {
  const { lotId, auctionLots } = getters
  const existingLot = auctionLots.find(lot => Number(lot.id) === Number(lotId))
  commit('setLotData', LotsList.parse(existingLot ?? {}))
  await dispatch('fetchExistingLotBids')
}

export async function fetchLotBids({commit}, lotId) {
  let lotBids = []
  const response = await callAPI('biddings-by-lot', lotId, 'get')
  if (response && response.success && response.data && Array.isArray(response.data)) {
    lotBids = response.data.map(bid => BidsList.parse(bid))
    commit('setLotBidsLastFetched')
  } else console.error('Failed to fetch lot bids.')
  commit('setLotBids', lotBids)
}

// REVIEW IF NEEDED, FOR NOW WE KEEP
export async function fetchExistingLotBids({ commit, getters }) {
  const { lotId, lotBids } = getters
  const existingLotBids = lotBids.filter(
    bid => Number(bid.lot) === Number(lotId)
  )
  
  if (!existingLotBids.length) console.error('Failed to fetch existing lot bids.')
  commit('setLotBids', existingLotBids)
  commit('updateLotData', 'hasBid', existingLotBids.length > 0)
}

export async function fetchHighestBid({commit}, lotId) {
  const response = await callAPI(`lots/${lotId}/highest-bid`, null, 'get')
  commit('setHighestBid', 
    response && response.success && response.data
    && ['Highest', 'Winner'].includes(response.data.status)
    ? BidsList.parse(response.data)
    : {}
  )
}

export async function fetchExistingHighestBid({ commit, getters }) {
  const existingBid = getters['lotBids'].find(bid => bid.is_final_bid)
  commit('setHighestBid', existingBid ? BidsList.parse(existingBid) : {})
}


export async function fetchDeliveryTracking({commit}, lotId) {
  const data = {
    
  }
  const res = await callAPI('delivery-trackings', lotId)
  if (res.success && res.data) {
    const data = Array.isArray(res.data) ? res.data[0] : res.data
    deliveryStatusId.value = data?.status ?? null
    deliveredDate.value = data?.delivered_date ?? null
    isMarkedComplete.value = data?.mark_as_completed ?? false
  } else console.warn('Could not fetch delivery tracking.')
}

export async function fetchDispute({commit}) {
  const res = await callAPI('disputes-by-bid', winningBid.value?.id)
  if (res.success && res.data) {
    const data = Array.isArray(res.data) ? res.data[0] : res.data
    currentDispute.value = data || null
    isGrantedRefund.value = data?.is_granted_refund ?? false
    isGrantedReturn.value = data?.is_granted_return ?? false
  }
  console.warn('Could not fetch dispute:', err)
    
}

export async function fetchHasBidForLots(lotsArr) {
  const englishLots = (lotsArr || []).filter((lot) => lot.auction_type === 'English')

  return await Promise.all(englishLots.map(async (lot) => {
      const result = await callAPI(`lots/${lot.id}/highest-bid`)
      if (result.success && result.data && result.data.user !== null) {
        return 
      }
      return false
  }))
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
  if (response && response.success && response.data) {
    arbiterPk = response.data.arbiter_pk
    commit('setArbiterLastFetched')
  } else console.error(`[actions:fetchArbiterPublicKey] Error encountered.`)
  commit('setArbiterPublicKey', arbiterPk)
}

// Fetching ServicerPK for contract instantiation/creation
export async function fetchServicerPublicKey({ commit }) {
  let servicerPk = ''
  const response = await callAPI('servicer-pk')
  if (response && response.success && response.data) {
    servicerPk = response.data.servicer_pk
    commit('setServicerLastFetched')
  } else console.error(`[actions:fetchServicerPublicKey] Error encountered.`)
  commit('setServicerPublicKey', servicerPk)
}
