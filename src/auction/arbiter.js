import { callAPI } from "./api"
import { getWallet } from "./payment"
import BCHJS from '@psf/bch-js'

const bchjs = new BCHJS()

/**
 * @name callContractFunction
 * @param {Integer} lotId - id of a specific bid
 * @returns tx_details or null
 * Call this when invoking release function
 */
export async function callContractRelease(lotId) {
  const publicKey = await getPublicKey()

  const payload = {
    lot_id: lotId,
    user_pk: publicKey
  }

  try {
    const response = await callAPI('release', null, 'post', payload)

    if (response && response.success) {
      console.log(`[callContractRelease] Successfully called release function from contract! Here are the details: ${response.data.tx_details}`)
      return response.data.tx_details
    }
    throw new Error()
  } catch (error) {
    return null
  } 
}

/**
 * @name callContractRefund
 * @param {Integer} lotId - id of a specific bid
 * @returns tx_details or null
 * Call this when invoking refund function
 */
export async function callContractRefund(lotId) {
  const publicKey = await getPublicKey()
  const bidderPk = await getBidderPublicKey(lotId)

  const payload = {
    lot_id: lotId,
    user_pk: publicKey,
    bidder_pk: bidderPk
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
 * @param {Integer} lotId 
 * @returns bidder's public key hash
 */
async function getBidderPublicKey(lotId) {
  try {
    const response = await callAPI('bidder-pk', lotId)

    if (response && response.success) 
      return response.data.bidder_pk
    throw new Error()

  } catch (error) {
    console.error('API Sync Error inside getAuctioneerPublicKey:', error)
    return null
  } 
}