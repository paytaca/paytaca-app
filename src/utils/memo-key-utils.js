import { loadWallet } from 'src/wallet'
import crypto from 'crypto'
import * as secp from '@noble/secp256k1'

/**
 * Derives encryption keypair from mnemonic using address 0/0 private key as seed
 * @param {number} walletIndex - Index of wallet in vault
 * @returns {Promise<{privkey: string, pubkey: string}>} - 64-char hex privkey and 66-char hex pubkey
 */
export async function getEncryptionKeypairFromMnemonic(walletIndex = 0) {
  // Load wallet from mnemonic
  const wallet = await loadWallet('BCH', walletIndex)
  if (!wallet || !wallet.BCH) {
    throw new Error('Failed to load BCH wallet')
  }

  // Get private key at path 0/0 (returns WIF string like "L123...")
  const wif = await wallet.BCH.getPrivateKey('0/0')
  if (!wif || typeof wif !== 'string') {
    throw new Error('Failed to get private key from address 0/0')
  }

  // The old generateKeypair did: privkey = sha256(seed) where seed is the WIF string (UTF-8)
  // So we hash the WIF string once as UTF-8 to get the derivative privkey
  // This matches the old behavior: hash(WIF as UTF-8) → privkey
  const _sha256 = crypto.createHash('sha256')
  _sha256.update(Buffer.from(wif, 'utf8'))
  const privkey = _sha256.digest().toString('hex')
  const pubkey = privToPub(privkey)

  return { privkey, pubkey }
}

/**
 * Derives public key of address 0/0 from mnemonic
 * @param {number} walletIndex - Index of wallet in vault
 * @returns {Promise<string>} - 66-char hex compressed public key
 */
export async function getAddress0_0PublicKey(walletIndex = 0) {
  // Load wallet from mnemonic
  const wallet = await loadWallet('BCH', walletIndex)
  if (!wallet || !wallet.BCH) {
    throw new Error('Failed to load BCH wallet')
  }

  // Get public key at path 0/0 (returns hex string)
  const pubkey = await wallet.BCH.getPublicKey('0/0')
  if (!pubkey || typeof pubkey !== 'string') {
    throw new Error('Failed to get public key from address 0/0')
  }

  return pubkey
}

/**
 * Gets recipient pubkeys for encryption (their address 0/0 public keys)
 * For now, this is primarily for P2P chat where we need both parties' pubkeys
 * @param {string[]} walletHashes - Array of wallet hashes to get pubkeys for
 * @returns {Promise<string[]>} - Array of 66-char hex compressed public keys
 */
export async function getRecipientPubkeysFromWalletHashes(walletHashes) {
  if (!Array.isArray(walletHashes) || walletHashes.length === 0) {
    return []
  }

  // For now, we need to find wallet indices from hashes
  // This might need to be enhanced based on how wallet hashes map to indices
  // For P2P chat, the wallet hashes should correspond to the sender and receiver
  const pubkeys = []
  
  // Note: This function might need wallet hash to index mapping
  // For now, we'll handle this in the calling code where we have more context
  throw new Error('getRecipientPubkeysFromWalletHashes needs wallet hash to index mapping - use getAddress0_0PublicKey directly')
}

/**
 * Gets encryption keypair for a wallet by its hash
 * This assumes we can determine wallet index from hash
 * @param {string} walletHash - Wallet hash
 * @returns {Promise<{privkey: string, pubkey: string}>}
 */
export async function getEncryptionKeypairFromWalletHash(walletHash) {
  // For now, assume current wallet - this might need enhancement
  // to map wallet hashes to indices
  const walletIndex = 0 // TODO: Map wallet hash to index
  return getEncryptionKeypairFromMnemonic(walletIndex)
}

/**
 * Derives public key from private key using secp256k1
 * @param {string} privkey - 64-char hex private key
 * @returns {string} - 66-char hex compressed public key
 */
function privToPub(priv) {
  const privBytes = secp.etc.hexToBytes(priv)
  const pub = secp.getPublicKey(privBytes)
  const pubHex = secp.etc.bytesToHex(pub)
  return pubHex
}

/**
 * SHA256 hash function
 * @param {string} data - Data to hash (hex string or UTF-8 string)
 * @returns {string} - 64-char hex hash
 */
function sha256(data) {
  const _sha256 = crypto.createHash('sha256')
  // If data is hex string, convert to buffer
  if (/^[0-9a-f]{64}$/i.test(data)) {
    _sha256.update(Buffer.from(data, 'hex'))
  } else {
    _sha256.update(Buffer.from(data, 'utf8'))
  }
  return _sha256.digest().toString('hex')
}
