/**
 * Nostr Relay Service for Chat.
 * Wraps nostr-tools SimplePool and handles connection/subscription/publish.
 * Kept outside Vuex because SimplePool is not serializable.
 */

import { SimplePool } from 'nostr-tools/pool'
import { finalizeEvent } from 'nostr-tools'

let _pool = null
let _subs = []
let _authSigner = null
let _pollInterval = null
let _statusInterval = null

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function getPool() {
  if (!_pool) {
    _pool = new SimplePool({
      maxWaitForConnection: 15000,
      automaticallyAuth: (relayURL) => {
        if (!_authSigner) return null
        return _authSigner
      },
    })
  }
  return _pool
}

/**
 * Set the signing function for NIP-42 AUTH challenges.
 * @param {string} privKeyHex - Hex private key
 */
export function setAuthKey(privKeyHex) {
  const privKeyBytes = hexToBytes(privKeyHex)
  _authSigner = (eventTemplate) => Promise.resolve(finalizeEvent(eventTemplate, privKeyBytes))
}

export function connect(relays) {
  const pool = getPool()
  return pool
}

export function disconnect() {
  if (_pool) {
    for (const sub of _subs) {
      try { sub.close() } catch (_) {}
    }
    _subs = []
    _pool = null
  }
  if (_pollInterval) {
    clearInterval(_pollInterval)
    _pollInterval = null
  }
  if (_statusInterval) {
    clearInterval(_statusInterval)
    _statusInterval = null
  }
}

/**
 * Get current connection status for all known relays.
 * @returns {Object.<string, 'connected'|'disconnected'>}
 */
export function getConnectionStatus() {
  if (!_pool) return {}
  const status = {}
  try {
    const map = _pool.listConnectionStatus()
    map.forEach((connected, url) => {
      status[url] = connected ? 'connected' : 'disconnected'
    })
  } catch (_) {
    // Fallback: if listConnectionStatus is not available, return empty
  }
  return status
}

/**
 * Start polling relay connection status.
 * @param {Function} callback - Receives status object every interval
 * @param {number} [intervalMs=5000] - Polling interval
 */
export function startStatusPolling(callback, intervalMs = 5000) {
  if (_statusInterval) clearInterval(_statusInterval)
  // Immediate first call
  callback(getConnectionStatus())
  _statusInterval = setInterval(() => {
    callback(getConnectionStatus())
  }, intervalMs)
}

/**
 * Stop polling relay connection status.
 */
export function stopStatusPolling() {
  if (_statusInterval) {
    clearInterval(_statusInterval)
    _statusInterval = null
  }
}

/**
 * Subscribe to kind:1059 gift-wraps addressed to our pubkey.
 * Also sets up a polling fallback every 15 seconds.
 * @param {string[]} relays
 * @param {string} myPubKey - Hex pubkey
 * @param {{ onEvent(event): void }} callbacks
 * @returns {{ close(): void }}
 */
export function subscribeGiftWraps(relays, myPubKey, callbacks = {}) {
  const pool = getPool()
  const filters = [{ kinds: [1059], '#p': [myPubKey] }]

  // Subscribe to each relay individually so we can track which ones work
  for (const relayUrl of relays) {
    try {
      const sub = pool.subscribeMany([relayUrl], filters, {
        onevent(event) {
          if (callbacks.onEvent) callbacks.onEvent(event)
        },
        oneose() {},
        onclose(reasons) {},
      })
      _subs.push(sub)
    } catch (err) {
      // Relay subscription failed silently
    }
  }

  // Polling fallback: query all relays every 5 seconds for gift-wraps.
  // We do NOT use `since` because NIP-17 randomizes created_at up to 2 days in the past.
  // Instead we track seen event IDs and only process new ones.
  if (_pollInterval) clearInterval(_pollInterval)
  const seenEventIds = new Set()
  _pollInterval = setInterval(async () => {
    try {
      const events = await pool.querySync(relays, {
        kinds: [1059],
        '#p': [myPubKey],
        limit: 20,
      })
      if (!events || !events.length) return
      const newEvents = events.filter(e => !seenEventIds.has(e.id))
      if (!newEvents.length) return
      for (const event of newEvents) {
        seenEventIds.add(event.id)
        if (callbacks.onEvent) callbacks.onEvent(event)
      }
      // Prevent unbounded growth
      if (seenEventIds.size > 500) {
        const toDelete = Array.from(seenEventIds).slice(0, seenEventIds.size - 500)
        toDelete.forEach(id => seenEventIds.delete(id))
      }
    } catch (err) {
      // Silently ignore poll errors
    }
  }, 5000)

  return {
    close() {
      for (const sub of _subs) {
        try { sub.close() } catch (_) {}
      }
      _subs = []
      if (_pollInterval) {
        clearInterval(_pollInterval)
        _pollInterval = null
      }
    },
  }
}

/**
 * Publish events to all specified relays.
 * @param {string[]} relays
 * @param {import('nostr-tools').VerifiedEvent[]} events
 * @returns {Promise<void>}
 */
export async function publish(relays, events) {
  const pool = getPool()
  for (const event of events) {
    try {
      const promises = pool.publish(relays, event, { maxWait: 15000 })
      const results = await Promise.allSettled(promises)
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          console.warn(`[Nostr] Failed to publish to ${relays[i]}:`, result.reason?.message || result.reason)
        }
      })
    } catch (err) {
      console.warn('[Nostr] Failed to publish event:', err)
    }
  }
}

/**
 * Publish a single event to all specified relays.
 * @param {string[]} relays
 * @param {import('nostr-tools').VerifiedEvent} event
 * @returns {Promise<string[]>} - URLs of relays that accepted the event
 */
export async function publishEvent(relays, event) {
  const pool = getPool()
  const accepted = []
  try {
    const promises = pool.publish(relays, event, { maxWait: 15000 })
    const results = await Promise.allSettled(promises)
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        accepted.push(relays[i])
      } else {
        console.warn(`[Nostr] Failed to publish event ${event.kind} to ${relays[i]}:`, result.reason?.message || result.reason)
      }
    })
  } catch (err) {
    console.warn('[Nostr] Failed to publish event:', err)
  }
  return accepted
}

/**
 * Query for a user's kind:10050 relay preferences.
 * @param {string[]} relays
 * @param {string} pubKey - Hex pubkey
 * @returns {Promise<import('nostr-tools').Event|null>}
 */
export async function fetchKind10050(relays, pubKey) {
  const pool = getPool()
  try {
    const events = await pool.querySync(relays, { kinds: [10050], authors: [pubKey] })
    return events?.[0] || null
  } catch (err) {
    console.warn('[Nostr] Failed to fetch kind:10050:', err)
    return null
  }
}

/**
 * Query for historical kind:1059 gift-wraps addressed to our pubkey.
 * This catches messages that were published before our subscription was active.
 * @param {string[]} relays
 * @param {string} myPubKey - Hex pubkey
 * @param {{ onEvent(event): void }} callbacks
 * @returns {Promise<void>}
 */
export async function fetchHistoricalGiftWraps(relays, myPubKey, callbacks = {}) {
  const pool = getPool()
  try {
    const events = await pool.querySync(relays, { kinds: [1059], '#p': [myPubKey], limit: 50 })
    if (!events || !events.length) return
    for (const event of events) {
      if (callbacks.onEvent) callbacks.onEvent(event)
    }
  } catch (err) {
    console.warn('[Nostr] Failed to fetch historical gift-wraps:', err)
  }
}

export { SimplePool }
