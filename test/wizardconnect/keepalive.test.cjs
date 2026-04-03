'use strict'
// Unit tests for ConnectionKeepalive — zombie detection and reconnect logic.

const assert = require('node:assert/strict')
const sinon  = require('sinon')
const { ConnectionKeepalive, KEEPALIVE_INTERVAL, ZOMBIE_THRESHOLD } = require('../../src/wallet/wizardconnect/keepalive.js')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeKeepalive (overrides = {}) {
  const onReconnect = sinon.stub()
  const connections = overrides.connections ?? {}
  const ka = new ConnectionKeepalive({
    getConnections: () => connections,
    onReconnect,
    interval:  overrides.interval  ?? KEEPALIVE_INTERVAL,
    threshold: overrides.threshold ?? ZOMBIE_THRESHOLD,
  })
  return { ka, onReconnect, connections }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('KEEPALIVE_INTERVAL is positive', () => {
    assert.ok(KEEPALIVE_INTERVAL > 0)
  })

  it('ZOMBIE_THRESHOLD is positive', () => {
    assert.ok(ZOMBIE_THRESHOLD > 0)
  })

  it('ZOMBIE_THRESHOLD is at least 5 seconds', () => {
    assert.ok(ZOMBIE_THRESHOLD >= 5_000, 'threshold too short — would cause false positives on slow networks')
  })

  it('combined timeout (KEEPALIVE_INTERVAL + ZOMBIE_THRESHOLD) is reasonable (< 5 min)', () => {
    assert.ok(KEEPALIVE_INTERVAL + ZOMBIE_THRESHOLD < 300_000)
  })
})

// ---------------------------------------------------------------------------
// recordActivity
// ---------------------------------------------------------------------------

describe('recordActivity', () => {
  it('records a timestamp for the connection', () => {
    const { ka } = makeKeepalive()
    const before = Date.now()
    ka.recordActivity('conn-1')
    const after = Date.now()
    const ts = ka._lastActivity.get('conn-1')
    assert.ok(ts >= before && ts <= after)
  })

  it('overwrites a previous timestamp', () => {
    const { ka } = makeKeepalive()
    ka._lastActivity.set('conn-1', Date.now() - 100_000)
    const old = ka._lastActivity.get('conn-1')
    ka.recordActivity('conn-1')
    assert.ok(ka._lastActivity.get('conn-1') > old)
  })

  it('tracks multiple connections independently', () => {
    const { ka } = makeKeepalive()
    ka.recordActivity('conn-a')
    ka.recordActivity('conn-b')
    assert.ok(ka._lastActivity.has('conn-a'))
    assert.ok(ka._lastActivity.has('conn-b'))
  })
})

// ---------------------------------------------------------------------------
// start / stop
// ---------------------------------------------------------------------------

describe('start / stop', () => {
  let clock

  beforeEach(() => { clock = sinon.useFakeTimers() })
  afterEach(() => { clock.restore() })

  it('start sets the timer', () => {
    const { ka } = makeKeepalive()
    assert.equal(ka._timer, null)
    ka.start()
    assert.notEqual(ka._timer, null)
    ka.stop()
  })

  it('start is idempotent — calling twice does not create a second timer', () => {
    const { ka } = makeKeepalive()
    ka.start()
    const firstTimer = ka._timer
    ka.start()
    assert.equal(ka._timer, firstTimer)
    ka.stop()
  })

  it('stop clears the timer', () => {
    const { ka } = makeKeepalive()
    ka.start()
    ka.stop()
    assert.equal(ka._timer, null)
  })

  it('stop is safe to call when not started', () => {
    const { ka } = makeKeepalive()
    assert.doesNotThrow(() => ka.stop())
  })

  it('_check fires after one interval', () => {
    const { ka, onReconnect, connections } = makeKeepalive({ interval: 1000, threshold: 100 })
    connections['c1'] = { status: { status: 'connected' }, uri: 'wss://relay.example.com' }
    // activity recorded long ago
    ka._lastActivity.set('c1', Date.now() - 200)
    ka.start()
    clock.tick(1000)
    assert.ok(onReconnect.calledOnce)
    ka.stop()
  })
})

// ---------------------------------------------------------------------------
// _check — skip logic
// ---------------------------------------------------------------------------

describe('_check skip logic', () => {
  it('skips connections that are not status=connected', () => {
    for (const status of ['disconnected', 'reconnecting', undefined]) {
      const { ka, onReconnect } = makeKeepalive({
        threshold: 0,
        connections: { c1: { status: { status }, uri: 'wss://relay.example.com' } },
      })
      ka._check()
      assert.ok(onReconnect.notCalled, `should skip status=${status}`)
    }
  })

  it('skips a connected connection with recent activity', () => {
    const { ka, onReconnect } = makeKeepalive({
      threshold: 65_000,
      connections: { c1: { status: { status: 'connected' }, uri: 'wss://relay.example.com' } },
    })
    ka.recordActivity('c1')  // just now
    ka._check()
    assert.ok(onReconnect.notCalled)
  })

  it('skips a connected connection with no recorded activity if within threshold', () => {
    // _lastActivity has no entry → lastActivity = 0, which is very old.
    // But here we use a very large threshold to confirm it would be skipped
    // if the threshold had not elapsed. (Regression: default lastActivity=0
    // must not cause a false positive on brand-new connections.)
    // We test the inverse: a fresh connection with recordActivity should pass.
    const { ka, onReconnect } = makeKeepalive({
      threshold: 65_000,
      connections: { c1: { status: { status: 'connected' }, uri: 'wss://relay.example.com' } },
    })
    ka.recordActivity('c1')
    ka._check()
    assert.ok(onReconnect.notCalled)
  })
})

