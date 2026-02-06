import axios from 'axios'
import { Store } from 'src/store'
import crypto from 'crypto'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { getCurrentWalletStorageKey, getWalletStorageKey, getWalletHash } from 'src/utils/wallet-storage'

export const backend = axios.create()
const baseURL = Store.getters['global/isChipnet'] ? process.env.CHIPNET_WATCHTOWER_BASE_URL : process.env.MAINNET_WATCHTOWER_BASE_URL || ''

const TOKEN_STORAGE_KEY_PREFIX = 'asset-auth-key'

// Request cache to prevent duplicate simultaneous requests
const requestCache = new Map()
const CACHE_DURATION = 5000 // 5 seconds

/**
 * Get current wallet hash dynamically
 * @returns {string|null} Current wallet hash or null if not available
 */
function getCurrentWalletHash() {
  return Store.getters['global/getWallet']('bch')?.walletHash
}

/**
 * Get current wallet hash for a given wallet type
 * @param {'bch'|'slp'|'sbch'} walletType
 * @returns {string|null}
 */
function getCurrentWalletHashByType(walletType = 'bch') {
  try {
    return Store.getters['global/getWallet'](walletType)?.walletHash
  } catch (e) {
    return null
  }
}

/**
 * Get cache key for a request
 * @param {string} endpoint - API endpoint
 * @param {string} walletHash - Wallet hash
 * @returns {string} Cache key
 */
function getCacheKey(endpoint, walletHash) {
  return `${endpoint}:${walletHash}`
}

/**
 * Get cached request if available and not expired
 * @param {string} cacheKey - Cache key
 * @returns {Promise|null} Cached promise or null
 */
function getCachedRequest(cacheKey) {
  const cached = requestCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.promise
  }
  return null
}

/**
 * Cache a request promise
 * @param {string} cacheKey - Cache key
 * @param {Promise} promise - Request promise
 */
function setCachedRequest(cacheKey, promise) {
  requestCache.set(cacheKey, {
    promise,
    timestamp: Date.now()
  })
  // Clean up after promise resolves
  promise.finally(() => {
    setTimeout(() => requestCache.delete(cacheKey), CACHE_DURATION)
  })
}

/**
 * Get wallet-specific storage key for asset auth token
 * @param {string} walletHash - Optional wallet hash, if not provided uses current wallet
 * @returns {string} Storage key with wallet hash
 */
function getTokenStorageKey(walletHash = null) {
  if (walletHash) {
    return getWalletStorageKey(TOKEN_STORAGE_KEY_PREFIX, walletHash)
  }
  return getCurrentWalletStorageKey(TOKEN_STORAGE_KEY_PREFIX)
}

export async function fetchCustomList ()  {
	const walletHash = getCurrentWalletHash()
	if (!walletHash) {
		console.warn('No wallet hash available for fetchCustomList')
		return null
	}

	const cacheKey = getCacheKey('custom-list', walletHash)
	const cached = getCachedRequest(cacheKey)
	if (cached) {
		return cached
	}

	const promise = (async () => {
		let customList = null
		await backend.get(baseURL + '/app-setting/custom-list/', { headers: { 'wallet-hash': walletHash } })
			.then(response => {			
				customList = response.data
			})
			.catch(error => {
				// Only log non-404 errors (404 is expected when data doesn't exist yet)
				if (error.response?.status !== 404) {
					console.error(error.response)
				}
				if (error.response) {
					if (error.response.status === 404) {
						customList = ['error']
					}					
				}			
			})
		return customList
	})()

	setCachedRequest(cacheKey, promise)
	return promise
}

export async function saveCustomList (list) {	
	const walletHash = getCurrentWalletHash()
	if (!walletHash) {
		console.warn('No wallet hash available for saveCustomList')
		return null
	}

	const TOKEN_HEADER = 'Bearer ' + await getAuthToken()

	let customList = null
	const data = {
		custom_list: list
	}
	await backend.post(baseURL + '/app-setting/custom-list/', data, { headers: { 'wallet-hash': walletHash, 'Authorization': TOKEN_HEADER }})
		.then(response => {			
			customList = response.data
		})
		.catch(error => {
			console.error(error)
			if (error.response) {
				customList = error.response.data
			}			
		})

	return customList
}

export async function addNewAsset (asset, network) {
	// fetch custom list
	let custom_list = await fetchCustomList() 
	let favorites = await fetchFavorites()

	// set asset
	custom_list[network].unshift(asset.id)
	favorites.unshift({id: asset.id, favorite: 1})
	
	// save to server
	await saveCustomList(custom_list)
	await saveFavorites(favorites)	


}

