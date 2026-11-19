import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import axios from 'axios'
import { createRenderer, h, reactive, nextTick } from 'vue'

const origin = 'https://backend.example'
const path = '/api/ramp-p2p/order/payment/image/123/'
const image = () => new Blob(['synthetic image'], { type: 'image/png' })
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const backendSource = readFileSync('src/exchange/backend.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '')
const componentSource = readFileSync('src/components/ramp/fiat/dialogs/AttachmentDialog.vue', 'utf8')
const script = componentSource.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'return')

function backendHarness () {
  const state = reactive({ hash: 'wallet-a', index: 0, chipnet: false, user: { id: 1, user_type: 'peer' } })
  const getters = {
    'global/getWallet': () => ({ walletHash: state.hash }),
    get 'global/getWalletIndex' () { return state.index },
    get 'global/isChipnet' () { return state.chipnet },
    get 'ramp/getUser' () { return state.user },
    'darkmode/getStatus': false
  }
  const requests = [], events = [], deleted = [], listeners = new Map()
  const bus = {
    on (event, callback) { listeners.set(event, callback) },
    off (event, callback) { if (listeners.get(event) === callback) listeners.delete(event) },
    emit (event, payload) { events.push(event); listeners.get(event)?.(payload) }
  }
  let status = 200, response = image, tokenWait = null, missingToken = false
  const client = axios.create({
    adapter: async config => {
      requests.push(config)
      const data = await response()
      if (status !== 200) throw Object.assign(new Error('HTTP failure'), { config, response: { status, data } })
      return { status, data, config }
    }
  })
  const bindings = {
    axios: { create: () => client }, Store: { getters }, wallet: {},
    Notify: { create () {} }, bus, requestManager: { attachTo () {} },
    getAuthToken: async role => { if (tokenWait) await tokenWait; return missingToken ? null : `synthetic-${role}-token` },
    deleteAuthTokenForUserType: async role => { deleted.push(role) },
    fetchP2PAvailability () {}, isP2PAvailabilityError: () => false, p2pRequestFeature: () => null,
    process: { env: { MAINNET_WATCHTOWER_BASE_URL: `${origin}/api`, CHIPNET_WATCHTOWER_BASE_URL: 'https://chipnet.example/api' } }
  }
  const download = new Function(...Object.keys(bindings), `${backendSource}; return downloadPaymentProof`)(...Object.values(bindings))
  return {
    state, getters, requests, events, deleted, bus, listeners, download,
    fail: value => { status = value }, respond: value => { response = value }, waitForToken: value => { tokenWait = value },
    clearToken: () => { missingToken = true }
  }
}

const renderer = createRenderer({
  createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
  insert () {}, remove () {}, setText () {}, setElementText () {}, patchProp () {},
  parentNode: () => null, nextSibling: () => null
})
const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); await nextTick() }

function viewerHarness (download, accountType = 'peer') {
  const backend = backendHarness()
  const requests = [], created = [], revoked = [], events = []
  const bindings = {
    axios, bus: backend.bus, getDarkModeClass () {},
    downloadPaymentProof: download || ((url, role, config) => {
      const pending = deferred()
      requests.push({ url, role, config, ...pending })
      return pending.promise
    }),
    URL: {
      createObjectURL (blob) { const url = `blob:synthetic-${created.length}`; created.push({ url, blob }); return url },
      revokeObjectURL (url) { revoked.push(url) }
    }
  }
  const component = new Function(...Object.keys(bindings), script)(...Object.values(bindings))
  component.render = () => null
  const props = reactive({ show: false, url: path, accountType })
  const app = renderer.createApp({ render: () => h(component, { ...props, onBack: () => events.push('back'), ref: 'viewer' }) })
  app.config.globalProperties.$store = { getters: backend.getters }
  const root = app.mount({})
  return {
    ...backend, props, requests, created, revoked, events,
    get vm () { return root.$refs.viewer },
    async open () { props.show = true; await nextTick() },
    unmount: () => app.unmount()
  }
}

function resolveImage (request) { request.resolve({ status: 200, data: image() }) }

