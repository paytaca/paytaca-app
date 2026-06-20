import { callAPI } from "./api"
import { getWallet } from "./payment"

/**
 * @name callContractFunction
 * @param {String} funcName - 'release' or 'refund'
 * @param {Integer} bidId - id of a specific bid
 * @returns tx_details or null
 * Call this when invoking release/refund function
 */
export async function callContractFunction(funcName, bidId) {
  const { wif, publicKey } = await getKeyPair()

  const payload = {
    bid_id: bidId,
    user_pk: publicKey,
    wif: wif
  }

  try {
    const response = await callAPI(funcName, null, 'post', payload)

    if (response && response.success) {
      console.log(`[callContractFunction] Successfully called ${funcName} function from contract! Here are the details: ${response.data.tx_details}`)
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
 * @returns public key and private key wif in an object
 */
async function getKeyPair(addressIndex=0) {
  const wallet = await getWallet()
  const privateKeyWif = await wallet.BCH.getPrivateKey(`0/${addressIndex}`) 
  const publicKey = await wallet.BCH.getPublicKey(`0/${addressIndex}`)

    return { 
      wif: privateKeyWif, 
      publicKey
    }
}


