/**
 * Nostr Relay Service for Chat.
 * Wraps nostr-tools SimplePool and handles connection/subscription/publish.
 * Kept outside Vuex because SimplePool is not serializable.
 */

import { SimplePool } from 'nostr-tools/pool'
import { finalizeEvent } from 'nostr-tools'
import { hexToBytes } from 'src/utils/encoding'

const isDev = process.env.NODE_ENV !== 'production'

let _pool = null
let _subs = []
let _authSigner = null
let _statusInterval = null
let _resubInterval = null
let _seenEventIds = new Set()
let _subscriptionCallbacks = null

// MLS subscription state (separate from gift-wrap subscription)
let _mlsSubs = []
let _mlsSeenEventIds = new Set()
let _mlsSubscribedRelays = []
let _mlsSubscribedPubKey = null
let _mlsSubscribedGroupHexes = []
let _mlsSubscribing = false
let _mlsSubscriptionCallbacks = null
let _mlsResubInterval = null

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

  for (const sub of _mlsSubs) {
    try { sub.close() } catch (_) {}
  }
  _mlsSubs = []
  if (_mlsResubInterval) {
    clearInterval(_mlsResubInterval)
    _mlsResubInterval = null
  }
  _mlsSubscribedRelays = []
  _mlsSubscribedPubKey = null
  _mlsSubscribedGroupHexes = []
  _mlsSubscriptionCallbacks = null
  _mlsSeenEventIds.clear()
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

/**
 * Subscribe to NIP-EE MLS group events for a list of nostr_group_ids.
 *
 * NIP-EE uses dedicated kinds on the relay:
 *  - kind 443  (NIP-EE KeyPackage)   — authored by the identity key
 *  - kind 444  (NIP-EE Welcome)      — always gift-wrapped (kind 1059), never
 *                                      published directly, so no #444 filter
 *  - kind 445  (NIP-EE Group Event)  — signed with an ephemeral key, tagged
 *                                      with the 32-byte nostr_group_id in #h
 *  - kind 10051 (NIP-EE relay list)  — ignored here (only written)
 *
 * Group events are NOT authored by our pubkey, so we filter by #h only.
 *
 * @param {string[]} relays
 * @param {string} myPubKey - Hex pubkey (used for the replaceable resubscribe key)
 * @param {string[]} nostrGroupHexes - nostr_group_ids (hex) to subscribe for
 * @param {{ onEvent(event): void }} callbacks
 * @param {Object} [options]
 * @param {boolean} [options.force]
 * @param {number} [options.since]
 * @returns {{ close(): void }}
 */
export function subscribeMlsEvents(relays, myPubKey, nostrGroupHexes = [], callbacks = {}, options = {}) {
  const subKey = JSON.stringify([myPubKey, nostrGroupHexes, relays])

  if (
    !options.force &&
    _mlsSubscribedPubKey === subKey &&
    arraysEqual(_mlsSubscribedRelays, relays)
  ) {
    return { close() {} }
  }

  if (_mlsSubscribing && !options.force) {
    return { close() {} }
  }

  for (const sub of _mlsSubs) {
    try { sub.close() } catch (_) {}
  }
  _mlsSubs = []

  _mlsSubscriptionCallbacks = callbacks

  const pool = getPool()

  const filters = []
  // Group events for our groups, scoped by h tag. We deliberately don't
  // filter on authors: NIP-EE kind-445 events are signed with an ephemeral
  // key (event.pubkey != identity), so an `authors: [myPubKey]` filter would
  // never match and would only waste a subscription.
  if (nostrGroupHexes.length > 0) {
    filters.push({ kinds: [445], '#h': nostrGroupHexes })
  }
  if (options.since) {
    for (const filter of filters) {
      filter.since = options.since
    }
  }

  try {
    _mlsSubscribing = true

    for (const relayUrl of relays) {
      for (const filter of filters) {
        try {
          const sub = pool.subscribeMany([relayUrl], filter, {
            onevent(event) {
              if (_mlsSeenEventIds.has(event.id)) return
              _mlsSeenEventIds.add(event.id)
              if (_mlsSeenEventIds.size > 5000) {
                const toDelete = Array.from(_mlsSeenEventIds).slice(0, _mlsSeenEventIds.size - 5000)
                toDelete.forEach(id => _mlsSeenEventIds.delete(id))
              }
              if (callbacks.onEvent) callbacks.onEvent(event)
            },
            onclose(reasons) {
              if (isDev) console.warn(`[MLS] Subscription closed for ${relayUrl}:`, reasons)
              const idx = _mlsSubs.indexOf(sub)
              if (idx !== -1) _mlsSubs.splice(idx, 1)
            },
          })
          _mlsSubs.push(sub)
        } catch (_) {}
      }
    }
  } finally {
    _mlsSubscribing = false
  }

  _mlsSubscribedRelays = [...relays]
  _mlsSubscribedPubKey = subKey
  _mlsSubscribedGroupHexes = [...nostrGroupHexes]

  if (!_mlsResubInterval) {
    _mlsResubInterval = setInterval(() => {
      if (_mlsSubscribedRelays.length > 0 && _mlsSubscribedPubKey && _mlsSubscriptionCallbacks) {
        if (_mlsSubs.length === 0) {
          const since = Math.floor(Date.now() / 1000) - 259200
          subscribeMlsEvents(_mlsSubscribedRelays, myPubKey, _mlsSubscribedGroupHexes, _mlsSubscriptionCallbacks, {
            force: true,
            since,
          })
        }
      }
    }, RESUB_INTERVAL_MS)
  }

  return {
    close() {
      for (const sub of _mlsSubs) {
        try { sub.close() } catch (_) {}
      }
      _mlsSubs = []
      _mlsSubscriptionCallbacks = null
    },
  }
}

