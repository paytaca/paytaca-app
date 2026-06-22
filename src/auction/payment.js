import AuctionEscrowContract from './contract'
import { getChangeAddress } from 'src/utils/send-page-utils'
import { loadWallet } from 'src/wallet'
import { callAPI } from './api'
import { Store } from 'src/store/'
import { isChipnet } from 'src/store/global/getters'

const ARBITRATION_FEE = 1000
const PLATFORM_FEE = 1000

/**
 * @name walletToContract
 * @param {Integer} lotId - id of the user's official bid 
 * Call this when invoking any wallet-to-contract functions
 */
export async function walletToContract(amountBCH, lotId) {
  try {
    // get the auction public keys
    const publicKeys = await getExistingAuctionPublicKeys(lotId)
    console.log(publicKeys)

    // just get the fixed fees
    const fees = {
      'arbitrationFee': ARBITRATION_FEE,
      'platformFee': PLATFORM_FEE
    }

    // check if wallet is in chipnet
    const isChipnet = Store.getters['global/isChipnet']

    // make the contract here
    const contractResult = new AuctionEscrowContract(
      publicKeys,
      fees,
      lotId,
      isChipnet
    )
    if (!contractResult.contract) 
      throw new Error("Contract failed to be created.")
    
    const contractUTXOS = await contractResult.contract.getUtxos()
    if (contractUTXOS.length > 0)
      throw new Error("Funds exist inside the contract! Please release/refund first before adding new funds.")
    
    const txid = await sendBCHToContract(contractResult, amountBCH)
    if (!txid) 
      throw new Error("Failed to transfer BCH to contract.")

    console.log("[walletToContract] Successfully transferred BCH to contract! txid = ", txid)
  } catch (error) {
    console.error("[walletToContract]", error)
  }
}


/**
 * @name createContract
 * @param {Integer} lotId
 * @returns contract and is_created (boolean)
 * Call this when establishing a new contract for a new lot
 */
export async function creatContractForLot(lotId) {
  try {
    // get the auction public keys
    const publicKeys = await getNewAuctionPublicKeys(lotId)
    console.log(publicKeys)

    // just get the fixed fees
    const fees = {
      arbitrationFee: ARBITRATION_FEE,
      platformFee: PLATFORM_FEE
    }

    // check if wallet is in chipnet
    const isChipnet = Store.getters['global/isChipnet']

    // creation of contract
    const contractResult = new AuctionEscrowContract(
      publicKeys,
      fees,
      lotId,
      isChipnet 
    )
    if (!contractResult.contract)
      throw new Error('Contract failed to be created')

    // payload for adding contract to db
    const payload = {
      lot_id: lotId,
      arbiter_pk: publicKeys.arbiter,
      servicer_pk: publicKeys.servicer,
      arbitration_fee: contractResult.fees.arbitrationFee,
      platform_fee: contractResult.fees.platformFee
    }

    const response = await callAPI('create-contract', null, 'post', payload)
    if (!response || !response.success) 
      throw new Error("Contract details failed to be saved in the database.")
    
    return true
  }
  catch(error) {
    console.error('[creatContractForLot]', error)
    return false
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
    contract.contract
  )
  return txid
}

// ===== HELPER FUNCTIONS =====
/**
 * Gets the public keys for a new contract
 * @name getNewAuctionPublicKeys
 * @param {Integer} lotId 
 * @returns Gets the public keys needed for a NEW auction contract
 */
async function getNewAuctionPublicKeys(lotId) {
  const auctioneerPk = await getPublicKeyFromLotId('auctioneer', lotId)
  const arbiterPk = Store.getters['auction/arbiterPublicKey']
  const servicerPk = Store.getters['auction/servicerPublicKey']

  return {
    auctioneer: auctioneerPk,
    arbiter: arbiterPk,
    servicer: servicerPk
  }
}

/**
 * Gets the public keys from an already existing contract
 * This is different from the getNewAuctionPublicKeys because 
 * the current store.getters version of both servicer and arbiter PKs
 * might be different from those saved in the contract
 * @name getExistingAuctionPublicKeys
 * @param {Integer} lotId 
 * @returns Gets the public keys of an already existing contract associated with a lot
 */
async function getExistingAuctionPublicKeys(lotId) {
  const auctioneerPk = await getPublicKeyFromLotId('auctioneer', lotId)
  const arbiterPk = await getPublicKeyFromLotId('arbiter', lotId)
  const servicerPk = await getPublicKeyFromLotId('servicer', lotId)

  console.log(arbiterPk)
  console.log(servicerPk)

  return {
    auctioneer: auctioneerPk,
    arbiter: arbiterPk,
    servicer: servicerPk
  }
}


/**
 * Fetches a person's public key from the server via api
 * @name getPublicKeyFromLotId
 * @param {String} pkCallName - either 'auctioneer-pk', 'arbiter-pk', or 'servicer-pk
 * @param {Integer} lotId - associated lot
 * @returns 
 */
async function getPublicKeyFromLotId(pkName, lotId) {
  try {
    const response = await callAPI(`${pkName}-pk`, lotId)

    if (response && response.success) 
      return response.data[`${pkName}_pk`]

    return null
    
  } catch (error) {
    console.error('API Sync Error inside getAuctioneerPublicKey:', error)
    return null
  } 
}


/**
 * @name getWallet
 * @returns the bidder's wallet
 */
export async function getWallet() {
  const walletIndex = Store.getters['global/getWalletIndex']
  const wallet = await loadWallet('BCH', walletIndex)
  return wallet
}

