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
let _keepaliveInterval = null
let _seenEventIds = new Set()
let _resubscribeTimer = null
let _subscriptionCallbacks = null

// Subscription state tracking
let _isSubscribed = false
let _lastSubscribeTime = 0
let _subscribedRelays = []
let _subscribedPubKey = null
let _subscribing = false

// Status polling backoff state
let _statusBackoff = 1
const STATUS_BASE_INTERVAL = 15000
const STATUS_MAX_INTERVAL = 60000
const SUBSCRIBE_COOLDOWN_MS = 2000
const KEEPALIVE_INTERVAL_MS = 30000

// Resubscribe backoff state
let _resubscribeAttempts = 0
const RESUBSCRIBE_BASE_MS = 1000
const RESUBSCRIBE_MAX_MS = 60000

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
      maxWaitForConnection: 30000,
      enableReconnect: true,
      enablePing: true,
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
  if (_resubscribeTimer) {
    clearTimeout(_resubscribeTimer)
    _resubscribeTimer = null
  }
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
    clearTimeout(_statusInterval)
    _statusInterval = null
  }
  if (_keepaliveInterval) {
    clearInterval(_keepaliveInterval)
    _keepaliveInterval = null
  }
  _isSubscribed = false
  _lastSubscribeTime = 0
  _subscribedRelays = []
  _subscribedPubKey = null
  _subscribing = false
  _subscriptionCallbacks = null
  _statusBackoff = 1
  _resubscribeAttempts = 0
}

/**
 * Whether we have an active subscription.
 * @returns {boolean}
 */
export function isSubscribed() {
  return _isSubscribed && _subs.length > 0
}

/**
 * Whether a subscription is currently being established.
 * @returns {boolean}
 */
export function isSubscribing() {
  return _subscribing
}

/**
 * Actively probe connection status for each relay.
 * Uses pool.ensureRelay() so we don't depend on prior subscriptions.
 * @param {string[]} relays
 * @returns {Promise<Object.<string, 'connected'|'disconnected'>>}
 */
export async function getConnectionStatus(relays) {
  if (!_pool) return {}
  const status = {}
  for (const url of relays) {
    try {
      const relay = await _pool.ensureRelay(url, { connectionTimeout: 5000 })
      status[url] = relay.connected ? 'connected' : 'disconnected'
    } catch (_) {
      status[url] = 'disconnected'
    }
  }
  return status
}

/**
 * Start polling relay connection status.
 * Uses exponential backoff when relays are disconnected.
 * @param {string[]} relays
 * @param {Function} callback - Receives status object every interval
 * @param {number} [intervalMs=15000] - Base polling interval
 */
export function startStatusPolling(relays, callback, intervalMs = STATUS_BASE_INTERVAL) {
  if (_statusInterval) clearTimeout(_statusInterval)

  const poll = async () => {
    const status = await getConnectionStatus(relays)
    callback(status)

    // Exponential backoff if all relays are disconnected
    const allDisconnected = Object.values(status).every(s => s === 'disconnected')
    if (allDisconnected) {
      _statusBackoff = Math.min(_statusBackoff * 2, STATUS_MAX_INTERVAL / intervalMs)
    } else {
      _statusBackoff = 1
    }

    // Reschedule with adjusted interval
    if (_statusInterval) clearTimeout(_statusInterval)
    _statusInterval = setTimeout(() => poll(), intervalMs * _statusBackoff)
  }

  // Immediate first call, then interval
  poll()
}

/**
 * Stop polling relay connection status.
 */
export function stopStatusPolling() {
  if (_statusInterval) {
    clearTimeout(_statusInterval)
    _statusInterval = null
  }
}

/**
 * Schedule a re-subscription attempt after a connection loss.
 * Debounces rapid close/reconnect cycles.
 */
function scheduleResubscribe() {
  if (_resubscribeTimer) return
  const delay = Math.min(
    RESUBSCRIBE_BASE_MS * Math.pow(2, _resubscribeAttempts),
    RESUBSCRIBE_MAX_MS
  )
  _resubscribeAttempts++
  _resubscribeTimer = setTimeout(() => {
    _resubscribeTimer = null
    if (
      !_isSubscribed &&
      _subscribedRelays.length > 0 &&
      _subscribedPubKey &&
      _subscriptionCallbacks
    ) {
      // If we've exhausted backoff, reset the pool to clear stale state
      if (_resubscribeAttempts >= 6) {
        const savedRelays = _subscribedRelays
        const savedPubKey = _subscribedPubKey
        const savedCallbacks = _subscriptionCallbacks
        disconnect()
        _pool = getPool()
        _subscribedRelays = savedRelays
        _subscribedPubKey = savedPubKey
        _subscriptionCallbacks = savedCallbacks
      }
      subscribeGiftWraps(_subscribedRelays, _subscribedPubKey, _subscriptionCallbacks, { force: true })
    }
  }, delay)
}

