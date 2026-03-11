import Watchtower from 'watchtower-cash-js'
import BCHJS from '@psf/bch-js'
import sha256 from 'js-sha256'
import {
  decodeHdPublicKey,
  deriveHdPublicNodeChild,
  encodeLockingBytecodeP2pkh,
  lockingBytecodeToCashAddress,
} from '@bitauth/libauth'
import { getWatchtowerApiUrl, convertCashAddress } from './chipnet'

const bchjs = new BCHJS()

/**
 * ReadOnlyWallet class - A wallet that can only view balances and transactions,
 * but cannot spend. Uses only xPub (extended public key) - no private keys.
 * 
 * This is useful for:
 * - Monitoring wallets without risking funds
 * - View-only access for security
 * - Importing wallets from hardware devices
 */
export class ReadOnlyWallet {
  constructor (xPubKey, walletHash, derivationPath = "m/44'/145'/0'", isChipnet = false) {
    if (!walletHash || walletHash.length !== 64) {
      throw new Error('Wallet hash is required and must be 64 characters')
    }
    this.isReadOnly = true
    this.xPubKey = xPubKey
    this.walletHash = walletHash
    this.derivationPath = derivationPath
    this.isChipnet = isChipnet
    this.watchtower = new Watchtower(isChipnet)
    this.baseUrl = getWatchtowerApiUrl(isChipnet)
  }

  /**
   * Get the xPub key
   * @returns {string} The xPub key
   */
  getXPubKey () {
    return this.xPubKey
  }

  /**
   * Decode the xPub key to get the HD public node
   * @returns {Object} The decoded HD public node
   */
  _getDecodedXPub () {
    const decoded = decodeHdPublicKey(this.xPubKey)
    if (typeof decoded === 'string') {
      throw new Error(`Failed to decode xPub key: ${decoded}`)
    }
    return decoded
  }

  /**
   * Get address set at a specific index using the xPub key
   * Derives addresses from public key only - no private key access
   * @param {number} index - The address index
   * @returns {Object} Object with receiving and change addresses
   */
  async getAddressSetAt (index) {
    const decodedXPub = this._getDecodedXPub()
    const node = decodedXPub.node

    // Derive receiving address (m/44'/145'/0'/0/index)
    const receivingNode = deriveHdPublicNodeChild(node, 0)
    const receivingChildNode = deriveHdPublicNodeChild(receivingNode, index)
    
    // Derive change address (m/44'/145'/0'/1/index)
    const changeNode = deriveHdPublicNodeChild(node, 1)
    const changeChildNode = deriveHdPublicNodeChild(changeNode, index)

    // Create P2PKH locking bytecode from public key, then convert to cash address
    const receivingLockingBytecode = encodeLockingBytecodeP2pkh(receivingChildNode.publicKey)
    const changeLockingBytecode = encodeLockingBytecodeP2pkh(changeChildNode.publicKey)

    // Convert locking bytecode to cash address
    const network = this.isChipnet ? 'testnet' : 'mainnet'
    const receivingResult = lockingBytecodeToCashAddress({
      bytecode: receivingLockingBytecode,
      prefix: network === 'mainnet' ? 'bitcoincash' : 'bchtest'
    })
    const changeResult = lockingBytecodeToCashAddress({
      bytecode: changeLockingBytecode,
      prefix: network === 'mainnet' ? 'bitcoincash' : 'bchtest'
    })

    if (typeof receivingResult === 'string' || typeof changeResult === 'string') {
      throw new Error('Failed to convert locking bytecode to cash address')
    }

    let receivingAddress = receivingResult.address
    let changeAddress = changeResult.address

    // Convert to chipnet format if needed
    if (this.isChipnet) {
      receivingAddress = convertCashAddress(receivingAddress, this.isChipnet, false)
      changeAddress = convertCashAddress(changeAddress, this.isChipnet, false)
    }

    return {
      receiving: receivingAddress,
      change: changeAddress
    }
  }

  /**
   * Subscribe addresses to watchtower
   * @param {number} index - The address index
   * @returns {Object|null} Subscription result or null if failed
   */
  async getNewAddressSet (index) {
    const addresses = await this.getAddressSetAt(index)
    
    const data = {
      addresses,
      walletHash: this.walletHash,
      addressIndex: index
    }
    
    const result = await this.watchtower.subscribe(data)
    if (result.success) {
      return {
        addresses
      }
    } else {
      return null
    }
  }

