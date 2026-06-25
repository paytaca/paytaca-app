import { callAPI } from "./api"
import { getWallet } from "./payment"
import BCHJS from '@psf/bch-js'

const bchjs = new BCHJS()

/**
 * @name callContractFunction
 * @param {Integer} bidId - id of a specific bid
 * @returns tx_details or null
 * Call this when invoking release function (only for disputes)
 */
export async function callContractRelease(bidId) {
  const publicKey = await getPublicKey()

  const payload = {
    bid_id: bidId,
    user_pk: publicKey
  }

  try {
    const response = await callAPI('release', null, 'post', payload)

    if (response && response.success) {
      console.log('[callContractRelease] Successfully called release function from contract! Here are the details: ', response.data.tx_details)
      return response.data.tx_details
    }
    throw new Error()
  } catch (error) {
    return null
  } 
}


/**
 * @name callContractReturn
 * @param {Integer} bidId - id of a specific bid
 * @returns tx_details or null
 * Call this when invoking return function (when a user outbids someone)
 */
export async function callContractReturn(bidId) {
  const publicKey = await getPublicKey()
  const bidderPk = await getBidderPublicKey(bidId)

  const payload = {
    bid_id: bidId,
    user_pk: publicKey,
  }

  try {
    const response = await callAPI('return', null, 'post', payload)

    if (response && response.success) {
      console.log(`[callContractReturn] Successfully called return function from contract! Here are the details: ${response.data.tx_details}`)
      return response.data.tx_details
    }
    throw new Error()
  } catch (error) {
    return null
  } 
}

/**
 * @name callContractRefund
 * @param {Integer} bidId - id of a specific bid
 * @returns tx_details or null
 * Call this when invoking refund function (only for disputes)
 */
export async function callContractRefund(bidId) {
  const publicKey = await getPublicKey()
  const bidderPk = await getBidderPublicKey(bidId)

  const payload = {
    bid_id: bidId,
    user_pk: publicKey,
  }

  try {
    const response = await callAPI('refund', null, 'post', payload)

    if (response && response.success) {
      console.log(`[callContractRefund] Successfully called refund function from contract! Here are the details: ${response.data.tx_details}`)
      return response.data.tx_details
    }
    throw new Error()
  } catch (error) {
    return null
  } 
}


/**
 * @name getKeyPair
 * @param {Integer} addressIndex 
 * @returns public key 
 */
async function getPublicKey(addressIndex=0) {
  const wallet = await getWallet()
  const publicKey = await wallet.BCH.getPublicKey(`0/${addressIndex}`)

  return publicKey
}

/**
 * @name getBidderPublicKeyHash
 * @param {Integer} bidId 
 * @returns bidder's public key hash
 */
async function getBidderPublicKey(bidId) {
  try {
    const response = await callAPI('bidder-pk', bidId)

    if (response && response.success) 
      return response.data.bidder_pk
    throw new Error()

  } catch (error) {
    console.error('API Sync Error inside getBidderPublicKey:', error)
    return null
  } 
}