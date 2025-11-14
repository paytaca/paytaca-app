import { Store } from 'src/store'

/**
 * Get the current wallet hash from the store
 * @returns {string|null} The wallet hash or null if not available
 */
export function getWalletHash() {
  try {
    const wallet = Store.getters['global/getWallet']('bch')
    return wallet?.walletHash || null
  } catch (error) {
    console.error('Error getting wallet hash:', error)
    return null
  }
}

/**
 * Generate a wallet-specific storage key
 * @param {string} prefix - The storage key prefix
 * @param {string} walletHash - The wallet hash
 * @returns {string} The wallet-specific storage key
 */
export function getWalletStorageKey(prefix, walletHash) {
  if (!walletHash) {
    // If no wallet hash provided, return a temporary key
    // This should only happen during initial load before wallet is set
    return `${prefix}-temp`
  }
  return `${prefix}-${walletHash}`
}

/**
 * Get storage key for the current wallet
 * @param {string} prefix - The storage key prefix
 * @returns {string} The wallet-specific storage key for current wallet
 */
export function getCurrentWalletStorageKey(prefix) {
  const walletHash = getWalletHash()
  return getWalletStorageKey(prefix, walletHash)
}

