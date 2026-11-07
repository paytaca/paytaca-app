// Avatar cache: keeps the avatar image bytes (as a data URL) for every contact
// so the chat list can paint avatars synchronously on first render instead of
// waiting for a network image load.
//
// Storage is localStorage (not IndexedDB) because the chat list needs to read
// entries synchronously during `created()`; an async read always produces at
// least one frame without the avatar. Avatars are small (256x256 JPEG,
// ~2-6KB), so localStorage's ~5MB budget is plenty for hundreds of contacts.

const STORAGE_KEY = 'paytaca:avatar-cache'
const MAX_ENTRIES = 200
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const AVATAR_SIZE = 256
const AVATAR_QUALITY = 0.85

let _cache = null

function loadCache () {
  if (_cache) return _cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    _cache = parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    _cache = {}
  }
  return _cache
}

function saveCache () {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache))
  } catch (err) {
    console.warn('[AvatarCache] Failed to persist cache:', err)
  }
}

function entryTimestamp (entry) {
  return entry?.checkedAt || entry?.ts || 0
}

function isFresh (entry) {
  if (!entry) return false
  return Date.now() - entryTimestamp(entry) <= MAX_AGE_MS
}

function prune (cache) {
  const keys = Object.keys(cache)
  if (keys.length <= MAX_ENTRIES) return
  // Sort by when the image was actually stored (`ts`), not when it was last
  // checked, so "checked but no avatar" entries (ts = 0) are evicted first.
  keys.sort((a, b) => (cache[a]?.ts || 0) - (cache[b]?.ts || 0))
  const removeCount = keys.length - MAX_ENTRIES
  for (let i = 0; i < removeCount; i++) delete cache[keys[i]]
}

/**
 * Synchronous cache read. Returns the full entry, or null when missing/expired.
 * @param {string} pubKeyHex
 * @returns {{ url: string|null, dataUrl: string|null, ts: number, checkedAt: number }|null}
 */
export function getCachedAvatarEntrySync (pubKeyHex) {
  if (!pubKeyHex) return null
  const entry = loadCache()[pubKeyHex]
  return isFresh(entry) ? entry : null
}

/**
 * Synchronous display source: the locally cached image bytes (data URL) when
 * available, otherwise the remote URL.
 * @param {string} pubKeyHex
 * @returns {string|null}
 */
export function getCachedAvatarSync (pubKeyHex) {
  const entry = getCachedAvatarEntrySync(pubKeyHex)
  if (!entry) return null
  return entry.dataUrl || entry.url || null
}

export async function getCachedAvatarEntry (pubKeyHex) {
  return getCachedAvatarEntrySync(pubKeyHex)
}

export async function getCachedAvatar (pubKeyHex) {
  return getCachedAvatarSync(pubKeyHex)
}

/**
 * Cache a contact's avatar. When `url` differs from the cached one (or no
 * image bytes are cached yet) the image is downloaded and resized to
 * 256x256 so later renders can use it synchronously.
 * @param {string} pubKeyHex
 * @param {string} url - Published avatar URL
 * @returns {Promise<string|null>} Display source (data URL preferred)
 */
export async function setCachedAvatar (pubKeyHex, url) {
  if (!pubKeyHex || !url) return null
  const cache = loadCache()
  const prev = cache[pubKeyHex]

  if (prev && prev.url === url && prev.dataUrl) {
    // Same avatar: just record that we checked it, no download needed.
    prev.checkedAt = Date.now()
    saveCache()
    return prev.dataUrl
  }

  const dataUrl = await downloadAvatarDataUrl(url)
  const entry = {
    url,
    dataUrl: dataUrl || prev?.dataUrl || null,
    ts: Date.now(),
    checkedAt: Date.now(),
  }
  cache[pubKeyHex] = entry
  prune(cache)
  saveCache()
  return entry.dataUrl || entry.url
}

/**
 * Record that the given contacts' avatars were checked, even when they have not
 * published one. Batched so a cold chat list only serializes the cache once.
 * @param {string[]} pubKeyHexes
 */
export function markAvatarsChecked (pubKeyHexes) {
  const keys = [...new Set((pubKeyHexes || []).filter(Boolean))]
  if (!keys.length) return
  const cache = loadCache()
  const now = Date.now()
  for (const pubKeyHex of keys) {
    const entry = cache[pubKeyHex] || { url: null, dataUrl: null, ts: 0 }
    entry.checkedAt = now
    cache[pubKeyHex] = entry
  }
  prune(cache)
  saveCache()
}

export async function clearAvatarCache () {
  _cache = {}
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function downloadAvatarDataUrl (url) {
  return new Promise((resolve) => {
    let objectUrl = null
    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        objectUrl = null
      }
    }

    fetch(url, { mode: 'cors' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.blob()
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
          try {
            const size = Math.min(img.width, img.height)
            const canvas = document.createElement('canvas')
            canvas.width = AVATAR_SIZE
            canvas.height = AVATAR_SIZE
            const ctx = canvas.getContext('2d')
            ctx.drawImage(
              img,
              (img.width - size) / 2,
              (img.height - size) / 2,
              size,
              size,
              0,
              0,
              AVATAR_SIZE,
              AVATAR_SIZE
            )
            resolve(canvas.toDataURL('image/jpeg', AVATAR_QUALITY))
          } catch {
            resolve(null)
          } finally {
            cleanup()
          }
        }
        img.onerror = () => {
          cleanup()
          resolve(null)
        }
        img.src = objectUrl
      })
      .catch(() => {
        cleanup()
        resolve(null)
      })
  })
}
