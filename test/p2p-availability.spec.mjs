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
  const events = []
  const requests = []
  const backend = {
    async get (url, config) {
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
    $store: { getters: { 'darkmode/getStatus': false }, commit () {} },
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
    order: { id: 7, status: { value: 'CNF' } },
    arbiterOptions: [{}],
    dragSlideOn: true
  })
  return { vm, events, requests, setControls: value => { controls = value }, setFailure: value => { failure = value }, setIdentityFailure: value => { identityFailure = value } }
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
    const commits = []
    const timers = new Map()
    let timerId = 0
    const bindings = {
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
    return { vm, state, commits, timers, unmount: () => component.beforeUnmount.call(vm) }
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
})

function identityHarness () {
  const selected = { hash: 'synthetic-wallet', index: 0, chipnet: false }
  const Store = { getters: {
    'global/getWallet': () => ({ walletHash: selected.hash }),
    get 'global/getWalletIndex' () { return selected.index },
    get 'global/isChipnet' () { return selected.chipnet }
  } }
  const walletSource = readFileSync('src/exchange/wallet.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '')
  const RampWallet = new Function('Store', `${walletSource}; return RampWallet`)(Store)
  const wallet = new RampWallet(0, selected.hash, 0, false)
  wallet.wallet = { getPubkeyAt: () => 'synthetic-key', getAddressAt: () => 'synthetic-address' }
  const registered = { public_key: 'synthetic-key', address: 'synthetic-address', address_path: '0/0', wallet_hash: selected.hash, is_arbiter: false }
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
      config.headers = {}
      await interceptors.request(config)
      requests.push(config)
      await beforeResponse()
      if (failure) return interceptors.reject({ ...failure, config })
      return interceptors.response({ status: 200, data: { ...registered }, config })
    },
    get (url, config = {}) { return this.request({ ...config, method: 'get', url }) },
    patch (url, data, config) { return this.request({ ...config, method: 'patch', url, data }) }
  }
  const bindings = {
    axios: { create: () => client }, Store, wallet,
    Notify: { create: message => notifications.push(message) },
    bus: { emit: name => events.push(name) },
    requestManager: { attachTo () {} },
    getAuthToken: async role => `synthetic-${role}-token`,
    deleteAuthTokenForUserType: role => events.push(`delete-${role}`),
    fetchP2PAvailability: async () => {}, isP2PAvailabilityError: () => false,
    p2pRequestFeature
  }
  const backendSource = readFileSync('src/exchange/backend.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '')
  const api = new Function(...Object.keys(bindings), `${backendSource}; return { updateP2PProfile, assertP2PIdentity, updatePubkeyAndAddress }`)(...Object.values(bindings))
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
    assert(h.requests.every(request => request.method === 'get' && request.url === '/auth/' && request.cache === false))
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

  it('keeps identity fields and signature headers on initial peer registration', async () => {
    const source = readFileSync('src/components/ramp/fiat/RampLogin.vue', 'utf8')
    const method = source.slice(source.indexOf('    async registerUser ()'), source.indexOf('    handleError (error)'))
    const requests = []
    const wallet = {
      wallet: { getPrivateKeyWifAt: () => 'synthetic-secret-placeholder', getPubkeyAt: () => 'synthetic-key', getAddressAt: () => 'synthetic-address' },
      addressPath: () => '0/0', signMessage: () => 'synthetic-signature'
    }
    const backend = { post: async (...args) => { requests.push(args); return { data: {} } } }
    const component = new Function('wallet', 'backend', `return { ${method} }`)(wallet, backend)
    await component.registerUser.call({ usernickname: 'Synthetic name', $store: { commit () {} }, handleError: error => { throw error } })
    assert.equal(requests[0][0], '/ramp-p2p/peer/')
    assert.deepEqual(requests[0][1], { name: 'Synthetic name', address: 'synthetic-address', address_path: '0/0' })
    assert.equal(requests[0][2].headers['public-key'], 'synthetic-key')
    assert.equal(requests[0][2].headers.signature, 'synthetic-signature')
  })
})

describe('P2P identity checks at financial boundaries', () => {
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
        const wallet = { keypair () { events.push('keypair'); return {} }, privkey () { events.push('privkey'); return 'synthetic-secret-placeholder' } }
        const component = new Function('wallet', 'assertP2PIdentity', `return { ${source.slice(start, end)} }`)(wallet, h.assertP2PIdentity)
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
      backend: { get: async () => ({ data: { is_authenticated: state.authenticated } }) },
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
