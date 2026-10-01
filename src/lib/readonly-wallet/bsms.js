/**
 * ============================================================================
 * READ-ONLY WALLET - BSMS (BIP-129) descriptor parsing
 * ============================================================================
 * Parses an unencrypted BSMS 1.0 descriptor record (or a bare BIP-380 output
 * script descriptor) into the data needed to import a single-key read-only
 * wallet: the xpub, the BIP32 master fingerprint and the derivation path.
 */

import { isValidXpub, getXpubNetwork, default as ReadOnlyWallet } from './readonly-wallet'

// BIP-380 key origin: [master-fingerprint/derivation-path]xpub/branch
const KEY_EXPRESSION_REGEX = /\[([0-9a-fA-F]{8})(?:\/([^\]]+))?\]([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)(?:\/([^\s),]+))?/g

const BARE_XPUB_REGEX = /([xtyYzZ]pub[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)/

// BIP-380 descriptor checksum (https://github.com/bitcoin/bips/blob/master/bip-0380.mediawiki)
const DESCSUM_INPUT_CHARSET =
  "0123456789()[],'/*abcdefgh@:$%{}IJKLMNOPQRSTUVWXYZ&+-.;<=>?!^_|~ijklmnopqrstuvwxyzABCDEFGH`#\"\\ "
const DESCSUM_CHECKSUM_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
const DESCSUM_GEN = [0xf5dee51989n, 0xa9fdca3312n, 0x1bab10e32dn, 0x3706b1677an, 0x644d626ffdn]

function descsumPolyMod (c, val) {
  const c0 = c >> 35n
  c = ((c & 0x7ffffffffn) << 5n) ^ BigInt(val)
  for (let i = 0; i < 5; i++) {
    if ((c0 >> BigInt(i)) & 1n) c ^= DESCSUM_GEN[i]
  }
  return c
}

/**
 * Compute the BIP-380 output script descriptor checksum (8 chars).
 * @param {string} descriptor
 * @returns {string}
 */
export function descriptorChecksum (descriptor) {
  let c = 1n
  let cls = 0
  let clscount = 0
  for (const ch of String(descriptor)) {
    const pos = DESCSUM_INPUT_CHARSET.indexOf(ch)
    if (pos < 0) throw new Error('Descriptor contains invalid characters for checksum')
    c = descsumPolyMod(c, pos & 31)
    cls = cls * 3 + (pos >> 5)
    clscount++
    if (clscount === 3) {
      c = descsumPolyMod(c, cls)
      cls = 0
      clscount = 0
    }
  }
  if (clscount > 0) c = descsumPolyMod(c, cls)
  for (let j = 0; j < 8; j++) c = descsumPolyMod(c, 0)
  c ^= 1n

  let checksum = ''
  for (let j = 0; j < 8; j++) {
    checksum += DESCSUM_CHECKSUM_CHARSET[Number((c >> BigInt(5 * (7 - j))) & 0x1fn)]
  }
  return checksum
}

/**
 * Build an unencrypted BSMS 1.0 descriptor record for a single-key read-only
 * wallet, ready to be encoded as a QR code:
 *
 *   BSMS 1.0
 *   pkh([<fingerprint>/<path>]<xpub>/0/*)#<checksum>
 *   /0/*,/1/*
 *   <first p2pkh address>
 *
 * @param {Object} config - ReadOnlyWallet config ({ xpub, masterFingerprint?, derivationPath? })
 * @returns {string} BSMS 1.0 record
 */
export function buildReadOnlyBsmsDescriptor (config) {
  const xpub = config?.xpub
  if (!xpub) return ''
  // Master fingerprint comes from the seed and is stored on import; never derive
  // a fake one from the xpub. Fall back to a zero placeholder to keep the origin.
  const fingerprint = config.masterFingerprint || '00000000'
  const path = (config.derivationPath || "m/44'/145'/0'").replace(/^m\//, '').replace(/^\//, '')
  const descriptor = `pkh([${fingerprint}/${path}]${xpub}/0/*)`
  const checksum = descriptorChecksum(descriptor)
  const firstAddress = new ReadOnlyWallet(config).getAddressAt('0/0', 'mainnet')
  return [
    'BSMS 1.0',
    `${descriptor}#${checksum}`,
    '/0/*,/1/*',
    firstAddress
  ].join('\n')
}

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

  // Strip + validate the BIP-380 descriptor checksum (#xxxxxxxx) when present
  let checksum = ''
  const checksumIdx = record.lastIndexOf('#')
  if (checksumIdx !== -1) {
    const candidate = record.slice(checksumIdx + 1)
    if (/^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{8}$/.test(candidate)) {
      checksum = candidate
      record = record.slice(0, checksumIdx).trim()
    }
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
  if (checksum && descriptorChecksum(record) !== checksum) {
    complete = false
    error = 'Descriptor checksum mismatch — data may be corrupted or tampered'
  } else if (!isValidXpub(key.xpub)) {
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