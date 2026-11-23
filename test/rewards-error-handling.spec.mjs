import assert from 'node:assert/strict'

import {
  REWARDS_URL,
  resetEngagementHubApiMock
} from './mocks/engagementhub-api.mjs'
import {
  fetchRfPromoReferrals,
  getPromoRedeemHistory,
  getTransactionsData,
  processReferralCode,
  recordPointsRedemption
} from '../src/utils/engagementhub-utils/rewards.js'

const respondWith = (status, data) => async () => ({ status, data })

const rejectWith = (status, data) => async () => {
  const error = new Error(`Request failed with status code ${status}`)
  error.response = { status, data }
  throw error
}

const listFetchers = [
  ['getTransactionsData', () => getTransactionsData({ ur_id: 1 })],
  ['fetchRfPromoReferrals', () => fetchRfPromoReferrals({ rp_id: 1 })],
  ['getPromoRedeemHistory(ur)', () => getPromoRedeemHistory('ur', { ur_id: 1 })],
  ['getPromoRedeemHistory(rp)', () => getPromoRedeemHistory('rp', { rp_id: 1 })]
]

describe('rewards error payload handling', () => {
  let originalConsoleError

  beforeEach(() => {
    originalConsoleError = console.error
    console.error = () => {}
  })

  afterEach(() => {
    console.error = originalConsoleError
    resetEngagementHubApiMock()
  })

  describe('postFetchData callers', () => {
    for (const [name, call] of listFetchers) {
      it(`${name} returns the body on 200`, async () => {
        const body = { overall_data: [] }
        REWARDS_URL.post = respondWith(200, body)

        assert.deepEqual(await call(), body)
      })

      it(`${name} returns null on 404`, async () => {
        REWARDS_URL.post = rejectWith(404, { error: 'Not found.' })

        assert.equal(await call(), null)
      })

      it(`${name} returns null on 500`, async () => {
        REWARDS_URL.post = rejectWith(500, {
          error: 'An unexpected error occurred.',
          reference: 'abc'
        })

        assert.equal(await call(), null)
      })
    }

    it('returns null when the request is aborted', async () => {
      REWARDS_URL.post = async () => {
        const error = new Error('Request aborted')
        error.code = 'ECONNABORTED'
        throw error
      }

      assert.equal(await getTransactionsData({ ur_id: 1 }), null)
    })
  })

  describe('recordPointsRedemption', () => {
    it('reports the server error body with its status', async () => {
      REWARDS_URL.post = rejectWith(404, { error: 'Not found.' })

      const result = await recordPointsRedemption({ promo_id: 1 })

      assert.equal(result.error, 'Not found.')
      assert.equal(result.status, 404)
    })

    it('normalises a DRF-shaped detail body into error', async () => {
      REWARDS_URL.post = rejectWith(404, { detail: 'Not found.' })

      const result = await recordPointsRedemption({ promo_id: 1 })

      assert.equal(result.error, 'Not found.')
      assert.equal(result.detail, 'Not found.')
      assert.equal(result.status, 404)
    })

    it('returns an empty error on success', async () => {
      REWARDS_URL.post = respondWith(200, { message: 'ok' })

      assert.deepEqual(
        await recordPointsRedemption({ promo_id: 1 }),
        { error: '', status: 200 }
      )
    })
  })

  describe('processReferralCode', () => {
    it('passes a self-referral body through unchanged', async () => {
      const body = { error: 'You cannot use your own referral code.', code: 'self_referral' }
      REWARDS_URL.post = rejectWith(403, body)

      assert.deepEqual(await processReferralCode({}), body)
    })

    it('passes a generic error body through unchanged', async () => {
      const body = { error: 'Referral code is invalid.' }
      REWARDS_URL.post = rejectWith(400, body)

      assert.deepEqual(await processReferralCode({}), body)
    })

    it('returns an empty object on success', async () => {
      REWARDS_URL.post = respondWith(200, { message: 'ok' })

      assert.deepEqual(await processReferralCode({}), {})
    })
  })
})