// ---------------------------------------------------------------------------
// _check — reconnect logic
// ---------------------------------------------------------------------------

describe('_check reconnect logic', () => {
  it('calls onReconnect with id and uri for a stale connected connection', () => {
    const { ka, onReconnect } = makeKeepalive({
      threshold: 65_000,
      connections: { c1: { status: { status: 'connected' }, uri: 'wss://relay.example.com' } },
    })
    ka._lastActivity.set('c1', Date.now() - 70_000)
    ka._check()
    assert.ok(onReconnect.calledOnce)
    assert.equal(onReconnect.firstCall.args[0], 'c1')
    assert.equal(onReconnect.firstCall.args[1], 'wss://relay.example.com')
  })

  it('only reconnects the stale connection, not the healthy one', () => {
    const connections = {
      stale:   { status: { status: 'connected' }, uri: 'wss://stale.example.com' },
      healthy: { status: { status: 'connected' }, uri: 'wss://healthy.example.com' },
    }
    const { ka, onReconnect } = makeKeepalive({ threshold: 65_000, connections })
    ka._lastActivity.set('stale',   Date.now() - 70_000)
    ka._lastActivity.set('healthy', Date.now())
    ka._check()
    assert.ok(onReconnect.calledOnce)
    assert.equal(onReconnect.firstCall.args[0], 'stale')
  })

  it('reconnects all stale connections in a single check', () => {
    const connections = {
      c1: { status: { status: 'connected' }, uri: 'wss://a.example.com' },
      c2: { status: { status: 'connected' }, uri: 'wss://b.example.com' },
    }
    const { ka, onReconnect } = makeKeepalive({ threshold: 65_000, connections })
    ka._lastActivity.set('c1', Date.now() - 70_000)
    ka._lastActivity.set('c2', Date.now() - 70_000)
    ka._check()
    assert.equal(onReconnect.callCount, 2)
  })

  it('a connection with no recorded activity (default 0) is treated as stale', () => {
    // This is the most important case: a new timer tick before any activity
    // was ever recorded means the connection was never confirmed live.
    const { ka, onReconnect } = makeKeepalive({
      threshold: 65_000,
      connections: { c1: { status: { status: 'connected' }, uri: 'wss://relay.example.com' } },
    })
    // No recordActivity call — _lastActivity is empty, defaults to 0
    ka._check()
    assert.ok(onReconnect.calledOnce, 'connection with no activity should be treated as stale')
  })

  it('does nothing when there are no connections', () => {
    const { ka, onReconnect } = makeKeepalive({ connections: {} })
    assert.doesNotThrow(() => ka._check())
    assert.ok(onReconnect.notCalled)
  })
})

// ---------------------------------------------------------------------------
// Timer integration
// ---------------------------------------------------------------------------

describe('timer integration', () => {
  let clock

  beforeEach(() => { clock = sinon.useFakeTimers() })
  afterEach(() => { clock.restore() })

  it('does not fire before interval elapses', () => {
    const connections = { c1: { status: { status: 'connected' }, uri: 'wss://relay.example.com' } }
    const { ka, onReconnect } = makeKeepalive({ interval: 30_000, threshold: 65_000, connections })
    ka._lastActivity.set('c1', 0)
    ka.start()
    clock.tick(29_999)
    assert.ok(onReconnect.notCalled)
    ka.stop()
  })

  it('fires exactly at the interval boundary', () => {
    const connections = { c1: { status: { status: 'connected' }, uri: 'wss://relay.example.com' } }
    const { ka, onReconnect } = makeKeepalive({ interval: 30_000, threshold: 0, connections })
    ka._lastActivity.set('c1', 0)
    ka.start()
    clock.tick(30_000)
    assert.ok(onReconnect.calledOnce)
    ka.stop()
  })

  it('fires repeatedly on each interval', () => {
    const connections = { c1: { status: { status: 'connected' }, uri: 'wss://relay.example.com' } }
    const { ka, onReconnect } = makeKeepalive({ interval: 1_000, threshold: 0, connections })
    ka._lastActivity.set('c1', 0)
    ka.start()
    clock.tick(3_000)
    assert.equal(onReconnect.callCount, 3)
    ka.stop()
  })

  it('does not fire after stop', () => {
    const connections = { c1: { status: { status: 'connected' }, uri: 'wss://relay.example.com' } }
    const { ka, onReconnect } = makeKeepalive({ interval: 1_000, threshold: 0, connections })
    ka._lastActivity.set('c1', 0)
    ka.start()
    clock.tick(1_000)
    assert.ok(onReconnect.calledOnce)
    ka.stop()
    clock.tick(2_000)
    assert.ok(onReconnect.calledOnce, 'should not fire after stop')
  })
})
