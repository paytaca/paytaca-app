import { callAPI } from 'src/auction/api'
import { AuctionList, LotsList, BidsList, DeliveryDetails } from 'src/auction/object'
import { getWallet } from '../../auction/payment'
import noImage from 'src/assets/no-image.svg'

const bidStatusTransitions = {
  Pending: ['Cancelled', 'Outbid', 'Highest', 'Winner'],
  Highest: ['Outbid', 'Winner'],
  Outbid: ['Winner'],
  Cancelled: [],
  Winner: [],
}
 
// ==============================
// INDEX/LISTINGS-RELATED ACTIONS
// ==============================

// FETCHES listings from the server
export async function fetchListings({ commit, dispatch }) {
  const response = await callAPI('auctions')
  if (response && response.success && Array.isArray(response.data)) {
    const listings = response.data.map(item => AuctionList.parse(item))
    commit('setListings', listings)
    commit('setListingsLastFetched')
  } else dispatch('printFailedFetch', 'listing')
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

// ========================
// ACTIVITY-RELATED ACTIONS
// ========================

// FETCHES current user's bids
export async function fetchMyBiddings({ commit, dispatch }) {
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
  } else dispatch
  commit('setMyBiddings', lots)
}

// FETCHES user's auctions
export async function fetchMyAuctions({ commit, dispatch }) {
  let myAuctions = []
  const response = await callAPI('my-auctions')

  // successfully fetched data
  if (response && response.success && response.data) {
    myAuctions = Array.isArray(response.data) 
      ? response.data.map(item => (!item) 
        ? null 
        : item instanceof AuctionList 
          ? item 
          : AuctionList.parse(item)) 
      : AuctionList.parse(response.data)
    commit('setMyAuctionsLastFetched')
  } else dispatch('printNotExisting', 'auction_data')
  commit('setMyAuctions', myAuctions)
}

// ===============================
// AUCTION-DETAILS-RELATED ACTIONS
// ===============================

// FETCHES auction data from the server
export async function fetchAuctionData({ commit, dispatch }, auctionId) {
  let auctionData = {}

  const response = await callAPI('auctions', Number(auctionId))
  if (response && response.success && response.data) {
    auctionData = AuctionList.parse(response.data)
    dispatch('fetchAuctionLots', auctionId)
    commit('setAuctionDataLastFetched')
  } else dispatch('printFailedFetch', 'auction data')
  commit('setAuctionData', auctionData)
}

// GETS existing auction data from listings
export async function fetchExistingAuctionData({ commit, getters, dispatch }, auctionId) {
  const existingAuction = getters['listings'].find(item => Number(item.id) === Number(auctionId))
  if (!existingAuction) dispatch('printNotExisting', 'auction data')
  commit('setAuctionData', AuctionList.parse(existingAuction ?? {}))
}

// FETCHES auction lots from the server
export async function fetchAuctionLots({ commit, getters, dispatch }, auctionId) {
  const { auctionData } = getters
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
    commit('setAuctionLotsLastFetched')
  } else dispatch('printFailedFetch', 'auction lots')

  commit('setAuctionLots', lots)
  commit('setAuctionLotsImages', lotsImages)
}

// ===================
// LOT-RELATED ACTIONS
// ===================

// FETCHES lot data from the server
export async function fetchLotData({ commit, dispatch }, lotId) {
  let lotData = {}
  let lotImages = []

  // Fetch lot data
  const response = await callAPI('lots', lotId)
  if (response && response.success && response.data) {
    lotData = LotsList.parse(response.data)
    const imageResponse = await callAPI('lot-images-by-lot', lotId, 'get')
    if (imageResponse && imageResponse.success && Array.isArray(imageResponse.data)){
      lotImages = imageResponse.data.map(item => item.image)
    } else dispatch('printFailedFetch', 'lot images')
    commit('setLotDataLastFetched')
  } else dispatch('printFailedFetch', 'lot data')

  commit('setLotData', lotData)
  commit('setLotImages', lotImages)
  await dispatch('fetchLotBids', lotId)
}

// GETS existing lot data from auctionLots
export async function fetchExistingLotData({ commit, getters, dispatch }, lotId) {
  const existingLot = getters['auctionLots'].find(lot => Number(lot.id) === Number(lotId))
  if (!existingLot) dispatch('printNotExisting', 'lot data')
  commit('setLotData', existingLot ? LotsList.parse(existingLot) : {})
  await dispatch('fetchExistingLotBids', lotId)
}

// FETCHES a lot's bids from the server
export async function fetchLotBids({ commit, dispatch }, lotId) {
  let lotBids = []
  const response = await callAPI('biddings-by-lot', lotId)
  if (response && response.success && response.data && Array.isArray(response.data)) {
    lotBids = response.data.map(bid => BidsList.parse(bid))
    commit('setLotBidsLastFetched')
  } else dispatch('printFailedFetch', 'lot bids')
  commit('setLotBids', lotBids)
}

