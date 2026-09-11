import axios from 'axios'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { requestManager } from 'src/utils/request-manager'
import { Store } from 'src/store'

// BCH OAuth
import { BitcoinCashOAuthClient } from 'bitcoincash-oauth-client'
import { binToHex, deriveHdPath, deriveHdPrivateNodeFromSeed, deriveHdPublicNode } from '@bitauth/libauth'
import { mnemonicToSeedSync } from 'bip39'
import { getMnemonicByHash } from 'src/wallet'
import { pubkeyToAddress } from 'src/utils/crypto'

const OAUTH_TOKEN_KEY = 'paytaca-ai-oauth-token'
const OAUTH_REFRESH_TOKEN_KEY = 'paytaca-ai-oauth-refresh-token'

export const backend = axios.create()
requestManager.attachTo(backend)

const STORAGE_KEY = 'paytaca-ai-api-keys'
const baseURL = process.env.PAYTACA_AI_API || ''
const MAX_AUTH_RETRIES = 1

function getWalletHash () {
    return Store.getters['global/getWallet']('bch')?.walletHash
}

function getIsChipnet () {
    return Store.getters['global/isChipnet']
}


// ===== BCH OAuth =======

function getOAuthDomain () {
    try {
        const url = new URL(baseURL)
        return url.hostname
    } catch {
        return 'api.paytaca.ai'
    }
}

async function deriveOAuthCredentials () {
  const walletHash = getWalletHash()
  if (!walletHash) throw new Error('Wallet hash not available')

  const mnemonic = await getMnemonicByHash(walletHash)
  if (!mnemonic) throw new Error('Mnemonic not available')

  try {
    const mnemonicBin = new Uint8Array(mnemonicToSeedSync(mnemonic))
    const rootNode = deriveHdPrivateNodeFromSeed(mnemonicBin)

    if (!rootNode || !rootNode.valid) {
      throw new Error('Invalid HD node derived from seed')
    }

    const addressNode = deriveHdPath(rootNode, "m/44'/145'/0'/0/0")

    if (typeof addressNode === 'string') {
      throw new Error(`Failed to derive address node: ${addressNode}`)
    }

    const privateKeyHex = binToHex(addressNode.privateKey)
    const publicNode = deriveHdPublicNode(addressNode)
    const publicKeyHex = binToHex(publicNode.publicKey)
    const isChipnet = Store.getters['global/isChipnet']
    const address = pubkeyToAddress(publicKeyHex, isChipnet)

    return { privateKeyHex, publicKeyHex, address, walletHash }
  } catch (error) {
    console.error('[AI Admin] Failed to derive credentials:', error)
    throw error
  }
}

async function getStoredToken () {
    try {
        const result = await SecureStoragePlugin.get({ key: OAUTH_TOKEN_KEY })
        return result.value || null
    } catch {
        return null
    }
}

async function saveToken (token) {
    await SecureStoragePlugin.set({ key: OAUTH_TOKEN_KEY, value: token })
}

async function clearToken () {
  try {
    await SecureStoragePlugin.remove({ key: OAUTH_TOKEN_KEY })
  } catch { /* ignore */ }
}

async function getStoredRefreshToken () {
    try {
        const result = await SecureStoragePlugin.get({ key: OAUTH_REFRESH_TOKEN_KEY })
        return result.value || null
    } catch {
        return null
    }
}

async function saveRefreshToken (token) {
    await SecureStoragePlugin.set({ key: OAUTH_REFRESH_TOKEN_KEY, value: token })
}

async function clearRefreshToken () {
    try {
        await SecureStoragePlugin.remove({ key: OAUTH_REFRESH_TOKEN_KEY })
    } catch { /* ignore */ }
}

let refreshPromise = null

async function refreshAccessToken () {
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
        const refreshToken = await getStoredRefreshToken()
        if (!refreshToken) throw new Error('No refresh token available')

        const response = await backend.post(baseURL + '/auth/refresh', {
            refresh_token: refreshToken
        })

        if (response.data?.access_token) {
            await saveToken(response.data.access_token)
            if (response.data.refresh_token) {
                await saveRefreshToken(response.data.refresh_token)
            }
            return response.data.access_token
        }

        throw new Error('Refresh failed')
    })().finally(() => { refreshPromise = null })

    return refreshPromise
}

