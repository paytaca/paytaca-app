import assert from 'node:assert/strict'

import {
  enrollEliteProgram,
  getAssetsThresholds,
  getEliteProgramHistorySummaryData,
  getEliteProgramMonthlyStats,
  getEliteProgramSummaryData,
  getEliteProgramTopupsData,
  getEliteProgramTransactionsData,
  processEliteEligibility
} from '../src/utils/engagementhub-utils/elite-program.js'
import { ELITEPROGRAM_URL, resetEngagementHubApiMock } from './mocks/engagementhub-api.mjs'
import { Store } from './mocks/store.mjs'

const WALLET = 'a'.repeat(64)
const PROGRAM_ID = 'program-1'

let getCalls = []
let postCalls = []

const install = () => {
  ELITEPROGRAM_URL.get = async (...args) => {
    getCalls.push(args)
    return { status: 200, data: {} }
  }
  ELITEPROGRAM_URL.post = async (...args) => {
    postCalls.push(args)
    return { status: 200, data: {} }
  }
}

describe('elite program wallet-hash header', () => {
  const originalApiKey = process.env.ELITE_PROGRAM_API_KEY
  const originalGetWallet = Store.getters['global/getWallet']

  beforeEach(() => {
    getCalls = []
    postCalls = []
    install()
    Store.getters['global/getWallet'] = () => ({ walletHash: WALLET })
    process.env.ELITE_PROGRAM_API_KEY = 'elite-key'
  })

  afterEach(() => {
    Store.getters['global/getWallet'] = originalGetWallet
  })

  after(() => {
    process.env.ELITE_PROGRAM_API_KEY = originalApiKey
    resetEngagementHubApiMock()
  })

  it('sends wallet-hash on all six reads and no API key', async () => {
    await getAssetsThresholds()
    await getEliteProgramSummaryData(PROGRAM_ID)
    await getEliteProgramTransactionsData(PROGRAM_ID, 10, 0)
    await getEliteProgramTopupsData(PROGRAM_ID, 10, 0)
    await getEliteProgramHistorySummaryData(PROGRAM_ID)
    await getEliteProgramMonthlyStats(PROGRAM_ID)

    assert.deepEqual(getCalls.map(([url]) => url), [
      'get_assets_min_thresholds/',
      `${PROGRAM_ID}/`,
      `${PROGRAM_ID}/transactions/`,
      `${PROGRAM_ID}/topups/`,
      `${PROGRAM_ID}/summary/`,
      `${PROGRAM_ID}/monthly/`
    ])

    for (const [url, config] of getCalls) {
      assert.equal(config.headers['wallet-hash'], WALLET, url)
      assert.equal(Object.hasOwn(config.headers, 'X-Elite-Program-Key'), false, url)
    }
  })

  it('omits the header when no wallet is active', async () => {
    Store.getters['global/getWallet'] = () => undefined

    await getEliteProgramSummaryData(PROGRAM_ID)

    assert.equal(Object.hasOwn(getCalls[0][1].headers, 'wallet-hash'), false)
  })

  it('keeps only the API key on the two writes', async () => {
    await enrollEliteProgram(WALLET, 'lookup-key')
    await processEliteEligibility({ type: 'otc' })

    assert.deepEqual(postCalls.map(([url]) => url), ['enroll/', 'process_eligibility/'])
    for (const [url, , config] of postCalls) {
      assert.equal(config.headers['X-Elite-Program-Key'], 'elite-key', url)
      assert.equal(Object.hasOwn(config.headers, 'wallet-hash'), false, url)
    }
  })
})
