import assert from 'node:assert/strict'

import {
  EliteTxType,
  processEliteEligibility
} from '../src/utils/engagementhub-utils/elite-program.js'
import { ELITEPROGRAM_URL, resetEngagementHubApiMock } from './mocks/engagementhub-api.mjs'
import { Store, resetStoreMock } from './mocks/store.mjs'

const originalWarn = console.warn
const originalApiKey = process.env.ELITE_PROGRAM_API_KEY

let calls = []
let warnings = []

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), {
  response: { status, data: { detail: 'rejected' } }
})

const networkError = () => new Error('Network Error')

const installHandler = (handler) => {
  ELITEPROGRAM_URL.post = async (...args) => {
    calls.push(args)
    return handler(calls.length, ...args)
  }
}

describe('processEliteEligibility', () => {
  before(() => {
    process.env.ELITE_PROGRAM_API_KEY = 'otc-secret'
  })

  after(() => {
    process.env.ELITE_PROGRAM_API_KEY = originalApiKey
  })

  beforeEach(() => {
    calls = []
    warnings = []
    console.warn = (...args) => warnings.push(args)
    resetStoreMock()
    resetEngagementHubApiMock()
  })

  afterEach(() => {
    console.warn = originalWarn
    // The store mock is shared with the MLS and chat specs, so never leave a
    // chipnet flag or wallet override behind.
    resetStoreMock()
  })

  it('does not claim on chipnet', async () => {
    Store.getters['global/isChipnet'] = true
    let called = false
    ELITEPROGRAM_URL.post = async () => {
      called = true
    }

    const result = await processEliteEligibility({ type: EliteTxType.OTC }, [0])

    assert.equal(result, null)
    assert.equal(called, false)
  })

  it('posts the claim and returns the response body', async () => {
    installHandler(() => Promise.resolve({ data: { code: 'eligible' } }))
    const claim = { type: EliteTxType.OTC, tx_id: 'deadbeef' }

    const result = await processEliteEligibility(claim, [0])

    assert.deepEqual(result, { code: 'eligible' })
    assert.equal(calls.length, 1)
    assert.equal(calls[0][0], 'process_eligibility/')
    assert.deepEqual(calls[0][1], claim)
    assert.deepEqual(calls[0][2], {
      headers: { 'X-Elite-Program-Key': 'otc-secret' },
      skipAbortManager: true
    })
    assert.equal(warnings.length, 0)
  })

  it('retries a 503 and returns the successful answer', async () => {
    installHandler((attempt) => attempt === 1
      ? Promise.reject(httpError(503))
      : Promise.resolve({ data: { code: 'eligible' } }))

    const result = await processEliteEligibility({ type: EliteTxType.OTC }, [0])

    assert.deepEqual(result, { code: 'eligible' })
    assert.equal(calls.length, 2)
  })

  it('retries a network error, which has no response status', async () => {
    installHandler((attempt) => attempt === 1
      ? Promise.reject(networkError())
      : Promise.resolve({ data: { code: 'eligible' } }))

    const result = await processEliteEligibility({ type: EliteTxType.OTC }, [0])

    assert.deepEqual(result, { code: 'eligible' })
    assert.equal(calls.length, 2)
  })

  it('treats 409 as already claimed and does not retry', async () => {
    installHandler(() => Promise.reject(httpError(409)))

    const result = await processEliteEligibility({ type: EliteTxType.OTC }, [0])

    assert.equal(result, null)
    assert.equal(calls.length, 1)
    assert.equal(warnings.length, 0)
  })

  it('stops immediately on a 403 without warning', async () => {
    installHandler(() => Promise.reject(httpError(403)))

    const result = await processEliteEligibility({ type: EliteTxType.OTC }, [0])

    assert.equal(result, null)
    assert.equal(calls.length, 1)
    assert.equal(warnings.length, 0)
  })

  it('stops immediately on a 404 without warning', async () => {
    installHandler(() => Promise.reject(httpError(404)))

    const result = await processEliteEligibility({ type: EliteTxType.OTC }, [0])

    assert.equal(result, null)
    assert.equal(calls.length, 1)
    assert.equal(warnings.length, 0)
  })

  it('warns once on an unexpected status and does not retry', async () => {
    installHandler(() => Promise.reject(httpError(500)))

    const result = await processEliteEligibility({ type: EliteTxType.OTC }, [0])

    assert.equal(result, null)
    assert.equal(calls.length, 1)
    assert.equal(warnings.length, 1)
    assert.match(warnings[0][0], /\(500\)/)
  })

  it('gives up when every retry is a 503', async () => {
    installHandler(() => Promise.reject(httpError(503)))

    const result = await processEliteEligibility({ type: EliteTxType.OTC }, [0, 0])

    assert.equal(result, null)
    // The initial attempt plus one for each configured delay.
    assert.equal(calls.length, 3)
  })

  it('stops when a retry answers 409', async () => {
    installHandler((attempt) => Promise.reject(httpError(attempt === 1 ? 503 : 409)))

    const result = await processEliteEligibility({ type: EliteTxType.OTC }, [0, 0])

    assert.equal(result, null)
    assert.equal(calls.length, 2)
  })
})
