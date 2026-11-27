import assert from 'node:assert/strict'
import axios from 'axios'
import {
  encodePrivateKeyWif,
  hexToBin,
  secp256k1,
  sha256,
  utf8ToBin
} from 'bitauth-libauth-v3'
import {
  WALLET_AUTH_HEADERS,
  attachSignedRequests,
  buildCanonical,
  walletAuthFailure
} from '../src/utils/request-signing.js'

// Throwaway key. Never used against a real wallet.
const WIF = encodePrivateKeyWif(hexToBin('22'.repeat(32)), 'mainnet')
const WALLET = 'a'.repeat(64)

const createInstance = () => {
  const sent = []
  const instance = axios.create({ baseURL: 'https://hub.example/api/rewards/' })
  instance.defaults.adapter = async (config) => {
    sent.push(config)
    if (config.url === 'missing/') {
      const error = new Error('Request failed with status code 403')
      error.response = { status: 403, data: { detail: 'Invalid wallet signature.' }, headers: {} }
      error.config = config
      throw error
    }
    return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }
  }
  return { instance, sent }
}

const createHooks = (overrides = {}) => ({
  getWalletHash: async () => WALLET,
  getPrivateKey: async () => WIF,
  isChipnet: () => false,
  isDevelopment: () => true,
  ...overrides
})

const attach = (hooks = {}) => {
  const { instance, sent } = createInstance()
  attachSignedRequests(instance, createHooks(hooks))
  return { instance, sent }
}

const signatureHeadersIn = (config) => {
  const headers = config.headers || {}
  return WALLET_AUTH_HEADERS.filter((name) => typeof headers[name] === 'string')
}

// Axios' own `combineURLs`, written out independently of the code under test so
// the assertion does not just restate the implementation. A URL is absolute
// when it starts with `<scheme>://` or `//`; otherwise axios joins it onto the
// base by trimming the slashes at the seam and concatenating.
const axiosSentUrl = ({ url, baseURL }) => {
  const isAbsolute = /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url)
  if (baseURL && !isAbsolute) {
    return baseURL.replace(/\/?\/$/, '') + '/' + url.replace(/^\/+/, '')
  }
  return url
}

const verifySignature = (config) => {
  const url = new URL(axiosSentUrl(config))
  const canonical = buildCanonical({
    method: config.method,
    fullPath: url.pathname + url.search,
    timestamp: config.headers.timestamp,
    nonce: config.headers.nonce,
    rawBody: config.data
  })
  return secp256k1.verifySignatureDER(
    hexToBin(config.headers.signature),
    hexToBin(config.headers['public-key']),
    sha256.hash(utf8ToBin(canonical))
  )
}

const withConsole = async (fn) => {
  const calls = { warn: [], error: [] }
  const warn = console.warn
  const error = console.error
  console.warn = (...args) => calls.warn.push(args.join(' '))
  console.error = (...args) => calls.error.push(args.join(' '))
  try {
    await fn()
  } finally {
    console.warn = warn
    console.error = error
  }
  return calls
}

describe('attachSignedRequests / header set', () => {
  it('signs a POST and puts all five headers on the request', async () => {
    const { instance, sent } = attach()
    await instance.post('userpromo/', { wallet_hash: WALLET })

    const [config] = sent
    assert.deepEqual(signatureHeadersIn(config).sort(), [...WALLET_AUTH_HEADERS].sort())
    assert.match(config.headers['public-key'], /^[0-9a-f]{66}$/)
    assert.match(config.headers.signature, /^[0-9a-f]+$/)
    assert.match(config.headers.nonce, /^[A-Za-z0-9_-]{16,128}$/)
    assert.match(config.headers.timestamp, /^\d+$/)
    assert.equal(config.headers['wallet-hash'], WALLET)
  })

  it('signs a GET with no body', async () => {
    const { instance, sent } = attach()
    await instance.get('userpromo/' + WALLET + '/')

    const [config] = sent
    assert.equal(signatureHeadersIn(config).length, 5)
  })

  it('sends zero signature headers when the wallet is watch-only', async () => {
    const { instance, sent } = attach({ getPrivateKey: async () => null })
    const calls = await withConsole(() => instance.get('userpromo/'))

    assert.equal(signatureHeadersIn(sent[0]).length, 0)
    assert.equal(calls.warn.length, 1)
    assert.match(calls.warn[0], /wallet signing unavailable/)
    assert.equal(sent[0].headers['wallet-hash'], undefined)
  })

  it('sends zero signature headers when there is no active wallet', async () => {
    const { instance, sent } = attach({ getWalletHash: async () => undefined })
    const calls = await withConsole(() => instance.get('userpromo/'))

    assert.equal(signatureHeadersIn(sent[0]).length, 0)
    assert.equal(calls.warn.length, 1)
  })

  it('sends zero signature headers on chipnet', async () => {
    const { instance, sent } = attach({ isChipnet: () => true })
    await withConsole(() => instance.post('userpromo/', { wallet_hash: WALLET }))

    assert.equal(signatureHeadersIn(sent[0]).length, 0)
  })

  it('sends zero signature headers when the caller opts out', async () => {
    const { instance, sent } = attach()
    await withConsole(() => instance.get('public/', { skipWalletSignature: true }))

    assert.equal(signatureHeadersIn(sent[0]).length, 0)
  })

  it('cannot emit a partial header set when the WIF is invalid', async () => {
    const { instance, sent } = attach({ getPrivateKey: async () => 'not-a-wif' })
    const calls = await withConsole(() => instance.get('userpromo/'))

    assert.equal(signatureHeadersIn(sent[0]).length, 0)
    assert.equal(calls.warn.length, 1)
  })
})

