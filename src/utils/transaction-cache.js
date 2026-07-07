const CACHE_KEY_PREFIX = 'txCache_'
const MAX_CACHE_AGE_MS = 30 * 60 * 1000

function getCacheKey (walletHash, filter) {
  return `${CACHE_KEY_PREFIX}${walletHash}_${filter || 'all'}`
}

export function getCachedTransactions (walletHash, filter) {
  try {
    const key = getCacheKey(walletHash, filter)
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (!cached || !Array.isArray(cached.transactions)) return null
    if (Date.now() - cached.timestamp > MAX_CACHE_AGE_MS) {
      localStorage.removeItem(key)
      return null
    }
    cached.fromCache = true
    return cached
  } catch {
    return null
  }
}

export function setCachedTransactions (walletHash, filter, transactions, hasMore) {
  try {
    const key = getCacheKey(walletHash, filter)
    const payload = {
      transactions,
      hasMore: !!hasMore,
      timestamp: Date.now()
    }
    localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    // storage full or unavailable — skip
  }
}

export function clearTransactionCache (walletHash) {
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(CACHE_KEY_PREFIX)) {
        if (!walletHash || k.startsWith(`${CACHE_KEY_PREFIX}${walletHash}_`)) {
          keys.push(k)
        }
      }
    }
    keys.forEach(k => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}

export function mergeTransactions (cached, fresh) {
  if (!cached || !cached.length) return fresh
  if (!fresh || !fresh.length) return cached

  const cachedIds = new Set(cached.map(tx => tx.txid || tx.tx_hash || tx.hash))
  const newItems = fresh.filter(tx => {
    const id = tx.txid || tx.tx_hash || tx.hash
    return id && !cachedIds.has(id)
  })

  if (!newItems.length) return cached

  return [...newItems, ...cached]
}