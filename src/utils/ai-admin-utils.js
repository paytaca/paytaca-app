import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { Store } from 'src/store'

const STORAGE_KEY = 'paytaca-ai-api-keys'

function getWalletHash () {
    return Store.getters['global/getWallet']('bch')?.walletHash
}

/**
 * Get all API keys for a wallet hash.
 * @returns {Promise<Array>} Array of { id, key, key_prefix, name, created_at }
 */
export async function getApiKeys() {
    const walletHash = getWalletHash()

    try {
        const result = await SecureStoragePlugin.get({ key: STORAGE_KEY })
        const allKeys = JSON.parse(result?.value || '{}')
        return allKeys[walletHash] || []
    } catch (err) {
        console.log('error: ', err)
        // if (err?.message === 'SECURE_STORAGE_DECRYPT_FAILED') throw err
        return []
    }
}

/**
 * Save a new API key (called after POST /v1/api-keys returns the full key).
 * @param {Object} keyData - { id, key, key_prefix, name, created_at }
 */
export async function saveApiKey(keyData) {
    const walletHash = getWalletHash()
    const allKeys = await _getAllKeys()
    const walletKeys = allKeys[walletHash] || []
    walletKeys.push(keyData)
    allKeys[walletHash] = walletKeys
    await SecureStoragePlugin.set({ key: STORAGE_KEY, value: JSON.stringify(allKeys) })
}


/**
 * Remove a revoked API key from local storage.
 * @param {string} keyId
 */
export async function removeApiKey(keyId) {
    const walletHash = getWalletHash()
    const allKeys = await _getAllKeys()
    const walletKeys = (allKeys[walletHash] || []).filter(k => k.id !== keyId)
    allKeys[walletHash] = walletKeys
    await SecureStoragePlugin.set({ key: STORAGE_KEY, value: JSON.stringify(allKeys) })
}

/**
 * Get a single full API key by ID (for copying to clipboard).
 * @param {string} keyId
 * @returns {Promise<string|null>} Full key string
 */
export async function getApiKeyById(walletHash, keyId) {
  const keys = await getApiKeys(walletHash)
  const found = keys.find(k => k.id === keyId)
  return found?.key || null
}

// Private helper
async function _getAllKeys() {
  try {
    const result = await SecureStoragePlugin.get({ key: STORAGE_KEY })
    return JSON.parse(result?.value || '{}')
  } catch {
    return {}
  }
}
