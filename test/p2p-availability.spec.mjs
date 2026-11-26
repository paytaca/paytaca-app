import assert from 'node:assert/strict'
import axios from 'axios'
import { EventEmitter } from 'node:events'
import { markRaw, reactive } from 'vue'
import { readFileSync, readdirSync } from 'node:fs'
import { availabilityError, fetchP2PAvailability, assertP2PAvailable, isP2PAvailabilityError, p2pAvailabilityMessage, p2pRequestFeature } from '../src/exchange/availability.js'
import rampState from '../src/store/ramp/state.js'
import { dismissPaymentDetailsReminder } from '../src/store/ramp/mutations.js'
import { paymentDetailsReminder, getWalletStateByHash } from '../src/store/ramp/getters.js'

const source = readFileSync(new URL('../src/components/ramp/fiat/EscrowTransfer.vue', import.meta.url), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'return')
const available = { P2P_MAINTENANCE: false, ORDER_ESCROW: true }

describe('Order payment details reminder', () => {
  const source = readFileSync('src/pages/apps/exchange/peer_to_peer/order.vue', 'utf8')
  function method (name) {
    const start = Math.max(source.indexOf(`    ${name} (`), source.indexOf(`    async ${name} (`))
    const end = source.indexOf('\n    },', start) + 7
    return new Function(`return { ${source.slice(start, end)} }`)()[name]
  }
  function harness () {
    let state = rampState()
    const routes = []
    const vm = {
      order: {
        id: 7, created_at: '2026-11-24T03:00:00Z', status: { value: 'CNF' },
        ad: {
          owner: { id: 12 }, trade_type: 'BUY',
          created_at: '2026-11-24T03:00:00Z', ad_created_at: '2026-11-23T15:59:59.999Z'
        },
        members: { seller: { id: 12 }, buyer: { id: 13 } }
      },
      suppressPaymentDetailsReminder: false,
      $store: {
        getters: {
          'global/getWallet': () => ({ walletHash: 'test-wallet' }),
          'ramp/getUser': { id: 12 },
          'ramp/paymentDetailsReminder': accountId => paymentDetailsReminder(state)(accountId)
        },
        commit (name, payload) {
          assert.equal(name, 'ramp/dismissPaymentDetailsReminder')
          dismissPaymentDetailsReminder(state, payload)
        }
      },
      $router: { async push (route) { routes.push(route) } }
    }
    vm.dismissPaymentDetailsReminder = method('dismissPaymentDetailsReminder').bind(vm)
    return {
      vm, routes, required: () => method('paymentDetailsReminderRequired').call(vm),
      restart () { state = JSON.parse(JSON.stringify(state)) },
      dismissInWallet (walletHash, suppress) { dismissPaymentDetailsReminder(state, { walletHash, accountId: 12, orderId: 8, suppress }) },
      walletState: hash => getWalletStateByHash(state)(hash)
    }
  }

  function formMethod (name, bindings = {}) {
    const source = readFileSync('src/pages/apps/exchange/peer_to_peer/order-form.vue', 'utf8')
    const start = Math.max(source.indexOf(`    ${name} (`), source.indexOf(`    async ${name} (`))
    const end = source.indexOf('\n    },', start) + 7
    return new Function(...Object.keys(bindings), `return { ${source.slice(start, end)} }`)(...Object.values(bindings))[name]
  }

  function creationHarness () {
    const context = harness()
    const { vm } = context
    const createdOrder = vm.order
    const requests = []
    let failure = null
    Object.assign(vm, {
      order: null,
      ad: { id: 5, is_owned: false, trade_type: 'BUY', ad_created_at: '2026-11-23T15:59:59.999Z' },
      amount: 123, byFiat: true, state: 'initial',
      showPaymentDetailsReminder: false, showPaymentMethodsReview: false,
      paymentDetailsReminderAcknowledgedScope: null,
      paymentMethods: [{ id: 9 }],
      $refs: { addPaymentMethodsRef: { loadSubmitButton: false } },
      $emit () {},
      getTradeAmount: () => 10000,
      fetchAd: async () => vm.ad,
      isValidInputAmount: () => true,
      returnToQuote (message) { vm.lastMessage = message },
      handleRequestError (error) { vm.lastError = error },
      orderConfirm () { vm.orderConfirmationShown = true }
    })
    const backend = { async post (...args) {
      requests.push(args)
      if (failure) throw failure
      return { data: { order: createdOrder } }
    } }
    for (const name of ['paymentDetailsReminderScope', 'paymentDetailsReminderRequired']) {
      Object.defineProperty(vm, name, { get: () => formMethod(name).call(vm) })
    }
    for (const name of ['submit', 'continueAfterPaymentDetailsReminder', 'createOrder']) {
      vm[name] = formMethod(name, { backend, p2pQuoteKey: ad => JSON.stringify(ad), p2pErrorMessage: error => error.message }).bind(vm)
    }
    return { ...context, requests, setFailure (error) { failure = error } }
  }

  it('shows the reminder when a seller attempts to create an order for an older buy ad', () => {
    const { vm, requests } = creationHarness()
    vm.submit()
    assert.equal(vm.showPaymentDetailsReminder, true)
    assert.equal(vm.state, 'initial')
    assert.equal(requests.length, 0)
    vm.continueAfterPaymentDetailsReminder()
    assert.equal(vm.showPaymentDetailsReminder, false)
    assert.equal(vm.state, 'add-payment-method')
    assert.equal(requests.length, 0)
  })

  it('does not show a pre-creation reminder to buyers, ad owners, or sellers using newer ads', () => {
    for (const changes of [
      { trade_type: 'SELL' }, { is_owned: true },
      { ad_created_at: '2026-11-24T00:00:00+08:00' },
      { ad_created_at: '2026-11-25T00:00:00Z' }, { ad_created_at: undefined }
    ]) {
      const { vm } = creationHarness()
      Object.assign(vm.ad, changes)
      vm.submit()
      assert.equal(vm.showPaymentDetailsReminder, false, JSON.stringify(changes))
    }
  })

  it('opens editable payment settings without submitting or losing the order draft', () => {
    const { vm, requests } = creationHarness()
    vm.submit()
    vm.continueAfterPaymentDetailsReminder(true)
    assert.equal(vm.showPaymentMethodsReview, true)
    assert.equal(vm.showPaymentDetailsReminder, false)
    assert.equal(vm.amount, 123)
    assert.equal(vm.byFiat, true)
    assert.equal(vm.state, 'initial')
    assert.equal(requests.length, 0)
    vm.showPaymentMethodsReview = false
    vm.submit()
    assert.equal(vm.state, 'add-payment-method')
    assert.equal(vm.showPaymentDetailsReminder, false)
    const form = readFileSync('src/pages/apps/exchange/peer_to_peer/order-form.vue', 'utf8')
    assert.match(form, /<AddPaymentMethods type="Profile" embedded \/>/)
  })

  it('marks the created order as dismissed so opening it does not repeat the reminder', async () => {
    const { vm, requests, required, restart } = creationHarness()
    vm.submit()
    vm.continueAfterPaymentDetailsReminder()
    await vm.createOrder()
    assert.equal(requests.length, 1)
    assert.deepEqual(requests[0][1], { ad: 5, trade_amount: 10000, payment_methods: [9] })
    restart()
    assert.equal(required(), false)
    vm.order.id = 8
    assert.equal(required(), true)
  })

  it('persists a pre-creation opt-out without needing an order ID', () => {
    const { vm, restart, walletState } = creationHarness()
    vm.submit()
    vm.suppressPaymentDetailsReminder = true
    vm.continueAfterPaymentDetailsReminder()
    restart()
    assert.deepEqual(walletState('test-wallet').paymentDetailsReminderByAccount[12], {
      suppressed: true, dismissedOrderIds: {}
    })
    vm.paymentDetailsReminderAcknowledgedScope = null
    assert.equal(vm.paymentDetailsReminderRequired, false)
    vm.$store.getters['ramp/getUser'] = { id: 99 }
    assert.equal(vm.paymentDetailsReminderRequired, true)
  })

  it('blocks direct order creation until the seller acknowledges the reminder', async () => {
    const { vm, requests } = creationHarness()
    vm.$refs.addPaymentMethodsRef.loadSubmitButton = true
    await vm.createOrder()
    assert.equal(requests.length, 0)
    assert.equal(vm.showPaymentDetailsReminder, true)
    assert.equal(vm.$refs.addPaymentMethodsRef.loadSubmitButton, false)
  })

  it('does not record an order dismissal when creation fails', async () => {
    const { vm, walletState, setFailure } = creationHarness()
    const error = new Error('Order creation failed')
    setFailure(error)
    vm.submit()
    vm.continueAfterPaymentDetailsReminder()
    await vm.createOrder()
    assert.equal(vm.lastMessage, error.message)
    assert.equal(vm.creatingOrder, false)
    assert.equal(walletState('test-wallet').paymentDetailsReminderByAccount?.[12], undefined)
  })

  it('requires acknowledgment again after the account or ad changes', () => {
    const { vm } = creationHarness()
    vm.submit()
    vm.continueAfterPaymentDetailsReminder()
    assert.equal(vm.paymentDetailsReminderRequired, false)
    vm.ad.id = 6
    assert.equal(vm.paymentDetailsReminderRequired, true)
    vm.ad.id = 5
    vm.$store.getters['ramp/getUser'] = { id: 99 }
    assert.equal(vm.paymentDetailsReminderRequired, true)
  })

  it('uses the seller participant role regardless of ad ownership or label', () => {
    const { vm, required } = harness()
    for (const label of ['BUY', 'SELL']) {
      vm.order.ad.trade_type = label
      assert.equal(required(), true)
      vm.order.members.seller.id = 13
      assert.equal(required(), false)
      vm.order.members.seller.id = 12
    }
    vm.order.ad.owner.id = 13
    assert.equal(required(), true)
    vm.order.members.seller = null
    assert.equal(required(), false)
    vm.order = null
    assert.equal(required(), false)
  })

  it('includes sellers with no ads and excludes the buyer who owns the ad', () => {
    const { vm, required } = harness()
    vm.order.ad.owner.id = 13
    vm.order.ad.trade_type = 'BUY'
    vm.order.owner = { id: 12 }
    assert.equal(required(), true)
    vm.$store.getters['ramp/getUser'] = { id: 13 }
    assert.equal(required(), false)
  })

  it('uses the ad creation date with a strict Manila cutoff and rejects missing or invalid timestamps', () => {
    const { vm, required } = harness()
    assert.equal(required(), true)
    for (const timestamp of ['2026-11-23T16:00:00Z', '2026-11-24T00:00:00+08:00', '2026-11-25T00:00:00Z', null, undefined, 'invalid']) {
      vm.order.ad.ad_created_at = timestamp
      assert.equal(required(), false, String(timestamp))
    }
  })

  it('includes newer orders for older ads and excludes older orders for newer ads', () => {
    const { vm, required } = harness()
    assert.equal(required(), true)
    vm.order.created_at = '2026-11-23T15:59:59.999Z'
    vm.order.ad.ad_created_at = '2026-11-24T03:00:00Z'
    assert.equal(required(), false)
  })

  it('does not use the order ad snapshot timestamp as the original ad creation date', () => {
    const { vm, required } = harness()
    assert.equal(required(), true)
    delete vm.order.ad.ad_created_at
    vm.order.ad.created_at = '2026-11-23T15:59:59.999Z'
    assert.equal(required(), false)
  })

  it('only includes ongoing order statuses', () => {
    const { vm, required } = harness()
    for (const status of ['SBM', 'CNF', 'ESCRW_PN', 'ESCRW', 'PD_PN', 'PD', 'APL', 'RLS_PN', 'RFN_PN']) {
      vm.order.status.value = status
      assert.equal(required(), true, status)
    }
    for (const status of ['CNCL', 'RLS', 'RFN', 'unknown', null]) {
      vm.order.status.value = status
      assert.equal(required(), false, String(status))
    }
  })

  it('persists per-order dismissals through restart while leaving other orders eligible', () => {
    const { vm, required, restart } = harness()
    vm.dismissPaymentDetailsReminder()
    restart()
    assert.equal(required(), false)
    vm.order.id = 8
    assert.equal(required(), true)
    vm.dismissPaymentDetailsReminder()
    vm.order.id = 7
    assert.equal(required(), false)
  })

  it('isolates global opt-out by account and wallet', () => {
    const { vm, required, restart, walletState, dismissInWallet } = harness()
    vm.suppressPaymentDetailsReminder = true
    vm.dismissPaymentDetailsReminder()
    restart()
    vm.order.id = 8
    assert.equal(required(), false)
    assert.equal(paymentDetailsReminder({ byWallet: { 'test-wallet': walletState('test-wallet') } })(99).suppressed, undefined)
    assert.deepEqual(walletState('another-wallet'), {})
    vm.$store.getters['ramp/getUser'] = { id: 99 }
    vm.order.members.seller.id = 99
    assert.equal(required(), true)
    dismissInWallet('another-wallet', false)
    assert.deepEqual(walletState('another-wallet').paymentDetailsReminderByAccount[12], {
      suppressed: false, dismissedOrderIds: { 8: true }
    })
    dismissInWallet('test-wallet', false)
    assert.equal(walletState('test-wallet').paymentDetailsReminderByAccount[12].suppressed, true)
  })

  it('records the dismissal and opens payment settings with a return to the same order', async () => {
    const { vm, required, routes } = harness()
    await method('reviewPaymentMethods').call(vm)
    assert.equal(required(), false)
    assert.deepEqual(routes, [{ name: 'p2p-profile', query: { edit: 'payments', returnOrder: '7' } }])
    const payments = readFileSync('src/components/ramp/fiat/AddPaymentMethods.vue', 'utf8')
    assert.match(payments, /name: 'p2p-order', params: \{ order: \$route.query.returnOrder \}/)
    assert.match(source, /<div v-if="!paymentDetailsReminderRequired" class="component-wrapper">/)
    assert.match(source, /<q-dialog :model-value="paymentDetailsReminderRequired" persistent>/)
  })
})

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
    const state = { controls: { P2P_MAINTENANCE: true }, requests: 0, get: null, anonymousRequests: [], rawControls: { P2P_MAINTENANCE: true }, rawGet: null }
    const listeners = new Map()
    const document = { hidden: false, addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name) }
    const commits = []
    const emitted = []
    const timers = new Map()
    let timerId = 0
    const bindings = {
      document,
      backend: {
        async get (url, config) {
          if (config.authorize === false) {
            state.anonymousRequests.push({ url, config })
            return state.rawGet ? state.rawGet(url, config) : { status: 200, data: state.rawControls }
          }
          state.requests++
          if (state.get) return state.get(url, config)
          return { status: 200, data: state.controls }
        }
      },
      availabilityError, fetchP2PAvailability,
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
      ...component.data(), ready: true, userType: 'peer',
      $store: { getters: { 'global/getWallet': () => ({ walletHash: 'wallet-a' }) }, commit: (...args) => commits.push(args) },
      $emit: (...args) => emitted.push(args)
    }
    for (const [name, method] of Object.entries(component.methods)) vm[name] = method.bind(vm)
    return { vm, component, state, commits, emitted, timers, document, listeners, create: () => component.created.call(vm), unmount: () => component.beforeUnmount.call(vm) }
  }

  it('reads the global switch anonymously without blocking approved tester access', async () => {
    const h = screenHarness()
    h.state.controls = available
    await h.vm.retry()
    assert.equal(h.vm.confirmed, true)
    assert.equal(h.vm.maintenanceActive, true)
    assert.equal(h.state.anonymousRequests.length, 1)
    const { url, config } = h.state.anonymousRequests[0]
    assert.equal(url, '/ramp-p2p/feature-control/')
    assert.equal(config.authorize, false)
    assert.equal(config.p2pMaintenanceIndicator, true)
    assert.equal(config.cache, false)
    assert.equal(h.commits.at(-1)[1].P2P_MAINTENANCE, false)
    h.state.rawControls.P2P_MAINTENANCE = false
    await h.vm.retry()
    assert.equal(h.vm.maintenanceActive, false)
  })

  it('keeps tester access available when the banner check fails', async () => {
    const h = screenHarness()
    h.state.controls = available
    h.vm.maintenanceActive = true
    h.state.rawGet = async () => { throw new Error('Synthetic network failure') }
    await h.vm.retry()
    assert.equal(h.vm.confirmed, true)
    assert.equal(h.vm.error, null)
    assert.equal(h.vm.maintenanceActive, true)
  })

  it('keeps the confirmed maintenance banner after returning to the app if its refresh fails', async () => {
    const h = screenHarness()
    h.state.controls = available
    await h.vm.retry()
    assert.equal(h.vm.maintenanceActive, true)
    h.document.hidden = true
    h.vm.onVisibilityChange()
    assert.equal(h.vm.confirmed, false)
    assert.equal(h.vm.maintenanceActive, true)
    h.state.rawGet = async () => { throw { code: 'ERR_NETWORK' } }
    h.document.hidden = false
    h.vm.onVisibilityChange()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(h.vm.confirmed, true)
    assert.equal(h.vm.error, null)
    assert.equal(h.vm.maintenanceActive, true)
  })

  it('clears the retained banner when a fresh anonymous check confirms maintenance is off', async () => {
    const h = screenHarness()
    h.state.controls = available
    await h.vm.retry()
    h.vm.reset()
    assert.equal(h.vm.maintenanceActive, true)
    h.state.rawControls.P2P_MAINTENANCE = false
    await h.vm.retry()
    assert.equal(h.vm.maintenanceActive, false)
    assert.equal(h.vm.confirmed, true)
  })

  it('does not infer that maintenance is off from approved tester access alone', async () => {
    const h = screenHarness()
    h.state.controls = available
    h.state.rawGet = async () => { throw { code: 'ERR_NETWORK' } }
    await h.vm.retry()
    assert.equal(h.vm.confirmed, true)
    assert.equal(h.vm.maintenanceActive, null)
  })

  it('ignores stale, cached, and malformed anonymous maintenance responses', async () => {
    const h = screenHarness()
    let finish
    h.state.rawGet = () => new Promise(resolve => { finish = resolve })
    const pending = h.vm.refreshMaintenanceStatus(h.vm.requestEpoch)
    h.vm.reset()
    finish({ status: 200, data: { P2P_MAINTENANCE: true } })
    await pending
    assert.equal(h.vm.maintenanceActive, null)
    for (const response of [
      { status: 200, cached: true, data: { P2P_MAINTENANCE: true } },
      { status: 200, data: { P2P_MAINTENANCE: 'true' } },
      { status: 503, data: { P2P_MAINTENANCE: true } }
    ]) {
      h.state.rawGet = async () => response
      await h.vm.refreshMaintenanceStatus(h.vm.requestEpoch)
      assert.equal(h.vm.maintenanceActive, null)
    }
  })

  it('retries one transient polling failure without interrupting a confirmed page', async () => {
    const h = screenHarness()
    h.state.controls = available
    await h.vm.retry()
    const screenKey = h.vm.screenKey
    let attempts = 0
    h.state.get = async () => {
      if (++attempts === 1) throw { code: 'ECONNABORTED', message: 'timeout of 10000ms exceeded' }
      return { status: 200, data: available }
    }
    await h.vm.retry()
    assert.equal(attempts, 2)
    assert.equal(h.vm.confirmed, true)
    assert.equal(h.vm.error, null)
    assert.equal(h.vm.screenKey, screenKey)
  })

  it('does not retry a failed poll after its account context is reset', async () => {
    const h = screenHarness()
    h.state.controls = available
    await h.vm.retry()
    let attempts = 0
    h.state.get = async () => { attempts++; h.vm.reset(); throw { code: 'ERR_NETWORK' } }
    await h.vm.retry()
    assert.equal(attempts, 1)
    assert.equal(h.vm.confirmed, false)
    assert.equal(h.vm.error, null)
  })

  it('requires a successful initial availability check before showing P2P', async () => {
    const h = screenHarness()
    let attempts = 0
    h.state.get = async () => { attempts++; throw { code: 'ERR_NETWORK' } }
    await h.vm.retry()
    assert.equal(attempts, 1)
    assert.equal(h.vm.confirmed, false)
    assert.equal(h.vm.error.response.data.reason, 'connection')
  })

  it('blocks access when both attempts to recheck connectivity fail', async () => {
    const h = screenHarness()
    h.state.controls = available
    await h.vm.retry()
    let attempts = 0
    h.state.get = async () => { attempts++; throw { code: 'ERR_NETWORK' } }
    await h.vm.retry()
    assert.equal(attempts, 2)
    assert.equal(h.vm.confirmed, false)
    assert.equal(h.vm.error.response.data.reason, 'connection')
    assert.deepEqual(h.commits.at(-1), ['ramp/updateFeatureToggles', null])
  })

  it('does not treat confirmed maintenance as a transient network failure', async () => {
    const h = screenHarness()
    h.state.controls = available
    await h.vm.retry()
    let attempts = 0
    h.state.get = async () => { attempts++; return { status: 200, data: { P2P_MAINTENANCE: true } } }
    await h.vm.retry()
    assert.equal(attempts, 1)
    assert.equal(h.vm.confirmed, false)
    assert.equal(h.vm.error.response.data.code, 'p2p_maintenance')
  })

  it('requires manual Retry after repeated authentication failure without polling or visibility retries', async () => {
    const h = screenHarness()
    h.state.controls = available
    await h.vm.retry()
    h.vm.authenticationError = availabilityError()
    h.vm.ready = false
    h.component.watch.authenticationError.handler.call(h.vm)
    await h.vm.retry()
    h.vm.onVisibilityChange()
    h.vm.onRelogged()
    assert.equal(h.vm.confirmed, false)
    assert.equal(h.vm.checking, false)
    assert.equal(h.vm.error, h.vm.authenticationError)
    assert.equal(h.timers.size, 0)
    assert.equal(h.state.requests, 1)
    assert.deepEqual(h.emitted, [['available']])
    await h.vm.retry(true)
    assert.deepEqual(h.emitted, [['available'], ['authenticate']])
  })

  it('waits for authentication before requesting or opening trading UI', async () => {
    const h = screenHarness()
    h.vm.ready = false
    await h.vm.retry()
    assert.equal(h.state.requests, 0)
    assert.equal(h.vm.confirmed, false)
    h.vm.ready = true
    h.state.controls = available
    await h.vm.retry()
    assert.equal(h.vm.confirmed, true)
  })

  it('retries normal authentication when maintenance interrupted initialization', async () => {
    const h = screenHarness()
    h.vm.ready = false
    h.vm.onUnavailable(availabilityError('p2p_maintenance', 'P2P_MAINTENANCE'))
    await h.vm.retry()
    assert.deepEqual(h.emitted, [['authenticate']])
    assert.equal(h.state.requests, 0)
    assert.equal(h.vm.checking, false)
  })

  for (const role of ['peer', 'arbiter']) {
    it(`uses authenticated ${role} availability and preserves disabled features`, async () => {
      const h = screenHarness()
      h.vm.userType = role
      h.state.get = async (url, config) => {
        assert.equal(config.authorize, role)
        return { status: 200, data: { ...available, ORDER_CREATE: false } }
      }
      await h.vm.retry()
      assert.equal(h.vm.confirmed, true)
      assert.equal(h.commits.at(-1)[1].ORDER_CREATE, false)
      h.state.controls = { P2P_MAINTENANCE: true }
      h.state.get = null
      await h.vm.retry()
      assert.equal(h.vm.confirmed, false)
      assert.equal(h.vm.error.response.data.code, 'p2p_maintenance')
    })
  }

  it('rechecks approved access periodically without remounting healthy trading pages', async () => {
    const h = screenHarness()
    h.state.controls = available
    await h.vm.retry()
    const timer = [...h.timers.values()][0]
    assert.equal(timer.delay, 30000)
    await timer.callback()
    assert.equal(h.vm.screenKey, 1)
    h.state.controls = { P2P_MAINTENANCE: true }
    await [...h.timers.values()][0].callback()
    assert.equal(h.vm.confirmed, false)
    assert.equal(h.vm.error.response.data.code, 'p2p_maintenance')
    assert.equal(h.commits.at(-1)[1], null)
  })

  it('blocks immediately on a backend 503 and ignores an older successful check', async () => {
    const h = screenHarness()
    let finish
    h.state.get = () => new Promise(resolve => { finish = resolve })
    const pending = h.vm.retry()
    h.vm.onUnavailable(availabilityError('p2p_maintenance', 'P2P_MAINTENANCE'))
    finish({ status: 200, data: available })
    await pending
    assert.equal(h.vm.confirmed, false)
    assert.equal(h.vm.error.response.data.code, 'p2p_maintenance')
  })

  for (const change of ['wallet', 'account type', 'logout']) {
    it(`discards an in-flight approval after ${change}`, async () => {
      const h = screenHarness()
      let finish
      h.state.get = () => new Promise(resolve => { finish = resolve })
      const pending = h.vm.retry()
      if (change === 'logout') h.vm.onAuthCleared({ walletHash: 'wallet-a', userType: 'peer' })
      else h.vm.reset()
      if (change === 'account type') h.vm.userType = 'arbiter'
      finish({ status: 200, data: available })
      await pending
      assert.equal(h.vm.confirmed, false)
      assert.equal(h.vm.requestPending, false)
      assert(h.commits.every(([, controls]) => controls === null))
      assert.equal(h.emitted.length, 0)
    })
  }

  it('notifies the parent when maintenance clears so authentication can resume', async () => {
    const h = screenHarness()
    await h.vm.retry()
    assert.deepEqual(h.emitted, [])
    h.state.controls = available
    await h.vm.retry()
    assert.deepEqual(h.emitted, [['available']])
    assert.equal(h.vm.checking, false)
  })

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
    assert.equal(h.timers.size, h.vm.confirmed && !h.vm.disposed ? 1 : 0)
    assert.deepEqual(h.commits.at(-1), ['ramp/updateFeatureToggles', available])
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
    assert.equal(h.timers.size, h.vm.confirmed && !h.vm.disposed ? 1 : 0)
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
    assert.equal(h.timers.size, h.vm.confirmed && !h.vm.disposed ? 1 : 0)
    assert.deepEqual(h.commits.at(-1), ['ramp/updateFeatureToggles', available])
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
    assert(h.commits.every(([, controls]) => controls === null))
    h.unmount()
  })

  it('cleans up scheduled checks when leaving P2P', async () => {
    const h = screenHarness()
    await h.vm.retry()
    const timer = [...h.timers.values()][0]
    h.unmount()
    assert.equal(h.timers.size, h.vm.confirmed && !h.vm.disposed ? 1 : 0)
    await timer.callback()
    assert.equal(h.state.requests, 1)
    assert.equal(h.timers.size, h.vm.confirmed && !h.vm.disposed ? 1 : 0)
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
    assert(h.commits.every(([, controls]) => controls === null))
    assert.equal(h.vm.screenKey, 0)
    assert.equal(h.timers.size, h.vm.confirmed && !h.vm.disposed ? 1 : 0)
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
    assert.equal(h.timers.size, h.vm.confirmed && !h.vm.disposed ? 1 : 0)
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
    assert.equal(h.timers.size, h.vm.confirmed && !h.vm.disposed ? 1 : 0)
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
    assert.equal(h.timers.size, h.vm.confirmed && !h.vm.disposed ? 1 : 0)
  })

})

