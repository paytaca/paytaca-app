
import { decodePrivateKeyWif, binToHex, secp256k1, utf8ToBin, sha256, hexToBin } from '@bitauth/libauth'
import { IncorrectWIFError } from '@generalprotocols/anyhedge'
import { loadLibauthHdWallet, loadWallet as loadBchWallet } from 'src/wallet'
import { Store } from 'src/store'
import { markRaw } from 'vue'
import { minTokenValue } from './card/constants'

const DEFAULT_CHANGE_INDEX = 0
const DEFAULT_ADDRESS_INDEX = 0

/**
 * Lightweight wrapper around LibauthHDWallet providing only the essential cryptographic 
 * operations needed for feature implementation.
 * 
 * This class provides: 
 * - simple key derivation, 
 * - address generation,
 * - message signing/verification
 */
export class Wallet {
  /**
   * Create a Wallet.
   * @param {number} walletIndex - The index of the wallet.
   * @param {string} walletHash - The hash of the wallet.
   * @param {Object} [opts] - Optional parameters.
   * @param {number} [opts.changeIndex=DEFAULT_CHANGE_INDEX] - The change index.
   * @param {number} [opts.addressIndex=DEFAULT_ADDRESS_INDEX] - The address index.
   * @param {boolean} [opts.isChipnet=false] - Whether the wallet is for Chipnet.
   */
  constructor (walletIndex, walletHash, opts = { 
      changeIndex: DEFAULT_CHANGE_INDEX, 
      addressIndex: DEFAULT_ADDRESS_INDEX, 
      isChipnet: false
    }) {
    this.walletHash = walletHash
    this.walletIndex = walletIndex
    this.changeIndex = opts.changeIndex
    this.addressIndex = opts.addressIndex
    this.isChipnet = opts.isChipnet
  }

  /**
   * Load the wallet.
   * @returns {Promise<void>}
   */
  async loadWallet () {
    this.libauthWallet = await loadLibauthHdWallet(this.walletIndex, this.isChipnet)
  }

  /**
   * Get the raw wallet.
   * @returns {Promise<Object>} The raw wallet.
   */
  async getRawWallet () {
    let rawWallet = await markRaw(loadBchWallet('BCH', this.walletIndex))
    if (this.isChipnet) {
      rawWallet = rawWallet.BCH_CHIP
    } else {
      rawWallet = rawWallet.BCH
    }
    return rawWallet
  }

  /**
   * Get the key pair.
   * @param {string} [addressPath=''] - The address path.
   * @returns {Object} The key pair.
   */
  keypair (addressPath = '') {
    if (!addressPath) addressPath = this.addressPath()
    const privateKeyWif = this.privkey(addressPath)
    const publicKey = this.pubkey(addressPath)
    return {
      privateKey: privateKeyWif,
      publicKey: publicKey
    }
  }

  /**
   * Get the address path.
   * @param {number} [addressIndex=this.addressIndex] - The index of the address.
   * @returns {string} The address path.
   */
  addressPath (addressIndex = this.addressIndex) {
    return `${this.changeIndex}/${addressIndex}`
  }

  /**
   * Get the address.
   * @param {string} [addressPath=''] - The address path.
   * @returns {string} The address.
   */
  address (addressPath = '') {
    if (!addressPath) addressPath = this.addressPath()
    return this.libauthWallet.getAddressAt({ path: addressPath })
  }

  /**
   * Get the public key.
   * @param {string} [addressPath=''] - The address path.
   * @returns {string} The public key.
   */
  pubkey (addressPath = '') {
    if (!addressPath) addressPath = this.addressPath()
    return this.libauthWallet.getPubkeyAt(addressPath)
  }

  /**
   * Get the private key in WIF format.
   * @param {string} [addressPath=''] - The address path.
   * @returns {string} The private key in WIF format.
   */
  privkey (addressPath = '') {
    if (!addressPath) addressPath = this.addressPath()
    return this.libauthWallet.getPrivateKeyWifAt(addressPath)
  }

  /**
   * Sign a message.
   * @param {string} wif - The private key in WIF format.
   * @param {string} message - The message to sign.
   * @param {number} [timestamp=null] - The timestamp.
   * @returns {string} The signature.
   */
  signMessage (wif, message, timestamp = null) {
    message = timestamp ? [message, timestamp].join('::') : message
    const messageHash = sha256.hash(utf8ToBin(message))
    const privateKeyBin = decodePrivateKeyWif(wif).privateKey
    if (typeof privateKeyBin === 'string') throw (new IncorrectWIFError(wif))
    const signatureBin = secp256k1.signMessageHashDER(privateKeyBin, messageHash)
    if (typeof signatureBin === 'string') throw new Error(signatureBin)
    const signature = binToHex(signatureBin)
    return signature
  }

