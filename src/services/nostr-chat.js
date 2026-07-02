/**
 * Nostr Relay Service for Chat.
 * Wraps nostr-tools SimplePool and handles connection/subscription/publish.
 * Kept outside Vuex because SimplePool is not serializable.
 */

import { SimplePool } from 'nostr-tools/pool'
import { finalizeEvent } from 'nostr-tools'

const isDev = process.env.NODE_ENV !== 'production'

let _pool = null
let _subs = []
let _authSigner = null
let _statusInterval = null
let _resubInterval = null
let _seenEventIds = new Set()
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

// Periodic re-subscription interval. Some relays silently close subscriptions
// (no CLOSED message) after ~30s of inactivity or when nostr-tools' forced-ping
// fires. Without this, the subscription dies and new messages are never
// detected until the user navigates to a different page and back.
const RESUB_INTERVAL_MS = 30000

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
  if (_pool) {
    for (const sub of _subs) {
      try { sub.close() } catch (_) {}
    }
    _subs = []
    try { _pool.close(_subscribedRelays) } catch (_) {}
    _pool = null
  }
  if (_statusInterval) {
    clearTimeout(_statusInterval)
    _statusInterval = null
  }
  if (_resubInterval) {
    clearInterval(_resubInterval)
    _resubInterval = null
  }
  _isSubscribed = false
  _lastSubscribeTime = 0
  _subscribedRelays = []
  _subscribedPubKey = null
  _subscribing = false
  _subscriptionCallbacks = null
  _statusBackoff = 1
  _seenEventIds.clear()
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
 * Clear the seen-event dedup cache. Used when rejoining a group so that
 * messages dropped while the group was blocked can be re-fetched.
 */
