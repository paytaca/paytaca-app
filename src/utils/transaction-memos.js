import axios from 'axios'
import { Store } from 'src/store'

export const backend = axios.create()
const baseURL = Store.getters['global/isChipnet'] ? process.env.CHIPNET_WATCHTOWER_BASE_URL : process.env.MAINNET_WATCHTOWER_BASE_URL || ''


export function fetchMemo (txid) {
	const walletHash = Store.getters['global/getWallet']('bch')?.walletHash
	console.log('txid: ', txid)

	backend.get(baseURL + '/memos/', { params: { 'txid': txid }, headers: { 'wallet-hash': walletHash } })
		.then(response => {
			console.log('response: ', response)
		})
		.catch(error => {
			console.error(error)
		})

}

export function createMemo (data) {
	const walletHash = Store.getters['global/getWallet']('bch')?.walletHash
	console.log('data: ', data)
	console.log('walletHash: ', walletHash)

	console.log('baseURL: ', baseURL)

	backend.post(baseURL + '/memos/', data, { headers: { 'wallet-hash': walletHash }})
		.then(response => {
			console.log('response: ', response)
		})
		.catch(error => {
			console.error(error)
		})
}