async function axiosFetch(url, options = {}) {
  const { method = 'GET', headers = {}, body } = options

  try {
    const response = await backend({ url, method, headers, data: body })
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
      json: async () => response.data,
      text: async () => JSON.stringify(response.data)
    }
  } catch (error) {
    if (error.response) {
      return {
        ok: false,
        status: error.response.status,
        statusText: error.response.statusText,
        headers: new Headers(error.response.headers),
        json: async () => error.response.data,
        text: async () => JSON.stringify(error.response.data)
      }
    }
    throw error
  }
}

async function getAuthHeaders () {
  const storedToken = await getStoredToken()
  if (storedToken) {
    return { 'Authorization': `Bearer ${storedToken}` }
  }

  try {
    const newToken = await refreshAccessToken()
    return { 'Authorization': `Bearer ${newToken}` }
  } catch {
    await clearToken()
    await clearRefreshToken()
  }

  const { privateKeyHex, publicKeyHex, address, walletHash } = await deriveOAuthCredentials()
  const domain = getOAuthDomain()
  const client = new BitcoinCashOAuthClient({
      serverUrl: baseURL,
      network: getIsChipnet() ? 'chipnet' : 'mainnet',
      fetch: axiosFetch
  })

  // Try token first
  const timestamp = Math.floor(Date.now() / 1000)
  const message = client.createAuthMessage(walletHash, timestamp, domain)
  const signature = await client.signAuthMessage(message, privateKeyHex)

  try {
    const tokenResponse = await backend.post(baseURL + '/auth/token', {
      user_id: walletHash,
      timestamp,
      domain,
      public_key: publicKeyHex,
      signature
    })

    if (tokenResponse.data?.access_token) {
      await saveToken(tokenResponse.data.access_token)
      if (tokenResponse.data.refresh_token) {
        await saveRefreshToken(tokenResponse.data.refresh_token)
      }
      return { 'Authorization': `Bearer ${tokenResponse.data.access_token}` }
    }
  } catch (error) {
      // If 404, user not registered — register first
      if (error.response?.status !== 404) throw error
  }

  // Register
  const regTimestamp = Math.floor(Date.now() / 1000)
  const regMessage = client.createAuthMessage(walletHash, regTimestamp, domain)
  const regSignature = await client.signAuthMessage(regMessage, privateKeyHex)

  await backend.post(baseURL + '/auth/register', {
    bitcoincash_address: address,
    user_id: walletHash,
    timestamp: regTimestamp,
    domain,
    public_key: publicKeyHex,
    signature: regSignature
  })

  // Get token after registration (fresh timestamp)
  const finalTimestamp = Math.floor(Date.now() / 1000)
  const finalMessage = client.createAuthMessage(walletHash, finalTimestamp, domain)
  const finalSignature = await client.signAuthMessage(finalMessage, privateKeyHex)

  const finalTokenResponse = await backend.post(baseURL + '/auth/token', {
    user_id: walletHash,
    timestamp: finalTimestamp,
    domain,
    public_key: publicKeyHex,
    signature: finalSignature
  })

  if (finalTokenResponse.data?.access_token) {
    await saveToken(finalTokenResponse.data.access_token)
    if (finalTokenResponse.data.refresh_token) {
        await saveRefreshToken(finalTokenResponse.data.refresh_token)
    }
    return { 'Authorization': `Bearer ${finalTokenResponse.data.access_token}` }
  }

  throw new Error('Authentication failed')
}

