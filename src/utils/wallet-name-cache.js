/**
 * Utility functions for caching decrypted wallet names in localStorage
 * This ensures wallet names persist when offline, preventing fallback to generic names
 */

const CACHE_KEY = 'walletNamesCache'

/**
 * Get the wallet names cache from localStorage
 * @returns {Object} Object mapping walletHash to walletName
 */
function getCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    return cached ? JSON.parse(cached) : {}
  } catch (error) {
    console.error('Error reading wallet names cache:', error)
    return {}
  }
}

/**
 * Save the wallet names cache to localStorage
 * @param {Object} cache - Object mapping walletHash to walletName
 */
function saveCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('Error saving wallet names cache:', error)
  }
}

/**
 * Save a decrypted wallet name to the cache
 * @param {String} walletHash - The wallet hash (unique identifier)
 * @param {String} walletName - The decrypted wallet name
 */
export function saveWalletName(walletHash, walletName) {
  if (!walletHash || !walletName) {
    console.warn('saveWalletName: Invalid parameters', { walletHash, walletName })
    return
  }
  
  const cache = getCache()
  cache[walletHash] = walletName
  saveCache(cache)
}

/**
 * Retrieve a cached wallet name by wallet hash
 * @param {String} walletHash - The wallet hash
 * @returns {String|null} The cached wallet name, or null if not found
 */
export function getWalletName(walletHash) {
  if (!walletHash) return null
  
  const cache = getCache()
  return cache[walletHash] || null
}

/**
 * Get all cached wallet names
 * @returns {Object} Object mapping walletHash to walletName
 */
export function getAllWalletNames() {
  return getCache()
}

/**
 * Remove a wallet name from the cache
 * @param {String} walletHash - The wallet hash to remove
 */
export function removeWalletName(walletHash) {
  if (!walletHash) return
  
  const cache = getCache()
  delete cache[walletHash]
  saveCache(cache)
}

/**
 * Clear all cached wallet names
 */
export function clearWalletNames() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch (error) {
    console.error('Error clearing wallet names cache:', error)
  }
}

