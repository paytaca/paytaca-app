import { ACTIVE_THRESHOLD_MS } from './state'
import { deriveNostrKeys, createUnsignedKind14, createNip17GiftWraps, computeRoomId, createKind10050, createReadReceiptGiftWrap, createReactionGiftWraps, createKind5DeletionGiftWraps } from 'src/wallet/nostr'
import { finalizeEvent, verifyEvent, getEventHash, nip44, utils as nostrUtils } from 'nostr-tools'
const { hexToBytes } = nostrUtils

// Tracks retry attempts for failed read receipt sends. Keyed by roomId:messageId,
// value is the number of retries attempted so far. Prevents infinite retry loops
// when a relay is persistently unreachable.
const _readReceiptRetries = new Map()
const MAX_READ_RECEIPT_RETRIES = 3
const _markRoomLocks = new Set()

// Pending read receipts where the referenced message hadn't arrived yet.
// Keyed by messageId → [{ readerPubKey }]. Flushed at the end of every
// receiveMessage call.
const _pendingReadReceipts = new Map()

// Fast lookup: messageId → roomId. Populated by commitAddMessage below so that
// kind 7 read-receipt processing (Object.keys(ws.messages).find(...)) doesn't
// scan every room and every message per receipt. Reset on wallet switch.
const _messageRoomMap = new Map()

// Add a message to the store. When bumpIfNew is true and the message is
// not already in the store (genuinely new), also set room.lastMessageAt
// to wall-clock time so the conversation list re-sorts instantly.
// bumpIfNew should be false for historical message loads.
function commitAddMessage (commit, state, roomId, message, { bumpIfNew = true } = {}) {
  const ws = getWalletState(state)
  const existed = ws.messages?.[roomId]?.some(m => m.id === message.id)
  commit('ADD_MESSAGE', { roomId, message })
  if (message?.id) _messageRoomMap.set(message.id, roomId)
  if (bumpIfNew && !existed) {
    commit('TOUCH_ROOM_LAST_MESSAGE_AT', roomId)
  }
  return !existed
}

// Per-room debounce timers for touchRoom. During the initial relay sync,
// messages stream in rapidly — touching the server for every one would be
// excessive. Instead we debounce: each new message resets a 2s timer for
// its room, and only the last message in each burst triggers the touch.
const _roomTouchTimers = {}
const _roomTouchPending = {}

// Debounced re-fetch of room list. When the relay discovers rooms not in
// the local cache, we batch them into a single reload after a short quiet
// period so rapid bursts don't hammer the server. Each new call resets
// the timer so the fetch always fires after the last discovery.
let _refetchRoomsTimer = null

function debouncedRefetchRooms (dispatch) {
  if (_refetchRoomsTimer) clearTimeout(_refetchRoomsTimer)
  _refetchRoomsTimer = setTimeout(() => {
    _refetchRoomsTimer = null
    dispatch('fetchRooms').catch(() => {})
  }, 2000)
}

// Fetch group metadata from relay and update the server if a real name is found.
// Shared by fetchRooms (placeholder recovery) and receiveMessage (new room sync).
function fetchAndSyncGroupMetadata (dispatch, roomId) {
  dispatch('fetchGroupMetadata', { roomId }).then(async meta => {
    if (meta?.name) {
      await updateRoomOnServer(roomId, { name: meta.name })
      debouncedRefetchRooms(dispatch)
    }
  }).catch(() => {})
}

function queueRoomTouch (dispatch, roomId, timestamp) {
  _roomTouchPending[roomId] = timestamp
  if (_roomTouchTimers[roomId]) clearTimeout(_roomTouchTimers[roomId])
  _roomTouchTimers[roomId] = setTimeout(() => {
    const ts = _roomTouchPending[roomId]
    delete _roomTouchPending[roomId]
    delete _roomTouchTimers[roomId]
    dispatch('touchRoom', { roomId, timestamp: ts })
  }, 2000)
}

function flushRoomTouch (dispatch, roomId) {
  if (_roomTouchTimers[roomId]) clearTimeout(_roomTouchTimers[roomId])
  delete _roomTouchTimers[roomId]
  const ts = _roomTouchPending[roomId]
  if (ts) {
    delete _roomTouchPending[roomId]
    dispatch('touchRoom', { roomId, timestamp: ts })
  }
}

function flushAllRoomTouches (dispatch) {
  for (const roomId of Object.keys(_roomTouchPending)) {
    flushRoomTouch(dispatch, roomId)
  }
}

function clearDebouncedTimers () {
  for (const roomId of Object.keys(_roomTouchTimers)) {
    clearTimeout(_roomTouchTimers[roomId])
    delete _roomTouchTimers[roomId]
  }
  for (const roomId of Object.keys(_roomTouchPending)) {
    delete _roomTouchPending[roomId]
  }
  if (_refetchRoomsTimer) {
    clearTimeout(_refetchRoomsTimer)
    _refetchRoomsTimer = null
  }
}

function flushPendingReadReceipts (state, commit) {
  if (!_pendingReadReceipts.size) return
  const ws = getWalletState(state)
  if (!ws) return
  for (const [messageId, readers] of _pendingReadReceipts) {
    for (const roomId of Object.keys(ws.messages)) {
      if (ws.messages[roomId]?.some(m => m.id === messageId)) {
        for (const { readerPubKey } of readers) {
          commit('SET_MESSAGE_READ_BY', { roomId, messageId, readerPubKey })
        }
        _pendingReadReceipts.delete(messageId)
        break
      }
    }
  }
}
import { getMnemonic, getMnemonicByHash } from 'src/wallet'
import { decode as nip19Decode } from 'nostr-tools/nip19'
import * as relayService from 'src/services/nostr-chat'
import Watchtower from 'watchtower-cash-js'
import { getAuthHeaders, clearToken } from 'src/utils/watchtower-oauth'
import {
  encryptFile,
  encryptBytes,
  captureAndEncryptVideoThumbnail,
  decryptFile,
  createKind15FileMessage,
  wrapKind15FileMessage,
  uploadToBlossom,
  downloadFromBlossom,
  parseKind15FileMessage,
  base64ToHex,
} from 'src/wallet/nostr-media'
import { clearChatCache } from 'src/components/chat/MessageBubble.vue'
import { Store } from 'src/store'

const isDev = process.env.NODE_ENV !== 'production'
const debug = (...args) => { if (isDev) console.log('[Nostr]', ...args) }

function fetchMemberDisplayNames (dispatch, memberPubKeys) {
  for (const pk of memberPubKeys) {
    dispatch('fetchPublishedDisplayName', { pubKeyHex: pk }).catch(() => {})
  }
}

// Per-recipient cache of kind:10050 relay-preference fetches. Each send was
// previously issuing a `pool.querySync` per recipient before publishing the
// gift-wrap, which blocked sends. Cache for 10 minutes; a stale relay list is
// fine — delivery falls back to our own relays.
const _kind10050Cache = new Map()
const KIND10050_TTL_MS = 10 * 60 * 1000
async function fetchKind10050Cached(relays, pubKey) {
  const hit = _kind10050Cache.get(pubKey)
  if (hit && Date.now() - hit.ts < KIND10050_TTL_MS) return hit.value
  const value = await relayService.fetchKind10050(relays, pubKey)
  _kind10050Cache.set(pubKey, { ts: Date.now(), value })
  return value
}

function getCurrentWalletHash () {
  try {
    const wallet = Store.getters['global/getWallet']('bch')
    return wallet?.walletHash || null
  } catch (error) {
    return null
  }
}

function getWalletState (state) {
  const hash = getCurrentWalletHash()
  if (!hash) return {}
  if (!state.byWallet) return {}
  if (!state.byWallet[hash]) return {}
  return state.byWallet[hash]
}

const DISCOVERY_RELAYS = [
  'wss://relay.paytaca.com',
]

export async function reinitialize ({ commit, dispatch, state }) {
  const walletHash = getCurrentWalletHash()
  if (!walletHash) return
  const mnemonic = await getMnemonicByHash(walletHash)
  if (!mnemonic) return

  // Clear debounced timers from the previous wallet session to prevent
  // stale touchRoom/fetchRooms dispatches against the new wallet state.
  clearDebouncedTimers()
  _messageRoomMap.clear()
  for (const key of Object.keys(_lastTypingSent)) {
    delete _lastTypingSent[key]
  }

  const keys = deriveNostrKeys(mnemonic)
  const ws = getWalletState(state)

  if (ws.keys?.pubKeyHex === keys.pubKeyHex) return

  // Disconnect existing relay subscriptions for the old identity
  stopActiveServices()
  relayService.stopStatusPolling()
  relayService.disconnect()
  commit('SET_SUBSCRIBED', false)
  clearChatCache().catch(err => console.warn('Failed to clear chat cache during reinitialize:', err))

  // Clear cached encryption key — the new wallet has a different mnemonic
  _roomNameEncryptionKey = null
  _roomNameEncryptionKeyPromise = null

  commit('SET_KEYS', keys)
  commit('SET_READY', true)
  commit('SET_INITIALIZED', true)
  relayService.setAuthKey(keys.privKeyHex)

  // Register this wallet's Nostr pubkey in Watchtower
  await dispatch('registerNostrPubkey')

    // Fetch profile data for the new wallet
    try {
      const [displayName, bchAddress, avatar] = await Promise.all([
        dispatch('fetchPublishedDisplayName', { pubKeyHex: keys.pubKeyHex }),
        dispatch('fetchPublishedBchAddress', { pubKeyHex: keys.pubKeyHex }),
        dispatch('fetchPublishedAvatar', { pubKeyHex: keys.pubKeyHex }),
      ])
      if (displayName) {
        commit('SET_PROFILE_DISPLAY_NAME', { displayName, publishedAt: Date.now() })
      }
      if (bchAddress) {
        commit('SET_PROFILE_BCH_ADDRESS', { address: bchAddress, publishedAt: Date.now() })
      }
      if (avatar) {
        commit('SET_PROFILE_AVATAR', { avatar, publishedAt: Date.now() })
      }
    } catch (err) {
      console.warn('[Nostr] Failed to fetch profile data during reinitialize:', err)
    }

  dispatch('subscribeToRelays')
}

export async function initialize ({ commit, dispatch, state }) {
  const walletHash = getCurrentWalletHash()
  if (!walletHash) throw new Error('No wallet hash available')
  const mnemonic = await getMnemonicByHash(walletHash)
  if (!mnemonic) throw new Error('No mnemonic available')

  const keys = deriveNostrKeys(mnemonic)
  const ws = getWalletState(state)

  // Already initialized for this wallet — just fetch historical messages
  if (ws.initialized && ws.keys?.pubKeyHex === keys.pubKeyHex) {
    // Restore private key if missing (stripped from persisted state for security)
    if (!ws.keys.privKeyHex) {
      commit('SET_KEYS', keys)
      relayService.setAuthKey(keys.privKeyHex)
    }
    dispatch('fetchHistoricalMessages')

    // Fill profile from caches if persisted profile is incomplete but cached data exists
    const ownPubKeyHex = keys.pubKeyHex
    if (!ws.profile?.displayName) {
      const cachedDisplayName = ws.displayNameCache?.[ownPubKeyHex]?.displayName
      if (cachedDisplayName) {
        commit('SET_PROFILE_DISPLAY_NAME', { displayName: cachedDisplayName, publishedAt: Date.now() })
      }
    }
    if (!ws.profile?.bchAddress) {
      const cachedBchAddress = ws.bchAddressCache?.[ownPubKeyHex]?.address
      if (cachedBchAddress) {
        commit('SET_PROFILE_BCH_ADDRESS', { address: cachedBchAddress, publishedAt: Date.now() })
      }
    }

    // If still incomplete after cache fallback, fetch from relay (with retries)
    if (!ws.profile?.displayName || !ws.profile?.bchAddress) {
      dispatch('fetchOwnProfile', ownPubKeyHex).catch(() => {})
    }
    return
  }

  // Keys mismatch or first init — clear IndexedDB cache if switching from another wallet
  if (ws.initialized || ws.keys?.pubKeyHex) {
    stopActiveServices()
    relayService.stopStatusPolling()
    relayService.disconnect()
    commit('SET_SUBSCRIBED', false)
    clearChatCache().catch(err => console.warn('Failed to clear chat cache during initialize:', err))
  }

  commit('SET_KEYS', keys)
  commit('SET_READY', true)
  commit('SET_INITIALIZED', true)

  // Set up NIP-42 auth signer so relays like damus.io accept our publishes
  relayService.setAuthKey(keys.privKeyHex)

  // Fetch profile data for this wallet
  try {
    const [displayName, bchAddress, avatar] = await Promise.all([
      dispatch('fetchPublishedDisplayName', { pubKeyHex: keys.pubKeyHex }),
      dispatch('fetchPublishedBchAddress', { pubKeyHex: keys.pubKeyHex }),
      dispatch('fetchPublishedAvatar', { pubKeyHex: keys.pubKeyHex }),
    ])
    if (displayName) {
      commit('SET_PROFILE_DISPLAY_NAME', { displayName, publishedAt: Date.now() })
    }
    if (bchAddress) {
      commit('SET_PROFILE_BCH_ADDRESS', { address: bchAddress, publishedAt: Date.now() })
    }
    if (avatar) {
      commit('SET_PROFILE_AVATAR', { avatar, publishedAt: Date.now() })
    }
  } catch (err) {
    console.warn('[Nostr] Failed to fetch profile data during initialize:', err)
  }

  // Publish kind:10050 relay preferences so other NIP-17 clients know where to reach us
  // This is re-published every time to ensure it lands on all relays
  await dispatch('publishKind10050')

  // Fetch historical gift-wraps that might have been published before our subscription started
  await dispatch('fetchHistoricalMessages')

  // Register this wallet's Nostr pubkey in Watchtower
  dispatch('registerNostrPubkey')
}