describe('attachSignedRequests / exact bytes', () => {
  it('signs the same body bytes it sends', async () => {
    const { instance, sent } = attach()
    await instance.post('userpromo/', { wallet_hash: WALLET, last_viewed: 1 })

    const [config] = sent
    assert.equal(typeof config.data, 'string')
    assert.equal(verifySignature(config), true)
  })

  it('sets a JSON content type on a serialized body', async () => {
    const { instance, sent } = attach()
    await instance.post('userpromo/', { wallet_hash: WALLET })
    assert.equal(sent[0].headers['Content-Type'], 'application/json')
  })

  it('signs the path plus inline query that is actually sent', async () => {
    const { instance, sent } = attach()
    await instance.get('userpromo/get_rp_max_redeemable/?currency=PHP')

    const [config] = sent
    const resolved = new URL(axiosSentUrl(config))
    assert.equal(resolved.search, '?currency=PHP')
    assert.equal(verifySignature(config), true)
  })

  it('joins a leading-slash URL the way axios does, not the way new URL does', async () => {
    const { instance, sent } = attach()
    await instance.get('/userpromo/')

    const [config] = sent
    // axios' combineURLs trims the slashes at the seam, so the leading slash is
    // absorbed and the base path is kept. `new URL` would instead resolve to
    // https://hub.example/userpromo/ and drop /api/rewards/, so a signature
    // taken from `new URL` would be a silent 403 in enforce mode.
    assert.equal(axiosSentUrl(config), 'https://hub.example/api/rewards/userpromo/')
    assert.equal(new URL('/userpromo/', config.baseURL).pathname, '/userpromo/')
    assert.equal(verifySignature(config), true)
  })

  it('signs a fully absolute URL without re-basing it', async () => {
    const { instance, sent } = attach()
    await instance.get('https://other.example/api/x/?a=1')

    const [config] = sent
    assert.equal(axiosSentUrl(config), 'https://other.example/api/x/?a=1')
    assert.equal(verifySignature(config), true)
  })

  it('signs a percent-encoded query exactly as the server will read it', async () => {
    const { instance, sent } = attach()
    const query = 'q=a%2Bb&name=caf%C3%A9&x=%7B%7D'
    await instance.get('search/?' + query)

    const [config] = sent
    assert.equal(new URL(axiosSentUrl(config)).search, '?' + query)
    assert.equal(verifySignature(config), true)
  })

  it('refuses config.params in development instead of guessing a serializer', async () => {
    const { instance } = attach()
    await assert.rejects(
      () => instance.get('userpromo/', { params: { a: 1 } }),
      /does not support config\.params/
    )
  })

  it('sends unsigned outside development when config.params is set', async () => {
    const { instance, sent } = attach({ isDevelopment: () => false })
    const calls = await withConsole(() => instance.get('userpromo/', { params: { a: 1 } }))

    assert.equal(signatureHeadersIn(sent[0]).length, 0)
    assert.equal(calls.warn.length, 1)
  })

  it('refuses to sign a FormData body', async () => {
    const { instance, sent } = attach()
    const body = new FormData()
    body.append('a', '1')
    const calls = await withConsole(() => instance.post('upload/', body))

    assert.equal(signatureHeadersIn(sent[0]).length, 0)
    assert.equal(calls.warn.length, 1)
  })

  it('signs as the wallet named by signWithWallet, not the active one', async () => {
    const other = 'b'.repeat(64)
    const { instance, sent } = attach()
    await instance.post('subscribe/', { wallet_hashes: [other] }, { signWithWallet: other })

    assert.equal(sent[0].headers['wallet-hash'], other)
  })

  it('warns when the body names a different wallet than the signer', async () => {
    const { instance } = attach()
    const calls = await withConsole(
      () => instance.post('subscribe/', { wallet_hash: 'c'.repeat(64) })
    )
    assert.ok(calls.warn.some((line) => line.includes('body names wallet')))
  })
})

