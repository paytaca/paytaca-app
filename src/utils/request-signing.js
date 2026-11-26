import {
  binToHex,
  decodePrivateKeyWif,
  secp256k1,
  sha256,
  utf8ToBin
} from 'bitauth-libauth-v3'

// Protocol tag for the engagement-hub wallet request signature. It is part of
// the signed bytes and versioned on the server; do not change it without a
// matching server release.
export const AUTH_PROTOCOL_TAG = 'EHAUTH1'

export class WalletSigningUnavailable extends Error {
  constructor (message, reason = 'unavailable') {
    super(message)
    this.name = 'WalletSigningUnavailable'
    this.code = 'WALLET_SIGNING_UNAVAILABLE'
    this.reason = reason
  }
}

export function createNonce () {
  const source = globalThis.crypto
  if (!source) {
    throw new WalletSigningUnavailable(
      'No secure random source is available for request signing.',
      'no-random-source'
    )
  }
  if (typeof source.randomUUID === 'function') {
    return source.randomUUID().replace(/-/g, '')
  }
  const bytes = new Uint8Array(16)
  source.getRandomValues(bytes)
  return binToHex(bytes)
}

export function sha256Hex (bytes) {
  return binToHex(sha256.hash(bytes))
}

export function toBodyBytes (rawBody) {
  if (rawBody === undefined || rawBody === null) return new Uint8Array()
  if (rawBody instanceof Uint8Array) return rawBody
  if (typeof rawBody === 'string') return utf8ToBin(rawBody)
  throw new TypeError('rawBody must be a string, Uint8Array, or empty')
}

export function buildCanonical ({ method, fullPath, timestamp, nonce, rawBody }) {
  if (typeof method !== 'string' || !method) {
    throw new TypeError('method is required')
  }
  if (typeof fullPath !== 'string' || !fullPath) {
    throw new TypeError('fullPath is required')
  }
  if (timestamp === undefined || timestamp === null || String(timestamp) === '') {
    throw new TypeError('timestamp is required')
  }
  if (typeof nonce !== 'string' || !nonce) {
    throw new TypeError('nonce is required')
  }

  const bodyHash = sha256Hex(toBodyBytes(rawBody))
  return [
    AUTH_PROTOCOL_TAG,
    method.toUpperCase(),
    fullPath,
    String(timestamp),
    nonce,
    bodyHash
  ].join('\n')
}

export function currentTimestamp () {
  return String(Math.floor(Date.now() / 1000))
}

function decodeWif (wif) {
  if (typeof wif !== 'string' || !wif) {
    throw new WalletSigningUnavailable(
      'Wallet signing key is not available.',
      'missing-key'
    )
  }
  const decoded = decodePrivateKeyWif(wif)
  if (typeof decoded === 'string') {
    throw new WalletSigningUnavailable(
      'Wallet signing key is invalid: ' + decoded,
      'invalid-key'
    )
  }
  return decoded.privateKey
}

export function signCanonical (wif, canonical) {
  if (typeof canonical !== 'string' || !canonical) {
    throw new TypeError('canonical is required')
  }

  const privateKey = decodeWif(wif)
  const messageHash = sha256.hash(utf8ToBin(canonical))
  const derSignature = secp256k1.signMessageHashDER(privateKey, messageHash)
  if (typeof derSignature === 'string') {
    throw new WalletSigningUnavailable(
      'Could not sign request: ' + derSignature,
      'sign-failed'
    )
  }

  return {
    signature: binToHex(derSignature),
    publicKey: binToHex(secp256k1.derivePublicKeyCompressed(privateKey))
  }
}

export function signingHeaders ({
  wif,
  method,
  fullPath,
  rawBody,
  walletHash,
  timestamp,
  nonce
}) {
  const requestTimestamp = timestamp === undefined ? currentTimestamp() : String(timestamp)
  const requestNonce = nonce || createNonce()
  const canonical = buildCanonical({
    method,
    fullPath,
    timestamp: requestTimestamp,
    nonce: requestNonce,
    rawBody
  })
  const { signature, publicKey } = signCanonical(wif, canonical)

  const headers = {
    'public-key': publicKey,
    signature,
    timestamp: requestTimestamp,
    nonce: requestNonce
  }
  if (walletHash) headers['wallet-hash'] = String(walletHash)
  return headers
}