  /**
   * Get the last used address index from watchtower
   * @param {Object} opts - Options
   * @param {boolean} opts.with_tx - Only addresses with transactions
   * @param {boolean} opts.exclude_pos - Exclude POS addresses
   * @param {number} opts.posid - POS device ID
   * @returns {number|undefined} The last address index or undefined
   */
  async getLastAddressIndex (opts = {}) {
    const _params = {
      with_tx: opts?.with_tx || false,
      exclude_pos: opts?.exclude_pos || false,
      posid: opts?.posid || undefined,
    }
    
    try {
      const apiResponse = await this.watchtower.BCH._api.get(
        `last-address-index/wallet/${this.walletHash}/`,
        { params: _params },
      )
      if (Number.isInteger(apiResponse?.data?.address?.address_index)) {
        return apiResponse.data.address.address_index
      }
    } catch (error) {
      console.error('Error getting last address index:', error)
    }
    return undefined
  }

  /**
   * Scan UTXOs for the wallet
   * @param {Object} opts - Options
   * @param {boolean} opts.background - Run in background
   * @returns {Promise} API response
   */
  async scanUtxos (opts = {}) {
    const queryParams = {}
    if (opts?.background) queryParams.background = true

    return this.watchtower.BCH._api.get(
      `utxo/wallet/${this.walletHash}/scan/`,
      { params: queryParams },
    )
  }

  /**
   * Get UTXOs for the wallet
   * @param {Object} opts - Options
   * @param {string} opts.category - Token category (for cashtokens)
   * @param {boolean} opts.nft - Filter for NFTs
   * @returns {Array} Array of UTXOs
   */
  async getUtxos (opts = {}) {
    const params = {}
    let url = `utxo/wallet/${this.walletHash}/`
    
    if (opts?.category) {
      url += opts?.category + '/'
      params.is_cashtoken = true
      params.is_cashtoken_nft = Boolean(opts?.nft)
    }

    const response = await this.watchtower.BCH._api.get(url, { params })
    if (!Array.isArray(response.data?.utxos)) {
      return Promise.reject({ response })
    }

    return response.data?.utxos
  }

  /**
   * Scan addresses in a range
   * @param {Object} opts - Options
   * @param {number} opts.startIndex - Start index
   * @param {number} opts.count - Number of addresses to scan
   * @returns {Object} Scan result
   */
  async scanAddresses (opts) {
    const response = { success: false, error: '' }
    
    if (!Number.isSafeInteger(opts?.startIndex)) {
      response.error = 'Invalid start index'
      return response
    }

    if (!Number.isSafeInteger(opts?.count)) {
      response.error = 'Invalid count'
      return response
    }

    const startIndex = opts.startIndex
    const endIndex = opts.startIndex + opts.count
    const addressSets = []
    
    for (let addressIndex = startIndex; addressIndex < endIndex; addressIndex++) {
      const addresses = await this.getAddressSetAt(addressIndex)
      addressSets.push({ address_index: addressIndex, addresses: addresses })
    }

    const data = {
      address_sets: addressSets,
      wallet_hash: this.walletHash,
      project_id: null, // Read-only wallets don't have a project ID
    }

    try {
      const apiResponse = await this.watchtower.BCH._api.post('wallet/address-scan/', data)
      response.success = true
      response.subscriptionResponses = apiResponse.data
    } catch (error) {
      response.error = error
    }
    
    return response
  }

  /**
   * Get wallet balance
   * @param {string} tokenId - Optional token ID
   * @param {string} txid - Optional transaction ID
   * @param {number} index - Address index
   * @returns {Object} Balance data
   */
  async getBalance (tokenId = '', txid = '', index = 0) {
    const request = await this.watchtower.Wallet.getBalance({ 
      walletHash: this.walletHash, 
      tokenId, 
      txid, 
      index 
    })
    return request
  }

