const CACHE_KEY = 'chatAvatarCache'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

function readCache () {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeCache (cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // storage full — prune oldest entries
    try {
      const pruned = {}
      const entries = Object.entries(cache).sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0))
      for (const [k, v] of entries.slice(0, 50)) pruned[k] = v
      localStorage.setItem(CACHE_KEY, JSON.stringify(pruned))
    } catch { /* ignore */ }
  }
}

export function getCachedAvatar (pubKeyHex) {
  if (!pubKeyHex) return null
  const cache = readCache()
  const entry = cache[pubKeyHex]
  if (!entry || !entry.url) return null
  if (Date.now() - (entry.ts || 0) > MAX_AGE_MS) return null
  return entry.url
}

export function setCachedAvatar (pubKeyHex, url) {
  if (!pubKeyHex || !url) return
  const cache = readCache()
  cache[pubKeyHex] = { url, ts: Date.now() }
  writeCache(cache)
}

export function clearAvatarCache () {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch { /* ignore */ }
}
