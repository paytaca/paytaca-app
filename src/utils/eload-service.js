import axios from 'axios'
import crypto from 'crypto'
import { Store } from 'src/store'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'

export const backend = axios.create()
const baseURL = process.env.ELOAD_SERVICE_API || ''
const walletHash = Store.getters['global/getWallet']('bch')?.walletHash

const TOKEN_STORAGE_KEY = 'gbits-auth-key'

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
			limit: data.limit,
			page: data.page,
			service: data.service,
			'service-group': data.serviceGroup,
		}

		if ('category' in data) {
			params['category'] = data.category
		}

		console.log('params: ', params)

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

export async function createOrder (data) {
	try {
		let data = {
			"promo_id": data.promoId,
			'address': data.address
		}

		const response = await backend.post(baseURL + '/txn/', data)

		return {
			success: true,
			data: response.data,
			error: null
		}
	} catch (error) {
		const errorMessage = error.response?.data?.message || error.message || 'Failed to create txn'
		console.error('[createOrder] Error:', errorMessage)
		console.log(error)

		return {
			success: false,
			data: null,
			error: `Network error: ${errorMessage}`
		}
	}
}

// Add Authentication Later
export async function registerUser() {	
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