function identityHarness ({ removeToken = null, tokenForRole = role => `synthetic-${role}-token`, onAvailability = () => {}, storedUser = null, availabilityClassifier = () => false } = {}) {
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
    availabilityError, axios: { create: () => client }, Store, wallet,
    Notify: { create: message => notifications.push(message) },
    bus: { emit: name => events.push(name) },
    requestManager: { attachTo () {} },
    getAuthToken: async role => tokenForRole(role),
    deleteAuthTokenForUserType: role => { events.push(`delete-${role}`); return removeToken?.(role) },
    fetchP2PAvailability: async () => onAvailability(), isP2PAvailabilityError: availabilityClassifier,
    p2pRequestFeature
  }
  const backendSource = readFileSync('src/exchange/backend.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '')
  const api = new Function(...Object.keys(bindings), `${backendSource}; return { updateP2PProfile, assertP2PIdentity, updatePubkeyAndAddress, registerP2PAccount, getRegistrationRetrySeconds }`)(...Object.values(bindings))
  return { ...api, wallet, registered, selected, requests, events, notifications, client,
    fail: value => { failure = value }, beforeResponse: value => { beforeResponse = value } }
}

describe('P2P metadata authentication rejection', () => {
  for (const url of ['/ramp-p2p/currency/fiat', '/ramp-p2p/currency/crypto/', '/ramp-p2p/utils/market-price/', '/ramp-p2p/utils/calculate-fees/?sats_trade_amount=1000', '/ramp-p2p/user/']) {
    for (const status of [401, 403]) {
      it(`blocks ${url} on HTTP ${status} without deleting the P2P token or starting another login`, async () => {
        const h = identityHarness()
        h.fail({ response: { status, data: { detail: 'Invalid token.' } } })
        await assert.rejects(h.client.get(url, { authorize: 'peer' }), error => {
          assert.equal(error.code, 'p2p_metadata_auth_failed')
          assert.equal(error.response.status, 503)
          return true
        })
        assert.deepEqual(h.events, ['p2p-authentication-failed'])
        assert.equal(h.requests.length, 1)
      })
    }
  }

  it('still uses normal authentication when the local peer token is missing', async () => {
    const h = identityHarness({ tokenForRole: () => null })
    await assert.rejects(h.client.get('/ramp-p2p/currency/fiat', { authorize: 'peer' }), { code: 'p2p_auth_required' })
    assert.deepEqual(h.events, ['delete-peer', 'session-expired'])
    assert.equal(h.requests.length, 0)
  })
})

describe('P2P maintenance authentication headers', () => {
  for (const role of ['peer', 'arbiter']) {
    it(`checks approved ${role} access with its own token even when the other role is cached`, async () => {
      const h = identityHarness({ storedUser: { user_type: role === 'peer' ? 'arbiter' : 'peer' } })
      Object.assign(h.registered, available)
      await fetchP2PAvailability(h.client, 'ORDER_ESCROW', { userType: role })
      assert.equal(h.requests[0].headers.Authorization, `Token synthetic-${role}-token`)
      h.registered.P2P_MAINTENANCE = true
      await assert.rejects(fetchP2PAvailability(h.client, undefined, { userType: role }), error =>
        error.response.data.code === 'p2p_maintenance')
    })

    it(`expires a ${role} token through normal authentication without retrying availability`, async () => {
      const h = identityHarness()
      h.fail({ response: { status: 401, data: { detail: 'Invalid token' } } })
      await assert.rejects(fetchP2PAvailability(h.client, undefined, { userType: role }))
      assert.deepEqual(h.events, [`delete-${role}`, 'session-expired'])
      assert.equal(h.requests.length, 1)
    })
  }

  it('replaces an anonymous maintenance decision after normal token authentication', async () => {
    const h = identityHarness()
    Object.assign(h.registered, { P2P_MAINTENANCE: true })
    await assert.rejects(fetchP2PAvailability(h.client, undefined, { userType: false }))
    assert.equal(h.requests[0].headers.Authorization, undefined)
    Object.assign(h.registered, available)
    await fetchP2PAvailability(h.client, undefined, { userType: 'peer' })
    assert.equal(h.requests[1].headers.Authorization, 'Token synthetic-peer-token')
  })

  it('does not label an ordinary backend 503 as confirmed maintenance', async () => {
    const h = identityHarness()
    h.fail({ response: { status: 503, data: { detail: 'Service unavailable' } } })
    await assert.rejects(h.client.get('/ramp-p2p/order/7/', { authorize: 'peer' }), error =>
      error.response.data.code === 'p2p_availability_unverified')
    assert.equal(h.events.includes('session-expired'), false)
  })
})

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
        bus: { on () {} }, axios: { create: () => ({ interceptors: { request: { use () {} }, response: { use () {} } } }) },
        requestManager: { attachTo () {} },
        Store: { getters: { 'ramp/getUser': { is_arbiter: false }, 'global/getWallet': () => ({ walletHash: 'synthetic-wallet' }) } },
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
      bus: { on () {} }, axios: { create: () => ({ interceptors: { request: { use () {} }, response: { use () {} } } }) }, requestManager: { attachTo () {} },
      Store: { getters: { 'ramp/getUser': { is_arbiter: false }, 'global/getWallet': () => ({ walletHash: 'synthetic-wallet' }) } },
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


