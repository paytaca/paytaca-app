import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { Store } from 'src/store'
import { getWalletStorageKey } from './wallet-storage'

/**
 * Migration utility for converting global storage to wallet-specific storage
 * This handles migration of both secure storage and Vuex state
 */

// Storage key prefixes that need migration
const STORAGE_KEY_PREFIXES = [
  'ramp-p2p-auth-key',
  'paytacapos-admin-auth-key',
  'memo-auth-key',
  'asset-auth-key',
  'marketplace-arbiter-key',
  'ramp-api-customer-signer-data',
  'marketplace-api-customer-signer-data'
]

/**
 * Migrate a single secure storage key from global to wallet-specific
 * @param {string} prefix - Storage key prefix
 * @param {string} walletHash - Target wallet hash
 * @returns {Promise<boolean>} Success status
 */
async function migrateSecureStorageKey(prefix, walletHash) {
  try {
    // Try to get the old global key
    const oldKey = prefix
    const oldValue = await SecureStoragePlugin.get({ key: oldKey })
      .then(result => result.value)
      .catch(() => null)
    
    if (!oldValue) {
      // No old value to migrate
      return true
    }
    
    // Check if wallet-specific key already exists
    const newKey = getWalletStorageKey(prefix, walletHash)
    const existingValue = await SecureStoragePlugin.get({ key: newKey })
      .then(result => result.value)
      .catch(() => null)
    
    if (existingValue) {
      // Wallet-specific key already exists, skip migration
      return true
    }
    
    // Migrate: copy old value to new wallet-specific key
    await SecureStoragePlugin.set({ key: newKey, value: oldValue })
    
    // Optionally remove old key (commented out to be safe - can be cleaned up later)
    // await SecureStoragePlugin.remove({ key: oldKey })
    
    console.log(`Migrated secure storage: ${prefix} -> ${newKey}`)
    return true
  } catch (error) {
    console.error(`Error migrating secure storage key ${prefix}:`, error)
    return false
  }
}

/**
 * Migrate all secure storage keys for a wallet
 * @param {string} walletHash - Target wallet hash
 * @returns {Promise<boolean>} Success status
 */
export async function migrateSecureStorage(walletHash) {
  if (!walletHash) {
    console.warn('migrateSecureStorage: walletHash is required')
    return false
  }
  
  try {
    const results = await Promise.all(
      STORAGE_KEY_PREFIXES.map(prefix => migrateSecureStorageKey(prefix, walletHash))
    )
    
    // Return true if at least some migrations succeeded
    return results.some(result => result === true)
  } catch (error) {
    console.error('Error in migrateSecureStorage:', error)
    return false
  }
}

/**
 * Migrate Vuex state from global to wallet-specific structure
 * Note: This is a placeholder for future migration if needed
 * Since the state structure has been refactored, existing users will start with fresh state
 * for each wallet. If migration of existing Vuex state is needed in the future, it should
 * be done through mutations to maintain reactivity.
 * @param {string} walletHash - Target wallet hash
 * @returns {Promise<boolean>} Success status
 */
export async function migrateVuexState(walletHash) {
  if (!walletHash) {
    console.warn('migrateVuexState: walletHash is required')
    return false
  }
  
  // Vuex state migration is not implemented as the state structure has been refactored
  // Existing users will start with fresh state for each wallet
  // If migration is needed in the future, it should use mutations to maintain reactivity
  return true
}

/**
 * Migrate all data (secure storage and Vuex state) for a wallet
 * This is the main entry point for migration
 * @param {string} walletHash - Target wallet hash
 * @returns {Promise<boolean>} Success status
 */
export async function migrateGlobalToWalletSpecific(walletHash) {
  if (!walletHash) {
    console.warn('migrateGlobalToWalletSpecific: walletHash is required')
    return false
  }
  
  try {
    // Migrate secure storage
    const secureStorageResult = await migrateSecureStorage(walletHash)
    
    // Migrate Vuex state
    const vuexStateResult = await migrateVuexState(walletHash)
    
    // Return true if at least one migration succeeded
    // This allows the app to continue even if migration partially fails
    return secureStorageResult || vuexStateResult
  } catch (error) {
    console.error('Error in migrateGlobalToWalletSpecific:', error)
    // Return true to allow app to continue with fresh state
    return true
  }
}

