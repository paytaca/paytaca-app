/**
 * ============================================================================
 * READ-ONLY WALLET - BSMS (BIP-129) descriptor parsing
 * ============================================================================
 * Parses an unencrypted BSMS 1.0 descriptor record (or a bare BIP-380 output
 * script descriptor) into the data needed to import a single-key read-only
 * wallet: the xpub, the BIP32 master fingerprint and the derivation path.
 */

import { isValidXpub, getXpubNetwork } from './readonly-wallet'

// BIP-380 key origin: [master-fingerprint/derivation-path]xpub/branch
const KEY_EXPRESSION_REGEX = /\[([0-9a-fA-F]{8})(?:\/([^\]]+))?\]([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)(?:\/([^\s),]+))?/g

const BARE_XPUB_REGEX = /([xtyYzZ]pub[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)/

const DEFAULT_DERIVATION_PATH = "m/44'/145'/0'"

/**
 * Parse an unencrypted BSMS 1.0 descriptor record or a bare descriptor into
 * read-only wallet import data.
 *
 * @param {string} text - The scanned/pasted descriptor (BSMS 1.0 record or a
 *   BIP-380 descriptor like `pkh([<fp>/44'/145'/0']<xpub>/0/*)`).
 * @param {Object} [opts]
 * @param {boolean} [opts.lenient=false] - When true, return partial data
 *   (`complete: false` + `error`) instead of throwing for single-key import
 *   issues (invalid xpub, non-mainnet, multiple keys).
 * @returns {{ xpub: string, masterFingerprint: string, derivationPath: string, complete: boolean, error?: string }}
 * @throws {Error} If no descriptor/key is found, or in strict mode for
 *   single-key import issues.
 */
export function parseReadOnlyDescriptor (text, { lenient = false } = {}) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('No descriptor found in scanned QR code')
  }

  let record = text.trim()

  // BSMS 1.0 record: the descriptor is on line 2
  if (record.startsWith('BSMS ')) {
    const lines = record
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    if (lines.length !== 4) {
      throw new Error(`Invalid BSMS record: expected 4 lines, got ${lines.length}`)
    }
    if (lines[0] !== 'BSMS 1.0') {
      throw new Error(`Unsupported BSMS version: ${lines[0]} (only BSMS 1.0 supported)`)
    }
    record = lines[1]
  }

  // Collect key expressions: [fp/path]xpub/branch
  const keys = []
  const re = new RegExp(KEY_EXPRESSION_REGEX.source, 'g')
  let match
  while ((match = re.exec(record)) !== null) {
    keys.push({
      fingerprint: match[1].toLowerCase(),
      path: match[2],
      xpub: match[3],
      branch: match[4]
    })
  }

  // Fallback: bare xpub without a key origin
  if (keys.length === 0) {
    const bare = record.match(BARE_XPUB_REGEX)
    if (bare) {
      keys.push({ fingerprint: '', path: '', xpub: bare[1], branch: '' })
    }
  }

  if (keys.length === 0) {
    throw new Error('No key (xpub) found in descriptor')
  }

  const key = keys[0]

  let complete = true
  let error = null
  if (!isValidXpub(key.xpub)) {
    complete = false
    error = 'Invalid xpub in descriptor'
  } else if (getXpubNetwork(key.xpub) !== 'mainnet') {
    complete = false
    error = 'Only mainnet (xpub) descriptors are supported'
  } else if (keys.length > 1) {
    complete = false
    error = 'Read-only wallets support a single key; descriptor contains multiple keys'
  }

  if (!complete && !lenient) {
    throw new Error(error)
  }

  return {
    xpub: key.xpub,
    masterFingerprint: key.fingerprint || '',
    derivationPath: normalizePath(key.path),
    complete,
    error
  }
}

/**
 * Normalize a BIP-380 origin path (e.g. `44'/145'/0'`) to the `m/...` form.
 * @param {string} path
 * @returns {string}
 */
function normalizePath (path) {
  if (!path) return DEFAULT_DERIVATION_PATH
  let normalized = String(path).trim().replace(/^\//, '')
  if (!normalized.startsWith('m')) normalized = `m/${normalized}`
  return normalized
}