/**
 * Subscribe to kind:1059 gift-wraps addressed to our pubkey.
 * Also sets up a polling fallback every 30 seconds.
 * @param {string[]} relays
 * @param {string} myPubKey - Hex pubkey
 * @param {{ onEvent(event): void }} callbacks
 * @param {{ force?: boolean }} options
 * @returns {{ close(): void }}
 */
export function subscribeGiftWraps(relays, myPubKey, callbacks = {}, options = {}) {
  const now = Date.now()

  // Guard: skip if already subscribed to the same relays/pubkey (unless forced)
  if (
    !options.force &&
    _isSubscribed &&
    _subs.length > 0 &&
    _subscribedPubKey === myPubKey &&
    arraysEqual(_subscribedRelays, relays) &&
    (now - _lastSubscribeTime) < SUBSCRIBE_COOLDOWN_MS
  ) {
    return { close() {} }
  }

  // Prevent concurrent re-subscription
  if (_subscribing && !options.force) {
    return { close() {} }
  }

  // Cancel any pending auto-resubscribe since we're about to re-subscribe
  if (_resubscribeTimer) {
    clearTimeout(_resubscribeTimer)
    _resubscribeTimer = null
  }

  // Close any stale subscriptions before creating new ones
  for (const sub of _subs) {
    try { sub.close() } catch (_) {}
  }
  _subs = []

  // Store callbacks for future auto-resubscribe
  _subscriptionCallbacks = callbacks

  const pool = getPool()
  const filter = { kinds: [1059], '#p': [myPubKey] }

  try {
    _subscribing = true

    // Subscribe to each relay individually so we can track which ones work
    for (const relayUrl of relays) {
      try {
        const sub = pool.subscribeMany([relayUrl], filter, {
          onevent(event) {
            if (_seenEventIds.has(event.id)) return
            _seenEventIds.add(event.id)
            if (callbacks.onEvent) callbacks.onEvent(event)
          },
          oneose() {
            _resubscribeAttempts = 0
          },
          onclose(reasons) {
            console.warn(`[Nostr] Subscription closed for ${relayUrl}:`, reasons)
            if (!reasons.includes('closed by caller')) {
              _isSubscribed = false
              scheduleResubscribe()
            }
          },
        })
        _subs.push(sub)
      } catch (err) {
        // Relay subscription failed silently
      }
    }
  } finally {
    _subscribing = false
  }

  // Polling fallback: query all relays every 30 seconds for gift-wraps.
  // We do NOT use `since` because NIP-17 randomizes created_at up to 2 days in the past.
  // Instead we track seen event IDs and only process new ones.
  // Use module-level _seenEventIds so dedup survives across re-subscriptions.
  if (!_pollInterval) {
    _pollInterval = setInterval(async () => {
      try {
        const events = await pool.querySync(relays, {
          kinds: [1059],
          '#p': [myPubKey],
          limit: 500,
        })
        if (!events || !events.length) return
        const newEvents = events.filter(e => !_seenEventIds.has(e.id))
        if (!newEvents.length) return
        for (const event of newEvents) {
          _seenEventIds.add(event.id)
          if (callbacks.onEvent) callbacks.onEvent(event)
        }
        // Prevent unbounded growth. Keep more entries since polling limit increased.
        if (_seenEventIds.size > 5000) {
          const toDelete = Array.from(_seenEventIds).slice(0, _seenEventIds.size - 5000)
          toDelete.forEach(id => _seenEventIds.delete(id))
        }
      } catch (err) {
        // Silently ignore poll errors
      }
    }, 30000)
  }

  // Keepalive: periodically verify subscription is alive.
  // If _isSubscribed was set to false (e.g., onclose fired) but the auto-resubscribe
  // didn't trigger (e.g., back-to-back failures), this catches it.
  if (!_keepaliveInterval) {
    _keepaliveInterval = setInterval(() => {
      if (!_isSubscribed && _subscribedRelays.length > 0 && _subscribedPubKey && _subscriptionCallbacks) {
        subscribeGiftWraps(_subscribedRelays, _subscribedPubKey, _subscriptionCallbacks, { force: true })
      }
    }, KEEPALIVE_INTERVAL_MS)
  }

  _isSubscribed = _subs.length > 0
  _lastSubscribeTime = now
  _subscribedRelays = [...relays]
  _subscribedPubKey = myPubKey

  return {
    close() {
      if (_resubscribeTimer) {
        clearTimeout(_resubscribeTimer)
        _resubscribeTimer = null
      }
      for (const sub of _subs) {
        try { sub.close() } catch (_) {}
      }
      _subs = []
      if (_pollInterval) {
        clearInterval(_pollInterval)
        _pollInterval = null
      }
      if (_keepaliveInterval) {
        clearInterval(_keepaliveInterval)
        _keepaliveInterval = null
      }
      _isSubscribed = false
      _subscriptionCallbacks = null
    },
  }
}

