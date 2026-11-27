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

// Client-side kill switch for the rollout. Signing is on unless the build sets
// this to "false"; the server flag is the long-lived switch. Delete this in the
// next release once every domain is in enforce.
export function isWalletRequestSigningEnabled () {
  return String(process.env.WALLET_REQUEST_SIGNING ?? 'true').toLowerCase() !== 'false'
}

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
    // libauth's message is deliberately not included: it can quote a character
    // from the input, and a signing failure must never surface key material.
    throw new WalletSigningUnavailable(
      'Wallet signing key is not a valid WIF.',
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
    // Never include libauth's message: it can echo key material.
    throw new WalletSigningUnavailable(
      'Could not sign the request with this wallet.',
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

// Headers the server requires as a set. A request carries all five or none:
// the server treats a partial set as unsigned in log mode and rejects it in
// enforce mode, so a half-signed request is strictly worse than an unsigned one.
export const WALLET_AUTH_HEADERS = [
  'public-key',
  'signature',
  'timestamp',
  'nonce',
  'wallet-hash'
]

const CLOCK_SKEW_THRESHOLD_SECONDS = 120

let clockOffsetSeconds = 0

export function getClockOffsetSeconds () {
  return clockOffsetSeconds
}

function recordServerClock (headers) {
  const raw = headers?.date
  if (!raw) return
  const serverMs = Date.parse(raw)
  if (!Number.isFinite(serverMs)) return
  clockOffsetSeconds = Math.round((Date.now() - serverMs) / 1000)
}

/**
 * Classifies a failed request as a wallet-auth rejection.
 *
 * The server answers a bad signature, a stale timestamp, a replayed nonce, or
 * a wallet-hash mismatch with 403, so the status is the signal. `isClockSkew`
 * only says the device clock is far enough from the server's for a timestamp
 * window failure to be the likely cause; it is never proof.
 */
export function walletAuthFailure (error) {
  const status = error?.response?.status ?? null
  const detail = error?.response?.data?.detail || error?.response?.data?.error || ''
  const isSigningFailure = status === 403
  return {
    isSigningFailure,
    isClockSkew: isSigningFailure && Math.abs(clockOffsetSeconds) > CLOCK_SKEW_THRESHOLD_SECONDS,
    offsetSeconds: clockOffsetSeconds,
    detail: typeof detail === 'string' ? detail : ''
  }
}

function isPlainObject (value) {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Turns the request body into the exact bytes that will be signed and sent.
 *
 * Axios runs request interceptors before `transformRequest`, so an object body
 * is still an object here. Stringifying it once and handing the string back
 * keeps the signed bytes and the sent bytes identical: `transformRequest`
 * passes a string through untouched once the JSON content type is set.
 */
function serializeBody (data) {
  if (data === undefined || data === null) {
    return { rawBody: new Uint8Array() }
  }
  if (typeof data === 'string') {
    return { rawBody: data }
  }
  if (Array.isArray(data) || isPlainObject(data)) {
    const serialized = JSON.stringify(data)
    if (typeof serialized !== 'string') {
      throw new WalletSigningUnavailable(
        'Request body could not be serialized.',
        'unsupported-body'
      )
    }
    return { rawBody: serialized, body: serialized, isJson: true }
  }
  throw new WalletSigningUnavailable(
    'Refusing to sign a non-JSON request body.',
    'unsupported-body'
  )
}

/**
 * The path the server will match against: `request.get_full_path()`, i.e. the
 * leading slash, the trailing slash, and the query string exactly as sent.
 *
 * This mirrors axios' own `buildFullPath`/`combineURLs` rather than
 * `new URL(url, baseURL)`. The two disagree for a URL that starts with `/`:
 * axios trims the slashes at the seam and keeps the base path, while `new URL`
 * resolves against the origin and drops the base path. Signing the wrong path
 * would be a silent 403 in enforce mode, so the join has to match the
 * transport byte for byte.
 */
function fullRequestUrl ({ url, baseURL }) {
  if (!url) throw new Error('Request URL is missing')
  const isAbsolute = /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url)
  if (baseURL && !isAbsolute) {
    return baseURL.replace(/\/?\/$/, '') + '/' + url.replace(/^\/+/, '')
  }
  return url
}

function signedPath (config) {
  const resolved = new URL(fullRequestUrl(config))
  // A fragment never reaches the server, so it is not part of the signed path.
  return resolved.pathname + resolved.search
}

function hasQueryParams (config) {
  const params = config.params
  if (!params) return false
  if (typeof params === 'object') return Object.keys(params).length > 0
  return String(params).length > 0
}

const attachedInstances = new WeakSet()

/**
 * Signs every request on an axios instance with the wallet key.
 *
 * Signing is a denylist: a request is signed unless it sets
 * `config.skipWalletSignature`. An allowlist would turn every missed call
 * site into a silent 403 once the server moves to enforce mode.
 *
 * `hooks` is injected so this module stays free of app imports:
 *   - getWalletHash()  -> active wallet hash, or a falsy value
 *   - getPrivateKey(hash) -> WIF string, or null for watch-only
 *   - isChipnet()      -> true when the app is on chipnet
 *   - isDevelopment()  -> true to fail loudly on unsupported requests
 */
export function attachSignedRequests (instance, hooks = {}) {
  if (!instance?.interceptors) {
    throw new TypeError('attachSignedRequests requires an axios instance')
  }
  for (const name of ['getWalletHash', 'getPrivateKey', 'isChipnet', 'isDevelopment']) {
    if (typeof hooks[name] !== 'function') {
      throw new TypeError('attachSignedRequests requires a ' + name + ' hook')
    }
  }
  if (!isWalletRequestSigningEnabled()) return
  if (attachedInstances.has(instance)) return
  attachedInstances.add(instance)

  const warnUnsigned = (reason) => {
    console.warn('wallet signing unavailable: ' + reason)
  }

  instance.interceptors.request.use(async (config) => {
    if (config.skipWalletSignature === true) return config

    if (hooks.isChipnet()) {
      warnUnsigned('chipnet')
      return config
    }

    const walletHash = config.signWithWallet || await hooks.getWalletHash()
    if (!walletHash) {
      warnUnsigned('no active wallet')
      return config
    }

    if (hasQueryParams(config)) {
      const message = 'Request signing does not support config.params; inline the query string in the URL'
      if (hooks.isDevelopment()) throw new Error(message)
      warnUnsigned('config.params is not supported')
      return config
    }

    let body
    try {
      body = serializeBody(config.data)
    } catch (error) {
      warnUnsigned(error.message)
      return config
    }

    let fullPath
    try {
      fullPath = signedPath(config)
    } catch (error) {
      if (hooks.isDevelopment()) throw error
      warnUnsigned(error.message)
      return config
    }

    if (hooks.isDevelopment() && body.isJson && isPlainObject(config.data)) {
      const declared = config.data.wallet_hash
      if (declared && declared !== walletHash) {
        console.warn(
          'wallet signing: body names wallet ' + declared +
          ' but the request is signed by ' + walletHash
        )
      }
    }

    let wif
    try {
      wif = await hooks.getPrivateKey(walletHash)
    } catch (error) {
      warnUnsigned(error?.message || 'key unavailable')
      return config
    }
    if (!wif) {
      warnUnsigned('watch-only or locked wallet')
      return config
    }

    let headers
    try {
      headers = signingHeaders({
        wif,
        method: config.method,
        fullPath,
        rawBody: body.rawBody,
        walletHash
      })
    } catch (error) {
      warnUnsigned(error?.message || 'signing failed')
      return config
    }

    if (body.body !== undefined) {
      config.data = body.body
      if (body.isJson) {
        config.headers = config.headers || {}
        config.headers['Content-Type'] = 'application/json'
      }
    }

    config.headers = config.headers || {}
    Object.assign(config.headers, headers)
    return config
  })

  instance.interceptors.response.use(
    (response) => {
      recordServerClock(response?.headers)
      return response
    },
    (error) => {
      recordServerClock(error?.response?.headers)
      if (error?.response) error.walletAuth = walletAuthFailure(error)
      return Promise.reject(error)
    }
  )
}
