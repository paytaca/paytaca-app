import { getWalletByNetwork } from "src/wallet/chipnet"
import { Contract, ElectrumNetworkProvider } from "cashscript"
import escrowArtifact from 'src/cashscripts/auction/AuctionEscrow.json'
import BCHJS from '@psf/bch-js'
import CryptoJS from 'crypto-js'

const bchjs = new BCHJS()

class AuctionEscrowContract {
  /**
   * Creates a new AuctionEscrowContract instance.
   * @param {Object} publicKeys - The public keys of the parties involved in the contract.
   * @param {Object} fees - The fees associated with the contract.
   * @param {Object} bidId - The lot associated with the contract.
   * @param {boolean} [isChipnet=true] - A boolean indicating whether the contract is on the Chipnet network or not. Defaults to true.
   */
  constructor (publicKeys, fees, bidId, isChipnet = true) {
    this.publicKeys = publicKeys
    this.fees = fees
    this.bidId = bidId
    this.network = (isChipnet) ? "chipnet" : "mainnet";

    this.initialize()
  }

  initialize() {
    this.provider = new ElectrumNetworkProvider(this.network)

    const arbiterPkh = this.getPubKeyHash(this.publicKeys.arbiter)
    const bidderPkh = this.getPubKeyHash(this.publicKeys.bidder)
    const auctioneerPkh = this.getPubKeyHash(this.publicKeys.auctioneer)
    const servicerPkh = this.getPubKeyHash(this.publicKeys.servicer)

    this.hash = this.sha256Hash(
      this.publicKeys.arbiter,
      this.publicKeys.bidder,
      this.publicKeys.auctioneer,
      this.publicKeys.servicer,
      this.bidId
    )

    const contractParams = [
      arbiterPkh,
      bidderPkh,
      auctioneerPkh,
      servicerPkh,
      BigInt(parseInt(this.fees.platformFee)),
      BigInt(parseInt(this.fees.arbitrationFee)),
      this.hash
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
   * Generates a SHA-256 hash of the contents of the contract file and a timestamp.
   * @param {number} timestamp - The timestamp to be included in the hash.
   * @returns {Promise<string>} A promise that resolves with the generated hash as a string.
   */
  sha256Hash (arbiterPk, bidderPk, auctioneerPk, servicerPk, bidId) {
    const message = arbiterPk + bidderPk + auctioneerPk + servicerPk + bidId
    return CryptoJS.SHA256(message).toString()
  }

  async broadcastTransaction (txHex, priceId) {
    try {
      const broadcastData = { transaction: txHex }
      if (priceId) {
        broadcastData.price_id = priceId
      }
      const response = await watchtower.BCH._api.post('broadcast/', broadcastData)
      return response.data
    } catch (error) {
      console.error(error.response || error)
      return error.response.data
    }
  }

  // sending BCH from wallet to address
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