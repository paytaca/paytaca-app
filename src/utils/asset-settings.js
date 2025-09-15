import axios from 'axios'

export const backend = axios.create()
const baseURL = Store.getters['global/isChipnet'] ? process.env.CHIPNET_WATCHTOWER_BASE_URL : process.env.MAINNET_WATCHTOWER_BASE_URL || ''
const walletHash = Store.getters['global/getWallet']('bch')?.walletHash

export async function fetchCustomList ()  {
	let customList = null

	await backend.get(baseURL + '/app-setting/custom-list/', { params: { 'txid': txid }, headers: { 'wallet-hash': walletHash } })
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

export async function saveCustomList () {
	let customList = null	
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

}

export async function saveFavorites () {

}