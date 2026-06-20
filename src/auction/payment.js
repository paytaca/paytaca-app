import AuctionEscrowContract from './contract'
import { getChangeAddress } from 'src/utils/send-page-utils'
import { loadWallet } from 'src/wallet'
import { callAPI } from './api'
import { Store } from 'src/store/'

/**
 * @name walletToContract
 * @param {Integer} bidId - id of the user's official bid 
 * Call this when invoking any wallet-to-contract functions
 */
export async function walletToContract(amountBCH, bidId) {
  // public keys
  try {
    const { arbiterPk, bidderPk, auctioneerPk, servicerPk } = await getAuctionPublicKeys(bidId)

    // make the contract here
    const contractResult = await creatContract(arbiterPk, bidderPk, auctioneerPk, servicerPk, 1000, 1000)
    if (!contractResult) throw new Error("Contract failed to be created.")

    const payload = {
      bid_id: bidId,
      arbiter_pk: arbiterPk,
      servicer_pk: servicerPk,
      arbitration_fee: contractResult.contract.fees.arbitrationFee,
      platform_fee: contractResult.contract.fees.platformFee
    }

    const response = await callAPI('create-contract', null, 'post', payload)
    if (!response || !response.success) {
      throw new Error("Contract details failed to be saved in the database.")
    } 

    const txid = await sendBCHToContract(contractResult.contract, amountBCH)
    if (!txid) throw new Error("Failed to transfer BCH to contract.")
    console.log("[walletToContract] Successfully transferred BCH to contract! txid = ", txid)

  } catch (error) {
    console.error("[walletToContract]", error)
  }
}


/**
 * !!! DO NOT CALL THIS !!!
 * @name createContract
 * @param {String} arbiterPk 
 * @param {String} bidderPk 
 * @param {String} auctioneerPk 
 * @param {String} servicerPk 
 * @param {Integer} platformFee 
 * @param {Integer} arbitrationFee 
 * @returns contract and is_created (boolean)
 */
export async function creatContract(arbiterPk, bidderPk, auctioneerPk, servicerPk, platformFee, arbitrationFee) {
  const publicKeys = {
    arbiter: arbiterPk,
    bidder: bidderPk,
    auctioneer: auctioneerPk,
    servicer: servicerPk
  }

  const fees = {
    platformFee,
    arbitrationFee
  }

  // check if wallet is in chipnet
  const isChipnet = Store.getters['global/isChipnet']

  // creation of contract
  const contract = new AuctionEscrowContract(
    publicKeys,
    fees,
    1,
    isChipnet 
  )

  return {
    "contract": contract,
    "is_created": (contract.contract) ? true : false
  }
}

/**
 * !!! DO NOT CALL THIS !!!
 * @name sendBCHToContract
 * @param {*} contract 
 * @param {Float} bchAmount - must be in BCH (convert fiats to BCH)
 * @returns 
 */
export async function sendBCHToContract(contract, bchAmount) {
  // change address 
  const changeAddress = await getChangeAddress('bch')

  // wallet info
  const wallet = await getWallet()
  
  const txid = contract.sendAmountToAddress(
    changeAddress,
    bchAmount,
    undefined,
    wallet,
    contract
  )
  return txid
}

// ===== HELPER FUNCTIONS =====
// Gets the public keys needed for the auction contract
async function getAuctionPublicKeys(bidId) {
  const bidderPk = await getBidderPublicKey()
  const auctioneerPk = await getAuctioneerPublicKey(bidId)
  const arbiterPk = Store.getters['auction/arbiterPublicKey']
  const servicerPk = Store.getters['auction/servicerPublicKey']

  return {
    bidderPk,
    auctioneerPk,
    arbiterPk,
    servicerPk
  }
}

// Fetches the auctioneer public key from the server via api
async function getAuctioneerPublicKey(bidId) {
  try {
    const response = await callAPI('auctioneer-pk', bidId)

    if (response && response.success) 
      return response.data.auctioneer_pk

    return null
    
  } catch (error) {
    console.error('API Sync Error inside getAuctioneerPublicKey:', error)
    return null
  } 
}

// Gets the bidder's wallet
export async function getWallet() {
  const walletIndex = Store.getters['global/getWalletIndex']
  const wallet = await loadWallet('BCH', walletIndex)
  return wallet
}

// Gets the bidder's public key from the wallet
async function getBidderPublicKey() {
  const wallet = await getWallet()
  const publicKey = await wallet.BCH.getPublicKey(`0/0`)
  return publicKey
}
