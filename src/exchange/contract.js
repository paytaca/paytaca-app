import EscrowArtifact from 'src/cashscripts/escrow.json'
import { ElectrumNetworkProvider, Contract, SignatureTemplate } from 'cashscript'
import { Store } from 'src/store'
import BCHJS from '@psf/bch-js'
import CryptoJS from 'crypto-js'
const bchjs = new BCHJS()

import Watchtower from 'src/lib/watchtower'
const isChipnet = Store.getters['global/isChipnet']
const watchtower = new Watchtower(isChipnet)

/**
 * Represents a Ramp contract.
 */
export class RampContract {
  /**
   * Creates a new RampContract instance.
   * @param {Object} publicKeys - The public keys of the parties involved in the contract.
   * @param {Object} fees - The fees associated with the contract.
   * @param {Object} addresses - The addresses of the parties involved in the contract.
   * @param {boolean} [isChipnet=true] - A boolean indicating whether the contract is on the Chipnet network or not. Defaults to true.
   */
  constructor (publicKeys, fees, addresses, timestamp, isChipnet = true) {
    this.timestamp = timestamp
    this.publicKeys = publicKeys
    this.addresses = addresses
    this.fees = fees
    this.network = 'chipnet'
    if (!isChipnet) this.network = 'mainnet'
    this.initialize()
  }

  /**
   * Initializes the contract by compiling its source code,
   * generating the contract parameters, and creating a new Contract instance.
   */
  initialize () {
    let provider = new ElectrumNetworkProvider()
    if (this.network === 'chipnet') provider = new ElectrumNetworkProvider(this.network)

    const arbiterPkh = this.getPubKeyHash(this.publicKeys.arbiter)
    const buyerPkh = this.getPubKeyHash(this.publicKeys.buyer)
    const sellerPkh = this.getPubKeyHash(this.publicKeys.seller)
    const servicerPkh = this.getPubKeyHash(this.publicKeys.servicer)

    this.hash = this.sha256Hash(
      this.publicKeys.arbiter,
      this.publicKeys.buyer,
      this.publicKeys.seller,
      this.publicKeys.servicer,
      this.timestamp
    )

    const contractParams = [
      arbiterPkh,
      buyerPkh,
      sellerPkh,
      servicerPkh,
      BigInt(parseInt(this.fees.serviceFee)),
      BigInt(parseInt(this.fees.arbitrationFee)),
      this.hash
    ]
    this.contract = new Contract(EscrowArtifact, contractParams, { provider })
  }

  /**
   * Returns all UTXOs that can be spent by the contract.
   * Both confirmed and unconfirmed UTXOs are included.
   */
  async getUtxos () {
    const address = this.getAddress()
    const result = await watchtower.BCH.getBchUtxos(address)
    return result.utxos
  }

  /**
   * Retrieves the address of the contract.
   * @returns {String} The address of the contract.
   */
  getAddress () {
    return this.contract.address
  }

  /**
   * Retrieves the balance of the contract.
   * @returns {Promise<number>} A promise that resolves with the balance of the contract in Bitcoin Cash (BCH).
   */
  async getBalance (address = '', retry = false) {
    if (!address) address = this.contract.address
    let balance = 0
    try {
      const response = await watchtower.BCH._api.get(`/balance/bch/${address}`)
      balance = response?.data?.balance
    } catch (error) {
      console.error('Failed to fetch contract balance through watchtower:', error.response)
      retry = true
    }
    if (retry && balance === 0) {
      console.warn('Refetched contract balance from cashscript built-in method getBalance()')
      const rawBal = await this.contract.getBalance()
      balance = bchjs.BitcoinCash.toBitcoinCash(Number(rawBal))
    }
    return balance
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
  sha256Hash (arbiterPk, buyerPk, sellerPk, servicerPk, timestamp) {
    const message = arbiterPk + buyerPk + sellerPk + servicerPk + timestamp
    return CryptoJS.SHA256(message).toString()
  }

  /**
   * Releases the funds to the buyer.
   * The contract will fail:
   *    - if the caller is not seller or the arbiter.
   *    - if the amount sent is incorrect.
   *    - if output[0] is not the buyer.
   *    - if output[1] is not the servicer.
   *    - if the output[2] is not the arbiter.
   * @param {string} callerWIF - The WIF of caller (arbiter/seller).
   * @param {string} callerPubkey - The public key of caller (arbiter/seller).
   * @param {number} amount - The transaction amount in BCH.
   * @returns {result} An object representing the result of the operation.
   */
  async release (callerWIF, callerPubkey, amount) {
    let result = {}
    let txInfo

    try {
      const callerSig = new SignatureTemplate(callerWIF)

      /**
       * output[0]: {to: `buyer address`, amount: `trade amount`}
       * output[1]: {to: `servicer address`, amount: `service fee`}
       * output[2]: {to: `arbiter address`, amount: `arbitration fee`}
       * */
      const outputs = [
        { to: this.addresses.buyer, amount: BigInt(amount) },
        { to: this.addresses.servicer, amount: BigInt(parseInt(this.fees.serviceFee)) },
        { to: this.addresses.arbiter, amount: BigInt(parseInt(this.fees.arbitrationFee)) }
      ]

      const txHex = await this.contract.functions
        .release(callerPubkey, callerSig, this.hash)
        .to(outputs)
        .withHardcodedFee(BigInt(parseInt(this.fees.contractFee)))
        .build()

      txInfo = await this.broadcastTransaction(txHex)

      result = {
        success: true,
        txInfo
      }
    } catch (err) {
      console.error(err)
      result = {
        success: false,
        reason: String(err),
        txInfo
      }
    }
    return result
  }

  /**
   * Refund the funds back to the seller.
   * The contract will fail:
   *    - if caller is not the arbiter.
   *    - if the amount sent is incorrect.
   *    - if output[0] is not the seller.
   *    - if output[1] is not the servicer.
   *    - if output[2] is not the arbiter.
   * @param {string} callerWIF - The WIF of the arbiter.
   * @param {number} amount - The transaction amount in BCH.
   * @returns {result} An object representing the result of the operation.
   */
  async refund (callerWIF, amount) {
    let result = {}
    let txInfo

    try {
      const arbiterSig = new SignatureTemplate(callerWIF)
      /**
       * output[0]: {to: `seller address`, amount: `trade amount`}
       * output[1]: {to: `servicer address`, amount: `service fee`}
       * output[2]: {to: `arbiter address`, amount: `arbitration fee`}
       * */
      const outputs = [
        { to: this.addresses.seller, amount: BigInt(amount) },
        { to: this.addresses.servicer, amount: BigInt(parseInt(this.fees.serviceFee)) },
        { to: this.addresses.arbiter, amount: BigInt(parseInt(this.fees.arbitrationFee)) }
      ]

      const txHex = await this.contract.functions
        .refund(this.publicKeys.arbiter, arbiterSig, this.hash)
        .to(outputs)
        .withHardcodedFee(BigInt(parseInt(this.fees.contractFee)))
        .build()
      
      txInfo = await this.broadcastTransaction(txHex)

      result = {
        success: true,
        txInfo: txInfo
      }
    } catch (err) {
      result = {
        success: false,
        reason: String(err),
        txInfo: txInfo
      }
    }
    return result
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

export default RampContract
