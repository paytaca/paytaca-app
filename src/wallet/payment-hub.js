import axios from 'axios'
import { Store } from 'src/store'
import { BitcoinCashOAuthClient } from 'bitcoincash-oauth-client'
import {
  binToHex,
  deriveHdPath,
  deriveHdPrivateNodeFromSeed,
  deriveHdPublicNode,
} from "@bitauth/libauth"
import { mnemonicToSeedSync } from 'bip39'
import { getMnemonicByHash } from 'src/wallet'
import { pubkeyToAddress } from 'src/utils/crypto'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import packageInfo from '../../package.json'
import { Loading, QSpinnerIos } from 'quasar'

/**
 * Base URL for the Payment Hub API.
 */
const baseURL = process.env.PAYMENT_HUB_API || 'https://watchtower.cash/api'

/**
 * Axios instance configured for the Payment Hub API.
 */
export const backend = axios.create({
  baseURL: baseURL
})

const OAUTH_TOKEN_KEY = 'payment-hub-oauth-token'
const OAUTH_ADDRESS_PATH = "7/0" // Custom branch for Payment Hub identity
const BCH_DERIVATION_PATH = "m/44'/145'/0'" // Standard BCH derivation path

/**
 * Get the current wallet hash from the store.
 */
function getWalletHash() {
  return Store.getters['global/getWallet']('bch')?.walletHash
}

/**
 * Extract domain from baseURL for OAuth message signing.
 */
function getOAuthDomain() {
  try {
    const url = new URL(baseURL)
    return url.hostname
  } catch (e) {
    const match = baseURL.match(/https?:\/\/([^/]+)/)
    return match ? match[1] : 'watchtower.cash'
  }
}

/**
 * Custom fetch implementation using axios for the BitcoinCashOAuthClient.
 * This ensures compatibility with Capacitor and consistent header handling.
 */
async function axiosFetch(url, options = {}) {
  const { method = 'GET', headers = {}, body } = options
  try {
    const response = await backend({
      url,
      method,
      headers,
      data: body
    })
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

/**
 * Authentication management for the Payment Hub.
 * Follows the proven logic from src/utils/eload-service.js.
 */
export const authToken = {
  /**
   * Retrieves or generates a valid OAuth token using BitcoinCashOAuth handshake.
   */
  async get(wallet, forceRefresh = false) {
    const walletHash = wallet.BCH.walletHash
    const storageKey = `${OAUTH_TOKEN_KEY}-${walletHash}`

    if (!forceRefresh) {
      try {
        const stored = await SecureStoragePlugin.get({ key: storageKey })
        if (stored?.value) return stored.value
      } catch (e) {}
    }

    const mnemonic = await getMnemonicByHash(walletHash)
    const mnemonicBin = new Uint8Array(mnemonicToSeedSync(mnemonic))
    const rootNode = deriveHdPrivateNodeFromSeed(mnemonicBin)
    const fullPath = `${BCH_DERIVATION_PATH}/${OAUTH_ADDRESS_PATH}`
    const authNode = deriveHdPath(rootNode, fullPath)
    
    if (typeof authNode === 'string') throw new Error(`Derivation failed: ${authNode}`)

    const privateKeyHex = binToHex(authNode.privateKey)
    const publicKey = binToHex(deriveHdPublicNode(authNode).publicKey)
    const address = pubkeyToAddress(publicKey, false)
    const domain = getOAuthDomain()
    const timestamp = Math.floor(Date.now() / 1000)

    const client = new BitcoinCashOAuthClient({
      serverUrl: baseURL,
      network: 'mainnet',
      fetch: axiosFetch
    })

    const message = client.createAuthMessage(walletHash, timestamp, domain)
    const signature = await client.signAuthMessage(message, privateKeyHex)

    // Attempt to obtain token
    let authResponse = await axiosFetch(`${baseURL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: walletHash,
        timestamp: timestamp,
        domain: domain,
        public_key: publicKey,
        signature: signature
      })
    })

    // Auto-register if not found
    if (authResponse.status === 404) {
      await client.register(address, privateKeyHex, publicKey, walletHash, timestamp, domain)
      
      // Retry token acquisition
      const newTimestamp = Math.floor(Date.now() / 1000)
      const newMessage = client.createAuthMessage(walletHash, newTimestamp, domain)
      const newSignature = await client.signAuthMessage(newMessage, privateKeyHex)

      authResponse = await axiosFetch(`${baseURL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: walletHash,
          timestamp: newTimestamp,
          domain: domain,
          public_key: publicKey,
          signature: newSignature
        })
      })
    }

    if (!authResponse.ok) throw new Error('OAuth authentication failed')

    const authData = await authResponse.json()
    const token = authData.access_token || authData.token
    await SecureStoragePlugin.set({ key: storageKey, value: token })
    return token
  },

  async clear(walletHash) {
    const key = `${OAUTH_TOKEN_KEY}-${walletHash}`
    await SecureStoragePlugin.remove({ key })
  }
}