export function clearSeenEventIds() {
  _seenEventIds.clear()
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
 * Subscribe to kind:1059 gift-wraps addressed to our pubkey.
 *
 * This creates a real-time WebSocket subscription that stays open after EOSE
 * and receives new events as they are published. nostr-tools SimplePool
 * (configured with enableReconnect + enablePing) handles:
 *   - WebSocket keepalive via forced-ping every 29s
 *   - Automatic reconnection with backoff on disconnect
 *   - Re-establishing subscriptions on reconnect, using `since = lastEmitted + 1`
 *     to only fetch events missed during the gap
 *
 * No polling fallback is needed — the subscription IS the delivery mechanism.
 * The guard prevents unnecessary re-subscription which would cause relays to
 * re-send ALL historical events.
 *
 * @param {string[]} relays
 * @param {string} myPubKey - Hex pubkey
 * @param {{ onEvent(event): void }} callbacks
 * @param {{ force?: boolean, since?: number }} options
 * @returns {{ close(): void }}
 */
export function subscribeGiftWraps(relays, myPubKey, callbacks = {}, options = {}) {
  const now = Date.now()

  // Guard: skip if subscribed recently with the same relays/pubkey (unless forced).
  // Uses a time-based cooldown (60s) to prevent navigation between pages from
  // re-creating the subscription and re-fetching 3 days of history each time.
  // The periodic re-subscription (every 30s) only fires when _subs is empty
  // (subscription actually dead), so this cooldown doesn't block recovery.
  if (
    !options.force &&
    (now - _lastSubscribeTime) < 60000 &&
    _subscribedPubKey === myPubKey &&
    arraysEqual(_subscribedRelays, relays)
  ) {
    return { close() {} }
  }

  // Prevent concurrent re-subscription
  if (_subscribing && !options.force) {
    return { close() {} }
  }

  // Close any stale subscriptions before creating new ones
  for (const sub of _subs) {
    try { sub.close() } catch (_) {}
  }
  _subs = []

  // Store callbacks for future reference
  _subscriptionCallbacks = callbacks

  const pool = getPool()
  // Two filters: gift wraps addressed to us (received) AND authored by us (sent).
  // Each filter must be passed individually to subscribeMany — nostr-tools
  // expects a single filter object, not an array. Passing an array creates a
  // nested REQ message like ["REQ","sub:1",[f1,f2]] which relays reject.
  //
  // `since` is set from the newest known message timestamp (minus a 3-day
  // buffer for NIP-17 randomization — spec allows ±2 days) so the relay
  // only sends events we haven't seen yet instead of re-sending the entire history.
  const since = options.since
  const filterReceived = { kinds: [1059], '#p': [myPubKey] }
  const filterSent = { kinds: [1059], authors: [myPubKey] }
  if (since) {
    filterReceived.since = since
    filterSent.since = since
  }
  const filters = [filterReceived, filterSent]

  try {
    _subscribing = true

    // Subscribe to each relay individually so we can track which ones work.
    // Create a separate subscription per filter per relay.
    for (const relayUrl of relays) {
      for (const filter of filters) {
        try {
          const sub = pool.subscribeMany([relayUrl], filter, {
            onevent(event) {
              if (_seenEventIds.has(event.id)) return
              _seenEventIds.add(event.id)
              // Prevent unbounded growth
              if (_seenEventIds.size > 5000) {
                const toDelete = Array.from(_seenEventIds).slice(0, _seenEventIds.size - 5000)
                toDelete.forEach(id => _seenEventIds.delete(id))
              }
              if (callbacks.onEvent) callbacks.onEvent(event)
            },
            onclose(reasons) {
              if (isDev) console.warn(`[Nostr] Subscription closed for ${relayUrl}:`, reasons)
              // Remove this sub from our tracking. nostr-tools handles
              // reconnection and re-subscription internally — we don't need
              // our own resubscribe/keepalive logic.
              const idx = _subs.indexOf(sub)
              if (idx !== -1) _subs.splice(idx, 1)
              if (_subs.length === 0) {
                _isSubscribed = false
              }
            },
          })
          _subs.push(sub)
        } catch (err) {
          // Relay subscription failed silently
        }
      }
    }
  } finally {
    _subscribing = false
  }

  _isSubscribed = _subs.length > 0
  _lastSubscribeTime = now
  _subscribedRelays = [...relays]
  _subscribedPubKey = myPubKey

  // Periodic re-subscription: some relays silently close subscriptions after
  // ~30s. This force-recreates the subscription every 30s with `since` set to
  // 3 days ago (NIP-17 randomizes created_at by ±2 days), so the relay only
  // re-sends recent events (deduped by _seenEventIds). Without this, new
  // messages stop being detected on pages where the user stays for a while.
  if (!_resubInterval) {
    _resubInterval = setInterval(() => {
      if (_subscribedRelays.length > 0 && _subscribedPubKey && _subscriptionCallbacks) {
        // Only re-subscribe if all subs have been closed (relay silently
        // dropped them). If subs are still alive, the real-time subscription
        // handles new messages — no need to re-fetch history.
        if (_subs.length === 0) {
          const since = Math.floor(Date.now() / 1000) - 259200 // 3 days for NIP-17 ±2 day randomization
          subscribeGiftWraps(_subscribedRelays, _subscribedPubKey, _subscriptionCallbacks, {
            force: true,
            since,
          })
        }
      }
    }, RESUB_INTERVAL_MS)
  }

  return {
    close() {
      for (const sub of _subs) {
        try { sub.close() } catch (_) {}
      }
      _subs = []
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
      { kinds: [30078], authors: [pubKey] },
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
  return new Promise((resolve) => {
    let resolved = false
    let activeRelays = relays.length
    const timer = setTimeout(() => {
      if (!resolved) { resolved = true; resolve(null) }
    }, 8000)

    const sub = pool.subscribeMany(
      relays,
      { kinds: [30078], authors: [pubKey] },
      {
        onevent(event) {
          if (resolved) return
          const dTag = event.tags?.find(t => t[0] === 'd')
          if (dTag && dTag[1] === 'paytaca:display-name') {
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
 * Fetch a user's published avatar (paytaca:avatar) from relays.
 * @param {string[]} relays
 * @param {string} pubKey - Hex pubkey
 * @returns {Promise<import('nostr-tools').Event|null>}
 */
export async function fetchAvatar(relays, pubKey) {
  const pool = getPool()
  return new Promise((resolve) => {
    let resolved = false
    let activeRelays = relays.length
    const timer = setTimeout(() => {
      if (!resolved) { resolved = true; resolve(null) }
    }, 8000)

    const sub = pool.subscribeMany(
      relays,
      { kinds: [30078], authors: [pubKey] },
      {
        onevent(event) {
          if (resolved) return
          const dTag = event.tags?.find(t => t[0] === 'd')
          if (dTag && dTag[1] === 'paytaca:avatar') {
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
    const matching = events?.filter(e => {
      const dt = e.tags?.find(t => t[0] === 'd')
      return dt && dt[1] === dTag
    })
    if (!matching || matching.length === 0) return null
    // Pick the newest event by created_at so the most recent rename wins,
    // regardless of which member published it. This makes group naming
    // deterministic across all clients.
    return matching.reduce((newest, e) => e.created_at > newest.created_at ? e : newest)
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
    // Fetch gift wraps addressed to us (messages from others) AND
    // gift wraps authored by us (includes self-wraps of our sent messages)
    // Use allSettled so a failure in one query doesn't drop the other's results
    const [receivedResult, sentResult] = await Promise.allSettled([
      pool.querySync(relays, { kinds: [1059], '#p': [myPubKey], limit: 200 }),
      pool.querySync(relays, { kinds: [1059], authors: [myPubKey], limit: 200 }),
    ])
    const received = receivedResult.status === 'fulfilled' ? receivedResult.value : []
    const sent = sentResult.status === 'fulfilled' ? sentResult.value : []
    const events = [...(received || []), ...(sent || [])]
    if (!events.length) return
    for (const event of events) {
      // Dedup against the real-time subscription's seen set so we don't
      // process the same event twice (once here, once via onevent).
      if (_seenEventIds.has(event.id)) continue
      _seenEventIds.add(event.id)
      if (callbacks.onEvent) callbacks.onEvent(event)
    }
  } catch (err) {
    console.warn('[Nostr] Failed to fetch historical gift-wraps:', err)
  }
}

export { SimplePool }