export async function authUser () {
    try {
        await getAuthHeaders()
        return true
    } catch (error) {
        console.error('[AI Admin] Auth error:', error)
        return false
    }
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
export async function getApiKeyById(keyId) {
  const keys = await getApiKeys()
  const found = keys.find(k => k.id === keyId)
  return found?.key || null
}

/**
 * Update API key with the new name
 * @param {string} keyId
 * @param {string} newName
 */
export async function updateKeyName(keyId, newName) {
    const walletHash = getWalletHash()
    const allKeys = await _getAllKeys()
    const walletKeys = allKeys[walletHash] || []
    const found = walletKeys.find(k => k.id === keyId)
    if (found) {
        found.name = newName
        allKeys[walletHash] = walletKeys
        await SecureStoragePlugin.set({ key: STORAGE_KEY, value: JSON.stringify(allKeys) })
    }
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
  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      const keyName = name || ''
      const headers = await getAuthHeaders()

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
      if ((error.response?.status === 401 || error.response?.status === 403) && attempt < MAX_AUTH_RETRIES) {
        await clearToken()
        continue
      }

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
  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      const headers = await getAuthHeaders()

      let params = {
        page: data.page || 1,
        page_size: data.pageSize || 10,
        is_active: data.isActive ?? true // unrevoked keys
      }

      const response = await backend.get(baseURL + '/ai-admin/api-keys', { params: params, headers: headers})

      return {
        success: true,
        data: response.data,
        error: null
      }      
    } catch(error) {
      if ((error.response?.status === 401 || error.response?.status === 403) && attempt < MAX_AUTH_RETRIES) {
        await clearToken()
        continue
      }

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
  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      const headers = await getAuthHeaders()

      const response = await backend.get(baseURL + '/ai-admin/api-keys/' + uuid, { headers: headers})
      
      return {
        success: true,
        data: response.data,
        error: null
      }      
    } catch (error) {
      if ((error.response?.status === 401 || error.response?.status === 403) && attempt < MAX_AUTH_RETRIES) {
        await clearToken()
        continue
      }

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

// revoke api key
export async function revokeAPIKey(uuid) {
  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      const headers = await getAuthHeaders()

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
      if ((error.response?.status === 401 || error.response?.status === 403) && attempt < MAX_AUTH_RETRIES) {
        await clearToken()
        continue
      }

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

      if ('search' in data) {
        params['search'] = data.search
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

// Session List
export async function fetchSessions(data) {
  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      const headers = await getAuthHeaders()

      let params = {
        page: data.page || 1,
        page_size: data.pageSize || 10
      }

      if ('modelId' in data) {
        params['model_id'] = data.modelId
      }

      const response = await backend.get(baseURL + '/ai-admin/sessions', { params: params, headers: headers})

      return {
        success: true,
        data: response.data,
        error: null
      }
    } catch (error) {
      if ((error.response?.status === 401 || error.response?.status === 403) && attempt < MAX_AUTH_RETRIES) {
        await clearToken()
        continue
      }

      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch sessions'
      console.error('[fetchSessions] Error:', errorMessage)

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

// Session Detail
export async function fetchSessionDetails (uuid) {
  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      const headers = await getAuthHeaders()

      const response = await backend.get(baseURL + '/ai-admin/sessions/' + uuid, { headers: headers})

      return {
        success: true,
        data: response.data,
        error: null
      }
    } catch (error) {
      if ((error.response?.status === 401 || error.response?.status === 403) && attempt < MAX_AUTH_RETRIES) {
        await clearToken()
        continue
      }

      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch session details'
      console.error('[fetchSessionDetails] Error:', errorMessage)

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

// Update Keyname
export async function updateAPIKey(uuid, name) {
  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      const headers = await getAuthHeaders()

      const payload = { 
        name: name
      }

      const response = await backend.patch(baseURL + '/api-keys/' + uuid, payload, { headers: headers })

      return {
        success: true,
        data: response.data,
        error: null
      }
    } catch (error) {
      if ((error.response?.status === 401 || error.response?.status === 403) && attempt < MAX_AUTH_RETRIES) {
        await clearToken()
        continue
      }

      const errorMessage = error.response?.data?.message || error.message || 'Failed to update API key name'
      console.error('[updateAPIKey] Error:', errorMessage)

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

// Create Pending Session
export async function createSession(modelID, duration) {
  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      const headers = await getAuthHeaders()

      const payload = {
        model_id: modelID,
        duration_minutes: duration
      }

      const response = await backend.post(baseURL + '/sessions', payload, { headers: headers })

      return {
        success: true,
        data: response.data,
        error: null
      } 
    } catch (error) {
      if ((error.response?.status === 401 || error.response?.status === 403) && attempt < MAX_AUTH_RETRIES) {
        await clearToken()
        continue
      }

      const errorMessage = error.response?.data?.message || error.message || 'Failed to create session'
      console.error('[createSession] Error:', errorMessage)

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

// Confirm Session (After payment)
export async function confirmSession(address, txid) {
  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      const headers = await getAuthHeaders()

      const payload = {
        address: address,
        txid: txid
      }

      const response = await backend.post(baseURL + '/sessions/confirm', payload, { headers: headers})

      return {
        success: true,
        data: response.data,
        error: null
      }
    } catch (error) { 
      if ((error.response?.status === 401 || error.response?.status === 403) && attempt < MAX_AUTH_RETRIES) {
        await clearToken()
        continue
      }

      const errorMessage = error.response?.data?.message || error.message || 'Failed to confirm session'
      console.error('[confirmSession] Error:', errorMessage)

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