// FETCHES a lot's existing bids from lotBids (REVIEW)
export async function fetchExistingLotBids({ commit, getters, dispatch }, lotId) {
  const existingLotBids = getters['lotBids'].filter(bid => Number(bid.lot) === Number(lotId))
  if (!existingLotBids.length) dispatch('printNotExisting', 'lot bids')
  commit('setLotBids', existingLotBids)
  commit('updateLotData', 'hasBid', existingLotBids.length > 0)
}

// FETCHES has bids for all lots
export async function fetchHasBidForLots(lotsArr) {
  const englishLots = (lotsArr || []).filter((lot) => lot.auction_type === 'English')

  return await Promise.all(englishLots.map(async (lot) => {
      const result = await callAPI(`lots/${lot.id}/highest-bid`)
      if (result.success && result.data && result.data.user !== null) 
        return 
      return false
  }))
}

// FETCHES a lot's highest bid
export async function fetchHighestBid({ commit, dispatch }, lotId) {
  const response = await callAPI(`lots/${lotId}/highest-bid`, null)
  if (!(response && response.success && response.data && ['Highest', 'Winner'].includes(response.data.status))) {
    dispatch('printFailedFetch', 'highest bid')
  }
  commit('setHighestBid', BidsList.parse(response.data ?? {}))
}

// GETS a lot's existing highest bid (REVIEW)
export async function fetchExistingHighestBid({ commit, getters, dispatch }) {
  if (!getters['lotBids'].length) {
    dispatch('printNotExisting', 'highest bid')
  }
  const highestBid = getters['lotBids'].reduce((latest, bid) =>
    new Date(bid.bidding_date) > new Date(latest.bidding_date) ? bid : latest
  )
  commit('setHighestBid', highestBid ? BidsList.parse(highestBid) : {})
}

// FETCHES delivery details of a lot from the server
export async function fetchDeliveryDetails({ commit, dispatch }, lotId) {
  let deliveryData = {}

  const response = await callAPI('delivery-trackings', lotId)
  if (response.success && response.data) {
    deliveryData = Array.isArray(response.data) ? response.data[0] : response.data
  } else dispatch('printFailedFetch', 'delivery details')
  commit('setDeliveryDetails', DeliveryDetails.parse(deliveryData))
  
  return {
    deliveryStatusIde: deliveryData?.status ?? null,
    deliveredDate: deliveryData?.delivered_date ?? null,
    isMarkedComplete: deliveryData?.mark_as_completed ?? false
  }
}

// PATCHES a lot's delviery details
export async function patchDeliveryDetails({ dispatch }, lotId, data) {
  const response = await callAPI('delivery-trackings', lotId, 'patch', data)
  if (!response.success) dispatch('printFailedPatch', 'delivery details')
}

export async function fetchDispute({ commit }) {
  const response = await callAPI('disputes-by-bid', winningBid.value?.id)
  if (response.success && response.data) {
    const data = Array.isArray(response.data) ? response.data[0] : response.data
    currentDispute.value = data || null
    isGrantedRefund.value = data?.is_granted_refund ?? false
    isGrantedReturn.value = data?.is_granted_return ?? false
  }
  console.warn('Could not fetch dispute:', err)   
}

// ================================================================
// FETCHING PUBLIC KEYS FOR CONTRACT CREATION/INSTANTIATION
// ================================================================

// Fetching ArbiterPK for contract instantiation/creation
export async function fetchArbiterPublicKey({ commit, dispatch }) {
  let arbiterPk = ''
  const response = await callAPI('arbiter-pk')
  if (response && response.success && response.data) {
    arbiterPk = response.data.arbiter_pk
    commit('setArbiterLastFetched')
  } else dispatch('printFailedFetch', 'arbiter public key')
  commit('setArbiterPublicKey', arbiterPk)
}

// Fetching ServicerPK for contract instantiation/creation
export async function fetchServicerPublicKey({ commit, dispatch }) {
  let servicerPk = ''
  const response = await callAPI('servicer-pk')
  if (response && response.success && response.data) {
    servicerPk = response.data.servicer_pk
    commit('setServicerLastFetched')
  } else dispatch('printFailedFetch', 'servicer public key')
  commit('setServicerPublicKey', servicerPk)
}


// FETCHES current user's username
export async function fetchUsername({ commit, dispatch }) {
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
  } else dispatch('printFailedFetch', 'user details')

  commit('setUsername', username)
  commit('setIsArbiter', isArbiter)
}


export async function printFailedFetch({ getters }, itemName) {
  const { hasNetworkError } = getters
  if (hasNetworkError) console.error(`Failed to fetch ${itemName} from the server.`)
  else console.log(`Server does not have requested ${itemName}.`)
}

export async function printFailedPatch({ getters }, itemName) {
  const { hasNetworkError } = getters
  if (hasNetworkError) console.error(`Failed to patch ${itemName} to the server.`)
  else console.log(`Network error occurred when requesting patch for ${itemName}.`)
}

export async function printNotExisting(itemName) {
  console.error(`Failed to fetch existing ${itemName} as it DNE.`)
}