export async function fetchOwnProfile ({ commit, dispatch }, pubKeyHex) {
  if (!pubKeyHex) return

  const MAX_ATTEMPTS = 3
  const RETRY_DELAY = 4000

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const [displayName, bchAddress, avatar] = await Promise.all([
        dispatch('fetchPublishedDisplayName', { pubKeyHex }),
        dispatch('fetchPublishedBchAddress', { pubKeyHex }),
        dispatch('fetchPublishedAvatar', { pubKeyHex }),
      ])
      if (displayName) {
        commit('SET_PROFILE_DISPLAY_NAME', { displayName, publishedAt: Date.now() })
      }
      if (bchAddress) {
        commit('SET_PROFILE_BCH_ADDRESS', { address: bchAddress, publishedAt: Date.now() })
      }
      if (avatar) {
        commit('SET_PROFILE_AVATAR', { avatar, publishedAt: Date.now() })
      }
      if (displayName || bchAddress || avatar) return
    } catch (err) {
      console.warn(`[Nostr] Own profile fetch attempt ${attempt + 1}/${MAX_ATTEMPTS} failed:`, err.message)
    }
    if (attempt < MAX_ATTEMPTS - 1) {
      await new Promise(r => setTimeout(r, RETRY_DELAY))
    }
  }
}

export async function registerNostrPubkey ({ state, rootGetters }) {
  const ws = getWalletState(state)
  if (!ws.keys?.pubKeyHex) {
    debug('Skip pubkey registration: no pubkey')
    return
  }

  const walletHash = rootGetters['global/getWallet']('bch')?.walletHash
  if (!walletHash) {
    debug('Skip pubkey registration: no wallet hash')
    return
  }

  const watchtower = new Watchtower(rootGetters['global/isChipnet'])

  // Check if already registered
  try {
    const checkResponse = await watchtower.BCH._api.get(`/nostr/check/${ws.keys.pubKeyHex}/`)
    if (checkResponse?.data?.registered) {
      debug('Pubkey already registered')
      return
    }
  } catch {
    // Check failed, proceed with registration attempt
  }

  const data = {
    pubkey: ws.keys.pubKeyHex,
    wallet_hash: walletHash,
  }

  debug('Registering pubkey...', data)

  try {
    const headers = await getAuthHeaders()
    const response = await watchtower.BCH._api.post('/nostr/register/', data, { headers })
    debug('Pubkey registration successful:', response.data)
  } catch (err) {
    const status = err?.response?.status

    // If token expired (401), clear it and retry once
    if (status === 401) {
      debug('Token expired, clearing and retrying...')
      await clearToken()
      try {
        const headers = await getAuthHeaders()
        const response = await watchtower.BCH._api.post('/nostr/register/', data, { headers })
        debug('Pubkey registration successful (retry):', response.data)
        return
      } catch (retryErr) {
        console.warn('[Nostr] Retry failed:', retryErr?.response?.status, retryErr?.response?.data, retryErr?.message || retryErr)
        return
      }
    }

    console.warn('[Nostr] Failed to register pubkey:', status, err?.response?.data, err?.message || err)
  }
}

/**
 * Publish the user's BCH address as a NIP-78 replaceable event (kind:30078).
 * Signed by the user's Nostr key so any client can verify authenticity.
 */
export async function publishBchAddress ({ state, commit }, { address }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) {
    throw new Error('No Nostr private key available')
  }
  const privKeyBytes = hexToBytes(ws.keys.privKeyHex)
  const event = finalizeEvent({
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', 'paytaca:bch-address'],
      ['p', ws.keys.pubKeyHex],
    ],
    content: JSON.stringify({ name: 'Paytaca BCH Address', data: { address } }),
  }, privKeyBytes)

  const { accepted, errors } = await relayService.publishEvent(state.relays, event)
  if (accepted.length === 0) {
    const errorDetails = errors.map(e => `${e.relay}: ${e.reason}`).join('; ')
    console.warn('[Nostr] Publish failed:', errorDetails)
    throw new Error(`No relay accepted the event. ${errorDetails || 'Check console for details.'}`)
  }

  commit('SET_PROFILE_BCH_ADDRESS', {
    address,
    publishedAt: event.created_at,
  })
  commit('CACHE_BCH_ADDRESS', { pubKeyHex: ws.keys.pubKeyHex, address })
  console.log('[Nostr] Published BCH address:', address)
}

/**
 * Remove the published BCH address by publishing an empty kind:30078 event.
 */
export async function removeBchAddress ({ state, commit }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) {
    throw new Error('No Nostr private key available')
  }
  const privKeyBytes = hexToBytes(ws.keys.privKeyHex)
  const event = finalizeEvent({
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', 'paytaca:bch-address'],
      ['p', ws.keys.pubKeyHex],
    ],
    content: JSON.stringify({ name: 'Paytaca BCH Address', data: {} }),
  }, privKeyBytes)

  const { accepted, errors } = await relayService.publishEvent(state.relays, event)
  if (accepted.length === 0) {
    const errorDetails = errors.map(e => `${e.relay}: ${e.reason}`).join('; ')
    console.warn('[Nostr] Removal publish failed:', errorDetails)
    throw new Error(`No relay accepted the removal event. ${errorDetails || 'Check console for details.'}`)
  }

  commit('CLEAR_PROFILE_BCH_ADDRESS')
  commit('CLEAR_CACHE_BCH_ADDRESS', { pubKeyHex: ws.keys.pubKeyHex })
  console.log('[Nostr] Removed published BCH address')
}

/**
 * Fetch a user's published BCH address from relays.
 * Returns the address string or null if not found.
 */
export async function fetchPublishedBchAddress ({ state, commit }, { pubKeyHex, forceRefresh }) {
  const ws = getWalletState(state)
  if (!pubKeyHex) {
    throw new Error('pubKeyHex is required')
  }

  const cached = ws.bchAddressCache?.[pubKeyHex]
  const CACHE_TTL = 86400000 // 24 hours

  // Return cached address if fresh
  if (!forceRefresh && cached?.address && (Date.now() - cached.fetchedAt) < CACHE_TTL) {
    return cached.address
  }

  const event = await relayService.fetchBchAddress(state.relays, pubKeyHex)

  if (!event) {
    console.log('[Nostr] No BCH address event found on relay')
    // Fall back to stale cache if available
    if (cached?.address) {
      console.log('[Nostr] Falling back to cached BCH address')
      return cached.address
    }
    return null
  }

  if (!verifyEvent(event)) {
    console.warn('[Nostr] BCH address event failed signature verification')
    if (cached?.address) return cached.address
    return null
  }

  // Parse JSON content — kind:30078 content is a JSON object
  let parsed
  try {
    parsed = JSON.parse(event.content || '{}')
  } catch {
    console.warn('[Nostr] BCH address event has invalid JSON content')
    if (cached?.address) return cached.address
    return null
  }

  const address = parsed?.data?.address?.trim()
  if (!address) {
    console.log('[Nostr] BCH address event has no address — was removed or empty')
    if (cached?.address) return cached.address
    return null
  }

  console.log('[Nostr] Found BCH address:', address)
  commit('CACHE_BCH_ADDRESS', { pubKeyHex, address })
  return address
}

/**
 * Publish the user's display name as a NIP-78 replaceable event (kind:30078).
 */
export async function publishDisplayName ({ state, commit }, { displayName }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) {
    throw new Error('No Nostr private key available')
  }
  const privKeyBytes = hexToBytes(ws.keys.privKeyHex)
  const event = finalizeEvent({
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', 'paytaca:display-name'],
      ['p', ws.keys.pubKeyHex],
    ],
    content: JSON.stringify({ name: 'Paytaca Display Name', data: { displayName } }),
  }, privKeyBytes)

  const { accepted, errors } = await relayService.publishEvent(state.relays, event)
  if (accepted.length === 0) {
    const errorDetails = errors.map(e => `${e.relay}: ${e.reason}`).join('; ')
    throw new Error(`No relay accepted the event. ${errorDetails || 'Check console for details.'}`)
  }

  commit('SET_PROFILE_DISPLAY_NAME', { displayName, publishedAt: event.created_at })
  commit('CACHE_DISPLAY_NAME', { pubKeyHex: ws.keys.pubKeyHex, displayName })
  console.log('[Nostr] Published display name:', displayName)
}

/**
 * Remove the published display name by publishing an empty kind:30078 event.
 */
export async function removeDisplayName ({ state, commit }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) {
    throw new Error('No Nostr private key available')
  }
  const privKeyBytes = hexToBytes(ws.keys.privKeyHex)
  const event = finalizeEvent({
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', 'paytaca:display-name'],
      ['p', ws.keys.pubKeyHex],
    ],
    content: JSON.stringify({ name: 'Paytaca Display Name', data: {} }),
  }, privKeyBytes)

  const { accepted, errors } = await relayService.publishEvent(state.relays, event)
  if (accepted.length === 0) {
    const errorDetails = errors.map(e => `${e.relay}: ${e.reason}`).join('; ')
    throw new Error(`No relay accepted the removal event. ${errorDetails || 'Check console for details.'}`)
  }

  commit('CLEAR_PROFILE_DISPLAY_NAME')
  commit('CLEAR_CACHE_DISPLAY_NAME', { pubKeyHex: ws.keys.pubKeyHex })
  console.log('[Nostr] Removed published display name')
}

/**
 * Fetch a user's published display name from relays.
 * Returns the display name string or null if not found.
 */
export async function fetchPublishedDisplayName ({ state, commit }, { pubKeyHex, forceRefresh }) {
  const ws = getWalletState(state)
  if (!pubKeyHex) throw new Error('pubKeyHex is required')

  const cached = ws.displayNameCache?.[pubKeyHex]
  const CACHE_TTL = 86400000 // 24 hours

  if (!forceRefresh && cached?.displayName && (Date.now() - cached.fetchedAt) < CACHE_TTL) {
    return cached.displayName
  }

  const event = await relayService.fetchDisplayName(state.relays, pubKeyHex)
  if (!event) {
    if (cached?.displayName) return cached.displayName
    return null
  }

  if (!verifyEvent(event)) {
    console.warn('[Nostr] Display name event failed signature verification')
    if (cached?.displayName) return cached.displayName
    return null
  }

  let parsed
  try {
    parsed = JSON.parse(event.content || '{}')
  } catch {
    console.warn('[Nostr] Display name event has invalid JSON content')
    if (cached?.displayName) return cached.displayName
    return null
  }

  const displayName = parsed?.data?.displayName?.trim()
  if (!displayName) {
    if (cached?.displayName) return cached.displayName
    return null
  }

  console.log('[Nostr] Found display name:', displayName)
  commit('CACHE_DISPLAY_NAME', { pubKeyHex, displayName })
  return displayName
}

/**
 * Publish avatar as a NIP-78 replaceable event (kind:30078).
 * Avatar is stored as a base64 data URL in the content.
 */
