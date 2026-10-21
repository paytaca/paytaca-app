import assert from 'node:assert/strict'
import {
  activityId,
  buildDeepLink,
  isSameActivity,
  normalizeMarketplaceOrder,
  normalizeP2POrder,
  parseTimestamp,
} from '../src/services/order-live-activity/model.js'

const p2pOrder = (status, extra = {}) => ({
  id: 42,
  status: { value: status },
  trade_type: 'buy',
  expires_at: '2026-01-01T00:00:00Z',
  ...extra,
})

const marketplaceOrder = (status, extra = {}) => ({
  id: 7,
  status,
  formattedStatus: status,
  ...extra,
})

describe('order live activity model', () => {
  describe('parseTimestamp', () => {
    it('returns null for empty or invalid values', () => {
      assert.equal(parseTimestamp(null), null)
      assert.equal(parseTimestamp(undefined), null)
      assert.equal(parseTimestamp(''), null)
      assert.equal(parseTimestamp('not-a-date'), null)
      assert.equal(parseTimestamp(new Date('nope')), null)
    })

    it('accepts epoch numbers, Dates and ISO strings', () => {
      assert.equal(parseTimestamp(0), 0)
      assert.equal(parseTimestamp(1234), 1234)
      assert.equal(parseTimestamp(new Date(5000)), 5000)
      assert.equal(parseTimestamp('1970-01-01T00:00:05Z'), 5000)
    })
  })

  describe('identifiers', () => {
    it('builds stable ids and deep links', () => {
      assert.equal(activityId('p2p', 1), 'p2p:1')
      assert.equal(
        buildDeepLink('marketplace', 9),
        'paytaca://live-activity?kind=marketplace&orderId=9'
      )
    })
  })

  describe('normalizeP2POrder', () => {
    it('maps in-progress statuses to stages', () => {
      const activity = normalizeP2POrder(p2pOrder('ESCRW'))
      assert.equal(activity.id, 'p2p:42')
      assert.equal(activity.statusCode, 'ESCRW')
      assert.equal(activity.stageIndex, 3)
      assert.equal(activity.stageCount, 5)
      assert.equal(activity.progress, 0.6)
      assert.equal(activity.isTerminal, false)
      assert.equal(activity.terminalType, null)
      assert.equal(activity.countdownAt, Date.parse('2026-01-01T00:00:00Z'))
      assert.equal(activity.countdownLabel, 'Expires in')
    })

    it('marks terminal statuses and drops the countdown', () => {
      for (const [status, type] of [['RLS', 'success'], ['RFN', 'failed'], ['CNCL', 'cancelled']]) {
        const activity = normalizeP2POrder(p2pOrder(status))
        assert.equal(activity.isTerminal, true)
        assert.equal(activity.terminalType, type)
        assert.equal(activity.countdownAt, null)
      }
    })

    it('returns null without an order id', () => {
      assert.equal(normalizeP2POrder(null), null)
      assert.equal(normalizeP2POrder({}), null)
    })
  })

  describe('normalizeMarketplaceOrder', () => {
    it('maps every marketplace status', () => {
      const expected = {
        pending: [1, false],
        confirmed: [2, false],
        preparing: [3, false],
        ready_for_pickup: [4, false],
        picked_up: [5, false],
        on_delivery: [5, false],
        delivered: [6, false],
        completed: [6, true],
        cancelled: [0, true],
      }
      for (const [status, [stageIndex, isTerminal]] of Object.entries(expected)) {
        const activity = normalizeMarketplaceOrder(marketplaceOrder(status))
        assert.equal(activity.stageIndex, stageIndex, status)
        assert.equal(activity.isTerminal, isTerminal, status)
      }
    })

    it('uses the storefront name in the title and the order ref in the subtitle', () => {
      const activity = normalizeMarketplaceOrder(marketplaceOrder('confirmed'), {
        storefrontName: 'Corner Store',
      })
      assert.equal(activity.title, 'Corner Store')
      assert.equal(activity.subtitle, 'Order #7')
    })

    it('prefers the earliest available deadline label', () => {
      const autoComplete = normalizeMarketplaceOrder(
        marketplaceOrder('delivered', { autoCompleteAt: new Date('2026-01-02T00:00:00Z') })
      )
      assert.equal(autoComplete.countdownLabel, 'Auto-completes in')

      const delivery = normalizeMarketplaceOrder(
        marketplaceOrder('on_delivery', { deliveryDeadline: new Date('2026-01-02T00:00:00Z') })
      )
      assert.equal(delivery.countdownLabel, 'Delivery due in')

      const preparation = normalizeMarketplaceOrder(
        marketplaceOrder('preparing', { preparationDeadline: new Date('2026-01-02T00:00:00Z') })
      )
      assert.equal(preparation.countdownLabel, 'Preparation due in')
    })
  })

  describe('isSameActivity', () => {
    it('matches identical activities', () => {
      const a = normalizeMarketplaceOrder(marketplaceOrder('preparing'))
      assert.equal(isSameActivity(a, { ...a, updatedAt: 1 }), true)
    })

    it('returns false when either side is missing', () => {
      assert.equal(isSameActivity(null, null), false)
      assert.equal(isSameActivity(normalizeP2POrder(p2pOrder('PD')), null), false)
    })

    it('detects status, progress and countdown changes', () => {
      const base = normalizeMarketplaceOrder(marketplaceOrder('confirmed'))
      const moved = normalizeMarketplaceOrder(marketplaceOrder('preparing'))
      assert.equal(isSameActivity(base, moved), false)

      const withDeadline = normalizeMarketplaceOrder(
        marketplaceOrder('confirmed', { deliveryDeadline: new Date('2026-01-02T00:00:00Z') })
      )
      assert.equal(isSameActivity(base, withDeadline), false)
    })

    it('detects a label-only countdown change', () => {
      const delivery = normalizeMarketplaceOrder(
        marketplaceOrder('confirmed', { deliveryDeadline: new Date('2026-01-02T00:00:00Z') })
      )
      const preparation = normalizeMarketplaceOrder(
        marketplaceOrder('confirmed', { preparationDeadline: new Date('2026-01-02T00:00:00Z') })
      )
      assert.equal(delivery.countdownAt, preparation.countdownAt)
      assert.notEqual(delivery.countdownLabel, preparation.countdownLabel)
      assert.equal(isSameActivity(delivery, preparation), false)
    })

    it('detects terminal type changes', () => {
      const delivered = normalizeMarketplaceOrder(marketplaceOrder('delivered'))
      const completed = normalizeMarketplaceOrder(marketplaceOrder('completed'))
      assert.equal(isSameActivity(delivered, completed), false)
    })
  })
})