export async function fetchFavorites (options = {}) {
	const { forceRefresh = false, walletHash: walletHashOverride, walletType } = options
	const walletHash =
		walletHashOverride ||
		(walletType ? getCurrentWalletHashByType(walletType) : null) ||
		getCurrentWalletHash()
	if (!walletHash) {
		console.warn('No wallet hash available for fetchFavorites')
		return null
	}

	const cacheKey = getCacheKey('favorites', walletHash)
	// Allow callers (e.g. limit checks) to bypass the 5s cache
	if (!forceRefresh) {
		const cached = getCachedRequest(cacheKey)
		if (cached) {
			return cached
		}
	} else {
		requestCache.delete(cacheKey)
	}

	const promise = (async () => {
		let favorites = null
		await backend.get(baseURL + '/app-setting/favorites/', {
			headers: { 'wallet-hash': walletHash }
		})
			.then(response => {			
				favorites = response.data
			})
			.catch(error => {
				// Only log non-404 errors (404 is expected when data doesn't exist yet)
				if (error.response?.status !== 404) {
					console.error(error.response)
				}
				if (error.response) {
					if (error.response.status === 404) {
						favorites = error.response.data
					}					
				}			
			})
		return favorites
	})()

	setCachedRequest(cacheKey, promise)
	return promise
}

export async function saveFavorites (list, options = {}) {
	const { walletHash: walletHashOverride, walletType } = options
	const walletHash =
		walletHashOverride ||
		(walletType ? getCurrentWalletHashByType(walletType) : null) ||
		getCurrentWalletHash()
	if (!walletHash) {
		console.warn('No wallet hash available for saveFavorites')
		return null
	}
	// Invalidate favorites cache so subsequent reads are consistent
	requestCache.delete(getCacheKey('favorites', walletHash))

	const TOKEN_HEADER = 'Bearer ' + await getAuthToken(walletHash)

	let favorites = null
	const data = {
		favorites: list
	}
	await backend.post(baseURL + '/app-setting/favorites/', data, {
		headers: { 'wallet-hash': walletHash, 'Authorization': TOKEN_HEADER }
	})
		.then(response => {			
			favorites = response.data
		})
		.catch(error => {
			console.error(error)
			if (error.response) {
				favorites = error.response.data
			}			
		})

	return favorites
}

export async function fetchUnlistedTokens () {
	const walletHash = getCurrentWalletHash()
	if (!walletHash) {
		console.warn('No wallet hash available for fetchUnlistedTokens')
		return null
	}

	const cacheKey = getCacheKey('unlisted-list', walletHash)
	const cached = getCachedRequest(cacheKey)
	if (cached) {
		return cached
	}

	const promise = (async () => {
		let unlisted_token = null
		await backend.get(baseURL + '/app-setting/unlisted-list/', { headers: { 'wallet-hash': walletHash } })
			.then(response => {			
				unlisted_token = response.data
			})
			.catch(error => {
				// Only log non-404 errors (404 is expected when data doesn't exist yet)
				if (error.response?.status !== 404) {
					console.error(error.response)
				}
				if (error.response) {
					if (error.response.status === 404) {
						unlisted_token = error.response.data
					}					
				}			
			})
		return unlisted_token
	})()

	setCachedRequest(cacheKey, promise)
	return promise
}

export async function saveUnlistedTokens (list) {
	const walletHash = getCurrentWalletHash()
	if (!walletHash) {
		console.warn('No wallet hash available for saveUnlistedTokens')
		return null
	}

	const TOKEN_HEADER = 'Bearer ' + await getAuthToken()

	let unlisted_token = null
	const data = {
		unlisted_list: list
	}
	await backend.post(baseURL + '/app-setting/unlisted-list/', data, { headers: { 'wallet-hash': walletHash, 'Authorization': TOKEN_HEADER }})
		.then(response => {			
			unlisted_token = response.data
		})
		.catch(error => {
			console.error(error)
			if (error.response) {
				unlisted_token = error.response.data
			}			
		})

	return unlisted_token
}

export async function initializeCustomList (bch = [], sbch = []) {
	// console.log('initialize custom list')
	const data = {
		BCH: bch,
		sBCH: sbch 
	}

	saveCustomList(data) 

}

export async function initializeFavorites (list) {
	const len = list.length > 10 ? 10 : list.length

	let data = list.map(asset => ({ id: asset.id, favorite: 0 }))

	for (let i = 0; i < len; i++) {
		data[i].favorite = 1
	}
	saveFavorites(data)


}

