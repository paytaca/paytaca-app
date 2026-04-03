'use strict'
// Keepalive watchdog for WizardConnect relay connections.
// Pure logic — no framework or crypto dependencies, so it can be unit-tested
// directly in Node without a bundler.

const KEEPALIVE_INTERVAL = 30_000 // ms — how often to check
const ZOMBIE_THRESHOLD   = 65_000 // ms — silence before a connection is declared dead

class ConnectionKeepalive {
  constructor ({ getConnections, onReconnect, interval, threshold }) {
    this._getConnections = getConnections
    this._onReconnect    = onReconnect
    this._interval       = interval  ?? KEEPALIVE_INTERVAL
    this._threshold      = threshold ?? ZOMBIE_THRESHOLD
    this._lastActivity   = new Map() // connectionId → epoch ms
    this._timer          = null
  }

  /** Record that relay activity was observed on a connection. */
  recordActivity (connectionId) {
    this._lastActivity.set(connectionId, Date.now())
  }

  /** Start the watchdog timer. Idempotent — safe to call multiple times. */
  start () {
    if (this._timer) return
    this._timer = setInterval(() => this._check(), this._interval)
  }

  /** Stop the watchdog timer. */
  stop () {
    clearInterval(this._timer)
    this._timer = null
  }

  _check () {
    const now = Date.now()
    const connections = this._getConnections()
    for (const [id, conn] of Object.entries(connections)) {
      if (conn.status?.status !== 'connected') continue
      const lastActivity = this._lastActivity.get(id) ?? 0
      if (now - lastActivity > this._threshold) {
        const staleSecs = Math.round((now - lastActivity) / 1000)
        console.warn(
          `WizardConnect: keepalive: connection ${id} stale (${staleSecs}s) — forcing reconnect`
        )
        this._onReconnect(id, conn.uri)
      }
    }
  }
}

module.exports = { ConnectionKeepalive, KEEPALIVE_INTERVAL, ZOMBIE_THRESHOLD }