/**
 * Axios Request Interceptor.
 * Attaches the appropriate Authorization header based on the request type.
 */
backend.interceptors.request.use(async (config) => {
  config.headers["X-Paytaca-App-Version"] = packageInfo.version
  
  if (config.apiKey) {
    config.headers['Authorization'] = `Api-Key ${config.apiKey}`
    return config
  }

  if (config.authorize && config.wallet) {
    try {
      const token = await authToken.get(config.wallet)
      config.headers.Authorization = `Bearer ${token}`
    } catch (e) {
      console.error('Payment Hub Auth Failed:', e)
    }
  }

  return config
})

/**
 * Response interceptor to automatically handle token expiration (403 Forbidden).
 */
backend.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If 403 error, attempt to regenerate token and retry exactly once
    if (
      error.response?.status === 403 && 
      !originalRequest._retry && 
      originalRequest.authorize && 
      originalRequest.wallet
    ) {
      originalRequest._retry = true
      
      try {
        // Show loading indicator during regeneration
        Loading.show({
          spinner: QSpinnerIos,
          message: 'Refreshing authentication...',
          backgroundColor: 'pt-primary1'
        })

        console.log('[Payment Hub] Token expired (403). Regenerating...')
        const token = await authToken.get(originalRequest.wallet, true)
        
        // Update the header and retry the original request
        originalRequest.headers.Authorization = `Bearer ${token}`
        return backend(originalRequest)
      } catch (refreshError) {
        console.error('[Payment Hub] Authentication refresh failed:', refreshError)
        return Promise.reject(refreshError)
      } finally {
        Loading.hide()
      }
    }

    return Promise.reject(error)
  }
)

/**
 * PaymentHub class implementation based on API_DOCS.md.
 */
export class PaymentHub {
  constructor(wallet) {
    this.wallet = wallet
  }

  // --- Wallets Section ---

  async checkRegistration() {
    const response = await backend.get('/wallets/', {
      params: { wallet_hash: this.wallet.BCH.walletHash },
      authorize: true,
      wallet: this.wallet
    })
    return response.data.length > 0 ? response.data[0] : null
  }

