import { callAPI } from 'src/auction/api'
import { AuctionList, LotsList, BidsList, DisputeList, DisputeDetails, DeliveryDetails } from 'src/auction/object'
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

// UPDATES bid from the websocket
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

  commit('updateLotBid', BidsList.parse(biddingData, Number(biddingData.lot)))
  const walletHash = rootGetters['global/getWallet']('bch')?.walletHash
  if (biddingData.bidder === walletHash) {
    commit('updateMyBidding', biddingData)
  }

  if (['Highest', 'Winner'].includes(biddingData.status))
    commit('setHighestBid', BidsList.parse(biddingData, Number(biddingData.lot)))
  else if (
    ['Cancelled', 'Outbid'].includes(biddingData.status) 
    && Number(state.highestBid.id) === Number(biddingData.id)
  ) commit('setHighestBid', {})
  
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
      const [auctionResponse, imageResponse] = await Promise.all([
        callAPI('auctions', item.auction),
        callAPI('lot-images-by-lot', item.id)
      ])

      let auctionData = item.auction
      if (auctionResponse && auctionResponse.success && auctionResponse.data) {
        auctionData = auctionResponse.data instanceof AuctionList
          ? auctionResponse.data
          : AuctionList.parse(auctionResponse.data)
      }
      const lot = LotsList.parse(item, auctionData)
      lot.start_date = auctionData?.start_date || null
      lot.end_date = auctionData?.end_date || null
      lot.auction_type = auctionData?.type || null
      lot.is_fiat = auctionData?.is_fiat ?? true

      if (imageResponse && imageResponse.success && Array.isArray(imageResponse.data)) {
        lot.image = imageResponse.data[0]?.image || null
      }

      return lot
    })

    lots = (await Promise.all(lotPromises)).filter(Boolean)
  } else dispatch('printFailedFetch', 'biddings')
  commit('setMyBiddings', lots)
}

