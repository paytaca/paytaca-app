// Mainnet-js imports
import { NFTCapability, TestNetWallet, Wallet as CashTokenWallet, getNetworkProvider, NetworkType } from 'mainnet-js'

// src imports
import { loadWallet as loadServiceWallet } from 'src/services/wallet.js'
import { pubkeyToPkHash } from 'src/utils/crypto.js'
import { loadWallet } from 'src/wallet'
import { DUST_LIMIT } from 'src/services/card/constants.js'

// Contract-related
import { initializeContract } from './contract'

// Fixed variables
const MINER_FEE = 1000n
const PLATFORM_FEE = 1000n
const SERVICER_FEE = 1000n

/**
 * @name payFirstBidToContract
 * @param {Integer} lotId
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
  const txid = typeof payment === 'string' ? payment : payment?.txid
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
  if (normalizedBidAmount < 0n || normalizedBidAmount > 0xffffffffffffffffn)
    throw new Error('Bid amount is outside the supported range.')

  // User's service wallet
  const wallet = await loadServiceWallet()

  // Token-related variables
  const { utxos } = await wallet.getBchUtxos()
  if (utxos.length === 0) throw new Error('No UTXOs found inside your wallet.')

  const totalNFTValue = normalizedBidAmount + MINER_FEE + PLATFORM_FEE + SERVICER_FEE
  let candidates = utxos.filter(
    utxo => utxo.satoshis > DUST_LIMIT
      && BigInt(utxo.satoshis) >= totalNFTValue
      && utxo.vout === 0
      && !utxo.token
  )

  if (!candidates.length) {
    const txid = await createValidBCHUtxo(wallet, totalNFTValue + MINER_FEE)
    const refreshed = await wallet.getBchUtxos()
    candidates = refreshed.utxos.filter(
      utxo => utxo.txid === txid
        && utxo.vout === 0
        && !utxo.token
        && BigInt(utxo.satoshis) >= totalNFTValue
    )
    if (!candidates.length) {
      throw new Error('Created BCH UTXO was not found or does not contain enough satoshis.')
    }
  }

  let lastRetryableError
  for(const genesisUtxo of candidates) {
    const categoryId = genesisUtxo.txid
    const privateKey = wallet.privkey(genesisUtxo.address_path)
    const WalletClass = wallet.isChipnet ? TestNetWallet : CashTokenWallet
    const cashTokenWallet = await WalletClass.fromWIF(privateKey)
    cashTokenWallet.provider = getNetworkProvider(
      wallet.isChipnet ? NetworkType.Testnet : NetworkType.Mainnet,
      wallet.isChipnet ? 'wss://chipnet.imaginary.cash:50004' : undefined,
      true
    )

    // NFT Commitment bytes
    const commitment = createBidCommitment(bidderPKH, normalizedBidAmount)

    // Create NFT
    try {
      const result = await cashTokenWallet.tokenGenesis(
        {
          cashaddr: contractTokenAddress,
          amount: 0n,
          capability: NFTCapability.mutable,
          commitment,
          value: totalNFTValue
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
    
      return (!broadcast) 
        ? { 
          success: true, 
          txHex: result.unsignedTransaction, 
          category: categoryId 
        } 
        : { 
          success: Boolean(result.txId), 
          txid: result.txId, 
          category: categoryId 
        }

    } catch (error) {
      const message = error?.message || String(error) || 'Unknown transaction error.'
      console.error('First attempt failed:', message, error)
      if (/spent|missing input|no suitable inputs|bad-txns-inputs|rejected by network rules/i.test(message)) {
        lastRetryableError = message
        continue
      }
      throw new Error(message)

    } finally {
      await cashTokenWallet.provider.disconnect().catch(() => {})
    }
  }

  if (lastRetryableError) throw new Error(lastRetryableError)
  throw new Error('No suitable BCH UTXO was available for NFT creation.')
}

// Sends the user a valid utxo back to itself to make a vout=0 utxo
async function createValidBCHUtxo(wallet, bchAmount){
  const bchWallet = await wallet.getRawWallet()
  const address = wallet.address()
  const result = await bchWallet.sendBch(
    0,
    '',
    address,
    null,
    undefined,
    [{ address, amount: Number(bchAmount) / 1e8 }]
  )
  if (!result?.success || !result?.txid) {
    throw new Error(result?.error || 'Failed to create a valid BCH UTXO.')
  }
  return result.txid
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
  if (!Number.isFinite(amount) || amount <= 0) 
    throw new Error('Invalid bid amount.')
  return BigInt(Math.round(amount * 1e8))
}
