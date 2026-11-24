import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import BigNumber from 'bignumber.js'

const exchangeSource = readFileSync('src/exchange/index.js', 'utf8')
const helperSource = exchangeSource.slice(exchangeSource.indexOf('function p2pDecimal')).replaceAll('export function', 'function')
const helpers = new Function('BigNumber', 'SATOSHI_PER_BCH', `${helperSource}; return { getP2PAmountBounds, p2pAmountToSatoshis, p2pSatoshisToAmount, p2pQuoteKey }`)(BigNumber, 100000000)
const { getP2PAmountBounds, p2pAmountToSatoshis, p2pSatoshisToAmount, p2pQuoteKey } = helpers
const form = readFileSync('src/pages/apps/exchange/peer_to_peer/order-form.vue', 'utf8')
const formatter = readFileSync('src/exchange/backend.js', 'utf8').split('export function p2pErrorMessage')[1]
const p2pErrorMessage = new Function(`return function p2pErrorMessage${formatter}`)()

function method (name, bindings = {}) {
  const start = Math.max(form.indexOf(`    ${name} (`), form.indexOf(`    async ${name} (`))
  const end = form.indexOf('\n    },', start) + 7
  const values = { ...helpers, p2pErrorMessage, ...bindings }
  return new Function(...Object.keys(values), `return { ${form.slice(start, end)} }`)(...Object.values(values))[name]
}

function ad (changes = {}) {
  return { id: 9, trade_type: 'SELL', price: '12477.1000000000', trade_limits_in_fiat: true, trade_floor: '1.00', trade_ceiling: '10.00', trade_amount: '13171.71', ...changes }
}

function harness (changes = {}) {
  const notifications = []
  const posts = []
  const gets = []
  let response = ad(changes)
  let postError
  let getError
  const backend = {
    async get (...args) {
      gets.push(args)
      if (getError) throw getError
      return { data: { ...response } }
    },
    async post (...args) {
      posts.push(args)
      if (postError) throw postError
      return { data: { order: { id: 10 } } }
    }
  }
  const vm = {
    ad: ad(changes), amount: '0.00008015', byFiat: false, state: 'initial',
    reviewedQuote: null, balanceExceeded: false, $refs: {},
    $route: { params: { ad: 9 } }, $q: { notify: n => notifications.push(n) },
    $router: { push: async () => {} }, $emit () {},
    $t: key => key, handleRequestError: error => notifications.push({ message: error.message }),
    orderConfirm () { this.openDialog = true }
  }
  for (const name of ['getTradeAmount', 'updateInput', 'toggleAmountCurrency', 'isValidInputAmount', 'fetchAd', 'returnToQuote', 'createOrder', 'submit']) {
    vm[name] = method(name, { backend }).bind(vm)
  }
  return { vm, notifications, posts, gets, refreshTo: value => { response = value }, rejectPost: error => { postError = error }, rejectGet: error => { getError = error } }
}

