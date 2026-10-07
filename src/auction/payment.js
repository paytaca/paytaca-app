import Watchtower from 'watchtower-cash-js'
import { ElectrumNetworkProvider, SignatureTemplate, TransactionBuilder } from 'cashscript'

// src imports
import { getChangeAddress } from 'src/utils/send-page-utils'
import { loadWallet } from 'src/wallet'
import { isChipnet } from 'src/store/global/getters'
import { Store } from 'src/store/'

// Contract-related
import AuctionEscrowContract from './contract'
import { callAPI } from './api'

const watchtower = new Watchtower()
const P2PKH_DUST = 546n;
const DUST_LIMIT = P2PKH_DUST;

const ARBITRATION_FEE = 1000
const PLATFORM_FEE = 1000

/**
 * @name payBidToContract
 * @param {Integer} lotId - id of the user's official lot 
 * Call this when invoking any wallet-to-contract functions
 */
export async function payBidToContract(amountBCH, lotId) {
    const contract = await initializeContract(lotId)
    
    const contractUTXOS = await contract.contract.getUtxos()
    if (contractUTXOS.length > 0)
      throw new Error("Funds exist inside the contract! Please release/refund first before adding new funds.")
    
    const payment = await sendBCHToContract(contract, amountBCH)
    const txid = typeof payment === 'string' ? payment : payment?.txid
    if (!txid) 
      throw new Error("Failed to transfer BCH to contract.")

    console.log("[payBidToContract] Successfully transferred BCH to contract! txid = ", txid)
    return txid
}


/**
 * @name initializeContract
 * @param {Integer} lotId
 * @returns initialized contract
 */
export async function initializeContract(lotId) {
  const publicKeys = await getAuctionPublicKeys(lotId)

  // Fixed fees
  const fees = {
    arbitrationFee: ARBITRATION_FEE,
    platformFee: PLATFORM_FEE
  }

  return new AuctionEscrowContract(
    publicKeys,
    fees,
    lotId,
    Store.getters['global/isChipnet'] // Check if wallet is in chipnet
  )
}

export async function tokenGenesis(
  contractTokenAddress, 
  { broadcast = true } = {}
) {
    const genesisUtxo = await this.wallet.getOrCreateGenesisUtxo()
    const categoryId = genesisUtxo.txid
    const nftValue = 1000n // 1000 satoshis for each NFT output
    
    const changeAddress = this.wallet.address()
    const estimatedFee = this.wallet.estimateFee({ numP2pkhInputs: 1, numOutputs: 2, feeRate: 2n })
    const change = genesisUtxo.satoshis - estimatedFee - nftValue
    const tokenAddress = contractTokenAddress

    const outputs = []

    if (change > DUST_LIMIT) {
        outputs.push({
            to: changeAddress,
            amount: change,
        })
    }

    outputs.push({
      to: tokenAddress,
      amount: nftValue,
      token: {
          category: categoryId,
          amount: 0n,
          nft: {
              capability: 'mutable',
              commitment: ''
          }
      }
    })


    const network = isChipnet ? 'chipnet' : 'mainnet'
    const privateKey = this.wallet.privkey(genesisUtxo.address_path)
    const provider = new ElectrumNetworkProvider(network)
    const sigTemplate = new SignatureTemplate(privateKey)

    const tx = new TransactionBuilder({ provider })
      .addInput(genesisUtxo, sigTemplate.unlockP2PKH())
      .addOutputs(outputs)
        
    let result
      // Build the transaction
      const txHex = tx.build()

      if (broadcast) {
        const txResult = await watchtower.BCH.broadcastTransaction(txHex)
        result = { 
            success: txResult.data.success, 
            txid: txResult.data.txid, 
            category: categoryId 
        }
      } else {
        result = { success: true, txHex }
      }
    return result
}

/**
 * !!! DO NOT CALL THIS !!!
 * @name sendBCHToContract
 * @param {*} contract 
 * @param {Float} bchAmount - must be in BCH (convert fiats to BCH)
 * @returns 
 */
async function sendBCHToContract(contract, bchAmount) {
  // change address 
  const changeAddress = await getChangeAddress('bch')

  // wallet info
  const wallet = await getWallet()
  
  const txid = await contract.sendAmountToAddress(
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
 * @name getAuctionPublicKeys
 * @param {Integer} lotId
 * @returns Gets the public keys needed for a NEW auction contract
 */
async function getAuctionPublicKeys(lotId) {
  const auctioneerPk = await getPublicKeyFromLotId('auctioneer', lotId)
  await Promise.all([
    Store.getters['auction/arbiterPublicKey']
      ? Promise.resolve()
      : Store.dispatch('auction/fetchArbiterPublicKey'),
    Store.getters['auction/servicerPublicKey']
      ? Promise.resolve()
      : Store.dispatch('auction/fetchServicerPublicKey')
  ])
  const arbiterPk = Store.getters['auction/arbiterPublicKey']
  const servicerPk = Store.getters['auction/servicerPublicKey']

  if (!auctioneerPk || !arbiterPk || !servicerPk) {
    throw new Error('Contract public keys could not be loaded.')
  }

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
 * @name getBidderPublicKey
 * @returns the bidder's public key
 */
export async function getBidderPublicKey(addressPath) {
  const wallet = await getWallet()
  const bidderPk = await wallet.BCH.getPublicKey(addressPath)
  return bidderPk
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
