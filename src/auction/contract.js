import { Contract, ElectrumNetworkProvider } from "cashscript"
import escrowArtifact from 'src/cashscripts/auction/AuctionEscrow.json'
import BCHJS from '@psf/bch-js'
import CryptoJS from 'crypto-js'

const bchjs = new BCHJS()

class AuctionEscrowContract {
  /**
   * Creates a new RampContract instance.
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
    const buyerPkh = this.getPubKeyHash(this.publicKeys.buyer) // include lang muna
    const sellerPkh = this.getPubKeyHash(this.publicKeys.seller)
    const servicerPkh = this.getPubKeyHash(this.publicKeys.servicer)

    this.hash = this.sha256Hash(
      this.publicKeys.arbiter,
      this.publicKeys.buyer, // include lang muna
      this.publicKeys.seller,
      this.publicKeys.servicer,
      this.lotId
    )
    console.log(this.hash)

    const contractParams = [
      arbiterPkh,
      buyerPkh, // include lang muna
      sellerPkh,
      servicerPkh,
      BigInt(parseInt(this.fees.serviceFee)),
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
  sha256Hash (arbiterPk, buyerPk, sellerPk, servicerPk, lotId) {
    const message = arbiterPk + buyerPk + sellerPk + servicerPk + lotId
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

}

export default AuctionEscrowContract