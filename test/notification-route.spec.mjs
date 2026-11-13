import assert from 'node:assert'
import { getOpenedNotificationRoute } from '../src/store/notification/actions.js'

// Minimal stand-in for the Vuex action context: the route resolver only reads
// the opened notification out of getters and returns a resolved route.
function contextFor (data) {
  return {
    getters: { openedNotification: { data } },
    dispatch: () => {},
    commit: () => {},
    rootGetters: {},
  }
}

const resolveFor = (data) => getOpenedNotificationRoute(contextFor(data))

describe('getOpenedNotificationRoute — P2P ramp targets', () => {
  it('routes a numeric ad_id to the ad edit form', () => {
    const route = resolveFor({ ad_id: 42 })
    assert.strictEqual(route?.to?.name, 'p2p-ads-edit-form')
    assert.strictEqual(route?.to?.params?.ad, 42)
  })

  it('routes a string ad_id to the ad edit form', () => {
    const route = resolveFor({ ad_id: '42' })
    assert.strictEqual(route?.to?.name, 'p2p-ads-edit-form')
    assert.strictEqual(route?.to?.params?.ad, '42')
  })

  it('still routes an order_id-only push to the order', () => {
    const route = resolveFor({ order_id: 7 })
    assert.strictEqual(route?.to?.name, 'p2p-order')
    assert.strictEqual(route?.to?.params?.order, 7)
  })

  it('prefers ad_id when a push carries both', () => {
    const route = resolveFor({ ad_id: 42, order_id: 7 })
    assert.strictEqual(route?.to?.name, 'p2p-ads-edit-form')
  })

  it('returns no route when neither identifier is present', () => {
    assert.strictEqual(resolveFor({}), null)
    assert.strictEqual(resolveFor({ foo: 'bar' }), null)
  })

  it('returns no route for non-numeric identifiers', () => {
    assert.strictEqual(resolveFor({ ad_id: 'abc' }), null)
    assert.strictEqual(resolveFor({ order_id: null }), null)
  })

  it('ignores an ad_id that is not a safe integer', () => {
    assert.strictEqual(resolveFor({ ad_id: '99999999999999999999' }), null)
  })
})