describe('P2P exact order amounts', () => {
  it('selects 8015 sats for Min in either input currency', () => {
    const { vm } = harness()
    for (const byFiat of [false, true]) {
      vm.byFiat = byFiat
      vm.updateInput(false, true)
      assert.equal(vm.getTradeAmount(), 8015)
      assert.equal(vm.amount, '0.00008015')
      assert.equal(vm.byFiat, false)
    }
    assert.throws(() => p2pAmountToSatoshis('0.00008012', false, ad()), /between/)
    assert.throws(() => p2pAmountToSatoshis('1', true, ad()), /between/)
  })

  it('floors Max at the smaller of ceiling and remaining fiat', () => {
    for (const remaining of ['13171.71', '3.333333333333333333333333333']) {
      const quote = ad({ trade_amount: remaining })
      const h = harness({ trade_amount: remaining })
      h.vm.updateInput(true, false)
      const sats = h.vm.getTradeAmount()
      const fiat = new BigNumber(sats).shiftedBy(-8).times(quote.price)
      const cap = BigNumber.minimum(quote.trade_ceiling, remaining)
      assert(fiat.lte(cap))
      assert(new BigNumber(sats + 1).shiftedBy(-8).times(quote.price).gt(cap))
    }
  })

  it('uses inventory units from trade_limits_in_fiat regardless of a legacy inventory flag', () => {
    assert.deepEqual(getP2PAmountBounds(ad({ trade_amount: '2', trade_amount_in_fiat: false })), { min: 8015, max: 16029 })
    assert.deepEqual(getP2PAmountBounds(ad({ trade_limits_in_fiat: false, trade_floor: '0.00000001', trade_ceiling: '0.00000010', trade_amount: '0.00000003', trade_amount_in_fiat: true })), { min: 1, max: 3 })
  })

  it('handles exact boundaries and decimals sensitive to floating point', () => {
    const quote = ad({ price: '0.1', trade_floor: '0.000000029', trade_ceiling: '0.000000029', trade_amount: '0.000000029' })
    assert.deepEqual(getP2PAmountBounds(quote), { min: 29, max: 29 })
    assert.equal(p2pAmountToSatoshis('0.00000029', false, quote), 29)
    assert.equal(p2pAmountToSatoshis('0.000000029', true, quote), 29)
    const justAbove = ad({ price: '1', trade_floor: '0.000000010000000000000000000001', trade_ceiling: '1' })
    assert.equal(getP2PAmountBounds(justAbove).min, 2)
    const justBelow = ad({ price: '1', trade_floor: '0', trade_ceiling: '0.000000019999999999999999999999' })
    assert.equal(getP2PAmountBounds(justBelow).max, 1)
  })

  it('preserves BCH limits and integer satoshis', () => {
    const quote = ad({ trade_limits_in_fiat: false, trade_floor: '0.00000029', trade_ceiling: '0.00000031', trade_amount: '0.00000030' })
    assert.deepEqual(getP2PAmountBounds(quote), { min: 29, max: 30 })
    assert.equal(p2pAmountToSatoshis('0.00000029', false, quote), 29)
    assert.equal(p2pAmountToSatoshis(p2pSatoshisToAmount(30, true, quote), true, quote), 30)
    assert.throws(() => p2pAmountToSatoshis('0.000000291', false, quote), /whole satoshis/)
  })

  it('validates manual entries without changing them', () => {
    const { vm } = harness()
    for (const value of ['0.00008012', '0.00080147', '', '0', '-1', 'NaN', 'Infinity', '0.00008015001', undefined]) {
      vm.amount = value
      assert.equal(vm.isValidInputAmount(), false, String(value))
      assert.equal(vm.amount, value)
    }
    vm.amount = '0.00008015'
    assert.equal(vm.isValidInputAmount(), true)
  })

  it('rejects empty intervals, malformed limits, and invalid or nonpositive prices', () => {
    for (const changes of [
      { trade_floor: '2', trade_ceiling: '1' }, { trade_amount: '0' },
      { price: '1000000000', trade_floor: '1', trade_ceiling: '2' },
      { trade_amount: undefined }, { trade_floor: '-1' },
      ...['0', '-1', '', 'NaN', 'Infinity', undefined, null].map(price => ({ price }))
    ]) {
      assert.throws(() => getP2PAmountBounds(ad(changes)), /valid|positive/)
    }
    assert.deepEqual(getP2PAmountBounds(ad({ price: '1', trade_floor: '0', trade_ceiling: '0.00000001' })), { min: 1, max: 1 })
  })

  it('validates manual fiat entries against the satoshi interval', () => {
    const { vm } = harness()
    vm.byFiat = true
    for (const amount of ['0.99', '1', '10.01', '11']) {
      vm.amount = amount
      assert.equal(vm.isValidInputAmount(), false)
      assert.equal(vm.amount, amount)
    }
    vm.amount = '1.01'
    assert.equal(vm.isValidInputAmount(), true)
    assert.equal(vm.getTradeAmount(), 8094)
  })

  it('selects exact BCH-denominated Min and Max in the form', () => {
    const { vm } = harness({ trade_limits_in_fiat: false, trade_floor: '0.00000029', trade_ceiling: '0.00000031', trade_amount: '0.00000030' })
    vm.updateInput(false, true)
    assert.equal(vm.getTradeAmount(), 29)
    vm.updateInput(true, false)
    assert.equal(vm.getTradeAmount(), 30)
  })

  it('keeps an exact converted fiat amount when the keypad precision limit is reached', () => {
    const vm = { amount: '1.000039565', byFiat: true }
    method('setAmount').call(vm, '1')
    assert.equal(vm.amount, '1.000039565')
  })

  it('switches currency without losing the selected satoshi amount', () => {
    const { vm } = harness()
    vm.toggleAmountCurrency()
    assert.equal(vm.byFiat, true)
    assert.equal(vm.amount, '1.000039565')
    assert.equal(vm.getTradeAmount(), 8015)
    vm.toggleAmountCurrency()
    assert.equal(vm.amount, '0.00008015')
  })
})