  async registerWallet() {
    const xpub = await this.wallet.BCH.getXPubKey()
    const response = await backend.post('/wallets/', {
      wallet_hash: this.wallet.BCH.walletHash,
      xpub_key: xpub
    }, {
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  // --- Stores Section ---

  /**
   * Lists stores associated with the current wallet. Supports pagination.
   * @param {Object} params - Query parameters (e.g. { page: 1 })
   */
  async listStores(params = {}) {
    const queryParams = { 
      wallet_hash: this.wallet.BCH.walletHash,
      ...params 
    }
    const response = await backend.get('/stores/', {
      params: queryParams,
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  /**
   * Creates a new store. Supports both JSON and Multipart (for file uploads).
   * @param {Object} storeData - The store configuration data.
   */
  async createStore(storeData) {
    let payload = storeData
    const config = {
      authorize: true,
      wallet: this.wallet,
      headers: {}
    }

    // If logo is a File/Blob, use FormData for multipart upload
    if (storeData.logo instanceof File || storeData.logo instanceof Blob) {
      payload = new FormData()
      Object.keys(storeData).forEach(key => {
        if (storeData[key] !== undefined && storeData[key] !== null) {
          payload.append(key, storeData[key])
        }
      })
      config.headers['Content-Type'] = 'multipart/form-data'
    }

    const response = await backend.post('/stores/', payload, config)
    return response.data
  }

  /**
   * Retrieves details of a specific store.
   * @param {String} storeId - The UUID of the store.
   */
  async getStore(storeId) {
    const response = await backend.get(`/stores/${storeId}`, {
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  /**
   * Updates an existing store's settings.
   * @param {String} storeId - The UUID of the store.
   * @param {Object} updateData - The settings to update.
   */
  async updateStore(storeId, updateData) {
    let payload = updateData
    const config = {
      authorize: true,
      wallet: this.wallet,
      headers: {}
    }

    // Use FormData if a new logo file is provided
    if (updateData.logo instanceof File || updateData.logo instanceof Blob) {
      payload = new FormData()
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && updateData[key] !== null) {
          payload.append(key, updateData[key])
        }
      })
      config.headers['Content-Type'] = 'multipart/form-data'
    }

    const response = await backend.patch(`/stores/${storeId}`, payload, config)
    return response.data
  }

  /**
   * Deletes a store instance.
   * @param {String} storeId - The UUID of the store.
   */
  async deleteStore(storeId) {
    const response = await backend.delete(`/stores/${storeId}`, {
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  /**
   * Generates a unique BCH receiving address for a store.
   * Requires a valid API Key for the store.
   * @param {String} storeId - The UUID of the store.
   * @param {String} apiKey - The secret API Key for the store.
   */
  async generateStoreAddress(storeId, apiKey) {
    const response = await backend.get(`/stores/${storeId}/generate-address`, {
      apiKey: apiKey
    })
    return response.data
  }

  /**
   * Retrieves the current webhook Ed25519 public key for a store.
   * @param {String} storeId - The UUID of the store.
   */
  async getWebhookPublicKey(storeId) {
    const response = await backend.get(`/stores/${storeId}/webhook-key`, {
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  /**
   * Rotates (regenerates) the webhook Ed25519 key pair for a store.
   * @param {String} storeId - The UUID of the store.
   */
  async rotateWebhookKeys(storeId) {
    const response = await backend.post(`/stores/${storeId}/webhook-key`, {}, {
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  // --- API Keys Section ---

  /**
   * Lists API keys for a specific store. Supports pagination.
   * @param {String} storeId - The UUID of the store.
   * @param {Object} params - Query parameters (e.g. { page: 1 })
   */
  async listApiKeys(storeId, params = {}) {
    const queryParams = {
      store_id: storeId,
      ...params
    }
    const response = await backend.get('/keys/', {
      params: queryParams,
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  /**
   * Generates a new API Key for a store.
   * @param {String} storeId - The UUID of the store.
   * @param {String} keyName - An identifier for the key (e.g., "Mobile App").
   * @param {String} [expiryDate] - Optional expiry date in ISO format.
   */
  async generateApiKey(storeId, keyName, expiryDate) {
    const response = await backend.post('/keys/', {
      store_id: storeId,
      name: keyName,
      expiry_date: expiryDate
    }, {
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  /**
   * Revokes (permanently disables) an API Key.
   * @param {String} keyId - The ID of the API key to revoke.
   */
  async revokeApiKey(keyId) {
    const response = await backend.patch(`/keys/${keyId}/revoke`, {}, {
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  // --- Invoices Section ---

  /**
   * Lists invoices for a specific store. Supports pagination and filtering.
   * @param {String} storeId - The UUID of the store.
   * @param {Object} params - Query parameters (e.g. { status: 'PAID', page: 1, network: 'main' })
   */
  async listInvoices(storeId, params = {}) {
    const queryParams = {
      store_id: storeId,
      ...params
    }
    const response = await backend.get('/invoices/', {
      params: queryParams,
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  /**
   * Retrieves full details for a specific invoice.
   * @param {String} invoiceId - The UUID or Short ID of the invoice.
   */
  async getInvoice(invoiceId) {
    const response = await backend.get(`/invoices/${invoiceId}`, {
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  // --- Contract Artifact Section ---

  /**
   * Retrieves the contract artifact for the given script type.
   * @param {String} scriptType - The type of script (e.g. 'recurring_payments')
   */
  async getContractArtifact(scriptType = 'recurring_payments') {
    const response = await backend.get(`/contract/artifact/`, {
      params: { script_type: scriptType },
      // Does not strictly require auth, but including it is safe
    })
    return response.data
  }

  // --- Plans Section ---

  /**
   * Lists plans for a specific store. Supports pagination.
   * @param {String} storeId - The UUID of the store.
   * @param {Object} params - Query parameters (e.g. { page: 1, is_active: true })
   */
  async listPlans(storeId, params = {}) {
    const queryParams = {
      store_id: storeId,
      ...params
    }
    const response = await backend.get('/plans/', {
      params: queryParams,
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  /**
   * Retrieves details of a specific plan. Publicly accessible.
   * @param {String} planId - The UUID or Short ID of the plan.
   */
  async getPlan(planId) {
    const response = await backend.get(`/plans/${planId}`)
    return response.data
  }

  /**
   * Creates a new subscription plan for a store.
   * @param {String} storeId - The UUID of the store.
   * @param {Object} planData - Data for the new plan (name, description, amount, interval_type)
   */
  async createPlan(storeId, planData) {
    const payload = {
      store: storeId,
      ...planData
    }
    const response = await backend.post('/plans/', payload, {
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  /**
   * Deactivates an existing plan.
   * @param {String} planId - The UUID of the plan.
   */
  async deactivatePlan(planId) {
    const response = await backend.delete(`/plans/${planId}/`, {
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  // --- Subscriptions Section ---

  /**
   * Lists subscriptions for a specific store. Supports pagination and filtering.
   * @param {Object} params - Query parameters (e.g. { store_id: '...', status: 'ACTIVE' })
   */
  async listSubscriptions(params = {}) {
    const response = await backend.get('/subscriptions/', {
      params: params,
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  /**
   * Creates a new subscription. Note: usually called via Customer App / Public API with API key.
   * But we provide it here for completeness or merchant-side creation.
   * @param {Object} subscriptionData - Data for the subscription (plan_id, etc.)
   * @param {String} apiKey - Required if called from public context, otherwise uses auth.
   */
  async createSubscription(subscriptionData, apiKey = null) {
    const config = apiKey ? { apiKey } : { authorize: true, wallet: this.wallet }
    const response = await backend.post('/subscriptions/', subscriptionData, config)
    return response.data
  }

  /**
   * Retrieves full details of a specific subscription.
   * @param {String} subscriptionId - The UUID or Short ID of the subscription.
   */
  async getSubscription(subscriptionId) {
    const response = await backend.get(`/subscriptions/${subscriptionId}`, {
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  /**
   * Gets the parameters needed to cancel a subscription (cancel kit).
   * @param {String} subscriptionId - The UUID of the subscription.
   */
  async getSubscriptionCancelKit(subscriptionId, isMerchant = false) {
    const action = isMerchant ? 'merchant-cancel' : 'cancel'
    const response = await backend.get(`/subscriptions/${subscriptionId}/${action}`, {
      authorize: true, // Needs auth/ownership (merchant or customer wallet)
      wallet: this.wallet
    })
    return response.data
  }

  /**
   * Submits a signed transaction to cancel a subscription.
   * @param {String} subscriptionId - The UUID of the subscription.
   * @param {String} rawTx - The signed raw transaction hex.
   */
  async submitSubscriptionCancel(subscriptionId, rawTx, isMerchant = false) {
    const action = isMerchant ? 'merchant-cancel' : 'cancel'
    const response = await backend.post(`/subscriptions/${subscriptionId}/${action}`, {
      raw_tx_hex: rawTx
    }, {
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  /**
   * Reactivates a paused/cancelled subscription (if allowed).
   * @param {String} subscriptionId - The UUID of the subscription.
   */
  async reactivateSubscription(subscriptionId) {
    // Note: reactivate is not officially documented yet, but kept as placeholder
    const response = await backend.post(`/subscriptions/${subscriptionId}/reactivate`, {}, {
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }
}