export async function publishAvatar ({ state, commit }, { avatarDataUrl }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) {
    throw new Error('No Nostr private key available')
  }
  const privKeyBytes = hexToBytes(ws.keys.privKeyHex)
  const event = finalizeEvent({
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', 'paytaca:avatar'],
      ['p', ws.keys.pubKeyHex],
    ],
    content: JSON.stringify({ name: 'Paytaca Avatar', data: { avatar: avatarDataUrl } }),
  }, privKeyBytes)

  const { accepted, errors } = await relayService.publishEvent(state.relays, event)
  if (accepted.length === 0) {
    const errorDetails = errors.map(e => `${e.relay}: ${e.reason}`).join('; ')
    throw new Error(`No relay accepted the event. ${errorDetails || 'Check console for details.'}`)
  }

  commit('SET_PROFILE_AVATAR', { avatar: avatarDataUrl, publishedAt: event.created_at })
  console.log('[Nostr] Published avatar')
}

/**
 * Remove the published avatar by publishing an empty kind:30078 event.
 */
export async function removeAvatar ({ state, commit }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) {
    throw new Error('No Nostr private key available')
  }
  const privKeyBytes = hexToBytes(ws.keys.privKeyHex)
  const event = finalizeEvent({
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', 'paytaca:avatar'],
      ['p', ws.keys.pubKeyHex],
    ],
    content: JSON.stringify({ name: 'Paytaca Avatar', data: {} }),
  }, privKeyBytes)

  const { accepted, errors } = await relayService.publishEvent(state.relays, event)
  if (accepted.length === 0) {
    const errorDetails = errors.map(e => `${e.relay}: ${e.reason}`).join('; ')
    throw new Error(`No relay accepted the removal event. ${errorDetails || 'Check console for details.'}`)
  }

  commit('CLEAR_PROFILE_AVATAR')
  commit('CLEAR_CACHE_AVATAR', { pubKeyHex: ws.keys.pubKeyHex })
  console.log('[Nostr] Removed published avatar')
}

/**
 * Fetch a user's published avatar from relays.
 * Returns the avatar data URL string or null if not found.
 */
export async function fetchPublishedAvatar ({ state, commit }, { pubKeyHex, forceRefresh }) {
  const ws = getWalletState(state)
  if (!pubKeyHex) throw new Error('pubKeyHex is required')

  const cached = ws.avatarCache?.[pubKeyHex]
  const CACHE_TTL = 86400000 // 24 hours

  if (!forceRefresh && cached?.avatar && (Date.now() - cached.fetchedAt) < CACHE_TTL) {
    return cached.avatar
  }

  const event = await relayService.fetchAvatar(state.relays, pubKeyHex)
  if (!event) {
    if (cached?.avatar) return cached.avatar
    return null
  }

  if (!verifyEvent(event)) {
    console.warn('[Nostr] Avatar event failed signature verification')
    if (cached?.avatar) return cached.avatar
    return null
  }

  let parsed
  try {
    parsed = JSON.parse(event.content || '{}')
  } catch {
    console.warn('[Nostr] Avatar event has invalid JSON content')
    if (cached?.avatar) return cached.avatar
    return null
  }

  const avatar = parsed?.data?.avatar?.trim()
  if (!avatar) {
    if (cached?.avatar) return cached.avatar
    return null
  }

  console.log('[Nostr] Found avatar')
  commit('CACHE_AVATAR', { pubKeyHex, avatar })
  return avatar
}

export async function publishKind10050 ({ state }) {
  const ws = getWalletState(state)
  if (!ws.keys.privKeyHex) return
  try {
    const kind10050 = createKind10050(state.relays, ws.keys.privKeyHex)
    const { accepted } = await relayService.publishEvent(state.relays, kind10050)
    if (accepted.length === 0) {
      console.warn('[Nostr] kind:10050 was not accepted by any relay — other clients may not be able to reply')
    }
  } catch (err) {
    console.warn('[Nostr] Failed to publish kind:10050 relay preferences:', err)
  }
}

export async function fetchHistoricalMessages ({ state, dispatch, commit }) {
  const ws = getWalletState(state)
  if (!ws?.keys?.pubKeyHex) return
  try {
    await relayService.fetchHistoricalGiftWraps(DISCOVERY_RELAYS, ws.keys.pubKeyHex, {
      async onEvent(event) {
        try {
          const { unwrapGiftWrap } = await import('src/wallet/nostr')
          const { rumor, sealPubkey } = unwrapGiftWrap(event, ws.keys.privKeyHex)
          dispatch('receiveMessage', { rumor, sealPubkey, isHistorical: true })
        } catch (err) {
          console.warn('[Nostr] Failed to unwrap historical gift-wrap:', err)
        }
      },
    })
  } catch (err) {
    console.warn('[Nostr] Failed to fetch historical messages:', err)
  }

  // Clean up deletedRooms entries for rooms that were restored during the historical fetch.
  // This allows future live messages to apply subject updates normally.
  for (const roomId of (ws.deletedRooms || [])) {
    if (ws.rooms.some(r => r.id === roomId)) {
      commit('DELETE_ROOM_TRACKER', roomId)
    }
  }
}

export async function addContact ({ state, commit }, { name, npub }) {
  const decoded = nip19Decode(npub)
  if (decoded.type !== 'npub') throw new Error('Invalid npub')
  const pubKeyHex = decoded.data

  // If no name was provided, try to fetch the contact's published display name
  let resolvedName = name?.trim() || ''
  if (!resolvedName) {
    try {
      const event = await relayService.fetchDisplayName(state.relays, pubKeyHex)
      if (event && verifyEvent(event)) {
        const parsed = JSON.parse(event.content || '{}')
        const fetched = parsed?.data?.displayName?.trim()
        if (fetched) resolvedName = fetched
      }
    } catch (err) {
      console.warn('[Nostr] Could not fetch display name for new contact:', err)
    }
  }

  commit('ADD_CONTACT', { name: resolvedName, npub, pubKeyHex, addedAt: Date.now() })
}

export function updateContact ({ commit }, contact) {
  commit('UPDATE_CONTACT', contact)
}

export function removeContact ({ commit }, npub) {
  commit('REMOVE_CONTACT', npub)
}

let _activeServicesRunning = false
let _heartbeatInterval = null
let _activeWs = null
let _activeWsReconnectTimer = null
let _activeWsHandlers = null
let _activeWsHeartbeatTimer = null
let _activeWsAuthRetries = 0
const MAX_WS_AUTH_RETRIES = 5
let _activeExpiryTimers = {}

function clearActiveExpiry (pubkey) {
  if (_activeExpiryTimers[pubkey]) {
    clearTimeout(_activeExpiryTimers[pubkey])
    delete _activeExpiryTimers[pubkey]
  }
}

function clearAllActiveExpiries () {
  for (const key in _activeExpiryTimers) {
    clearTimeout(_activeExpiryTimers[key])
  }
  _activeExpiryTimers = {}
}

// ── Typing indicator timers ─────────────────────────────────────────
// Per-sender auto-hide timers. Keyed by `${pubkeyHex}:${roomId}`.
// On receipt of a typing event, the indicator shows and a 5s timer is
// (re)set; if no new event arrives, the timer fires CLEAR_TYPING.
const TYPING_HIDE_TIMEOUT_MS = 5000
let _typingHideTimers = {}

function clearTypingTimer (pubkeyHex, roomId) {
  const key = `${pubkeyHex}:${roomId}`
  if (_typingHideTimers[key]) {
    clearTimeout(_typingHideTimers[key])
    delete _typingHideTimers[key]
  }
}

function clearAllTypingTimers () {
  for (const key in _typingHideTimers) {
    clearTimeout(_typingHideTimers[key])
  }
  _typingHideTimers = {}
}

function scheduleTypingHide (commit, pubkeyHex, roomId) {
  const key = `${pubkeyHex}:${roomId}`
  clearTypingTimer(pubkeyHex, roomId)
  _typingHideTimers[key] = setTimeout(() => {
    commit('CLEAR_TYPING', { roomId, pubKeyHex: pubkeyHex })
    delete _typingHideTimers[key]
  }, TYPING_HIDE_TIMEOUT_MS)
}

function scheduleActiveExpiry (pubkey, commit) {
  clearActiveExpiry(pubkey)
  _activeExpiryTimers[pubkey] = setTimeout(() => {
    commit('SET_ACTIVE_STATUS', {
      [pubkey]: {
        lastActiveAt: null,
        fetchedAt: Date.now(),
      },
    })
    delete _activeExpiryTimers[pubkey]
  }, ACTIVE_THRESHOLD_MS)
}

function collectActiveStatusPubkeys (state) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys?.pubKeyHex
  const pubkeys = new Set()

  for (const c of state.contacts) {
    if (c.pubKeyHex) pubkeys.add(c.pubKeyHex)
  }

  if (myPubKey) {
    for (const room of (ws.rooms || [])) {
      for (const m of room.members) {
        if (m !== myPubKey) pubkeys.add(m)
      }
    }
  }

  return [...pubkeys]
}

export async function fetchActiveStatus ({ state, commit, rootGetters }) {
  const pubkeys = collectActiveStatusPubkeys(state)
  if (!pubkeys.length) return

  try {
    const isChipnet = rootGetters['global/isChipnet']
    const baseUrl = isChipnet ? 'https://chipnet.watchtower.cash' : 'https://watchtower.cash'
    const authHeaders = await getAuthHeaders()
    const response = await fetch(`${baseUrl}/api/nostr/last-active/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ pubkeys }),
    })
    if (response.status === 401) {
      await clearToken()
      const retryResponse = await fetch(`${baseUrl}/api/nostr/last-active/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({ pubkeys }),
      })
      if (!retryResponse.ok) {
        debug('fetchActiveStatus failed after token refresh:', retryResponse.status)
        return
      }
      const data = await retryResponse.json()
      return processActiveStatusResponse(data, pubkeys, commit)
    }
    if (!response.ok) {
      debug('fetchActiveStatus failed:', response.status)
      return
    }
    const data = await response.json()
    return processActiveStatusResponse(data, pubkeys, commit)
  } catch (err) {
    debug('fetchActiveStatus error:', err)
  }
}

function processActiveStatusResponse (data, pubkeys, commit) {
  const statusMap = {}
  for (const pubkey of pubkeys) {
    if (data[pubkey]) {
      statusMap[pubkey] = {
        lastActiveAt: data[pubkey],
        fetchedAt: Date.now(),
      }
      scheduleActiveExpiry(pubkey, commit)
    }
  }
  commit('SET_ACTIVE_STATUS', statusMap)
}