  /**
   * Verify a signed message.
   * @param {string} publicKey - The public key.
   * @param {string} message - The message to verify.
   * @param {string} signature - The signature.
   * @param {number} [timestamp=null] - The timestamp.
   * @returns {boolean} Whether the signature is valid.
   */
  verifyMessage (publicKey, message, signature, timestamp = null) {
    message = timestamp ? [message, timestamp].join('::') : message
    const messageHash = sha256.hash(utf8ToBin(message))
    const publicKeyBin = hexToBin(publicKey)
    const signatureBin = hexToBin(signature)
    const isValid = secp256k1.verifySignatureDERLowS(signatureBin, publicKeyBin, messageHash)
    if (typeof isValid === 'string') throw new Error(isValid)
    return isValid
  }

  async getBchUtxos (address = null) {
    const wallet = await this.getRawWallet()
    if (address) {
      return await wallet.watchtower.BCH.getBchUtxos(address)
    }
    return await wallet.watchtower.BCH.getBchUtxos(`wallet:${this.walletHash}`)
  }

  async getTokenUtxos (token, address = null) {
    const wallet = await this.getRawWallet()
    if (address) {
      return await wallet.watchtower.BCH.getCashtokensUtxos(address, token)
    }
    return await wallet.watchtower.BCH.getCashtokensUtxos(`wallet:${this.walletHash}`, token)
  }

  /**
   * Create a funding UTXO (vout=0) for NFT-related operations.
   * @param {number|bigint} [satsAmount] - Amount in satoshis to send.
   * @param {string|null} [receivingAddress] - Destination address; defaults to the wallet's first receiving address.
   * @returns {Promise<Object>} API response with transaction details.
   */
  async createFundingUtxo (satsAmount, receivingAddress = null) {
    const wallet = await this.getRawWallet();
    if (!receivingAddress) {
      receivingAddress = (await wallet.getAddressSetAt(0)).receiving;
    }
    
    // Use provided amount or estimate full requirement
    const satsToSend = satsAmount || this.estimateTokenOpSatsRequirement();
    const bchAmount = Number(satsToSend) / 1e8;
    
    console.log(`Sending ${satsToSend} sats (${bchAmount} BCH) to address:`, receivingAddress);
    
    const sendResult = await wallet.sendBch(bchAmount, receivingAddress);
    console.log('Transaction sent:', sendResult);

    if (sendResult.success == false) {
      throw new Error(`Failed to create vout=0 UTXO: ${sendResult.error}`);
    }
    
    return sendResult;
  }

  /**
   * Estimates satoshis needed for token-related operation
   * Based on actual mainnet-js transaction requirements
   * NB: Fragile estimation! should implement dynamic fee calculation
   * @returns {bigint} Estimated satoshis needed
   */
  estimateTokenOpSatsRequirement () {
    const tokenOutputValue = minTokenValue; // 1000 sats from constants
    const estimatedTxSize = 500; // More realistic: includes change outputs, token data
    const feeRate = 1.2; // sats/byte
    const estimatedFee = BigInt(Math.ceil(estimatedTxSize * feeRate));
    const dustLimit = 546n;
    const buffer = 20000n; // Larger buffer based on actual requirements (~20k sats observed)
    
    const total = tokenOutputValue + estimatedFee + dustLimit + buffer;
    
    console.log('Estimated token operation sats requirement:', {
      tokenOutputValue,
      estimatedFee,
      dustLimit,
      buffer,
      total: Number(total)
    });

    return total;
  }
}

/**
 * Loads the Wallet.
 * If walletIndex is not provided, uses the current wallet index from the store. 
 * The changeIndex defaults to 0.
 * The addressIndex defaults to 0.
 * @returns {Promise<Wallet>} The loaded wallet.
 */
export async function loadWallet (
    walletIndex = null, 
    changeIndex= DEFAULT_CHANGE_INDEX, 
    addressIndex = DEFAULT_ADDRESS_INDEX) {
  
  const isChipnet = Store.getters['global/isChipnet']
  const globalWallet = Store.getters['global/getWallet']('bch')
  if (walletIndex === null) walletIndex = Store.getters['global/getWalletIndex']
  const wallet = new Wallet(
    walletIndex,
    globalWallet.walletHash, 
    { changeIndex, addressIndex, isChipnet }
  )
  await wallet.loadWallet()
  return wallet
}

export async function loadCardMerchantWallet (merchantAddressIndex = 0) {
  const isChipnet = Store.getters['global/isChipnet']
  const globalWallet = Store.getters['global/getWallet']('bch')
  const walletIndex = Store.getters['global/getWalletIndex']
  
  const MERCHANT_CHANGE_INDEX = 7 // Dedicated change index for merchant wallet

  const wallet = new Wallet(walletIndex, globalWallet.walletHash, { 
    changeIndex: MERCHANT_CHANGE_INDEX, 
    addressIndex: merchantAddressIndex, 
    isChipnet: isChipnet
  })

  await wallet.loadWallet()
  return wallet
}
