import assert from 'node:assert/strict'
import {
  isMaintenanceRestError,
  parseRetryAfterSeconds,
  getRetryAfterSeconds,
  isMaintenanceWsError,
  parseMaintenanceWsError,
  isDrainPath,
  shouldTreatAsMaintenance,
  assertNewOperationAllowed,
  MaintenanceError,
  isUpdateRequired,
  normalizeStatus,
  joinStatusUrl,
  fetchCardMaintenanceStatus,
  getCachedMaintenanceStatus,
  MAINTENANCE_CACHE_KEY,
  DEFAULT_RETRY_AFTER_SECONDS,
} from '../src/services/card/maintenance.js'

function maintenanceRestError(url = '/api/cards/preimage/', retryAfter = '120') {
  return {
    config: { url },
    response: {
      status: 503,
      headers: { 'Retry-After': retryAfter },
      data: { error: 'MAINTENANCE', message: 'Upgrading', eta: '10 min' },
    },
  }
}

describe('card maintenance', () => {
  it('detects REST 503 MAINTENANCE', () => {
    assert.equal(isMaintenanceRestError(maintenanceRestError()), true)
    assert.equal(isMaintenanceRestError({ response: { status: 503, data: {} } }), false)
    assert.equal(isMaintenanceRestError({ response: { status: 500, data: { error: 'MAINTENANCE' } } }), false)
  })

  it('honors Retry-After, defaults to 120', () => {
    assert.equal(parseRetryAfterSeconds('30'), 30)
    assert.equal(parseRetryAfterSeconds(null), DEFAULT_RETRY_AFTER_SECONDS)
    assert.equal(getRetryAfterSeconds(maintenanceRestError('/x', '45')), 45)
    assert.equal(getRetryAfterSeconds({ response: { status: 503, headers: {}, data: {} } }), DEFAULT_RETRY_AFTER_SECONDS)
  })

  it('detects WS -32003', () => {
    assert.equal(isMaintenanceWsError({ code: -32003 }), true)
    assert.equal(isMaintenanceWsError({ error: { code: -32003, message: 'Down', eta: 'soon' } }), true)
    assert.equal(isMaintenanceWsError({ code: -32603 }), false)
    const parsed = parseMaintenanceWsError({ error: { code: -32003, message: 'Down', eta: '5m' } })
    assert.equal(parsed.message, 'Down')
    assert.equal(parsed.eta, '5m')
  })

  it('exempts drain paths from maintenance splash', () => {
    for (const url of [
      '/transactions/broadcast/',
      '/cards/1/bch-balance/',
      '/cards/balance/',
      '/contracts/abc/ft/balances/',
      '/cards/1/transactions/',
      '/cards/1/sweep_fungible_tokens/',
    ]) {
      assert.equal(isDrainPath(url), true)
      assert.equal(shouldTreatAsMaintenance(maintenanceRestError(url)), false)
    }
    assert.equal(isDrainPath('/api/cards/preimage/'), false)
    assert.equal(shouldTreatAsMaintenance(maintenanceRestError('/api/cards/preimage/')), true)
  })

  it('lets an in-flight spend finish when maintenance flips mid-tap', () => {
    const status = { ...normalizeStatus({ maintenance: false }), offline: false }
    assert.doesNotThrow(() => assertNewOperationAllowed(status))
    status.maintenance = true
    status.message = 'Upgrading'
    status.eta = '10 min'
    assert.throws(() => assertNewOperationAllowed(status), MaintenanceError)
    const inFlightSpend = maintenanceRestError('/transactions/broadcast/')
    assert.equal(shouldTreatAsMaintenance(inFlightSpend), false)
    let attempts = 0
    const spendOnce = () => {
      attempts++
      if (attempts < 3) throw inFlightSpend
      return { txid: 'abc' }
    }
    let result = null
    for (let i = 0; i < 3; i++) {
      try {
        result = spendOnce()
        break
      } catch (error) {
        assert.equal(shouldTreatAsMaintenance(error), false)
      }
    }
    assert.equal(result?.txid, 'abc')
  })

  it('flags update required from min_app_version', () => {
    assert.equal(isUpdateRequired({ min_app_version: 'v0.28.0' }, 'v0.27.0'), true)
    assert.equal(isUpdateRequired({ min_app_version: 'v0.27.0' }, 'v0.27.0'), false)
    assert.equal(isUpdateRequired({ min_app_version: '' }, 'v0.27.0'), false)
  })

  it('caches status for offline launch', async () => {
    const store = {}
    global.localStorage = {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v) },
      removeItem: (k) => { delete store[k] },
    }
    const live = await fetchCardMaintenanceStatus({
      baseUrl: 'https://cards.example.com',
      fetchImpl: async () => ({ json: async () => ({ maintenance: true, message: 'Down', eta: '5m', min_app_version: 'v0.28.0' }) }),
    })
    assert.equal(live.maintenance, true)
    assert.ok(store[MAINTENANCE_CACHE_KEY])
    assert.equal(getCachedMaintenanceStatus()?.maintenance, true)
    const offline = await fetchCardMaintenanceStatus({
      baseUrl: 'https://cards.example.com',
      fetchImpl: async () => { throw new Error('offline') },
    })
    assert.equal(offline.maintenance, true)
    assert.equal(offline.offline, true)
    delete global.localStorage
  })

  it('does not double the /api prefix in the status URL', () => {
    assert.equal(joinStatusUrl('https://cards.example.com/api'), 'https://cards.example.com/api/status/')
    assert.equal(joinStatusUrl('https://cards.example.com/api/'), 'https://cards.example.com/api/status/')
    assert.equal(joinStatusUrl('https://cards.example.com'), 'https://cards.example.com/api/status/')
  })

  it('falls back to cache on HTTP error or empty body', async () => {
    const store = {}
    global.localStorage = {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v) },
      removeItem: (k) => { delete store[k] },
    }
    const live = await fetchCardMaintenanceStatus({
      baseUrl: 'https://cards.example.com/api',
      fetchImpl: async (url) => {
        assert.equal(url, 'https://cards.example.com/api/status/')
        return { ok: true, json: async () => ({ maintenance: true, message: 'Down', eta: '5m' }) }
      },
    })
    assert.equal(live.maintenance, true)
    assert.equal(live.offline, false)
    const on404 = await fetchCardMaintenanceStatus({
      baseUrl: 'https://cards.example.com/api',
      fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({}) }),
    })
    assert.equal(on404.maintenance, true)
    assert.equal(on404.offline, true)
    const onEmpty = await fetchCardMaintenanceStatus({
      baseUrl: 'https://cards.example.com/api',
      fetchImpl: async () => ({ ok: true, json: async () => null }),
    })
    assert.equal(onEmpty.maintenance, true)
    assert.equal(onEmpty.offline, true)
    delete global.localStorage
  })
})