export async function touchActive ({ rootGetters }, { pubkey, recipients }) {
  if (!pubkey || !recipients?.length) return
  const isChipnet = rootGetters['global/isChipnet']
  const baseUrl = isChipnet ? 'https://chipnet.watchtower.cash' : 'https://watchtower.cash'

  async function doTouch () {
    const headers = await getAuthHeaders()
    return fetch(`${baseUrl}/api/nostr/touch/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(headers?.Authorization ? { Authorization: headers.Authorization } : {}),
      },
      body: JSON.stringify({ pubkey, recipients }),
    })
  }

  try {
    const response = await doTouch()
    if (response.status === 401) {
      await clearToken()
      const retryResponse = await doTouch()
      if (!retryResponse.ok) {
        debug('touchActive retry failed:', retryResponse.status)
      }
    } else if (!response.ok) {
      debug('touchActive failed:', response.status)
    }
  } catch (err) {
    debug('touchActive error:', err)
  }
}

// ── Typing signal ──────────────────────────────────────────────────
// Sends a { type: 'typing', room_id, recipients } message over the open
// Nostr status WebSocket. Client-side throttled to 3s per room (the server
// throttles at 3s and silently drops faster bursts). Respects the
// show_active_status privacy toggle — if the sender has it off, no
// typing signal is sent (the server also filters on the recipient side).
const TYPING_SEND_THROTTLE_MS = 3000
const _lastTypingSent = {}

export function sendTyping ({ state, getters }, { roomId, recipients }) {
  if (!roomId || !recipients?.length) return
  const ws = getWalletState(state)
  if (!ws.keys?.pubKeyHex) return
  if (!_activeWs || _activeWs.readyState !== WebSocket.OPEN) return

  // Privacy: don't send typing if the sender has active status off
  if (!getters.getShowActiveStatus) return

  const now = Date.now()
  const lastSent = _lastTypingSent[roomId] || 0
  if (now - lastSent < TYPING_SEND_THROTTLE_MS) return
  _lastTypingSent[roomId] = now

  try {
    _activeWs.send(JSON.stringify({
      type: 'typing',
      room_id: roomId,
      recipients,
    }))
  } catch (err) {
    debug('Failed to send typing signal:', err)
  }
}

export function sendStopTyping ({ state, getters }, { roomId, recipients }) {
  if (!roomId || !recipients?.length) return
  const ws = getWalletState(state)
  if (!ws.keys?.pubKeyHex) return
  if (!_activeWs || _activeWs.readyState !== WebSocket.OPEN) return

  if (!getters.getShowActiveStatus) return

  try {
    _activeWs.send(JSON.stringify({
      type: 'stop_typing',
      room_id: roomId,
      recipients,
    }))
  } catch (err) {
    debug('Failed to send stop_typing signal:', err)
  }
}

function startPubkeyRegistrationHeartbeat (dispatch) {
  if (_heartbeatInterval) clearInterval(_heartbeatInterval)
  dispatch('registerNostrPubkey')
  _heartbeatInterval = setInterval(() => {
    dispatch('registerNostrPubkey')
  }, 120000)
}

function getWsWatchtowerUrl (rootGetters) {
  const walletHash = rootGetters['global/getWallet']('bch')?.walletHash
  if (!walletHash) return null
  const isChipnet = rootGetters['global/isChipnet']
  const baseUrl = isChipnet ? 'https://chipnet.watchtower.cash' : 'https://watchtower.cash'
  return { walletHash, baseUrl }
}

async function getWsWatchtowerUrlWithToken (rootGetters) {
  const info = getWsWatchtowerUrl(rootGetters)
  if (!info) return null
  let url = `${info.baseUrl.replace('https:', 'wss:')}/ws/nostr/updates/${info.walletHash}/`
  try {
    const headers = await getAuthHeaders()
    const token = headers?.Authorization?.replace('Bearer ', '')
    if (token) url += `?token=${encodeURIComponent(token)}`
    const safeUrl = url.replace(/\?.*$/, '')
    debug('WS path:', safeUrl.slice(0, 80))
  } catch (err) {
    debug('Failed to get auth token for WS:', err)
  }
  return url
}

export async function startActiveWs ({ state, commit, rootGetters }) {
  stopActiveWs()
  const wsUrl = await getWsWatchtowerUrlWithToken(rootGetters)
  if (!wsUrl) return

  try {
    const ws = new WebSocket(wsUrl)
    const handlers = {
      open: () => {
        debug('Active status WS connected')
        _activeWsAuthRetries = 0
        clearInterval(_activeWsHeartbeatTimer)
        _activeWsHeartbeatTimer = setInterval(() => {
          _activeWs?.send(JSON.stringify({ type: 'heartbeat' }))
        }, 30000)
      },
      message: (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'last_active' && msg.pubkey_hex && msg.timestamp) {
            commit('SET_ACTIVE_STATUS', {
              [msg.pubkey_hex]: {
                lastActiveAt: msg.timestamp,
                fetchedAt: Date.now(),
              },
            })
            scheduleActiveExpiry(msg.pubkey_hex, commit)
          } else if (msg.type === 'typing' && msg.pubkey_hex && msg.room_id) {
            commit('SET_TYPING', { roomId: msg.room_id, pubKeyHex: msg.pubkey_hex })
            scheduleTypingHide(commit, msg.pubkey_hex, msg.room_id)
          } else if (msg.type === 'stop_typing' && msg.pubkey_hex && msg.room_id) {
            commit('CLEAR_TYPING', { roomId: msg.room_id, pubKeyHex: msg.pubkey_hex })
            clearTypingTimer(msg.pubkey_hex, msg.room_id)
          }
        } catch (e) {
          debug('Failed to parse WS message:', e)
        }
      },
      close: (event) => {
        clearInterval(_activeWsHeartbeatTimer)
        _activeWsHeartbeatTimer = null
        _activeWs = null
        _activeWsHandlers = null
        if (_activeServicesRunning) {
          if (event.code === 4001 || event.code === 1006) {
            _activeWsAuthRetries++
            clearToken().catch(() => {})
            if (_activeWsAuthRetries >= MAX_WS_AUTH_RETRIES) {
              debug('WS auth retries exhausted, giving up')
              _activeServicesRunning = false
              return
            }
            debug(`WS disconnected (code ${event.code}), retry ${_activeWsAuthRetries}/${MAX_WS_AUTH_RETRIES}`)
          }
          _activeWsReconnectTimer = setTimeout(() => {
            startActiveWs({ state, commit, rootGetters })
          }, 5000)
        }
      },
      error: () => {
        // HTTP upgrade failure (e.g. 403) fires error before close.
        // Clear the stale token so the reconnect picks up a fresh one.
        clearToken().catch(() => {})
      },
    }
    ws.addEventListener('open', handlers.open)
    ws.addEventListener('message', handlers.message)
    ws.addEventListener('close', handlers.close)
    ws.addEventListener('error', handlers.error)
    _activeWs = ws
    _activeWsHandlers = handlers
  } catch (err) {
    debug('Failed to create active status WS:', err)
  }
}

export function stopActiveWs () {
  clearInterval(_activeWsHeartbeatTimer)
  _activeWsHeartbeatTimer = null
  if (_activeWsReconnectTimer) {
    clearTimeout(_activeWsReconnectTimer)
    _activeWsReconnectTimer = null
  }
  if (_activeWs) {
    if (_activeWsHandlers) {
      _activeWs.removeEventListener('open', _activeWsHandlers.open)
      _activeWs.removeEventListener('message', _activeWsHandlers.message)
      _activeWs.removeEventListener('close', _activeWsHandlers.close)
      _activeWs.removeEventListener('error', _activeWsHandlers.error)
    }
    _activeWs.close()
  }
  _activeWs = null
  _activeWsHandlers = null
}

export function startActiveServices ({ dispatch, getters, state, commit, rootGetters }) {
  if (_activeServicesRunning) return
  _activeServicesRunning = true

  dispatch('fetchActiveStatus')
  dispatch('startActiveWs')

  if (getters.getShowActiveStatus) {
    startPubkeyRegistrationHeartbeat(dispatch)
  }
}

export function stopActiveServices () {
  _activeServicesRunning = false
  clearAllActiveExpiries()
  clearAllTypingTimers()
  if (_heartbeatInterval) {
    clearInterval(_heartbeatInterval)
    _heartbeatInterval = null
  }
  stopActiveWs()
  clearDebouncedTimers()
}

export async function setShowActiveStatus ({ commit, dispatch, getters, rootGetters }, value) {
  commit('SET_SHOW_ACTIVE_STATUS', value)
  if (value && _activeServicesRunning) {
    startPubkeyRegistrationHeartbeat(dispatch)
  } else if (!value) {
    if (_heartbeatInterval) {
      clearInterval(_heartbeatInterval)
      _heartbeatInterval = null
    }
  }

  try {
    const walletHash = getCurrentWalletHash()
    if (!walletHash) return

    const isChipnet = rootGetters['global/isChipnet']
    const baseUrl = isChipnet ? 'https://chipnet.watchtower.cash' : 'https://watchtower.cash'
    const authHeaders = await getAuthHeaders()

    async function doPost () {
      const headers = await getAuthHeaders()
      return fetch(`${baseUrl}/api/nostr/active-status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          wallet_hash: walletHash,
          show_active_status: value,
        }),
      })
    }

    const response = await doPost()
    if (response.status === 401) {
      await clearToken()
      const retryResponse = await doPost()
      if (!retryResponse.ok) {
        debug('setShowActiveStatus failed after token refresh:', retryResponse.status)
        return
      }
      const data = await retryResponse.json()
      if (data.show_active_status !== undefined) {
        commit('SET_SHOW_ACTIVE_STATUS', data.show_active_status)
      }
      return
    }

    if (!response.ok) {
      debug('setShowActiveStatus failed:', response.status)
      return
    }

    const data = await response.json()
    if (data.show_active_status !== undefined) {
      commit('SET_SHOW_ACTIVE_STATUS', data.show_active_status)
    }
  } catch (err) {
    debug('setShowActiveStatus error:', err)
  }
}

// ── Server API helpers ──────────────────────────────────────────────

function getWatchtowerBaseUrl () {
  try {
    const isChipnet = Store.getters['global/isChipnet']
    return isChipnet ? 'https://chipnet.watchtower.cash' : 'https://watchtower.cash'
  } catch {
    return 'https://watchtower.cash'
  }
}

async function apiPost (baseUrl, path, body) {
  const authHeaders = await getAuthHeaders()
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
  })
  if (response.status === 401) {
    await clearToken()
    const retryHeaders = await getAuthHeaders()
    return fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...retryHeaders },
      body: JSON.stringify(body),
    })
  }
  return response
}

