import axios from 'axios'

export const backend = axios.create()
const baseURL = Store.getters['global/isChipnet'] ? process.env.CHIPNET_WATCHTOWER_BASE_URL : process.env.MAINNET_WATCHTOWER_BASE_URL || ''
const walletHash = Store.getters['global/getWallet']('bch')?.walletHash

export async function fetchCustomList ()  {
	let customList = null

	await backend.get(baseURL + '/app-setting/custom-list/', { headers: { 'wallet-hash': walletHash } })
		.then(response => {			
			customList = response.data
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
	let customList = null
	const data = {
		custom_list: list
	}
	await backend.post(baseURL + '/app-setting/custom-list/', data, { headers: { 'wallet-hash': walletHash }})
		.then(response => {			
			customList = response.data
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

export async function fetchFavortites () {
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
	let favorites = null
	const data = {
		favorites: list
	}
	await backend.post(baseURL + '/app-setting/favorites/', data, { headers: { 'wallet-hash': walletHash }})
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
	let unlisted_token = null
	const data = {
		unlisted_list: list
	}
	await backend.post(baseURL + '/app-setting/favorites/', data, { headers: { 'wallet-hash': walletHash }})
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