import { getWalletByNetwork } from "src/wallet/chipnet"
import { Contract, ElectrumNetworkProvider } from "cashscript"
import escrowArtifact from 'src/cashscripts/auction/AuctionEscrow.json'
import BCHJS from '@psf/bch-js'
import CryptoJS from 'crypto-js'
import Watchtower from "src/lib/watchtower"

const watchtower = new Watchtower()
const bchjs = new BCHJS()

class AuctionEscrowContract {
  /**
   * Creates a new AuctionEscrowContract instance.
   * @param {Object} publicKeys - The public keys of the parties involved in the contract.
   * @param {Object} fees - The fees associated with the contract.
   * @param {Object} lotId - The lot associated with the contract.
   * @param {boolean} [isChipnet=true] - A boolean indicating whether the contract is on the Chipnet network or not. Defaults to true.
   */
  constructor (publicKeys, fees, lotId, isChipnet = true) {
    this.publicKeys = publicKeys
    this.fees = fees
    this.lotId = lotId
    this.network = (isChipnet) ? "chipnet" : "mainnet";

    this.initialize()
  }

  initialize() {
    this.provider = new ElectrumNetworkProvider(this.network)

    const arbiterPkh = this.getPubKeyHash(this.publicKeys.arbiter)
    const auctioneerPkh = this.getPubKeyHash(this.publicKeys.auctioneer)
    const servicerPkh = this.getPubKeyHash(this.publicKeys.servicer)

    // Hash
    this.hash = this.sha256Hash(
      this.publicKeys.auctioneer,
      this.publicKeys.arbiter,
      this.publicKeys.servicer,
      this.lotId
    )

    // Contract Parameters
    const contractParams = [
      auctioneerPkh,  // bytes20 auctioneer
      arbiterPkh,     // bytes20 arbiter
      servicerPkh,    // bytes20 servicer
      BigInt(this.lotId), // int lotId
      BigInt(parseInt(this.fees.platformFee)),    // int platformFee
      BigInt(parseInt(this.fees.arbitrationFee)), // int arbitrationFee
      this.hash       // bytes paramHash
    ]

    this.contract = new Contract(escrowArtifact, contractParams, { provider: this.provider })
  }

  /**
   * Generates a hash of the given public key using the hash160 algorithm.
   * @param {string} pubKey - The public key to be hashed, in hexadecimal format.
   * @returns {Buffer} The generated hash as a Buffer.
   */
  getPubKeyHash (pubKey) {
    return bchjs.Crypto.hash160(Buffer.from(pubKey, 'hex'))
  }

  /**
   * Generates a SHA-256 hash of the contents of the contract file.
   * @param {bytes} auctioneerPk - The timestamp to be included in the hash.
   * @param {bytes} arbiterPk - The timestamp to be included in the hash.
   * @param {bytes} servicerPk - The timestamp to be included in the hash.
   * @param {number} lotId - The timestamp to be included in the hash.
   * @returns {Promise<string>} A promise that resolves with the generated hash as a string.
   */
  sha256Hash (auctioneerPk, arbiterPk, servicerPk, lotId) {
    const message = auctioneerPk + arbiterPk + servicerPk + lotId
    return CryptoJS.SHA256(message).toString()
  }

  outbid (lot, bidder, hash) {
    return this.contract.functions.outbid(BigInt(lot), bidder, hash)
  }

  release (lot, pk, hash) {
    return this.contract.functions.release(BigInt(lot), pk, hash)
  }

  refund (lot, pk, hash) {
    return this.contract.functions.refund(BigInt(lot), pk, hash)
  }

  /**
   * Broadcasts a transaction
   * @param {bytes} txHex - The timestamp to be included in the hash.
   * @param {number} priceId - The timestamp to be included in the hash.
   * @returns {Promise<string>} A promise that resolves with the generated hash as a string.
   */
  async broadcastTransaction (txHex, priceId) {
    try {
      const broadcastData = { transaction: txHex }
      if (priceId) broadcastData.price_id = priceId

      const response = await watchtower.BCH._api.post('broadcast/', broadcastData)
      return response.data
    } catch (error) {
      console.error(error.response || error)
      return error.response.data
    }
  }

  /**
   * Broadcasts a transaction
   * @param {bytes} txHex - The timestamp to be included in the hash.
   * @param {number} priceId - The timestamp to be included in the hash.
   * @returns {Promise<string>} A promise that resolves with the generated hash as a string.
   */
  async sendAmountToAddress (
    changeAddress,
    bchAmount,
    tokenAmount=undefined,
    wallet,
  ) {
  
    const txid = await getWalletByNetwork(wallet, 'bch').sendBch(
      undefined,
      '',
      changeAddress,
      null,
      undefined,
      [{
        address: this.contract.address,
        amount: bchAmount,
        tokenAmount: tokenAmount
      }],
      undefined
    )
  
    // sleep for 2 seconds to resolve UTXOs after sending to PromoContract
    await new Promise(resolve => setTimeout(resolve, 2000))

    return txid
  }

}

export default AuctionEscrowContract