describe('attachSignedRequests / retries and failures', () => {
  it('issues a different nonce for each attempt', async () => {
    const { instance, sent } = attach()
    await instance.get('userpromo/')
    await instance.get('userpromo/')

    assert.notEqual(sent[0].headers.nonce, sent[1].headers.nonce)
    assert.notEqual(sent[0].headers.signature, sent[1].headers.signature)
  })

  it('re-signs with a fresh nonce when a request is retried after a 5xx', async () => {
    const sent = []
    const instance = axios.create({ baseURL: 'https://hub.example/api/rewards/' })
    instance.defaults.adapter = async (config) => {
      sent.push(config)
      if (sent.length === 1) {
        const error = new Error('Request failed with status code 503')
        error.response = { status: 503, data: {}, headers: {} }
        error.config = config
        throw error
      }
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }
    attachSignedRequests(instance, createHooks())

    // Mirrors rewards.js `withRetry`: it re-invokes the axios call, so the
    // request interceptor runs again and must not reuse the first nonce.
    const attempt = async () => instance.get('userpromo/').catch(() => null)
    await attempt()
    await attempt()

    assert.equal(sent.length, 2)
    assert.notEqual(sent[0].headers.nonce, sent[1].headers.nonce)
    assert.notEqual(sent[0].headers.signature, sent[1].headers.signature)
    assert.equal(sent[0].headers.timestamp, sent[1].headers.timestamp)
  })

  it('does not retry a 403 and tags it as a signing failure', async () => {
    const { instance, sent } = attach()
    const error = await instance.get('missing/').then(() => null, (e) => e)

    assert.equal(sent.length, 1)
    assert.equal(error.response.status, 403)
    assert.equal(error.walletAuth.isSigningFailure, true)
  })
})

describe('walletAuthFailure', () => {
  it('treats a 403 as a signing failure and anything else as ordinary', () => {
    assert.equal(walletAuthFailure({ response: { status: 403 } }).isSigningFailure, true)
    assert.equal(walletAuthFailure({ response: { status: 500 } }).isSigningFailure, false)
    assert.equal(walletAuthFailure({}).isSigningFailure, false)
    assert.equal(walletAuthFailure(undefined).isSigningFailure, false)
  })

  it('reports the server detail when there is one', () => {
    const result = walletAuthFailure({
      response: { status: 403, data: { detail: 'Invalid wallet signature.' } }
    })
    assert.equal(result.detail, 'Invalid wallet signature.')
  })
})

describe('instance attachment scope', () => {
  it('leaves an unattached instance unsigned', async () => {
    const { sent } = createInstance()
    const cashback = axios.create({ baseURL: 'https://hub.example/api/cashback/' })
    cashback.defaults.adapter = async (config) => {
      sent.push(config)
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }

    await cashback.get('customerclaim/')
    assert.equal(signatureHeadersIn(sent[0]).length, 0)
  })

  it('does not install the interceptors twice', async () => {
    const { instance, sent } = createInstance()
    const hooks = createHooks()
    attachSignedRequests(instance, hooks)
    attachSignedRequests(instance, hooks)

    await instance.get('userpromo/')
    assert.equal(sent.length, 1)
    assert.equal(instance.interceptors.request.handlers.length, 1)
  })

  it('rejects an incomplete hook set', () => {
    const { instance } = createInstance()
    assert.throws(
      () => attachSignedRequests(instance, { getWalletHash: async () => WALLET }),
      /requires a getPrivateKey hook/
    )
  })
})

describe('client build flag', () => {
  it('attaches when the flag is absent or true', () => {
    delete process.env.WALLET_REQUEST_SIGNING
    const { instance } = createInstance()
    attachSignedRequests(instance, createHooks())
    assert.equal(instance.interceptors.request.handlers.length, 1)
  })

  it('does not attach when the build disables signing', () => {
    process.env.WALLET_REQUEST_SIGNING = 'false'
    try {
      const { instance } = createInstance()
      attachSignedRequests(instance, createHooks())
      assert.equal(instance.interceptors.request.handlers.length, 0)
      assert.equal(instance.interceptors.response.handlers.length, 0)
    } finally {
      delete process.env.WALLET_REQUEST_SIGNING
    }
  })
})
