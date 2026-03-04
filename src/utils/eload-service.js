import axios from 'axios'
import { Store } from 'src/store'
import { BitcoinCashOAuthClient } from 'bitcoincash-oauth-client'
import {
  binToHex,
  deriveHdPath,
  deriveHdPrivateNodeFromSeed,
  deriveHdPublicNode,
  encodePrivateKeyWif,
  sha256,
} from "@bitauth/libauth"
import { mnemonicToSeedSync } from 'bip39'
import { getMnemonicByHash } from 'src/wallet'
import { pubkeyToAddress } from 'src/utils/crypto'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'

export const backend = axios.create()
const baseURL = process.env.ELOAD_SERVICE_API || ''

const MAX_AUTH_RETRIES = 1
const OAUTH_TOKEN_KEY = 'eload-oauth-token'
const OAUTH_ADDRESS_PATH = "0/0" // Address path for OAuth authentication
const BCH_DERIVATION_PATH = "m/44'/145'/0'" // Standard BCH derivation path

function getWalletHash () {
	return Store.getters['global/getWallet']('bch')?.walletHash
}

/**
 * Extract domain from baseURL for OAuth message signing
 * e.g., "https://gbits.paytaca.com/api" -> "gbits.paytaca.com"
 */
function getOAuthDomain() {
	if (!baseURL) return 'localhost'
	try {
		const url = new URL(baseURL)
		return url.hostname
	} catch (e) {
		// Fallback: extract hostname from string
		const match = baseURL.match(/https?:\/\/([^\/]+)/)
		return match ? match[1] : 'localhost'
	}
}

function buildTxnUrl () {
	const trimmed = String(baseURL || '').replace(/\/+$/, '')
	if (!trimmed) return '/api/txn/'
	// Support both configurations:
	// - baseURL = https://server            -> POST https://server/api/txn/
	// - baseURL = https://server/api        -> POST https://server/api/txn/
	if (trimmed.endsWith('/api')) return `${trimmed}/txn/`
	return `${trimmed}/api/txn/`
}

/**
 * Derive OAuth credentials from wallet mnemonic
 * Derives the key at path m/44'/145'/0'/0/0
 * Does NOT store the private key - derives it fresh each time
 */
async function deriveOAuthCredentials() {
	const walletHash = getWalletHash()
	if (!walletHash) {
		throw new Error('Wallet hash not available')
	}

	// Get mnemonic for this wallet
	const mnemonic = await getMnemonicByHash(walletHash)
	if (!mnemonic) {
		throw new Error('Mnemonic not available for wallet')
	}

	try {
		// Derive the HD node from mnemonic seed
		const mnemonicBin = new Uint8Array(mnemonicToSeedSync(mnemonic))
		const rootNode = deriveHdPrivateNodeFromSeed(mnemonicBin)

		// Derive directly to address level: m/44'/145'/0'/0/0
		const fullPath = `${BCH_DERIVATION_PATH}/${OAUTH_ADDRESS_PATH}`
		const addressNode = deriveHdPath(rootNode, fullPath)
		if (typeof addressNode === 'string') {
			throw new Error(`Failed to derive address node: ${addressNode}`)
		}

		// Get private key in WIF format for OAuth client
		const privateKeyWif = encodePrivateKeyWif(addressNode.privateKey, 'mainnet')

		// Get public key
		const publicNode = deriveHdPublicNode(addressNode)
		const publicKey = binToHex(publicNode.publicKey)

		// Get address
		const address = pubkeyToAddress(publicKey, false) // false = mainnet

		return {
			privateKey: privateKeyWif,
			publicKey: publicKey,
			address: address,
			walletHash: walletHash
		}
	} catch (error) {
		console.error('[OAuth] Failed to derive credentials:', error)
		throw new Error(`Failed to derive OAuth credentials: ${error.message}`)
	}
}

/**
 * Custom fetch implementation using axios to avoid Window.fetch issues in Capacitor
 * This provides a fetch-compatible interface for the bitcoincash-oauth-client
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
 * Get stored OAuth token from secure storage
 * @returns {Promise<string|null>} The stored token or null
 */
async function getStoredToken() {
	try {
		const result = await SecureStoragePlugin.get({ key: OAUTH_TOKEN_KEY })
		return result.value
	} catch (error) {
		return null
	}
}

/**
 * Save OAuth token to secure storage
 * @param {string} token - The access token to save
 */
async function saveToken(token) {
	try {
		await SecureStoragePlugin.set({ key: OAUTH_TOKEN_KEY, value: token })
		console.log('[OAuth] Token saved to secure storage')
	} catch (error) {
		console.error('[OAuth] Failed to save token:', error)
	}
}

/**
 * Clear stored OAuth token
 */
