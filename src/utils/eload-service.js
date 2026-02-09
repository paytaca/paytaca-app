import axios from 'axios'
import crypto from 'crypto'
import { Store } from 'src/store'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'

export const backend = axios.create()
const baseURL = process.env.ELOAD_SERVICE_API || ''

const TOKEN_STORAGE_KEY = process.env.GBITS_AUTH_KEY || 'gbits-auth-key'

function getWalletHash () {
	return Store.getters['global/getWallet']('bch')?.walletHash
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

export async function fetchService () {
	try {
		const response = await backend.get(baseURL + '/service/')		

		return {
			success: true,
			data: response.data,
			error: null
		}
	} catch (error) {
		const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch service'
		console.error('[fetchService] Error:', errorMessage)

		return {
			success: false,
			data: null,
			error: `Network error: ${errorMessage}`
		}
	}
}



export async function fetchServiceGroup (data) {
	try {
		let params = {
			'service-id': data.service.id,
			limit: data.limit,
			page: data.page
		}

		const response = await backend.get(baseURL + '/service/group/', { params: params })

			return {
				success: true,
				data: response.data,
				error: null
			}
	} catch (error) {
		const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch service group'
		console.error('[fetchServiceGroup] Error:', errorMessage)

		return {
			success: false,
			data: null,
			error: `Network error: ${errorMessage}`
		}
	}
}


export async function fetchCategory (data) {
	try {
		let params = {
			'service-group-id': data.serviceGroup.id,
			limit: data.limit,
			page: data.page
		}

		const response = await backend.get(baseURL + '/category/', { params: params})

		return {
			success: true,
			data: response.data,
			error: null
		}
	} catch (error) {
		const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch category'
		console.error('[fetchCategory] Error:', errorMessage)

		return {
			success: false,
			data: null,
			error: `Network error: ${errorMessage}`
		}
	}
}


export async function fetchPromo (data) {
	try {
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

		const response = await backend.get(baseURL + "/promo/", { params: params })

		return {
			success: true,
			data: response.data,
			error: null
		}

	} catch (error) {
		const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch promos'
		console.error('[fetchPromo] Error:', errorMessage)

		return {
			success: false,
			data: null,
			error: `Network error: ${errorMessage}`
		}
	}
}

export async function fetchPromoDetails(pk) {
	try {
		const response = await backend.get(baseURL  +  '/promo/' + pk)

		return {
			success: true,
			data: response.data,
			error: null
		}
	} catch (error) {
		const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch promo details'
		console.error('[fetchPromoDetails] Error:', errorMessage)

		return {
			success: false,
			data: null,
			error: `Network error: ${errorMessage}`
		}
	}
}

export async function createOrder (data) {
	try {
		const walletHash = getWalletHash()
		if (!walletHash) {
			throw new Error('Wallet hash not available')
		}

		let token = await getAuthToken()
		if (!token) {
			// Best-effort: authenticate and retry token retrieval.
			await authUser()
			token = await getAuthToken()
		}
		if (!token) {
			throw new Error('Auth token not available')
		}

		const payload = {
			promo: data.promo,
			promo_snapshot: data.promo_snapshot,
			bch_amount: data.bch_amount,
			bch_price_quote: data.bch_price_quote
		}

		const response = await backend.post(buildTxnUrl(), payload, {
			// NOTE: avoid underscore header names (often blocked by proxies/CORS).
			// Use the same convention used elsewhere in the app (e.g. watchtower/ramp): `wallet-hash`.
			headers: {
				'wallet-hash': walletHash,
				Authorization: `Bearer ${token}`
			}
		})

		return {
			success: true,
			data: response.data,
			error: null
		}
	} catch (error) {
		const errorMessage = error.response?.data?.message || error.message || 'Failed to create txn'
		console.error('[createOrder] Error:', errorMessage)

		return {
			success: false,
			data: null,
			error: `Network error: ${errorMessage}`
		}
	}
}

// Fetching Order List
export async function fetchOrders (data) {
	try {		
		const walletHash = getWalletHash()
		if (!walletHash) {
			throw new Error('Wallet hash not available')
		}

		let token = await getAuthToken()
		if (!token) {
			// Best-effort: authenticate and retry token retrieval.
			await authUser()
			token = await getAuthToken()
		}
		if (!token) {
			throw new Error('Auth token not available')
		}

		let params = {
			limit: data.limit,
			page: data.page
		}

		// add filters
		params['sort-type'] = data.filters.sort_type

		if ('service' in data.filters) {
			let _params = new URLSearchParams(params)
			data.filters.service.forEach(s => _params.append("service", s));

			params = _params
		}	

		let headers = {
			'wallet-hash': walletHash,
			Authorization: `Bearer ${token}`
		}
		
		const response = await backend.get(baseURL + '/txn/', {
			params: params,		
			headers: headers
		})

		return {
			success: true,
			data: response.data,
			error: null
		}


	} catch (error) {
		// 403 - token expired
		if (error.response && error.response.status === 403) {
			await authUser()
			await fetchOrders(data)
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

// Fetching a Specific Order Details
export async function fetchOrderDetails (pk) {
	try {
		const walletHash = getWalletHash()
		if (!walletHash) {
			throw new Error('Wallet hash not available')
		}

		let token = await getAuthToken()
		if (!token) {
			// Best-effort: authenticate and retry token retrieval.
			await authUser()
			token = await getAuthToken()
		}
		if (!token) {
			throw new Error('Auth token not available')
		}

		let headers = {
			'wallet-hash': walletHash,
			Authorization: `Bearer ${token}`
		}

		const response = await backend.get(baseURL + '/txn/' + pk, { headers: headers })

		return {
			success: true,
			data: response.data,
			error: null
		}

	} catch (error) {
		// 403 - token expired
		if (error.response && error.response.status === 403) {
			await authUser()
			await fetchOrders(data)
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

export async function registerUser() {	
	const walletHash = getWalletHash()
	if (!walletHash) {
		console.error('[registerUser] Wallet hash not available')
		return false
	}

	try {
		const user = 'GBITS_' + walletHash
		const userHash = await generateUserHash(walletHash)

		const response = await backend.post(baseURL + '/register/', {},
			{
				headers: {
					'x-auth-wallethash': user,
					'x-auth-pass': userHash
				}
			})

		// After registration, authenticate
		return await authUser()
	} catch (error) {
		// 400 means user already exists, try to authenticate
		if (error.response && error.response.status === 400) {
			return await authUser()
		}
		
		console.error('[registerUser] Registration error:', error.message)
		return false
	}	
}

export async function authUser() {
	const walletHash = getWalletHash()
	if (!walletHash) {
		console.error('[authUser] Wallet hash not available')
		return false
	}

	try {
		const user = 'GBITS_' + walletHash
		const userHash = await generateUserHash(walletHash)

		const response = await backend.post(baseURL + '/auth/',
			{
				"username": user,
				"password": userHash
			}
		)

		if (response.data && response.data.access) {			
			const value = saveAuthToken(response.data.access)			
			return true
		}

	} catch (error) {
		// If auth fails, try to register the user
		if (error.response && (error.response.status === 401 || error.response.status === 404)) {
			try {
				await registerUser()
				return true
			} catch (registerError) {
				console.error('[authUser] Registration failed:', registerError)
				return false
			}
		}
		
		console.error('[authUser] Authentication error:', error.message)
		return false
	}
}

export async function saveAuthToken(value) {	
	const key = TOKEN_STORAGE_KEY

	return await SecureStoragePlugin.set({ key: key, value: value}).then(success => { return success.value })
}

export async function getAuthToken() { // adjust later
	try {
		const key = TOKEN_STORAGE_KEY

		const token = await SecureStoragePlugin.get({ key })
		return token.value
	} catch (error) {
		console.error(error)
		return false
	}
}

export async function generateUserHash (walletHash) {
 	const hashVal = 'GBITS_' + walletHash

 	sha256(hashVal)

 	return sha256(hashVal)
 }

 /**
 * @param {String} data
 * @returns {String}
 */
export function sha256 (data) {
  const _sha256 = crypto.createHash('sha256')
  _sha256.update(Buffer.from(data, 'utf8'))
  return _sha256.digest().toString('hex')
}