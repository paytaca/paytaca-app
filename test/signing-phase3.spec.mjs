import assert from 'node:assert/strict'
import {
  encodePrivateKeyWif,
  hexToBin,
  secp256k1,
  sha256,
  utf8ToBin
} from 'bitauth-libauth-v3'

import { buildCanonical } from '../src/utils/request-signing.js'
import {
  LIFTTOKEN_URL,
  NOTIFS_URL,
  REWARDS_URL
} from '../src/utils/engagementhub-utils/api.js'
import {
  getWalletNotifications,
  getWalletUnreadNotifs,
  hideItemUpdate,
  markItemAsRead,
  markWalletNotifsAsRead,
  massHideNotifs
} from '../src/utils/engagementhub-utils/engagementhub-utils.js'
import * as engagementhubUtils from '../src/utils/engagementhub-utils/engagementhub-utils.js'
import {
  confirmReservationApi,
  getContractAddressApi,
  getPurchasesData,
  getReservationsData,
  getIdAndPubkeyApi,
  processPurchaseApi,
  updateRsvpPublicKeys
} from '../src/utils/engagementhub-utils/lift-token.js'
// `.mocharc.cjs` maps `src/store` to this mock, so importing it directly gives
// the same object the hub modules read the active wallet from.
import { Store } from './mocks/store.mjs'

// Throwaway key, never used against a real wallet.
const WIF = encodePrivateKeyWif(hexToBin('22'.repeat(32)), 'mainnet')
const WALLET = 'a'.repeat(64)

const HEADERS = ['public-key', 'signature', 'timestamp', 'nonce', 'wallet-hash']

// The instances are module singletons shared by the whole run, so the adapter
// the specs install must be removed afterwards rather than left in place.
const ORIGINAL_ADAPTERS = new Map()

let sent = []
let respond = () => ({ data: {}, status: 200, statusText: 'OK' })

const installAdapter = (instance) => {
  if (!ORIGINAL_ADAPTERS.has(instance)) {
    ORIGINAL_ADAPTERS.set(instance, instance.defaults.adapter)
  }
  instance.defaults.adapter = async (config) => {
    sent.push(config)
    const result = await respond(config)
    return {
      data: result.data ?? {},
      status: result.status ?? 200,
      statusText: 'OK',
      headers: result.headers ?? { date: new Date().toUTCString() },
      config
    }
  }
}

const signatureHeadersIn = (config) => {
  const headers = config.headers || {}
  return HEADERS.filter((name) => typeof headers[name] === 'string')
}

// Axios' `combineURLs`, written independently of the code under test.
const sentUrl = ({ url, baseURL }) => {
  const isAbsolute = /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url)
  if (baseURL && !isAbsolute) {
    return baseURL.replace(/\/?\/$/, '') + '/' + url.replace(/^\/+/, '')
  }
  return url
}

const verifySignature = (config) => {
  const url = new URL(sentUrl(config))
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
  const calls = []
  const warn = console.warn
  const error = console.error
  const log = console.log
  console.warn = (...args) => calls.push(['warn', args.join(' ')])
  console.error = (...args) => calls.push(['error', args.join(' ')])
  console.log = (...args) => calls.push(['log', args.join(' ')])
  try {
    await fn()
  } finally {
    console.warn = warn
    console.error = error
    console.log = log
  }
  return calls
}