async function clearToken() {
	try {
		await SecureStoragePlugin.remove({ key: OAUTH_TOKEN_KEY })
		console.log('[OAuth] Token cleared from secure storage')
	} catch (error) {
		// Token might not exist, that's OK
	}
}

/**
 * Get authentication headers for API requests
 * Uses BitcoinCashOAuthClient for authentication with dynamically derived keys
 * Reuses existing token if available, otherwise authenticates and saves new token
 */
async function getAuthHeaders() {
	const walletHash = getWalletHash()
	if (!walletHash) {
		throw new Error('Wallet hash not available')
	}

	// Check if we have a stored token
	const storedToken = await getStoredToken()
	if (storedToken) {
		console.log('[OAuth] Using stored token')
		return {
			'Authorization': `Bearer ${storedToken}`
		}
	}

	// No stored token, need to authenticate
	console.log('[OAuth] No stored token, authenticating...')
	const credentials = await deriveOAuthCredentials()

	// Create OAuth client (no secureStorage needed since we derive keys on-demand)
	// Use custom axios-based fetch to avoid Window.fetch issues in Capacitor WebView
	const client = new BitcoinCashOAuthClient({
		serverUrl: baseURL,
		network: 'mainnet',
		fetch: axiosFetch
		// No secureStorage - we handle key derivation ourselves
	})

	// Re-derive to get raw private key bytes
	const mnemonic = await getMnemonicByHash(walletHash)
	const mnemonicBin = new Uint8Array(mnemonicToSeedSync(mnemonic))
	const rootNode = deriveHdPrivateNodeFromSeed(mnemonicBin)
	const fullPath = `${BCH_DERIVATION_PATH}/${OAUTH_ADDRESS_PATH}`
	const addressNode = deriveHdPath(rootNode, fullPath)

	// Convert private key to hex format expected by OAuth client
	const privateKeyHex = binToHex(addressNode.privateKey)

	// Get domain for message signing
	const domain = getOAuthDomain()

	// Create auth message and sign it manually (to include domain in payload)
	const timestamp = Math.floor(Date.now() / 1000)
	const message = client.createAuthMessage(walletHash, timestamp, domain)
	console.log('[OAuth] Message to sign:', message)

	const signature = await client.signAuthMessage(message, privateKeyHex)
	console.log('[OAuth] Signature:', signature)

	// Try to authenticate first (optimistic - assumes user is already registered)
	let authResponse = await axiosFetch(`${baseURL}/auth/token`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			user_id: walletHash,
			timestamp: timestamp,
			domain: domain,
			public_key: credentials.publicKey,
			signature: signature
		})
	})

	// If authentication fails with 404 (user not found), register first then retry
	if (authResponse.status === 404) {
		console.log('[OAuth] User not found, registering...')
		
		try {
			await client.register(credentials.address, walletHash)
			console.log('[OAuth] User registered successfully')
		} catch (regError) {
			console.error('[OAuth] Registration failed:', regError.message)
			throw new Error(`Registration failed: ${regError.message}`)
		}

		// Retry authentication with a fresh timestamp
		console.log('[OAuth] Retrying authentication after registration...')
		const newTimestamp = Math.floor(Date.now() / 1000)
		const newMessage = client.createAuthMessage(walletHash, newTimestamp, domain)
		const newSignature = await client.signAuthMessage(newMessage, privateKeyHex)

		authResponse = await axiosFetch(`${baseURL}/auth/token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				user_id: walletHash,
				timestamp: newTimestamp,
				domain: domain,
				public_key: credentials.publicKey,
				signature: newSignature
			})
		})
	}

	if (!authResponse.ok) {
		const errorText = await authResponse.text()
		throw new Error(`Authentication failed: ${authResponse.status} ${authResponse.statusText} - ${errorText}`)
	}

	const auth = await authResponse.json()
	console.log('[OAuth] Authentication successful')

	// Save the token for future use
	if (auth.access_token) {
		await saveToken(auth.access_token)
	}

	return {
		'Authorization': `Bearer ${auth.access_token}`
	}
}

export async function fetchService () {
	for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
		try {
			const headers = await getAuthHeaders()
			const response = await backend.get(baseURL + '/service/', { headers })

			return {
				success: true,
				data: response.data,
				error: null
			}
		} catch (error) {
			// 401/403 - token expired or invalid; clear and retry
			if ((error.response?.status === 403 || error.response?.status === 401) && attempt < MAX_AUTH_RETRIES) {
				console.log('[OAuth] Token invalid, clearing and retrying...')
				await clearToken()
				continue
			}

			const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch service'
			console.error('[fetchService] Error:', errorMessage)

			return {
				success: false,
				data: null,
				error: `Network error: ${errorMessage}`
			}
		}
	}
	return { success: false, data: null, error: 'Failed to fetch service' }
}

export async function fetchServiceGroup (data) {
	for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
		try {
			const headers = await getAuthHeaders()
			let params = {
				'service-id': data.service.id,
				limit: data.limit,
				page: data.page
			}

			const response = await backend.get(baseURL + '/service/group/', { params: params, headers: headers })

			return {
				success: true,
				data: response.data,
				error: null
			}
		} catch (error) {
			// 401/403 - token expired or invalid; clear and retry
			if ((error.response?.status === 403 || error.response?.status === 401) && attempt < MAX_AUTH_RETRIES) {
				console.log('[OAuth] Token invalid, clearing and retrying...')
				await clearToken()
				continue
			}

			const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch service group'
			console.error('[fetchServiceGroup] Error:', errorMessage)

			return {
				success: false,
				data: null,
				error: `Network error: ${errorMessage}`
			}
		}
	}
	return { success: false, data: null, error: 'Failed to fetch service group' }
}

export async function fetchCategory (data) {
	const serviceGroupId = data?.serviceGroup?.id
	if (!serviceGroupId) {
		return {
			success: false,
			data: null,
			error: 'Missing service group id'
		}
	}

	for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
		try {
			const headers = await getAuthHeaders()
			let params = {
				'service-group-id': serviceGroupId,
				limit: data.limit,
				page: data.page
			}

			const response = await backend.get(baseURL + '/category/', { params: params, headers: headers })

			return {
				success: true,
				data: response.data,
				error: null
			}
		} catch (error) {
			// 401/403 - token expired or invalid; clear and retry
			if ((error.response?.status === 403 || error.response?.status === 401) && attempt < MAX_AUTH_RETRIES) {
				console.log('[OAuth] Token invalid, clearing and retrying...')
				await clearToken()
				continue
			}

			const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch category'
			console.error('[fetchCategory] Error:', errorMessage)

			return {
				success: false,
				data: null,
				error: `Network error: ${errorMessage}`
			}
		}
	}
	return { success: false, data: null, error: 'Failed to fetch category' }
}

export async function fetchPromo (data) {
	for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
		try {
			const headers = await getAuthHeaders()
			let params = {
				limit: data.limit || 10,
				page: data.page || 1,
			}

			if ('service' in data) {
				params['service'] = data.service
			}

			if ('serviceGroup' in data) {
				params['service-group'] = data.serviceGroup
			}

			if ('category' in data) {
				params['category'] = data.category
			}

			if ('promoName' in data) {
				params['promo-name'] = data.promoName
			}

			const response = await backend.get(baseURL + "/promo/", { params: params, headers: headers })

			return {
				success: true,
				data: response.data,
				error: null
			}

		} catch (error) {
			// 401/403 - token expired or invalid; clear and retry
			if ((error.response?.status === 403 || error.response?.status === 401) && attempt < MAX_AUTH_RETRIES) {
				console.log('[OAuth] Token invalid, clearing and retrying...')
				await clearToken()
				continue
			}

			const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch promos'
			console.error('[fetchPromo] Error:', errorMessage)

			return {
				success: false,
				data: null,
				error: `Network error: ${errorMessage}`
			}
		}
	}
	return { success: false, data: null, error: 'Failed to fetch promos' }
}

export async function fetchPromoDetails(pk) {
	for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
		try {
			const headers = await getAuthHeaders()
			const response = await backend.get(baseURL  +  '/promo/' + pk, { headers })

			return {
				success: true,
				data: response.data,
				error: null
			}
		} catch (error) {
			// 401/403 - token expired or invalid; clear and retry
			if ((error.response?.status === 403 || error.response?.status === 401) && attempt < MAX_AUTH_RETRIES) {
				console.log('[OAuth] Token invalid, clearing and retrying...')
				await clearToken()
				continue
			}

			const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch promo details'
			console.error('[fetchPromoDetails] Error:', errorMessage)

			return {
				success: false,
				data: null,
				error: `Network error: ${errorMessage}`
			}
		}
	}
	return { success: false, data: null, error: 'Failed to fetch promo details' }
}

export async function createOrder (data) {
	const walletHash = getWalletHash()
	if (!walletHash) {
		return { success: false, data: null, error: 'Wallet hash not available' }
	}

	for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
		try {
			const headers = await getAuthHeaders()

			// Get address
			const credentials = await deriveOAuthCredentials()
			const address = credentials.address
			console.log('address: ', address)


			const payload = {
				promo: data.promo,
				promo_snapshot: data.promo_snapshot,
				bch_amount: data.bch_amount,
				bch_price_quote: data.bch_price_quote,
				refund_address: address
			}

			const response = await backend.post(buildTxnUrl(), payload, {
				headers: headers
			})

			return {
				success: true,
				data: response.data,
				error: null
			}
		} catch (error) {
			// 401/403 - token expired or server rejecting token; retry only a bounded number of times
			if ((error.response?.status === 403 || error.response?.status === 401) && attempt < MAX_AUTH_RETRIES) {
				// Clear stored token and retry with fresh authentication
				console.log('[OAuth] Token expired or invalid, clearing and retrying...')
				await clearToken()
				continue
			}

			const errorMessage = error.response?.data?.message || error.message || 'Failed to create txn'
			console.error('[createOrder] Error:', errorMessage)

			return {
				success: false,
				data: null,
				error: `Network error: ${errorMessage}`
			}
		}
	}

	// Should be unreachable due to return in catch, but keep a safe fallback.
	return { success: false, data: null, error: 'Failed to create txn' }
}

// Fetching Order List
export async function fetchOrders (data) {
	const walletHash = getWalletHash()
	if (!walletHash) {
		return { success: false, data: null, error: 'Wallet hash not available' }
	}

	for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
		try {
			const headers = await getAuthHeaders()

			let params = {
				limit: data.limit,
				page: data.page
			}

			// add filters
			params['sort-type'] = data.filters.sort_type

			if ('service' in data.filters) {
				const _params = new URLSearchParams(params)
				data.filters.service.forEach(s => _params.append('service', s))
				params = _params
			}

			if ('status' in data.filters) {
				const _params = new URLSearchParams(params)

				data.filters.status.forEach(s => _params.append('status', s))
				params = _params
			}

			const response = await backend.get(buildTxnUrl(), {
				params: params,
				headers: headers
			})

			return {
				success: true,
				data: response.data,
				error: null
			}
		} catch (error) {
			// 401/403 - token expired or server rejecting token; retry only a bounded number of times
			if ((error.response?.status === 403 || error.response?.status === 401) && attempt < MAX_AUTH_RETRIES) {
				// Clear stored token and retry with fresh authentication
				console.log('[OAuth] Token expired or invalid, clearing and retrying...')
				await clearToken()
				continue
			}

			const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch txn'
			console.error('[fetchOrders] Error:', errorMessage)

			return {
				success: false,
				data: null,
				error: `Network error: ${errorMessage}`
			}
		}
	}

	// Should be unreachable due to return in catch, but keep a safe fallback.
	return { success: false, data: null, error: 'Failed to fetch txn' }
}

// Fetching a Specific Order Details
export async function fetchOrderDetails (pk) {
	const walletHash = getWalletHash()
	if (!walletHash) {
		return { success: false, data: null, error: 'Wallet hash not available' }
	}

	for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
		try {
			const headers = await getAuthHeaders()

			const response = await backend.get(buildTxnUrl() + pk, { headers: headers })

			return {
				success: true,
				data: response.data,
				error: null
			}
		} catch (error) {
			// 401/403 - token expired or server rejecting token; retry only a bounded number of times
			if ((error.response?.status === 403 || error.response?.status === 401) && attempt < MAX_AUTH_RETRIES) {
				// Clear stored token and retry with fresh authentication
				console.log('[OAuth] Token expired or invalid, clearing and retrying...')
				await clearToken()
				continue
			}

			const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch txn details'
			console.error('[fetchOrderDetails] Error:', errorMessage)

			return {
				success: false,
				data: null,
				error: `Network error: ${errorMessage}`
			}
		}
	}

	// Should be unreachable due to return in catch, but keep a safe fallback.
	return { success: false, data: null, error: 'Failed to fetch txn details' }
}

/**
 * Legacy auth functions - kept for backward compatibility
 * These now use the OAuth client internally
 */
export async function authUser () {
	try {
		await getAuthHeaders()
		console.log('[OAuth] User authenticated successfully')
		return true
	} catch (error) {
		console.error('[authUser] Authentication error:', error.message)
		return false
	}
}

export async function registerUser () {
	// Registration is now handled automatically by getAuthHeaders
	return await authUser()
}

export async function saveAuthToken(value) {
	// Token management is now handled by BitcoinCashOAuthClient
	// This function is kept for backward compatibility
	console.log('[OAuth] saveAuthToken is deprecated, tokens managed by BitcoinCashOAuthClient')
	return true
}

export async function getAuthToken() {
	// Token retrieval is now handled internally by BitcoinCashOAuthClient
	// This function is kept for backward compatibility
	console.log('[OAuth] getAuthToken is deprecated, tokens managed by BitcoinCashOAuthClient')
	return null
}

export async function generateUserHash (walletHash) {
	// Deprecated: No longer needed with bitcoincash-oauth
	console.log('[OAuth] generateUserHash is deprecated, using BitcoinCashOAuthClient')
	return null
}