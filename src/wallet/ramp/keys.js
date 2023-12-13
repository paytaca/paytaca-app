import crypto from 'crypto'
import * as secp from '@noble/secp256k1'

/**
 * @param {Object} opts
 * @param {String} opts.seed
 */
export function generateKeypair (opts = { seed: '' }) {
  const seed = opts?.seed
  let privkey = ''
  if (seed && typeof seed === 'string') {
    privkey = sha256(seed)
  } else {
    const privBytes = crypto.randomFillSync(new Uint8Array(32))
    privkey = Buffer.from(privBytes).toString('hex')
  }

  const pubkey = privToPub(privkey)
  return { privkey, pubkey }
}

export function privToPub (priv) {
  const privBytes = secp.etc.hexToBytes(priv)
  const pub = secp.getPublicKey(privBytes)
  const pubHex = secp.etc.bytesToHex(pub)
  return pubHex
}

/**
 * @param {String} data
 * @returns {String}
 */
export function sha256 (data) {
  const _sha256 = crypto.createHash('sha256')
  _sha256.update(Buffer.from(data, 'utf8'))
  return _sha256.digest().toString('hex')
}
