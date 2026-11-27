import assert from 'node:assert/strict'

import {
  buildNotificationWsUrl,
  classifyNotificationSocketClose,
  createNotificationSocket,
  notificationSocketBackoff
} from '../src/utils/notification-ws.js'
import { NOTIFS_URL } from '../src/utils/engagementhub-utils/api.js'
import { getNotificationWsTicket } from '../src/utils/engagementhub-utils/engagementhub-utils.js'
import { Store } from './mocks/store.mjs'

const WALLET = 'a'.repeat(64)
const BASE = 'wss://hub.example/ws/'
const HEADERS = ['public-key', 'signature', 'timestamp', 'nonce', 'wallet-hash']

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const createSockets = () => {
  const sockets = []
  const createSocket = (url) => {
    const listeners = {}
    const socket = {
      url,
      closed: false,
      addEventListener (name, callback) {
        if (!listeners[name]) listeners[name] = []
        listeners[name].push(callback)
      },
      emit (name, event) {
        for (const callback of [...(listeners[name] || [])]) callback(event)
      },
      close () { socket.closed = true }
    }
    sockets.push(socket)
    return socket
  }
  return { sockets, createSocket }
}

const createTimers = () => {
  const timers = []
  return {
    timers,
    setTimer: (callback, delay) => {
      const timer = { callback, delay, cleared: false }
      timers.push(timer)
      return timer
    },
    clearTimer: (timer) => { timer.cleared = true },
    fire: (timer) => timer.callback()
  }
}

const createHarness = (options = {}) => {
  const { sockets, createSocket } = createSockets()
  const timerApi = createTimers()
  const warnings = []
  const errors = []
  const fetchTicket = options.fetchTicket || (async () => 'ticket-1')
  const controller = createNotificationSocket({
    walletHash: WALLET,
    baseUrl: BASE,
    fetchTicket,
    isSigningEnabled: options.isSigningEnabled || (() => true),
    createSocket,
    setTimer: timerApi.setTimer,
    clearTimer: timerApi.clearTimer,
    onUnreadCount: options.onUnreadCount || (() => {}),
    log: {
      warn: (...args) => warnings.push(args.join(' ')),
      error: (...args) => errors.push(args.join(' '))
    }
  })
  return { controller, sockets, timers: timerApi.timers, warnings, errors }
}

describe('notification websocket URL', () => {
  it('puts the ticket in the query, percent-encoded', () => {
    assert.equal(
      buildNotificationWsUrl(WALLET, 'plain-ticket', BASE),
      `${BASE}notifications/${WALLET}/?ticket=plain-ticket`
    )

    const ticket = 'a b+c/=&?'
    const url = buildNotificationWsUrl(WALLET, ticket, BASE)
    assert.equal(url, `${BASE}notifications/${WALLET}/?ticket=${encodeURIComponent(ticket)}`)
    assert.doesNotMatch(url.split('?ticket=')[1], /[ /&=?]/, 'ticket must be encoded')
  })

  it('omits the query without a ticket', () => {
    assert.equal(buildNotificationWsUrl(WALLET, null, BASE), `${BASE}notifications/${WALLET}/`)
    assert.equal(buildNotificationWsUrl(WALLET, '', BASE), `${BASE}notifications/${WALLET}/`)
  })

  it('adds the seam slash when the base lacks one', () => {
    assert.equal(
      buildNotificationWsUrl(WALLET, null, 'wss://hub.example/ws'),
      `wss://hub.example/ws/notifications/${WALLET}/`
    )
  })
})

describe('notification websocket close classification', () => {
  it('treats 4401 as unauthorized and everything else as retry', () => {
    assert.equal(classifyNotificationSocketClose(4401), 'unauthorized')
    assert.equal(classifyNotificationSocketClose(1000), 'retry')
    assert.equal(classifyNotificationSocketClose(1006), 'retry')
    assert.equal(classifyNotificationSocketClose(undefined), 'retry')
  })

  it('backs off 1s, 2s, 4s, then caps at 30s', () => {
    assert.deepEqual(
      [0, 1, 2, 3, 4, 5, 6, 10].map(notificationSocketBackoff),
      [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]
    )
  })
})