function strictChatHarness () {
  const state = { hash: 'wallet-a', index: 0, chipnet: false, role: 'peer', id: 1, signer: 'wallet-a:synthetic-key', failure: null }
  const requests = [], signatures = []
  const bus = new EventEmitter()
  const Store = { getters: {
    'global/getWallet': () => ({ walletHash: state.hash }),
    get 'global/getWalletIndex' () { return state.index },
    get 'global/isChipnet' () { return state.chipnet },
    get 'ramp/getUser' () { return { id: state.id, user_type: state.role, is_arbiter: state.role === 'arbiter', chatPreparation: state.chatPreparation } },
    'ramp/chatIdentity': () => state.chatIdentity
  } }
  const client = axios.create({ baseURL: 'https://commerce.example/api', adapter: async config => {
    requests.push(config)
    if (state.beforeResponse) await state.beforeResponse()
    if (state.failure) throw Object.assign(new Error('Synthetic HTTP failure'), { isAxiosError: true, config, response: { status: state.failure, data: {} } })
    const data = state.data ?? (config.url === 'ws-auth-token/' ? { token: `synthetic-ticket-${requests.length}`, expires_in: 60 } : [])
    return { status: state.status || 200, data, cached: state.cached, config }
  } })
  const bindings = {
    axios: { create: () => client }, requestManager: { attachTo () {} }, Store, bus,
    process: { env: { MARKETPLACE_WS_URL: 'wss://commerce.example/ws/' } },
    Date: { now: () => state.now ?? Date.now() },
    wallet: { walletHash: 'wallet-a', assertIdentity () {}, privkey: () => 'synthetic-key', addressPath: () => '0/0', pubkey: () => 'synthetic-public-key', signMessage: () => 'synthetic-signature', verifyMessage: () => true },
    assertP2PIdentity: async (member, role) => {
      state.requestedRole = role
      if (state.verify) await state.verify()
      return { chat_identity_id: state.linkedChatIdentityId }
    },
    SecureStoragePlugin: { get: async () => {
      if (state.storageRead) await state.storageRead()
      if (!state.signer) throw new Error('Missing synthetic signer')
      return { value: state.signer }
    }, set: async ({ value }) => { state.signer = value; return { value } } },
    getCurrentWalletStorageKey: () => 'synthetic-storage', getWalletStorageKey: () => 'synthetic-storage',
    generateChatIdentityRef: hash => `chat-${hash}`,
    signMessage: (key, payload) => { signatures.push({ key, payload }); return 'synthetic-signature' }
  }
  const source = readFileSync('src/exchange/chat/backend.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '')
  const api = new Function(...Object.keys(bindings), `${source}; return { chatBackend, getAuthenticatedChatWsUrl, updateSignerData }`)(...Object.values(bindings))
  return { ...api, state, requests, signatures, bus }
}

function chatReadMethod (name, client) {
  const source = readFileSync('src/exchange/chat/index.js', 'utf8')
  const start = source.indexOf(`export async function ${name} (`)
  const end = source.indexOf('\nexport ', start + 1)
  assert(start >= 0, name)
  return new Function('chatBackend', `${source.slice(start, end < 0 ? undefined : end).replace('export ', '')}; return ${name}`)(client)
}

describe('P2P strict chat HTTP authentication', () => {
  for (const [name, argument] of [['fetchChatIdentityById', 12], ['fetchChatIdentityByRef', 'chat-wallet-a'], ['fetchChatMembers', 'test-session'], ['fetchChatPubkeys', 'test-session'], ['fetchChatSession', 'test-session']]) {
    it(`signs ${name} with the active chat identity`, async () => {
      const h = strictChatHarness()
      if (name === 'fetchChatIdentityByRef') h.state.data = { results: [{ id: 12 }] }
      if (name === 'fetchChatMembers') h.state.data = { results: [] }
      await chatReadMethod(name, h.chatBackend)(argument)
      const request = h.requests[0]
      assert.match(request.headers['X-Chat-Identity'], /^chat-wallet-a:\d+:synthetic-signature$/)
      const timestamp = request.headers['X-Chat-Identity'].split(':')[1]
      assert.equal(Buffer.from(h.signatures[0].payload, 'hex').toString(), timestamp)
      assert.equal(request.cache, false)
      assert.equal(request.timeout, 10000)
    })
  }

  for (const status of [401, 403, 404]) {
    for (const name of ['fetchChatIdentityById', 'fetchChatSession', 'fetchChatPubkeys']) {
      it(`propagates ${name} HTTP ${status} without an empty or missing-object fallback`, async () => {
        const h = strictChatHarness()
        h.state.failure = status
        const original = console.error
        console.error = () => {}
        try {
          await assert.rejects(chatReadMethod(name, h.chatBackend)('test-session'), error => error.response.status === status)
        } finally { console.error = original }
        assert.equal(h.requests.length, 1)
      })
    }
  }

  it('prepares a missing local signer before the first authenticated identity read', async () => {
    const h = strictChatHarness()
    h.state.signer = null
    h.state.data = { id: 12, ref: 'chat-wallet-a' }
    await h.updateSignerData()
    const identity = await chatReadMethod('fetchChatIdentityById', h.chatBackend)(12)
    assert.equal(identity.id, 12)
    assert.equal(h.state.signer, 'wallet-a:synthetic-key')
    assert.match(h.requests[0].headers['X-Chat-Identity'], /^chat-wallet-a:/)
  })

  it('rejects missing signing material before dispatch instead of falling back to anonymous reads', async () => {
    const h = strictChatHarness()
    h.state.signer = null
    await assert.rejects(h.chatBackend.get('chat/sessions/test/', { forceSign: true }), /signer is unavailable/)
    assert.equal(h.requests.length, 0)
  })

  it('discards an HTTP result after logout even when the selected wallet stays the same', async () => {
    const h = strictChatHarness()
    h.state.beforeResponse = () => h.bus.emit('p2p-auth-cleared', { walletHash: 'wallet-a' })
    await assert.rejects(h.chatBackend.get('chat/sessions/test/', { forceSign: true }), { code: 'p2p_identity_mismatch' })
  })

  it('does not sign or send a request if the account changes while reading the signer', async () => {
    const h = strictChatHarness()
    h.state.storageRead = () => { h.state.role = 'arbiter' }
    await assert.rejects(h.chatBackend.get('chat/sessions/test/', { forceSign: true }), { code: 'p2p_identity_mismatch' })
    assert.equal(h.signatures.length + h.requests.length, 0)
  })

  it('preserves explicit multipart signing data', async () => {
    const h = strictChatHarness()
    await h.chatBackend.post('chat/messages/', { synthetic: 'attachment' }, { forceSign: true, signData: 'synthetic-hash' })
    const request = h.requests[0]
    assert.equal(request.headers['X-Chat-Identity-Signdata'], 'synthetic-hash')
    const timestamp = request.headers['X-Chat-Identity'].split(':')[1]
    assert.equal(Buffer.from(h.signatures[0].payload, 'hex').toString(), `synthetic-hash${timestamp}`)
  })

  it('does not sign requests to another origin', async () => {
    const h = strictChatHarness()
    await assert.rejects(h.chatBackend.get('https://other.example/chat/', { forceSign: true }), /Invalid P2P chat request URL/)
    assert.equal(h.signatures.length + h.requests.length, 0)
  })

  for (const change of ['hash', 'index', 'chipnet', 'role', 'id']) {
    it(`discards signed HTTP results after changing ${change}`, async () => {
      const h = strictChatHarness()
      h.state.beforeResponse = () => { h.state[change] = { hash: 'wallet-b', index: 1, chipnet: true, role: 'arbiter', id: 2 }[change] }
      await assert.rejects(h.chatBackend.get('chat/sessions/test/', { forceSign: true }), { code: 'p2p_identity_mismatch' })
    })
  }
})

describe('P2P one-time chat WebSocket tokens', () => {
  for (const role of ['peer', 'arbiter']) {
    it(`requests a fresh signed token per ${role} connection`, async () => {
      const h = strictChatHarness()
      h.state.role = role
      const base = 'wss://commerce.example/ws/chat/sessions/test/'
      const first = new URL(await h.getAuthenticatedChatWsUrl(base, role))
      const second = new URL(await h.getAuthenticatedChatWsUrl(base, role))
      assert.equal(first.searchParams.get('ws_auth_token'), 'synthetic-ticket-1')
      assert.equal(second.searchParams.get('ws_auth_token'), 'synthetic-ticket-2')
      assert.equal(h.state.requestedRole, role)
      assert(h.requests.every(request => request.url === 'ws-auth-token/' && request.method === 'post' && request.cache === false && request.timeout === 10000 && request.headers['X-Chat-Identity']))
    })
  }

  for (const data of [{}, { token: '', expires_in: 60 }, { token: 'ticket', expires_in: 0 }, { token: 'ticket', expires_in: '60' }]) {
    it(`rejects malformed token replies ${JSON.stringify(data)}`, async () => {
      const h = strictChatHarness()
      h.state.data = data
      await assert.rejects(h.getAuthenticatedChatWsUrl('wss://commerce.example/ws/chat/sessions/test/', 'peer'))
    })
  }

  for (const url of ['wss://other.example/ws/chat/sessions/test/', 'wss://commerce.example/ws/main/', 'wss://commerce.example/ws/chat/sessions/test/?token=old', 'wss://user:password@commerce.example/ws/chat/sessions/test/']) {
    it(`rejects an unexpected chat socket destination ${url}`, async () => {
      const h = strictChatHarness()
      await assert.rejects(h.getAuthenticatedChatWsUrl(url, 'peer'))
      assert.equal(h.requests.length, 0)
    })
  }

  it('allows a successfully recovered identity after login chat preparation failed', async () => {
    const h = strictChatHarness()
    h.state.chatPreparation = Promise.resolve(false)
    h.state.chatIdentity = { id: 12, ref: 'chat-wallet-a' }
    h.state.linkedChatIdentityId = 12
    const url = new URL(await h.getAuthenticatedChatWsUrl('wss://commerce.example/ws/chat/sessions/test/', 'peer'))
    assert.equal(url.searchParams.get('ws_auth_token'), 'synthetic-ticket-1')
    assert.equal(h.requests.length, 1)
    assert(h.requests[0].headers['X-Chat-Identity'])
  })

  for (const identity of [null, { id: 99, ref: 'chat-wallet-a' }, { id: 12, ref: 'chat-another-wallet' }]) {
    it(`still rejects a failed warmup without a matching recovered identity: ${JSON.stringify(identity)}`, async () => {
      const h = strictChatHarness()
      h.state.chatPreparation = Promise.resolve(false)
      h.state.chatIdentity = identity
      h.state.linkedChatIdentityId = 12
      await assert.rejects(h.getAuthenticatedChatWsUrl('wss://commerce.example/ws/chat/sessions/test/', 'peer'), /setup is unavailable/)
      assert.equal(h.requests.length, 0)
    })
  }

  it('rejects a recovered identity if its registered account link is absent', async () => {
    const h = strictChatHarness()
    h.state.chatPreparation = Promise.resolve(false)
    h.state.chatIdentity = { id: 12, ref: 'chat-wallet-a' }
    await assert.rejects(h.getAuthenticatedChatWsUrl('wss://commerce.example/ws/chat/sessions/test/', 'peer'), /setup is unavailable/)
    assert.equal(h.requests.length, 0)
  })

  it('rejects the wrong account type before requesting a token', async () => {
    const h = strictChatHarness()
    await assert.rejects(h.getAuthenticatedChatWsUrl('wss://commerce.example/ws/chat/sessions/test/', 'arbiter'), { code: 'p2p_identity_mismatch' })
    assert.equal(h.requests.length, 0)
  })

  it('rejects a ticket that expires before the token request finishes', async () => {
    const h = strictChatHarness()
    h.state.now = Date.now()
    h.state.beforeResponse = () => { h.state.now += 61000 }
    await assert.rejects(h.getAuthenticatedChatWsUrl('wss://commerce.example/ws/chat/sessions/test/', 'peer'))
  })

  it('rejects a cached token response', async () => {
    const h = strictChatHarness()
    h.state.cached = true
    await assert.rejects(h.getAuthenticatedChatWsUrl('wss://commerce.example/ws/chat/sessions/test/', 'peer'))
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
    const tickets = []
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
      getAuthenticatedChatWsUrl: async (url, role) => {
        tickets.push({ url, role })
        if (state.chatToken) return state.chatToken(url, role)
        return `${url}?ws_auth_token=synthetic-ticket-${tickets.length}`
      },
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
      manager, state, sockets, tickets, timers, intervals, bus, events, notifications, messages, flush,
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

  for (const role of ['peer', 'arbiter']) {
    it(`uses a new ticket on each ${role} chat reconnect and keeps the manager URL credential-free`, async () => {
      const h = socketHarness()
      h.state.userType = role
      const url = 'wss://commerce.example/ws/chat/sessions/test/'
      h.manager.setWebSocketUrl(url, { userType: role })
      await h.flush()
      assert.equal(h.tickets[0].role, role)
      assert.equal(h.sockets[0].url, `${url}?ws_auth_token=synthetic-ticket-1`)
      assert.equal(h.manager.url, url)
      h.sockets[0].open()
      h.sockets[0].reject(1006)
      await h.runTimer()
      assert.equal(h.sockets[1].url, `${url}?ws_auth_token=synthetic-ticket-2`)
      h.manager.closeConnection()
    })
  }

  for (const change of ['wallet', 'index', 'chipnet', 'userType', 'logout', 'close', 'url']) {
    it(`discards an in-flight chat ticket after ${change}`, async () => {
      const h = socketHarness()
      let finish
      h.state.chatToken = () => new Promise(resolve => { finish = resolve })
      h.manager.setWebSocketUrl('wss://commerce.example/ws/chat/sessions/test/')
      if (change === 'logout') h.bus.emit('p2p-auth-cleared', { walletHash: 'wallet-a', userType: 'peer' })
      else if (change === 'close') h.manager.closeConnection()
      else if (change === 'url') h.manager.setWebSocketUrl('wss://example.test/ws/ramp-p2p/subscribe/order/12/')
      else { h.state[change] = { wallet: 'wallet-b', index: 1, chipnet: true, userType: 'arbiter' }[change]; h.update() }
      finish('wss://commerce.example/ws/chat/sessions/test/?ws_auth_token=obsolete')
      await h.flush()
      assert(h.sockets.every(socket => !socket.url.includes('obsolete')))
      h.manager.closeConnection()
    })
  }

  for (const status of [401, 403, 404]) {
    it(`blocks chat token HTTP ${status} without anonymous fallback or P2P login loops`, async () => {
      const h = socketHarness()
      h.state.chatToken = async () => { throw { response: { status }, isAxiosError: true } }
      h.manager.setWebSocketUrl('wss://commerce.example/ws/chat/sessions/test/')
      await h.flush()
      assert.equal(h.sockets.length, 0)
      assert.equal(h.timers.size, 0)
      assert(h.events.includes('websocket-disconnected'))
      assert(!h.events.includes('session-expired'))
      h.manager.closeConnection()
    })
  }

  it('bounds token-endpoint retries and requests a new ticket for every attempt', async () => {
    const h = socketHarness()
    h.state.chatToken = async () => { throw { isAxiosError: true, response: { status: 503 } } }
    h.manager.setWebSocketUrl('wss://commerce.example/ws/chat/sessions/test/')
    await h.flush()
    for (let i = 0; i < h.manager.maxRetries; i++) await h.runTimer()
    assert.equal(h.tickets.length, 6)
    assert.equal(h.sockets.length, 0)
    assert.equal(h.timers.size, 0)
    assert(h.events.includes('websocket-disconnected'))
    h.manager.closeConnection()
  })

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
            assert.equal(config.timeout, 10000)
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
          assert.equal(config.timeout, 10000)
          events.push('otp')
          if (session.otpError) throw session.otpError
          return { data: { otp: 'synthetic-otp' } }
        },
        async post (url, body, config) {
          assert.equal(url, '/auth/login/peer')
          assert.equal(config.timeout, 10000)
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

  it('does not refresh Watchtower tokens for a Commerce Hub chat access denial', async () => {
    const h = authHarness({ failures: 0 })
    h.session.chat = async () => { throw { code: 'p2p_chat_access_denied', response: { status: 401 } } }
    const user = await h.loadAuthenticatedUser()
    assert.equal(await user.chatPreparation, false)
    assert.deepEqual(h.counts(), { logins: 0, chatRequests: 1 })
    assert(!h.events.some(event => Array.isArray(event) && event[0] === 'session-expired'))
    assert(h.events.some(event => Array.isArray(event) && event[0] === 'handle-request-error'))
  })

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
    const notifications = []
    const events = []
    const bindings = {
      P2PAvailability: {}, HeaderNav: {}, OngoingMaintenanceDialog: {}, RampLogin: {},
      getDarkModeClass () {}, availabilityError, isP2PAvailabilityError,
      loadRampWallet: async () => { state.calls.push('wallet'); return { walletHash: state.hash } },
      loadAuthenticatedUser: async () => { state.calls.push('auth'); return state.authenticate() },
      bus: { off () {}, emit: (...args) => events.push(args) }
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
      $q: { notify: notification => notifications.push(notification) },
      $t: (key, values, fallback) => fallback || key
    }
    Object.defineProperty(vm, 'walletIdentity', { get: () => view.computed.walletIdentity.call(vm) })
    Object.defineProperty(vm, 'availabilityIdentity', { get: () => view.computed.availabilityIdentity.call(vm) })
    for (const [name, method] of Object.entries(view.methods)) vm[name] = method.bind(vm)
    return { vm, view, state, commits, redirects, notifications, events }
  }

  it('blocks the first metadata authentication failure without cycling the homepage', async () => {
    const h = entryHarness('p2p-store')
    await h.vm.getUser()
    const failure = Object.assign(availabilityError(), { code: 'p2p_metadata_auth_failed' })
    h.vm.onAuthenticationFailed(failure)
    await h.vm.onSessionExpired()
    assert.equal(h.vm.authenticationError, failure)
    assert.equal(h.vm.isloaded, false)
    assert.equal(h.state.calls.filter(call => call === 'auth').length, 1)
    await h.vm.retryAuthentication()
    assert.equal(h.vm.authenticationError, null)
    assert.equal(h.vm.isloaded, true)
    assert.equal(h.state.calls.filter(call => call === 'auth').length, 2)
  })

  it('stops repeated peer session failures from logging in and remounting indefinitely', async () => {
    const h = entryHarness('p2p-store')
    await h.vm.getUser()
    await h.vm.onSessionExpired()
    assert.equal(h.vm.isloaded, true)
    assert.equal(h.state.calls.filter(call => call === 'auth').length, 2)
    await h.vm.onSessionExpired()
    assert.equal(h.vm.isloaded, false)
    assert.equal(h.vm.authenticationError.response.data.code, 'p2p_availability_unverified')
    await h.vm.onSessionExpired()
    await h.vm.onSessionExpired()
    assert.equal(h.state.calls.filter(call => call === 'auth').length, 2)
    await h.vm.retryAuthentication()
    assert.equal(h.vm.authenticationError, null)
    assert.equal(h.vm.isloaded, true)
    assert.equal(h.state.calls.filter(call => call === 'auth').length, 3)
  })

  it('waits for authentication before checking the mobile app version', async () => {
    const h = entryHarness()
    let finish
    h.state.authenticate = () => new Promise(resolve => { finish = resolve })
    h.vm.checkVersionUpdate = () => h.state.calls.push('version')
    const pending = h.view.mounted.call(h.vm)
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(h.state.calls, ['wallet', 'auth'])
    finish({ id: 'verified-peer', is_arbiter: false, user_type: 'peer' })
    await pending
    assert.deepEqual(h.state.calls, ['wallet', 'auth', 'version'])
  })

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

  it('keeps protected pages blocked and returns to the wallet on login failure', async () => {
    const h = entryHarness()
    h.state.authenticate = async () => { throw { response: { status: 401 } } }
    await h.vm.getUser()
    assert.equal(h.vm.isloaded, false)
    assert.equal(h.notifications[0].type, 'error')
    assert.deepEqual(h.redirects, ['/apps'])
    assert.equal(h.state.calls.filter(value => value === 'auth').length, 1)
    h.state.authenticate = async () => ({ is_arbiter: false })
    await h.vm.getUser()
    assert.equal(h.vm.isloaded, true)
    assert.equal(h.vm.authError, undefined)
  })

  for (const code of ['p2p_maintenance', 'p2p_availability_unverified']) {
    it(`delegates ${code} to the existing P2P popup without a login notification or redirect`, async () => {
      const h = entryHarness()
      const error = { response: { status: 503, data: { code } } }
      h.state.authenticate = async () => { throw error }
      await h.vm.getUser()
      assert.equal(h.vm.isloaded, false)
      assert.equal(h.vm.checking, false)
      assert.equal(h.notifications.length, 0)
      assert.equal(h.redirects.length, 0)
      assert.deepEqual(h.events, [['p2p-unavailable', error]])
    })
  }

  it('resumes arbiter login after the maintenance popup clears', async () => {
    const h = entryHarness('arbiter-appeals')
    h.state.authenticate = async () => { throw { response: { status: 503, data: { code: 'p2p_maintenance' } } } }
    await h.vm.getUser()
    assert.equal(h.vm.isloaded, false)
    assert.equal(h.vm.checking, false)
    assert.equal(h.notifications.length, 0)
    h.state.authenticate = async () => ({ id: 'synthetic-arbiter', is_arbiter: true })
    await h.vm.onP2PAvailable()
    assert.equal(h.vm.isloaded, true)
    assert.equal(h.state.calls.filter(value => value === 'auth').length, 2)
    assert.equal(h.redirects.length, 0)
  })

  it('does not restart login for an already loaded page or an open signup form', async () => {
    const h = entryHarness('arbiter-appeals')
    h.vm.isloaded = true
    await h.vm.onP2PAvailable()
    h.vm.isloaded = false
    h.vm.showRegistration = true
    await h.vm.onP2PAvailable()
    assert.deepEqual(h.state.calls, [])
  })

  it('does not duplicate an in-flight arbiter login on availability recovery', async () => {
    const h = entryHarness('arbiter-appeals')
    let finish
    h.state.authenticate = () => new Promise(resolve => { finish = resolve })
    const pending = h.vm.getUser()
    await new Promise(resolve => setImmediate(resolve))
    await h.vm.onP2PAvailable()
    assert.equal(h.state.calls.filter(value => value === 'auth').length, 1)
    finish({ id: 'synthetic-arbiter', is_arbiter: true })
    await pending
    assert.equal(h.vm.isloaded, true)
  })

  it('shows a notification and leaves the arbiter gate when authentication times out', async () => {
    const h = entryHarness('arbiter-appeals')
    h.state.authenticate = async () => { throw Object.assign(new Error('timeout of 10000ms exceeded'), { code: 'ECONNABORTED' }) }
    await h.vm.getUser()
    assert.equal(h.vm.checking, false)
    assert.equal(h.vm.isloaded, false)
    assert.equal(h.notifications.length, 1)
    assert.deepEqual(h.redirects, ['/apps'])
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
    assert.equal(h.vm.authError, undefined)
  })

  it('opens existing signup for an explicit missing-account response from the local server', async () => {
    const h = entryHarness()
    h.state.authenticate = async () => { throw { code: 'p2p_account_missing', response: { status: 400 } } }
    await h.vm.getUser()
    assert.equal(h.vm.showRegistration, true)
    assert.equal(h.vm.isloaded, false)
    assert.equal(h.vm.authError, undefined)
  })

  it('does not introduce registration on arbiter routes', async () => {
    const h = entryHarness('arbiter-appeals')
    h.state.authenticate = async () => { throw { response: { status: 404 } } }
    await h.vm.getUser()
    assert.equal(h.vm.showRegistration, false)
    assert.equal(h.notifications[0].type, 'error')
    assert.deepEqual(h.redirects, ['/apps'])
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

  it('exposes Retry when transaction discovery fails', async () => {
    const h = verificationHarness()
    h.vm.transactionId = ''
    h.vm.txidLoaded = false
    h.vm.$store = { getters: { 'ramp/getOrderTxid': () => null } }
    h.vm.data.escrow = { getUtxos: async () => { throw new Error('Transaction lookup unavailable') } }
    await h.vm.loadTransactionId()
    assert.equal(h.vm.txidLoaded, true)
    assert.equal(h.vm.showRetryBtn, true)
    assert.equal(h.vm.loading, false)
    assert.match(h.vm.errorMessage, /lookup unavailable/)
    assert.equal(h.calls.length, 0)
  })

  it('bounds an unresponsive transaction lookup and ignores its late result', async () => {
    const h = verificationHarness()
    h.vm.verificationTimeoutMs = 1
    h.vm.transactionId = ''
    h.vm.txidLoaded = false
    h.vm.$store = { getters: { 'ramp/getOrderTxid': () => null } }
    let finish
    h.vm.data.escrow = { getUtxos: () => new Promise(resolve => { finish = resolve }) }
    await h.vm.loadTransactionId()
    assert.equal(h.vm.showRetryBtn, true)
    assert.match(h.vm.errorMessage, /timed out/)
    finish([{ tx_hash: 'late-transaction' }])
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(h.vm.transactionId, null)
    assert.equal(h.events.includes('success'), false)
  })

  it('can retry discovery and verify without broadcasting any funds', async () => {
    const h = verificationHarness()
    h.vm.transactionId = ''
    h.vm.txidLoaded = false
    h.vm.$store = { getters: { 'ramp/getOrderTxid': () => null } }
    h.vm.data.escrow = { getUtxos: async () => [] }
    await h.vm.loadTransactionId()
    assert.equal(h.vm.showRetryBtn, true)
    assert.match(h.vm.errorMessage, /Transaction ID is not available/)
    h.vm.data.escrow.getUtxos = async () => [{ tx_hash: 'discovered-funding-txid' }]
    await h.vm.submitAction()
    assert.equal(h.vm.transactionId, 'discovered-funding-txid')
    assert(h.events.includes('success'))
    assert.deepEqual(h.calls.filter(call => call[0] === 'post').map(call => [call[1], call[2]]), [
      ['/ramp-p2p/order/24/verify-escrow/', { txid: 'discovered-funding-txid' }]
    ])
    assert.equal(h.vm.verifyingTx, false)
  })

  it('exposes Retry when no escrow instance or saved transaction ID is available', async () => {
    const h = verificationHarness()
    h.vm.transactionId = ''
    h.vm.$store = { getters: { 'ramp/getOrderTxid': () => null } }
    await h.vm.loadTransactionId()
    await h.vm.checkTransferStatus()
    assert.equal(h.vm.showRetryBtn, true)
    assert.equal(h.calls.length, 0)
  })

  it('stops timed-out verification requests after bounded retries and retains the reason', async () => {
    const h = verificationHarness()
    h.vm.verificationTimeoutMs = 1
    h.state.post = (url, body, config) => new Promise((resolve, reject) => {
      if (config.timeout) setTimeout(() => reject(new Error('Escrow verification request timed out')), config.timeout)
    })
    await h.vm.checkTransferStatus()
    assert.equal(h.calls.filter(call => call[0] === 'post').length, 4)
    assert.equal(h.vm.showRetryBtn, true)
    assert.equal(h.vm.verifyingTx, false)
    assert.equal(h.vm.loading, false)
    assert.match(h.vm.errorMessage, /timed out/)
  })

  it('uses bounded requests for verification and status polling', async () => {
    const h = verificationHarness()
    await h.vm.checkTransferStatus()
    assert(h.calls.every(call => call.at(-1).timeout === 10000))
    assert.equal(h.vm.verifyingTx, false)
    assert.equal(h.vm.loading, false)
  })

  it('does not restart completed verification when late contract metadata arrives', async () => {
    const h = verificationHarness()
    await h.vm.checkTransferStatus()
    await h.vm.checkTransferStatus()
    assert.equal(h.calls.filter(call => call[0] === 'post').length, 1)
    assert.equal(h.events.filter(event => event === 'success').length, 1)
    assert.equal(h.vm.verifyingTx, false)
  })

  it('does not start duplicate escrow verification requests', async () => {
    const h = verificationHarness()
    let finish
    h.state.post = () => new Promise(resolve => { finish = resolve })
    const pending = h.vm.verifyEscrow()
    await h.vm.verifyEscrow()
    assert.equal(h.calls.length, 1)
    finish({})
    await pending
    assert.equal(h.events.filter(event => event === 'success').length, 1)
  })

  it('makes missing-txid backend errors retryable immediately', async () => {
    const h = verificationHarness()
    h.state.post = async () => { throw { response: { status: 400, data: { error: 'txid is required' } } } }
    h.state.get = async () => ({ data: { status: { value: 'ESCRW_PN' } } })
    await h.vm.checkTransferStatus()
    assert.equal(h.vm.showRetryBtn, true)
    assert.equal(h.vm.verifyingTx, false)
    assert.equal(h.calls.filter(call => call[0] === 'post').length, 1)
  })

  it('stops verification on a backend validation rejection without accepting a late success', async () => {
    const h = verificationHarness()
    let finish
    h.state.get = () => new Promise(resolve => { finish = resolve })
    const pending = h.vm.checkTransferStatus()
    await new Promise(resolve => setImmediate(resolve))
    h.vm.handleVerificationFailure('ESCROW', 'Funding output does not match the expected amount including fees')
    assert.equal(h.vm.verifyingTx, false)
    assert.equal(h.vm.showRetryBtn, true)
    finish({ data: { status: { value: 'ESCRW' } } })
    await pending
    assert.equal(h.events.includes('success'), false)
    assert.match(h.vm.errorMessage, /Funding output/)
    assert.equal(h.calls.length, 2)
  })

  it('keeps an obsolete poll stopped when a manual retry has started', async () => {
    const h = verificationHarness()
    let finish
    h.state.get = () => new Promise(resolve => { finish = resolve })
    const oldAttempt = h.vm.checkTransferStatus()
    await new Promise(resolve => setImmediate(resolve))
    h.vm.handleVerificationFailure('ESCROW', 'Rejected funding')
    h.state.get = async () => ({ data: { status: { value: 'ESCRW' } } })
    await h.vm.submitAction()
    assert.equal(h.events.filter(event => event === 'success').length, 1)
    finish({ data: { status: { value: 'ESCRW_PN' } } })
    await oldAttempt
    assert.equal(h.events.filter(event => event === 'success').length, 1)
    assert.equal(h.vm.errorMessage, null)
  })

  it('does not apply a rejection for another verification action', () => {
    const h = verificationHarness()
    h.vm.verifyingTx = true
    h.vm.handleVerificationFailure('RELEASE', 'Unrelated release rejection')
    assert.equal(h.vm.verifyingTx, true)
    assert.equal(h.vm.verificationRejected, false)
  })

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
    const state = { get: async () => ({ status: 200, data: { valid: true, utxos: [{ value: 10570, block: null }] } }), electrumReads: 0 }
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
    assert.equal(h.calls[0][0], '/utxo/bch/synthetic-contract/')
    assert.equal(h.calls[0][1].authorize, false)
    assert.equal(h.calls[0][1].cache, false)
    assert(h.calls[0][1].params._fresh)
    assert.equal(h.state.electrumReads, 0)
  })

  it('preserves a genuine Watchtower zero without querying Electrum', async () => {
    const h = balanceHarness()
    h.state.get = async () => ({ status: 200, data: { valid: true, utxos: [] } })
    assert.equal(await h.contract.getBalance('', true), 0)
    assert.equal(h.state.electrumReads, 0)
  })

  it('propagates Watchtower failure instead of returning a false zero or using Electrum', async () => {
    const h = balanceHarness()
    h.state.get = async () => { throw new Error('Watchtower unavailable') }
    await assert.rejects(h.contract.getBalance('', true), /Watchtower unavailable/)
    assert.equal(h.state.electrumReads, 0)
  })

  for (const balance of [null, undefined, -1, 'invalid', 0.5, true, Number.MAX_SAFE_INTEGER + 1]) {
    it(`rejects an invalid Watchtower balance: ${balance}`, async () => {
      const h = balanceHarness()
      h.state.get = async () => ({ status: 200, data: { valid: true, utxos: [{ value: balance }] } })
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
    finish({ status: 200, data: { valid: true, utxos: [{ value: 10570, block: null }] } })
    assert.deepEqual(await Promise.all([first, second]), [0.0001057, 0.0001057])
  })

  it('includes confirmed and mempool outputs without a confirmation filter', async () => {
    const h = balanceHarness()
    h.state.get = async () => ({ status: 200, data: { valid: true, utxos: [
      { value: 10570, block: null }, { value: '6000', block: 950000 }
    ] } })
    assert.equal(await h.contract.getBalance('', true), 0.0001657)
    assert.equal(h.calls[0][1].params.confirmed, undefined)
    assert.equal(h.calls[0][1].timeout, 10000)
  })

  it('reads updated unspent outputs after funding and spending instead of a cached balance', async () => {
    const h = balanceHarness()
    let utxos = []
    h.state.get = async () => ({ status: 200, data: { valid: true, utxos } })
    assert.equal(await h.contract.getBalance('', true), 0)
    utxos = [{ value: 10570, block: null }]
    assert.equal(await h.contract.getBalance('', true), 0.0001057)
    utxos = []
    assert.equal(await h.contract.getBalance('', true), 0)
    assert.equal(h.calls.length, 3)
    assert(h.calls.every(([url]) => url.startsWith('/utxo/bch/')))
  })

  for (const data of [null, {}, { valid: false, utxos: [] }, { valid: true }, { valid: true, utxos: null }]) {
    it(`does not display a false zero for malformed UTXO responses: ${JSON.stringify(data)}`, async () => {
      const h = balanceHarness()
      h.state.get = async () => ({ status: 200, data })
      await assert.rejects(h.contract.getBalance('', true), /could not be read/)
    })
  }

  it('rejects a cached UTXO response', async () => {
    const h = balanceHarness()
    h.state.get = async () => ({ status: 200, cached: true, data: { valid: true, utxos: [] } })
    await assert.rejects(h.contract.getBalance('', true), /could not be read/)
  })

  it('rejects a satoshi total that cannot be represented safely', async () => {
    const h = balanceHarness()
    h.state.get = async () => ({ status: 200, data: { valid: true, utxos: [{ value: String(Number.MAX_SAFE_INTEGER) }, { value: 1 }] } })
    await assert.rejects(h.contract.getBalance('', true), /could not be read/)
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
    const backendSource = readFileSync('src/exchange/backend.js', 'utf8')
    const formatter = backendSource.slice(backendSource.indexOf('export function p2pErrorMessage'))
    const p2pErrorMessage = new Function(`${formatter.replace('export ', '')}; return p2pErrorMessage`)()
    const bindings = {
      backend, WebSocketManager, p2pErrorMessage,
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

  it('stops the verification spinner and forwards the backend rejection reason', async () => {
    const h = orderHarness()
    const failures = []
    Object.assign(h.vm, {
      state: 'tx-confirmation', userTraderType: 'SELLER', verifyAction: 'ESCROW', verifyingTx: true,
      $refs: { verifyTransactionRef: { handleVerificationFailure: (...args) => failures.push(args) } }
    })
    const error = 'Funding output does not match the expected amount including fees'
    await h.message({ success: false, action: 'ESCROW', error })
    assert.equal(h.vm.verifyingTx, false)
    assert.equal(h.vm.showNoticeDialog, true)
    assert.equal(h.vm.errorMessage, error)
    assert.deepEqual(failures, [['ESCROW', error]])
    assert.equal(h.calls.length, 0)
  })

  it('uses the saved session for background chat instead of a newly generated reference', async () => {
    const h = orderHarness()
    h.state.get = async () => ({ data: { ...h.order('ESCRW'), chat_session_ref: 'saved-chat-session' } })
    h.vm.isloaded = true
    h.vm.isChatEnabled = true
    const subscribed = []
    h.vm.initializeChat = async () => subscribed.push(h.vm.chatRef)
    await h.vm.fetchOrder()
    assert.equal(h.vm.chatRef, 'saved-chat-session')
    assert.deepEqual(subscribed, ['saved-chat-session'])
    assert.equal(h.vm.order.chat_session_ref, 'saved-chat-session')
  })

  it('starts the notification subscription when chat becomes available on an already-visible order', async () => {
    const h = orderHarness()
    let starts = 0
    h.vm.isloaded = true
    h.vm.isChatEnabled = true
    h.vm.initializeChat = () => { starts++; return new Promise(() => {}) }
    h.state.status = 'ESCRW'
    await h.vm.fetchOrder('websocket')
    assert.equal(starts, 1)
    assert.equal(h.vm.order.status.value, 'ESCRW')
  })

  for (const [action, status] of [['RELEASE', 'RLS'], ['REFUND', 'RFN']]) {
    it(`refreshes the subscribed order after an appeal ${action} notification`, async () => {
      const h = orderHarness()
      assert(h.sockets[0].url.endsWith('/order/24/'))
      h.state.status = status
      await h.message({ success: true, action })
      assert.equal(h.calls.at(-1).url, '/ramp-p2p/order/24/')
      assert.equal(h.vm.order.id, 24)
      assert.equal(h.vm.order.status.value, status)
    })
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
    const load = method('src/pages/apps/exchange/peer_to_peer/order.vue', 'loadChatData', {
      fetchChatMembers: async () => [], fetchChatPubkeys: async () => [],
      fetchChatMessages: async () => ({ results: [] })
    })
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


describe('P2P verified existing chat links', () => {
  function harness () {
    const source = readFileSync('src/exchange/chat/index.js', 'utf8')
    const start = source.indexOf('const pendingChatIdentities = new Map()')
    const end = source.indexOf('\nexport function updateOrderChatSessionRef', start)
    const calls = []
    const identity = { id: 12, ref: 'synthetic-ref' }
    const state = { linkedId: 12, identity, walletHash: 'synthetic-wallet', failure: null }
    const bindings = {
      wallet: { walletHash: 'synthetic-wallet' },
      loadRampWallet: async () => { throw new Error('Unexpected wallet load') },
      assertP2PIdentity: async () => {
        calls.push('profile')
        if (state.verify) await state.verify()
        if (state.failure) throw state.failure
        return { chat_identity_id: state.linkedId }
      },
      generateChatIdentityRef: () => 'synthetic-ref',
      fetchChatIdentityById: async id => {
        calls.push(['get', id])
        if (state.lookup) await state.lookup()
        return state.identity
      },
      chatIdentityManager: {
        setIdentity: value => { calls.push(['set', value]); return value },
        _updateSignerData: async () => { calls.push('signer') },
        _updateEncryptionKeypair: async () => {
          calls.push('encryption')
          if (state.keyError) throw state.keyError
        },
        create: async () => { throw new Error('Must not create an unlinked identity') }
      },
      updateChatIdentityId: async () => { throw new Error('Must not PATCH chat links') },
      Store: {
        getters: {
          'global/getWallet': () => ({ walletHash: state.walletHash }),
          'global/getWalletIndex': 0, 'global/isChipnet': false
        },
        commit: (...args) => calls.push(['commit', ...args])
      }
    }
    const load = new Function(...Object.keys(bindings), `${source.slice(start, end).replace('export ', '')}; return loadChatIdentity`)(...Object.values(bindings))
    return { load: (params = {}) => load('peer', { name: 'Synthetic name', chat_identity_id: 12, ...params }), state, calls, identity }
  }

  it('loads the authenticated profile link without PATCHing or creating identities', async () => {
    const h = harness()
    assert.equal(await h.load(), h.identity)
    assert.deepEqual(h.calls.slice(0, 3), ['profile', 'signer', ['get', 12]])
    assert.equal(h.calls.filter(call => call[0] === 'commit').length, 1)
  })

  it('uses the fresh profile link instead of a stale cached ID', async () => {
    const h = harness()
    assert.equal(await h.load({ chat_identity_id: 99 }), h.identity)
    assert.deepEqual(h.calls[2], ['get', 12])
  })

  for (const identity of [null, { id: 99, ref: 'synthetic-ref' }, { id: 12, ref: 'another-wallet' }]) {
    it(`blocks missing or mismatched linked identities: ${JSON.stringify(identity)}`, async () => {
      const h = harness()
      h.state.identity = identity
      await assert.rejects(h.load(), { code: 'p2p_chat_link_unavailable' })
      assert.equal(h.calls.includes('signer'), true)
      assert.equal(h.calls.some(call => call[0] === 'set' || call[0] === 'commit'), false)
    })
  }

  it('blocks an unlinked profile on repeated retries without creating or caching identities', async () => {
    const h = harness()
    h.state.linkedId = null
    for (let i = 0; i < 2; i++) await assert.rejects(h.load(), /Chat setup is temporarily unavailable/)
    assert.deepEqual(h.calls, ['profile', 'profile'])
  })

  for (const status of [400, 401, 503]) {
    it(`propagates profile verification failures (HTTP ${status}) without exposing an identity`, async () => {
      const h = harness()
      h.state.failure = { response: { status, data: { chat_identity_id: ['Verified linking is required.'] } } }
      await assert.rejects(h.load(), error => error === h.state.failure)
      assert.deepEqual(h.calls, ['profile'])
    })
  }

  it('does not cache an identity when key preparation fails and allows a clean retry', async () => {
    const h = harness()
    h.state.keyError = new Error('Synthetic key update failure')
    await assert.rejects(h.load(), error => error === h.state.keyError)
    assert.deepEqual(h.calls.at(-1), ['set', null])
    assert.equal(h.calls.some(call => call[0] === 'commit'), false)
    h.state.keyError = null
    assert.equal(await h.load(), h.identity)
  })

  it('shares concurrent preparation and commits only once', async () => {
    const h = harness()
    let finish
    h.state.lookup = () => new Promise(resolve => { finish = resolve })
    const pending = [h.load(), h.load()]
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(h.calls.filter(call => call[0] === 'get').length, 1)
    finish()
    assert.deepEqual(await Promise.all(pending), [h.identity, h.identity])
    assert.equal(h.calls.filter(call => call[0] === 'commit').length, 1)
  })

  it('blocks a wallet switch during profile verification', async () => {
    const h = harness()
    h.state.verify = async () => { h.state.walletHash = 'another-wallet' }
    await assert.rejects(h.load(), { code: 'p2p_identity_mismatch' })
    assert.deepEqual(h.calls, ['profile'])
  })
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
      fetchChatMembers: async ref => {
        events.push('chat-members')
        if (state.membersRequest) state.membersRequest(ref)
        return state.members
      },
      fetchChatPubkeys: async () => [],
      fetchChatMessages: async () => ({ results: [], count: 0 }),
      updateChatMembers: async (ref, members) => {
        events.push(['update-members', ref, members])
        if (state.beforeUpdate) await state.beforeUpdate()
        if (!state.omitMembership) state.members = [ownMember]
        return {}
      },
      updateOrderChatSessionRef: async (id, ref) => { events.push(['link-session', id, ref]) },
      backend: { get: async (url, config) => {
        events.push(['order-members', url, config])
        return { data: state.orderMembers || [{ chat_identity_id: 12 }, { chat_identity_id: null }, { chat_identity_id: 13 }] }
      } },
      WebSocketManager: class {
        subscribeToMessages (callback) { this.message = callback }
        setWebSocketUrl (url) { this.url = url; events.push('socket') }
        closeConnection () { events.push('close-socket') }
      },
      getChatBackendWsUrl: () => 'wss://example.test/ws/',
      bus: { emit (name, data) { if (name === 'new-message') return vm.onNewMessage(data) } }
    }
    const api = methods('src/pages/apps/exchange/peer_to_peer/order.vue', [
      'loadChatIdentity', 'chatSetupScope', 'initializeChat', 'createGroupChat',
      'ensureChatWebSocket', 'retryChat', 'onChatDisconnected', 'onNewMessage', 'fetchChatUnread'
    ], bindings)
    const vm = {
      order: { id: 24, chat_session_ref: 'synthetic-chat' }, chatRef: 'synthetic-chat', disposed: false, websockets: {},
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

  it('subscribes on Details and refreshes unread messages before Chat is opened', async () => {
    const h = harness()
    h.vm.activeTab = 'details'
    h.vm.chatLoaded = false
    h.state.session = { data: { ref: h.vm.chatRef } }
    h.state.members = [h.ownMember]
    const requests = []
    h.state.membersRequest = ref => requests.push(ref)
    assert.equal(await h.vm.initializeChat(), true)
    assert.equal(h.events.includes('socket'), true)
    assert.equal(h.vm.chatLoaded, false)
    h.ownMember.unread_count = 3
    h.vm.websockets.chat.message({ type: 'new_message', data: { id: 99, chat_identity: { ref: 'other-party' } } })
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(h.vm.unreadChatCount, 3)
    assert.equal(h.vm.hasUnread, true)
    assert.equal(h.vm.chatLoaded, false)
    assert.deepEqual(requests, [h.vm.order.chat_session_ref, h.vm.order.chat_session_ref])
    assert.equal(h.events.includes('create-session'), false)
  })

  it('creates an unlinked order chat before attempting to fetch a nonexistent session', async () => {
    const h = harness()
    h.vm.order.chat_session_ref = null
    h.state.beforeSession = async () => { throw { response: { status: 404 } } }
    assert.equal(await h.vm.initializeChat(), true)
    assert.equal(h.events.includes('session'), false)
    assert.equal(h.events.filter(event => event === 'create-session').length, 1)
    assert.equal(h.vm.order.chat_session_ref, h.vm.chatRef)
    const memberCheck = h.events.findIndex(event => Array.isArray(event) && event[0] === 'order-members')
    assert(memberCheck < h.events.indexOf('create-session'))
    assert.equal(h.events.includes('socket'), true)
  })

  it('does not create an unlinked chat for an identity outside the verified order members', async () => {
    const h = harness()
    h.vm.order.chat_session_ref = null
    h.state.orderMembers = [{ chat_identity_id: 99 }]
    assert.equal(await h.vm.initializeChat(), false)
    assert.equal(h.events.includes('create-session'), false)
    assert.equal(h.events.includes('socket'), false)
  })

  it('recovers an unlinked chat created concurrently by the other peer', async () => {
    const h = harness()
    h.vm.order.chat_session_ref = null
    h.state.create = async () => {
      h.state.session = { data: { ref: h.vm.chatRef } }
      throw { response: { status: 400, data: { ref: ['Session with this ref already exists.'] } } }
    }
    assert.equal(await h.vm.initializeChat(), true)
    assert(h.events.indexOf('create-session') < h.events.indexOf('session'))
    assert.equal(h.vm.order.chat_session_ref, h.vm.chatRef)
  })

  for (const status of [401, 403, 404]) {
    it(`blocks peer chat on a denied session HTTP ${status} without attempting replacement or membership writes`, async () => {
      const h = harness()
      h.state.beforeSession = async () => { throw { code: 'p2p_chat_access_denied', response: { status } } }
      assert.equal(await h.vm.initializeChat(), false)
      assert.equal(h.vm.chatError, true)
      assert.equal(h.events.includes('create-session'), false)
      assert.equal(h.events.includes('update-members'), false)
      assert.equal(h.events.includes('socket'), false)
    })
  }

  it('navigates immediately after creating the order without initializing chat in the form', async () => {
    let finish
    const routes = []
    const api = methods('src/pages/apps/exchange/peer_to_peer/order-form.vue', ['createOrder'], {
      backend: { post: () => new Promise(resolve => { finish = resolve }) },
      p2pQuoteKey: ad => JSON.stringify(ad), p2pErrorMessage: error => error.message,
      fetchUser: () => { throw new Error('Must not load chat before navigation') },
      loadChatIdentity: () => { throw new Error('Must not load chat before navigation') }
    })
    const vm = {
      ad: { id: 5, trade_type: 'SELL' }, getTradeAmount: () => 10000,
      fetchAd: async () => vm.ad, isValidInputAmount: () => true,
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
    it(`renders order details without awaiting the notification subscription when chat is ${chatEnabled ? 'enabled' : 'disabled'}`, async () => {
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
      assert.equal(chatStarted, chatEnabled)
      assert.equal(unreadRequested, false)
    })
  }

  it('updates the unread badge on Details without loading keys or decrypting messages', async () => {
    const calls = []
    const api = methods('src/pages/apps/exchange/peer_to_peer/order.vue', ['onNewMessage', 'fetchChatUnread'], {
      fetchChatMembers: async ref => {
        calls.push(ref)
        return [{ chat_identity: { id: '12' }, unread_count: 3 }]
      }
    })
    const vm = {
      chatRef: 'synthetic-chat', activeTab: 'details', chatLoaded: false,
      chatIdentity: { id: 12 }, unreadChatCount: 0, hasUnread: false,
      $store: { getters: { 'ramp/getUser': { chat_identity_id: null } } },
      loadKeyPair () { throw new Error('Must not derive keys for an unread notification') },
      loadChatIdentity () { throw new Error('Chat identity is already prepared') },
      decryptMessage () { throw new Error('Must not decrypt messages before opening Chat') }
    }
    vm.fetchChatUnread = api.fetchChatUnread.bind(vm)
    await api.onNewMessage.call(vm, { id: 7, encrypted: true })
    assert.deepEqual(calls, ['synthetic-chat'])
    assert.equal(vm.unreadChatCount, 3)
    assert.equal(vm.hasUnread, true)
    assert.equal(vm.chatLoaded, false)
    vm.disposed = true
    await api.onNewMessage.call(vm, { id: 8, encrypted: true })
    assert.equal(calls.length, 1)
  })

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

  it('shows the blocked-link message and stops before session or socket initialization', async () => {
    const h = harness()
    h.vm.loadChatIdentity = async () => {
      throw Object.assign(new Error('Chat setup is temporarily unavailable.'), { code: 'p2p_chat_link_unavailable' })
    }
    assert.equal(await h.vm.initializeChat(), false)
    assert.equal(h.vm.chatErrorMessage, 'Chat setup is temporarily unavailable.')
    assert.equal(h.vm.chatIdentity, null)
    assert.equal(h.vm.chatReadyScope, null)
    assert.equal(h.vm.chatInitializing, false)
    assert.equal(h.events.includes('session'), false)
    assert.equal(h.events.includes('socket'), false)
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
    const end = source.indexOf('\nexport ', start + 1)
    const getter = new Function('process', `${source.slice(start, end < 0 ? undefined : end).replace('export ', '')}; return getChatBackendWsUrl`)(
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

    const feature = method === 'refundBch' ? 'REFUND_BCH' : 'RELEASE_BCH'
    const otherFeature = feature === 'RELEASE_BCH' ? 'REFUND_BCH' : 'RELEASE_BCH'
    for (const value of [false, null, 'false', 0]) {
      it(`blocks ${role} ${method} before keys when ${feature} is ${JSON.stringify(value)}`, async () => {
        const h = financialHarness(role, method, { status: 200, data: { P2P_MAINTENANCE: false, [feature]: value } })
        await h.run()
        assert.equal(h.events.some(event => ['keypair', 'privkey', 'release', 'refund'].includes(event)), false)
        assert.match(role === 'seller' ? h.vm.sendErrors[0] : h.vm.sendError, /Escrow releases|Escrow refunds/)
      })
    }

    it(`allows ${role} ${method} independently when ${feature} is enabled`, async () => {
      const h = financialHarness(role, method, { status: 200, data: { P2P_MAINTENANCE: false, [feature]: true, [otherFeature]: false } })
      await h.run()
      assert(h.events.includes(method === 'releaseBch' ? 'release' : 'refund'))
    })

    it(`blocks ${role} ${method} during global maintenance even if ${feature} is enabled`, async () => {
      const h = financialHarness(role, method, { status: 200, data: { P2P_MAINTENANCE: true, [feature]: true } })
      await h.run()
      assert.equal(h.events.some(event => ['keypair', 'privkey', 'release', 'refund'].includes(event)), false)
      assert.match(role === 'seller' ? h.vm.sendErrors[0] : h.vm.sendError, /maintenance/)
    })

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
    const state = { hash: 'wallet-a', role: 'peer', response: { status: 200, data: available } }
    const bus = new EventEmitter()
    const commits = []
    const context = {
      state: { featureToggles: { P2P_MAINTENANCE: false, ORDER_CREATE: true, AD_CREATE: true } },
      commit (name, controls) { commits.push([name, controls]); this.state.featureToggles = controls }
    }
    const backend = { get: async () => {
      if (state.response instanceof Error) throw state.response
      return state.response
    } }
    const refresh = new Function('backend', 'fetchP2PAvailability', 'Store', 'bus', `${source.slice(start, end).replace('export ', '')}; return fetchFeatureToggles`)(backend, fetchP2PAvailability, { getters: { 'global/getWallet': () => ({ walletHash: state.hash }), get 'ramp/getUser' () { return { user_type: state.role } } } }, bus)
    return { state, commits, context, bus, refresh: () => refresh(context) }
  }

  for (const change of ['wallet', 'role', 'logout']) {
    it(`discards feature refresh after ${change}`, async () => {
      const h = harness()
      let finish
      h.state.response = new Promise(resolve => { finish = resolve })
      const pending = h.refresh()
      if (change === 'wallet') h.state.hash = 'wallet-b'
      if (change === 'role') h.state.role = 'arbiter'
      if (change === 'logout') h.bus.emit('p2p-auth-cleared')
      finish({ status: 200, data: available })
      assert.deepEqual(await pending, {})
      assert.deepEqual(h.commits, [])
      assert.equal(h.bus.listenerCount('p2p-auth-cleared'), 0)
    })
  }

  it('clears confirmed UI controls on a transient failure', async () => {
    const h = harness()
    h.state.response = new Error('Synthetic network failure')
    assert.deepEqual(await h.refresh(), {})
    assert.equal(h.context.state.featureToggles, null)
    assert.deepEqual(h.commits, [['updateFeatureToggles', null]])
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
    assert.deepEqual(h.commits, [['updateFeatureToggles', null]])
  })
})


describe('P2P optional release and refund controls', () => {
  for (const feature of ['RELEASE_BCH', 'REFUND_BCH']) {
    it(`supports older feature-control responses omitting ${feature}`, () => {
      const controls = { P2P_MAINTENANCE: false }
      assert.equal(assertP2PAvailable(controls, feature), controls)
      assert.equal(Object.prototype.hasOwnProperty.call(controls, feature), false)
    })

    it(`reports an action-specific disabled message for ${feature}`, () => {
      let error
      try {
        assertP2PAvailable({ P2P_MAINTENANCE: false, [feature]: false }, feature)
      } catch (failure) { error = failure }
      assert.equal(error.response.data.code, 'p2p_feature_disabled')
      assert.equal(error.response.data.feature, feature)
      const message = p2pAvailabilityMessage((key, values, fallback) => fallback, error)
      assert.match(message, feature === 'RELEASE_BCH' ? /releases/ : /refunds/)
      assert.doesNotMatch(message, /fund previously/)
    })
  }

  it('still requires explicit enablement for all pre-existing feature flags', () => {
    for (const feature of ['ORDER_CREATE', 'ORDER_ESCROW', 'AD_CREATE', 'AD_UPDATE']) {
      assert.throws(() => assertP2PAvailable({ P2P_MAINTENANCE: false }, feature), error =>
        error.response.data.code === 'p2p_feature_disabled')
    }
  })
})


describe('P2P feature controls on page refresh', () => {
  function method (path, name) {
    const source = readFileSync(path, 'utf8')
    const start = Math.max(source.indexOf(`    ${name} (`), source.indexOf(`    async ${name} (`))
    const end = source.indexOf('\n    },', start) + 7
    return new Function(`return { ${source.slice(start, end)} }`)()[name]
  }

  for (const file of ['AdListings.vue', 'StoreListings.vue']) {
    it(`refreshes controls and listings together before completing pull-to-refresh in ${file}`, async () => {
      const calls = []
      let finishControls
      let finishListings
      let completed = false
      const vm = {
        $store: { dispatch: name => { calls.push(name); return new Promise(resolve => { finishControls = resolve }) } },
        resetAndRefetchListings: () => { calls.push('listings'); return new Promise(resolve => { finishListings = resolve }) }
      }
      const pending = method(`src/components/ramp/fiat/${file}`, 'refreshData').call(vm, () => { completed = true })
      assert.deepEqual(calls, ['ramp/fetchFeatureToggles', 'listings'])
      assert.equal(completed, false)
      finishControls()
      await Promise.resolve()
      assert.equal(completed, false)
      finishListings()
      await pending
      assert.equal(completed, true)
    })

    it(`stops the refresh indicator when a control refresh fails in ${file}`, async () => {
      let completed = false
      const vm = {
        $store: { dispatch: async () => { throw new Error('Synthetic control refresh failure') } },
        resetAndRefetchListings: async () => {}
      }
      await method(`src/components/ramp/fiat/${file}`, 'refreshData').call(vm, () => { completed = true })
      assert.equal(completed, true)
    })
  }

  it('refreshes ad feature controls without clearing or resubmitting the draft', async () => {
    const calls = []
    const vm = {
      adData: { description: 'Unsaved draft', tradeAmount: 1 }, currentStep: 1,
      $store: { dispatch: async name => { calls.push(name) } }
    }
    const draft = JSON.stringify(vm.adData)
    let completed = false
    await method('src/pages/apps/exchange/peer_to_peer/ad-form.vue', 'refreshFeatureControls').call(vm, () => { completed = true })
    assert.deepEqual(calls, ['ramp/fetchFeatureToggles'])
    assert.equal(JSON.stringify(vm.adData), draft)
    assert.equal(vm.currentStep, 1)
    assert.equal(completed, true)
  })

  it('waits for refreshed controls before completing the order-form refresh', async () => {
    let finish
    let completed = false
    const vm = {
      $store: { dispatch: name => {
        assert.equal(name, 'ramp/fetchFeatureToggles')
        return new Promise(resolve => { finish = resolve })
      } },
      fetchAd: async () => {}, fetchAdOwnerPeerData: async () => {},
      fetchMarketPrice: async () => {}, setupWebSocket () {}
    }
    const pending = method('src/pages/apps/exchange/peer_to_peer/order-form.vue', 'loadData').call(vm, () => { completed = true })
    await Promise.resolve()
    assert.equal(vm.isloaded, false)
    assert.equal(completed, false)
    finish()
    await pending
    assert.equal(vm.isloaded, true)
    assert.equal(completed, true)
  })
  it('rechecks escrow availability through page refresh without replaying funding', async () => {
    const events = []
    const vm = {
      loadData: async () => { events.push('order') },
      $nextTick: async () => { events.push('render') },
      $refs: { escrowTransferRef: { loadData: async () => { events.push('escrow-availability') } } }
    }
    const refresh = method('src/pages/apps/exchange/peer_to_peer/order.vue', 'refreshPage')
    await refresh.call(vm, () => { events.push('done') })
    assert.deepEqual(events, ['order', 'render', 'escrow-availability', 'done'])
    events.length = 0
    vm.sendingBch = true
    await refresh.call(vm, () => { events.push('done') })
    assert.deepEqual(events, ['done'])
  })

})


describe('P2P guarded payment-method deletion', () => {
  const backendSource = readFileSync('src/exchange/backend.js', 'utf8')
  const formatterSource = backendSource.slice(backendSource.indexOf('export function p2pErrorMessage'))
  const p2pErrorMessage = new Function(`${formatterSource.replace('export ', '')}; return p2pErrorMessage`)()

  function methods (path, names, bindings) {
    const source = readFileSync(path, 'utf8')
    const body = names.map(name => {
      const start = source.indexOf(`    async ${name} (`)
      const end = source.indexOf('\n    }', start) + 6
      return source.slice(start, end)
    }).join(',\n')
    return new Function(...Object.keys(bindings), `return { ${body} }`)(...Object.values(bindings))
  }

  for (const form of [true, false]) {
    for (const data of [null, { error: 'Used by an active order.' }, { detail: 'Used by an active ad.' }, { non_field_errors: ['Cannot delete an active method.'] }, ['Payment method is in use.'], {}]) {
      it(`${form ? 'dialog' : 'list'} only removes or refreshes a method after successful deletion: ${JSON.stringify(data)}`, async () => {
        const requests = []
        const events = []
        const notifications = []
        let finish
        const backend = { delete: (...args) => {
          requests.push(args)
          return new Promise((resolve, reject) => { finish = () => data === null ? resolve({ status: 204 }) : reject({ response: { status: 400, data } }) })
        } }
        const path = form ? 'src/components/ramp/fiat/dialogs/PaymentMethodForm.vue' : 'src/components/ramp/fiat/AddPaymentMethods.vue'
        const api = methods(path, form ? ['onSubmit', 'deletePaymentMethod'] : ['deletePaymentMethod'], { backend, p2pErrorMessage })
        const paymentMethods = [{ id: 7 }]
        const vm = {
          ...api, action: 'deletePaymentMethod', paymentMethod: paymentMethods[0], paymentMethods,
          errorMessage: null, loading: false, isloaded: true, openDialog: true, type: 'Profile',
          $t: (key, params, fallback) => fallback || key,
          $q: { notify: value => notifications.push(value) },
          $emit: name => events.push(name),
          fetchAllPaymentMethodsProfile: async () => { events.push('refresh'); vm.paymentMethods = [] },
          fetchPaymentMethods: async () => { events.push('refresh'); vm.paymentMethods = [] }
        }
        const pending = form ? vm.onSubmit() : vm.deletePaymentMethod(7)
        assert.equal(form ? vm.loading : !vm.isloaded, true)
        assert.deepEqual(events, [])
        assert.equal(vm.paymentMethods, paymentMethods)
        finish()
        await pending
        assert.equal(form ? vm.loading : !vm.isloaded, false)
        assert.deepEqual(requests, [['/ramp-p2p/payment-method/7/', { authorize: true }]])
        if (data === null) {
          assert.deepEqual(events, form ? ['success', 'back'] : ['refresh'])
          assert.equal(notifications.length, 1)
          assert.equal(notifications[0].type, 'positive')
          if (!form) assert.equal(vm.openDialog, false)
        } else {
          assert.deepEqual(events, [])
          assert.equal(vm.paymentMethods, paymentMethods)
          assert.equal(vm.openDialog, true)
          assert.equal(notifications[0].type, 'error')
          assert.equal(notifications[0].message, p2pErrorMessage({ response: { data } }, 'Unable to delete this payment method. Please try again.'))
          if (form) assert.equal(vm.errorMessage, notifications[0].message)
        }
      })
    }
  }

  for (const role of ['peer', 'arbiter']) {
    it(`surfaces ${role} chat_identity_id validation failures without expiring the session`, async () => {
      const h = identityHarness()
      const data = { chat_identity_id: ['Verified linking is required.'] }
      h.fail({ response: { status: 400, data } })
      await assert.rejects(h.updateP2PProfile(role, { chat_identity_id: 12 }), error => {
        assert.equal(error.code, 'p2p_chat_link_unavailable')
        assert.equal(error.message, data.chat_identity_id[0])
        return true
      })
      assert.deepEqual(h.events, [])
    })
  }

  it('does not interpret rejected deletion as an expired session', async () => {
    const h = identityHarness()
    h.fail({ response: { status: 400, data: { error: 'Used by an active order.' } } })
    await assert.rejects(h.client.request({ method: 'delete', url: '/ramp-p2p/payment-method/7/', authorize: true }))
    assert.deepEqual(h.events, [])
  })
})


describe('P2P chat dialog blocked links', () => {
  it('shows the linking error and stops initialization without enabling message sending', async () => {
    const source = readFileSync('src/components/ramp/fiat/dialogs/ChatDialog.vue', 'utf8')
    const start = source.indexOf('    async loadChatSession (')
    const end = source.indexOf('\n    },', start) + 7
    const failure = Object.assign(new Error('Chat setup is temporarily unavailable.'), { code: 'p2p_chat_link_unavailable' })
    const notifications = []
    const bindings = {
      wallet: { walletHash: 'synthetic-wallet' }, generateChatIdentityRef: () => 'synthetic-ref',
      fetchUser: async () => ({ name: 'Synthetic name', user_type: 'peer', chat_identity_id: null }),
      loadChatIdentity: async () => { throw failure },
      fetchChatSession: async () => { throw new Error('Must not fetch a session before linking') },
      bus: { emit () { throw new Error('Must not expire the session') } }
    }
    const load = new Function(...Object.keys(bindings), `return { ${source.slice(start, end)} }`)(...Object.values(bindings)).loadChatSession
    const vm = {
      isloaded: false, chatIdentity: null,
      $store: { getters: { 'ramp/getUser': {}, 'ramp/chatIdentity': () => ({ id: 99 }) } },
      $q: { notify: value => notifications.push(value) }, $t: (key, params, fallback) => fallback
    }
    await load.call(vm)
    assert.equal(vm.chatErrorMessage, failure.message)
    assert.equal(vm.chatIdentity, null)
    assert.equal(vm.isloaded, false)
    assert.equal(notifications[0].message, failure.message)
    assert(source.includes('v-if="!isloaded && !chatErrorMessage"'))
  })
})


describe('P2P appeal settlement submission', () => {
  const source = readFileSync('src/exchange/backend.js', 'utf8')
  const pendingSource = source.slice(source.indexOf('const pendingAppealRequests'), source.indexOf('export function p2pErrorMessage')).replace('export async function', 'async function')
  const assertSource = source.slice(source.indexOf('function assertRequestWallet'), source.indexOf('async function authorizeRequest'))

  function pendingHarness () {
    const calls = []
    const state = { status: 'APL', wallet: 'synthetic-wallet', postError: null, get: null }
    const Store = { getters: {
      'global/getWallet': () => ({ walletHash: state.wallet }),
      'global/getWalletIndex': 0, 'global/isChipnet': false
    } }
    const backend = {
      async get (...args) {
        calls.push(['get', ...args])
        if (state.get) return state.get(...args)
        return { status: 200, data: { status: { value: state.status } } }
      },
      async post (...args) {
        calls.push(['post', ...args])
        if (state.postError) throw state.postError
        state.status = args[0].includes('refund') ? 'RFN_PN' : 'RLS_PN'
        return { status: 200 }
      }
    }
    const ensureAppealPending = new Function('backend', 'Store', `${assertSource}\n${pendingSource}; return ensureAppealPending`)(backend, Store)
    return { state, calls, ensureAppealPending }
  }

  function method (path, name, bindings = {}) {
    const source = readFileSync(path, 'utf8')
    const start = Math.max(source.indexOf(`    ${name} (`), source.indexOf(`    async ${name} (`))
    const end = source.indexOf('\n    },', start) + 7
    return new Function(...Object.keys(bindings), `return { ${source.slice(start, end)} }`)(...Object.values(bindings))[name]
  }

  function formHarness (action = 'refund') {
    const path = 'src/components/ramp/appeal/AppealDetail.vue'
    const h = pendingHarness()
    const events = []
    const saved = {}
    const vm = {
      selectedAction: action, sendingBch: false, recoveringSettlement: false, disposed: false,
      order: { id: 24, status: { value: 'APL' } }, appeal: { id: 3 },
      $store: { getters: { 'ramp/getOrderTxid': (id, action) => saved[action] } },
      $emit: name => events.push(name),
      async releaseBch () { events.push('release-broadcast'); saved.RELEASE = 'synthetic-release'; return saved.RELEASE },
      async refundBch () { events.push('refund-broadcast'); saved.REFUND = 'synthetic-refund'; return saved.REFUND }
    }
    for (const name of ['onSubmit', 'setOrderPending', 'loadTransactionId']) {
      vm[name] = method(path, name, {
        ensureAppealPending: h.ensureAppealPending,
        p2pErrorMessage: (error, fallback) => error.response?.data?.error || fallback
      }).bind(vm)
    }
    return { ...h, vm, events, saved }
  }

  for (const action of ['refund', 'release']) {
    it(`posts pending-${action} once and refreshes the order status without cache`, async () => {
      const h = pendingHarness()
      await h.ensureAppealPending(3, 24, action)
      await h.ensureAppealPending(3, 24, action)
      assert.equal(h.calls.filter(call => call[0] === 'post').length, 1)
      const posts = h.calls.filter(call => call[0] === 'post')
      assert.equal(posts[0][1], `/ramp-p2p/appeal/3/pending-${action}/`)
      assert(h.calls.filter(call => call[0] === 'get').every(call =>
        call[1] === '/ramp-p2p/order/24/' && call[2].authorize === 'arbiter' && call[2].cache === false && call[2].params._fresh))
    })

    it(`guards concurrent ${action} submissions before signing or broadcasting`, async () => {
      const h = formHarness(action)
      let finish
      h.vm[`${action}Bch`] = () => {
        h.events.push('broadcast')
        return new Promise(resolve => { finish = resolve })
      }
      const pending = h.vm.onSubmit()
      await h.vm.onSubmit()
      assert.equal(h.events.filter(event => event === 'broadcast').length, 1)
      finish('synthetic-txid')
      await pending
      assert.equal(h.calls.filter(call => call[0] === 'post').length, 1)
      assert.equal(h.events.filter(event => event === 'refresh').length, 1)
      assert.equal(h.vm.sendingBch, false)
    })

    it(`resumes the saved ${action} transaction after a status update failure without rebroadcasting`, async () => {
      const h = formHarness(action)
      h.state.postError = { response: { status: 503, data: { error: 'Temporarily unavailable' } } }
      await h.vm.onSubmit()
      assert.equal(h.vm.sendError, 'Temporarily unavailable')
      assert.equal(h.vm.sendingBch, false)
      h.state.postError = null
      await h.vm.onSubmit()
      assert.equal(h.events.filter(event => event === `${action}-broadcast`).length, 1)
      assert.equal(h.calls.filter(call => call[0] === 'post').length, 2)
    })
  }

  for (const [action, statuses] of [['refund', ['RFN_PN', 'RFN']], ['release', ['RLS_PN', 'RLS']]]) {
    for (const status of statuses) {
      it(`skips the status POST when ${action} has already reached ${status}`, async () => {
        const h = pendingHarness()
        h.state.status = status
        await h.ensureAppealPending(3, 24, action)
        assert.equal(h.calls.filter(call => call[0] === 'post').length, 0)
      })
    }
  }

  it('shares one pending-status request across remounted forms', async () => {
    const h = pendingHarness()
    let finish
    h.state.get = () => new Promise(resolve => { finish = resolve })
    const first = h.ensureAppealPending(3, 24, 'refund')
    const second = h.ensureAppealPending(3, 24, 'refund')
    assert.equal(h.calls.length, 1)
    finish({ status: 200, data: { status: { value: 'APL' } } })
    await Promise.all([first, second])
    assert.equal(h.calls.filter(call => call[0] === 'post').length, 1)
  })

  it('accepts a duplicate-status race only after a fresh matching status is confirmed', async () => {
    const h = pendingHarness()
    let reads = 0
    h.state.get = async () => ({ status: 200, data: { status: { value: ++reads === 1 ? 'APL' : 'RFN_PN' } } })
    h.state.postError = { response: { status: 400, data: { error: 'duplicate status' } } }
    await h.ensureAppealPending(3, 24, 'refund')
    assert.deepEqual(h.calls.map(call => call[0]), ['get', 'post', 'get'])
  })

  for (const status of ['APL', 'RLS_PN', 'RLS']) {
    it(`does not suppress a refund rejection when the server reports ${status}`, async () => {
      const h = pendingHarness()
      let reads = 0
      h.state.get = async () => ({ status: 200, data: { status: { value: ++reads === 1 ? 'APL' : status } } })
      const error = { response: { status: 400, data: { error: 'duplicate status' } } }
      h.state.postError = error
      await assert.rejects(h.ensureAppealPending(3, 24, 'refund'), failure => failure === error)
      assert.equal(h.calls.filter(call => call[0] === 'post').length, 1)
    })
  }

  it('does not retry or suppress authentication failures', async () => {
    const h = pendingHarness()
    const error = { response: { status: 403 } }
    h.state.postError = error
    await assert.rejects(h.ensureAppealPending(3, 24, 'refund'), failure => failure === error)
    assert.deepEqual(h.calls.map(call => call[0]), ['get', 'post'])
  })

  it('blocks the status mutation if the wallet changes while refreshing', async () => {
    const h = pendingHarness()
    let finish
    h.state.get = () => new Promise(resolve => { finish = resolve })
    const pending = h.ensureAppealPending(3, 24, 'refund')
    h.state.wallet = 'different-wallet'
    finish({ status: 200, data: { status: { value: 'APL' } } })
    await assert.rejects(pending, { code: 'p2p_identity_mismatch' })
    assert.equal(h.calls.filter(call => call[0] === 'post').length, 0)
  })

  it('blocks an opposite settlement when a broadcast transaction is already saved', async () => {
    const h = formHarness('release')
    h.saved.REFUND = 'synthetic-already-broadcast-refund'
    await h.vm.onSubmit()
    assert.equal(h.calls.length, 0)
    assert.equal(h.events.includes('release-broadcast'), false)
    assert.match(h.vm.sendError, /already been broadcast/)
  })

  it('does not refresh from sending-bch=false before the form emits its refresh', () => {
    let refreshes = 0
    const vm = { sendingBch: true, refreshData: () => { refreshes++ } }
    method('src/pages/apps/exchange/arbiter/appeal.vue', 'onSendingBch').call(vm, false)
    assert.equal(vm.sendingBch, false)
    assert.equal(refreshes, 0)
  })

  it('refreshes authoritative status before remounting appeal children on a WebSocket update', async () => {
    let message
    const events = []
    class WebSocketManager {
      setWebSocketUrl () {}
      subscribeToMessages (callback) { message ||= callback }
    }
    const setup = method('src/pages/apps/exchange/arbiter/appeal.vue', 'setupWebsocket', {
      WebSocketManager, bus: { emit () {} }, getBackendWsUrl: () => 'wss://example.test/', getChatBackendWsUrl: () => 'wss://example.test/chat/'
    })
    const vm = {
      disposed: false, appeal: { order: { id: 24 } }, order: {}, websocketManager: {},
      closeWSConnection () {}, fetchAppeal: async () => events.push('appeal'),
      fetchOrder: async () => events.push('order'), reloadChildComponents: () => events.push('remount')
    }
    setup.call(vm)
    await message({ success: true, status: { value: 'RFN_PN' } })
    assert.deepEqual(events, ['appeal', 'order', 'remount'])
    events.length = 0
    vm.sendingBch = true
    await message({ success: true, status: { value: 'RFN_PN' } })
    assert.deepEqual(events, ['appeal', 'order'])
  })
})


describe('P2P arbiter loading recovery', () => {
  function method (path, name, bindings = {}) {
    const source = readFileSync(path, 'utf8')
    const start = Math.max(source.indexOf(`    ${name} (`), source.indexOf(`    async ${name} (`))
    const end = source.indexOf('\n    },', start) + 7
    return new Function(...Object.keys(bindings), `return { ${source.slice(start, end)} }`)(...Object.values(bindings))[name]
  }

  function listingHarness () {
    const requests = []
    const errors = []
    const state = { dispatch: async () => ({ ongoing_count: 2 }) }
    const vm = {
      statusType: 'PENDING', loading: true, lastFetchTime: Date.now(), minFetchInterval: 500,
      fetchAbortController: null, footerData: { ongoingOrdersCount: 0 },
      $store: { dispatch: async (...args) => { requests.push(args); return state.dispatch(...args) } },
      handleRequestError: error => errors.push(error)
    }
    vm.fetchAppeals = method('src/components/ramp/appeal/AppealListing.vue', 'fetchAppeals').bind(vm)
    return { vm, state, requests, errors }
  }

  it('fetches again after a rapid refresh when the previous request has finished', async () => {
    const h = listingHarness()
    await h.vm.fetchAppeals(true)
    assert.equal(h.requests.length, 1)
    assert.equal(h.vm.loading, false)
    assert.equal(h.vm.footerData.ongoingOrdersCount, 2)
    assert.equal(h.vm.fetchAbortController, null)
  })

  it('keeps the active request responsible for clearing loading when a rapid duplicate is skipped', async () => {
    const h = listingHarness()
    let finish
    h.state.dispatch = () => new Promise(resolve => { finish = resolve })
    const pending = h.vm.fetchAppeals(true)
    await h.vm.fetchAppeals(true)
    assert.equal(h.requests.length, 1)
    assert.equal(h.vm.loading, true)
    finish({ ongoing_count: 3 })
    await pending
    assert.equal(h.vm.loading, false)
    assert.equal(h.vm.footerData.ongoingOrdersCount, 3)
  })

  it('passes cancellation through and does not let an obsolete request clear the new tab loading state', async () => {
    const h = listingHarness()
    let finishFirst
    let finishSecond
    h.state.dispatch = () => new Promise(resolve => { finishFirst = resolve })
    const first = h.vm.fetchAppeals(true)
    const oldSignal = h.requests[0][1].signal
    h.vm.fetchAbortController.abort()
    h.vm.statusType = 'RESOLVED'
    h.state.dispatch = () => new Promise(resolve => { finishSecond = resolve })
    const second = h.vm.fetchAppeals(true)
    assert.equal(h.requests.length, 2)
    assert.equal(oldSignal.aborted, true)
    finishFirst({ ongoing_count: 99 })
    await first
    assert.equal(h.vm.loading, true)
    assert.equal(h.vm.footerData.ongoingOrdersCount, 0)
    finishSecond({ ongoing_count: 4 })
    await second
    assert.equal(h.vm.loading, false)
    assert.equal(h.vm.footerData.ongoingOrdersCount, 4)
  })

  it('clears loading and reports a timed-out appeal fetch', async () => {
    const h = listingHarness()
    const error = Object.assign(new Error('timeout of 10000ms exceeded'), { code: 'ECONNABORTED' })
    h.state.dispatch = async () => { throw error }
    await h.vm.fetchAppeals(true)
    assert.equal(h.vm.loading, false)
    assert.equal(h.vm.fetchAbortController, null)
    assert.deepEqual(h.errors, [error])
  })

  it('sets a finite timeout and explicit arbiter authentication on appeal-list requests', async () => {
    const source = readFileSync('src/store/ramp/actions.js', 'utf8')
    const start = source.indexOf('export function fetchAppeals (')
    const end = source.indexOf('\nexport function ', start + 1)
    const calls = []
    const commits = []
    const backend = { get: async (...args) => { calls.push(args); return { data: { appeals: [], ongoing_count: 0 } } } }
    const fetchAppeals = new Function('backend', `${source.slice(start, end).replace('export ', '')}; return fetchAppeals`)(backend)
    const controller = new AbortController()
    await fetchAppeals({
      state: { itemsPerPage: 10 },
      getters: { appealsPageNumber: () => null, appealsTotalPages: () => null },
      commit: (...args) => commits.push(args)
    }, { appealState: 'PENDING', params: {}, overwrite: true, signal: controller.signal })
    assert.equal(calls[0][1].authorize, 'arbiter')
    assert.equal(calls[0][1].timeout, 10000)
    assert.equal(calls[0][1].cache, false)
    assert.equal(calls[0][1].signal, controller.signal)
    assert.equal(commits.length, 2)
  })

  it('shows timeout notifications in the arbiter layout while ignoring navigation cancellations', () => {
    const notifications = []
    const events = []
    const vm = {
      $q: { notify: notification => notifications.push(notification) },
      $t: (key, params, fallback) => fallback
    }
    const handle = method('src/pages/apps/exchange/arbiter/index.vue', 'handleRequestError', {
      bus: { emit: (...args) => events.push(args) }
    })
    handle.call(vm, { code: 'ECONNABORTED', message: 'Request aborted' })
    assert.equal(notifications.length, 0)
    handle.call(vm, { code: 'ECONNABORTED', message: 'timeout of 10000ms exceeded' })
    assert.equal(notifications.length, 1)
    assert.equal(notifications[0].type, 'error')
    assert.match(notifications[0].message, /timed out/)
    assert.deepEqual(events, [])
  })
})


describe('Peer maintenance metadata authentication', () => {
  const cases = [
    ['src/components/ramp/fiat/StoreListings.vue', 'fetchFiatCurrencies'],
    ['src/components/ramp/fiat/OrderListings.vue', 'fetchFiatCurrencies'],
    ['src/components/ramp/fiat/AddPaymentMethods.vue', 'fetchFiatCurrency'],
    ['src/components/ramp/fiat/AddPaymentMethods.vue', 'fetchPaymentTypes'],
    ['src/components/ramp/fiat/dialogs/PaymentMethodForm.vue', 'fetchFiatCurrencies'],
    ['src/components/ramp/fiat/dialogs/PaymentMethodForm.vue', 'fetchPaymentTypes'],
    ['src/components/ramp/fiat/dialogs/SelectPaymentMethods.vue', 'fetchPaymentTypes'],
    ['src/components/ramp/fiat/DisplayConfirmation.vue', 'fetchMarketPrice'],
    ['src/pages/apps/exchange/peer_to_peer/order-form.vue', 'fetchMarketPrice'],
    ['src/pages/apps/exchange/peer_to_peer/order-form.vue', 'fetchFees'],
    ['src/pages/apps/exchange/peer_to_peer/ad-form.vue', 'getInitialMarketPrice']
  ]

  for (const [path, name] of cases) {
    it(`keeps approved peers authenticated in ${path}: ${name}`, async () => {
      const h = identityHarness({ storedUser: { user_type: 'arbiter' } })
      const failures = []
      const backend = { get: async (url, config) => {
        const response = await h.client.get(url, config)
        if (response.config.headers.Authorization !== 'Token synthetic-peer-token') {
          throw availabilityError('p2p_maintenance', 'P2P_MAINTENANCE')
        }
        const data = url.includes('market-price') ? { price: '12000' }
          : url.includes('calculate-fees') ? { service: 10 } : [{ id: 1, symbol: 'PHP' }]
        return { ...response, data }
      } }
      const source = readFileSync(path, 'utf8')
      const start = source.indexOf(`    async ${name} (`)
      const end = source.indexOf('\n    },', start) + 6
      const methods = new Function('backend', 'bus', `return { ${source.slice(start, end)} }`)(backend, { emit: event => failures.push(event) })
      const vm = {
        selectedCurrency: { symbol: 'PHP' }, currency: 'PHP', fiatCurrencies: [],
        ad: { fiat_currency: { symbol: 'PHP' } }, adData: { fiatCurrency: { symbol: 'PHP' } },
        getTradeAmount: () => 1000, $t: key => key,
        handleRequestError: error => failures.push(error), pauseForLogin: () => failures.push('login')
      }
      await methods[name].call(vm)
      assert.equal(h.requests.length, 1)
      assert.equal(h.requests[0].authorize, 'peer')
      assert.equal(h.requests[0].headers.Authorization, 'Token synthetic-peer-token')
      assert.deepEqual(failures, [])
    })
  }

  for (const role of ['peer', 'arbiter']) {
    it(`authenticates the mobile version check for ${role}`, async () => {
      const h = identityHarness()
      const backend = { get: async (url, config) => {
        const response = await h.client.get(url, config)
        return { ...response, data: { latest_version: 'test' } }
      } }
      const source = readFileSync('src/pages/apps/exchange/index.vue', 'utf8')
      const start = source.indexOf('    async checkVersionUpdate (')
      const end = source.indexOf('\n    }\n  }\n}', start) + 6
      const methods = new Function('backend', 'packageInfo', `return { ${source.slice(start, end)} }`)(backend, { version: 'test' })
      await methods.checkVersionUpdate.call({ user: { user_type: role }, $q: { platform: { is: { mobile: true } } } })
      await new Promise(resolve => setImmediate(resolve))
      assert.equal(h.requests.length, 1)
      assert.equal(h.requests[0].headers.Authorization, `Token synthetic-${role}-token`)
    })
  }

  it('authenticates payment-type lookups dispatched by the peer store', async () => {
    const h = identityHarness({ storedUser: { user_type: 'arbiter' } })
    const source = readFileSync('src/store/ramp/actions.js', 'utf8')
    const start = source.indexOf('export function fetchPaymentTypes (')
    const end = source.indexOf('\n}', start) + 2
    const backend = { get: async (url, config) => {
      const response = await h.client.get(url, config)
      return { ...response, data: [] }
    } }
    const fetch = new Function('backend', 'toRaw', `${source.slice(start, end).replace('export ', '')}; return fetchPaymentTypes`)(backend, value => value)
    await fetch({ getters: { paymentTypes: () => null }, commit () {} }, { currency: 'PHP' })
    assert.equal(h.requests[0].headers.Authorization, 'Token synthetic-peer-token')
  })
})


describe('P2P payment filter defaults', () => {
  async function refresh (previousIds, nextIds, selectedIds = previousIds, currency = 'PHP') {
    const source = readFileSync('src/store/ramp/actions.js', 'utf8')
    const start = source.indexOf('export function fetchPaymentTypes (')
    const end = source.indexOf('\n}', start) + 2
    const backend = { get: async () => ({ data: nextIds.map(id => ({ id })) }) }
    const fetch = new Function('backend', 'toRaw', `${source.slice(start, end).replace('export ', '')}; return fetchPaymentTypes`)(backend, value => value)
    const names = ['storeBuyFilters', 'storeSellFilters', 'ongoingOrderFilters', 'completedOrderFilters']
    const filters = Object.fromEntries(names.map(name => [name, { payment_types: [...selectedIds], sort_type: 'descending' }]))
    const commits = []
    const getters = {
      paymentTypes: () => previousIds.map(id => ({ id })),
      ...Object.fromEntries(names.map(name => [name, () => filters[name]]))
    }
    await fetch({ getters, commit (name, payload) {
      commits.push([name, payload])
      if (name !== 'updatePaymentTypes') {
        const key = name.slice(6, 7).toLowerCase() + name.slice(7)
        filters[key] = payload.filters
      }
    } }, { currency })
    return { filters: Object.values(filters), commits }
  }

  it('selects every method when multiple methods are first loaded', async () => {
    const { filters } = await refresh([], [1, 2, 3])
    for (const filter of filters) assert.deepEqual(filter.payment_types, [1, 2, 3])
  })

  it('keeps all selected when multiple methods are added or removed', async () => {
    for (const [previous, next] of [[[1], [1, 2, 3]], [[1, 2, 3], [3]], [[1, 2], [2, 3]]]) {
      const { filters } = await refresh(previous, next)
      for (const filter of filters) assert.deepEqual(filter.payment_types, next)
    }
  })

  it('preserves a custom selection when methods are added', async () => {
    const { filters } = await refresh([1, 2], [1, 2, 3], [2])
    for (const filter of filters) assert.deepEqual(filter.payment_types, [2])
  })

  it('does not mistake an unrelated selection of the same length for all selected', async () => {
    const { filters } = await refresh([1, 2], [1, 2, 3], [1, 99])
    for (const filter of filters) assert.deepEqual(filter.payment_types, [1, 99])
  })

  it('stores unscoped payment types and filters under All', async () => {
    const { commits } = await refresh([], [1, 2, 3], [], null)
    for (const [, payload] of commits) assert.equal(payload.currency, 'All')
  })
})


describe('P2P chat loading latency', () => {
  function method (name, bindings = {}) {
    const source = readFileSync('src/pages/apps/exchange/peer_to_peer/order.vue', 'utf8')
    const start = source.indexOf(`    async ${name} (`)
    const end = source.indexOf('\n    },', start) + 7
    return new Function(...Object.keys(bindings), `return { ${source.slice(start, end)} }`)(...Object.values(bindings))[name]
  }

  it('starts chat setup before waiting for unrelated order details', async () => {
    const events = []
    const vm = {
      order: { id: 24 }, isChatEnabled: true,
      fetchOrder: async () => events.push('order'),
      initializeChat: () => { events.push('chat'); return new Promise(() => {}) },
      fetchAd: async () => events.push('ad'), fetchFeedback: async () => {},
      fetchCounterpartyTradeStats () {}, fetchStatusList: async () => {}, ensureChatCloseCountdownTimer () {}
    }
    await method('loadData').call(vm)
    assert.deepEqual(events, ['order', 'chat', 'ad'])
    assert.equal(vm.isloaded, true)
  })

  it('loads messages while the member and public-key requests are still pending', async () => {
    const events = []
    let finishMembers
    let finishPubkeys
    const bindings = {
      fetchChatMembers: () => { events.push('members'); return new Promise(resolve => { finishMembers = resolve }) },
      fetchChatPubkeys: () => { events.push('pubkeys'); return new Promise(resolve => { finishPubkeys = resolve }) },
      fetchChatMessages: async () => { events.push('messages'); return { results: [], count: 0 } }
    }
    const load = method('loadChatData', bindings)
    let scope = 'order-24'
    const vm = {
      chatRef: 'synthetic-chat', chatLoaded: false, chatLoading: false, chatMessages: [],
      chatSetupScope: () => scope, initializeChat: async () => true, loadKeyPair: async () => {},
      decryptChatMessages: async () => {}, decryptChatAttachments: async () => {},
      ensureChatWebSocket () {}, $nextTick () {}
    }
    const pending = load.call(vm)
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(events, ['members', 'pubkeys', 'messages'])
    assert.equal(vm.chatLoaded, false)
    finishMembers([])
    finishPubkeys([])
    await pending
    assert.equal(vm.chatLoaded, true)
    assert.equal(vm.chatLoading, false)

    events.length = 0
    vm.chatLoaded = false
    const stale = load.call(vm)
    await new Promise(resolve => setImmediate(resolve))
    scope = 'order-25'
    finishMembers([])
    finishPubkeys([])
    await stale
    assert.equal(vm.chatLoaded, false)
  })
})


describe('P2P maintenance participant notices', () => {
  function component (path) {
    const source = readFileSync(path, 'utf8')
    const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
      .replace(/^import .*$/gm, '').replace('export default', 'return')
    return new Function('getDarkModeClass', 'RampDragSlide', 'bus', script)(() => '', {}, {
      emit () { throw new Error('Participant errors should stay visible in the escrow form') }
    })
  }
  const escrow = component('src/components/ramp/fiat/EscrowTransfer.vue')

  for (const role of ['buyer', 'seller', 'arbiter']) {
    it(`identifies an unapproved ${role} and disables funding`, () => {
      const participants = [{ role, name: 'Synthetic participant', allowed: false }]
      const vm = { dragSlideOn: true, contractAddress: 'synthetic-contract', arbiterOptions: [{}] }
      escrow.methods.handleRequestError.call(vm, {
        response: { status: 400, data: { code: 'p2p_maintenance_participants', participants } }
      })
      assert.deepEqual(vm.maintenanceParticipants, participants)
      assert.equal(vm.dragSlideOn, false)
      assert.equal(escrow.computed.showDragSlide.call(vm), false)
    })
  }

  it('blocks funding directly while a participant approval error is displayed', async () => {
    await escrow.methods.escrowBch.call({ maintenanceParticipants: [{ role: 'arbiter', allowed: false }] })
  })

  it('does not guess which participant failed when using an older server', () => {
    const vm = {}
    escrow.methods.handleRequestError.call(vm, {
      response: { status: 400, data: { error: 'Maintenance testing requires approved peers and arbiters.' } }
    })
    assert.deepEqual(vm.maintenanceParticipants, [])
  })

  it('ignores malformed participant eligibility instead of treating it as approved', () => {
    const vm = {}
    escrow.methods.handleRequestError.call(vm, {
      response: { data: { code: 'p2p_maintenance_participants', participants: [null, { role: 'seller', allowed: 'true' }, { role: 'other', allowed: false }] } }
    })
    assert.deepEqual(vm.maintenanceParticipants, [])
  })


})


describe('P2P chat identity verification reuse', () => {
  function harness () {
    const source = readFileSync('src/exchange/chat/backend.js', 'utf8')
      .replace(/^import .*$/gm, '').replace(/export /g, '')
    const listeners = new Map()
    const interceptors = {}
    const state = {
      now: 1000, hash: 'wallet-a', index: 0, chipnet: false,
      user: { id: 12, user_type: 'peer', chat_identity_id: 34 },
      verifications: [], signatures: [], reads: 0, wait: null, failure: null, localMismatch: false
    }
    const client = {
      defaults: { baseURL: 'https://chat.example.test/api' },
      interceptors: {
        request: { use (callback) { interceptors.request = callback } },
        response: { use (resolve, reject) { interceptors.resolve = resolve; interceptors.reject = reject } }
      }
    }
    const mismatch = () => Object.assign(new Error('Synthetic identity mismatch'), { code: 'p2p_identity_mismatch' })
    const makeWallet = () => ({
      get walletHash () { return state.hash }, privkey: () => 'synthetic-current-key',
      assertIdentity (profile) {
        if (state.localMismatch || profile.wallet_hash !== state.hash || profile.public_key !== `pubkey-${state.hash}`) throw mismatch()
      }
    })
    const bindings = {
      Date: { now: () => state.now }, process: { env: {} },
      axios: { create: () => client }, requestManager: { attachTo () {} },
      bus: { on (name, callback) { listeners.set(name, callback) } },
      Store: { getters: {
        get 'ramp/getUser' () { return state.user },
        'global/getWallet': () => ({ walletHash: state.hash }),
        get 'global/getWalletIndex' () { return state.index },
        get 'global/isChipnet' () { return state.chipnet }
      } },
      wallet: makeWallet(),
      assertP2PIdentity: async (member, role) => {
        state.verifications.push(role)
        const profile = { id: state.user.id, wallet_hash: state.hash, public_key: `pubkey-${state.hash}`, address: 'synthetic-address' }
        if (state.wait) await state.wait
        if (state.failure) throw state.failure
        return profile
      },
      SecureStoragePlugin: { get: async () => { state.reads++; return { value: `${state.hash}:synthetic-current-key` } } },
      getCurrentWalletStorageKey: () => 'synthetic-storage-key', getWalletStorageKey: () => 'synthetic-storage-key',
      signMessage: (key, payload) => { state.signatures.push({ key, payload }); return `synthetic-signature-${state.signatures.length}` },
      generateChatIdentityRef: hash => `ref-${hash}`
    }
    const api = new Function(...Object.keys(bindings), `${source}; return { signRequestData, replaceWallet (next) { wallet = next } }`)(...Object.values(bindings))
    return { ...api, state, interceptors, listeners, makeWallet }
  }

  it('shares concurrent verification while signing every payload and checking storage separately', async () => {
    const h = harness()
    let finish
    h.state.wait = new Promise(resolve => { finish = resolve })
    const pending = ['one', 'two', 'three'].map(payload => h.signRequestData(payload))
    assert.equal(h.state.verifications.length, 1)
    finish()
    await Promise.all(pending)
    assert.equal(h.state.reads, 3)
    assert.deepEqual(h.state.signatures.map(signature => signature.payload), ['one', 'two', 'three'])
    await h.signRequestData('four')
    assert.equal(h.state.verifications.length, 1)
    assert.equal(h.state.signatures.length, 4)
  })

  it('expires verification 30 seconds after it starts instead of extending it on every hit', async () => {
    const h = harness()
    await h.signRequestData('one')
    h.state.now += 29999
    await h.signRequestData('two')
    assert.equal(h.state.verifications.length, 1)
    h.state.now++
    await h.signRequestData('three')
    assert.equal(h.state.verifications.length, 2)
  })

  it('reverifies if the clock moves backward instead of extending the cache lifetime', async () => {
    const h = harness()
    await h.signRequestData('one')
    h.state.now--
    await h.signRequestData('two')
    assert.equal(h.state.verifications.length, 2)
  })

  for (const change of ['wallet', 'index', 'network', 'role', 'account', 'chat-link', 'registered-key', 'registered-address', 'registered-path', 'disabled', 'wallet-object']) {
    it(`reverifies after a ${change} change`, async () => {
      const h = harness()
      await h.signRequestData('one')
      if (change === 'wallet') h.state.hash = 'wallet-b'
      if (change === 'index') h.state.index++
      if (change === 'network') h.state.chipnet = true
      if (change === 'role') h.state.user.user_type = 'arbiter'
      if (change === 'account') h.state.user.id++
      if (change === 'chat-link') h.state.user.chat_identity_id++
      if (change === 'registered-key') h.state.user.public_key = 'changed-key'
      if (change === 'registered-address') h.state.user.address = 'changed-address'
      if (change === 'registered-path') h.state.user.address_path = '0/1'
      if (change === 'disabled') h.state.user.is_disabled = true
      if (change === 'wallet-object') h.replaceWallet(h.makeWallet())
      await h.signRequestData('two')
      assert.equal(h.state.verifications.length, 2)
    })
  }

  for (const event of ['p2p-auth-cleared', 'relogged']) {
    it(`invalidates verification on ${event}`, async () => {
      const h = harness()
      await h.signRequestData('one')
      h.listeners.get(event)({ walletHash: 'wallet-a', userType: 'peer' })
      await h.signRequestData('two')
      assert.equal(h.state.verifications.length, 2)
    })

    it(`does not sign from an in-flight verification invalidated by ${event}`, async () => {
      const h = harness()
      let finish
      h.state.wait = new Promise(resolve => { finish = resolve })
      const pending = h.signRequestData('one')
      h.listeners.get(event)({ walletHash: 'wallet-a', userType: 'peer' })
      finish()
      await assert.rejects(pending, { code: 'p2p_identity_mismatch' })
      assert.equal(h.state.signatures.length, 0)
      await h.signRequestData('two')
      assert.equal(h.state.verifications.length, 2)
    })
  }

  for (const status of [401, 403, 404]) {
    it(`reverifies after a chat HTTP ${status} without replaying the failed request`, async () => {
      const h = harness()
      await h.signRequestData('one')
      await assert.rejects(h.interceptors.reject({ response: { status } }), { code: 'p2p_chat_access_denied' })
      assert.equal(h.state.signatures.length, 1)
      await h.signRequestData('two')
      assert.equal(h.state.verifications.length, 2)
    })
  }

  it('still blocks a local signer mismatch while remote verification is cached', async () => {
    const h = harness()
    await h.signRequestData('one')
    h.state.localMismatch = true
    await assert.rejects(h.signRequestData('two'), { code: 'p2p_identity_mismatch' })
    assert.equal(h.state.signatures.length, 1)
    h.state.localMismatch = false
    await h.signRequestData('three')
    assert.equal(h.state.verifications.length, 2)
  })

  it('does not cache a rejected remote verification', async () => {
    const h = harness()
    h.state.failure = Object.assign(new Error('Synthetic failure'), { code: 'p2p_identity_mismatch' })
    await assert.rejects(h.signRequestData('one'), { code: 'p2p_identity_mismatch' })
    assert.equal(h.state.signatures.length, 0)
    h.state.failure = null
    await h.signRequestData('two')
    assert.equal(h.state.verifications.length, 2)
  })

  it('keeps fresh signed headers on every request while reusing only identity verification', async () => {
    const h = harness()
    const config = () => ({ forceSign: true, method: 'get', url: 'chat/messages/', headers: {} })
    const first = await h.interceptors.request(config())
    h.state.now++
    const second = await h.interceptors.request(config())
    assert.equal(h.state.verifications.length, 1)
    assert.notEqual(first.headers['X-Chat-Identity'], second.headers['X-Chat-Identity'])
    assert.equal(h.state.signatures.length, 2)
  })
})


describe('P2P availability failure classification', () => {
  for (const [name, failure] of [
    ['server outage', { response: { status: 503, data: { detail: 'Service unavailable' } } }],
    ['timeout', { code: 'ECONNABORTED', message: 'timeout of 10000ms exceeded' }],
    ['network error', { code: 'ERR_NETWORK' }]
  ]) {
    it(`keeps a ${name} distinct from confirmed maintenance`, async () => {
      const client = { get: async () => { throw failure } }
      await assert.rejects(fetchP2PAvailability(client), error => {
        assert.equal(error.response.data.code, 'p2p_availability_unverified')
        const message = p2pAvailabilityMessage((key, args, fallback) => fallback, error)
        assert.equal(message.toLowerCase().includes('maintenance'), false)
        return true
      })
    })
  }

  it('preserves an explicit maintenance error through the backend interceptor', async () => {
    const h = identityHarness({ availabilityClassifier: isP2PAvailabilityError })
    h.fail({ response: { status: 503, data: { code: 'p2p_maintenance', feature: 'P2P_MAINTENANCE' } } })
    await assert.rejects(h.client.get('/ramp-p2p/order/7/', { authorize: 'peer' }), error =>
      error.response.data.code === 'p2p_maintenance')
    assert.deepEqual(h.events, ['p2p-unavailable'])
  })

  it('preserves explicit maintenance and feature-disabled responses', async () => {
    for (const code of ['p2p_maintenance', 'p2p_feature_disabled']) {
      const failure = availabilityError(code, 'ORDER_ESCROW')
      const client = { get: async () => { throw failure } }
      await assert.rejects(fetchP2PAvailability(client), error => error === failure)
    }
  })
})


describe('P2P chat key loading concurrency', () => {
  function method (name, bindings = {}) {
    const source = readFileSync('src/pages/apps/exchange/peer_to_peer/order.vue', 'utf8')
    const start = source.indexOf(`    async ${name} (`)
    const end = source.indexOf('\n    },', start) + 7
    return new Function(...Object.keys(bindings), `return { ${source.slice(start, end)} }`)(...Object.values(bindings))[name]
  }

  it('fetches messages while the key is still loading and waits for it before decrypting', async () => {
    const events = []
    let finishKey
    const vm = {
      chatRef: 'synthetic-chat', chatSetupScope: () => 'current-chat', chatMessages: [],
      initializeChat: async () => true,
      loadKeyPair: () => new Promise(resolve => { finishKey = resolve }),
      decryptChatMessages: async () => events.push('decrypt'), decryptChatAttachments: async () => {},
      ensureChatWebSocket () {}, $nextTick () {}
    }
    const load = method('loadChatData', {
      fetchChatMembers: async () => [], fetchChatPubkeys: async () => [],
      fetchChatMessages: async () => { events.push('messages'); return { results: [] } }
    })
    const pending = load.call(vm)
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(events, ['messages'])
    assert.equal(vm.chatLoaded, undefined)
    finishKey()
    await pending
    assert.deepEqual(events, ['messages', 'decrypt'])
    assert.equal(vm.chatLoaded, true)
  })

  it('discards a key that finishes loading after the active wallet or order changes', async () => {
    let finish
    let scope = 'wallet-order-a'
    const currentKey = { privkey: 'synthetic-current-key' }
    const vm = { keypair: currentKey, chatSetupScope: () => scope }
    const load = method('loadKeyPair', {
      Store: { getters: { 'global/getWalletIndex': 0 } },
      getEncryptionKeypairFromMnemonic: () => new Promise(resolve => { finish = resolve })
    })
    const pending = load.call(vm)
    scope = 'wallet-order-b'
    finish({ privkey: 'synthetic-obsolete-key' })
    await pending
    assert.equal(vm.keypair, currentKey)
  })
})


describe('P2P order opening latency', () => {
  function method (name, bindings = {}) {
    const source = readFileSync('src/pages/apps/exchange/peer_to_peer/order.vue', 'utf8')
    const start = source.indexOf(`    async ${name} (`)
    const end = source.indexOf('\n    },', start) + 7
    return new Function(...Object.keys(bindings), `return { ${source.slice(start, end)} }`)(...Object.values(bindings))[name]
  }

  it('loads independent order details concurrently while keeping actions behind complete initialization', async () => {
    const started = []
    const finishes = []
    const pendingRequest = name => () => {
      started.push(name)
      return new Promise(resolve => finishes.push(resolve))
    }
    const vm = {
      order: { id: 24, contract: 1 }, fetchOrder: async () => {},
      generateContract: pendingRequest('contract'), fetchAd: pendingRequest('ad'),
      fetchFeedback: pendingRequest('feedback'), fetchStatusList: pendingRequest('history'),
      fetchCounterpartyTradeStats () {}, ensureChatCloseCountdownTimer () {}
    }
    const pending = method('loadData').call(vm)
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(started, ['contract', 'ad', 'feedback', 'history'])
    assert.equal(vm.isloaded, undefined)
    finishes.forEach(finish => finish())
    await pending
    assert.equal(vm.isloaded, true)
    assert.equal(vm.loadingData, false)
  })

  it('fetches contract fees and parameters concurrently before constructing the contract', async () => {
    let finishFees
    let finishContract
    let constructions = 0
    const vm = {
      fetchFees: () => new Promise(resolve => { finishFees = () => { vm.fees = { breakdown: {} }; resolve() } }),
      fetchContract: () => new Promise(resolve => { finishContract = () => { vm.contract = { pubkeys: {}, addresses: {}, timestamp: 1 }; resolve() } })
    }
    const generate = method('generateContract', { RampContract: class { constructor () { constructions++ } } })
    const pending = generate.call(vm)
    assert.equal(typeof finishFees, 'function')
    assert.equal(typeof finishContract, 'function')
    assert.equal(constructions, 0)
    finishFees()
    finishContract()
    await pending
    assert.equal(constructions, 1)
    assert(vm.escrowContract)
  })
})


describe('P2P maintenance banner request isolation', () => {
  for (const data of [{ detail: 'Service unavailable' }, { code: 'p2p_maintenance', feature: 'P2P_MAINTENANCE' }]) {
    it(`does not block authenticated access after a banner-only request fails: ${JSON.stringify(data)}`, async () => {
      const h = identityHarness({ availabilityClassifier: isP2PAvailabilityError })
      h.fail({ response: { status: 503, data } })
      await assert.rejects(h.client.get('/ramp-p2p/feature-control/', {
        authorize: false, p2pMaintenanceIndicator: true
      }))
      assert.deepEqual(h.events, [])
      assert.equal(h.requests[0].headers.Authorization, undefined)
    })
  }

  for (const [url, authorize] of [['/ramp-p2p/order/7/', false], ['/ramp-p2p/feature-control/', 'peer']]) {
    it(`still blocks authoritative availability failures for ${url} with authorize=${authorize}`, async () => {
      const h = identityHarness({ availabilityClassifier: isP2PAvailabilityError })
      h.fail({ response: { status: 503, data: { code: 'p2p_maintenance', feature: 'P2P_MAINTENANCE' } } })
      await assert.rejects(h.client.get(url, { authorize, p2pMaintenanceIndicator: true }))
      assert.deepEqual(h.events, ['p2p-unavailable'])
    })
  }
})


describe('P2P order list loading', () => {
  function load (vm) {
    const source = readFileSync('src/components/ramp/fiat/OrderListings.vue', 'utf8')
    const start = source.indexOf('    async resetAndRefetchListings () {')
    const end = source.indexOf('\n    },', start) + 7
    const methods = new Function('setTimeout', `return { ${source.slice(start, end)} }`)(() => {
      throw new Error('Order lists should not add an artificial loading delay')
    })
    return methods.resetAndRefetchListings.call(vm)
  }

  it('shows returned orders immediately after the fetch completes', async () => {
    let finish
    const vm = {
      $store: { commit () {} }, listings: [{ id: 24 }],
      fetchOrders: () => new Promise(resolve => { finish = resolve })
    }
    const pending = load(vm)
    assert.equal(vm.loading, true)
    finish()
    await pending
    assert.equal(vm.loading, false)
    assert.equal(vm.displayEmptyList, true)
    assert.deepEqual(vm.localListings, [{ id: 24 }])
  })

  it('clears loading if fetching orders fails', async () => {
    const vm = {
      $store: { commit () {} },
      fetchOrders: async () => { throw new Error('Synthetic failure') }
    }
    await assert.rejects(load(vm), /Synthetic failure/)
    assert.equal(vm.loading, false)
  })
})


describe('P2P availability transport errors', () => {
  for (const [failure, reason] of [
    [{ code: 'ECONNABORTED', message: 'timeout of 10000ms exceeded' }, 'timeout'],
    [{ code: 'ERR_NETWORK', message: 'Network Error' }, 'connection']
  ]) {
    it(`reports ${reason} failure without describing it as maintenance`, async () => {
      await assert.rejects(fetchP2PAvailability({ get: async () => { throw failure } }), error => {
        assert.equal(error.response.data.code, 'p2p_availability_unverified')
        assert.equal(error.response.data.reason, reason)
        const message = p2pAvailabilityMessage((key, args, fallback) => fallback, error)
        assert.equal(message.toLowerCase().includes('maintenance'), false)
        assert.match(message, reason === 'timeout' ? /timed out/ : /Could not reach/)
        return true
      })
    })
  }
})
