import assert from 'node:assert/strict'
import {
  bchToDisplay,
  displayAmount,
  isRateFallback
} from '../src/utils/engagementhub-utils/display-rates.js'

describe('elite display currency', () => {
  describe('bchToDisplay', () => {
    it('converts a BCH amount with the response rate', () => {
      assert.equal(
        bchToDisplay(0.5, { display_per_bch: '933.02' }),
        0.5 * 933.02
      )
    })

    it('accepts string amounts', () => {
      assert.equal(
        bchToDisplay('0.25', { display_per_bch: '100' }),
        25
      )
    })

    it('returns null when the rate is missing or unusable', () => {
      assert.equal(bchToDisplay(0.5, null), null)
      assert.equal(bchToDisplay(0.5, {}), null)
      assert.equal(bchToDisplay(0.5, { display_per_bch: null }), null)
      assert.equal(bchToDisplay(0.5, { display_per_bch: 'not a number' }), null)
    })

    it('returns null when the BCH amount is missing or unusable', () => {
      assert.equal(bchToDisplay(null, { display_per_bch: '100' }), null)
      assert.equal(bchToDisplay('', { display_per_bch: '100' }), null)
      assert.equal(bchToDisplay('nope', { display_per_bch: '100' }), null)
    })
  })

  describe('isRateFallback', () => {
    it('is true when a non-PHP request fell back to PHP', () => {
      assert.equal(isRateFallback('USD', 'PHP', true), true)
      assert.equal(isRateFallback('usd', 'php', true), true)
    })

    it('is false when the rate was available', () => {
      assert.equal(isRateFallback('USD', 'PHP', false), false)
      assert.equal(isRateFallback('USD', 'PHP', undefined), false)
    })

    it('is false when PHP was requested or returned', () => {
      assert.equal(isRateFallback('PHP', 'PHP', true), false)
      assert.equal(isRateFallback('', 'PHP', true), false)
      assert.equal(isRateFallback(null, 'PHP', true), false)
      assert.equal(isRateFallback('USD', 'USD', true), false)
    })
  })

  describe('displayAmount', () => {
    it('formats 0-decimal currencies without fractions', () => {
      assert.equal(displayAmount('1234', 'JPY'), '1,234 JPY')
    })

    it('formats 2-decimal currencies with two fractions', () => {
      assert.equal(displayAmount('1234.5', 'PHP'), '1,234.50 PHP')
      assert.equal(displayAmount(1234.5, 'USD'), '1,234.50 USD')
    })

    it('formats 3-decimal currencies with three fractions', () => {
      assert.equal(displayAmount('1234.5', 'KWD'), '1,234.500 KWD')
    })

    it('defaults to PHP when no currency is given', () => {
      assert.equal(displayAmount('10'), '10.00 PHP')
    })
  })
})