describe('P2P fresh quote submission', () => {
  it('refreshes without cache and submits positive integer sats', async () => {
    const h = harness()
    h.vm.submit()
    await h.vm.createOrder()
    assert.equal(h.gets.length, 1)
    assert.equal(h.gets[0][1].cache, false)
    assert.deepEqual(h.posts[0][1], { ad: 9, trade_amount: 8015 })
    assert.equal(h.vm.creatingOrder, false)
  })

  for (const changes of [{ price: '12500' }, { trade_floor: '2' }, { trade_ceiling: '9' }, { trade_amount: '10000' }]) {
    it(`requires review for a refreshed quote change: ${JSON.stringify(changes)}`, async () => {
      const h = harness()
      h.vm.submit()
      h.refreshTo(ad(changes))
      await h.vm.createOrder()
      assert.equal(h.posts.length, 0)
      assert.equal(h.vm.amount, '0.00008015')
      assert.equal(h.vm.state, 'initial')
      assert.equal(h.vm.openDialog, false)
      assert.match(h.notifications[0].message, /changed.*Review/)
    })
  }

  it('detects a websocket update while the confirmation is open', async () => {
    const h = harness()
    h.vm.submit()
    h.vm.ad = ad({ price: '12500' })
    h.refreshTo(h.vm.ad)
    await h.vm.createOrder()
    assert.equal(h.posts.length, 0)
    assert.match(h.notifications[0].message, /changed/)
    h.vm.submit()
    await h.vm.createOrder()
    assert.equal(h.posts.length, 1)
  })

  it('revalidates manual input before posting', async () => {
    const h = harness()
    h.vm.amount = '0.00008012'
    h.vm.submit()
    await h.vm.createOrder()
    assert.equal(h.posts.length, 0)
    assert.match(h.notifications[0].message, /between/)
  })

  it('shows a backend race rejection, refreshes once, and does not retry the order', async () => {
    const h = harness()
    h.vm.submit()
    h.rejectPost({ response: { status: 400, data: { error: 'Order amount is outside the ad trade limits' } } })
    await h.vm.createOrder()
    assert.equal(h.posts.length, 1)
    assert.equal(h.gets.length, 2)
    assert.equal(h.notifications[0].message, 'Order amount is outside the ad trade limits')
    assert.equal(h.vm.state, 'initial')
    assert.equal(h.vm.amount, '0.00008015')
    assert.equal(h.vm.loadSubmitButton, false)
  })

  it('blocks submission when the authoritative refresh fails', async () => {
    const h = harness()
    h.rejectGet(new Error('Quote refresh failed'))
    await h.vm.createOrder()
    assert.equal(h.posts.length, 0)
    assert.equal(h.vm.creatingOrder, false)
  })

  it('initializes the form with the exact valid minimum', async () => {
    const { vm } = harness()
    vm.ad = null
    await vm.fetchAd()
    assert.equal(vm.amount, '0.00008015')
    assert.equal(vm.getTradeAmount(), 8015)
  })

  it('does not reset manual input on an ordinary ad refresh', async () => {
    const h = harness()
    h.vm.amount = '0.00009'
    h.vm.isloaded = false
    await h.vm.fetchAd()
    assert.equal(h.vm.amount, '0.00009')
  })

  it('does not let an older polling response overwrite a refreshed quote', async () => {
    const { vm } = harness()
    const pending = []
    vm.fetchAd = method('fetchAd', { backend: { get: () => new Promise(resolve => pending.push(resolve)) } }).bind(vm)
    const oldRefresh = vm.fetchAd()
    const newRefresh = vm.fetchAd(true)
    pending[1]({ data: ad({ price: '12500' }) })
    await newRefresh
    pending[0]({ data: ad() })
    await oldRefresh
    assert.equal(vm.ad.price, '12500')
  })

  it('rejects a superseded submission refresh', async () => {
    const { vm } = harness()
    const pending = []
    vm.fetchAd = method('fetchAd', { backend: { get: () => new Promise(resolve => pending.push(resolve)) } }).bind(vm)
    const strictRefresh = vm.fetchAd(true)
    const pollingRefresh = vm.fetchAd()
    pending[1]({ data: ad({ price: '12500' }) })
    await pollingRefresh
    pending[0]({ data: ad() })
    await assert.rejects(strictRefresh, /changed while refreshing/)
    assert.equal(vm.ad.price, '12500')
  })

  it('blocks cached responses from the submission refresh', async () => {
    const { vm } = harness()
    vm.fetchAd = method('fetchAd', { backend: { get: async () => ({ data: ad(), cached: true }) } }).bind(vm)
    await assert.rejects(vm.fetchAd(true), /Unable to refresh/)
  })

  it('blocks a quote with no remaining interval after refresh without replacing the draft', async () => {
    const h = harness()
    h.vm.submit()
    h.refreshTo(ad({ trade_amount: '0.5' }))
    await h.vm.createOrder()
    assert.equal(h.posts.length, 0)
    assert.equal(h.vm.isValidInputAmount(), false)
    assert.match(h.vm.amountError, /No valid satoshi amount/)
    assert.equal(h.vm.amount, '0.00008015')
  })

  it('ignores decimal formatting differences when comparing quotes', () => {
    assert.equal(p2pQuoteKey(ad()), p2pQuoteKey(ad({ price: '12477.1', trade_floor: '1' })))
  })
})