  /**
   * Get transaction history
   * @param {Object} opts - Options
   * @param {number} opts.page - Page number
   * @param {string} opts.recordType - Record type
   * @param {string} opts.tokenId - Token ID
   * @param {string} opts.txSearchReference - Transaction search reference
   * @returns {Object} Transaction data
   */
  async getTransactions ({ page, recordType, tokenId, txSearchReference }) {
    const request = await this.watchtower.Wallet.getHistory({ 
      walletHash: this.walletHash, 
      tokenId, 
      page, 
      recordType, 
      txSearchReference 
    })
    return request
  }

  /**
   * Get token details
   * @param {string} tokenId - Token ID
   * @returns {Object|null} Token details or null
   */
  async getTokenDetails (tokenId) {
    try {
      const url = `tokens/${tokenId}`
      const response = await this.watchtower.BCH._api.get(url)
      return response.data
    } catch (error) {
      console.error('Error getting token details:', error)
      return null
    }
  }

  /**
   * Send BCH - BLOCKED for read-only wallets
   * @throws {Error} Always throws an error
   */
  async sendBch () {
    throw new Error('Cannot send from read-only wallet. Import the wallet with its mnemonic to send transactions.')
  }

  /**
   * Send BCH to POS - BLOCKED for read-only wallets
   * @throws {Error} Always throws an error
   */
  async sendBchToPOS () {
    throw new Error('Cannot send from read-only wallet. Import the wallet with its mnemonic to send transactions.')
  }

  /**
   * Send BCH to multiple recipients - BLOCKED for read-only wallets
   * @throws {Error} Always throws an error
   */
  async sendBchMultiple () {
    throw new Error('Cannot send from read-only wallet. Import the wallet with its mnemonic to send transactions.')
  }

  /**
   * Get private key - BLOCKED for read-only wallets
   * @throws {Error} Always throws an error
   */
  async getPrivateKey () {
    throw new Error('Cannot access private keys in read-only wallet. Import the wallet with its mnemonic to access private keys.')
  }

  /**
   * Get public key at a specific address path
   * Derives from xPub since we don't have private keys
   * @param {string} addressPath - Address path (e.g., "0/0")
   * @returns {string} Public key as hex string
   */
  async getPublicKey (addressPath) {
    const decodedXPub = this._getDecodedXPub()
    const node = decodedXPub.node

    const parts = addressPath.split('/')
    if (parts.length !== 2) {
      throw new Error('Invalid address path format. Expected: "change/index"')
    }

    const changeIndex = parseInt(parts[0], 10)
    const addressIndex = parseInt(parts[1], 10)

    if (isNaN(changeIndex) || isNaN(addressIndex)) {
      throw new Error('Invalid address path. Change and index must be numbers.')
    }

    // Derive the child node
    const changeNode = deriveHdPublicNodeChild(node, changeIndex)
    const addressNode = deriveHdPublicNodeChild(changeNode, addressIndex)

    // Return the public key as hex
    return binToHex(addressNode.publicKey)
  }

  /**
   * Sign message - BLOCKED for read-only wallets
   * @throws {Error} Always throws an error
   */
  async signMessage () {
    throw new Error('Cannot sign messages in read-only wallet. Import the wallet with its mnemonic to sign messages.')
  }

  /**
   * Verify a message signature
   * @param {string} address - The address that signed
   * @param {string} signature - The signature
   * @param {string} message - The message
   * @returns {boolean} True if valid
   */
  async verifyMessage (address, signature, message) {
    return bchjs.BitcoinCash.verifyMessage(address, signature, message)
  }
}

/**
 * Create a read-only wallet from an xPub key
 * @param {string} xPubKey - The extended public key
 * @param {boolean} isChipnet - Whether to use chipnet (testnet)
 * @returns {ReadOnlyWallet} A new read-only wallet instance
 */
export function createReadOnlyWallet (xPubKey, isChipnet = false) {
  // Default BCH derivation path
  const derivationPath = "m/44'/145'/0'"
  return new ReadOnlyWallet(xPubKey, derivationPath, isChipnet)
}

/**
 * Validate an xPub key
 * @param {string} xPubKey - The xPub key to validate
 * @returns {boolean} True if valid
 */
export function validateXPubKey (xPubKey) {
  if (!xPubKey || typeof xPubKey !== 'string') {
    return false
  }
  
  try {
    const decoded = decodeHdPublicKey(xPubKey)
    return typeof decoded !== 'string'
  } catch {
    return false
  }
}

export default ReadOnlyWallet
