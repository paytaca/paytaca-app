import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fetchP2PAvailability, assertP2PAvailable, isP2PAvailabilityError, p2pAvailabilityMessage, p2pRequestFeature } from '../src/exchange/availability.js'

const source = readFileSync(new URL('../src/components/ramp/fiat/EscrowTransfer.vue', import.meta.url), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'return')
const available = { P2P_MAINTENANCE: false, ORDER_ESCROW: true }

function harness (initial = available) {
  let controls = initial
  let failure = null
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
    wallet: { async getRawWallet () { events.push('wallet'); return rawWallet } },
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
  return { vm, events, requests, setControls: value => { controls = value }, setFailure: value => { failure = value } }
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
