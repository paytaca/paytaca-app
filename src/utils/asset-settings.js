import axios from 'axios'
import { Store } from 'src/store'
import crypto from 'crypto'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'

export const backend = axios.create()
const baseURL = Store.getters['global/isChipnet'] ? process.env.CHIPNET_WATCHTOWER_BASE_URL : process.env.MAINNET_WATCHTOWER_BASE_URL || ''
const walletHash = Store.getters['global/getWallet']('bch')?.walletHash

const TOKEN_STORAGE_KEY = 'asset-auth-key'

export async function fetchCustomList ()  {
	let customList = null

	await backend.get(baseURL + '/app-setting/custom-list/', { headers: { 'wallet-hash': walletHash } })
		.then(response => {			
			customList = response.data
			// console.log('response: ', customList)
		})
		.catch(error => {
			console.error(error.response)
			if (error.response) {
				if (error.response.status === 404) {
					customList = error.response.data
				}					
			}			
		})

		// console.log('memoData: ', memoData)
		return customList
}

export async function saveCustomList (list) {	
	const TOKEN_HEADER = 'Bearer ' + await getAuthToken()

	let customList = null
	const data = {
		custom_list: list
	}
	await backend.post(baseURL + '/app-setting/custom-list/', data, { headers: { 'wallet-hash': walletHash, 'Authorization': TOKEN_HEADER }})
		.then(response => {			
			customList = response.data
			// console.log(customList)
		})
		.catch(error => {
			console.error(error)
			if (error.response) {
				// if (error.response.status === 404) {
					customList = error.response.data
				// }
			}			
		})

		return customList

}

export async function fetchFavorites () {
	let favorites = null

	await backend.get(baseURL + '/app-setting/favorites/', { headers: { 'wallet-hash': walletHash } })
		.then(response => {			
			favorites = response.data
		})
		.catch(error => {
			console.error(error.response)
			if (error.response) {
				if (error.response.status === 404) {
					favorites = error.response.data
				}					
			}			
		})

		// console.log('memoData: ', memoData)
		return favorites
}

export async function saveFavorites (list) {
	const TOKEN_HEADER = 'Bearer ' + await getAuthToken()
	console.log('list: ', list)

	let favorites = null
	const data = {
		favorites: list
	}
	await backend.post(baseURL + '/app-setting/favorites/', data, { headers: { 'wallet-hash': walletHash, 'Authorization': TOKEN_HEADER }})
		.then(response => {			
			favorites = response.data
		})
		.catch(error => {
			console.error(error)
			if (error.response) {
				// if (error.response.status === 404) {
					favorites = error.response.data
				// }
			}			
		})

		return favorites
}

export async function fetchUnlistedTokens () {
	let unlisted_token = null

	await backend.get(baseURL + '/app-setting/unlisted-list/', { headers: { 'wallet-hash': walletHash } })
		.then(response => {			
			unlisted_token = response.data
		})
		.catch(error => {
			console.error(error.response)
			if (error.response) {
				if (error.response.status === 404) {
					unlisted_token = error.response.data
				}					
			}			
		})

		// console.log('memoData: ', memoData)
		return unlisted_token
}

export async function saveUnlistedTokens () {
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
				// if (error.response.status === 404) {
					unlisted_token = error.response.data
				// }
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

export async function registerUser () {	
	const user = 'ASSET_' + walletHash
	const assetHash = await generateAssetHash(walletHash)

	await backend.post(baseURL + '/app-setting/register/', {}, { headers: { 'x-auth-asset-wallethash': user, 'x-auth-asset-pass': assetHash}})
		.then(async (response) => {
			console.log('response: ', response)
			// memoData = response.data
			await authToken()
		})
		.catch(async (error) => {
			console.error(error.response)
			// memoData = error.response.data
			if (error.response) {				
				if (error.response.status === 400) {
					await authToken()
				}				
			}
		})	
}

export async function authToken () {
	const user = 'ASSET_' + walletHash
	const assetHash = await generateAssetHash(walletHash)

	await backend.post(baseURL + '/app-setting/auth/', { 'username': user, 'password': assetHash })
		.then(async (response) => {			
			// memoData = response.data
			await saveAuthToken(response.data.access)
		})
		.catch(error => {
			console.error(error.response.data)

			// memoData = error.response.data
		})
}

export async function generateAssetHash (wallethash) {
 	const hashVal = 'ASSET_' + walletHash

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

export function saveAuthToken (value) {
	SecureStoragePlugin.set({TOKEN_STORAGE_KEY, value}).then(success => { return success.value })
}

export function getAuthToken () {
	return new Promise((resolve, reject) => {
		SecureStoragePlugin.get({ TOKEN_STORAGE_KEY })
			.then(token => {
				console.log('token: ', token)
				resolve(token.value)
			})
			.catch(error => {
				console.error('Item with specified key does not exist:', error)
        		resolve(null)	
			})
	})
}

export function deleteAuthToken () {
	SecureStoragePlugin.remove({ TOKEN_STORAGE_KEY })
	console.log('Asset auth token deleted')
}