describe('notification websocket lifecycle', () => {
  it('fetches a fresh ticket before every connect', async () => {
    let calls = 0
    const h = createHarness({
      fetchTicket: async () => `ticket-${++calls}`
    })

    await h.controller.connect()
    assert.equal(h.sockets[0].url, `${BASE}notifications/${WALLET}/?ticket=ticket-1`)

    h.sockets[0].emit('close', { code: 1006 })
    h.timers[0].callback()
    await flush()

    assert.equal(calls, 2)
    assert.equal(h.sockets[1].url, `${BASE}notifications/${WALLET}/?ticket=ticket-2`)
  })

  it('retries a rejected handshake exactly once, then stops', async () => {
    let calls = 0
    const h = createHarness({
      fetchTicket: async () => `ticket-${++calls}`
    })

    await h.controller.connect()
    h.sockets[0].emit('close', { code: 4401 })
    await flush()

    assert.equal(h.sockets.length, 2)
    assert.equal(h.sockets[1].url, `${BASE}notifications/${WALLET}/?ticket=ticket-2`)

    h.sockets[1].emit('close', { code: 4401 })
    await flush()

    assert.equal(h.sockets.length, 2)
    assert.equal(calls, 2)
    assert.ok(h.warnings.some((line) => /stopping reconnect attempts/.test(line)))
  })

  it('schedules exponential backoff for other closes', async () => {
    const h = createHarness()
    await h.controller.connect()

    const delays = []
    for (let attempt = 0; attempt < 8; attempt += 1) {
      h.sockets[h.sockets.length - 1].emit('close', { code: 1006 })
      const timer = h.timers[h.timers.length - 1]
      delays.push(timer.delay)
      timer.callback()
      await flush()
    }

    assert.deepEqual(delays, [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000])
    assert.equal(h.sockets.length, 9)
  })

  it('resets the backoff after a successful open', async () => {
    const h = createHarness()
    await h.controller.connect()

    h.sockets[0].emit('close', { code: 1006 })
    assert.equal(h.timers[0].delay, 1000)
    h.timers[0].callback()
    await flush()

    h.sockets[1].emit('open', {})
    h.sockets[1].emit('close', { code: 1006 })
    assert.equal(h.timers[1].delay, 1000)
  })

  it('closes the live socket on stop', async () => {
    const h = createHarness()
    await h.controller.connect()

    h.controller.stop()
    assert.equal(h.sockets[0].closed, true)
  })

  it('clears the pending retry and never reconnects after stop', async () => {
    const h = createHarness()
    await h.controller.connect()

    h.sockets[0].emit('close', { code: 1006 })
    const pending = h.timers[0]
    h.controller.stop()

    assert.equal(pending.cleared, true)
    pending.callback()
    await flush()
    assert.equal(h.sockets.length, 1)
  })

  it('does not fetch a ticket when signing is disabled', async () => {
    let fetched = false
    const h = createHarness({
      isSigningEnabled: () => false,
      fetchTicket: async () => { fetched = true; return 'ticket' }
    })

    await h.controller.connect()

    assert.equal(fetched, false)
    assert.equal(h.sockets[0].url, `${BASE}notifications/${WALLET}/`)
  })

  it('falls back to the legacy URL once when the ticket call fails', async () => {
    let calls = 0
    const h = createHarness({
      fetchTicket: async () => { calls += 1; throw new Error('403') }
    })

    await h.controller.connect()
    assert.equal(h.sockets[0].url, `${BASE}notifications/${WALLET}/`)

    h.sockets[0].emit('close', { code: 1006 })
    h.timers[0].callback()
    await flush()

    assert.equal(h.sockets[1].url, `${BASE}notifications/${WALLET}/`)
    assert.equal(calls, 1, 'a failed ticket call is not retried on reconnect')
    assert.equal(h.warnings.filter((line) => /ticket unavailable/.test(line)).length, 1)
  })

  it('forwards the unread count from socket messages', async () => {
    const counts = []
    const h = createHarness({ onUnreadCount: (count) => counts.push(count) })

    await h.controller.connect()
    h.sockets[0].emit('message', { data: JSON.stringify({ unread_notifs_count: 4 }) })
    h.sockets[0].emit('message', { data: JSON.stringify({ unread_notifs_count: 0 }) })

    assert.deepEqual(counts, [4, 0])
  })

  it('ignores malformed messages without closing the socket', async () => {
    const h = createHarness()

    await h.controller.connect()
    h.sockets[0].emit('message', { data: 'not json' })

    assert.equal(h.sockets[0].closed, false)
    assert.equal(h.errors.filter((line) => /not JSON/.test(line)).length, 1)
  })
})

describe('notification websocket ticket request', () => {
  const originalAdapter = NOTIFS_URL.defaults.adapter
  const originalGetWallet = Store.getters['global/getWallet']
  const sent = []

  const installAdapter = (data) => {
    NOTIFS_URL.defaults.adapter = async (config) => {
      sent.push(config)
      return { data, status: 200, statusText: 'OK', headers: {}, config }
    }
  }

  beforeEach(() => {
    sent.length = 0
    Store.getters['global/getWallet'] = () => ({ walletHash: WALLET })
    globalThis.__signingKey = () => globalThis.__testWif
  })

  afterEach(() => {
    globalThis.__signingKey = null
    Store.getters['global/getWallet'] = originalGetWallet
  })

  after(() => {
    NOTIFS_URL.defaults.adapter = originalAdapter
  })

  it('posts the wallet hash and returns the ticket', async () => {
    const { encodePrivateKeyWif, hexToBin } = await import('bitauth-libauth-v3')
    globalThis.__testWif = encodePrivateKeyWif(hexToBin('22'.repeat(32)), 'mainnet')
    installAdapter({ ticket: 'ticket-1', expires_in: 60 })

    const ticket = await getNotificationWsTicket(WALLET)

    assert.equal(ticket, 'ticket-1')
    assert.equal(sent[0].url, 'ws-ticket/')
    assert.equal(JSON.parse(sent[0].data).wallet_hash, WALLET)
    for (const name of HEADERS) assert.equal(typeof sent[0].headers[name], 'string')
    assert.equal(sent[0].headers['wallet-hash'], WALLET)
  })

  it('throws when the response carries no ticket', async () => {
    installAdapter({})

    await assert.rejects(
      () => getNotificationWsTicket(WALLET),
      /did not return a websocket ticket/
    )
  })
})
