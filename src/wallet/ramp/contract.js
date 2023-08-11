import { ElectrumNetworkProvider, Contract, SignatureTemplate } from 'cashscript'
import { compileFile } from 'cashc'
import BCHJS from '@psf/bch-js'
import CryptoJS from 'crypto-js'
import fs from 'fs'

const bchjs = new BCHJS()

/**
 * Represents a Ramp contract.
 */
export class RampContract {
  /**
   * Creates a new RampContract instance.
   * @param {Object} publicKeys - An object containing the public keys of the parties involved in the contract.
   * @param {Object} fees - An object containing the fees associated with the contract.
   * @param {Object} addresses - An object containing the addresses of the parties involved in the contract.
   * @param {boolean} [isChipnet=true] - A boolean indicating whether the contract is on the Chipnet network or not. Defaults to true.
   */
  constructor (publicKeys, fees, addresses, isChipnet = true) {
    this.contractPath = './src/cashscript/escrow.cash'
    this.timestamp = Date.now()
    this.publicKeys = publicKeys
    this.addresses = addresses
    this.fees = fees
    this.network = 'chipnet'
    if (!isChipnet) this.network = 'mainnet'
    this._initContract()
  }

  /**
   * Initializes the contract by compiling its source code,
   * generating the contract parameters, and creating a new Contract instance.
   */
  async _initContract () {
    const artifact = compileFile(this.contractPath)
    const provider = new ElectrumNetworkProvider(this.network)

    const arbiterPkh = this.getPubKeyHash(this.publicKeys.arbiter)
    const buyerPkh = this.getPubKeyHash(this.publicKeys.buyer)
    const sellerPkh = this.getPubKeyHash(this.publicKeys.seller)
    const servicerPkh = this.getPubKeyHash(this.publicKeys.servicer)

    this.hash = await this.sha256Hash(this.timestamp)

    const contractParams = [
      arbiterPkh,
      buyerPkh,
      sellerPkh,
      servicerPkh,
      this.fees.tradingFee,
      this.fees.arbitrationFee,
      this.hash
    ]

    this.contract = new Contract(artifact, contractParams, provider)
  }

  /**
   * Retrieves the balance of the contract.
   * @returns {Promise<number>} A promise that resolves with the balance of the contract in Bitcoin Cash (BCH).
   */
  async getBalance () {
    const rawBal = await this.contract.getBalance()
    return bchjs.BitcoinCash.toBitcoinCash(Number(rawBal))
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
  async sha256Hash (timestamp) {
    const fileData = await this.readFile(this.contractPath)
    return CryptoJS.SHA256(fileData + timestamp).toString()
  }

  /**
   * Reads the contents of a file.
   * @param {string} filePath - The path of the file to be read.
   * @returns {Promise<Buffer>} A promise that resolves with the file data as a Buffer.
   */
  readFile (filePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, (error, fileData) => {
        if (error) {
          reject(error)
          return
        }
        resolve(fileData)
      })
    })
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
   * @param {number} amount - The transaction amount in BCH.
   * @returns {result} An object representing the result of the operation.
   */
  async release (callerWIF, amount) {
    let result = {}
    let txInfo

    try {
      // generate the signature
      const keyPair = bchjs.ECPair.fromWIF(callerWIF)
      const callerPk = bchjs.ECPair.toPublicKey(keyPair)
      const callerSig = new SignatureTemplate(keyPair)

      // convert amount from BCH to satoshi
      const satoshiAmount = Math.floor(bchjs.BitcoinCash.toSatoshi(Number(amount)))

      /**
       * output[0]: {to: `buyer address`, amount: `trade amount`}
       * output[1]: {to: `servicer address`, amount: `trade fee`}
       * output[2]: {to: `arbiter address`, amount: `arbitration fee`}
       * */
      const outputs = [
        { to: this.addresses.buyer, amount: satoshiAmount },
        { to: this.addresses.servicer, amount: this.fees.tradingFee },
        { to: this.addresses.arbiter, amount: this.fees.arbitrationFee }
      ]

      txInfo = await this.contract.functions
        .release(callerPk, callerSig, this.hash)
        .to(outputs)
        .withHardcodedFee(this.fees.contractFee)
        .send()

      result = {
        success: true,
        txInfo
      }
    } catch (err) {
      result = {
        success: false,
        reason: String(err),
        txInfo
      }
    }
    console.log('result:', JSON.stringify(result))
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
      // generate arbiter signature
      const keyPair = bchjs.ECPair.fromWIF(callerWIF)
      const arbiterSig = new SignatureTemplate(keyPair)

      // convert amount from BCH to satoshi
      const satoshiAmount = Math.floor(bchjs.BitcoinCash.toSatoshi(Number(amount)))

      console.log('sending to:')
      console.log(`${satoshiAmount} to recipient: ${this.addresses.seller}`)
      console.log(`${this.fees.tradingFee} to servicer: ${this.addresses.servicer}`)
      console.log(`${this.fees.arbitrationFee} to arbiter: ${this.addresses.arbiter}`)

      /**
       * output[0]: {to: `seller address`, amount: `trade amount`}
       * output[1]: {to: `servicer address`, amount: `trade fee`}
       * output[2]: {to: `arbiter address`, amount: `arbitration fee`}
       * */
      const outputs = [
        { to: this.addresses.seller, amount: satoshiAmount },
        { to: this.addresses.servicer, amount: this.fees.tradingFee },
        { to: this.addresses.arbiter, amount: this.fees.arbitrationFee }
      ]

      txInfo = await this.contract.functions
        .refund(this.publicKeys.arbiter, arbiterSig, this.hash)
        .to(outputs)
        .send()

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
    console.log('result:', JSON.stringify(result))
    return result
  }
}

export default RampContract
