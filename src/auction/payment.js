// Mainnet-js imports
import { NFTCapability, TestNetWallet, Wallet as CashTokenWallet } from 'mainnet-js'

// src imports
import { loadWallet as loadServiceWallet } from 'src/services/wallet.js'
import { pubkeyToPkHash } from 'src/utils/crypto.js'
import { loadWallet } from 'src/wallet'

// Contract-related
import { initializeContract } from './contract'

const MINER_FEE = 1000n
const PLATFORM_FEE = 1000n
const SERVICER_FEE = 1000n

/**
 * @name payFirstBidToContract
 * @param {Integer} lotId - id of the user's official lot 
 * Call this when paying for the bid functions
 */
export async function payFirstBidToContract(lotId, bidAmountBCH, initializedContract=null) {
  const contract = initializedContract ?? await initializeContract(lotId)
  
  // Check for existing contract UTXOs
  const contractUTXOS = await contract.getUtxos()
  if (contractUTXOS.length > 0)
    throw new Error("Funds exist inside the contract! Please release/refund first before adding new funds.")

  // Get the bidder's PKH
  const bidderPKH = await getBidderPublicKeyHash()
  const bidAmountSats = toSatoshis(bidAmountBCH)

  // Send the first NFT bid to the contract
  const payment = await sendNFTToTokenAddress(
    contract.tokenAddress,
    bidderPKH,
    bidAmountSats,
  )

  // Extract the transaction id (txid) from the payment
  const txid = (
    typeof payment === 'string' 
    ? payment 
    : payment?.txid
  )
  if (!txid) throw new Error("Failed to transfer bid NFT to contract.")

  console.log("[payFirstBidToContract] Successfully transferred bid NFT to contract! txid = ", txid)
  return txid
}

// ================
// HELPER FUNCTIONS
// ================
/**
 * @name getBidderPublicKey
 * @param {String} addressPath
 * @returns the bidder's public key
 */
export async function getBidderPublicKeyHash(addressPath='0/0') {
  const wallet = await loadWallet('BCH')
  const bidderPK = await wallet.BCH.getPublicKey(addressPath)
  const bidderPKH = pubkeyToPkHash(bidderPK)

  // Return the wallet's public key hash
  return bidderPKH
}

/**
 * @name sendNFTToTokenAddress
 * @param {String} contractTokenAddress
 * @param {Bytes} bidderPKH
 * @param {Integer} bidAmount
 * @param {Object} { broadcast = true } = {}
 * @returns NFT genesis transaction result
 */
export async function sendNFTToTokenAddress(
  contractTokenAddress, 
  bidderPKH,
  bidAmountBCH,
  { broadcast = true } = {}
) {
  // Check if invalid bidder PKH
  if (!/^[0-9a-fA-F]{40}$/.test(bidderPKH)) {
    throw new Error('Invalid bidder public key hash.')
  }

  // Check if invalid bid amount
  const normalizedBidAmount = BigInt(bidAmountBCH)
  if (normalizedBidAmount < 0n || normalizedBidAmount > 0xffffffffffffffffn) {
    throw new Error('Bid amount is outside the supported range.')
  }

  // User's service wallet
  const wallet = await loadServiceWallet()

  // Token-related variables
  const genesisUtxo = await wallet.getOrCreateGenesisUtxo()
  const categoryId = genesisUtxo.txid

  // NFT Commitment bytes
  const commitment = createBidCommitment(bidderPKH, normalizedBidAmount)

  // Get private key from wallet for cashtoken wallet
  const privateKey = wallet.privkey(genesisUtxo.address_path)
  const WalletClass = wallet.isChipnet ? TestNetWallet : CashTokenWallet
  const cashTokenWallet = await WalletClass.fromWIF(privateKey)

  // Create NFT
  const result = await cashTokenWallet.tokenGenesis(
    {
      cashaddr: contractTokenAddress,
      amount: 0n,
      capability: NFTCapability.mutable,
      commitment,
      value: normalizedBidAmount + MINER_FEE + PLATFORM_FEE + SERVICER_FEE
    },
    [],
    {
      buildUnsigned: !broadcast,
      awaitTransactionPropagation: broadcast,
      utxoIds: [{
        txid: genesisUtxo.txid,
        vout: genesisUtxo.vout,
        satoshis: Number(genesisUtxo.satoshis)
      }]
    }
  )
  
  if (!broadcast) {
    // Don't broadcast
    return { 
      success: true, 
      txHex: result.unsignedTransaction, 
      category: categoryId 
    }
  }

  // Broadcast to watchtower
  return { 
    success: Boolean(result.txId), 
    txid: result.txId, 
    category: categoryId 
  }
}

// Encodes the bidder hash and bid amount into the NFT commitment.
function createBidCommitment(bidderPKH, bidAmountSats) {
  const bidderBytes = Buffer.from(bidderPKH, 'hex')
  const amountBytes = Buffer.alloc(8)
  amountBytes.writeBigUInt64LE(bidAmountSats)
  return Buffer.concat([bidderBytes, amountBytes]).toString('hex')
}

// Converts a BCH amount to satoshis and validates the result.
function toSatoshis(bidAmountBCH) {
  const amount = Number(bidAmountBCH)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid bid amount.')
  }
  return BigInt(Math.round(amount * 1e8))
}