describe('Authenticated P2P proof downloads', () => {
  for (const role of ['peer', 'arbiter']) {
    for (const url of [path, origin + path]) {
      it(`downloads ${role} proof with Token and wallet headers: ${url}`, async () => {
        const h = backendHarness()
        const response = await h.download(url, role)
        assert(response.data instanceof Blob)
        assert.equal(h.requests.length, 1)
        const config = h.requests[0]
        assert.equal(config.url, origin + path)
        assert.equal(config.headers.Authorization, `Token synthetic-${role}-token`)
        assert.equal(config.headers['wallet-hash'], 'wallet-a')
        assert.equal(config.responseType, 'blob')
        assert.equal(config.cache, false)
        assert(!Object.keys(config.headers).some(name => name.toLowerCase() === 'cache-control'))
      })
    }
  }

  for (const url of [
    'https://evil.example' + path, 'http://backend.example' + path,
    '//evil.example' + path, 'https://user:password@backend.example' + path,
    '/api/ramp-p2p/order/123/', '/media/payment.png', '/ramp-p2p/order/payment/image/123/',
    path + '?token=secret', path + '#fragment', path + '?', path + '#',
    '/other/..' + path, path.replace('123', '%31'), path.replace('123', 'abc'),
    path.slice(0, -1), 'data:image/png;base64,AAAA', 'blob:synthetic', '', null,
    ' ' + origin + path, origin + '\\' + path
  ]) {
    it(`rejects untrusted/noncanonical URL before sending: ${url}`, async () => {
      const h = backendHarness()
      await assert.rejects(h.download(url, 'peer'))
      assert.equal(h.requests.length, 0)
    })
  }

  it('rejects unsupported accounts before sending', async () => {
    const h = backendHarness()
    await assert.rejects(h.download(path, 'buyer'))
    assert.equal(h.requests.length, 0)
  })

  it('uses the configured chipnet origin and rejects mainnet proofs on chipnet', async () => {
    const h = backendHarness()
    h.state.chipnet = true
    await assert.rejects(h.download(origin + path, 'peer'))
    assert.equal(h.requests.length, 0)
    await h.download('https://chipnet.example' + path, 'peer')
    assert.equal(h.requests[0].url, 'https://chipnet.example' + path)
  })

  it('preserves session-expiration handling when the token is missing without dispatching', async () => {
    const h = backendHarness()
    h.clearToken()
    await assert.rejects(h.download(path, 'peer'), error => error.code === 'p2p_auth_required')
    assert.equal(h.requests.length, 0)
    assert(h.events.includes('session-expired'))
  })

  it('rejects a downloaded response after switching networks', async () => {
    const h = backendHarness(), wait = deferred()
    h.respond(() => wait.promise)
    const pending = h.download(path, 'peer')
    await settle()
    assert.equal(h.requests.length, 1)
    h.state.chipnet = true
    wait.resolve(image())
    await assert.rejects(pending)
  })

  for (const status of [401, 403, 404, 500]) {
    it(`preserves HTTP ${status} and existing auth-expiration handling`, async () => {
      const h = backendHarness()
      h.fail(status)
      await assert.rejects(h.download(path, 'arbiter'), error => error.response.status === status)
      assert.equal(h.events.includes('session-expired'), [401, 403].includes(status))
      assert.deepEqual(h.deleted, status === 401 ? ['arbiter'] : [])
    })
  }

  for (const change of ['hash', 'index', 'chipnet', 'closed']) {
    it(`blocks dispatch after ${change} changes during token lookup`, async () => {
      const h = backendHarness(), wait = deferred()
      h.waitForToken(wait.promise)
      let current = true
      const pending = h.download(path, 'peer', { isCurrent: () => current })
      await settle()
      if (change === 'closed') current = false
      else h.state[change] = change === 'hash' ? 'wallet-b' : change === 'index' ? 1 : true
      wait.resolve()
      await assert.rejects(pending)
      assert.equal(h.requests.length, 0)
    })
  }
})