async function apiPatch (baseUrl, path, body) {
  const authHeaders = await getAuthHeaders()
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
  })
  if (response.status === 401) {
    await clearToken()
    const retryHeaders = await getAuthHeaders()
    return fetch(`${baseUrl}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...retryHeaders },
      body: JSON.stringify(body),
    })
  }
  return response
}

async function apiGet (baseUrl, path) {
  const authHeaders = await getAuthHeaders()
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
  })
  if (response.status === 401) {
    await clearToken()
    const retryHeaders = await getAuthHeaders()
    return fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...retryHeaders },
    })
  }
  return response
}

async function apiDelete (baseUrl, path, body) {
  const authHeaders = await getAuthHeaders()
  const fetchOpts = {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
  }
  if (body) fetchOpts.body = JSON.stringify(body)
  const response = await fetch(`${baseUrl}${path}`, fetchOpts)
  if (response.status === 401) {
    await clearToken()
    const retryHeaders = await getAuthHeaders()
    const retryOpts = {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...retryHeaders },
    }
    if (body) retryOpts.body = JSON.stringify(body)
    return fetch(`${baseUrl}${path}`, retryOpts)
  }
  return response
}

// ── Room name encryption helpers ────────────────────────────────────
// Group names are encrypted client-side before storing on the server
// so that room metadata remains private. The encryption key is derived
// fresh from the mnemonic seed phrase (never read from persisted state).

let _roomNameEncryptionKey = null
let _roomNameEncryptionKeyPromise = null

async function getRoomNameEncryptionKey () {
  if (_roomNameEncryptionKey) return _roomNameEncryptionKey
  if (_roomNameEncryptionKeyPromise) return _roomNameEncryptionKeyPromise
  _roomNameEncryptionKeyPromise = (async () => {
    try {
      const walletHash = getCurrentWalletHash()
      if (!walletHash) return null
      const mnemonic = await getMnemonicByHash(walletHash)
      if (!mnemonic) return null
      const keys = deriveNostrKeys(mnemonic)
      const key = nip44.getConversationKey(hexToBytes(keys.privKeyHex), keys.pubKeyHex)
      _roomNameEncryptionKey = key
      return key
    } catch {
      return null
    } finally {
      _roomNameEncryptionKeyPromise = null
    }
  })()
  return _roomNameEncryptionKeyPromise
}

const MAX_ROOM_NAME_LENGTH = 100

async function encryptRoomName (name) {
  if (!name) return name
  try {
    const key = await getRoomNameEncryptionKey()
    if (!key) { console.warn('[Nostr] encryptRoomName: no encryption key — storing name in plaintext'); return name }
    const truncated = name.length > MAX_ROOM_NAME_LENGTH
      ? name.slice(0, MAX_ROOM_NAME_LENGTH)
      : name
    return nip44.encrypt(truncated, key)
  } catch (err) {
    console.warn('[Nostr] encryptRoomName: encryption failed — storing name in plaintext:', err?.message)
    return name
  }
}

async function decryptRoomName (encrypted) {
  if (!encrypted) return encrypted
  try {
    const key = await getRoomNameEncryptionKey()
    if (!key) return encrypted
    return nip44.decrypt(encrypted, key)
  } catch {
    return encrypted
  }
}

async function decryptRoomsList (rooms) {
  if (!rooms) return rooms
  const decrypted = []
  for (const r of rooms) {
    const createdAt = r.created_at || r.createdAt
    const updatedAt = r.updated_at || r.updatedAt
    const lastMsgTs = r.last_message_timestamp
    decrypted.push({
      id: r.room_id || r.id,
      type: r.type,
      name: await decryptRoomName(r.name),
      members: r.members || [],
      subject: await decryptRoomName(r.subject),
      archived: !!r.archived,
      createdAt: typeof createdAt === 'string' ? Math.floor(new Date(createdAt).getTime() / 1000) : createdAt,
      updatedAt: typeof updatedAt === 'string' ? Math.floor(new Date(updatedAt).getTime() / 1000) : updatedAt,
      lastMessageAt: typeof lastMsgTs === 'string' ? Math.floor(new Date(lastMsgTs).getTime() / 1000) : lastMsgTs,
    })
  }
  return decrypted
}

// ── Server-backed room actions ──────────────────────────────────────

export async function fetchRooms ({ commit, dispatch, state }) {
  try {
    const walletHash = getCurrentWalletHash()
    if (!walletHash) return
    const baseUrl = getWatchtowerBaseUrl()
    const response = await apiGet(baseUrl, `/api/nostr/rooms/?wallet_hash=${walletHash}`)
    if (!response.ok) {
      debug('fetchRooms failed:', response.status)
      return
    }
    const data = await response.json()
    if (Array.isArray(data.rooms)) {
      const decrypted = await decryptRoomsList(data.rooms)
      commit('SET_ROOMS', decrypted)

      const ws = getWalletState(state)

      // For groups with placeholder names, try to find the real name from
      // message subject tags, message content, or relay metadata, then
      // update the server.
      for (const room of decrypted) {
        if (room.type === 'group' && (!room.name || room.name === 'Group')) {
          const msgs = ws.messages[room.id] || []
          let foundName = null

          // Check for subject field in stored messages (newer messages first)
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].subject) { foundName = msgs[i].subject; break }
          }

          if (foundName) {
            await updateRoomOnServer(room.id, { name: foundName })
            debouncedRefetchRooms(dispatch)
          } else {
            fetchAndSyncGroupMetadata(dispatch, room.id)
          }
        }
      }
    }
  } catch (err) {
    debug('fetchRooms error:', err)
  }
}

async function syncRoomToServer (room) {
  try {
    const walletHash = getCurrentWalletHash()
    if (!walletHash) { debug('syncRoomToServer: no wallet hash'); return }
    const baseUrl = getWatchtowerBaseUrl()
    const response = await apiPost(baseUrl, '/api/nostr/rooms/', {
      wallet_hash: walletHash,
      room: {
        room_id: room.id,
        type: room.type,
        name: await encryptRoomName(room.name || 'Group'),
        members: room.members,
        subject: room.subject ? await encryptRoomName(room.subject) : room.subject,
        created_at: new Date(room.createdAt * 1000).toISOString(),
        updated_at: new Date(room.updatedAt * 1000).toISOString(),
      },
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      debug('syncRoomToServer failed:', response.status, body)
    }
  } catch (err) {
    debug('syncRoomToServer error:', err)
  }
}

async function updateRoomOnServer (roomId, fields) {
  try {
    const walletHash = getCurrentWalletHash()
    if (!walletHash) { debug('updateRoomOnServer: no wallet hash'); return }
    const baseUrl = getWatchtowerBaseUrl()
    const patched = { ...fields }
    if (patched.name) patched.name = await encryptRoomName(patched.name)
    if (patched.subject) patched.subject = await encryptRoomName(patched.subject)
    const response = await apiPatch(baseUrl, `/api/nostr/rooms/${roomId}/`, {
      wallet_hash: walletHash,
      ...patched,
    })
    if (!response.ok) debug('updateRoomOnServer failed:', response.status)
  } catch (err) {
    debug('updateRoomOnServer error:', err)
  }
}

async function touchRoomOnServer (roomId, timestamp) {
  try {
    const walletHash = getCurrentWalletHash()
    if (!walletHash) { debug('touchRoomOnServer: no wallet hash'); return }
    const baseUrl = getWatchtowerBaseUrl()
    const body = { wallet_hash: walletHash }
    if (timestamp) body.timestamp = timestamp
    const response = await apiPost(baseUrl, `/api/nostr/rooms/${roomId}/touch/`, body)
    if (!response.ok) debug('touchRoomOnServer failed:', response.status)
  } catch (err) {
    debug('touchRoomOnServer error:', err)
  }
}

async function deleteRoomOnServer (roomId) {
  try {
    const walletHash = getCurrentWalletHash()
    if (!walletHash) { debug('deleteRoomOnServer: no wallet hash'); return }
    const baseUrl = getWatchtowerBaseUrl()
    const response = await apiDelete(baseUrl, `/api/nostr/rooms/${roomId}/`, { wallet_hash: walletHash })
    if (!response.ok) debug('deleteRoomOnServer failed:', response.status)
  } catch (err) {
    debug('deleteRoomOnServer error:', err)
  }
}

export async function fetchBlocks ({ commit }) {
  try {
    const walletHash = getCurrentWalletHash()
    if (!walletHash) return { blockedContacts: [], blockedGroups: [] }
    const baseUrl = getWatchtowerBaseUrl()
    const response = await apiGet(baseUrl, `/api/nostr/blocks/?wallet_hash=${walletHash}`)
    if (!response.ok) {
      debug('fetchBlocks failed:', response.status)
      return { blockedContacts: [], blockedGroups: [] }
    }
    const data = await response.json()
    commit('SET_BLOCKED_CONTACTS', data.blocked_contacts || [])
    commit('SET_BLOCKED_GROUPS', data.blocked_groups || [])
    return data
  } catch (err) {
    debug('fetchBlocks error:', err)
    return { blockedContacts: [], blockedGroups: [] }
  }
}

export async function blockContact ({ commit }, pubKeyHex) {
  commit('BLOCK_CONTACT', pubKeyHex)
  try {
    const walletHash = getCurrentWalletHash()
    if (!walletHash) return
    const baseUrl = getWatchtowerBaseUrl()
    const response = await apiPost(baseUrl, '/api/nostr/blocks/contacts/', {
      wallet_hash: walletHash,
      pub_key_hex: pubKeyHex,
    })
    if (!response.ok) debug('blockContact failed:', response.status)
  } catch (err) {
    debug('blockContact error:', err)
  }
}

export async function unblockContact ({ commit }, pubKeyHex) {
  commit('UNBLOCK_CONTACT', pubKeyHex)
  try {
    const walletHash = getCurrentWalletHash()
    if (!walletHash) return
    const baseUrl = getWatchtowerBaseUrl()
    const response = await apiDelete(baseUrl, `/api/nostr/blocks/contacts/${pubKeyHex}/`, { wallet_hash: walletHash })
    if (!response.ok) debug('unblockContact failed:', response.status)
  } catch (err) {
    debug('unblockContact error:', err)
  }
}

export async function blockGroup ({ commit }, roomId) {
  commit('BLOCK_GROUP', roomId)
  try {
    const walletHash = getCurrentWalletHash()
    if (!walletHash) return
    const baseUrl = getWatchtowerBaseUrl()
    const response = await apiPost(baseUrl, '/api/nostr/blocks/groups/', {
      wallet_hash: walletHash,
      room_id: roomId,
    })
    if (!response.ok) debug('blockGroup failed:', response.status)
  } catch (err) {
    debug('blockGroup error:', err)
  }
}

export async function unblockGroup ({ commit }, roomId) {
  commit('UNBLOCK_GROUP', roomId)
  try {
    const walletHash = getCurrentWalletHash()
    if (!walletHash) return
    const baseUrl = getWatchtowerBaseUrl()
    const response = await apiDelete(baseUrl, `/api/nostr/blocks/groups/${roomId}/`, { wallet_hash: walletHash })
    if (!response.ok) debug('unblockGroup failed:', response.status)
  } catch (err) {
    debug('unblockGroup error:', err)
  }
}

export async function createPrivateRoom ({ commit, getters, state }, contactNpub) {
  const ws = getWalletState(state)
  const contact = getters.getContactByNpub(contactNpub)
  if (!contact) throw new Error('Contact not found')

  const myPubKey = ws.keys.pubKeyHex
  const roomId = computeRoomId([myPubKey, contact.pubKeyHex])

  const room = {
    id: roomId,
    type: 'private',
    name: contact.name || contact.npub.slice(0, 12) + '...',
    members: [myPubKey, contact.pubKeyHex],
    subject: null,
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
  }

  commit('ADD_ROOM', room)
  await syncRoomToServer(room)
  return room
}

const MAX_GROUP_MEMBERS = 10

export async function createGroupRoom ({ commit, state }, { name, members, subject }) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys.pubKeyHex
  // Convert any npubs to hex pubkeys
  const memberHexes = members.map(m => {
    if (m.startsWith('npub1')) {
      const decoded = nip19Decode(m)
      return decoded.data
    }
    return m
  })
  const allMembers = [...new Set([myPubKey, ...memberHexes])]
  if (allMembers.length > MAX_GROUP_MEMBERS) {
    throw new Error(`Group limited to ${MAX_GROUP_MEMBERS} members total`)
  }
  const roomId = computeRoomId(allMembers)

  const room = {
    id: roomId,
    type: 'group',
    name: (name || subject || 'Group').slice(0, MAX_ROOM_NAME_LENGTH),
    members: allMembers,
    subject: subject || null,
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
  }

  commit('ADD_ROOM', room)
  await syncRoomToServer(room)
  return room
}

export async function publishGroupMetadata ({ state }, { roomId, memberPubKeys, name }) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys.pubKeyHex
  const myPrivKey = ws.keys.privKeyHex
  if (!myPubKey || !myPrivKey) throw new Error('Not authenticated')

  const privKeyBytes = hexToBytes(myPrivKey)
  const event = finalizeEvent({
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', `paytaca:group:${roomId}`],
    ],
    content: JSON.stringify({
      name: name || null,
      data: {
        roomId,
        members: memberPubKeys,
        name: name || null,
      },
    }),
  }, privKeyBytes)

  const { accepted } = await relayService.publishEvent(state.relays, event)
  if (accepted.length === 0) {
    console.warn('[Nostr] Group metadata was not accepted by any relay')
  }
}

export async function fetchGroupMetadata ({ state }, { roomId }) {
  const event = await relayService.fetchGroupMetadata(state.relays, roomId)
  if (!event) return null
  try {
    const parsed = JSON.parse(event.content || '{}')
    return parsed?.data || null
  } catch {
    return null
  }
}

export async function requestToJoinGroup ({ state }, { roomId, memberPubKeys, name }) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys.pubKeyHex
  const myPrivKey = ws.keys.privKeyHex
  if (!myPubKey || !myPrivKey) throw new Error('Not authenticated')

  const existingMembers = memberPubKeys.filter(pk => pk !== myPubKey)
  if (!existingMembers.length) throw new Error('No members to send request to')

  const text = `${myPubKey.slice(0, 12)}... wants to join the group`
  const unsignedKind14 = createUnsignedKind14({
    content: text,
    senderPubKey: myPubKey,
    members: existingMembers,
    subject: name,
  })

  const giftWraps = await createNip17GiftWraps(unsignedKind14, myPrivKey, existingMembers)

  await Promise.allSettled(
    giftWraps.map(gw => relayService.publishEvent(state.relays, gw))
  )
}

export async function sendMessage ({ state }, { roomId, text, replyTo, subject }) {
  const ws = getWalletState(state)
  const room = ws.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')

  const senderPrivKey = ws.keys.privKeyHex
  const senderPubKey = ws.keys.pubKeyHex

  // Ensure members are hex pubkeys (convert any npubs)
  const memberHexes = room.members.map(m => {
    if (m.startsWith('npub1')) {
      const decoded = nip19Decode(m)
      return decoded.data
    }
    return m
  })

  const unsignedKind14 = createUnsignedKind14({
    content: text,
    senderPubKey,
    members: memberHexes,
    replyTo,
    subject,
  })

  const giftWraps = await createNip17GiftWraps(unsignedKind14, senderPrivKey, memberHexes, senderPubKey)
  console.log('[sendMessage] created', giftWraps.length, 'gift-wraps for room', roomId, 'members:', memberHexes)

  const message = {
    id: unsignedKind14.id,
    content: text,
    sender: senderPubKey,
    created_at: unsignedKind14.created_at,
    kind14Id: unsignedKind14.id,
    replyTo,
    localSentAt: Date.now(),
  }

  return { giftWraps, message, roomId }
}

export async function sendEditMessage ({ state }, { roomId, text, editOf }) {
  const ws = getWalletState(state)
  const room = ws.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')

  const senderPrivKey = ws.keys.privKeyHex
  const senderPubKey = ws.keys.pubKeyHex

  const memberHexes = room.members.map(m => {
    if (m.startsWith('npub1')) {
      const decoded = nip19Decode(m)
      return decoded.data
    }
    return m
  })

  const unsignedKind14 = createUnsignedKind14({
    content: text,
    senderPubKey,
    members: memberHexes,
    editOf,
  })

  const giftWraps = await createNip17GiftWraps(unsignedKind14, senderPrivKey, memberHexes, senderPubKey)

  const message = {
    id: unsignedKind14.id,
    content: text,
    sender: senderPubKey,
    created_at: unsignedKind14.created_at,
    kind14Id: unsignedKind14.id,
    editOf,
    localSentAt: Date.now(),
  }

  return { giftWraps, message, roomId }
}

// Leaving a group sends a "left the group" notification to the other members,
// then marks the group blocked + archived. While blocked, incoming messages
// targeting the group are dropped in receiveMessage. Rejoining (unblocking)
// reverses both flags — see components for the unblock flow.
export async function leaveGroup ({ commit, dispatch, state }, { roomId }) {
  const ws = getWalletState(state)
  const room = ws.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')

  const myPub = ws.keys?.pubKeyHex
  const contact = state.contacts.find(c => c.pubKeyHex === myPub)
  const myDisplayName = contact?.name || ws.profile?.displayName || 'You'

  const text = `${myDisplayName} left the group`
  const { giftWraps, message, roomId: msgRoomId } = await dispatch('sendMessage', { roomId, text })
  commit('ADD_MESSAGE', { roomId: msgRoomId, message })
  commit('TOUCH_ROOM_LAST_MESSAGE_AT', msgRoomId)
  await dispatch('publishGiftWraps', { giftWraps })

  await dispatch('blockGroup', roomId)
  await updateRoomOnServer( roomId, { archived: true })
  commit('ARCHIVE_ROOM', roomId)
}

export async function rejoinGroup ({ commit, dispatch, state }, { roomId }) {
  const ws = getWalletState(state)
  const room = ws.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')

  await dispatch('unblockGroup', roomId)
  await updateRoomOnServer( roomId, { archived: false })
  commit('UNARCHIVE_ROOM', roomId)

  try {
    const meta = await dispatch('fetchGroupMetadata', { roomId })
    if (meta?.name) {
      commit('UPDATE_ROOM_NAME', { roomId, name: meta.name })
    }
  } catch {
    // Non-critical — name stays as-is if fetch fails
  }

  // Re-fetch messages that arrived while the group was blocked.
  // The subscription's _seenEventIds already recorded these events
  // (before receiveMessage dropped them), so clear the cache and
  // re-subscribe without `since` to re-fetch everything.
  // ADD_MESSAGE's id-based dedup prevents duplicates.
  relayService.clearSeenEventIds()
  relayService.subscribeGiftWraps(state.relays, ws.keys.pubKeyHex, {
    async onEvent(event) {
      try {
        const { unwrapGiftWrap } = await import('src/wallet/nostr')
        const { rumor, sealPubkey } = unwrapGiftWrap(event, ws.keys.privKeyHex)
        dispatch('receiveMessage', { rumor, sealPubkey })
      } catch (err) {
        console.warn('[Nostr] Failed to unwrap gift-wrap:', err)
      }
    },
  }, { force: true })

  try {
    const myPub = ws.keys?.pubKeyHex
    const contact = state.contacts.find(c => c.pubKeyHex === myPub)
    const myDisplayName = contact?.name || ws.profile?.displayName || 'You'

    const text = `${myDisplayName} rejoined the group`
    const { giftWraps, message, roomId: msgRoomId } = await dispatch('sendMessage', { roomId, text })
    commit('ADD_MESSAGE', { roomId: msgRoomId, message })
    commit('TOUCH_ROOM_LAST_MESSAGE_AT', msgRoomId)
    await dispatch('publishGiftWraps', { giftWraps })
  } catch (err) {
    console.warn('[Nostr] Failed to send rejoin notification:', err)
  }
}

// ── Room lifecycle actions (sync to server) ──────────────────────────

export async function archiveRoom ({ commit }, roomId) {
  commit('ARCHIVE_ROOM', roomId)
  await updateRoomOnServer( roomId, { archived: true })
}

export async function unarchiveRoom ({ commit }, roomId) {
  commit('UNARCHIVE_ROOM', roomId)
  await updateRoomOnServer( roomId, { archived: false })
}

export async function updateRoomName ({ commit }, { roomId, name }) {
  const truncated = name && name.length > MAX_ROOM_NAME_LENGTH ? name.slice(0, MAX_ROOM_NAME_LENGTH) : name
  commit('UPDATE_ROOM_NAME', { roomId, name: truncated })
  await updateRoomOnServer(roomId, { name: truncated })
}

export async function updateRoomSubject ({ commit }, { roomId, subject }) {
  commit('UPDATE_ROOM_SUBJECT', { roomId, subject })
  await updateRoomOnServer( roomId, { subject })
}

export async function touchRoom ({ dispatch }, { roomId, timestamp } = {}) {
  await touchRoomOnServer(roomId, timestamp)
}

export async function deleteRoom ({ commit }, roomId) {
  commit('REMOVE_ROOM', roomId)
  await deleteRoomOnServer(roomId)
}

// Seed room objects from persisted messages when server returns no rooms.
// This handles the migration for existing users whose room lists were in local
// storage but are now managed server-side. Reconstructs minimal room objects
// from message sender data and syncs them to the server.
export async function seedRoomsFromMessages ({ commit, dispatch, state }) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys?.pubKeyHex
  if (!myPubKey) return
  if (!ws.messages || typeof ws.messages !== 'object') return

  const existingRoomIds = new Set(ws.rooms.map(r => r.id))
  const now = Math.floor(Date.now() / 1000)
  const syncPromises = []

  for (const roomId of Object.keys(ws.messages)) {
    if (existingRoomIds.has(roomId)) continue
    const msgs = ws.messages[roomId]
    if (!msgs || !msgs.length) continue

    // Collect unique message senders (excluding self)
    const senders = [...new Set(msgs.map(m => m.sender).filter(s => s && s !== myPubKey))]

    // Only seed DM rooms (2-person). Skip one-sided DMs (senders.length === 0,
    // meaning only self messages) — the other party's pubkey can't be determined
    // from message data alone, so the room would be malformed. These rooms will
    // be created normally when the user next opens the conversation.
    // Also skip groups (senders.length > 1) — see comment above.
    if (senders.length !== 1) continue

    const members = [myPubKey, senders[0]]

    const contact = state.contacts.find(c => c.pubKeyHex === senders[0])
    const name = contact?.name || senders[0].slice(0, 12) + '...'

    const firstMsg = msgs[0]
    const lastMsg = msgs[msgs.length - 1]

    const room = {
      id: roomId,
      type: 'private',
      name,
      members,
      subject: null,
      createdAt: firstMsg.created_at || now,
      updatedAt: lastMsg.created_at || now,
    }

    syncPromises.push(syncRoomToServer(room))
  }

  await Promise.allSettled(syncPromises)

  // Re-fetch the room list from the server after seeding
  dispatch('fetchRooms').catch(() => {})
}

export async function sendDeleteMessage ({ state }, { roomId, messageId }) {
  const ws = getWalletState(state)
  const room = ws.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')

  const senderPrivKey = ws.keys.privKeyHex
  const senderPubKey = ws.keys.pubKeyHex

  const memberHexes = room.members.map(m => {
    if (m.startsWith('npub1')) {
      const decoded = nip19Decode(m)
      return decoded.data
    }
    return m
  })

  const giftWraps = await createKind5DeletionGiftWraps({
    messageId,
    senderPubKey,
    members: memberHexes,
    senderPrivKey,
  })

  return { giftWraps, messageId, roomId }
}

/**
 * Send an encrypted file (image, video, document) to a chat room.
 * Implements NIP-17 kind:15 file message with Blossom upload.
 * @param {Object} context
 * @param {Object} payload
 * @param {string} payload.roomId - Room ID
 * @param {File} payload.file - File to upload
 * @param {string} [payload.replyTo] - Optional message ID being replied to
 * @returns {Promise<{ giftWraps: any[], message: any, roomId: string }>}
 */
export async function sendFileMessage ({ state }, { roomId, file, replyTo, onProgress, signal }) {
  const ws = getWalletState(state)
  const room = ws.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')

  const senderPrivKey = ws.keys.privKeyHex
  const senderPubKey = ws.keys.pubKeyHex

  const memberHexes = room.members.map(m => {
    if (m.startsWith('npub1')) {
      const decoded = nip19Decode(m)
      return decoded.data
    }
    return m
  })

  if (signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError')

  const blossomServer = 'https://blossom.paytaca.com'

  if (onProgress) onProgress(0.05)
  const { encrypted, aesKeyHex, nonceHex, hash, mimeType, size: encryptedSize, imageWidth, imageHeight } = await encryptFile(file)

  if (signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError')

  let thumbEncrypted = null
  let thumbAesKeyHex = null
  let thumbNonceHex = null
  let thumbHash = null
  let thumbUrl = null

  if (mimeType?.startsWith('video/')) {
    try {
      const thumb = await captureAndEncryptVideoThumbnail(file)
      if (thumb) {
        thumbEncrypted = thumb.encrypted
        thumbAesKeyHex = thumb.aesKeyHex
        thumbNonceHex = thumb.nonceHex
        thumbHash = thumb.hash
      }
    } catch (e) {
      console.warn('[sendFileMessage] Thumbnail capture failed, continuing without:', e.message)
    }

    if (signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError')

    if (thumbEncrypted) {
      try {
        const { url: tUrl } = await uploadToBlossom(thumbEncrypted, blossomServer, senderPrivKey, senderPubKey, { signal })
        thumbUrl = tUrl
      } catch (e) {
        console.warn('[sendFileMessage] Thumbnail upload failed, continuing without:', e.message)
        thumbEncrypted = null
        thumbAesKeyHex = null
        thumbNonceHex = null
        thumbHash = null
      }
    }
  }

  if (onProgress) onProgress(0.1)
  const { url: fileUrl } = await uploadToBlossom(encrypted, blossomServer, senderPrivKey, senderPubKey, {
    onProgress: (p) => {
      if (onProgress) onProgress(0.1 + p * 0.8)
    },
    signal,
  })

  if (onProgress) onProgress(0.9)
  const kind15Event = createKind15FileMessage({
    senderPubKey,
    members: memberHexes,
    hash,
    aesKeyHex,
    nonceHex,
    mimeType,
    imageWidth,
    imageHeight,
    replyTo,
    thumbHash,
    thumbAesKeyHex,
    thumbNonceHex,
  })

  const giftWraps = await wrapKind15FileMessage(kind15Event, senderPrivKey, memberHexes, senderPubKey)
  console.log('[sendFileMessage] created', giftWraps.length, 'gift-wraps for room', roomId, 'members:', memberHexes)

  if (onProgress) onProgress(0.95)
  const message = {
    id: kind15Event.id,
    content: fileUrl,
    sender: senderPubKey,
    created_at: kind15Event.created_at,
    kind15Id: kind15Event.id,
    fileType: mimeType,
    fileName: file.name,
    fileSize: file.size,
    encryptedSize,
    hash,
    aesKeyHex,
    nonceHex,
    imageWidth,
    imageHeight,
    thumbUrl,
    thumbAesKeyHex,
    thumbNonceHex,
    replyTo,
    localSentAt: Date.now(),
    isFile: true,
  }

  if (onProgress) onProgress(1)
  return { giftWraps, message, roomId }
}

export async function sendReaction ({ state, commit }, { roomId, messageId, emoji }) {
  const ws = getWalletState(state)
  const room = ws.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')

  const reactorPrivKey = ws.keys.privKeyHex
  const reactorPubKey = ws.keys.pubKeyHex

  // Convert npubs to hex and find other members (for group chats)
  const memberHexes = room.members.map(m => {
    if (m.startsWith('npub1')) {
      const decoded = nip19Decode(m)
      return decoded.data
    }
    return m
  })
  // Look up the actual message sender from the message being reacted to
  const messages = ws.messages[roomId] || []
  const originalMessage = messages.find(m => m.id === messageId)
  const senderPubKey = originalMessage?.sender || memberHexes.find(m => m !== reactorPubKey) || reactorPubKey

  const giftWraps = await createReactionGiftWraps({
    messageId,
    senderPubKey,
    recipientPubKeys: memberHexes,
    emoji,
    reactorPubKey,
    reactorPrivKey,
  })

  commit('ADD_MESSAGE_REACTION', {
    roomId,
    messageId,
    reactorPubKey,
    emoji,
    createdAt: Date.now(),
  })

  await Promise.allSettled(
    giftWraps.map(gw => relayService.publishEvent(state.relays, gw))
  )
}

export async function removeReaction ({ state, commit }, { roomId, messageId, emoji }) {
  const ws = getWalletState(state)
  const room = ws.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')

  const reactorPrivKey = ws.keys.privKeyHex
  const reactorPubKey = ws.keys.pubKeyHex

  const memberHexes = room.members.map(m => {
    if (m.startsWith('npub1')) {
      const decoded = nip19Decode(m)
      return decoded.data
    }
    return m
  })
  // Look up the actual message sender from the message being un-reacted to
  const messages = ws.messages[roomId] || []
  const originalMessage = messages.find(m => m.id === messageId)
  const senderPubKey = originalMessage?.sender || memberHexes.find(m => m !== reactorPubKey) || reactorPubKey

  commit('REMOVE_MESSAGE_REACTION', {
    roomId,
    messageId,
    reactorPubKey,
    emoji,
  })

  const giftWraps = await createReactionGiftWraps({
    messageId,
    senderPubKey,
    recipientPubKeys: memberHexes,
    emoji: `-${emoji}`,
    reactorPubKey,
    reactorPrivKey,
  })

  await Promise.allSettled(
    giftWraps.map(gw => relayService.publishEvent(state.relays, gw))
  )
}

export async function publishGiftWraps ({ state }, { giftWraps }) {
  const ws = getWalletState(state)
  // Start with our own relays as fallback
  let targetRelays = new Set(state.relays)

  // Fetch each recipient's kind:10050 in parallel and add their preferred relays.
  // Cached per-recipient to avoid re-querying relays on every message send to
  // the same contact (a `querySync` round-trip per recipient was blocking sends).
  const recipients = giftWraps
    .map(gw => gw.tags.find(t => t[0] === 'p')?.[1])
    .filter(r => r && r !== ws.keys.pubKeyHex)
  const uniqueRecipients = [...new Set(recipients)]
  const results = await Promise.allSettled(
    uniqueRecipients.map(recipient => fetchKind10050Cached(state.relays, recipient))
  )
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value?.tags) {
      for (const tag of result.value.tags) {
        if (tag[0] === 'relay' && tag[1]) targetRelays.add(tag[1])
      }
    }
  }

  console.log('[publishGiftWraps] publishing', giftWraps.length, 'gift-wraps to relays:', Array.from(targetRelays))
  giftWraps.forEach((gw, i) => {
    const pTag = gw.tags.find(t => t[0] === 'p')
    const jsonSize = JSON.stringify(gw).length
    console.log(`  wrap[${i}]: kind=${gw.kind}, id=${gw.id.slice(0,16)}..., p=${pTag?.[1]?.slice(0, 16) || 'none'}..., content_len=${gw.content.length}, total_json=${jsonSize} bytes`)
  })
  await relayService.publish(Array.from(targetRelays), giftWraps)
}

export function receiveMessage ({ commit, dispatch, state }, { rumor, sealPubkey, isHistorical = false }) {
  const ws = getWalletState(state)
  if (!ws.keys?.pubKeyHex) return

  // NIP-17 seal pubkey verification is performed inside unwrapGiftWrap().
  // If we reach here, the rumor has already been verified.

  // nip59.unwrapEvent returns unsigned rumors without an `id` field.
  // Compute it so message-based dedup works.
  if (!rumor.id) {
    rumor.id = getEventHash(rumor)
  }

  const myPubKey = ws.keys.pubKeyHex

  // Handle Kind 7 read receipts (👀 reactions)
  if (rumor.kind === 7 && rumor.content === '👀') {
    const eTag = rumor.tags.find(t => t[0] === 'e')
    if (!eTag) return

    const messageId = eTag[1]
    const readerPubKey = rumor.pubkey

    if (messageId && readerPubKey) {
      // Fast lookup via messageId → roomId map; fallback to scan.
      const roomId = _messageRoomMap.get(messageId)
        || Object.keys(ws.messages).find(
          rid => ws.messages[rid]?.some(m => m.id === messageId)
        )
      if (roomId) {
        commit('SET_MESSAGE_READ_BY', {
          roomId,
          messageId,
          readerPubKey,
        })
      } else {
        // Message hasn't arrived yet — cache the receipt so it can be
        // processed once the message is added to a room. Without this, a race
        // condition (receipt arrives before the original message) silently
        // drops the receipt forever.
        const existing = _pendingReadReceipts.get(messageId) || []
        existing.push({ readerPubKey })
        _pendingReadReceipts.set(messageId, existing)
      }
    }
    return
  }

  // Handle Kind 7 emoji reactions (NIP-25)
  if (rumor.kind === 7 && rumor.content !== '👀') {
    const eTag = rumor.tags.find(t => t[0] === 'e')
    if (!eTag) return

    const messageId = eTag[1]
    const reactorPubKey = rumor.pubkey
    const content = rumor.content
    const isDeletion = content.startsWith('-')

    if (messageId && reactorPubKey && content) {
      // Find the room that contains this message — avoids assuming a 2-person room,
      // which breaks for group chats where computeRoomId needs all member pubkeys.
      // Fast lookup via messageId → roomId map; fallback to scan.
      const roomId = _messageRoomMap.get(messageId)
        || Object.keys(ws.messages).find(
        rid => ws.messages[rid]?.some(m => m.id === messageId)
      )
      if (!roomId) return

      if (isDeletion) {
        const emoji = content.slice(1)
        commit('REMOVE_MESSAGE_REACTION', {
          roomId,
          messageId,
          reactorPubKey,
          emoji,
        })
      } else {
        commit('ADD_MESSAGE_REACTION', {
          roomId,
          messageId,
          reactorPubKey,
          emoji: content,
          createdAt: rumor.created_at * 1000,
        })
      }
    }
    return
  }

  // Handle Kind 5 deletion events
  if (rumor.kind === 5) {
    const eTag = rumor.tags.find(t => t[0] === 'e')
    if (!eTag) return
    const messageId = eTag[1]
    const pTags = rumor.tags.filter(t => t[0] === 'p').map(t => t[1])
    const roomMembers = [...new Set([myPubKey, rumor.pubkey, ...pTags])]
    const roomId = computeRoomId(roomMembers)

    commit('DELETE_MESSAGE', { roomId, messageId })
    return
  }

  // Handle Kind 15 file messages
  if (rumor.kind === 15) {
    const parsed = parseKind15FileMessage(rumor)
    if (!parsed) return

    const pTags = rumor.tags.filter(t => t[0] === 'p').map(t => {
      const val = t[1]
      if (val.length === 64 && /^[a-f0-9]+$/.test(val)) return val
      try { return base64ToHex(val) } catch (_) { return null }
    }).filter(Boolean)
    const roomMembers = [...new Set([myPubKey, rumor.pubkey, ...pTags])]
    const roomId = computeRoomId(roomMembers)

    // Drop messages for a group we've left (blocked)
    if (ws.blockedGroups?.includes(roomId)) return

    let room = ws.rooms.find(r => r.id === roomId)
    if (!room) {
      if (ws.blockedContacts?.includes(rumor.pubkey)) return
      if (ws.deletedRooms?.includes(roomId)) return
      const isGroup = roomMembers.length > 2
      const contact = state.contacts.find(c => c.pubKeyHex === rumor.pubkey)
      room = {
        id: roomId,
        type: isGroup ? 'group' : 'private',
        name: isGroup ? '' : (contact?.name || rumor.pubkey.slice(0, 12) + '...'),
        members: roomMembers,
        subject: null,
        createdAt: rumor.created_at,
        updatedAt: rumor.created_at,
      }
      // The room is unknown locally — sync it to the server and re-fetch
      // the room list rather than creating it here. Messages for unknown
      // rooms are stored so they appear once the room list is refreshed.
      syncRoomToServer(room)
      debouncedRefetchRooms(dispatch)

      // For groups, fetch metadata from relay and update the server with
      // the real name (without mutating local room state).
      if (isGroup) {
        fetchAndSyncGroupMetadata(dispatch, roomId)
      }
    }

    const replyTo = rumor.tags.find(t => t[0] === 'e')?.[1] || null

    const ext = parsed.mimeType ? parsed.mimeType.split('/')[1] || '' : ''
    const fallbackFileName = parsed.hash
      ? `file_${parsed.hash.slice(0, 8)}.${ext || 'bin'}`
      : 'file'

    const message = {
      id: rumor.id,
      content: parsed.fileUrl,
      sender: rumor.pubkey,
      created_at: rumor.created_at,
      kind15Id: rumor.id,
      fileType: parsed.mimeType,
      fileName: parsed.fileName || fallbackFileName,
      fileSize: parsed.size || 0,
      encryptedSize: parsed.size || 0,
      hash: parsed.hash,
      aesKeyHex: parsed.aesKeyHex,
      nonceHex: parsed.nonceHex,
      imageWidth: parsed.imageWidth,
      imageHeight: parsed.imageHeight,
      thumbUrl: parsed.thumbUrl || null,
      thumbAesKeyHex: parsed.thumbAesKeyHex || null,
      thumbNonceHex: parsed.thumbNonceHex || null,
      replyTo,
      localReceivedAt: Date.now(),
      isFile: true,
    }

    const isNew = commitAddMessage(commit, state, roomId, message, { bumpIfNew: !isHistorical })
    if (!isHistorical && isNew) queueRoomTouch(dispatch, roomId, new Date().toISOString())
    return
  }

  // Only process Kind 14 chat messages
  if (rumor.kind !== 14) return

  const pTags = rumor.tags.filter(t => t[0] === 'p').map(t => t[1])
  const roomMembers = [...new Set([myPubKey, rumor.pubkey, ...pTags])]
  const roomId = computeRoomId(roomMembers)
  const replyTo = rumor.tags.find(t => t[0] === 'e')?.[1] || null
  const editOf = rumor.tags.find(t => t[0] === 'edit')?.[1] || null

  // Drop messages for a group we've left (blocked)
  if (ws.blockedGroups?.includes(roomId)) return

  let room = ws.rooms.find(r => r.id === roomId)
  if (!room) {
    // Before creating a new room, check if an existing room has the same member set
    // (handles the case where a room was previously stored under a different ID)
    const memberKey = roomMembers.slice().sort().join(',')
    const existingByMembers = ws.rooms.find(r =>
      (r.members || []).slice().sort().join(',') === memberKey
    )
    if (existingByMembers) {
      if (ws.deletedRooms?.includes(existingByMembers.id)) return
      // Drop messages for a blocked sender
      if (ws.blockedContacts?.includes(rumor.pubkey)) return
      // Reuse the existing room — store the message under its ID
      room = existingByMembers
      // Drop messages for a group we've left (blocked) — the stored room id
      // may differ from the computed roomId when legacy rooms exist.
      if (ws.blockedGroups?.includes(room.id)) return
      const hasSubjectTag = rumor.tags.some(t => t[0] === 'subject')
      const subjectRaw = rumor.tags.find(t => t[0] === 'subject')?.[1]
      const subject = hasSubjectTag ? (subjectRaw ?? '') : null
      if (editOf) {
        // Edit targeting an existing message — update in place, or skip if
        // the target is unknown to avoid creating a phantom new message.
        const target = (ws.messages[room.id] || []).find(m => m.id === editOf)
        if (target) {
          commit('UPDATE_MESSAGE', { roomId: room.id, messageId: editOf, newContent: rumor.content })
        } else {
          console.warn('[Nostr] Edit targets unknown message', editOf, 'in legacy room — skipping')
          return
        }
      } else {
        const msg = {
          id: rumor.id,
          content: rumor.content,
          sender: rumor.pubkey,
          created_at: rumor.created_at,
          roomId: room.id,
          replyTo,
          subject,
        }
        const isNew = commitAddMessage(commit, state, room.id, msg, { bumpIfNew: !isHistorical })
        if (!isHistorical && isNew) queueRoomTouch(dispatch, room.id, new Date().toISOString())
      }
      return
    }

    // Skip auto-creation if the sender is blocked
    if (ws.blockedContacts?.includes(rumor.pubkey)) return

    if (ws.deletedRooms?.includes(roomId)) return

    // The room is unknown locally — sync it to the server and re-fetch
    // the room list rather than creating it here. Store the message so
    // it appears once the room list is refreshed, then return early
    // (skip subject/edit processing that depends on a local room).
    const isGroupRoom = roomMembers.length > 2
    const roomForSync = {
      id: roomId,
      type: isGroupRoom ? 'group' : 'private',
      name: '',
      members: roomMembers,
      subject: null,
      createdAt: rumor.created_at,
      updatedAt: rumor.created_at,
    }
    syncRoomToServer(roomForSync)
    debouncedRefetchRooms(dispatch)

    // For groups, fetch metadata from relay and update the server with
    // the real name (without mutating local room state).
    if (isGroupRoom) {
      fetchAndSyncGroupMetadata(dispatch, roomId)
    }

    const earlyMsg = {
      id: rumor.id,
      content: rumor.content,
      sender: rumor.pubkey,
      created_at: rumor.created_at,
      kind14Id: rumor.id,
      replyTo,
      editOf,
      localReceivedAt: Date.now(),
    }
    const subjectRaw = rumor.tags.find(t => t[0] === 'subject')?.[1]
    if (subjectRaw !== undefined) earlyMsg.subject = subjectRaw
    const isNew = commitAddMessage(commit, state, roomId, earlyMsg, { bumpIfNew: !isHistorical })
    if (!isHistorical && isNew) queueRoomTouch(dispatch, roomId, new Date().toISOString())
    return
  }

  if (editOf) {
    const originalMsg = (ws.messages[roomId] || []).find(m => m.id === editOf)
    if (originalMsg) {
      commit('UPDATE_MESSAGE', { roomId, messageId: editOf, newContent: rumor.content })
      return
    }
    // Original message not found in this room (e.g., deep pagination).
    // Search across all rooms before falling through to insert as new.
    for (const otherRoomId of Object.keys(ws.messages)) {
      if (otherRoomId === roomId) continue
      const otherMsg = ws.messages[otherRoomId]?.find(m => m.id === editOf)
      if (otherMsg) {
        commit('UPDATE_MESSAGE', { roomId: otherRoomId, messageId: editOf, newContent: rumor.content })
        return
      }
    }
    // Target still not found — skip insertion to avoid creating a phantom message
    console.warn('[Nostr] Edit targets unknown message', editOf, '— skipping')
    return
  }

  const message = {
    id: rumor.id,
    content: rumor.content,
    sender: rumor.pubkey,
    created_at: rumor.created_at,
    kind14Id: rumor.id,
    replyTo,
    editOf,
    localReceivedAt: Date.now(),
  }

  // Store subject tag if present — used for group name recovery
  const subjectRaw = rumor.tags.find(t => t[0] === 'subject')?.[1]
  if (subjectRaw !== undefined) message.subject = subjectRaw

  const isNew = commitAddMessage(commit, state, roomId, message, { bumpIfNew: !isHistorical })

  if (!isHistorical && isNew) queueRoomTouch(dispatch, roomId, new Date().toISOString())
  // Flush any pending read receipts whose message has now arrived
  flushPendingReadReceipts(state, commit)
}

export async function markRoomAsRead ({ commit, state, dispatch }, { roomId, messageIds, force, localOnly } = {}) {
  if (localOnly) {
    const ws = getWalletState(state)
    const myPubKey = ws.keys.pubKeyHex
    if (!myPubKey) return
    const messages = ws.messages[roomId] || []
    const readIds = ws.readMessageIds?.[roomId] || {}
    const ids = messages
      .filter(m => m.sender !== myPubKey && !readIds[m.id] && (!messageIds || messageIds.includes(m.id)))
      .map(m => m.id)
    if (ids.length) commit('MARK_MESSAGES_AS_READ', { roomId, messageIds: ids })
    return
  }
  if (_markRoomLocks.has(roomId)) return
  _markRoomLocks.add(roomId)
  try {
  const ws = getWalletState(state)
  const myPubKey = ws.keys.pubKeyHex
  const myPrivKey = ws.keys.privKeyHex
  if (!myPubKey || !myPrivKey) return

  const messages = ws.messages[roomId] || []
  const room = ws.rooms.find(r => r.id === roomId)
  if (!room) return

  // When force=true (retry path), skip the readIds check so we can retry
  // messages whose receipt send failed on a previous attempt. The readIds
  // check prevents retries once a message is committed locally.
  const readIds = ws.readMessageIds?.[roomId] || {}
  const candidateIds = messageIds ? new Set(messageIds) : null
  const unreadMessages = force
    ? messages.filter(m => m.sender !== myPubKey && (!candidateIds || candidateIds.has(m.id)))
    : messages.filter(
        m => m.sender !== myPubKey && !readIds[m.id] && (!candidateIds || candidateIds.has(m.id))
      )

  if (!unreadMessages.length) return

  // Send Kind 7 "👀" read receipt gift-wraps back to each sender.
  // Group messages by sender so each sender gets a single gift-wrap.
  const senderMap = new Map()
  for (const msg of unreadMessages) {
    if (!senderMap.has(msg.sender)) {
      senderMap.set(msg.sender, [msg.id])
    } else {
      senderMap.get(msg.sender).push(msg.id)
    }
  }

  // Only mark messages as read locally AFTER the 👝 reaction is successfully
  // published. If we mark them first and the publish fails (or the app is
  // killed before the retry fires), the messages are permanently marked as
  // read locally but the sender never receives the 👝 — creating a permanent
  // "never seen" gap on their side.
  //
  // Chunk messageIds per sender: relays reject gift-wraps whose content
  // exceeds 8192 bytes. Each `e` tag (~140 bytes pre-encryption, ~250 bytes
  // after double NIP-44 encryption + base64) means we can safely fit ~20
  // messageIds per gift-wrap.
  const MAX_IDS_PER_GIFT_WRAP = 20
  const successfullyReadIds = []
  const failedSenders = []
  let chunkIndex = 0
  for (const [senderPubKey, ids] of senderMap) {
    for (let i = 0; i < ids.length; i += MAX_IDS_PER_GIFT_WRAP) {
      const chunk = ids.slice(i, i + MAX_IDS_PER_GIFT_WRAP)
      if (chunkIndex > 0) await new Promise(r => setTimeout(r, 500))
      chunkIndex++
      try {
        const giftWrap = await createReadReceiptGiftWrap({
          messageIds: chunk,
          senderPubKey,
          receiverPubKey: myPubKey,
          receiverPrivKey: myPrivKey,
        })
        await relayService.publishEvent(state.relays, giftWrap)
        successfullyReadIds.push(...chunk)
        for (const id of chunk) _readReceiptRetries.delete(`${roomId}:${id}`)
      } catch (err) {
        console.warn('[Nostr] Failed to send read receipts for sender:', err)
        failedSenders.push(chunk)
      }
    }
  }

  // Mark as read locally only the messages whose 👝 reaction was sent.
  // Failed messages stay "unread" so the next markRoomAsRead call re-attempts.
  if (successfullyReadIds.length) {
    commit('MARK_MESSAGES_AS_READ', {
      roomId,
      messageIds: successfullyReadIds,
    })
  }

  // Retry failed sends after a delay so transient errors (network blip, relay
  // timeout) don't create permanent gaps on the sender's side. Uses force=true
  // to bypass the readIds check (in case some messages were marked by a prior
  // partial success).
  if (failedSenders.length) {
    const exhaustedIds = []
    const retryIds = failedSenders.flat().filter(id => {
      const key = `${roomId}:${id}`
      const count = (_readReceiptRetries.get(key) || 0) + 1
      if (count > MAX_READ_RECEIPT_RETRIES) {
        console.warn('[Nostr] Giving up on read receipt for', key, 'after', MAX_READ_RECEIPT_RETRIES, 'retries')
        _readReceiptRetries.delete(key)
        exhaustedIds.push(id)
        return false
      }
      _readReceiptRetries.set(key, count)
      return true
    })
    // Mark exhausted messages as read locally so the debounced markAsRead()
    // stops picking them up and creating an infinite retry loop.
    if (exhaustedIds.length) {
      commit('MARK_MESSAGES_AS_READ', { roomId, messageIds: exhaustedIds })
    }
    if (retryIds.length) {
      setTimeout(() => dispatch('markRoomAsRead', { roomId, messageIds: retryIds, force: true }), 5000)
    }
  }
  } finally {
    _markRoomLocks.delete(roomId)
  }
}

export function subscribeToRelays ({ state, dispatch, commit }) {
  const ws = getWalletState(state)
  const myPubKey = ws.keys.pubKeyHex
  if (!myPubKey) return

  // Compute `since` from existing messages so the relay doesn't re-send
  // the entire history on every app start. NIP-17 randomizes created_at
  // by ±2 days, so we subtract a 3-day buffer from the newest known message.
  // If there are no existing messages (first ever subscription), `since` is
  // undefined and the relay sends all history (needed to populate the chat).
  let since
  let maxCreatedAt = 0
  for (const roomId in ws.messages) {
    const msgs = ws.messages[roomId]
    if (msgs && msgs.length) {
      const last = msgs[msgs.length - 1]
      if (last && last.created_at > maxCreatedAt) maxCreatedAt = last.created_at
    }
  }
  if (maxCreatedAt > 0) {
    since = maxCreatedAt - 259200 // 3-day buffer for NIP-17 ±2 day randomization
  }

  const wasSubscribed = relayService.isSubscribed()
  const sub = relayService.subscribeGiftWraps(state.relays, myPubKey, {
    async onEvent(event) {
      try {
        const { unwrapGiftWrap } = await import('src/wallet/nostr')
        const { rumor, sealPubkey } = unwrapGiftWrap(event, ws.keys.privKeyHex)
        dispatch('receiveMessage', { rumor, sealPubkey })
      } catch (err) {
        console.warn('[Nostr] Failed to unwrap gift-wrap:', err)
      }
    },
  }, { since })

  commit('SET_SUBSCRIBED', relayService.isSubscribed())

  // Start status polling if this is the first subscription
  if (!wasSubscribed) {
    relayService.startStatusPolling(state.relays, (status) => {
      for (const url of state.relays) {
        const s = status[url] || 'disconnected'
        commit('SET_RELAY_STATUS', { url, status: s })
      }
    }, 15000)
  }

  // Fetch room list and blocks from server (authoritative source for room list)
  // If the server has no rooms yet (migration), seed from local messages.
  dispatch('fetchRooms').catch(() => {}).then(() => {
    dispatch('seedRoomsFromMessages').catch(() => {})
  })
  dispatch('fetchBlocks').catch(() => {})

  dispatch('startActiveServices')

  return sub
}

let _lastEnsureTime = 0
const ENSURE_COOLDOWN_MS = 2000

export function ensureSubscribed ({ dispatch, getters }) {
  const now = Date.now()

  // Debounce: skip if we ensured recently
  if ((now - _lastEnsureTime) < ENSURE_COOLDOWN_MS) return Promise.resolve()
  _lastEnsureTime = now

  // Always re-register pubkey-to-wallet mapping when chat opens.
  // This ensures the pubkey stays registered in Watchtower. Chained into
  // the returned promise so callers can rely on full setup completion.
  return dispatch('registerNostrPubkey').then(() => {

  // Skip if already subscribed and not stale
  if (relayService.isSubscribed() && getters['isInitialized'] && getters['myPrivKey']) return

  // Ensure we have keys (including privKeyHex which is stripped from persisted state)
  // and an active relay subscription, especially after app backgrounding or push
  if (!getters['isInitialized'] || !getters['myPrivKey']) {
    return dispatch('initialize').then(() => {
      return dispatch('subscribeToRelays')
    })
  } else {
    return dispatch('subscribeToRelays')
  }
  }).catch(err => {
    console.warn('[Nostr] Failed to initialize, clearing cooldown for retry:', err)
    _lastEnsureTime = 0
    throw err
  })
}

// NOTE: A `disconnectRelays` action previously lived here but had no callers
// and was removed. Relay teardown is handled by `reinitialize` (wallet switch)
// and `resetAndRefetch` via `relayService.disconnect()`. If a page-scoped
// teardown is needed later, re-add it and dispatch it from the chat pages.

export async function resetAndRefetch ({ commit, dispatch, state }) {
  const walletHash = getCurrentWalletHash()
  if (!walletHash) {
    console.warn('[Nostr] Cannot reset: no wallet hash')
    return
  }
  const mnemonic = await getMnemonicByHash(walletHash)
  if (!mnemonic) {
    console.warn('[Nostr] Cannot reset: no mnemonic available')
    return
  }

  // Disconnect existing relay subscriptions
  stopActiveServices()
  relayService.stopStatusPolling()
  relayService.disconnect()
  commit('SET_SUBSCRIBED', false)

  // Clear IndexedDB image cache
  await clearChatCache().catch(err => console.warn('Failed to clear chat cache during reset:', err))

  // Clear module-level ephemeral caches
  _messageRoomMap.clear()
  _readReceiptRetries.clear()
  _pendingReadReceipts.clear()
  clearAllTypingTimers()
  for (const key of Object.keys(_lastTypingSent)) {
    delete _lastTypingSent[key]
  }

  // Reset all per-wallet chat data (keys, rooms, messages, caches, profile)
  commit('RESET_WALLET_CHAT_DATA')

  // Clear global contacts list
  commit('RESET_CONTACTS')

  // Re-derive Nostr keys from the wallet seed phrase
  const keys = deriveNostrKeys(mnemonic)
  commit('SET_KEYS', keys)
  commit('SET_READY', true)
  commit('SET_INITIALIZED', true)
  relayService.setAuthKey(keys.privKeyHex)

  // Re-fetch historical messages from relays
  await dispatch('fetchHistoricalMessages')

  // Re-subscribe to relays for live messages
  dispatch('subscribeToRelays')
}