/**
 * Shallow array equality check.
 */
function arraysEqual(a, b) {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Publish events to all specified relays.
 * @param {string[]} relays
 * @param {import('nostr-tools').VerifiedEvent[]} events
 * @returns {Promise<void>}
 */
export async function publish(relays, events) {
  const pool = getPool()
  await Promise.allSettled(events.map(async (event) => {
    try {
      const promises = pool.publish(relays, event, { maxWait: 30000 })
      const results = await Promise.allSettled(promises)
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          console.warn(`[Nostr] Failed to publish to ${relays[i]}:`, result.reason?.message || result.reason)
        }
      })
    } catch (err) {
      console.warn('[Nostr] Failed to publish event:', err)
    }
  }))
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
  const errors = []
  try {
    const promises = pool.publish(relays, event, { maxWait: 30000 })
    const results = await Promise.allSettled(promises)
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        accepted.push(relays[i])
      } else {
        const reason = result.reason?.message || result.reason
        errors.push({ relay: relays[i], reason })
        console.warn(`[Nostr] Failed to publish event ${event.kind} to ${relays[i]}:`, reason)
      }
    })
  } catch (err) {
    console.warn('[Nostr] Failed to publish event:', err)
  }
  return { accepted, errors }
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
 * Fetch a user's published BCH address from relays (NIP-78 kind:30078).
 * @param {string[]} relays
 * @param {string} pubKey - Hex pubkey
 * @returns {Promise<import('nostr-tools').Event|null>}
 */
export async function fetchBchAddress(relays, pubKey) {
  const pool = getPool()
  return new Promise((resolve) => {
    let resolved = false
    let activeRelays = relays.length
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve(null)
      }
    }, 8000)

    const sub = pool.subscribeMany(
      relays,
      [{ kinds: [30078], authors: [pubKey] }],
      {
        onevent(event) {
          if (resolved) return
          const dTag = event.tags?.find(t => t[0] === 'd')
          if (dTag && dTag[1] === 'paytaca:bch-address') {
            resolved = true
            clearTimeout(timer)
            sub.close()
            resolve(event)
          }
        },
        oneose() {
          activeRelays--
          if (activeRelays <= 0 && !resolved) {
            resolved = true
            clearTimeout(timer)
            resolve(null)
          }
        },
      }
    )
  })
}

/**
 * Fetch a user's published display name (paytaca:display-name) from relays.
 * @param {string[]} relays
 * @param {string} pubKey - Hex pubkey
 * @returns {Promise<import('nostr-tools').Event|null>}
 */
export async function fetchDisplayName(relays, pubKey) {
  const pool = getPool()
  try {
    const events = await pool.querySync(relays, { kinds: [30078], authors: [pubKey] })
    const match = events?.find(e => {
      const dTag = e.tags?.find(t => t[0] === 'd')
      return dTag && dTag[1] === 'paytaca:display-name'
    })
    return match || null
  } catch (err) {
    console.warn('[Nostr] Failed to fetch display name:', err)
    return null
  }
}

/**
 * Fetch a user's published avatar (paytaca:avatar) from relays.
 * @param {string[]} relays
 * @param {string} pubKey - Hex pubkey
 * @returns {Promise<import('nostr-tools').Event|null>}
 */
export async function fetchAvatar(relays, pubKey) {
  const pool = getPool()
  try {
    const events = await pool.querySync(relays, { kinds: [30078], authors: [pubKey] })
    const match = events?.find(e => {
      const dTag = e.tags?.find(t => t[0] === 'd')
      return dTag && dTag[1] === 'paytaca:avatar'
    })
    return match || null
  } catch (err) {
    console.warn('[Nostr] Failed to fetch avatar:', err)
    return null
  }
}

/**
 * Fetch group metadata from relays (NIP-78 kind:30078).
 * Queries all authors for the d-tag paytaca:group:<roomId>.
 * @param {string[]} relays
 * @param {string} roomId
 * @returns {Promise<object|null>}
 */
export async function fetchGroupMetadata(relays, roomId) {
  const pool = getPool()
  const dTag = `paytaca:group:${roomId}`
  try {
    const events = await pool.querySync(relays, { kinds: [30078], '#d': [dTag] })
    const match = events?.find(e => {
      const dt = e.tags?.find(t => t[0] === 'd')
      return dt && dt[1] === dTag
    })
    return match || null
  } catch (err) {
    console.warn('[Nostr] Failed to fetch group metadata:', err)
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
    const events = await pool.querySync(relays, { kinds: [1059], '#p': [myPubKey], limit: 200 })
    if (!events || !events.length) return
    for (const event of events) {
      if (callbacks.onEvent) callbacks.onEvent(event)
    }
  } catch (err) {
    console.warn('[Nostr] Failed to fetch historical gift-wraps:', err)
  }
}

export { SimplePool }