/**
 * Fetch historical NIP-EE MLS group events for our groups (by nostr_group_id).
 * @param {string[]} relays
 * @param {string[]} nostrGroupHexes - nostr_group_ids (hex)
 * @param {{ onEvent(event): void }} callbacks
 * @returns {Promise<void>}
 */
export async function fetchMlsHistory(relays, nostrGroupHexes = [], callbacks = {}) {
  const pool = getPool()
  try {
    const queries = []
    if (nostrGroupHexes.length > 0) {
      queries.push({ kinds: [445], '#h': nostrGroupHexes, limit: 500 })
    }

    const results = await Promise.allSettled(queries.map((q) => pool.querySync(relays, q)))
    const events = []
    for (const result of results) {
      if (result.status === 'fulfilled') events.push(...(result.value || []))
    }
    if (!events.length) return
    // Dedupe across overlapping filters, order oldest-first for replay.
    const seen = new Set()
    const unique = []
    for (const event of events.sort((a, b) => a.created_at - b.created_at)) {
      if (seen.has(event.id)) continue
      seen.add(event.id)
      unique.push(event)
    }
    for (const event of unique) {
      if (_mlsSeenEventIds.has(event.id)) continue
      _mlsSeenEventIds.add(event.id)
      if (callbacks.onEvent) callbacks.onEvent(event)
    }
  } catch (err) {
    console.warn('[MLS] Failed to fetch historical events:', err)
  }
}

/**
 * Fetch a member's NIP-EE KeyPackages (kind 443, authored by the member).
 * @param {string[]} relays
 * @param {string} pubKey - Hex pubkey
 * @returns {Promise<import('nostr-tools').NostrEvent[]>}
 */
export async function fetchNipEeKeyPackage(relays, pubKey) {
  const pool = getPool()
  try {
    const events = await pool.querySync(relays, {
      kinds: [443],
      authors: [pubKey],
      limit: 100,
    })
    if (events && events.length > 0) {
      return events.sort((a, b) => b.created_at - a.created_at)
    }
    return []
  } catch (err) {
    console.warn('[MLS] Failed to fetch NIP-EE KeyPackage for', pubKey?.slice(0, 16), 'error:', err.message)
    return []
  }
}

/**
 * Fetch gift-wrapped event addressed to a specific member pubkey, returning
 * only the NIP-EE MLS welcome envelopes among them. Kept for compatibility with
 * legacy callers; welcome processing now happens inline in the gift-wrap
 * subscription (kind-444 rumors surface via receiveMessage → receiveMlsWelcomeRumor).
 * @param {string[]} relays
 * @param {string} authorPubKey - Hex pubkey of the welcome sender
 * @param {string} memberPubKey - Hex pubkey of the invited member
 * @returns {Promise<import('nostr-tools').NostrEvent[]>}
 */
export async function fetchMlsWelcomeEvents(relays, authorPubKey, memberPubKey) {
  const pool = getPool()
  try {
    const events = await pool.querySync(relays, {
      kinds: [1059],
      authors: [authorPubKey],
      '#p': [memberPubKey],
      limit: 100,
    })
    return events || []
  } catch (err) {
    console.warn('[MLS] Failed to fetch welcome events:', err.message)
    return []
  }
}

/**
 * Fetch the ids of events we have deleted (NIP-09 kind-5 authored by us) so
 * declined MLS invitations can be filtered out even though relays still serve
 * the original welcome events.
 * @param {string[]} relays
 * @param {string} pubKey - Hex pubkey
 * @returns {Promise<Set<string>>} deleted event ids
 */
export async function fetchOwnDeletionEventIds(relays, pubKey) {
  const pool = getPool()
  try {
    const events = await pool.querySync(relays, {
      kinds: [5],
      authors: [pubKey],
      limit: 200,
    })
    const ids = new Set()
    for (const e of events || []) {
      for (const t of e.tags || []) {
        if (t[0] === 'e' && t[1]) ids.add(t[1])
      }
    }
    return ids
  } catch (err) {
    console.warn('[MLS] Failed to fetch deletion events:', err.message)
    return new Set()
  }
}

/**
 * Query the given relays for recent NIP-EE group events (kind 445) addressed
 * to a specific group (matched by the #h tag). Returns events for that group
 * regardless of author, so a diagnostic can tell whether messages from other
 * members are actually reaching the relay (transport/publish ok) versus
 * failing locally.
 * @param {string[]} relays
 * @param {string} nostrGroupIdHex - Hex NIP-EE nostr_group_data group id (#h tag value)
 * @param {number} [limit]
 * @returns {Promise<import('nostr-tools').NostrEvent[]>}
 */
export async function fetchMlsGroupEvents(relays, nostrGroupIdHex, limit = 100) {
  const pool = getPool()
  try {
    const events = await pool.querySync(relays, {
      kinds: [445],
      '#h': [nostrGroupIdHex],
      limit,
    })
    return (events || []).sort((a, b) => a.created_at - b.created_at)
  } catch (err) {
    console.warn('[MLS] Failed to fetch group events:', err.message)
    return []
  }
}

export { SimplePool }