export async function registerUser () {	
	const walletHash = getCurrentWalletHash()
	if (!walletHash) {
		console.warn('No wallet hash available for registerUser')
		return
	}

	const user = 'ASSET_' + walletHash
	const assetHash = await generateAssetHash(walletHash)

	await backend.post(baseURL + '/app-setting/register/', {}, { headers: { 'x-auth-asset-wallethash': user, 'x-auth-asset-pass': assetHash}})
		.then(async (response) => {
			await authToken()
		})
		.catch(async (error) => {
			// Only log non-404 errors
			if (error.response?.status !== 404) {
				console.error(error.response)
			}
			if (error.response) {				
				if (error.response.status === 400) {
					await authToken()
				}				
			}
		})	
}

export async function authToken () {
	const walletHash = getCurrentWalletHash()
	if (!walletHash) {
		console.warn('No wallet hash available for authToken')
		return
	}

	const user = 'ASSET_' + walletHash
	const assetHash = await generateAssetHash(walletHash)

	await backend.post(baseURL + '/app-setting/auth/', { 'username': user, 'password': assetHash })
		.then(async (response) => {			
			await saveAuthToken(response.data.access)
		})
		.catch(error => {
			// Only log non-404 errors
			if (error.response?.status !== 404) {
				console.error(error)
			}
			registerUser()
		})
}

/**
 * Authenticate for a specific wallet hash (used when endpoints require non-BCH wallet-hash header).
 * @param {Object} options
 * @param {string} options.walletHash
 */
export async function authTokenForWallet ({ walletHash }) {
	if (!walletHash) {
		console.warn('No wallet hash available for authTokenForWallet')
		return
	}

	const user = 'ASSET_' + walletHash
	const assetHash = await generateAssetHash(walletHash)

	await backend.post(baseURL + '/app-setting/auth/', { 'username': user, 'password': assetHash })
		.then(async (response) => {
			await saveAuthToken(response.data.access, walletHash)
		})
		.catch(error => {
			// Only log non-404 errors
			if (error.response?.status !== 404) {
				console.error(error)
			}
			registerUserForWallet({ walletHash })
		})
}

/**
 * Register a specific wallet hash for app-setting auth.
 * @param {Object} options
 * @param {string} options.walletHash
 */
export async function registerUserForWallet ({ walletHash }) {
	if (!walletHash) {
		console.warn('No wallet hash available for registerUserForWallet')
		return
	}

	const user = 'ASSET_' + walletHash
	const assetHash = await generateAssetHash(walletHash)

	await backend.post(baseURL + '/app-setting/register/', {}, { headers: { 'x-auth-asset-wallethash': user, 'x-auth-asset-pass': assetHash }})
		.then(async () => {
			await authTokenForWallet({ walletHash })
		})
		.catch(async (error) => {
			// Only log non-404 errors
			if (error.response?.status !== 404) {
				console.error(error.response)
			}
			if (error.response) {
				if (error.response.status === 400) {
					await authTokenForWallet({ walletHash })
				}
			}
		})
}

export async function generateAssetHash (wallethash) {
 	const hashVal = 'ASSET_' + wallethash

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

export function saveAuthToken (value, walletHash = null) {
	const key = getTokenStorageKey(walletHash)
	return SecureStoragePlugin.set({ key, value }).then(success => { return success.value })
}

export function getAuthToken (walletHash = null) {
	return new Promise(async (resolve, reject) => {
		try {
			const key = getTokenStorageKey(walletHash)
			SecureStoragePlugin.get({ key })
				.then(token => {
					resolve(token.value)
				})
				.catch(async error => {
					// Fallback: try old global key for backward compatibility with existing users
					try {
						const oldToken = await SecureStoragePlugin.get({ key: TOKEN_STORAGE_KEY_PREFIX })
						// If found, trigger migration (async, non-blocking)
						// Get walletHash from parameter or from store
						const targetWalletHash = walletHash || getWalletHash()
						if (oldToken?.value && targetWalletHash) {
							const newKey = getTokenStorageKey(targetWalletHash)
							SecureStoragePlugin.set({ key: newKey, value: oldToken.value })
								.catch(e => console.warn('Failed to migrate asset token:', e))
						}
						resolve(oldToken.value)
					} catch (e) {
						// No token found in either location
						resolve(null)
					}
				})
		} catch (error) {
			resolve(null)
		}
	})
}

export function deleteAuthToken (walletHash = null) {
	const key = getTokenStorageKey(walletHash)
	SecureStoragePlugin.remove({ key })
	console.log('Asset auth token deleted for wallet:', walletHash || 'current')
}

/**
 * Delete authentication token for a specific wallet hash
 * @param {string} walletHash - The wallet hash to delete token for
 */
export function deleteAuthTokenForWallet(walletHash) {
	if (walletHash) {
		const key = getTokenStorageKey(walletHash)
		SecureStoragePlugin.remove({ key })
		console.log('Asset auth token deleted for wallet:', walletHash)
	}
}
