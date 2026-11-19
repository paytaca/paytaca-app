import assert from 'node:assert/strict'
import { formatCapReset } from '../src/utils/time.js'

describe('elite cap reset formatting', () => {
  const resetAt = '2026-03-01T00:00:00Z'

  it('returns null for a missing or invalid instant', () => {
    assert.equal(formatCapReset(null), null)
    assert.equal(formatCapReset(undefined), null)
    assert.equal(formatCapReset(''), null)
    assert.equal(formatCapReset('not a date'), null)
  })

  it('omits the local copy when the device is on UTC', () => {
    const parts = formatCapReset(resetAt, { locale: 'en-US', timeZone: 'UTC' })

    assert.match(parts.utc, /Mar 1, 2026/)
    assert.match(parts.utc, /12:00 AM/)
    assert.equal(parts.local, null)
  })

  it('formats the PHT equivalent on the same day', () => {
    const parts = formatCapReset(resetAt, {
      locale: 'en-US',
      timeZone: 'Asia/Manila'
    })

    assert.match(parts.utc, /Mar 1, 2026/)
    assert.match(parts.utc, /12:00 AM/)
    assert.match(parts.local, /Mar 1, 2026/)
    assert.match(parts.local, /8:00 AM/)
  })

  it('shows the previous day for a negative offset', () => {
    const parts = formatCapReset(resetAt, {
      locale: 'en-US',
      timeZone: 'America/Los_Angeles'
    })

    assert.match(parts.local, /Feb 28, 2026/)
    assert.match(parts.local, /4:00 PM/)
  })

  it('uses the offset in effect at the reset instant, not today', () => {
    const parts = formatCapReset('2026-07-01T00:00:00Z', {
      locale: 'en-US',
      timeZone: 'America/New_York'
    })

    assert.match(parts.local, /Jun 30, 2026/)
    assert.match(parts.local, /8:00 PM/)
  })
})
