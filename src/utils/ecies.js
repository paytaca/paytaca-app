import crypto from 'crypto'
import * as secp from '@noble/secp256k1'

/**
 * Encrypt data with a public key using ECIES (Elliptic Curve Integrated Encryption Scheme)
 * Only the holder of the corresponding private key can decrypt this data
 * 
 * @param {string | Object | Array | number | boolean} data - Data to encrypt
 * @param {string} recipientPubkey - 66-char hex compressed public key (secp256k1)
 * @returns {{encryptedData: string, ephemeralPubkey: string}} Base64 encrypted data and hex ephemeral pubkey
 */
export function encryptWithPublicKey(data, recipientPubkey) {
  const plaintext = normalizePayload(data)
  if (!plaintext) {
    throw new Error('Data must be a non-empty string or a JSON-serializable value')
  }
  
  if (!recipientPubkey || typeof recipientPubkey !== 'string' || recipientPubkey.length !== 66) {
    throw new Error('Recipient public key must be a 66-char hex string')
  }

  const ephemeralPrivkey = crypto.randomBytes(32)
  const ephemeralPubkey = secp.getPublicKey(ephemeralPrivkey)
  
  const recipientPubBytes = secp.etc.hexToBytes(recipientPubkey)
  const sharedPoint = secp.getSharedSecret(ephemeralPrivkey, recipientPubBytes)
  const sharedSecret = sharedPoint.slice(1, 33) // Use X coordinate (32 bytes)

  // Use a random IV with AES-256-GCM for authenticated encryption (IND-CCA2 secure)
  const iv = crypto.randomBytes(12) // 96-bit IV recommended for GCM

  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(sharedSecret), iv)
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(plaintext, 'utf8')),
    cipher.final()
  ])
  const authTag = cipher.getAuthTag() // 16-byte GCM authentication tag

  // Encode as iv (12) + authTag (16) + ciphertext, all base64
  const combined = Buffer.concat([iv, authTag, ciphertext])

  return {
    encryptedData: combined.toString('base64'),
    encryptKey: secp.etc.bytesToHex(ephemeralPubkey)
  }
}

function normalizePayload(data) {
  if (typeof data === 'string') return data
  if (data === null || typeof data === 'undefined') return ''

  if (typeof data === 'object' || Array.isArray(data) || typeof data === 'number' || typeof data === 'boolean') {
    try {
      return JSON.stringify(data)
    } catch {
      return ''
    }
  }

  return ''
}

/**
 * Derive public key from private key
 * 
 * @param {string} privateKey - 64-char hex private key
 * @returns {string} 66-char hex compressed public key
 */
export function getPublicKeyFromPrivate(privateKey) {
  if (!privateKey || typeof privateKey !== 'string' || !/^[0-9a-f]{64}$/i.test(privateKey)) {
    throw new Error('Private key must be a 64-char hex string')
  }
  
  const privBytes = secp.etc.hexToBytes(privateKey)
  const pubkey = secp.getPublicKey(privBytes)
  return secp.etc.bytesToHex(pubkey)
}