// FETCHES user's auctions
export async function fetchMyAuctions({ commit, dispatch }) {
  let myAuctions = []
  const response = await callAPI('my-auctions')

  // successfully fetched data
  if (response && response.success && Array.isArray(response.data)) {
    myAuctions = response.data
      .filter(Boolean)
      .map(item => item instanceof AuctionList ? item : AuctionList.parse(item))
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
  let auctionData = getters.auctionData
  let lots = []
  let lotsImages = []

  if (Number(auctionData?.id) !== Number(auctionId)) {
    auctionData = getters.listings.find(item => Number(item.id) === Number(auctionId))
    if (!auctionData) {
      const auctionResponse = await callAPI('auctions', Number(auctionId))
      auctionData = auctionResponse.success && auctionResponse.data
        ? AuctionList.parse(auctionResponse.data)
        : null
    }
  }

  const response = await callAPI('lots-by-auction', Number(auctionId))  
  if (response && response.success && Array.isArray(response.data)) {
    lots = await Promise.all(
      response.data.map(async (item) => {
        const lot = LotsList.parse(item, auctionData)
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
    lotData = LotsList.parse(response.data, response.data.auction)
    const imageResponse = await callAPI('lot-images-by-lot', lotId, 'get')
    if (imageResponse && imageResponse.success && Array.isArray(imageResponse.data))
      lotImages = imageResponse.data.map(item => item.image)
    else dispatch('printFailedFetch', 'lot images')
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
  if (response?.success && Array.isArray(response.data)) {
    lotBids = response.data.map(bid => BidsList.parse(bid, Number(lotId)))
    const highestBid = lotBids.find(bid => ['Highest', 'Winner'].includes(bid.status))
    commit('setHighestBid', highestBid ?? {})
    commit('setLotBidsLastFetched')
    commit('setHighestBidLastFetched')
  } else {
    dispatch('printFailedFetch', 'lot bids')
    commit('setHighestBid', {})
  }
  commit('setLotBids', lotBids)
}

// FETCHES a lot's existing bids from lotBids (REVIEW)
export async function fetchExistingLotBids({ commit, getters, dispatch }, lotId) {
  const existingLotBids = getters['lotBids'].filter(bid => Number(bid.lot) === Number(lotId))
  if (!existingLotBids.length) dispatch('printNotExisting', 'lot bids')
  commit('setLotBids', existingLotBids)
  commit('updateLotData', { attribute_name: 'hasBid', data: existingLotBids.length > 0 })
}

// FETCHES has bids for all lots
export async function fetchHasBidForLots(_, lotsArr) {
  const englishLots = (lotsArr || []).filter((lot) =>
    (lot.auction?.type ?? lot.auction_type) === 'English'
  )
  const entries = await Promise.all(englishLots.map(async (lot) => {
    const result = await callAPI(`lots/${lot.id}/highest-bid`)
    return [lot.id, Boolean(result.success && result.data?.bidder)]
  }))
  return Object.fromEntries(entries)
}

// FETCHES a lot's highest bid
export async function fetchHighestBid({ commit, dispatch, state }, lotId) {
  const targetLotId = lotId ?? state.lotId
  if (!targetLotId) {
    dispatch('printNotExisting', 'lot id')
    commit('setHighestBid', {})
    return
  }
  const response = await callAPI(`lots/${targetLotId}/highest-bid`, null)
  const hasHighestBid = response?.success
    && response.data
    && ['Highest', 'Winner'].includes(response.data.status)
  if (!hasHighestBid)
    dispatch('printFailedFetch', 'highest bid')
  commit('setHighestBid', hasHighestBid ? BidsList.parse(response.data, Number(targetLotId)) : {})
  commit('setHighestBidLastFetched')
}

// GETS a lot's existing highest bid (REVIEW)
export async function fetchExistingHighestBid({ commit, getters, dispatch }) {
  const highestBids = getters['lotBids'].filter(bid => ['Highest', 'Winner'].includes(bid.status))
  if (!highestBids.length) {
    dispatch('printNotExisting', 'highest bid')
    commit('setHighestBid', {})
    return
  }
  const highestBid = highestBids.reduce((latest, bid) =>
    new Date(bid.bidding_date) > new Date(latest.bidding_date) ? bid : latest
  )
  commit('setHighestBid', BidsList.parse(highestBid, highestBid.lot))
}

// FETCHES delivery details of a lot from the server
export async function fetchDeliveryDetails({ commit, dispatch }, lotId) {
  const response = await callAPI('delivery-details-by-lot', lotId)
  if (!response.success || !response.data) {
    dispatch('printFailedFetch', 'delivery details')
    commit('setDeliveryData', {})
    return null
  }

  const deliveryData = response.data
  const [eventsResponse, latestEventResponse] = await Promise.all([
    callAPI('delivery-events-by-tracking-id', deliveryData.tracking_id),
    callAPI('latest-delivery-event-by-tracking-id', deliveryData.tracking_id)
  ])
  const parsedDelivery = DeliveryDetails.parse({
    ...deliveryData,
    delivery_events: eventsResponse.success && Array.isArray(eventsResponse.data)
      ? eventsResponse.data
      : [],
    status: latestEventResponse.success ? latestEventResponse.data?.status : null
  })
  commit('setDeliveryData', parsedDelivery)
  commit('setDeliveryDataLastFetched')
  return parsedDelivery
}

// PATCHES a lot's delivery details
export async function patchDeliveryDetails({ dispatch, getters }, payload) {
  const { trackingId: payloadTrackingId, tracking_id: payloadTrackingIdAlt, data: payloadData, ...details } = payload ?? {}
  const trackingId = payloadTrackingId
    ?? payloadTrackingIdAlt
    ?? getters.deliveryData?.tracking_id
  const data = payloadData ?? details
  if (!trackingId) {
    dispatch('printNotExisting', 'delivery tracking id')
    return null
  }

  const response = await callAPI('delivery-details', trackingId, 'patch', data)
  if (!response.success) dispatch('printFailedPatch', 'delivery details')
  return response
}

// CREATES delivery event of a lot
export async function createDeliveryEvent({ dispatch, getters }, { status, description='N/A', location='Default' }) {
  const { deliveryData } = getters

  const payload = {
    delivery: deliveryData?.tracking_id,
    status,
    description,
    location,
    event_date: new Date().toISOString()
  }

  if (!payload.delivery) {
    dispatch('printNotExisting', 'delivery tracking id')
    return null
  }

  const response = await callAPI('delivery-event', null, 'post', payload)
  if (!response.success) dispatch('printFailedPost', 'delivery event')
  return response
}

// FETCHES bid dispute
export async function fetchDispute({ commit, dispatch }, disputeId) {
  const response = await callAPI('disputes', disputeId)
  if (!response.success || !response.data) {
    dispatch('printFailedFetch', 'dispute')
    commit('setDisputeData', {})
    return null
  }

  const dispute = await getDisputeDetails(response.data)
  commit('setDisputeData', dispute)
  commit('setDisputeDataLastFetched')
  return dispute
}

// Fetches and parses the dispute records shown to the arbiter.
export async function fetchDisputes({ dispatch }) {
  const response = await callAPI('disputes')
  if (!response.success || !Array.isArray(response.data)) {
    dispatch('printFailedFetch', 'disputes')
    return []
  }

  return Promise.all(response.data.map(async dispute => {
    const lotResponse = await callAPI('lots', dispute.lot)
    return DisputeList.parse({
      ...dispute,
      lotId: dispute.lot,
      auctionId: lotResponse.success ? lotResponse.data?.auction : null
    })
  }))
}

// Fetches and stores dispute details for a lot.
export async function fetchDisputeByLot({ commit, dispatch }, lotId) {
  const response = await callAPI('disputes-by-lot', lotId)
  const disputeData = Array.isArray(response.data) ? response.data[0] : response.data
  if (!response.success || !disputeData) {
    if (response.status !== 404) dispatch('printFailedFetch', 'dispute')
    commit('setDisputeData', {})
    return null
  }

  const dispute = await getDisputeDetails(disputeData)
  commit('setDisputeData', dispute)
  commit('setDisputeDataLastFetched')
  return dispute
}

// Fetches dispute details associated with a bid’s lot.
export async function fetchDisputeByBid({ dispatch }, lotId) {
  return dispatch('fetchDisputeByLot', lotId)
}

// Combines dispute data with related auction, user, contract, and bid details.
async function getDisputeDetails(disputeData) {
  const lotId = disputeData.lot
  const lotResponse = await callAPI('lots', lotId)
  const auctionId = lotResponse.success ? lotResponse.data?.auction : null
  const [auctioneerResponse, bidderResponse, contractResponse, bidResponse] = await Promise.all([
    callAPI('user-details', disputeData.auctioneer),
    callAPI('user-details', disputeData.bidder),
    callAPI('contract-bch-address', lotId),
    callAPI(`lots/${lotId}/highest-bid`)
  ])

  const userDetails = (response, key) => response.success && response.data
    ? {
        [key]: response.data.user,
        username: response.data.username,
        address: response.data.bch_address
      }
    : null

  return DisputeDetails.parse({
    ...disputeData,
    lotId,
    auctionId,
    auctioneer: userDetails(auctioneerResponse, 'auctioneer'),
    bidder: userDetails(bidderResponse, 'bidder'),
    contract_address: contractResponse.success ? contractResponse.data?.bch_address : null,
    bid: bidResponse.success ? bidResponse.data?.id : null,
    bid_price_bch: bidResponse.success ? bidResponse.data?.bid_price_bch : 0
  })
}

// ========================
// CONTRACT-RELATED ACTIONS
// ========================

/**
 * @name callContractFunction
 * @param {Integer} lotId
 * @param {String} functionName
 * @param {String} publicKey
 * @returns contract transaction details
 */
export async function callContractFunction({ dispatch }, { lotId, disputeId, functionName, publicKey }) {
  const response = await callAPI(
    functionName.toLowerCase(),
    null,
    'post',
    {
      lot_id: lotId,
      dispute_id: disputeId,
      user_pk: publicKey
    }
  )

  if (response && response.success && response.data && response.data.tx_details) {
    console.log(`[callContractFunction] Successfully called ${functionName} function from contract! Here are the details: `, response.data.tx_details)
    return response.data.tx_details
  }
  dispatch('printFailedContractFunctionCall', functionName)
  
  const error = new Error(response?.error || `Failed to call ${functionName}.`)
  error.ambiguous = (
    response?.status == null 
    || response.status === 409 
    || response.status >= 500
  )
  throw error
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
    commit('setServicerLastFetched', Date.now())
  } else dispatch('printFailedFetch', 'servicer public key')
  commit('setServicerPublicKey', servicerPk)
}

// Fetching auctioneerPK for contract instantiation/creation
export async function fetchAuctioneerPublicKey({ commit, dispatch }, lotId) {
  let auctioneerPK = ''
  const response = await callAPI(`auctioneer-pk`, lotId)
  if (response && response.success && response.data) {
    auctioneerPK = response.data.auctioneer_pk
  } else dispatch('printFailedFetch', 'auctioneer public key')
  commit('setAuctioneerPublicKey', auctioneerPK)
}

// FETCHES current user's username
export async function fetchUsername({ commit, dispatch, rootGetters }) {
  let username = ''
  let isArbiter = false

  const walletHash = rootGetters['global/getWallet']('bch')?.walletHash
  if (!walletHash) {
    commit('setUsername', username)
    commit('setIsArbiter', isArbiter)
    return
  }

  const response = await callAPI('user-details', walletHash)
  if (response && response.success && response.data) {
    username = response.data.username ?? ''
    isArbiter = response.data.is_arbiter ?? false
    commit('setHasNetworkError', false) 
  } else dispatch('printFailedFetch', 'user details')

  console.log('isArbiter: ', isArbiter)
  commit('setUsername', username)
  commit('setIsArbiter', isArbiter)
}

// UPDATES the wallet's username in the server (or adds a new username)
export async function updateUsername({ commit, dispatch, getters }, { newUsername, walletHash, credentials }) {
  const storedUsername = getters['username']
  const method = storedUsername ? 'patch' : 'post'
  
  // api data
  const data = {
    username: newUsername,
    ...(method === 'post' && { user: walletHash } ),
    ...(method === 'post' && { bch_address: credentials.address } )
  } 

  const response = await callAPI('user-details', method === 'patch' ? walletHash : null, method, data)
  const hasNetworkError = getters['hasNetworkError']
  if (response.success) commit('setUsername', newUsername)
  else dispatch(method === 'post' ? 'printFailedPost' : 'printFailedPatch', 'username')

  return {
    username: newUsername,
    success: response.success,
    status: response.status,
    error: response.error,
    errorData: response.errorData,
    method,
    hasNetworkError
  }
}


// ==================
// PRINTING FUNCTIONS 
// ==================

// Logs a failed auction data fetch.
export async function printFailedFetch({ getters }, itemName) {
  const { hasNetworkError } = getters
  if (hasNetworkError) console.error(`Failed to fetch ${itemName} from the server.`)
  else console.log(`Server does not have requested ${itemName}.`)
}

// Logs a failed auction data update.
export async function printFailedPatch({ getters }, itemName) {
  const { hasNetworkError } = getters
  if (hasNetworkError) console.error(`Failed to patch ${itemName} to the server.`)
  else console.log(`Network error occurred when requesting patch for ${itemName}.`)
}

// Logs a failed auction data creation request.
export async function printFailedPost({ getters }, itemName) {
  const { hasNetworkError } = getters
  if (hasNetworkError) console.error(`Network error occurred when requesting post for ${itemName}.`)
  else console.log(`Failed to create ${itemName} to the server.`) 
}

// Logs a failed contract function request.
export async function printFailedContractFunctionCall({ getters }, functionName) {
  const { hasNetworkError } = getters
  if (hasNetworkError) console.error(`Failed to call ${functionName} contract function due to a network error.`)
  else console.error(`Failed to call ${functionName} contract function.`)
}

// Logs when the requested auction data is unavailable.
export async function printNotExisting(itemName) {
  console.error(`Failed to fetch existing ${itemName} as it DNE.`)
}
