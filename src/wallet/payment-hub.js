import axios from 'axios'
import { Store } from 'src/store'
import { BitcoinCashOAuthClient } from 'bitcoincash-oauth-client'
import {
  binToHex,
  deriveHdPath,
  deriveHdPrivateNodeFromSeed,
  deriveHdPublicNode,
  encodePrivateKeyWif,
} from "@bitauth/libauth"
import { mnemonicToSeedSync } from 'bip39'
import { getMnemonicByHash } from 'src/wallet'
import { pubkeyToAddress } from 'src/utils/crypto'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import packageInfo from '../../package.json'

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

  async listStores() {
    const response = await backend.get('/stores/', {
      params: { wallet_hash: this.wallet.BCH.walletHash },
      authorize: true,
      wallet: this.wallet
    })
    return response.data.results || response.data
  }

  async createStore(name, walletId) {
    const response = await backend.post('/stores/', {
      name: name,
      wallet_id: walletId
    }, {
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  async renameStore(storeId, newName) {
    const response = await backend.patch(`/stores/${storeId}/`, {
      name: newName
    }, {
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  async generateStoreAddress(storeId, apiKey) {
    const response = await backend.get(`/stores/${storeId}/generate-address`, {
      apiKey: apiKey
    })
    return response.data
  }

  // --- API Keys Section ---

  async listApiKeys(storeId) {
    const response = await backend.get('/keys/', {
      params: { store_id: storeId },
      authorize: true,
      wallet: this.wallet
    })
    return response.data.results || response.data
  }

  async generateApiKey(storeId, keyName) {
    const response = await backend.post('/keys/', {
      store_id: storeId,
      name: keyName
    }, {
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }

  async revokeApiKey(keyId) {
    const response = await backend.patch(`/keys/${keyId}/revoke/`, {}, {
      authorize: true,
      wallet: this.wallet
    })
    return response.data
  }
}
