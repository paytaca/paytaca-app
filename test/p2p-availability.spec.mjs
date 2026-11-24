import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { markRaw, reactive } from 'vue'
import { readFileSync, readdirSync } from 'node:fs'
import { fetchP2PAvailability, assertP2PAvailable, isP2PAvailabilityError, p2pAvailabilityMessage, p2pRequestFeature } from '../src/exchange/availability.js'

const source = readFileSync(new URL('../src/components/ramp/fiat/EscrowTransfer.vue', import.meta.url), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'return')
const available = { P2P_MAINTENANCE: false, ORDER_ESCROW: true }

function harness (initial = available) {
  let controls = initial
  let failure = null
  let identityFailure = null
  let serverOrderResponse = null
  const events = []
  const requests = []
  const backend = {
    async get (url, config) {
      if (url === '/ramp-p2p/order/7/') return serverOrderResponse || { status: 200, data: { ...vm.order, status: { ...vm.order.status } } }
      events.push('availability')
      requests.push({ url, config })
      if (failure) throw failure
      return { status: 200, data: controls }
    },
    async post () { events.push('pending-escrow') }
  }
  const rawWallet = {
    async sendBch () {
      events.push('sign', 'broadcast')
      return { success: true, txid: 'synthetic-txid' }
    }
  }
  const bindings = {
    bus: { emit () {} },
    async assertP2PIdentity () { if (identityFailure) throw identityFailure; return {} },
    wallet: { addressPath: () => '0/0', assertIdentity () {}, async getRawWallet () { events.push('wallet'); return rawWallet } },
    backend,
    fetchP2PAvailability,
    isP2PAvailabilityError,
    p2pAvailabilityMessage,
    getDarkModeClass () {},
    RampDragSlide: {},
    RampContract: class {},
    packageInfo: { version: 'test' },
    bchToFiat () {},
    satoshiToBch: value => value / 100000000,
    parseFiatCurrency () {},
    async getChangeAddress () { events.push('change-address'); return 'synthetic-change' }
  }
  const component = new Function(...Object.keys(bindings), script)(...Object.values(bindings))
  const vm = {
    $store: { getters: { 'darkmode/getStatus': false, 'ramp/getOrderTxid': () => null }, commit () {} },
    $q: { platform: { is: {} }, screen: { height: 800 } },
    $t: (key, values, fallback) => fallback || key,
    $emit: (...args) => events.push(args[0])
  }
  Object.assign(vm, component.data.call(vm))
  for (const [key, method] of Object.entries(component.methods)) vm[key] = method.bind(vm)
  for (const [key, getter] of Object.entries(component.computed)) Object.defineProperty(vm, key, { get: getter.bind(vm), configurable: true })
  Object.assign(vm, {
    contractAddress: 'synthetic-contract',
    escrowContract: {
      publicKeys: { seller: 'synthetic-key' },
      addresses: { seller: 'synthetic-address' },
      getAddress: () => 'synthetic-contract',
      async getUtxos () { events.push('utxos'); return [] },
      async getBalance () { return 1 }
    },
    escrowBalance: 0,
    transferAmount: 0.01,
    order: { id: 7, trade_amount: 1000000, status: { value: 'CNF' } },
    arbiterOptions: [{}],
    dragSlideOn: true
  })
  return { vm, events, requests, setControls: value => { controls = value }, setFailure: value => { failure = value }, setIdentityFailure: value => { identityFailure = value }, setServerOrderResponse: value => { serverOrderResponse = value } }
}

describe('P2P escrow pause', () => {
  for (const [name, controls] of [
    ['maintenance', { ...available, P2P_MAINTENANCE: true }],
    ['disabled escrow', { ...available, ORDER_ESCROW: false }],
    ['missing escrow', { P2P_MAINTENANCE: false }],
    ['missing maintenance', { ORDER_ESCROW: true }],
    ['string controls', { P2P_MAINTENANCE: 'false', ORDER_ESCROW: 'true' }],
    ['numeric escrow', { ...available, ORDER_ESCROW: 1 }],
    ['null', null], ['array', []], ['HTML', '<html>Error</html>']
  ]) {
    it(`prevents signing and broadcasting with ${name}`, async () => {
      const { vm, events } = harness(controls)
      await vm.onSecurityOk()
      assert(!events.includes('sign'))
      assert(!events.includes('broadcast'))
      assert(!events.includes('pending-escrow'))
      assert(vm.availabilityFailure)
      assert.equal(vm.sendingBch, false)
      assert.equal(vm.loading, false)
      assert.equal(vm.showDragSlide, false)
    })
  }

  for (const code of ['ECONNABORTED', 'ERR_NETWORK', 'ERR_CANCELED']) {
    it(`fails closed on ${code}`, async () => {
      const h = harness()
      h.setFailure(Object.assign(new Error('synthetic failure'), { code }))
      await h.vm.onSecurityOk()
      assert(!h.events.includes('sign'))
      assert(h.vm.availabilityFailure)
      assert.equal(h.vm.sendingBch, false)
    })
  }

  it('checks again after authentication for an already-open screen with a cached contract', async () => {
    const h = harness()
    h.vm.data = { order: h.vm.order, transferAmount: 1000 }
    h.vm.fees = { total: 10 }
    h.vm.loadContract = async () => {}
    await h.vm.loadData()
    assert.equal(h.requests.length, 1)
    h.setControls({ ...available, P2P_MAINTENANCE: true })
    await h.vm.onSecurityOk()
    assert.equal(h.requests.length, 2)
    assert(!h.events.includes('broadcast'))
    assert.equal(h.requests[1].config.skipAbortManager, false)
    assert.equal(h.requests[1].config.cache, false)
    assert.equal(h.requests[1].config.timeout, 10000)
    assert.notEqual(h.requests[0].config.params._fresh, h.requests[1].config.params._fresh)
  })

  it('retries availability and loading only; funding needs another user action after restoration', async () => {
    const h = harness({ ...available, ORDER_ESCROW: false })
    await h.vm.onSecurityOk()
    h.setControls(available)
    h.vm.data = { order: h.vm.order, transferAmount: 1000 }
    h.vm.fees = { total: 10 }
    h.vm.loadContract = async () => {}
    await h.vm.loadData()
    assert(!h.events.includes('broadcast'))
    await h.vm.onSecurityOk()
    assert.equal(h.events.filter(e => e === 'broadcast').length, 1)
    assert.deepEqual(h.events.slice(-8), ['utxos', 'wallet', 'change-address', 'availability', 'sign', 'broadcast', 'pending-escrow', 'success'])
  })

  it('blocks cash-in orders with cached escrow data through the same final guard', async () => {
    const h = harness({ ...available, P2P_MAINTENANCE: true })
    h.vm.order.is_cash_in = true
    await h.vm.onSecurityOk()
    assert.equal(h.requests.length, 1)
    assert(!h.events.includes('sign'))
    assert(!h.events.includes('broadcast'))
  })

  it('keeps normal address and already-funded validations', async () => {
    const h = harness()
    h.vm.contractAddress = 'wrong-contract'
    await h.vm.onSecurityOk()
    assert.equal(h.requests.length, 0)
    assert(!h.events.includes('sign'))
    h.vm.contractAddress = 'synthetic-contract'
    h.vm.escrowBalance = 1
    await h.vm.onSecurityOk()
    assert(!h.events.includes('sign'))
  })

  it('blocks duplicate submissions while the fresh check is pending', async () => {
    const h = harness()
    const first = h.vm.onSecurityOk()
    const second = h.vm.onSecurityOk()
    await Promise.all([first, second])
    assert.equal(h.events.filter(e => e === 'broadcast').length, 1)
    assert.equal(h.requests.length, 1)
  })

  it('rejects cached and non-200 responses', async () => {
    for (const response of [{ status: 200, data: available, cached: true }, { status: 204, data: available }]) {
      await assert.rejects(fetchP2PAvailability({ get: async () => response }, 'ORDER_ESCROW'))
    }
  })

  it('covers cash-in, existing orders, deep links and restored routes through the single funding component', () => {
    const files = []
    function visit (path) {
      for (const entry of readdirSync(path, { withFileTypes: true })) {
        const child = `${path}/${entry.name}`
        if (entry.isDirectory()) visit(child)
        else if (/\.(vue|js)$/.test(child)) files.push(child)
      }
    }
    for (const path of ['src/exchange', 'src/components/ramp/fiat', 'src/pages/apps/exchange']) visit(path)
    const senders = files.filter(path => /\.sendBch\s*\(/.test(readFileSync(path, 'utf8')))
    assert.deepEqual(senders, ['src/components/ramp/fiat/EscrowTransfer.vue'])
    const order = readFileSync('src/pages/apps/exchange/peer_to_peer/order.vue', 'utf8')
    assert.match(order, /<EscrowTransfer/)
    const routes = readFileSync('src/router/routes.js', 'utf8')
    assert.match(routes, /name: 'p2p-order',[\s\S]*?peer_to_peer\/order.vue/)
    const deepLink = readFileSync('src/boot/deep-link.js', 'utf8')
    assert.match(deepLink, /name: 'p2p-order', params: \{ order: orderId \}/)
    const notifications = readFileSync('src/store/notification/actions.js', 'utf8')
    assert.match(notifications, /name: 'p2p-order',[\s\S]*?order: openedNotification.data.order_id/)
    const exchange = readFileSync('src/pages/apps/exchange/index.vue', 'utf8')
    assert.match(exchange, /queryParams = \{ order_id: this.\$route.query.order_id \}/)
  })

  it('maps individual actions without restricting order viewing or cancellation', () => {
    for (const [method, url, feature] of [
      ['post', '/ramp-p2p/order/', 'ORDER_CREATE'],
      ['post', '/ramp-p2p/order/contract/', 'ORDER_ESCROW'],
      ['post', '/ramp-p2p/order/7/pending-escrow/', 'ORDER_ESCROW'],
      ['post', '/ramp-p2p/ad/', 'AD_CREATE'],
      ['put', '/ramp-p2p/ad/7/', 'AD_UPDATE'],
      ['get', '/ramp-p2p/order/7/', null],
      ['post', '/ramp-p2p/order/7/cancel/', null]
    ]) assert.equal(p2pRequestFeature({ method, url }), feature)
    assert.throws(() => assertP2PAvailable({ P2P_MAINTENANCE: false }, 'ORDER_CREATE'))
  })
})


describe('P2P maintenance screen', () => {
  const source = readFileSync('src/components/ramp/fiat/P2PAvailability.vue', 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'return')

  function screenHarness () {
    const state = { controls: { P2P_MAINTENANCE: true }, requests: 0, get: null }
    const listeners = new Map()
    const document = { hidden: false, addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name) }
    const commits = []
    const timers = new Map()
    let timerId = 0
    const bindings = {
      document,
      backend: {
        async get (url, config) {
          state.requests++
          if (state.get) return state.get(url, config)
          return { status: 200, data: state.controls }
        }
      },
      fetchP2PAvailability,
      p2pAvailabilityMessage,
      bus: { on () {}, off () {} },
      setTimeout (callback, delay) {
        timers.set(++timerId, { callback, delay })
        return timerId
      },
      clearTimeout (id) { timers.delete(id) }
    }
    const component = new Function(...Object.keys(bindings), script)(...Object.values(bindings))
    const vm = {
      ...component.data(),
      $store: { commit: (...args) => commits.push(args) }
    }
    for (const [name, method] of Object.entries(component.methods)) vm[name] = method.bind(vm)
    return { vm, state, commits, timers, document, listeners, create: () => component.created.call(vm), unmount: () => component.beforeUnmount.call(vm) }
  }

  it('stops loading on failure and retries availability without replaying financial actions', async () => {
    const h = screenHarness()
    await h.vm.retry()
    assert.equal(h.vm.checking, false)
    assert.equal(h.vm.error.response.data.code, 'p2p_maintenance')
    assert.equal(h.timers.size, 1)
    h.state.controls = available
    await h.vm.retry()
    assert.equal(h.vm.error, null)
    assert.equal(h.vm.checking, false)
    assert.equal(h.vm.screenKey, 1)
    assert.equal(h.timers.size, 0)
    assert.deepEqual(h.commits, [['ramp/updateFeatureToggles', available]])
  })

  it('does not show a popup when the entry redirect cancels other page requests', async () => {
    const h = screenHarness()
    let finish
    let rejectRequest
    let requestConfig
    h.state.get = (url, config) => {
      requestConfig = config
      return new Promise((resolve, reject) => { finish = resolve; rejectRequest = reject })
    }
    const pending = h.vm.retry()
    if (!requestConfig.skipAbortManager) {
      rejectRequest(Object.assign(new Error('Request aborted by navigation'), { code: 'ECONNABORTED' }))
    } else {
      finish({ status: 200, data: available })
    }
    await pending
    assert.equal(h.vm.error, null)
    assert.equal(h.vm.checking, false)
    assert.equal(h.vm.screenKey, 1)
    assert.equal(h.state.requests, 1)
    assert.equal(h.timers.size, 0)
  })

  it('allows Retry to recover without adding headers rejected by backend CORS', async () => {
    const h = screenHarness()
    const requests = []
    h.state.get = async (url, config) => {
      const headers = Object.keys(config.headers || {}).map(header => header.toLowerCase())
      if (headers.includes('cache-control') || headers.includes('pragma')) {
        throw new Error('CORS preflight rejected unsupported request headers')
      }
      requests.push({ url, config })
      return { status: 200, data: h.state.controls }
    }
    await h.vm.retry()
    assert.equal(h.vm.error.response.data.code, 'p2p_maintenance')
    h.state.controls = available
    await h.vm.retry()
    assert.equal(h.vm.error, null)
    assert.equal(h.vm.screenKey, 1)
    assert.equal(requests.length, 2)
    assert.notEqual(requests[0].config.params._fresh, requests[1].config.params._fresh)
    assert.equal(requests[1].config.cache, false)
  })

  it('automatically closes the popup after a fresh check confirms maintenance is off', async () => {
    const h = screenHarness()
    await h.vm.retry()
    const timer = [...h.timers.values()][0]
    assert.equal(timer.delay, 5000)
    h.state.controls = available
    await timer.callback()
    assert.equal(h.vm.error, null)
    assert.equal(h.vm.screenKey, 1)
    assert.equal(h.state.requests, 2)
    assert.equal(h.timers.size, 0)
    assert.deepEqual(h.commits, [['ramp/updateFeatureToggles', available]])
  })

  it('keeps the popup open and schedules another check if availability cannot be verified', async () => {
    const h = screenHarness()
    await h.vm.retry()
    h.state.get = async () => { throw new Error('synthetic network failure') }
    await [...h.timers.values()][0].callback()
    assert(h.vm.error)
    assert.equal(h.vm.checking, false)
    assert.equal(h.vm.screenKey, 0)
    assert.equal(h.timers.size, 1)
    assert.deepEqual(h.commits, [])
    h.unmount()
  })

  it('cleans up scheduled checks when leaving P2P', async () => {
    const h = screenHarness()
    await h.vm.retry()
    const timer = [...h.timers.values()][0]
    h.unmount()
    assert.equal(h.timers.size, 0)
    await timer.callback()
    assert.equal(h.state.requests, 1)
    assert.equal(h.timers.size, 0)
  })

  it('prevents overlapping checks and ignores results after leaving P2P', async () => {
    const h = screenHarness()
    let finish
    h.state.get = () => new Promise(resolve => { finish = resolve })
    const pending = h.vm.retry()
    await h.vm.retry()
    assert.equal(h.state.requests, 1)
    h.unmount()
    finish({ status: 200, data: available })
    await pending
    assert.deepEqual(h.commits, [])
    assert.equal(h.vm.screenKey, 0)
    assert.equal(h.timers.size, 0)
  })
  it('backs off failed checks from five seconds to thirty seconds and two minutes', async () => {
    const h = screenHarness()
    await h.vm.retry()
    for (const delay of [5000, 30000, 120000, 120000]) {
      const timer = [...h.timers.values()][0]
      assert.equal(timer.delay, delay)
      await timer.callback()
    }
    h.state.controls = available
    await h.vm.retry()
    assert.equal(h.vm.retryCount, 0)
    h.state.controls = { P2P_MAINTENANCE: true }
    await h.vm.retry()
    assert.equal([...h.timers.values()][0].delay, 5000)
  })

  it('pauses polling while hidden, verifies on return, and removes the visibility listener', async () => {
    const h = screenHarness()
    h.create()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(h.listeners.size, 1)
    assert.equal(h.timers.size, 1)
    h.document.hidden = true
    h.listeners.get('visibilitychange')()
    assert.equal(h.timers.size, 0)
    const requests = h.state.requests
    await h.vm.retry()
    assert.equal(h.state.requests, requests)
    h.document.hidden = false
    h.state.controls = available
    h.listeners.get('visibilitychange')()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(h.vm.error, null)
    assert.equal(h.vm.screenKey, 1)
    h.unmount()
    assert.equal(h.listeners.size, 0)
    assert.equal(h.timers.size, 0)
  })

  it('does not schedule another check if the app becomes hidden during a failed request', async () => {
    const h = screenHarness()
    let finish
    h.state.get = () => new Promise(resolve => { finish = resolve })
    const pending = h.vm.retry()
    h.document.hidden = true
    finish({ status: 200, data: { P2P_MAINTENANCE: true } })
    await pending
    assert(h.vm.error)
    assert.equal(h.timers.size, 0)
  })

})

