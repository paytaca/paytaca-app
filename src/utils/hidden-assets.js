const CACHE_KEY = 'hiddenAssetIds'

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
  } catch { /* ignore */ }
}

export function getHiddenAssetIds (walletHash) {
  if (!walletHash) return []
  const cache = readCache()
  return cache[walletHash] || []
}

export function hideAsset (walletHash, assetId) {
  if (!walletHash || !assetId) return
  const cache = readCache()
  if (!cache[walletHash]) cache[walletHash] = []
  if (!cache[walletHash].includes(assetId)) {
    cache[walletHash].push(assetId)
    writeCache(cache)
  }
}

export function unhideAsset (walletHash, assetId) {
  if (!walletHash || !assetId) return
  const cache = readCache()
  if (!cache[walletHash]) return
  cache[walletHash] = cache[walletHash].filter(id => id !== assetId)
  writeCache(cache)
}

export function isAssetHidden (walletHash, assetId) {
  if (!walletHash || !assetId) return false
  return getHiddenAssetIds(walletHash).includes(assetId)
}
