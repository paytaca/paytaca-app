import axios from 'axios'
import { Store } from 'src/store'

export const backend = axios.create()
const baseURL = Store.getters['global/isChipnet'] ? process.env.CHIPNET_WATCHTOWER_BASE_URL : process.env.MAINNET_WATCHTOWER_BASE_URL || ''
const walletHash = Store.getters['global/getWallet']('bch')?.walletHash

export async function fetchMemo (txid) {
	// const walletHash = Store.getters['global/getWallet']('bch')?.walletHash
	console.log('txid: ', txid)

	let memoData = null
	await backend.get(baseURL + '/memos/', { params: { 'txid': txid }, headers: { 'wallet-hash': walletHash } })
		.then(response => {
			console.log('response: ', response)
			memoData = response.data
		})
		.catch(error => {
			console.error(error.response)
			memoData = error.response.data
		})

		return memoData

}

export async function createMemo (data) {
	// const walletHash = Store.getters['global/getWallet']('bch')?.walletHash
	console.log('data: ', data)
	console.log('walletHash: ', walletHash)

	console.log('baseURL: ', baseURL)

	
	await backend.post(baseURL + '/memos/', data, { headers: { 'wallet-hash': walletHash }})
		.then(response => {
			console.log('response: ', response)
			memoData = response.data
		})
		.catch(error => {
			console.error(error)
			memoData = error.response.data
		})

		return memoData
}


export async function updateMemo (data) {
	console.log('data: ', data)

	let memoData = null
	await backend.patch(baseURL + '/memos/', data, { headers: { 'wallet-hash': walletHash }})
		.then(response => {
			console.log('response: ', response)
			memoData = response.data
		})
		.catch(error => {
			console.error(error)
			memoData = error.response.data
		})

		return memoData
}