function identityHarness ({ removeToken = null, tokenForRole = role => `synthetic-${role}-token`, onAvailability = () => {}, storedUser = null } = {}) {
  const selected = { hash: 'synthetic-wallet', index: 0, chipnet: false }
  const Store = { getters: {
    'ramp/getUser': storedUser,
    'global/getWallet': () => ({ walletHash: selected.hash }),
    get 'global/getWalletIndex' () { return selected.index },
    get 'global/isChipnet' () { return selected.chipnet }
  } }
  const walletSource = readFileSync('src/exchange/wallet.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '')
  const RampWallet = new Function('Store', `${walletSource}; return RampWallet`)(Store)
  const wallet = new RampWallet(0, selected.hash, 0, false)
  wallet.wallet = { getPubkeyAt: () => 'synthetic-key', getAddressAt: () => 'synthetic-address' }
  const registered = { id: 'synthetic-user-id', public_key: 'synthetic-key', address: 'synthetic-address', address_path: '0/0', wallet_hash: selected.hash, is_arbiter: false }
  const requests = []
  const events = []
  const notifications = []
  let failure
  let beforeResponse = () => {}
  const interceptors = { request: null, response: null, reject: null }
  const client = {
    defaults: {},
    interceptors: {
      request: { use (callback) { interceptors.request = callback } },
      response: { use (callback, reject) { interceptors.response = callback; interceptors.reject = reject } }
    },
    async request (config) {
      config.headers ||= {}
      try {
        await interceptors.request(config)
      } catch (error) {
        return interceptors.reject(error)
      }
      requests.push(config)
      await beforeResponse()
      if (failure) return interceptors.reject({ ...failure, config })
      return interceptors.response({ status: 200, data: { ...registered }, config })
    },
    get (url, config = {}) { return this.request({ ...config, method: 'get', url }) },
    patch (url, data, config) { return this.request({ ...config, method: 'patch', url, data }) },
    post (url, data, config) { return this.request({ ...config, method: 'post', url, data }) }
  }
  const bindings = {
    axios: { create: () => client }, Store, wallet,
    Notify: { create: message => notifications.push(message) },
    bus: { emit: name => events.push(name) },
    requestManager: { attachTo () {} },
    getAuthToken: async role => tokenForRole(role),
    deleteAuthTokenForUserType: role => { events.push(`delete-${role}`); return removeToken?.(role) },
    fetchP2PAvailability: async () => onAvailability(), isP2PAvailabilityError: () => false,
    p2pRequestFeature
  }
  const backendSource = readFileSync('src/exchange/backend.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '')
  const api = new Function(...Object.keys(bindings), `${backendSource}; return { updateP2PProfile, assertP2PIdentity, updatePubkeyAndAddress, registerP2PAccount, getRegistrationRetrySeconds }`)(...Object.values(bindings))
  return { ...api, wallet, registered, selected, requests, events, notifications, client,
    fail: value => { failure = value }, beforeResponse: value => { beforeResponse = value } }
}

describe('Immutable P2P profile identities', () => {
  for (const role of ['peer', 'arbiter']) {
    it(`allowlists ${role} metadata and uses only its own role token`, async () => {
      const h = identityHarness()
      await h.updateP2PProfile(role, { ...h.registered, name: 'Synthetic name', chat_identity_id: 'synthetic-chat', inactive_hours: 24, unsupported: true })
      assert.equal(h.requests.length, 1)
      assert.equal(h.requests[0].url, `/ramp-p2p/${role}/`)
      assert.equal(h.requests[0].authorize, role)
      assert.equal(h.requests[0].headers.Authorization, `Token synthetic-${role}-token`)
      assert.deepEqual(h.requests[0].data, role === 'peer' ? { name: 'Synthetic name', chat_identity_id: 'synthetic-chat' } : { name: 'Synthetic name', chat_identity_id: 'synthetic-chat', inactive_hours: 24 })
    })

    for (const status of [400, 403]) {
      it(`preserves ${role} state on HTTP ${status} without retry or role fallback`, async () => {
        const h = identityHarness()
        const cached = { ...h.registered }
        h.fail({ response: { status, data: { public_key: ['Identity is immutable'] } } })
        await assert.rejects(h.updateP2PProfile(role, { name: 'Rejected' }).then(response => Object.assign(cached, response.data)), error => {
          assert.match(error.message, status === 400 ? /unsupported/ : /account type/)
          return true
        })
        assert.deepEqual(cached, h.registered)
        assert.equal(h.requests.length, 1)
        assert.deepEqual(h.events, [])
        assert.equal(h.notifications.length, 1)
      })
    }
  }

  it('validates synchronization without an identity PATCH or mutation', async () => {
    const h = identityHarness()
    assert.equal((await h.updatePubkeyAndAddress(h.registered)).success, true)
    await assert.rejects(h.updatePubkeyAndAddress({ ...h.registered, address: 'other-address' }), { code: 'p2p_identity_mismatch' })
    assert.deepEqual(h.requests, [])
    assert.equal(h.registered.address, 'synthetic-address')
  })

  it('blocks wrong wallets, derivation paths, encodings, and network changes', () => {
    for (const patch of [{ public_key: 'SYNTHETIC-KEY' }, { address: 'SYNTHETIC-ADDRESS' }, { address_path: '0/1' }, { wallet_hash: 'other-wallet' }, { public_key: null }]) {
      const h = identityHarness()
      assert.throws(() => h.wallet.assertIdentity({ ...h.registered, ...patch }), { code: 'p2p_identity_mismatch' })
    }
    for (const patch of [{ hash: 'other-wallet' }, { index: 1 }, { chipnet: true }]) {
      const h = identityHarness()
      Object.assign(h.selected, patch)
      assert.throws(() => h.wallet.assertIdentity(h.registered), { code: 'p2p_identity_mismatch' })
    }
  })

  it('checks the fresh registered identity and existing contract member before signing', async () => {
    const h = identityHarness()
    await h.assertP2PIdentity(h.registered, 'peer')
    h.registered.public_key = 'restored-different-key'
    await assert.rejects(h.assertP2PIdentity(), { code: 'p2p_identity_mismatch' })
    h.registered.public_key = 'synthetic-key'
    await assert.rejects(h.assertP2PIdentity({ ...h.registered, public_key: 'old-contract-key' }), { code: 'p2p_identity_mismatch' })
    await assert.rejects(h.assertP2PIdentity(null, 'arbiter'), /account type/)
    assert(h.requests.every(request => request.method === 'get' && ['/auth/', '/ramp-p2p/peer/'].includes(request.url) && request.cache === false))
  })

  it('rejects responses after switching wallets before they can overwrite cached identity', async () => {
    const h = identityHarness()
    const cached = { ...h.registered }
    h.beforeResponse(() => { h.selected.index = 1 })
    await assert.rejects(h.updateP2PProfile('peer', { name: 'Old wallet' }).then(response => Object.assign(cached, response.data)), { code: 'p2p_identity_mismatch' })
    assert.deepEqual(cached, h.registered)
  })

  it('rejects login identity mismatch before signing or replacing chat signing material', async () => {
    const h = identityHarness()
    const authSource = readFileSync('src/exchange/auth.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '')
    const events = []
    const bindings = {
      Store: { getters: {
        'global/getWallet': () => ({ walletHash: h.wallet.walletHash }),
        'global/getWalletIndex': 0, 'global/isChipnet': false
      } }, rampWallet: h.wallet,
      SecureStoragePlugin: { get: async () => ({ value: 'synthetic-token' }) },
      backend: { get: async () => ({ data: { ...h.registered, public_key: 'different-key' } }), post: async () => events.push('login-signature'), patch: async () => events.push('identity-patch') },
      loadChatIdentity: async () => events.push('chat-signer'),
      bus: { emit () {} }
    }
    const authenticate = new Function(...Object.keys(bindings), `${authSource}; return loadAuthenticatedUser`)(...Object.values(bindings))
    await assert.rejects(authenticate(), { code: 'p2p_identity_mismatch' })
    assert.deepEqual(events, [])
  })

  it('validates and captures the peer form before starting registration', async () => {
    const source = readFileSync('src/components/ramp/fiat/RampLogin.vue', 'utf8')
    const method = source.slice(source.indexOf('    async registerUser ()'), source.indexOf('    handleError (error)'))
    const requests = []
    const component = new Function('wallet', 'registerP2PAccount', `return { ${method} }`)(
      { address: () => 'synthetic-address', addressPath: () => '0/0' },
      async (...args) => requests.push(args)
    )
    const vm = { isValidNickname: false, usernickname: '', registrationVersion: 0, registrationIdentity: 'peer-wallet' }
    await assert.rejects(component.registerUser.call(vm))
    assert.equal(requests.length, 0)
    vm.isValidNickname = true
    vm.usernickname = 'Synthetic name'
    await component.registerUser.call(vm)
    assert.equal(requests[0][0], 'peer')
    assert.deepEqual(requests[0][1], { name: 'Synthetic name', address: 'synthetic-address', address_path: '0/0' })
    assert.equal(requests[0][2](), true)
    vm.registrationVersion++
    assert.equal(requests[0][2](), false)
  })
})

describe('P2P identity checks at financial boundaries', () => {
  it('blocks seller release on a contract address mismatch before identity checks or key extraction', async () => {
    const source = readFileSync('src/components/ramp/fiat/PaymentConfirmation.vue', 'utf8')
    const start = source.indexOf('    async releaseBch ()')
    const end = source.indexOf('\n    },', start) + 7
    const events = []
    const component = new Function('wallet', 'assertP2PIdentity', `return { ${source.slice(start, end)} }`)(
      { keypair () { events.push('keypair') } }, async () => { events.push('identity') }
    )
    const vm = { data: { escrow: { getAddress: () => 'other-contract' }, contract: { address: 'expected-contract' } } }
    await component.releaseBch.call(vm)
    assert.deepEqual(events, [])
    assert.deepEqual(vm.sendErrors, ['contract addresses mismatched'])
    assert.equal(vm.sendingBch, false)
  })

  for (const change of ['address', 'amount', 'contract', 'order', 'unmount']) {
    it(`blocks funding when ${change} changes during async checks`, async () => {
      const h = harness()
      h.vm.escrowContract.getUtxos = async () => {
        if (change === 'address') h.vm.contractAddress = 'other-contract'
        if (change === 'amount') h.vm.transferAmount = 10
        if (change === 'contract') h.vm.escrowContract = { ...h.vm.escrowContract }
        if (change === 'order') h.vm.order = { ...h.vm.order, id: 8 }
        if (change === 'unmount') h.vm.disposed = true
        return []
      }
      await h.vm.escrowBch()
      assert(!h.events.includes('broadcast'))
      assert(h.vm.sendErrors.length)
    })
  }

  for (const stored of [false, true]) {
    it(`blocks duplicate funding with a ${stored ? 'persisted' : 'local'} txid while indexing is pending`, async () => {
      const h = harness()
      if (stored) h.vm.$store.getters['ramp/getOrderTxid'] = () => 'synthetic-txid'
      else h.vm.txid = 'synthetic-txid'
      await h.vm.escrowBch()
      assert(!h.events.includes('broadcast'))
      assert.match(h.vm.sendErrors[0], /already sent/)
    })
  }

  for (const status of ['CNCL', 'ESCRW', 'RLS']) {
    it(`blocks funding when the fresh server status is ${status}`, async () => {
      const h = harness()
      h.setServerOrderResponse({ status: 200, data: { ...h.vm.order, status: { value: status } } })
      await h.vm.escrowBch()
      assert(!h.events.includes('broadcast'))
      assert.match(h.vm.sendErrors[0], /no longer ready/)
    })
  }

  for (const kind of ['cached', 'non-200', 'amount', 'identity']) {
    it(`blocks funding on a ${kind} server order response`, async () => {
      const h = harness()
      const response = { status: 200, data: { ...h.vm.order } }
      if (kind === 'cached') response.cached = true
      if (kind === 'non-200') response.status = 202
      if (kind === 'amount') response.data.trade_amount++
      if (kind === 'identity') response.data.id++
      h.setServerOrderResponse(response)
      await h.vm.escrowBch()
      assert(!h.events.includes('broadcast'))
      assert.match(h.vm.sendErrors[0], /no longer ready/)
    })
  }

  it('does not fund or automatically retry when a restored wallet mismatches', async () => {
    const h = harness()
    h.setIdentityFailure(Object.assign(new Error('Synthetic identity mismatch'), { code: 'p2p_identity_mismatch' }))
    await h.vm.escrowBch()
    assert(!h.events.includes('sign'))
    assert(!h.events.includes('broadcast'))
    assert(!h.events.includes('pending-escrow'))
    assert.deepEqual(h.vm.sendErrors, ['Synthetic identity mismatch'])
    assert.equal(h.vm.sendingBch, false)
  })

  for (const [file, method, role] of [
    ['src/components/ramp/fiat/PaymentConfirmation.vue', 'releaseBch', 'seller'],
    ['src/components/ramp/appeal/AppealDetail.vue', 'releaseBch', 'arbiter'],
    ['src/components/ramp/appeal/AppealDetail.vue', 'refundBch', 'arbiter']
  ]) {
    for (const mismatch of [false, true]) {
      it(`${mismatch ? 'blocks mismatched' : 'allows matching'} ${role} ${method} before extracting signing keys`, async () => {
        const h = identityHarness()
        h.registered.is_arbiter = role === 'arbiter'
        const source = readFileSync(file, 'utf8')
        const start = source.indexOf(`    async ${method} ()`)
        const end = source.indexOf('\n    },', start) + 7
        const events = []
        const wallet = { assertIdentity: registered => h.wallet.assertIdentity(registered), keypair () { events.push('keypair'); return {} }, privkey () { events.push('privkey'); return 'synthetic-secret-placeholder' } }
        const component = new Function('wallet', 'assertP2PIdentity', 'fetchP2PAvailability', 'backend', 'isP2PAvailabilityError', 'p2pAvailabilityMessage', `return { ${source.slice(start, end)} }`)(wallet, h.assertP2PIdentity, fetchP2PAvailability, { get: async () => ({ status: 200, data: available }) }, isP2PAvailabilityError, p2pAvailabilityMessage)
        const escrow = {
          publicKeys: { [role]: mismatch ? 'different-contract-key' : h.registered.public_key },
          addresses: { [role]: h.registered.address },
          getAddress: () => 'synthetic-contract',
          async release () { events.push('release'); return { success: false, reason: 'Synthetic result' } },
          async refund () { events.push('refund'); return { success: false, reason: 'Synthetic result' } }
        }
        const contract = { address: 'synthetic-contract', members: [{ member_type: role.toUpperCase(), address_path: '0/0' }] }
        const vm = { data: { escrow, contract }, escrowContract: escrow, contract, order: { trade_amount: 1000 } }
        await component[method].call(vm)
        assert.equal(events.length, mismatch ? 0 : 2)
        if (mismatch) assert.match(role === 'seller' ? vm.sendErrors[0] : vm.sendError, /registered P2P identity/)
      })
    }
  }

  for (const file of ['src/pages/apps/exchange/peer_to_peer/index.vue', 'src/pages/apps/exchange/arbiter/index.vue']) {
    it(`does not prompt reauthentication for rejected profile edits in ${file}`, () => {
      const source = readFileSync(file, 'utf8')
      const start = source.indexOf('    handleRequestError (error)')
      const end = source.indexOf('\n    },', start) + 7
      const events = []
      const component = new Function('bus', `return { ${source.slice(start, end)} }`)({ emit: event => events.push(event) })
      component.handleRequestError({ code: 'p2p_profile_rejected', response: { status: 403 } })
      assert.deepEqual(events, [])
    })
  }
})

describe('P2P chat signing identity', () => {
  for (const operation of ['signRequestData', 'updateSignerData']) {
    it(`blocks ${operation} on registered identity mismatch without changing local signing material`, async () => {
      const source = readFileSync('src/exchange/chat/backend.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '')
      const events = []
      const bindings = {
        axios: { create: () => ({ interceptors: { request: { use () {} } } }) },
        requestManager: { attachTo () {} },
        Store: { getters: { 'ramp/getUser': { is_arbiter: false } } },
        wallet: { privkey () { events.push('derive-private-key') } },
        assertP2PIdentity: async () => { throw Object.assign(new Error('Synthetic mismatch'), { code: 'p2p_identity_mismatch' }) },
        SecureStoragePlugin: { get: async () => { events.push('read-signer') }, set: async () => { events.push('write-signer') } },
        signMessage: () => { events.push('sign') }
      }
      const api = new Function(...Object.keys(bindings), `${source}; return { signRequestData, updateSignerData }`)(...Object.values(bindings))
      await assert.rejects(api[operation]('synthetic-message'), { code: 'p2p_identity_mismatch' })
      assert.deepEqual(events, [])
    })
  }

  it('rejects an obsolete cached chat key without signing or replacing it', async () => {
    const source = readFileSync('src/exchange/chat/backend.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '')
    const events = []
    const bindings = {
      axios: { create: () => ({ interceptors: { request: { use () {} } } }) }, requestManager: { attachTo () {} },
      Store: { getters: { 'ramp/getUser': { is_arbiter: false } } },
      wallet: { walletHash: 'synthetic-wallet', assertIdentity () {}, privkey: () => 'synthetic-current-key' },
      assertP2PIdentity: async () => ({}), getCurrentWalletStorageKey: () => 'synthetic-storage-key',
      SecureStoragePlugin: { get: async () => ({ value: 'synthetic-wallet:synthetic-old-key' }), set: async () => events.push('write') },
      signMessage: () => events.push('sign')
    }
    const sign = new Function(...Object.keys(bindings), `${source}; return signRequestData`)(...Object.values(bindings))
    await assert.rejects(sign('synthetic-message'), { code: 'p2p_identity_mismatch' })
    assert.deepEqual(events, [])
  })
})

describe('P2P wallet-scoped error responses', () => {
  it('discards a stale account error after switching instead of prompting registration or login', async () => {
    const h = identityHarness()
    h.fail({ response: { status: 404, data: { error: 'user does not exist' } } })
    h.beforeResponse(() => { h.selected.hash = 'other-wallet' })
    await assert.rejects(h.client.get('/auth/'), { code: 'p2p_identity_mismatch' })
    assert.deepEqual(h.events, [])
    assert.deepEqual(h.notifications, [])
  })

  it('checks peer identity before order creation and rejects mismatches without posting', async () => {
    const h = identityHarness()
    h.registered.public_key = 'different-registered-key'
    await assert.rejects(h.client.request({ method: 'post', url: '/ramp-p2p/order/', authorize: 'peer' }), { code: 'p2p_identity_mismatch' })
    assert(h.requests.every(request => request.method === 'get'))
  })
})


describe('P2P private WebSocket authentication', () => {
  function socketHarness () {
    const sockets = []
    const timers = new Map()
    const intervals = new Map()
    const listeners = new Map()
    const watchers = new Set()
    const events = []
    const notifications = []
    let timerId = 0
    const state = { wallet: 'wallet-a', index: 0, chipnet: false, token: 'token-a', userType: 'peer', authenticated: true, maintenance: false }
    class WebSocket {
      static OPEN = 1
      constructor (url) {
        this.url = url
        this.readyState = 0
        this.handlers = {}
        this.sent = []
        sockets.push(this)
      }
      addEventListener (type, handler) { this.handlers[type] = handler }
      send (data) { this.sent.push(JSON.parse(data)) }
      close () { this.readyState = 3; this.handlers.close({ type: 'close', code: 1000 }) }
      open () { this.readyState = 1; this.handlers.open({ type: 'open' }) }
      message (message) { this.handlers.message({ data: JSON.stringify(message) }) }
      reject (code) { this.readyState = 3; this.handlers.close({ type: 'close', code }) }
    }
    const bus = {
      on (event, handler) {
        if (!listeners.has(event)) listeners.set(event, new Set())
        listeners.get(event).add(handler)
      },
      off (event, handler) { listeners.get(event)?.delete(handler) },
      emit (event, data) {
        events.push(event)
        for (const handler of [...(listeners.get(event) || [])]) handler(data)
      }
    }
    const Store = {
      getters: {
        'global/getWallet': () => ({ walletHash: state.wallet }),
        get 'global/getWalletIndex' () { return state.index },
        get 'global/isChipnet' () { return state.chipnet },
        get 'ramp/getUser' () { return { user_type: state.userType } }
      },
      watch (read, callback) {
        let previous = read()
        const update = () => {
          const next = read()
          if (next !== previous) { const old = previous; previous = next; callback(next, old) }
        }
        watchers.add(update)
        return () => watchers.delete(update)
      }
    }
    const serviceSource = readFileSync('src/exchange/websocket/service.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '')
    const WebSocketService = new Function('WebSocket', 'EventEmitter', `${serviceSource}; return WebSocketService`)(WebSocket, EventEmitter)
    const bindings = {
      bus, Store, WebSocketService, markRaw,
      getAuthToken: async role => { state.requestedRole = role; return typeof state.token === 'function' ? state.token() : state.token },
      backend: {},
      assertP2PIdentity: async () => {
        if (!state.authenticated) throw { response: { status: 401 } }
        return {}
      },
      fetchP2PAvailability: async () => { if (state.maintenance) throw Object.assign(new Error(), { response: { data: { code: 'p2p_maintenance' } } }) },
      isP2PAvailabilityError,
      Notify: { create: notification => notifications.push(notification) },
      setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id },
      clearTimeout: id => timers.delete(id),
      setInterval: callback => { const id = ++timerId; intervals.set(id, callback); return id },
      clearInterval: id => intervals.delete(id)
    }
    const managerSource = readFileSync('src/exchange/websocket/manager.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '')
    const Manager = new Function(...Object.keys(bindings), `${managerSource}; return WebSocketManager`)(...Object.values(bindings))
    const manager = reactive(new Manager())
    const messages = []
    manager.subscribeToMessages(message => messages.push(message))
    const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }
    return {
      manager, state, sockets, timers, intervals, bus, events, notifications, messages, flush,
      async connect (path = 'order/12/', options) {
        manager.setWebSocketUrl(`wss://example.test/ws/ramp-p2p/subscribe/${path}`, options)
        await flush()
        return sockets.at(-1)
      },
      update () { for (const watcher of [...watchers]) watcher() },
      async runTimer () {
        const [id, timer] = timers.entries().next().value
        timers.delete(id)
        timer.callback()
        await flush()
      }
    }
  }

  for (const path of ['order/12/', 'general/wallet-a/']) {
    it(`authenticates ${path} immediately on open and waits for ConnectionMessage`, async () => {
      const h = socketHarness()
      h.state.token = 'Token token-a'
      const socket = await h.connect(path)
      assert(!h.manager.isOpen())
      socket.open()
      assert.deepEqual(socket.sent, [{ type: 'authenticate', wallet_hash: 'wallet-a', token: 'token-a' }])
      assert(!socket.url.includes('token'))
      assert(!h.manager.isOpen())
      socket.message({ type: 'NEW_ORDER', success: true })
      assert.deepEqual(h.messages, [])
      socket.message({ type: 'ConnectionMessage' })
      assert(h.manager.isOpen())
      socket.message({ type: 'NEW_ORDER', success: true })
      assert.equal(h.messages.length, 2)
      assert.equal(h.timers.size, 0)
      h.manager.closeConnection()
    })
  }

  it('reads rotated credentials on reconnect and prevents duplicate sockets and timers', async () => {
    const h = socketHarness()
    const socket = await h.connect()
    socket.open()
    socket.message({ type: 'ConnectionMessage' })
    socket.reject(1006)
    assert.equal(h.timers.size, 1)
    h.manager.setWebSocketUrl(h.manager.url)
    assert.equal(h.timers.size, 1)
    h.state.token = 'rotated-token'
    await h.runTimer()
    const next = h.sockets.at(-1)
    next.open()
    assert.equal(next.sent[0].token, 'rotated-token')
    assert.equal(h.sockets.length, 2)
    assert(!h.manager.isOpen())
    next.message({ type: 'ConnectionMessage' })
    assert(h.manager.isOpen())
    h.manager.closeConnection()
    assert.equal(h.timers.size + h.intervals.size, 0)
  })

  for (const code of [4401, 4403]) {
    it(`stops retrying rejected credentials after ${code}, including established subscriptions`, async () => {
      const h = socketHarness()
      const socket = await h.connect()
      socket.open()
      socket.message({ type: 'ConnectionMessage' })
      socket.reject(code)
      await h.flush()
      assert.equal(h.timers.size + h.intervals.size, 0)
      h.bus.emit('relogged')
      await h.flush()
      assert.equal(h.sockets.length, 1)
      assert.equal(h.events.includes('session-expired'), code === 4401)
      if (code === 4403) assert.equal(h.notifications.length, 1)
      h.state.token = 'renewed-token'
      h.bus.emit('relogged')
      await h.flush()
      assert.equal(h.sockets.length, 2)
      h.manager.closeConnection()
    })
  }

  for (const code of [4401, 4403]) {
    it(`does not retry an initial authentication rejection with ${code}`, async () => {
      const h = socketHarness()
      const socket = await h.connect()
      socket.open()
      socket.reject(code)
      await h.flush()
      assert(!h.manager.isOpen())
      assert.equal(h.timers.size + h.intervals.size, 0)
      h.bus.emit('relogged')
      await h.flush()
      assert.equal(h.sockets.length, 1)
      h.manager.closeConnection()
    })
  }

  for (const change of ['logout', 'wallet', 'userType']) {
    it(`closes an established connection on ${change} and ignores old events`, async () => {
      const h = socketHarness()
      const socket = await h.connect()
      socket.open()
      socket.message({ type: 'ConnectionMessage' })
      if (change === 'logout') h.bus.emit('p2p-auth-cleared', { walletHash: 'wallet-a' })
      else {
        h.state[change] = change === 'wallet' ? 'wallet-b' : 'arbiter'
        h.update()
      }
      assert.equal(socket.readyState, 3)
      socket.message({ type: 'NEW_ORDER' })
      assert.equal(h.messages.length, 1)
      assert.equal(h.timers.size + h.intervals.size, 0)
      h.manager.closeConnection()
    })
  }

  it('uses maintenance handling for 4403 without prompting login', async () => {
    const h = socketHarness()
    h.state.maintenance = true
    const socket = await h.connect()
    socket.open()
    socket.reject(4403)
    await h.flush()
    assert(h.events.includes('p2p-unavailable'))
    assert(!h.events.includes('session-expired'))
    assert.equal(h.timers.size, 0)
    h.manager.closeConnection()
  })

  it('requests login when an authorization recheck finds an unauthenticated account', async () => {
    const h = socketHarness()
    h.state.authenticated = false
    const socket = await h.connect()
    socket.open()
    socket.reject(4403)
    await h.flush()
    assert(h.events.includes('session-expired'))
    assert.equal(h.timers.size, 0)
    h.manager.closeConnection()
  })

  for (const change of ['logout', 'wallet', 'index', 'chipnet', 'userType', 'unmount']) {
    it(`cancels a pending reconnect on ${change}`, async () => {
      const h = socketHarness()
      const socket = await h.connect()
      socket.open()
      socket.reject(1006)
      assert.equal(h.timers.size, 1)
      if (change === 'logout') h.bus.emit('p2p-auth-cleared', { walletHash: 'wallet-a', userType: 'peer' })
      else if (change === 'unmount') h.manager.closeConnection()
      else {
        h.state[change] = { wallet: 'wallet-b', index: 1, chipnet: true, userType: 'arbiter' }[change]
        h.update()
      }
      await h.flush()
      assert.equal(h.timers.size + h.intervals.size, 0)
      assert.equal(h.sockets.length, 1)
      assert(!h.manager.isOpen())
      h.manager.closeConnection()
    })
  }

  it('discards credentials that finish loading after a wallet switch', async () => {
    const h = socketHarness()
    let finish
    h.state.token = () => new Promise(resolve => { finish = resolve })
    h.manager.setWebSocketUrl('wss://example.test/ws/ramp-p2p/subscribe/order/12/')
    h.state.wallet = 'wallet-b'
    h.update()
    finish('old-token')
    await h.flush()
    assert.equal(h.sockets.length, 0)
    h.manager.closeConnection()
  })

  it('uses the arbiter token for arbiter streams', async () => {
    const h = socketHarness()
    const socket = await h.connect('order/12/', { userType: 'arbiter' })
    socket.open()
    assert.equal(h.state.requestedRole, 'arbiter')
    h.manager.closeConnection()
  })

  it('does not open sockets without credentials and resumes after login', async () => {
    const h = socketHarness()
    h.state.token = null
    await h.connect()
    assert.equal(h.sockets.length, 0)
    assert(h.events.includes('session-expired'))
    h.state.token = 'new-token'
    h.bus.emit('relogged')
    await h.flush()
    assert.equal(h.sockets.length, 1)
    h.manager.closeConnection()
  })

  it('stops and prompts login if authentication is not acknowledged within ten seconds', async () => {
    const h = socketHarness()
    const socket = await h.connect()
    socket.open()
    assert.equal([...h.timers.values()][0].delay, 10000)
    await h.runTimer()
    assert.equal(socket.readyState, 3)
    assert.equal(h.timers.size, 0)
    assert(h.events.includes('session-expired'))
    h.manager.closeConnection()
  })

  for (const path of ['ad/12/', 'market-price/PHP/']) {
    it(`keeps ${path} public on initial connection and reconnect`, async () => {
      const h = socketHarness()
      const socket = await h.connect(path)
      socket.open()
      assert(h.manager.isOpen())
      assert.deepEqual(socket.sent, [])
      assert.equal(h.state.requestedRole, undefined)
      socket.message({ type: 'public-event' })
      assert.equal(h.messages.length, 1)
      socket.reject(1006)
      await h.runTimer()
      h.sockets.at(-1).open()
      assert.deepEqual(h.sockets.at(-1).sent, [])
      h.manager.closeConnection()
    })
  }
})


describe('Server-issued P2P registration challenges', () => {
  function registrationHarness () {
    const h = identityHarness()
    h.wallet.privkey = () => 'synthetic-secret-placeholder'
    h.signatures = []
    h.wallet.signMessage = (...args) => { h.signatures.push(args); return 'synthetic-der-hex' }
    h.body = { name: 'Synthetic name', address: 'synthetic-address', address_path: '0/0' }
    h.calls = []
    h.respond = async (url) => url.endsWith('/challenge/')
      ? { status: 201, data: { challenge_id: 'synthetic-uuid', message: 'Exact UTF-8 message: ₱\n', expires_at: new Date(Date.now() + 300000).toISOString() } }
      : { status: url.includes('/arbiter/') ? 200 : 201, data: {} }
    h.client.post = async (url, data, config) => {
      config.p2pRegistrationCheck()
      h.calls.push({ url, data: JSON.parse(JSON.stringify(data)), config })
      return h.respond(url, data, config)
    }
    return h
  }

  for (const role of ['peer', 'arbiter']) {
    it(`preserves the ${role} body, key and wallet and signs only the exact server message`, async () => {
      const h = registrationHarness()
      await h.registerP2PAccount(role, h.body)
      const [challenge, submit] = h.calls
      assert.equal(challenge.url, '/ramp-p2p/registration/challenge/')
      assert.equal(challenge.data.account_type, role)
      assert.equal(challenge.data.wallet_hash, h.wallet.walletHash)
      assert.equal(challenge.data.public_key, 'synthetic-key')
      assert.deepEqual(challenge.data.data, submit.data)
      if (role === 'arbiter') assert.equal(submit.data.public_key, 'synthetic-key')
      assert.equal(submit.url, `/ramp-p2p/${role}/`)
      assert.equal(submit.config.headers['wallet-hash'], h.wallet.walletHash)
      assert.equal(submit.config.headers['public-key'], 'synthetic-key')
      assert.equal(submit.config.headers['registration-challenge'], 'synthetic-uuid')
      assert.equal(submit.config.headers.signature, 'synthetic-der-hex')
      assert.equal(submit.config.headers.timestamp, undefined)
      assert.equal(submit.data.challenge_id, undefined)
      assert.equal(challenge.config.authorize, false)
      assert.deepEqual(h.signatures, [['synthetic-secret-placeholder', 'Exact UTF-8 message: ₱\n']])
    })
  }

  for (const change of ['form', 'payload', 'wallet', 'key', 'index', 'chipnet']) {
    it(`discards an in-flight challenge on ${change} changes`, async () => {
      const h = registrationHarness()
      const respond = h.respond
      let current = true
      h.respond = async (...args) => {
        const result = await respond(...args)
        if (change === 'form') current = false
        if (change === 'payload') h.body.name = 'Edited name'
        if (change === 'wallet') h.selected.hash = 'another-wallet'
        if (change === 'key') h.wallet.pubkey = () => 'another-key'
        if (change === 'index') h.selected.index++
        if (change === 'chipnet') h.selected.chipnet = true
        return result
      }
      await assert.rejects(h.registerP2PAccount('peer', h.body, () => current), { code: 'p2p_identity_mismatch' })
      assert.equal(h.calls.length, 1)
      assert.equal(h.signatures.length, 0)
    })
  }

  it('blocks duplicate submissions while a challenge is pending', async () => {
    const h = registrationHarness()
    let finish
    const respond = h.respond
    h.respond = (...args) => new Promise(resolve => { finish = async () => resolve(await respond(...args)) })
    const pending = h.registerP2PAccount('peer', h.body)
    await assert.rejects(h.registerP2PAccount('peer', h.body), /already in progress/)
    h.respond = respond
    await finish()
    await pending
    assert.equal(h.calls.length, 2)
  })

  it('rejects expired challenges before signing', async () => {
    const h = registrationHarness()
    h.respond = async () => ({ status: 201, data: { challenge_id: 'expired', message: 'expired', expires_at: new Date(0).toISOString() } })
    await assert.rejects(h.registerP2PAccount('peer', h.body))
    assert.equal(h.signatures.length, 0)
    assert.equal(h.calls.length, 1)
  })

  for (const reason of ['expired', 'consumed', 'invalid signature', 'mismatched payload']) {
    it(`gets a fresh challenge on manual retry after a 403: ${reason}`, async () => {
      const h = registrationHarness()
      const respond = h.respond
      h.respond = async (...args) => {
        if (!args[0].endsWith('/challenge/')) throw { response: { status: 403, data: { error: reason } } }
        return respond(...args)
      }
      await assert.rejects(h.registerP2PAccount('peer', h.body), /rejected, expired, or already used/)
      assert.equal(h.calls.length, 2)
      h.respond = respond
      await h.registerP2PAccount('peer', h.body)
      assert.equal(h.calls.length, 4)
      assert.equal(h.calls[2].url, '/ramp-p2p/registration/challenge/')
    })
  }

  for (const stage of ['challenge', 'submission']) {
    for (const format of ['seconds', 'date']) {
      it(`honors Retry-After ${format} from ${stage} without retrying`, async () => {
        const retryAfter = format === 'seconds' ? '60' : new Date(Date.now() + 60000).toUTCString()
        const h = registrationHarness()
        const respond = h.respond
        h.respond = async (...args) => {
          if (args[0].endsWith('/challenge/') === (stage === 'challenge')) throw { response: { status: 429, headers: { 'retry-after': retryAfter } } }
          return respond(...args)
        }
        await assert.rejects(h.registerP2PAccount('peer', h.body))
        assert(h.getRegistrationRetrySeconds() >= 59)
        const count = h.calls.length
        await assert.rejects(h.registerP2PAccount('arbiter', h.body), { code: 'p2p_registration_throttled' })
        assert.equal(h.calls.length, count)
      })
    }
  }

  for (const exists of [true, false]) {
    it(`checks account existence after ambiguous submission (${exists ? 'login recovery' : 'new challenge'})`, async () => {
      const h = registrationHarness()
      const respond = h.respond
      h.respond = async (...args) => {
        if (!args[0].endsWith('/challenge/')) throw new Error('network failure containing sensitive request details')
        return respond(...args)
      }
      await assert.rejects(h.registerP2PAccount('peer', h.body), error => !error.message.includes('sensitive'))
      h.respond = respond
      let checked = false
      h.client.get = async (url) => {
        assert.equal(url, '/auth/')
        checked = true
        if (!exists) throw { response: { status: 404 } }
        return { status: 200, data: {} }
      }
      const response = await h.registerP2PAccount('peer', h.body)
      assert(checked)
      assert.equal(h.calls.length, exists ? 2 : 4)
      if (exists) assert(response.recovered)
    })
  }

  it('preserves 400 field validation messages without retaining request credentials', async () => {
    const h = registrationHarness()
    h.respond = async () => { throw { response: { status: 400, data: { name: ['Nickname already used.'] } }, config: { secret: 'credential' } } }
    await assert.rejects(h.registerP2PAccount('peer', h.body), error => error.message === 'Nickname already used.' && !error.config)
  })

  it('uses the existing signer with one SHA-256 hash and a UTF-8 DER signature', async () => {
    const libauth = await import('@bitauth/libauth')
    const source = readFileSync('src/exchange/wallet.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '')
    const RampWallet = new Function(...Object.keys(libauth), `${source}; return RampWallet`)(...Object.values(libauth))
    const signer = new RampWallet()
    const privateKey = libauth.hexToBin('01'.padStart(64, '0'))
    const wif = libauth.encodePrivateKeyWif(privateKey, 'mainnet')
    const message = 'Exact UTF-8 message: ₱\n'
    const signature = signer.signMessage(wif, message)
    const publicKey = libauth.secp256k1.derivePublicKeyCompressed(privateKey)
    const hash = libauth.sha256.hash(libauth.utf8ToBin(message))
    assert(libauth.secp256k1.verifySignatureDERLowS(libauth.hexToBin(signature), publicKey, hash))
    assert.equal(libauth.secp256k1.verifySignatureDERLowS(libauth.hexToBin(signature), publicKey, libauth.sha256.hash(hash)), false)
  })
})


describe('P2P registration screen lifecycle', () => {
  function screen () {
    const source = readFileSync('src/components/ramp/fiat/RampLogin.vue', 'utf8')
    const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'return')
    const component = new Function('getDarkModeClass', 'getRegistrationRetrySeconds', script)(() => '', () => 0)
    const vm = {
      ...component.data.call({ $store: { getters: {} } }),
      isValidNickname: true, isLoading: false, register: true,
      usernickname: 'Synthetic name', $emit () {}
    }
    for (const [name, method] of Object.entries(component.methods)) vm[name] = method.bind(vm)
    return { component, vm }
  }

  it('blocks duplicate clicks and preserves the post-registration forced login', async () => {
    const { vm } = screen()
    let finish
    let attempts = 0
    const logins = []
    vm.registerUser = () => { attempts++; return new Promise(resolve => { finish = resolve }) }
    vm.loadUser = async force => { logins.push(force); return true }
    const pending = vm.onRegisterUser()
    await vm.onRegisterUser()
    assert.equal(attempts, 1)
    finish()
    await pending
    assert.deepEqual(logins, [true])
    assert.equal(vm.register, false)
    assert.equal(vm.registering, false)
  })

  it('keeps recovery available if post-registration login fails', async () => {
    const { vm } = screen()
    vm.registerUser = async () => {}
    vm.loadUser = async () => false
    await vm.onRegisterUser()
    assert.equal(vm.register, true)
    assert.equal(vm.registering, false)
  })

  it('invalidates attempts synchronously on form and account switches', () => {
    const { vm, component } = screen()
    component.watch.usernickname.handler.call(vm)
    component.watch.registrationIdentity.handler.call(vm)
    assert.equal(component.watch.usernickname.flush, 'sync')
    assert.equal(component.watch.registrationIdentity.flush, 'sync')
    assert.equal(vm.registrationVersion, 2)
  })
})


describe('P2P home unauthorized recovery', () => {
  function component (path, bindings = {}) {
    const source = readFileSync(path, 'utf8')
    const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'return')
    const defaults = { FilterComponent: {}, PeerInfo: {}, NoticeBoardDialog: {}, FooterMenu: {}, RampLogin: {}, ProgressLoader: {}, HeaderNav: {}, StoreListings: {}, getDarkModeClass () {}, formatCurrency () {} }
    const scope = { ...defaults, ...bindings }
    return new Function(...Object.keys(scope), script)(...Object.values(scope))
  }

  it('clears a rejected token and requests login on a generic authorized 401', async () => {
    const h = identityHarness()
    h.fail({ response: { status: 401, data: { detail: 'Unauthorized' } } })
    await assert.rejects(h.client.get('/ramp-p2p/ad/', { authorize: 'peer' }))
    assert.deepEqual(h.events, ['delete-peer', 'session-expired'])
    assert.equal(h.requests.length, 1)
  })

  it('keeps unauthenticated registration failures out of login recovery', async () => {
    const h = identityHarness()
    h.fail({ response: { status: 401, data: {} } })
    await assert.rejects(h.client.get('/ramp-p2p/registration/challenge/', { authorize: false }))
    assert.deepEqual(h.events, [])
  })

  it('forces login for home-page 401s instead of ignoring them', async () => {
    const view = component('src/pages/apps/exchange/peer_to_peer/index.vue', {
      backend: { get: async () => { throw { response: { status: 401 } } } }
    })
    const vm = { $store: { getters: {} }, showLogin: false, forceLogin: false }
    vm.handleSessionEvent = view.methods.handleSessionEvent.bind(vm)
    view.methods.handleRequestError.call(vm, { response: { status: 401 } })
    assert.equal(vm.showLogin, true)
    assert.equal(vm.forceLogin, true)
    vm.showLogin = false
    view.methods.fetchUser.call(vm)
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(vm.showLogin, true)
  })

  function listingScreen (bindings = {}) {
    const events = new EventEmitter()
    const view = component('src/components/ramp/fiat/StoreListings.vue', { bus: events, ...bindings })
    const requests = []
    const vm = {
      pendingFetch: false, disposed: false, selectedCurrency: { symbol: 'PHP' }, filters: {}, transactionType: 'BUY',
      loading: true, loadingMoreData: true,
      $store: { dispatch: async (...args) => { requests.push(args); throw { response: { status: 401 } } } }
    }
    for (const [name, method] of Object.entries(view.methods)) vm[name] = method.bind(vm)
    view.created.call(vm)
    return { vm, view, events, requests }
  }

  it('pauses failed listing requests until a successful login remounts the screen', async () => {
    const h = listingScreen()
    await h.vm.fetchStoreListings()
    assert.equal(h.vm.pendingFetch, true)
    assert.equal(h.vm.loading, false)
    assert.equal(h.vm.loadingMoreData, false)
    await h.vm.fetchStoreListings()
    await h.vm.resetAndRefetchListings(true)
    h.events.emit('relogged')
    assert.equal(h.requests.length, 1)
    assert.equal(h.events.listenerCount('relogged'), 0)
  })

  it('pauses when another home request expires and removes the listener on unmount', async () => {
    const h = listingScreen()
    h.events.emit('session-expired')
    await h.vm.fetchStoreListings()
    assert.equal(h.requests.length, 0)
    h.view.beforeUnmount.call(h.vm)
    assert.equal(h.vm.disposed, true)
    assert.equal(h.events.listenerCount('session-expired'), 0)
  })

  it('does not fetch listings before login when no token is present', async () => {
    const h = listingScreen({ getAuthToken: async () => null })
    h.vm.fetchFiatCurrencies = async () => { await h.vm.fetchStoreListings() }
    h.vm.fetchPaymentTypes = () => {}
    await h.view.mounted.call(h.vm)
    assert.equal(h.requests.length, 0)
    assert.equal(h.vm.pendingFetch, true)
  })

  it('refreshes only once after login and unregisters the parent listener', () => {
    const bus = new EventEmitter()
    const view = component('src/pages/apps/exchange/peer_to_peer/store.vue', { bus })
    const vm = { storeListingsKey: 0 }
    vm.refreshPage = view.methods.refreshPage.bind(vm)
    view.created.call(vm)
    bus.emit('relogged')
    assert.equal(vm.storeListingsKey, 1)
    view.beforeUnmount.call(vm)
    bus.emit('relogged')
    assert.equal(vm.storeListingsKey, 1)
  })
})


describe('P2P login chat authentication recovery', () => {
  it('finishes rejected-token removal before triggering another login', async () => {
    let finish
    const h = identityHarness({ removeToken: () => new Promise(resolve => { finish = resolve }) })
    h.fail({ response: { status: 401, data: {} } })
    const pending = h.client.get('/auth/', { authorize: 'peer' })
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(h.events, ['delete-peer'])
    finish()
    await assert.rejects(pending)
    assert.deepEqual(h.events, ['delete-peer', 'session-expired'])
  })

  function authHarness ({ failures = 1, authenticated = true, deferredRemoval = false, initialToken = true } = {}) {
    const h = identityHarness()
    const events = []
    const tokens = new Map(initialToken ? [['ramp-p2p-auth-key-synthetic-wallet-peer', 'synthetic-old-token']] : [])
    const session = { checks: [], responses: [] }
    let releaseRemoval
    let chatRequests = 0
    let logins = 0
    h.wallet.wallet.getPrivateKeyWifAt = () => 'synthetic-secret-placeholder'
    h.wallet.signMessage = () => 'synthetic-signature'
    const bindings = {
      Store: { commit: () => events.push('commit-user'), getters: {
        'global/getWallet': () => ({ walletHash: h.wallet.walletHash }),
        'global/getWalletIndex': 0, 'global/isChipnet': false
      } },
      rampWallet: h.wallet, assertP2PIdentity: h.assertP2PIdentity,
      SecureStoragePlugin: {
        async get ({ key }) {
          if (!tokens.has(key)) throw new Error('Missing token')
          return { value: tokens.get(key) }
        },
        async set ({ key, value }) { tokens.set(key, value); events.push('save-token'); return { value } },
        async remove ({ key }) {
          if (deferredRemoval && key.endsWith('-peer')) {
            deferredRemoval = false
            await new Promise(resolve => { releaseRemoval = resolve })
          }
          tokens.delete(key)
          events.push('remove-token')
        }
      },
      backend: {
        async get (url, config = {}) {
          const data = { ...h.registered, name: 'Synthetic name', is_authenticated: authenticated }
          if (url === '/auth/') {
            assert.equal(config.authorize, false)
            if (session.lookupError) throw session.lookupError
            return { status: 200, data }
          }
          if (url === '/ramp-p2p/peer/') {
            assert.equal(config.authorize, 'peer')
            session.checks.push(config)
            const profile = { ...data }
            delete profile.address_path
            delete profile.is_arbiter
            delete profile.is_authenticated
            const response = session.responses.shift() || { status: 200, data: profile }
            if (response.status !== 200) throw { response }
            return response
          }
          assert.equal(url, '/auth/otp/peer')
          events.push('otp')
          if (session.otpError) throw session.otpError
          return { data: { otp: 'synthetic-otp' } }
        },
        async post (url) {
          assert.equal(url, '/auth/login/peer')
          events.push('login')
          return { data: { token: `synthetic-new-token-${++logins}` } }
        }
      },
      loadChatIdentity: async () => {
        events.push('chat')
        if (session.chat) { chatRequests++; return session.chat() }
        if (++chatRequests <= failures) throw { response: { status: 401 }, config: { secret: 'must-not-be-logged' } }
        return { id: 'synthetic-chat' }
      },
      bus: { emit: (name, data) => events.push([name, data]) }
    }
    h.client.get = (...args) => bindings.backend.get(...args)
    const source = readFileSync('src/exchange/auth.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '')
    const api = new Function(...Object.keys(bindings), `${source}; return { loadAuthenticatedUser, ExchangeUser }`)(...Object.values(bindings))
    return { ...api, events, tokens, session, registered: h.registered, release: () => releaseRemoval(), counts: () => ({ logins, chatRequests }) }
  }

  for (const forceLogin of [false, true]) {
    it(`performs one fresh login before retrying chat after a 401 (forceLogin=${forceLogin})`, async () => {
      const h = authHarness()
      const user = await h.loadAuthenticatedUser(forceLogin)
      assert.equal(await user.chatPreparation, true)
      assert.deepEqual(h.counts(), { logins: forceLogin ? 2 : 1, chatRequests: 2 })
      assert.equal(user.chat_identity.id, 'synthetic-chat')
      const failedChat = h.events.indexOf('chat')
      const retryLogin = h.events.indexOf('login', failedChat)
      const retryChat = h.events.indexOf('chat', failedChat + 1)
      assert(retryLogin > failedChat && retryChat > retryLogin)
    })
  }

  it('requests session recovery after a second background chat 401 without retrying forever', async () => {
    const h = authHarness({ failures: 2 })
    const user = await h.loadAuthenticatedUser()
    assert.equal(await user.chatPreparation, false)
    assert.deepEqual(h.counts(), { logins: 1, chatRequests: 2 })
    assert.deepEqual(h.events.at(-1), ['session-expired', undefined])
  })

  it('returns the verified user while notification chat preparation is still pending', async () => {
    const h = authHarness({ failures: 0 })
    let finish
    h.session.chat = () => new Promise(resolve => { finish = resolve })
    const user = await h.loadAuthenticatedUser()
    assert.equal(user.is_authenticated, true)
    assert.equal(h.session.checks.length, 1)
    assert.equal(h.counts().chatRequests, 1)
    assert(h.events.some(event => Array.isArray(event) && event[0] === 'logging-in' && event[1] === false))
    assert.equal(Object.keys(user).includes('chatPreparation'), false)
    assert.equal(user.chat_identity, undefined)
    finish({ id: 'synthetic-chat' })
    assert.equal(await user.chatPreparation, true)
    assert.equal(user.chat_identity.id, 'synthetic-chat')
  })

  it('waits for token removal before OTP, login and saving its replacement', async () => {
    const h = authHarness({ failures: 0, deferredRemoval: true })
    const pending = h.loadAuthenticatedUser(true)
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(h.events.includes('otp'), false)
    assert.equal(h.events.includes('save-token'), false)
    h.release()
    await pending
    assert(h.events.indexOf('otp') > h.events.indexOf('remove-token'))
    assert.equal(h.tokens.get('ramp-p2p-auth-key-synthetic-wallet-peer'), 'synthetic-new-token-1')
  })

  it('checks a valid cached token without logging in again', async () => {
    const h = authHarness({ failures: 0 })
    await h.loadAuthenticatedUser()
    assert.equal(h.counts().logins, 0)
    assert.equal(h.session.checks.length, 1)
    assert.equal(h.session.checks[0].authorize, 'peer')
    assert.equal(h.session.checks[0].cache, false)
    assert(h.events.indexOf('commit-user') < h.events.indexOf('chat'))
  })

  for (const status of [401, 403]) {
    for (const detail of ['Invalid token', 'Invalid or expired token.', 'Token has expired.']) {
      it(`logs in again when the saved session is rejected with ${status}: ${detail}`, async () => {
        const h = authHarness({ failures: 0 })
        h.session.responses.push({ status, data: { detail } })
        await h.loadAuthenticatedUser()
        assert.equal(h.counts().logins, 1)
        assert.equal(h.session.checks.length, 2)
        assert.equal(h.session.checks.at(-1).authorize, 'peer')
        assert.equal(h.tokens.get('ramp-p2p-auth-key-synthetic-wallet-peer'), 'synthetic-new-token-1')
      })
    }
  }

  it('does not treat a permission-related 403 as an expired token', async () => {
    const h = authHarness({ failures: 0 })
    h.session.responses.push({ status: 403, data: { detail: 'This account is disabled.' } })
    await assert.rejects(h.loadAuthenticatedUser())
    assert.equal(h.counts().logins, 0)
  })

  it('allows registration recovery when a local server has no peer after rejecting a saved token', async () => {
    const h = authHarness({ failures: 0 })
    h.session.responses.push({ status: 403, data: { detail: 'Invalid or expired token.' } })
    h.session.otpError = { response: { status: 404, data: { error: 'user does not exist' } } }
    await assert.rejects(h.loadAuthenticatedUser(), error => error.response.status === 404)
    assert.equal(h.counts().logins, 0)
    assert.equal(h.counts().chatRequests, 0)
  })

  for (const status of [400, 404]) {
    it(`marks a missing local account on HTTP ${status} for the existing signup flow`, async () => {
      const h = authHarness({ failures: 0 })
      h.session.lookupError = { response: { status, data: { error: 'user does not exist' } } }
      await assert.rejects(h.loadAuthenticatedUser(), { code: 'p2p_account_missing' })
      assert.equal(h.counts().logins, 0)
      assert.equal(h.session.checks.length, 0)
    })
  }

  it('logs in and verifies the new session when no token is stored', async () => {
    const h = authHarness({ failures: 0, initialToken: false })
    await h.loadAuthenticatedUser()
    assert.equal(h.counts().logins, 1)
    assert.equal(h.session.checks.length, 1)
  })

  it('uses the token-authenticated status even when public account lookup reports logged out', async () => {
    const h = authHarness({ failures: 0, authenticated: false })
    h.session.responses.push({ status: 200, data: { ...h.registered, is_authenticated: true } })
    const user = await h.loadAuthenticatedUser()
    assert.equal(h.counts().logins, 0)
    assert.equal(user.is_authenticated, true)
  })

  it('uses successful P2P authentication without relying on an optional profile authentication flag', async () => {
    const h = authHarness({ failures: 0 })
    h.session.responses.push({ status: 200, data: { ...h.registered, is_authenticated: false } })
    await h.loadAuthenticatedUser()
    assert.equal(h.counts().logins, 0)
  })

  it('does not accept a new token that the server still rejects', async () => {
    const h = authHarness({ failures: 0, initialToken: false })
    h.session.responses.push({ status: 401, data: {} })
    await assert.rejects(h.loadAuthenticatedUser())
    assert.equal(h.counts().logins, 1)
    assert.equal(h.counts().chatRequests, 0)
  })

  it('does not replace a token on an unrelated session-check failure', async () => {
    const h = authHarness({ failures: 0 })
    h.session.responses.push({ status: 503, data: {} })
    await assert.rejects(h.loadAuthenticatedUser())
    assert.equal(h.counts().logins, 0)
  })

  it('completes P2P login without waiting for background chat recovery', async () => {
    const h = authHarness({ failures: 2 })
    const source = readFileSync('src/components/ramp/fiat/RampLogin.vue', 'utf8')
    const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'return')
    const emitted = []
    const view = new Function('loadAuthenticatedUser', 'getDarkModeClass', 'bus', script)(
      h.loadAuthenticatedUser, () => '', { emit: name => emitted.push(name) }
    )
    const vm = {
      forceLogin: false, isLoading: false,
      $emit: name => emitted.push(name),
      $store: { commit: () => emitted.push('commit') },
      getErrorMessageByType: () => 'Authentication rejected'
    }
    await view.methods.loadUser.call(vm)
    assert.deepEqual(emitted, ['loggedIn', 'commit', 'relogged'])
    assert.equal(vm.errorMessage, undefined)
    assert.equal(vm.isLoading, false)
    assert.equal(await vm.user.chatPreparation, false)
  })
})


describe('P2P ad authorization', () => {
  it('blocks ad creation without a token before any HTTP dispatch and triggers login', async () => {
    const h = identityHarness({ tokenForRole: () => null })
    await assert.rejects(h.client.post('/ramp-p2p/ad/', { description: 'Draft' }, { authorize: 'peer' }), { code: 'p2p_auth_required' })
    assert.equal(h.requests.length, 0)
    assert.deepEqual(h.events, ['delete-peer', 'session-expired'])
  })

  it('attaches the current token after asynchronous ad preflight checks', async () => {
    let token = 'synthetic-old-token'
    const h = identityHarness({ tokenForRole: () => token, onAvailability: () => { token = 'synthetic-fresh-token' } })
    await h.client.post('/ramp-p2p/ad/', { description: 'Draft' }, { authorize: 'peer' })
    const request = h.requests.find(request => request.url === '/ramp-p2p/ad/')
    assert.equal(request.headers.Authorization, 'Token synthetic-fresh-token')
    assert.equal(h.requests.filter(request => request.url === '/ramp-p2p/ad/').length, 1)
  })

  it('stops ad dispatch if the token disappears during preflight', async () => {
    let token = 'synthetic-old-token'
    const h = identityHarness({ tokenForRole: () => token })
    h.beforeResponse(() => { token = null })
    await assert.rejects(h.client.post('/ramp-p2p/ad/', {}, { authorize: 'peer' }), { code: 'p2p_auth_required' })
    assert.equal(h.requests.some(request => request.url === '/ramp-p2p/ad/'), false)
  })

  it('allows a manual retry with a fresh token after missing credentials', async () => {
    let token = null
    const h = identityHarness({ tokenForRole: () => token })
    await assert.rejects(h.client.post('/ramp-p2p/ad/', {}, { authorize: 'peer' }))
    token = 'synthetic-new-token'
    await h.client.post('/ramp-p2p/ad/', {}, { authorize: 'peer' })
    assert.equal(h.requests.filter(request => request.url === '/ramp-p2p/ad/').length, 1)
    assert.equal(h.requests.at(-1).headers.Authorization, 'Token synthetic-new-token')
  })

  it('uses the peer token for ads even if the cached user is an arbiter', async () => {
    const h = identityHarness({ storedUser: { is_arbiter: true, user_type: 'arbiter' } })
    await h.client.get('/ramp-p2p/ad/', { authorize: true })
    assert.equal(h.requests[0].headers.Authorization, 'Token synthetic-peer-token')
  })

  function formHarness () {
    const source = readFileSync('src/pages/apps/exchange/peer_to_peer/ad-form.vue', 'utf8')
    const methods = ['onSessionExpired', 'onRelogged', 'onSubmit', 'createAd', 'handleRequestError'].map(name => {
      const start = Math.max(source.indexOf(`    ${name} (`), source.indexOf(`    async ${name} (`))
      assert(start >= 0, name)
      const end = source.indexOf('\n    }', start) + 6
      return source.slice(start, end)
    }).join(',\n')
    const bus = new EventEmitter()
    const calls = []
    let respond = async () => ({ status: 201 })
    const backend = { post: async (...args) => { calls.push(args); return respond(...args) } }
    const component = new Function('bus', 'backend', `return { ${methods} }`)(bus, backend)
    const vm = {
      authPending: false, submittingAd: false, disposed: false, formInitialized: true,
      adFeatureEnabled: true, adsState: 'create', currentStep: 3, swipeStatus: false,
      adData: { description: 'Keep this draft', tradeAmount: 1 },
      transformPostData () { return { ...this.adData } },
      loadFormData () { throw new Error('Must not reload an initialized draft') }
    }
    for (const [name, method] of Object.entries(component)) vm[name] = method.bind(vm)
    bus.on('session-expired', vm.onSessionExpired)
    return { vm, bus, calls, respond: callback => { respond = callback } }
  }

  it('preserves the ad draft through 401 recovery and submits only on manual confirmation', async () => {
    const h = formHarness()
    h.respond(async () => { throw { response: { status: 401, data: { detail: 'No auth credentials provided' } } } })
    const draft = JSON.stringify(h.vm.adData)
    await h.vm.onSubmit()
    assert.equal(h.vm.authPending, true)
    assert.equal(h.vm.currentStep, 3)
    assert.equal(h.vm.swipeStatus, false)
    await h.vm.onSubmit()
    assert.equal(h.calls.length, 1)
    h.vm.onRelogged()
    assert.equal(JSON.stringify(h.vm.adData), draft)
    assert.equal(h.calls.length, 1)
    h.respond(async () => ({ status: 201 }))
    await h.vm.onSubmit()
    assert.equal(h.calls.length, 2)
    assert.equal(h.calls[1][2].authorize, 'peer')
    assert.equal(h.vm.swipeStatus, true)
  })

  it('blocks duplicate ad confirmation while a submission is in flight', async () => {
    const h = formHarness()
    let finish
    h.respond(() => new Promise(resolve => { finish = resolve }))
    const pending = h.vm.onSubmit()
    await h.vm.onSubmit()
    assert.equal(h.calls.length, 1)
    finish({ status: 201 })
    await pending
    assert.equal(h.vm.submittingAd, false)
  })
})


describe('P2P entry authentication gate', () => {
  function entryHarness (routeName = 'exchange') {
    const state = { hash: 'wallet-a', index: 0, chipnet: false, calls: [], authenticate: async () => ({ id: 'synthetic-user', is_arbiter: false }) }
    const commits = []
    const redirects = []
    const bindings = {
      P2PAvailability: {}, HeaderNav: {}, OngoingMaintenanceDialog: {}, RampLogin: {},
      getDarkModeClass () {},
      loadRampWallet: async () => { state.calls.push('wallet'); return { walletHash: state.hash } },
      loadAuthenticatedUser: async () => { state.calls.push('auth'); return state.authenticate() },
      bus: { off () {} }
    }
    const source = readFileSync('src/pages/apps/exchange/index.vue', 'utf8')
    const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'return')
    const view = new Function(...Object.keys(bindings), script)(...Object.values(bindings))
    const store = {
      getters: {
        'global/getWallet': () => ({ walletHash: state.hash }),
        get 'global/getWalletIndex' () { return state.index },
        get 'global/isChipnet' () { return state.chipnet }
      },
      commit: (...args) => commits.push(args)
    }
    const vm = {
      ...view.data.call({ $store: store }), $store: store,
      $route: { name: routeName, query: {}, matched: routeName.startsWith('arbiter') ? [{ name: 'exchange-arbiter' }] : [] },
      $router: { replace: route => redirects.push(route) },
      $t: (key, values, fallback) => fallback || key
    }
    Object.defineProperty(vm, 'walletIdentity', { get: () => view.computed.walletIdentity.call(vm) })
    for (const [name, method] of Object.entries(view.methods)) vm[name] = method.bind(vm)
    return { vm, view, state, commits, redirects }
  }

  it('loads the wallet then authenticates before opening the app or redirecting', async () => {
    const h = entryHarness()
    let finish
    h.state.authenticate = () => new Promise(resolve => { finish = resolve })
    const pending = h.vm.getUser()
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(h.state.calls, ['wallet', 'auth'])
    assert.equal(h.vm.isloaded, false)
    assert.equal(h.redirects.length, 0)
    await h.vm.getUser()
    assert.equal(h.state.calls.length, 2)
    finish({ id: 'verified-user', is_arbiter: false })
    await pending
    assert.equal(h.vm.isloaded, true)
    assert.equal(h.vm.checking, false)
    assert.equal(h.redirects[0].name, 'p2p-store')
  })

  it('keeps all protected pages blocked on login failure and supports a manual retry', async () => {
    const h = entryHarness()
    h.state.authenticate = async () => { throw { response: { status: 401 } } }
    await h.vm.getUser()
    assert.equal(h.vm.isloaded, false)
    assert(h.vm.authError)
    assert.equal(h.redirects.length, 0)
    assert.equal(h.state.calls.filter(value => value === 'auth').length, 1)
    h.state.authenticate = async () => ({ is_arbiter: false })
    await h.vm.getUser()
    assert.equal(h.vm.isloaded, true)
    assert.equal(h.vm.authError, null)
  })

  it('preserves deep-linked pages after authentication', async () => {
    const h = entryHarness('p2p-order')
    await h.vm.getUser()
    assert.equal(h.vm.isloaded, true)
    assert.equal(h.redirects.length, 0)
  })

  it('routes an authenticated arbiter to appeals', async () => {
    const h = entryHarness()
    h.state.authenticate = async () => ({ is_arbiter: true })
    await h.vm.getUser()
    assert.equal(h.redirects[0].name, 'arbiter-appeals')
  })

  it('uses the existing peer registration screen when no account exists', async () => {
    const h = entryHarness()
    h.state.authenticate = async () => { throw { response: { status: 404 } } }
    await h.vm.getUser()
    assert.equal(h.vm.showRegistration, true)
    assert.equal(h.vm.isloaded, false)
    assert.equal(h.vm.authError, null)
  })

  it('opens existing signup for an explicit missing-account response from the local server', async () => {
    const h = entryHarness()
    h.state.authenticate = async () => { throw { code: 'p2p_account_missing', response: { status: 400 } } }
    await h.vm.getUser()
    assert.equal(h.vm.showRegistration, true)
    assert.equal(h.vm.isloaded, false)
    assert.equal(h.vm.authError, null)
  })

  it('does not introduce registration on arbiter routes', async () => {
    const h = entryHarness('arbiter-appeals')
    h.state.authenticate = async () => { throw { response: { status: 404 } } }
    await h.vm.getUser()
    assert.equal(h.vm.showRegistration, false)
    assert(h.vm.authError)
  })

  it('discards an old wallet response and verifies the newly selected wallet', async () => {
    const h = entryHarness()
    let finish
    h.state.authenticate = () => new Promise(resolve => { finish = resolve })
    const oldAttempt = h.vm.getUser()
    await new Promise(resolve => setImmediate(resolve))
    h.state.hash = 'wallet-b'
    h.state.authenticate = async () => ({ id: 'wallet-b-user' })
    h.view.watch.walletIdentity.handler.call(h.vm)
    await new Promise(resolve => setImmediate(resolve))
    finish({ id: 'wallet-a-user' })
    await oldAttempt
    assert.equal(h.vm.user.id, 'wallet-b-user')
    assert.equal(h.vm.isloaded, true)
    assert.equal(h.commits.some(([name, user]) => name === 'ramp/updateUser' && user?.id === 'wallet-a-user'), false)
  })

  it('does not open the app after an authentication response arrives on unmount', async () => {
    const h = entryHarness()
    let finish
    h.state.authenticate = () => new Promise(resolve => { finish = resolve })
    const pending = h.vm.getUser()
    await new Promise(resolve => setImmediate(resolve))
    h.view.beforeUnmount.call(h.vm)
    finish({ id: 'obsolete-user' })
    await pending
    assert.equal(h.vm.isloaded, false)
    assert.equal(h.redirects.length, 0)
  })
})


describe('P2P expired-token response wording', () => {
  for (const detail of ['Invalid or expired token.', 'Token has expired.']) {
    it(`clears rejected credentials before login recovery for: ${detail}`, async () => {
      const h = identityHarness()
      h.fail({ response: { status: 403, data: { detail } } })
      await assert.rejects(h.client.get('/auth/', { authorize: 'peer', params: { _fresh: Date.now() } }))
      assert.deepEqual(h.events, ['delete-peer', 'session-expired'])
    })
  }
})


describe('P2P account discovery and session endpoint separation', () => {
  for (const [method, url] of [['get', '/auth/'], ['get', '/auth/otp/peer'], ['post', '/auth/login/peer'], ['post', '/ramp-p2p/registration/challenge/'], ['post', '/ramp-p2p/peer/']]) {
    it(`strips inherited auth from token-free ${method.toUpperCase()} ${url}`, async () => {
      const h = identityHarness({ tokenForRole: () => { throw new Error('Must not load a token') } })
      const headers = {
        Authorization: 'Token synthetic-stale-token', authorization: 'Bearer synthetic-stale-oauth',
        common: { AUTHORIZATION: 'Bearer synthetic-common-token' },
        [method]: { Authorization: 'Token synthetic-method-token' },
        signature: 'synthetic-registration-signature'
      }
      const config = { authorize: false, headers, auth: { username: 'synthetic', password: 'synthetic' } }
      if (method === 'get') await h.client.get(url, config)
      else await h.client.post(url, {}, config)
      const request = h.requests[0]
      assert.equal(request.auth, undefined)
      for (const group of [request.headers, request.headers.common, request.headers[method]]) {
        assert.equal(Object.keys(group).some(name => name.toLowerCase() === 'authorization'), false)
      }
      assert.equal(request.headers.signature, 'synthetic-registration-signature')
    })
  }

  for (const role of ['peer', 'arbiter']) {
    it(`uses public discovery and the protected ${role} profile to verify a session`, async () => {
      const h = identityHarness()
      h.registered.is_arbiter = role === 'arbiter'
      const user = await h.assertP2PIdentity(null, role)
      assert.equal(user.is_authenticated, true)
      assert.equal(h.requests[0].url, '/auth/')
      assert.equal(h.requests[0].authorize, false)
      assert.equal(h.requests[0].headers.Authorization, undefined)
      assert.equal(h.requests[1].url, role === 'peer' ? '/ramp-p2p/peer/' : '/ramp-p2p/arbiter/synthetic-wallet/')
      assert.equal(h.requests[1].headers.Authorization, `Token synthetic-${role}-token`)
    })
  }

  it('accepts the actual peer profile shape without an address_path or is_authenticated field', async () => {
    const h = identityHarness()
    const get = h.client.get.bind(h.client)
    h.client.get = async (...args) => {
      const response = await get(...args)
      if (args[0] === '/ramp-p2p/peer/') {
        delete response.data.address_path
        delete response.data.is_arbiter
        delete response.data.is_authenticated
      }
      return response
    }
    const user = await h.assertP2PIdentity()
    assert.equal(user.address_path, '0/0')
    assert.equal(user.is_authenticated, true)
  })

  for (const mismatch of [{ id: 'another-profile' }, { public_key: 'another-key' }, { address: 'another-address' }, { address_path: '0/1' }, { is_disabled: true }]) {
    it(`blocks a protected profile mismatch: ${Object.keys(mismatch)[0]}`, async () => {
      const h = identityHarness()
      const get = h.client.get.bind(h.client)
      h.client.get = async (...args) => {
        const response = await get(...args)
        if (args[0] === '/ramp-p2p/peer/') Object.assign(response.data, mismatch)
        return response
      }
      await assert.rejects(h.assertP2PIdentity(), { code: 'p2p_identity_mismatch' })
    })
  }
})


describe('P2P verification of already-broadcast escrow funding', () => {
  function verificationHarness () {
    const calls = []
    const events = []
    const state = { post: async () => ({}), get: async () => ({ data: { status: { value: 'ESCRW' } } }) }
    const backend = {
      async post (...args) { calls.push(['post', ...args]); return state.post(...args) },
      async get (...args) { calls.push(['get', ...args]); return state.get(...args) }
    }
    const bindings = { backend, getDarkModeClass () {}, bus: { emit: name => events.push(name) } }
    const source = readFileSync('src/components/ramp/fiat/VerifyTransaction.vue', 'utf8')
    const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'return')
    const view = new Function(...Object.keys(bindings), script)(...Object.values(bindings))
    const vm = {
      ...view.data.call({ $store: { getters: {} }, $q: { platform: { is: {} }, screen: { height: 800 } } }),
      data: { action: 'ESCROW', orderId: 24, contractBalance: 0 },
      transactionId: 'synthetic-already-broadcast-txid', txidLoaded: true,
      $emit: name => events.push(name),
      $q: { notify: message => events.push(message.message) },
      $t: (key, values, fallback) => fallback || key
    }
    for (const [name, method] of Object.entries(view.methods)) vm[name] = method.bind(vm)
    for (const [name, getter] of Object.entries(view.computed)) Object.defineProperty(vm, name, { get: () => getter.call(vm) })
    vm.delay = async () => {}
    return { vm, view, state, calls, events }
  }

  it('refreshes balance instead of reusing the zero recorded before funding', async () => {
    const h = verificationHarness()
    const reads = []
    h.vm.data.escrow = { getBalance: async (...args) => { reads.push(args); return 0.0001057 } }
    assert.equal(await h.vm.fetchContractBalance(), 0.0001057)
    assert.deepEqual(reads, [['', true]])
    assert.equal(h.vm.contract.balance, 0.0001057)
  })

  it('submits the saved funding txid for backend verification even before balance is indexed', async () => {
    const h = verificationHarness()
    let finish
    h.state.post = () => new Promise(resolve => { finish = resolve })
    const pending = h.vm.checkTransferStatus()
    h.vm.checkTransferStatus()
    assert.equal(h.calls.length, 1)
    assert.equal(h.calls[0][1], '/ramp-p2p/order/24/verify-escrow/')
    assert.deepEqual(h.calls[0][2], { txid: 'synthetic-already-broadcast-txid' })
    assert.equal(h.vm.balanceLoaded, false)
    finish({})
    await pending
    assert(h.events.includes('success'))
  })

  it('accepts an already-verified escrow only after confirming the backend order status', async () => {
    const h = verificationHarness()
    h.state.post = async () => { throw { response: { status: 400, data: { error: 'Action requires status ESCRW_PN' } } } }
    h.state.get = async () => ({ data: { status: { value: 'ESCRW' } } })
    await h.vm.checkTransferStatus()
    assert.deepEqual(h.calls.map(call => call[0]), ['post', 'get'])
    assert(h.events.includes('success'))
  })

  it('keeps a manual verification retry available after bounded backend failures without discarding the txid', async () => {
    const h = verificationHarness()
    h.state.post = async () => { throw { response: { status: 400, data: { error: 'Transaction is not indexed yet' } } } }
    h.state.get = async () => ({ data: { status: { value: 'ESCRW_PN' } } })
    await h.vm.checkTransferStatus()
    assert.equal(h.calls.filter(call => call[0] === 'post').length, 4)
    assert.equal(h.events.includes('success'), false)
    assert.equal(h.vm.showRetryBtn, true)
    assert.equal(h.vm.loading, false)
    assert.equal(h.vm.transactionId, 'synthetic-already-broadcast-txid')
    h.state.post = async () => ({})
    h.state.get = async () => ({ data: { status: { value: 'ESCRW' } } })
    await h.vm.submitAction()
    assert.equal(h.calls.filter(call => call[0] === 'post').length, 5)
    assert(h.events.includes('success'))
  })

  it('waits for the queued backend validation instead of treating HTTP 200 as verified funding', async () => {
    const h = verificationHarness()
    let reads = 0
    h.state.get = async () => ({ data: { status: { value: ++reads < 3 ? 'ESCRW_PN' : 'ESCRW' } } })
    await h.vm.checkTransferStatus()
    assert.equal(h.calls.filter(call => call[0] === 'post').length, 1)
    assert.equal(reads, 3)
    assert.equal(h.events.filter(event => event === 'success').length, 1)
  })

  it('keeps recovery available when the backend worker has not completed validation', async () => {
    const h = verificationHarness()
    h.state.get = async () => ({ data: { status: { value: 'ESCRW_PN' } } })
    await h.vm.checkTransferStatus()
    assert.equal(h.calls.filter(call => call[0] === 'post').length, 1)
    assert.equal(h.calls.filter(call => call[0] === 'get').length, 6)
    assert.equal(h.events.includes('success'), false)
    assert.equal(h.vm.showRetryBtn, true)
    assert.match(h.vm.errorMessage, /pending on the server/)
  })

  it('stops automatic verification retries on authentication failure', async () => {
    const h = verificationHarness()
    h.state.post = async () => { throw { response: { status: 401 } } }
    await h.vm.checkTransferStatus()
    assert.equal(h.calls.length, 1)
    assert.equal(h.vm.showRetryBtn, true)
    assert(h.events.includes('handle-request-error'))
    assert.equal(h.events.includes('success'), false)
  })

  it('does not emit success for a verification response arriving after unmount', async () => {
    const h = verificationHarness()
    let finish
    h.state.post = () => new Promise(resolve => { finish = resolve })
    const pending = h.vm.checkTransferStatus()
    h.view.beforeUnmount.call(h.vm)
    finish({})
    await pending
    assert.equal(h.events.includes('success'), false)
  })

  it('stops a scheduled retry when leaving the order', async () => {
    const h = verificationHarness()
    let finish
    h.state.post = async () => { throw { response: { status: 503 } } }
    h.vm.delay = () => new Promise(resolve => { finish = resolve })
    const pending = h.vm.checkTransferStatus()
    await new Promise(resolve => setImmediate(resolve))
    h.view.beforeUnmount.call(h.vm)
    finish()
    await pending
    assert.equal(h.calls.length, 1)
  })

  it('verifies a saved release txid and waits for RLS even when the displayed balance is stale', async () => {
    const h = verificationHarness()
    h.vm.data.action = 'RELEASE'
    h.vm.transactionId = 'synthetic-release-txid'
    h.vm.contract.balance = 1
    h.vm.balanceLoaded = true
    let reads = 0
    h.state.get = async () => ({ data: { status: { value: ++reads < 3 ? 'PD' : 'RLS' } } })
    await h.vm.checkTransferStatus()
    const posts = h.calls.filter(call => call[0] === 'post')
    assert.equal(posts.length, 1)
    assert.equal(posts[0][1], '/ramp-p2p/order/24/verify-release/')
    assert.deepEqual(posts[0][2], { txid: 'synthetic-release-txid' })
    assert.equal(reads, 3)
    assert(h.events.includes('success'))
  })

  it('skips release verification when the server already reports RLS', async () => {
    const h = verificationHarness()
    h.vm.data.action = 'RELEASE'
    h.state.get = async () => ({ data: { status: { value: 'RLS' } } })
    await h.vm.checkTransferStatus()
    assert.deepEqual(h.calls.map(call => call[0]), ['get'])
    assert.equal(h.calls[0][2].cache, false)
    assert.equal(h.events.filter(event => event === 'success').length, 1)
  })

  it('accepts release completed between the status check and verification request', async () => {
    const h = verificationHarness()
    h.vm.data.action = 'RELEASE'
    let reads = 0
    h.state.get = async () => ({ data: { status: { value: ++reads === 1 ? 'PD' : 'RLS' } } })
    h.state.post = async () => { throw { response: { status: 400, data: { error: 'Already released' } } } }
    await h.vm.checkTransferStatus()
    assert.deepEqual(h.calls.map(call => call[0]), ['get', 'post', 'get'])
    assert.equal(h.events.filter(event => event === 'success').length, 1)
  })

  it('does not duplicate release verification while the initial status check is pending', async () => {
    const h = verificationHarness()
    h.vm.data.action = 'RELEASE'
    let finish
    h.state.get = () => new Promise(resolve => { finish = resolve })
    const pending = h.vm.checkTransferStatus()
    await h.vm.verifyRelease()
    h.vm.checkTransferStatus()
    assert.equal(h.calls.length, 1)
    h.view.beforeUnmount.call(h.vm)
    finish({ data: { status: { value: 'PD' } } })
    await pending
    assert.equal(h.calls.filter(call => call[0] === 'post').length, 0)
    assert.equal(h.events.includes('success'), false)
  })

  it('does not report release success while backend validation is pending', async () => {
    const h = verificationHarness()
    h.vm.data.action = 'RELEASE'
    h.state.get = async () => ({ data: { status: { value: 'PD' } } })
    await h.vm.checkTransferStatus()
    assert.equal(h.calls.filter(call => call[0] === 'post').length, 1)
    assert.equal(h.calls.filter(call => call[0] === 'get').length, 7)
    assert.equal(h.events.includes('success'), false)
    assert.equal(h.vm.showRetryBtn, true)
    assert.match(h.vm.errorMessage, /Release verification is still pending/)
  })

  it('recovers an already-released order after a release verification status conflict', async () => {
    const h = verificationHarness()
    h.vm.data.action = 'RELEASE'
    h.state.post = async () => { throw { response: { status: 400, data: { error: 'duplicate txid' } } } }
    let reads = 0
    h.state.get = async () => ({ data: { status: { value: ++reads === 1 ? 'PD' : 'RLS' } } })
    await h.vm.checkTransferStatus()
    assert.deepEqual(h.calls.map(call => call[0]), ['get', 'post', 'get'])
    assert(h.events.includes('success'))
  })

  it('stops release verification retries when login is required', async () => {
    const h = verificationHarness()
    h.vm.data.action = 'RELEASE'
    h.state.post = async () => { throw { response: { status: 401 } } }
    await h.vm.checkTransferStatus()
    assert.equal(h.calls.length, 2)
    assert.equal(h.events.includes('success'), false)
    assert.equal(h.vm.showRetryBtn, true)
  })

  it('unlocks retry when balance polling exhausts its attempts', async () => {
    const h = verificationHarness()
    h.vm.transactionId = ''
    h.vm.balanceLoaded = true
    await h.vm.exponentialBackoff(async () => 0, 0, 1)
    assert.equal(h.vm.showRetryBtn, true)
    assert.equal(h.vm.loading, false)
    assert.equal(h.calls.length, 0)
  })
})


describe('Configured Watchtower escrow balances', () => {
  function balanceHarness () {
    const calls = []
    const state = { get: async () => ({ status: 200, data: { valid: true, balance: 0.0001057 } }), electrumReads: 0 }
    const backend = { get: async (...args) => { calls.push(args); return state.get(...args) } }
    const source = readFileSync('src/exchange/contract.js', 'utf8').replace(/^import .*$/gm, '').replace(/export default RampContract/, '').replace(/export /g, '')
    const RampContract = new Function('backend', 'Store', 'Watchtower', `${source}; return RampContract`)(
      backend, { getters: { 'global/isChipnet': false } }, class {}
    )
    const contract = Object.create(RampContract.prototype)
    contract.contract = {
      address: 'synthetic-contract',
      getBalance () { state.electrumReads++; throw new Error('Must not use Electrum for balance') }
    }
    return { contract, state, calls }
  }

  it('reads the configured backend balance, with a fresh request and no token', async () => {
    const h = balanceHarness()
    assert.equal(await h.contract.getBalance('', true), 0.0001057)
    assert.equal(h.calls[0][0], '/balance/bch/synthetic-contract/')
    assert.equal(h.calls[0][1].authorize, false)
    assert.equal(h.calls[0][1].cache, false)
    assert(h.calls[0][1].params._fresh)
    assert.equal(h.state.electrumReads, 0)
  })

  it('preserves a genuine Watchtower zero without querying Electrum', async () => {
    const h = balanceHarness()
    h.state.get = async () => ({ status: 200, data: { valid: true, balance: 0 } })
    assert.equal(await h.contract.getBalance('', true), 0)
    assert.equal(h.state.electrumReads, 0)
  })

  it('propagates Watchtower failure instead of returning a false zero or using Electrum', async () => {
    const h = balanceHarness()
    h.state.get = async () => { throw new Error('Watchtower unavailable') }
    await assert.rejects(h.contract.getBalance('', true), /Watchtower unavailable/)
    assert.equal(h.state.electrumReads, 0)
  })

  for (const balance of [null, undefined, -1, 'invalid']) {
    it(`rejects an invalid Watchtower balance: ${balance}`, async () => {
      const h = balanceHarness()
      h.state.get = async () => ({ status: 200, data: { balance } })
      await assert.rejects(h.contract.getBalance('', true))
    })
  }

  it('deduplicates simultaneous fresh reads', async () => {
    const h = balanceHarness()
    let finish
    h.state.get = () => new Promise(resolve => { finish = resolve })
    const first = h.contract.getBalance('', true)
    const second = h.contract.getBalance('', true)
    assert.equal(h.calls.length, 1)
    finish({ status: 200, data: { balance: 0.0001057 } })
    assert.deepEqual(await Promise.all([first, second]), [0.0001057, 0.0001057])
  })

  for (const file of ['StandByDisplay.vue', 'PaymentConfirmation.vue']) {
    function screenHarness () {
      const source = readFileSync(`src/components/ramp/fiat/${file}`, 'utf8')
      const start = source.indexOf('    async fetchContractBalance ()')
      const end = source.indexOf('\n    },', start) + 7
      const methods = new Function(`return { ${source.slice(start, end)} }`)()
      const vm = {
        data: { contractBalance: 0, contractAddress: 'synthetic-contract', contract: { address: 'synthetic-contract' } },
        contractBalance: 0, contractBalanceError: false
      }
      vm.fetchContractBalance = methods.fetchContractBalance.bind(vm)
      return vm
    }

    it(`refreshes the stale pre-funding zero in ${file}`, async () => {
      const vm = screenHarness()
      let reads = 0
      vm.data.escrow = { getBalance: async () => { reads++; return 0.0001057 } }
      await vm.fetchContractBalance()
      assert.equal(reads, 1)
      assert.equal(Number(vm.contractBalance), 0.0001057)
      assert.equal(vm.contractBalanceError, false)
    })

    it(`shows unavailable rather than the stale zero if Watchtower fails in ${file}`, async () => {
      const vm = screenHarness()
      vm.data.escrow = { getBalance: async () => { throw new Error('Watchtower unavailable') } }
      await vm.fetchContractBalance()
      assert.equal(vm.contractBalance, null)
      assert.equal(vm.contractBalanceError, true)
    })
  }

  it('keeps the broadcast txid and proceeds to verification if the post-send balance refresh fails', async () => {
    const h = harness()
    h.vm.escrowContract.getBalance = async () => { throw new Error('Watchtower unavailable') }
    await h.vm.onSecurityOk()
    assert.equal(h.events.filter(event => event === 'broadcast').length, 1)
    assert(h.events.includes('pending-escrow'))
    assert(h.events.includes('success'))
    assert.equal(h.vm.txid, 'synthetic-txid')
    assert.equal(h.vm.escrowBalance, null)
  })
})


describe('P2P order WebSocket status refresh', () => {
  function orderHarness () {
    const calls = []
    const applied = []
    const sockets = []
    const state = { status: 'PD', get: null, contractReloads: 0 }
    function order (status) {
      return {
        id: 24, status: { value: status }, contract: 7,
        members: { buyer: { public_key: 'synthetic-buyer' }, seller: { public_key: 'synthetic-seller' } },
        chat_session_ref: 'synthetic-chat'
      }
    }
    const backend = {
      async get (url, config) {
        calls.push({ url, config })
        if (state.get) return state.get(url, config)
        return { data: order(state.status) }
      }
    }
    class WebSocketManager {
      constructor () { sockets.push(this) }
      setWebSocketUrl (url) { this.url = url }
      subscribeToMessages (callback) { this.message = callback }
    }
    const source = readFileSync('src/pages/apps/exchange/peer_to_peer/order.vue', 'utf8')
    const methods = ['fetchOrder', 'setupWebSocket', 'ensureChatWebSocket', 'getPaidState'].map(name => {
      const start = Math.max(source.indexOf(`    ${name} (`), source.indexOf(`    async ${name} (`))
      const end = source.indexOf('\n    }', start) + 6
      return source.slice(start, end)
    }).join(',\n')
    const bindings = {
      backend, WebSocketManager,
      getBackendWsUrl: () => 'ws://localhost:9001/ws/ramp-p2p/subscribe/',
      getChatBackendWsUrl: () => 'ws://localhost:9002/ws/chat/sessions/',
      generateChatRef: () => 'synthetic-chat'
    }
    const component = new Function(...Object.keys(bindings), `return { ${methods} }`)(...Object.values(bindings))
    const vm = {
      disposed: false, order: order('PD'), escrowContract: {}, websockets: {}, chatRef: 'synthetic-chat',
      wsFetchingOrder: false, orderUpdatePending: false, contractUpdatePending: false,
      fetchOrderInProgress: false, orderRefreshPending: false, escrowTransferKey: 0,
      $route: { params: { order: 24 } },
      async handleNewStatus (status) { applied.push(status.value) },
      syncLiveActivity () {}, updateOrderReadAt () {}, closeWSConnection () {}, chatSetupScope: () => 'test-scope',
      handleRequestError (error) { throw error },
      async generateContract () { state.contractReloads++ }
    }
    for (const [name, method] of Object.entries(component)) vm[name] = method.bind(vm)
    vm.setupWebSocket()
    return { vm, state, calls, applied, sockets, order, message: message => sockets[0].message(message) }
  }

  it('applies release updates arriving immediately after another order fetch', async () => {
    const h = orderHarness()
    await h.vm.fetchOrder('onVerifyTxSuccess')
    h.state.status = 'RLS'
    await h.message({ success: true, txdata: { action: 'RELEASE' } })
    assert.equal(h.calls.length, 2)
    assert.deepEqual(h.applied, ['PD', 'RLS'])
    assert.equal(h.vm.order.status.value, 'RLS')
    assert(h.calls.every(call => call.config.cache === false && call.config.params._fresh))
  })

  it('queues release updates arriving during an HTTP refresh', async () => {
    const h = orderHarness()
    let finish
    h.state.get = () => new Promise(resolve => { finish = resolve })
    const pending = h.vm.fetchOrder('initial')
    await h.message({ success: true, txdata: { action: 'RELEASE' } })
    h.state.get = null
    h.state.status = 'RLS'
    finish({ data: h.order('PD') })
    await pending
    assert.equal(h.calls.length, 2)
    assert.deepEqual(h.applied, ['PD', 'RLS'])
  })

  it('coalesces events during WebSocket refresh without losing the last status or contract update', async () => {
    const h = orderHarness()
    let finish
    h.state.get = () => new Promise(resolve => { finish = resolve })
    const pending = h.message({ success: true })
    await h.message({ success: true, contract_address: 'synthetic-contract' })
    await h.message({ success: true, txdata: { action: 'RELEASE' } })
    assert.equal(h.calls.length, 1)
    h.state.get = null
    h.state.status = 'RLS'
    finish({ data: h.order('PD') })
    await pending
    assert.equal(h.calls.length, 2)
    assert.equal(h.vm.order.status.value, 'RLS')
    assert.equal(h.state.contractReloads, 1)
    assert.equal(h.vm.wsFetchingOrder, false)
  })

  it('discards queued refreshes and stale responses after leaving the order', async () => {
    const h = orderHarness()
    let finish
    h.state.get = () => new Promise(resolve => { finish = resolve })
    const pending = h.vm.fetchOrder()
    await h.vm.fetchOrder('websocket')
    h.vm.disposed = true
    finish({ data: h.order('RLS') })
    await pending
    assert.equal(h.calls.length, 1)
    assert.deepEqual(h.applied, [])
  })
})


describe('P2P saved release transaction state', () => {
  it('keeps an already-broadcast release in verification despite a stale positive balance', () => {
    const source = readFileSync('src/pages/apps/exchange/peer_to_peer/order.vue', 'utf8')
    const start = source.indexOf('    getPaidState (kwargs)')
    const end = source.indexOf('\n    },', start) + 7
    const component = new Function(`return { ${source.slice(start, end)} }`)()
    const vm = { getTxidByAction: () => 'synthetic-release-txid' }
    const kwargs = { orderId: 24, tradeType: 'BUY', userIsAdOwner: true, contractBalance: 0.0001057 }
    assert.equal(component.getPaidState.call(vm, kwargs), 'tx-confirmation')
    vm.getTxidByAction = () => null
    assert.equal(component.getPaidState.call(vm, kwargs), 'payment-confirmation')
  })
})


describe('P2P post-release chat and feedback', () => {
  function method (path, name, bindings = {}) {
    const source = readFileSync(path, 'utf8')
    const start = Math.max(source.indexOf(`    ${name} (`), source.indexOf(`    async ${name} (`))
    const end = source.indexOf('\n    },', start) + 7
    return new Function(...Object.keys(bindings), `return { ${source.slice(start, end)} }`)(...Object.values(bindings))[name]
  }

  function receiptHarness () {
    const source = readFileSync('src/exchange/chat/index.js', 'utf8')
    const start = source.indexOf('export async function updateLastRead (')
    const end = source.indexOf('\nexport function sendChatMessage', start)
    const calls = []
    const chatBackend = { post: async (...args) => { calls.push(args); return { data: {} } } }
    const update = new Function('chatBackend', `${source.slice(start, end).replace('export ', '')}; return updateLastRead`)(chatBackend)
    return { update, calls }
  }

  for (const messages of [[], [{}], [{ createdAt: new Date('invalid') }], [{ createdAt: Infinity }]]) {
    it(`skips invalid read receipts for ${JSON.stringify(messages)}`, async () => {
      const h = receiptHarness()
      await h.update('synthetic-chat', messages)
      assert.equal(h.calls.length, 0)
    })
  }

  it('sends a valid read receipt using the latest valid message', async () => {
    const h = receiptHarness()
    await h.update('synthetic-chat', [{ createdAt: new Date(2000) }, {}, { createdAt: new Date(1000) }])
    assert.equal(h.calls.length, 1)
    assert.equal(h.calls[0][0], 'chat/sessions/synthetic-chat/chat_member/')
    assert.equal(h.calls[0][1].last_read_timestamp.getTime(), 3000)
    assert.equal(h.calls[0][2].forceSign, true)
    await h.update('', [{ createdAt: new Date(2000) }])
    assert.equal(h.calls.length, 1)
  })

  it('reuses an existing connecting chat socket and subscribes once', () => {
    const sockets = []
    const events = []
    class WebSocketManager {
      constructor () { sockets.push(this); this.subscriptions = 0 }
      subscribeToMessages (callback) { this.subscriptions++; this.message = callback }
      setWebSocketUrl (url) { this.url = url }
      closeConnection () { throw new Error('Must not close the chat connection') }
    }
    const ensure = method('src/pages/apps/exchange/peer_to_peer/order.vue', 'ensureChatWebSocket', {
      WebSocketManager, getChatBackendWsUrl: () => 'wss://example.test/ws/chat/sessions/',
      bus: { emit: (...args) => events.push(args) }
    })
    const vm = { websockets: {}, chatRef: 'synthetic-chat', disposed: false, chatReadyScope: 'test-scope', chatSetupScope: () => 'test-scope' }
    ensure.call(vm)
    ensure.call(vm)
    assert.equal(sockets.length, 1)
    assert.equal(sockets[0].subscriptions, 1)
    sockets[0].message({ type: 'new_message', data: { id: 1 } })
    assert.deepEqual(events, [['last-read-update'], ['new-message', { id: 1 }]])
    vm.chatRef = 'another-chat'
    ensure.call(vm)
    assert.equal(sockets[0].url, 'wss://example.test/ws/chat/sessions/another-chat/')
    vm.disposed = true
    vm.chatRef = 'obsolete-chat'
    ensure.call(vm)
    assert.equal(sockets[0].url, 'wss://example.test/ws/chat/sessions/another-chat/')
  })

  it('prevents concurrent chat loads while the first request is pending', async () => {
    let finish
    let loads = 0
    const load = method('src/pages/apps/exchange/peer_to_peer/order.vue', 'loadChatData')
    const vm = {
      chatRef: 'synthetic-chat', chatLoaded: false, chatLoading: false,
      chatSetupScope: () => 'test-scope', initializeChat: async () => true,
      loadKeyPair: () => { loads++; return new Promise((resolve, reject) => { finish = reject }) }
    }
    const pending = load.call(vm)
    await load.call(vm)
    assert.equal(loads, 1)
    const original = console.error
    console.error = () => {}
    try {
      finish(new Error('Synthetic failure'))
      await pending
    } finally {
      console.error = original
    }
    assert.equal(vm.chatLoading, false)
    assert.equal(vm.chatLoaded, false)
  })

  for (const history of [[], [{ status: 'PD' }, { status: 'RLS' }], [{ status: 'APL' }, { status: 'RLS' }], [{ status: { value: 'APL' } }]]) {
    it(`checks appeal history without probing a missing appeal: ${JSON.stringify(history)}`, async () => {
      const calls = []
      const check = method('src/components/ramp/fiat/dialogs/FeedbackForm.vue', 'checkAppeal', {
        backend: { get: async (...args) => { calls.push(args); return { data: history } } },
        bus: { emit () { throw new Error('Unexpected error') } }
      })
      const vm = { orderId: 24, appealed: false }
      await check.call(vm)
      assert.equal(calls.length, 1)
      assert.equal(calls[0][0], '/ramp-p2p/order/24/status/')
      assert.equal(calls[0][1].cache, false)
      assert.equal(vm.appealed, history.some(entry => (entry.status?.value || entry.status) === 'APL'))
    })
  }
})


describe('P2P existing chat identity recovery', () => {
  function identityHarness () {
    const source = readFileSync('src/exchange/chat/index.js', 'utf8')
    const start = source.indexOf('const pendingChatIdentities = new Map()')
    const end = source.indexOf('\nexport function updateOrderChatSessionRef', start)
    const calls = []
    const expectedRef = 'synthetic-wallet-ref'
    const existing = { id: 12, ref: expectedRef }
    const state = {
      walletHash: 'synthetic-wallet', index: 0, chipnet: false,
      byId: null, byRef: existing,
      create: async () => ({ id: 13, ref: expectedRef }),
      link: async () => {}
    }
    const bindings = {
      wallet: { walletHash: 'synthetic-wallet' },
      loadRampWallet: async () => { throw new Error('Unexpected wallet load') },
      assertP2PIdentity: async () => state.verify?.(),
      generateChatIdentityRef: hash => { assert.equal(hash, 'synthetic-wallet'); return expectedRef },
      fetchChatIdentityById: async id => { calls.push(['id', id]); return state.byId },
      fetchChatIdentityByRef: async ref => {
        calls.push(['ref', ref])
        if (state.lookupError) throw state.lookupError
        return typeof state.byRef === 'function' ? state.byRef() : state.byRef
      },
      chatIdentityManager: {
        setIdentity: identity => { calls.push(['set', identity]); return identity },
        _updateSignerData: async () => { calls.push(['signer']) },
        _updateEncryptionKeypair: async update => { calls.push(['encryption', update]) },
        create: async payload => { calls.push(['create', payload]); return state.create(payload) }
      },
      updateChatIdentityId: async (...args) => { calls.push(['link', ...args]); return state.link(...args) },
      Store: {
        getters: {
          'global/getWallet': () => ({ walletHash: state.walletHash }),
          get 'global/getWalletIndex' () { return state.index },
          get 'global/isChipnet' () { return state.chipnet }
        },
        commit: (...args) => calls.push(['commit', ...args])
      }
    }
    const load = new Function(...Object.keys(bindings), `${source.slice(start, end).replace('export ', '')}; return loadChatIdentity`)(...Object.values(bindings))
    return { load, state, calls, existing, expectedRef }
  }

  for (const savedId of [null, 99]) {
    it(`recovers the wallet identity when the saved ID is ${savedId}`, async () => {
      const h = identityHarness()
      const identity = await h.load('peer', { name: 'Synthetic name', chat_identity_id: savedId })
      assert.equal(identity, h.existing)
      assert(h.calls.some(call => call[0] === 'ref' && call[1] === h.expectedRef))
      assert.equal(h.calls.some(call => call[0] === 'create'), false)
      assert(h.calls.some(call => call[0] === 'encryption' && call[1] === true))
      assert.deepEqual(h.calls.find(call => call[0] === 'link'), ['link', 'peer', 12])
    })
  }

  it('keeps the saved identity without another lookup or profile update when it matches', async () => {
    const h = identityHarness()
    h.state.byId = h.existing
    await h.load('peer', { name: 'Synthetic name', chat_identity_id: 12 })
    assert.equal(h.calls.some(call => ['ref', 'create', 'link'].includes(call[0])), false)
  })

  it('does not attach a saved identity belonging to a different wallet', async () => {
    const h = identityHarness()
    h.state.byId = { id: 99, ref: 'another-wallet-ref' }
    const result = await h.load('peer', { name: 'Synthetic name', chat_identity_id: 99 })
    assert.equal(result, h.existing)
    assert.equal(h.calls.find(call => call[0] === 'set')[1], h.existing)
  })

  it('rejects a reference lookup returning a different wallet identity before updating keys', async () => {
    const h = identityHarness()
    h.state.byRef = { id: 99, ref: 'another-wallet-ref' }
    await assert.rejects(h.load('peer', { name: 'Synthetic name' }), /does not match/)
    assert.equal(h.calls.some(call => ['set', 'signer', 'encryption', 'link', 'commit'].includes(call[0])), false)
  })

  it('creates a new identity only when both lookups confirm it is missing', async () => {
    const h = identityHarness()
    h.state.byRef = null
    const identity = await h.load('peer', { name: 'Synthetic name' })
    assert.equal(identity.id, 13)
    assert.equal(h.calls.filter(call => call[0] === 'create').length, 1)
    assert.equal(h.calls.find(call => call[0] === 'create')[1].ref, h.expectedRef)
  })

  it('does not create an identity when the reference lookup fails', async () => {
    const h = identityHarness()
    h.state.lookupError = { response: { status: 503 } }
    await assert.rejects(h.load('peer', { name: 'Synthetic name' }), error => error === h.state.lookupError)
    assert.equal(h.calls.some(call => call[0] === 'create'), false)
  })

  it('recovers an identity created by a concurrent request', async () => {
    const h = identityHarness()
    let reads = 0
    h.state.byRef = () => ++reads === 1 ? null : h.existing
    h.state.create = async () => { throw { response: { status: 400, data: { ref: ['chat identity with this ref already exists.'] } } } }
    const identity = await h.load('peer', { name: 'Synthetic name' })
    assert.equal(identity, h.existing)
    assert.equal(h.calls.filter(call => call[0] === 'create').length, 1)
    assert.deepEqual(h.calls.filter(call => call[0] === 'encryption').map(call => call[1]), [true])
    assert.deepEqual(h.calls.find(call => call[0] === 'link'), ['link', 'peer', 12])
  })

  it('preserves unrelated validation failures instead of masking them as duplicate identities', async () => {
    const h = identityHarness()
    h.state.byRef = null
    const failure = { response: { status: 400, data: { signature: ['Invalid signature'] } } }
    h.state.create = async () => { throw failure }
    await assert.rejects(h.load('peer', { name: 'Synthetic name' }), error => error === failure)
    assert.equal(h.calls.some(call => ['link', 'commit'].includes(call[0])), false)
  })

  it('reuses the created identity if linking it to the profile fails on the first attempt', async () => {
    const h = identityHarness()
    h.state.byRef = null
    h.state.create = async () => { h.state.byRef = h.existing; return h.existing }
    h.state.link = async () => { throw { response: { status: 503 } } }
    await assert.rejects(h.load('peer', { name: 'Synthetic name' }))
    h.state.link = async () => {}
    assert.equal(await h.load('peer', { name: 'Synthetic name' }), h.existing)
    assert.equal(h.calls.filter(call => call[0] === 'create').length, 1)
  })

  for (const allowed of [true, false]) {
    it(`overlaps identity lookup with verification but only prepares keys if verified (${allowed})`, async () => {
      const h = identityHarness()
      let finish
      h.state.verify = () => new Promise((resolve, reject) => {
        finish = () => allowed ? resolve() : reject({ response: { status: 401 } })
      })
      const pending = h.load('peer', { name: 'Synthetic name' })
      await new Promise(resolve => setImmediate(resolve))
      assert(h.calls.some(call => call[0] === 'ref'))
      assert.equal(h.calls.some(call => ['signer', 'encryption', 'create', 'link', 'commit'].includes(call[0])), false)
      finish()
      if (allowed) assert.equal(await pending, h.existing)
      else await assert.rejects(pending, error => error.response.status === 401)
      assert.equal(h.calls.some(call => call[0] === 'signer'), allowed)
    })
  }

  it('shares pending identity preparation between the home page and chat screens', async () => {
    const h = identityHarness()
    let finish
    h.state.byRef = () => new Promise(resolve => { finish = resolve })
    const first = h.load('peer', { name: 'Synthetic name' })
    const second = h.load('peer', { name: 'Synthetic name' })
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(h.calls.filter(call => call[0] === 'ref').length, 1)
    finish(h.existing)
    assert.equal(await first, h.existing)
    assert.equal(await second, h.existing)
    assert.equal(h.calls.filter(call => call[0] === 'signer').length, 1)
    assert.equal(h.calls.filter(call => call[0] === 'commit').length, 1)
  })

  it('clears a failed shared preparation so chat can retry', async () => {
    const h = identityHarness()
    h.state.lookupError = { response: { status: 503 } }
    const results = await Promise.allSettled([
      h.load('peer', { name: 'Synthetic name' }), h.load('peer', { name: 'Synthetic name' })
    ])
    assert(results.every(result => result.status === 'rejected'))
    assert.equal(h.calls.filter(call => call[0] === 'ref').length, 1)
    h.state.lookupError = null
    assert.equal(await h.load('peer', { name: 'Synthetic name' }), h.existing)
    assert.equal(h.calls.filter(call => call[0] === 'ref').length, 2)
  })

  for (const change of ['walletHash', 'index', 'chipnet']) {
    it(`rejects identity preparation when ${change} changes during lookup`, async () => {
      const h = identityHarness()
      let finish
      h.state.byRef = () => new Promise(resolve => { finish = resolve })
      const pending = h.load('peer', { name: 'Synthetic name' })
      await new Promise(resolve => setImmediate(resolve))
      h.state[change] = change === 'walletHash' ? 'another-wallet' : change === 'index' ? 1 : true
      finish(h.existing)
      await assert.rejects(pending, { code: 'p2p_identity_mismatch' })
      assert.equal(h.calls.some(call => ['signer', 'encryption', 'link', 'commit'].includes(call[0])), false)
    })
  }

  it('does not share a pending peer initialization with an arbiter', async () => {
    const h = identityHarness()
    const results = await Promise.all([
      h.load('peer', { name: 'Synthetic name' }), h.load('arbiter', { name: 'Synthetic name' })
    ])
    assert(results.every(identity => identity === h.existing))
    assert.equal(h.calls.filter(call => call[0] === 'ref').length, 2)
    assert.deepEqual(h.calls.filter(call => call[0] === 'link').map(call => call[1]), ['peer', 'arbiter'])
  })

  for (const status of [404, 401, 403, 503]) {
    it(`treats only a 404 as a missing saved identity (HTTP ${status})`, async () => {
      const source = readFileSync('src/exchange/chat/index.js', 'utf8')
      const start = source.indexOf('export async function fetchChatIdentityById (')
      const end = source.indexOf('\nexport async function updateChatIdentity (', start)
      const error = { response: { status } }
      const chatBackend = { get: async () => { throw error } }
      const fetch = new Function('chatBackend', 'console', `${source.slice(start, end).replace('export ', '')}; return fetchChatIdentityById`)(chatBackend, { error () {} })
      if (status === 404) assert.equal(await fetch(99), null)
      else await assert.rejects(fetch(99), value => value === error)
    })
  }
})


describe('P2P background chat initialization', () => {
  function methods (path, names, bindings = {}) {
    const source = readFileSync(path, 'utf8')
    const body = names.map(name => {
      const start = Math.max(source.indexOf(`    ${name} (`), source.indexOf(`    async ${name} (`))
      const end = source.indexOf('\n    },', start) + 7
      return source.slice(start, end)
    }).join('\n')
    return new Function(...Object.keys(bindings), `return { ${body} }`)(...Object.values(bindings))
  }

  function harness () {
    const events = []
    const ownIdentity = { id: 12, ref: 'synthetic-identity-ref' }
    const ownMember = { chat_identity: ownIdentity, unread_count: 2 }
    const state = { wallet: 'synthetic-wallet', session: null, members: [], cached: true, beforeUpdate: null }
    const bindings = {
      wallet: { walletHash: 'synthetic-wallet' }, generateChatIdentityRef: () => ownIdentity.ref,
      loadChatIdentity: async () => { events.push('load-identity'); return ownIdentity },
      fetchChatSession: async () => {
        events.push('session')
        if (state.beforeSession) await state.beforeSession()
        return state.session
      },
      createChatSession: async () => {
        events.push('create-session')
        if (state.create) return state.create()
        state.session = { data: { ref: 'synthetic-chat' } }
        return 'synthetic-chat'
      },
      fetchChatMembers: async () => { events.push('chat-members'); return state.members },
      updateChatMembers: async (ref, members) => {
        events.push(['update-members', ref, members])
        if (state.beforeUpdate) await state.beforeUpdate()
        if (!state.omitMembership) state.members = [ownMember]
        return {}
      },
      updateOrderChatSessionRef: async (id, ref) => { events.push(['link-session', id, ref]) },
      backend: { get: async (url, config) => {
        events.push(['order-members', url, config])
        return { data: [{ chat_identity_id: 12 }, { chat_identity_id: null }, { chat_identity_id: 13 }] }
      } },
      WebSocketManager: class {
        subscribeToMessages () {}
        setWebSocketUrl (url) { this.url = url; events.push('socket') }
        closeConnection () { events.push('close-socket') }
      },
      getChatBackendWsUrl: () => 'wss://example.test/ws/', bus: { emit () {} }
    }
    const api = methods('src/pages/apps/exchange/peer_to_peer/order.vue', [
      'loadChatIdentity', 'chatSetupScope', 'initializeChat', 'createGroupChat',
      'ensureChatWebSocket', 'retryChat', 'onChatDisconnected'
    ], bindings)
    const vm = {
      order: { id: 24 }, chatRef: 'synthetic-chat', disposed: false, websockets: {},
      chatReadyScope: null, chatInitializing: false, chatInitialization: null, chatError: false,
      $store: { getters: {
        'global/getWallet': () => ({ walletHash: state.wallet }),
        'global/getWalletIndex': 0, 'global/isChipnet': false,
        'ramp/chatIdentity': () => state.cached ? ownIdentity : null,
        'ramp/getUser': { name: 'Synthetic name', chat_identity_id: 12, chatPreparation: Promise.resolve(true) }
      } }
    }
    for (const [name, method] of Object.entries(api)) vm[name] = method.bind(vm)
    vm.loadChatData = () => vm.initializeChat()
    return { vm, state, events, ownIdentity, ownMember }
  }

  it('navigates immediately after creating the order without initializing chat in the form', async () => {
    let finish
    const routes = []
    const api = methods('src/pages/apps/exchange/peer_to_peer/order-form.vue', ['createOrder'], {
      backend: { post: () => new Promise(resolve => { finish = resolve }) },
      fetchUser: () => { throw new Error('Must not load chat before navigation') },
      loadChatIdentity: () => { throw new Error('Must not load chat before navigation') }
    })
    const vm = {
      ad: { id: 5, trade_type: 'SELL' }, getTradeAmount: () => 10000,
      $emit () {}, $router: { push: route => routes.push(route) }, $refs: {},
      handleRequestError: error => { throw error }
    }
    const pending = api.createOrder.call(vm)
    await api.createOrder.call(vm)
    assert.equal(routes.length, 0)
    finish({ data: { order: { id: 24 } } })
    await pending
    assert.deepEqual(routes, [{ name: 'p2p-order', params: { order: 24 } }])
    assert.equal(vm.creatingOrder, false)
  })

  for (const chatEnabled of [false, true]) {
    it(`renders order details without chat setup when chat is ${chatEnabled ? 'enabled' : 'disabled'}`, async () => {
      let chatStarted = false
      let unreadRequested = false
      const api = methods('src/pages/apps/exchange/peer_to_peer/order.vue', ['loadData'])
      const vm = {
        order: { id: 24 }, chatRef: 'synthetic-chat', isChatEnabled: chatEnabled,
        fetchOrder: async () => {}, fetchAd: async () => {},
        fetchFeedback: async () => {}, fetchCounterpartyTradeStats () {}, fetchStatusList: async () => {},
        ensureChatCloseCountdownTimer () {},
        initializeChat: () => { chatStarted = true; return new Promise(() => {}) },
        fetchChatUnread: () => { unreadRequested = true; return new Promise(() => {}) }
      }
      await api.loadData.call(vm)
      assert.equal(vm.isloaded, true)
      assert.equal(vm.loadingData, false)
      assert.equal(chatStarted, false)
      assert.equal(unreadRequested, chatEnabled)
    })
  }

  it('waits for home-page chat preparation and then reuses its ready identity', async () => {
    const h = harness()
    let finish
    h.vm.$store.getters['ramp/getUser'].chatPreparation = new Promise(resolve => { finish = resolve })
    const pending = h.vm.loadChatIdentity()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(h.events.includes('load-identity'), false)
    assert.equal(h.vm.chatIdentity, undefined)
    finish(true)
    assert.equal(await pending, h.ownIdentity)
    assert.equal(h.events.includes('load-identity'), false)
  })

  it('prepares the signer when only a persisted chat identity is cached', async () => {
    const h = harness()
    h.vm.$store.getters['ramp/getUser'].chatPreparation = undefined
    assert.equal(await h.vm.loadChatIdentity(), h.ownIdentity)
    assert.deepEqual(h.events, ['load-identity'])
  })

  it('retries identity preparation when the home-page warmup failed', async () => {
    const h = harness()
    h.vm.$store.getters['ramp/getUser'].chatPreparation = Promise.resolve(false)
    assert.equal(await h.vm.loadChatIdentity(), h.ownIdentity)
    assert.deepEqual(h.events, ['load-identity'])
  })

  it('waits for session creation and confirmed membership before opening a socket', async () => {
    const h = harness()
    let finish
    h.state.beforeUpdate = () => new Promise(resolve => { finish = resolve })
    h.vm.ensureChatWebSocket()
    assert.equal(h.events.includes('socket'), false)
    const pending = h.vm.initializeChat()
    await new Promise(resolve => setImmediate(resolve))
    assert(h.events.includes('create-session'))
    assert.equal(h.events.includes('socket'), false)
    finish()
    assert.equal(await pending, true)
    assert.equal(h.events.filter(event => event === 'socket').length, 1)
    assert.equal(h.events.includes('load-identity'), false)
    assert.equal(h.vm.chatInitializing, false)
    const update = h.events.find(event => Array.isArray(event) && event[0] === 'update-members')
    assert.deepEqual(update[2].map(member => member.chat_identity_id), [12, 13])
    const orderMembers = h.events.find(event => Array.isArray(event) && event[0] === 'order-members')
    assert.equal(orderMembers[2].authorize, 'peer')
    assert.equal(h.vm.unreadChatCount, 2)
  })

  it('shares initialization between background work and opening the chat tab', async () => {
    const h = harness()
    let finish
    h.state.beforeSession = () => new Promise(resolve => { finish = resolve })
    const first = h.vm.initializeChat()
    const second = h.vm.initializeChat()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(h.events.filter(event => event === 'session').length, 1)
    finish()
    assert.equal(await first, true)
    assert.equal(await second, true)
    assert.equal(h.events.filter(event => event === 'create-session').length, 1)
  })

  it('reuses a ready session without repeating identity, session, or membership setup', async () => {
    const h = harness()
    h.state.session = { data: { ref: h.vm.chatRef } }
    h.state.members = [h.ownMember]
    h.vm.order.chat_session_ref = h.vm.chatRef
    assert.equal(await h.vm.initializeChat(), true)
    const count = h.events.length
    assert.equal(await h.vm.initializeChat(), true)
    assert.equal(h.events.length, count)
    assert.equal(h.events.includes('create-session'), false)
    assert.equal(h.events.some(event => Array.isArray(event) && event[0] === 'update-members'), false)
  })

  it('loads a missing identity before signing chat session requests', async () => {
    const h = harness()
    h.state.cached = false
    assert.equal(await h.vm.initializeChat(), true)
    assert.equal(h.events[0], 'load-identity')
    assert.equal(h.events[1], 'session')
  })

  it('keeps the order usable on chat failure and supports an explicit retry', async () => {
    const h = harness()
    h.state.create = async () => { throw { response: { status: 500 } } }
    assert.equal(await h.vm.initializeChat(), false)
    assert.equal(h.vm.chatError, true)
    assert.equal(h.vm.order.id, 24)
    assert.equal(h.vm.chatReadyScope, null)
    assert.equal(h.events.includes('socket'), false)
    h.state.create = null
    assert.equal(await h.vm.retryChat(), true)
    assert.equal(h.vm.chatError, false)
    assert.equal(h.events.filter(event => event === 'socket').length, 1)
  })

  it('does not open the socket if membership is still missing after the update', async () => {
    const h = harness()
    h.state.omitMembership = true
    assert.equal(await h.vm.initializeChat(), false)
    assert.equal(h.vm.chatError, true)
    assert.equal(h.events.includes('socket'), false)
  })

  it('recovers a session created by the other peer during initialization', async () => {
    const h = harness()
    h.state.create = async () => {
      h.state.session = { data: { ref: h.vm.chatRef } }
      throw { response: { status: 400, data: { ref: ['Session with this ref already exists.'] } } }
    }
    assert.equal(await h.vm.initializeChat(), true)
    assert.equal(h.events.filter(event => event === 'create-session').length, 1)
    assert.equal(h.events.filter(event => event === 'socket').length, 1)
  })

  for (const change of ['unmount', 'wallet', 'order', 'chat']) {
    it(`discards stale setup after ${change} changes`, async () => {
      const h = harness()
      let finish
      h.state.beforeSession = () => new Promise(resolve => { finish = resolve })
      const pending = h.vm.initializeChat()
      await new Promise(resolve => setImmediate(resolve))
      if (change === 'unmount') h.vm.disposed = true
      if (change === 'wallet') h.state.wallet = 'another-wallet'
      if (change === 'order') h.vm.order.id = 25
      if (change === 'chat') h.vm.chatRef = 'another-chat'
      finish()
      assert.equal(await pending, false)
      assert.equal(h.events.includes('create-session'), false)
      assert.equal(h.events.includes('socket'), false)
      assert.equal(h.vm.chatReadyScope, null)
    })
  }

  it('offers chat retry when its socket exhausts reconnection attempts', async () => {
    const h = harness()
    assert.equal(await h.vm.initializeChat(), true)
    const url = h.vm.websockets.chat.url
    h.vm.onChatDisconnected('wss://example.test/another-stream')
    assert.equal(h.vm.chatError, false)
    h.vm.onChatDisconnected(url)
    assert.equal(h.vm.chatError, true)
    assert.equal(h.vm.chatReadyScope, null)
    assert.equal(await h.vm.retryChat(), true)
    assert(h.events.includes('close-socket'))
    assert.equal(h.vm.chatError, false)
  })
})


describe('P2P chat public key registration reuse', () => {
  function harness (pubkeys = []) {
    const source = readFileSync('src/exchange/chat/index.js', 'utf8')
    const start = source.indexOf('export async function updateOrCreateKeypair (')
    const end = source.indexOf('\nexport function generateChatRef', start)
    const state = { scope: 'wallet-a-mainnet', device: 'synthetic-device', derive: null, deviceReads: 0 }
    const keypair = { privkey: 'synthetic-private-placeholder', pubkey: 'synthetic-public-key' }
    const uploads = []
    const bindings = {
      Store: { getters: { 'global/getWalletIndex': 0 } },
      chatIdentityScope: () => state.scope,
      getEncryptionKeypairFromMnemonic: async () => state.derive ? state.derive() : keypair,
      getDeviceId: async () => { state.deviceReads++; return state.device },
      updatePubkey: async key => { uploads.push(key) }
    }
    const update = new Function(...Object.keys(bindings), `${source.slice(start, end).replace('export ', '')}; return updateOrCreateKeypair`)(...Object.values(bindings))
    return { state, keypair, uploads, update: (enabled = true) => update(enabled, { pubkeys }) }
  }

  it('skips uploading an unchanged key registered for this device', async () => {
    const h = harness([{ pubkey: 'synthetic-public-key', deviceId: 'synthetic-device' }])
    assert.equal(await h.update(), h.keypair)
    assert.deepEqual(h.uploads, [])
  })

  for (const pubkeys of [[], [{ pubkey: 'old-public-key', deviceId: 'synthetic-device' }], [{ pubkey: 'synthetic-public-key', deviceId: 'another-device' }]]) {
    it(`registers the key when this device/key pair is missing: ${JSON.stringify(pubkeys)}`, async () => {
      const h = harness(pubkeys)
      assert.equal(await h.update(), h.keypair)
      assert.deepEqual(h.uploads, ['synthetic-public-key'])
    })
  }

  it('does not upload a key if the wallet changes during derivation', async () => {
    const h = harness()
    let finish
    h.state.derive = () => new Promise(resolve => { finish = resolve })
    const pending = h.update()
    h.state.scope = 'wallet-b-mainnet'
    finish(h.keypair)
    await assert.rejects(pending, { code: 'p2p_identity_mismatch' })
    assert.deepEqual(h.uploads, [])
  })

  it('keeps local-only derivation free of device lookups and uploads', async () => {
    const h = harness()
    assert.equal(await h.update(false), h.keypair)
    assert.equal(h.state.deviceReads, 0)
    assert.deepEqual(h.uploads, [])
  })
})


describe('CommerceHub chat WebSocket route', () => {
  function getBase (configuredUrl) {
    const source = readFileSync('src/exchange/chat/backend.js', 'utf8')
    const start = source.indexOf('export function getChatBackendWsUrl ()')
    const getter = new Function('process', `${source.slice(start).replace('export ', '')}; return getChatBackendWsUrl`)(
      { env: { MARKETPLACE_WS_URL: configuredUrl } }
    )
    return getter()
  }

  for (const base of [
    'wss://commercehub.paytaca.com',
    'wss://commercehub.paytaca.com/ws/',
    'wss://commercehub.paytaca.com/ws/chat/',
    'wss://commercehub.paytaca.com/ws/chat/sessions/'
  ]) {
    it(`uses the session route with configured base ${base}`, () => {
      assert.equal(`${getBase(base)}synthetic-session-ref/`, 'wss://commercehub.paytaca.com/ws/chat/sessions/synthetic-session-ref/')
    })
  }

  it('preserves a local host, port, and transport without duplicating the route', () => {
    assert.equal(getBase('ws://localhost:9000/ws/'), 'ws://localhost:9000/ws/chat/sessions/')
  })

  it('does not carry query strings or fragments into the session path', () => {
    assert.equal(getBase('wss://example.test/ws/?unused=1#old'), 'wss://example.test/ws/chat/sessions/')
  })

  it('preserves the empty value when no chat WebSocket endpoint is configured', () => {
    assert.equal(getBase(undefined), '')
  })
})


describe('P2P release and refund maintenance guards', () => {
  function financialHarness (role, method, response = { status: 200, data: { P2P_MAINTENANCE: false } }) {
    const file = role === 'seller' ? 'src/components/ramp/fiat/PaymentConfirmation.vue' : 'src/components/ramp/appeal/AppealDetail.vue'
    const source = readFileSync(file, 'utf8')
    const start = source.indexOf(`    async ${method} ()`)
    const end = source.indexOf('\n    },', start) + 7
    const events = []
    const state = { response, afterCheck: null }
    const escrow = {
      publicKeys: { [role]: 'synthetic-public-key' }, addresses: { [role]: 'synthetic-address' },
      getAddress: () => 'synthetic-contract',
      release: async () => { events.push('release'); return { success: false, reason: 'Synthetic result' } },
      refund: async () => { events.push('refund'); return { success: false, reason: 'Synthetic result' } }
    }
    const contract = { address: 'synthetic-contract', members: [{ member_type: role.toUpperCase(), address_path: '0/0' }] }
    const vm = {
      data: { escrow, contract }, escrowContract: escrow, contract,
      order: { id: 24, status: { value: role === 'seller' ? 'PD' : 'APL' }, trade_amount: 1000 },
      $t: (key, values, fallback) => fallback || key
    }
    const bindings = {
      wallet: {
        assertIdentity () {
          events.push('assert-wallet')
          if (state.walletChanged) throw new Error('The active P2P wallet changed.')
        },
        keypair () { events.push('keypair'); return {} },
        privkey () { events.push('privkey'); return 'synthetic-private-placeholder' }
      },
      assertP2PIdentity: async () => { events.push('identity'); return {} },
      fetchP2PAvailability, isP2PAvailabilityError, p2pAvailabilityMessage,
      backend: { get: async (url, config) => {
        events.push(['availability', url, config])
        state.afterCheck?.()
        if (state.response instanceof Error) throw state.response
        return state.response
      } }
    }
    const component = new Function(...Object.keys(bindings), `return { ${source.slice(start, end)} }`)(...Object.values(bindings))
    return { vm, state, events, run: () => component[method].call(vm) }
  }

  for (const [role, method] of [['seller', 'releaseBch'], ['arbiter', 'releaseBch'], ['arbiter', 'refundBch']]) {
    for (const [label, response] of [
      ['maintenance', { status: 200, data: { P2P_MAINTENANCE: true } }],
      ['missing controls', { status: 200, data: {} }],
      ['malformed controls', { status: 200, data: { P2P_MAINTENANCE: 'false' } }],
      ['cached controls', { status: 200, cached: true, data: { P2P_MAINTENANCE: false } }],
      ['server failure', { status: 503, data: {} }],
      ['network failure', new Error('Synthetic connection failure')]
    ]) {
      it(`blocks ${role} ${method} on ${label} before extracting keys`, async () => {
        const h = financialHarness(role, method, response)
        await h.run()
        assert.equal(h.events[0], 'identity')
        assert.equal(h.events[1][0], 'availability')
        assert.equal(h.events.some(event => ['keypair', 'privkey', 'release', 'refund'].includes(event)), false)
        const error = role === 'seller' ? h.vm.sendErrors[0] : h.vm.sendError
        assert.match(error, /maintenance|temporarily unavailable/)
        assert.equal(h.vm.showDragSlide, true)
        assert.equal(h.events.filter(event => Array.isArray(event) && event[0] === 'availability').length, 1)
        if (role === 'seller') assert.equal(h.vm.sendingBch, false)
      })
    }

    it(`allows ${role} ${method} with existing controls and no new release/refund flags`, async () => {
      const h = financialHarness(role, method)
      await h.run()
      assert.equal(h.events[0], 'identity')
      assert.equal(h.events[1][0], 'availability')
      assert.equal(h.events[1][2].cache, false)
      assert(h.events[1][2].params._fresh)
      assert.equal(h.events[2], 'assert-wallet')
      assert(h.events.includes(method === 'releaseBch' ? 'release' : 'refund'))
    })

    it(`rechecks the active wallet after maintenance verification for ${role} ${method}`, async () => {
      const h = financialHarness(role, method)
      h.state.afterCheck = () => { h.state.walletChanged = true }
      await h.run()
      assert.equal(h.events.some(event => ['keypair', 'privkey', 'release', 'refund'].includes(event)), false)
      assert.match(role === 'seller' ? h.vm.sendErrors[0] : h.vm.sendError, /wallet changed/)
    })

    for (const change of ['unmount', 'contract', 'order', 'amount', 'status', 'address']) {
      it(`blocks ${role} ${method} if ${change} changes while checking maintenance`, async () => {
        const h = financialHarness(role, method)
        h.state.afterCheck = () => {
          if (change === 'unmount') h.vm.disposed = true
          if (change === 'contract') {
            h.vm.escrowContract = { ...h.vm.escrowContract }
            h.vm.data.escrow = { ...h.vm.data.escrow }
          }
          if (change === 'order') h.vm.order = { ...h.vm.order, id: 25 }
          if (change === 'amount') h.vm.order.trade_amount++
          if (change === 'status') h.vm.order.status.value = 'RLS'
          if (change === 'address') h.vm.contract.address = 'another-contract'
        }
        await h.run()
        assert.equal(h.events.some(event => ['keypair', 'privkey', 'release', 'refund'].includes(event)), false)
        assert.match(role === 'seller' ? h.vm.sendErrors[0] : h.vm.sendError, /order details changed/)
      })
    }
  }

  it('leaves post-broadcast verification and pending updates outside feature-gated writes', () => {
    for (const url of ['/ramp-p2p/order/24/verify-release/', '/ramp-p2p/appeal/3/pending-release/', '/ramp-p2p/appeal/3/pending-refund/']) {
      assert.equal(p2pRequestFeature({ method: 'post', url }), null)
    }
  })
})


describe('P2P feature control refresh resilience', () => {
  function harness () {
    const source = readFileSync('src/store/ramp/actions.js', 'utf8')
    const start = source.indexOf('export async function fetchFeatureToggles (context)')
    const end = source.indexOf('\n}', start) + 2
    const state = { response: { status: 200, data: available } }
    const commits = []
    const context = {
      state: { featureToggles: { P2P_MAINTENANCE: false, ORDER_CREATE: true, AD_CREATE: true } },
      commit (name, controls) { commits.push([name, controls]); this.state.featureToggles = controls }
    }
    const backend = { get: async () => {
      if (state.response instanceof Error) throw state.response
      return state.response
    } }
    const refresh = new Function('backend', 'fetchP2PAvailability', `${source.slice(start, end).replace('export ', '')}; return fetchFeatureToggles`)(backend, fetchP2PAvailability)
    return { state, commits, context, refresh: () => refresh(context) }
  }

  it('preserves confirmed UI controls on a transient failure', async () => {
    const h = harness()
    const previous = h.context.state.featureToggles
    h.state.response = new Error('Synthetic network failure')
    assert.equal(await h.refresh(), previous)
    assert.equal(h.context.state.featureToggles, previous)
    assert.deepEqual(h.commits, [])
  })

  it('commits only freshly confirmed controls and applies an explicit disabled feature', async () => {
    const h = harness()
    h.state.response = { status: 200, data: { P2P_MAINTENANCE: false, ORDER_CREATE: false } }
    await h.refresh()
    assert.equal(h.context.state.featureToggles.ORDER_CREATE, false)
    assert.equal(h.commits.length, 1)
  })

  it('does not invent enabled controls when the initial refresh fails', async () => {
    const h = harness()
    h.context.state.featureToggles = null
    h.state.response = new Error('Synthetic network failure')
    assert.deepEqual(await h.refresh(), {})
    assert.equal(h.context.state.featureToggles, null)
    assert.deepEqual(h.commits, [])
  })
})
