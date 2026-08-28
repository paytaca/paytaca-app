import axios from 'axios'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { requestManager } from 'src/utils/request-manager'
import { Store } from 'src/store'

export const backend = axios.create()
requestManager.attachTo(backend)

const STORAGE_KEY = 'paytaca-ai-api-keys'
const baseURL = process.env.PAYTACA_AI_API || ''
const MAX_AUTH_RETRIES = 1

function getWalletHash () {
    return Store.getters['global/getWallet']('bch')?.walletHash
}

// ===== Secure Storage =======

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


// ===== Paytaca AI API =======


// Create API Keys
export async function createAPIKey (name) {
  const walletHash = getWalletHash()

  if (!walletHash) {
    return { success: false, data: null, error: 'Wallet hash not available' }
  }

  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      const keyName = name || ''
      let headers = {
        "X-Wallet-Hash": walletHash
      }

      const payload = {
        name: keyName
      }

      const response = await backend.post(baseURL + '/api-keys', payload, { headers: headers})

      // Save api key to secure storage
      if (response?.data) {
        await saveApiKey(response.data)
      }

      return {
				success: true,
				data: response.data,
				error: null
			}
    } catch(error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create API key'
			console.error('[createAPIKey] Error:', errorMessage)

      if (attempt === MAX_AUTH_RETRIES) {
        return {
          success: false,
          data: null,
          error: `Network error: ${errorMessage}`
        }
      }
    }
  }
}

// API Key List
export async function fetchAPIKeys(data) {
  const walletHash = getWalletHash()

  if (!walletHash) {
    return { success: false, data: null, error: 'Wallet hash not available' }
  }

  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      let headers = {
        "X-Wallet-Hash": walletHash
      }

      let params = {
        page: data.page || 1,
        page_size: data.pageSize || 10
      }

      const response = await backend.get(baseURL + '/ai-admin/api-keys', { params: params, headers: headers})

      return {
				success: true,
				data: response.data,
				error: null
			}      
    } catch(error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch API keys'
			console.error('[fetchAPIKeys] Error:', errorMessage)

      if (attempt === MAX_AUTH_RETRIES) {
        return {
          success: false,
          data: null,
          error: `Network error: ${errorMessage}`
        }
      }
    }
  }
}

// API Key Details
export async function fetchAPIKeyDetails(uuid) {
  const walletHash = getWalletHash()

  if (!walletHash) {
    return { success: false, data: null, error: 'Wallet hash not available' }
  }

  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      let headers = {
        "X-Wallet-Hash": walletHash
      }

      const response = await backend.get(baseURL + '/ai-admin/api-keys/' + uuid, { headers: headers})
      
      return {
				success: true,
				data: response.data,
				error: null
			}      
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch API key details'
			console.error('[fetchAPIKeyDetails] Error:', errorMessage)

      if (attempt === MAX_AUTH_RETRIES) {
        return {
          success: false,
          data: null,
          error: `Network error: ${errorMessage}`
        }
      }
    }
  }
}

// revoke apu key
export async function revokeAPIKey(uuid) {
  const walletHash = getWalletHash()

  if (!walletHash) {
    return { success: false, data: null, error: 'Wallet hash not available' }
  }

  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      let headers = {
        "X-Wallet-Hash": walletHash
      }

      const response = await backend.delete(baseURL + '/api-keys/' + uuid, { headers: headers})

      if (response?.data) {
        await removeApiKey(uuid)
      }

      return {
        success: true,
        data: response.data,
        error: null
      }
    } catch(error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to revoke API key'
			console.error('[revokeAPIKey] Error:', errorMessage)

      if (attempt === MAX_AUTH_RETRIES) {
        return {
          success: false,
          data: null,
          error: `Network error: ${errorMessage}`
        }
      }
    }      
  }
}

// Models List
export async function fetchModels(data) {
  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      const params = {}

      if ('tier' in data) {
        params['tier'] = data.tier
      }

      if ('provider' in data) {
        params['provider'] = data.provider
      }

      if ('isActive' in data) {
        params['is_active'] = data.isActive
      }

      if ('ordering' in data) {
        params['ordering'] = data.ordering
      }

      const response = await backend.get(baseURL + '/ai-admin/models', { params: params})

      return {
        success: true,
        data: response.data,
        error: null
      }

    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch models'
			console.error('[fetchModels] Error:', errorMessage)

      if (attempt === MAX_AUTH_RETRIES) {
        return {
          success: false,
          data: null,
          error: `Network error: ${errorMessage}`
        }
      }
    }
  }

} 

// Model Details
export async function fetchModelDetails(modelID) {
  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      const response = await backend.get(baseURL + '/ai-admin/models/' + modelID)

      return {
        success: true,
        data: response.data,
        error: null
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch model details'
			console.error('[fetchModelDetails] Error:', errorMessage)

      if (attempt === MAX_AUTH_RETRIES) {
        return {
          success: false,
          data: null,
          error: `Network error: ${errorMessage}`
        }
      }
    }
  }
}