import assert from 'node:assert/strict'
import { ENGAGEMENT_HUB_URL, ELITEPROGRAM_URL, REWARDS_URL } from '../src/utils/engagementhub-utils/api.js'

const requestInterceptorCount = (instance) => instance.interceptors.request.handlers.length

describe('engagement-hub signing wiring', () => {
  it('attaches the signer to the rewards instance only', () => {
    assert.equal(requestInterceptorCount(REWARDS_URL), 1)
    assert.equal(requestInterceptorCount(ELITEPROGRAM_URL), 0)
  })

  it('attaches a response interceptor for clock-offset tracking', () => {
    assert.equal(REWARDS_URL.interceptors.response.handlers.length, 1)
  })

  it('keeps the public engagement-hub base URL export', () => {
    assert.equal(typeof ENGAGEMENT_HUB_URL, 'string')
    assert.ok(REWARDS_URL.defaults.baseURL.startsWith(ENGAGEMENT_HUB_URL))
  })
})
