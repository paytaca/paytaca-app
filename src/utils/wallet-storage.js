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

/**
 * Get wallet hash from vault index
 * @param {number} index - The vault index
 * @returns {string|null} The wallet hash or null if not found
 */
export function getWalletHashFromIndex(index) {
  try {
    const vault = Store.getters['global/getVault']
    const wallet = vault?.[index]
    return wallet?.wallet?.bch?.walletHash || 
           wallet?.wallet?.BCH?.walletHash ||
           wallet?.BCH?.walletHash || 
           wallet?.bch?.walletHash ||
           wallet?.walletHash ||
           null
  } catch (error) {
    console.error('Error getting wallet hash from index:', error)
    return null
  }
}

/**
 * Get wallet hash for a specific wallet index (async, for use in actions)
 * @param {number} index - The vault index
 * @returns {Promise<string|null>} The wallet hash or null if not found
 */
export async function getWalletHashFromIndexAsync(index) {
  try {
    const useStore = (await import('src/store')).default
    const store = useStore()
    const vault = store.getters['global/getVault']
    const wallet = vault?.[index]
    return wallet?.wallet?.bch?.walletHash || 
           wallet?.wallet?.BCH?.walletHash ||
           wallet?.BCH?.walletHash || 
           wallet?.bch?.walletHash ||
           wallet?.walletHash ||
           null
  } catch (error) {
    console.error('Error getting wallet hash from index:', error)
    return null
  }
}

/**
 * Get current wallet hash from store
 * Uses current wallet index to look up wallet hash
 * @returns {string|null} The wallet hash or null if not available
 */
export function getCurrentWalletHash() {
  try {
    const walletIndex = Store.getters['global/getWalletIndex']
    return getWalletHashFromIndex(walletIndex)
  } catch (error) {
    console.error('Error getting current wallet hash:', error)
    return null
  }
}

/**
 * Get vault index by wallet hash
 * @param {string} walletHash - The wallet hash
 * @returns {number|null} The vault index or null if not found
 */
export function getVaultIndexByWalletHash(walletHash) {
  try {
    if (!walletHash) return null
    
    const vault = Store.getters['global/getVault']
    if (!vault || vault.length === 0) return null
    
    const normalizedHash = String(walletHash).trim()
    
    const index = vault.findIndex(wallet => {
      if (!wallet || wallet.deleted) return false
      
      const hash = wallet?.wallet?.bch?.walletHash || 
                   wallet?.wallet?.BCH?.walletHash ||
                   wallet?.BCH?.walletHash ||
                   wallet?.bch?.walletHash ||
                   wallet?.walletHash
      
      if (!hash) return false
      
      return String(hash).trim() === normalizedHash
    })
    
    return index !== -1 ? index : null
  } catch (error) {
    console.error('Error getting vault index by wallet hash:', error)
    return null
  }
}

/**
 * Get wallet from vault by wallet hash
 * @param {string} walletHash - The wallet hash
 * @returns {Object|null} The wallet object or null if not found
 */
export function getWalletByHash(walletHash) {
  try {
    const index = getVaultIndexByWalletHash(walletHash)
    if (index === null) return null
    
    const vault = Store.getters['global/getVault']
    return vault?.[index] || null
  } catch (error) {
    console.error('Error getting wallet by hash:', error)
    return null
  }
}

/**
 * Get vault index by wallet hash (async version for use in actions)
 * @param {string} walletHash - The wallet hash
 * @returns {Promise<number|null>} The vault index or null if not found
 */
export async function getVaultIndexByWalletHashAsync(walletHash) {
  try {
    if (!walletHash) return null
    
    const useStore = (await import('src/store')).default
    const store = useStore()
    const vault = store.getters['global/getVault']
    
    if (!vault || vault.length === 0) return null
    
    const normalizedHash = String(walletHash).trim()
    
    const index = vault.findIndex(wallet => {
      if (!wallet || wallet.deleted) return false
      
      const hash = wallet?.wallet?.bch?.walletHash || 
                   wallet?.wallet?.BCH?.walletHash ||
                   wallet?.BCH?.walletHash ||
                   wallet?.bch?.walletHash ||
                   wallet?.walletHash
      
      if (!hash) return false
      
      return String(hash).trim() === normalizedHash
    })
    
    return index !== -1 ? index : null
  } catch (error) {
    console.error('Error getting vault index by wallet hash:', error)
    return null
  }
}

