import { Contract, ElectrumNetworkProvider } from "cashscript"
import escrowArtifact from 'src/cashscripts/auction/AuctionEscrow.json'
import BCHJS from '@psf/bch-js'
import CryptoJS from 'crypto-js'

const bchjs = new BCHJS()

class AuctionEscrowContract {
  /**
   * Creates a new AuctionEscrowContract instance.
   * @name constructor
   * @param {Object} publicKeys - The public keys of the parties involved in the contract.
   * @param {Object} fees - The fees associated with the contract.
   * @param {Object} lotId - The lot associated with the contract.
   * @param {boolean} [isChipnet=true] - A boolean indicating whether the contract is on the Chipnet network or not. Defaults to true.
   */
  constructor (publicKeys, fees, lotId, isChipnet = true) {
    this.publicKeys = publicKeys
    this.fees = fees
    this.lotId = lotId

    // Network provider
    this.provider = new ElectrumNetworkProvider((isChipnet) ? "chipnet" : "mainnet")

    // Public Key Hashes
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
   * @name getPubKeyHash
   * @param {string} pubKey - The public key to be hashed, in hexadecimal format.
   * @returns {Buffer} The generated hash as a Buffer.
   * Generates a hash of the given public key using the hash160 algorithm.
   */
  getPubKeyHash (pubKey) {
    return bchjs.Crypto.hash160(Buffer.from(pubKey, 'hex'))
  }

  /**
   * @name sha256Hash
   * @param {bytes} auctioneerPk - The timestamp to be included in the hash.
   * @param {bytes} arbiterPk - The timestamp to be included in the hash.
   * @param {bytes} servicerPk - The timestamp to be included in the hash.
   * @param {number} lotId - The timestamp to be included in the hash.
   * @returns {Promise<string>} A promise that resolves with the generated hash as a string.
   * Generates a SHA-256 hash of the contents of the contract file.
   */
  sha256Hash (auctioneerPk, arbiterPk, servicerPk, lotId) {
    const message = auctioneerPk + arbiterPk + servicerPk + lotId
    return CryptoJS.SHA256(message).toString()
  }
}

export default AuctionEscrowContract