// Scoped to this wrapper so the shared store mock is not rewritten for every
// other spec in the run. Mocha attaches root-level hooks to the root suite.
describe('Phase 3 — lift and notification inbox', () => {
  beforeEach(() => {
    sent = []
    respond = () => ({ data: {}, status: 200 })
    globalThis.__signingKey = () => WIF
    Store.getters['global/getWallet'] = () => ({ walletHash: WALLET })
    Store.getters['global/isChipnet'] = false
    installAdapter(NOTIFS_URL)
    installAdapter(LIFTTOKEN_URL)
  })

  afterEach(() => {
    globalThis.__signingKey = null
    Store.getters['global/getWallet'] = () => ({ walletHash: 'test-wallet' })
    delete Store.getters['global/isChipnet']
  })

  after(() => {
    for (const [instance, adapter] of ORIGINAL_ADAPTERS) {
      instance.defaults.adapter = adapter
    }
    ORIGINAL_ADAPTERS.clear()
  })

  describe('notification inbox signing', () => {
    it('signs the notification list read with all five headers', async () => {
      respond = () => ({ data: { list: [], max: 0 } })
      await getWalletNotifications(WALLET, ['AH'], 1)

      const [config] = sent
      assert.deepEqual(signatureHeadersIn(config).sort(), [...HEADERS].sort())
      assert.equal(config.headers['wallet-hash'], WALLET)
      assert.equal(verifySignature(config), true)
    })

    it('signs a PATCH that hides one notification and keeps its body unchanged', async () => {
      await hideItemUpdate(42)

      const [config] = sent
      assert.equal(config.method, 'patch')
      assert.equal(config.url, 'notification/42/')
      assert.equal(config.data, JSON.stringify({ is_hidden: true }))
      assert.deepEqual(signatureHeadersIn(config).sort(), [...HEADERS].sort())
      assert.equal(config.headers['wallet-hash'], WALLET)
      assert.equal(verifySignature(config), true)
    })

    it('signs a PATCH that marks one notification read and keeps its body unchanged', async () => {
      await markItemAsRead(7)

      const [config] = sent
      assert.equal(config.url, 'notification/7/')
      assert.equal(config.data, JSON.stringify({ is_read: true }))
      assert.equal(verifySignature(config), true)
    })

    it('signs mass delete, which the server requires an owner for', async () => {
      await massHideNotifs([1, 2, 3])

      const [config] = sent
      assert.equal(config.url, 'notification/mass_delete_notifications/')
      assert.equal(config.data, JSON.stringify({ notif_ids: [1, 2, 3] }))
      assert.deepEqual(signatureHeadersIn(config).sort(), [...HEADERS].sort())
      assert.equal(verifySignature(config), true)
    })

    it('signs mark-wallet-read and the unread count', async () => {
      await markWalletNotifsAsRead(WALLET)
      await getWalletUnreadNotifs(WALLET)

      assert.equal(sent.length, 2)
      for (const config of sent) {
        assert.equal(signatureHeadersIn(config).length, 5)
        assert.equal(verifySignature(config), true)
      }
    })

    it('sends the notification request unsigned when the wallet is watch-only', async () => {
      globalThis.__signingKey = () => null
      respond = () => ({ data: { list: [], max: 0 } })
      const calls = await withConsole(() => getWalletNotifications(WALLET, ['AH'], 1))

      assert.equal(signatureHeadersIn(sent[0]).length, 0)
      assert.ok(calls.some(([level, line]) => level === 'warn' && /wallet signing unavailable/.test(line)))
    })

    it('keeps the cashback instance private so no signature can reach it', async () => {
      // `CASHBACK_URL` is module-private and built on the global axios; the
      // module must not export any axios instance that could be attached.
      for (const value of Object.values(engagementhubUtils)) {
        assert.equal(value?.interceptors, undefined)
      }

      await getWalletNotifications(WALLET, ['AH'], 1)
      assert.ok(sent.every((config) => config.baseURL.includes('devicenotif')))
    })
  })

  describe('lift signing', () => {
    it('signs the two reservation reads', async () => {
      respond = () => ({ data: [] })
      await getReservationsData()
      await getPurchasesData()

      assert.equal(sent.length, 2)
      for (const config of sent) {
        assert.equal(config.method, 'get')
        assert.equal(signatureHeadersIn(config).length, 5)
        assert.equal(config.headers['wallet-hash'], WALLET)
        assert.equal(verifySignature(config), true)
      }
    })

    it('signs a lift write, which the server gates on the wallet', async () => {
      respond = () => ({ data: {}, status: 201 })
      const ok = await processPurchaseApi({ purchased_amount_tkn: 10 })

      const [config] = sent
      assert.equal(ok, true)
      assert.equal(config.method, 'post')
      assert.equal(config.url, 'purchase/process_purchase/')
      assert.deepEqual(signatureHeadersIn(config).sort(), [...HEADERS].sort())
      assert.equal(verifySignature(config), true)
    })

    it('signs a reservation PATCH built from the active wallet hash', async () => {
      respond = () => ({ data: {} })
      await updateRsvpPublicKeys([{ id: 1, public_key: '02cc' }])

      const [config] = sent
      assert.equal(config.method, 'patch')
      assert.equal(config.url, `reservation/${WALLET}/`)
      assert.equal(verifySignature(config), true)
    })

    it('signs the reservation confirm write', async () => {
      await confirmReservationApi({ reservation: 1 })
      assert.equal(signatureHeadersIn(sent[0]).length, 5)
      assert.equal(verifySignature(sent[0]), true)
    })

    it('signs the AllowAny lift reads harmlessly', async () => {
      await getContractAddressApi()
      await getIdAndPubkeyApi()

      assert.equal(sent.length, 2)
      for (const config of sent) {
        assert.equal(signatureHeadersIn(config).length, 5)
        assert.equal(verifySignature(config), true)
      }
    })
  })

  describe('Phase 3 wiring scope', () => {
    it('attaches the signer to rewards, lift, and notifications only', () => {
      const count = (instance) => instance.interceptors.request.handlers.length
      assert.equal(count(REWARDS_URL), 1)
      assert.equal(count(LIFTTOKEN_URL), 1)
      assert.equal(count(NOTIFS_URL), 1)
    })

    it('reuses one hook definition so the instances cannot drift', () => {
      // Each instance installs exactly one request interceptor; a second
      // `attachSignedRequests` call on the same instance is a no-op, so an
      // accidental double attachment would show up here.
      assert.equal(REWARDS_URL.interceptors.request.handlers.length, 1)
      assert.equal(LIFTTOKEN_URL.interceptors.request.handlers.length, 1)
      assert.equal(NOTIFS_URL.interceptors.request.handlers.length, 1)
    })
  })
})
