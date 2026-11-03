import assert from 'node:assert/strict'
import { requirementState } from '../src/utils/engagementhub-utils/elite-requirements.js'

describe('elite requirements', () => {
  describe('requirementState', () => {
    it('returns null when the balance or floor is unknown', () => {
      assert.equal(requirementState(null, 30000), null)
      assert.equal(requirementState(undefined, 30000), null)
      assert.equal(requirementState(25000, null), null)
      assert.equal(requirementState(25000, undefined), null)
      assert.equal(requirementState('', 30000), null)
      assert.equal(requirementState('not a number', 30000), null)
      assert.equal(requirementState(25000, NaN), null)
    })

    it('returns null when there is no floor to compare against', () => {
      assert.equal(requirementState(25000, 0), null)
      assert.equal(requirementState(25000, -100), null)
    })

    it('is met when the balance is above the floor', () => {
      assert.deepEqual(requirementState(35000, 30000), {
        met: true,
        progress: 1,
        shortfall: 0
      })
    })

    it('is met when the balance is exactly at the floor', () => {
      assert.deepEqual(requirementState(30000, 30000), {
        met: true,
        progress: 1,
        shortfall: 0
      })
    })

    it('reports progress and shortfall when below the floor', () => {
      assert.deepEqual(requirementState(25000, 30000), {
        met: false,
        progress: 25000 / 30000,
        shortfall: 5000
      })
    })

    it('treats a zero balance as below the floor', () => {
      assert.deepEqual(requirementState(0, 30000), {
        met: false,
        progress: 0,
        shortfall: 30000
      })
    })

    it('never reports a negative progress or shortfall', () => {
      assert.deepEqual(requirementState(-5000, 30000), {
        met: false,
        progress: 0,
        shortfall: 35000
      })
    })

    it('accepts numeric strings', () => {
      assert.deepEqual(requirementState('25000', '30000'), {
        met: false,
        progress: 25000 / 30000,
        shortfall: 5000
      })
    })
  })
})
