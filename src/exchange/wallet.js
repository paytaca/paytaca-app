import { decodePrivateKeyWif, binToHex, secp256k1, utf8ToBin, sha256, hexToBin } from '@bitauth/libauth'
import { IncorrectWIFError } from '@generalprotocols/anyhedge'
import { loadLibauthHdWallet, loadWallet } from 'src/wallet'
import { Store } from 'src/store'
import { markRaw } from 'vue'

/**
 * Class representing a Ramp Wallet.
 */
export class RampWallet {
  /**
   * Create a Ramp Wallet.
   * @param {number} walletIndex - The index of the wallet.
   * @param {string} walletHash - The hash of the wallet.
   * @param {number} addressIndex - The index of the address.
   * @param {boolean} [isChipnet=false] - Whether the wallet is for Chipnet.
   */
  constructor (walletIndex, walletHash, addressIndex, isChipnet = false) {
    this.walletHash = walletHash
    this.walletIndex = walletIndex
    this.addressIndex = addressIndex
    this.isChipnet = isChipnet
  }

  assertIdentity (registered) {
    const current = Store.getters['global/getWallet']('bch')
    const matches = this.wallet &&
      this.walletHash === current?.walletHash &&
      this.walletIndex === Store.getters['global/getWalletIndex'] &&
      this.isChipnet === Store.getters['global/isChipnet'] &&
      (!registered?.wallet_hash || registered.wallet_hash === this.walletHash) &&
      registered?.public_key === this.pubkey() &&
      registered?.address === this.address() &&
      registered?.address_path === this.addressPath()
    if (!matches) {
      throw Object.assign(new Error('The local wallet does not match the registered P2P identity. P2P signing and funding are blocked. Verify the wallet, derivation path, and identity encoding. Changing the registered identity through profile editing is unsupported.'), { code: 'p2p_identity_mismatch' })
    }
  }

  /**
   * Load the wallet.
   * @returns {Promise<void>}
   */
  async loadWallet () {
    this.wallet = await loadLibauthHdWallet(this.walletIndex, this.isChipnet)
  }

  /**
   * Get the raw wallet.
   * @returns {Promise<Object>} The raw wallet.
   */
  async getRawWallet () {
    let rawWallet = await markRaw(loadWallet('BCH', this.walletIndex))
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
    return `0/${addressIndex}`
  }

  /**
   * Get the address.
   * @param {string} [addressPath=''] - The address path.
   * @returns {string} The address.
   */
  address (addressPath = '') {
    if (!addressPath) addressPath = this.addressPath()
    return this.wallet.getAddressAt({ path: addressPath })
  }

  /**
   * Get the public key.
   * @param {string} [addressPath=''] - The address path.
   * @returns {string} The public key.
   */
  pubkey (addressPath = '') {
    if (!addressPath) addressPath = this.addressPath()
    return this.wallet.getPubkeyAt(addressPath)
  }

  /**
   * Get the private key in WIF format.
   * @param {string} [addressPath=''] - The address path.
   * @returns {string} The private key in WIF format.
   */
  privkey (addressPath = '') {
    if (!addressPath) addressPath = this.addressPath()
    return this.wallet.getPrivateKeyWifAt(addressPath)
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
}

const ADDRESS_INDEX = 0
export let wallet = new RampWallet()

/**
 * Load the Ramp Wallet.
 * @returns {Promise<RampWallet>} The loaded wallet.
 */
export async function loadRampWallet () {
  const isChipnet = Store.getters['global/isChipnet']
  const walletIndex = Store.getters['global/getWalletIndex']
  const globalWallet = Store.getters['global/getWallet']('bch')
  const loadedWallet = new RampWallet(walletIndex, globalWallet.walletHash, ADDRESS_INDEX, isChipnet)
  await loadedWallet.loadWallet()
  if (walletIndex !== Store.getters['global/getWalletIndex'] ||
      globalWallet.walletHash !== Store.getters['global/getWallet']('bch')?.walletHash ||
      isChipnet !== Store.getters['global/isChipnet']) {
    throw Object.assign(new Error('The active wallet changed while loading P2P.'), { code: 'p2p_identity_mismatch' })
  }
  wallet = loadedWallet
  return wallet
}