describe('Payment proof viewer lifecycle', () => {
  it('passes the explicit peer/arbiter context from every caller', () => {
    for (const [file, role] of [['fiat/PaymentConfirmation', 'peer'], ['fiat/StandByDisplay', 'peer'], ['appeal/AppealDetail', 'arbiter']]) {
      const source = readFileSync(`src/components/ramp/${file}.vue`, 'utf8')
      assert(source.includes(`<AttachmentDialog account-type="${role}"`))
    }
    assert(!componentSource.includes(':src="url"'))
    assert(componentSource.includes('v-if="loading"'))
    assert(componentSource.includes('v-else-if="failed"'))
  })

  for (const role of ['peer', 'arbiter']) {
    it(`loads and displays a local object URL for ${role}, then clears on close`, async () => {
      const h = viewerHarness(null, role)
      await h.open()
      assert.equal(h.vm.loading, true)
      assert.equal(h.vm.imageUrl, null)
      assert.equal(h.requests[0].role, role)
      resolveImage(h.requests[0]); await settle()
      assert.equal(h.vm.loading, false)
      assert.equal(h.vm.imageUrl, 'blob:synthetic-0')
      h.vm.closeProof()
      assert.equal(h.vm.imageUrl, null)
      assert.deepEqual(h.revoked, ['blob:synthetic-0'])
      assert.deepEqual(h.events, ['back'])
      h.unmount()
    })
  }

  for (const status of [401, 403, 404, 500]) {
    it(`shows failure on HTTP ${status} without retaining the previous image`, async () => {
      const h = viewerHarness()
      await h.open(); resolveImage(h.requests[0]); await settle()
      h.props.url = path.replace('123', '456'); await nextTick()
      assert.equal(h.vm.imageUrl, null)
      assert.equal(h.vm.loading, true)
      assert.deepEqual(h.revoked, ['blob:synthetic-0'])
      h.requests[1].reject({ response: { status } }); await settle()
      assert.equal(h.vm.failed, true)
      assert.equal(h.vm.loading, false)
      assert.equal(h.vm.imageUrl, null)
      h.unmount()
    })
  }

  for (const change of ['close-event', 'show', 'url', 'hash', 'index', 'chipnet', 'accountType', 'user', 'unmount', 'session-expired', 'p2p-auth-cleared']) {
    it(`disregards stale responses after ${change} and cancels the old request`, async () => {
      const h = viewerHarness()
      await h.open()
      const old = h.requests[0]
      if (change === 'close-event') h.vm.closeProof()
      else if (change === 'show') h.props.show = false
      else if (change === 'url') h.props.url = path.replace('123', '456')
      else if (change === 'accountType') h.props.accountType = 'arbiter'
      else if (change === 'unmount') h.unmount()
      else if (change === 'session-expired') h.bus.emit(change)
      else if (change === 'p2p-auth-cleared') h.bus.emit(change, { walletHash: 'wallet-a', userType: 'peer' })
      else h.state[change] = { hash: 'wallet-b', index: 1, chipnet: true, user: { id: 2, user_type: 'peer' } }[change]
      await nextTick()
      assert(old.config.cancelToken.reason)
      assert.equal(old.config.isCurrent(), false)
      if (change === 'url') {
        resolveImage(h.requests[1]); await settle()
        assert.equal(h.vm.imageUrl, 'blob:synthetic-0')
      }
      resolveImage(old); await settle()
      assert.equal(h.created.length, change === 'url' ? 1 : 0)
      if (change !== 'unmount') h.unmount()
      assert.equal(h.listeners.size, 0)
    })
  }

  for (const change of ['hash', 'index', 'chipnet', 'accountType', 'user', 'unmount']) {
    it(`immediately clears and revokes a displayed image after ${change}`, async () => {
      const h = viewerHarness()
      await h.open(); resolveImage(h.requests[0]); await settle()
      if (change === 'unmount') h.unmount()
      else if (change === 'accountType') h.props.accountType = 'arbiter'
      else h.state[change] = { hash: 'wallet-b', index: 1, chipnet: true, user: null }[change]
      if (change === 'accountType') await nextTick()
      assert.deepEqual(h.revoked, ['blob:synthetic-0'])
      if (change !== 'unmount') {
        assert.equal(h.vm.imageUrl, null)
        assert.equal(h.requests.length, 1)
        h.unmount()
      }
    })
  }

  it('renders a validation failure without issuing a request', async () => {
    const backend = backendHarness()
    const h = viewerHarness(backend.download)
    h.props.url = 'https://evil.example' + path
    await h.open(); await settle()
    assert.equal(h.vm.failed, true)
    assert.equal(h.vm.loading, false)
    assert.equal(backend.requests.length, 0)
    h.unmount()
  })

  it('ignores a stale failure while a replacement image is loading', async () => {
    const h = viewerHarness()
    await h.open()
    h.props.url = path.replace('123', '456'); await nextTick()
    h.requests[0].reject(new Error('Old failure')); await settle()
    assert.equal(h.vm.loading, true)
    assert.equal(h.vm.failed, false)
    resolveImage(h.requests[1]); await settle()
    assert.equal(h.vm.imageUrl, 'blob:synthetic-0')
    h.unmount()
  })

  for (const data of [new Blob(['html'], { type: 'text/html' }), new Blob([], { type: 'image/png' }), { type: 'image/png', size: 1 }]) {
    it('rejects malformed/nonimage responses without creating an object URL', async () => {
      const h = viewerHarness()
      await h.open()
      h.requests[0].resolve({ status: 200, data }); await settle()
      assert.equal(h.vm.failed, true)
      assert.equal(h.created.length, 0)
      h.unmount()
    })
  }
})
