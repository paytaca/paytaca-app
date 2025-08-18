import axios from 'axios'
import { Store } from 'src/store'

import { compressEncryptedMessage, encryptMessage, compressEncryptedImage, encryptImage } from 'src/marketplace/chat/encryption'
import { decompressEncryptedMessage, decryptMessage, decompressEncryptedImage, decryptImage } from 'src/marketplace/chat/encryption'

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


	let memoData = null	
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

export async function decryptMemo (privkey, encryptedMemo, tryAllKeys = false) {
    // if (!this.encrypted) return
    const parsedEncryptedMessage = decompressEncryptedMessage(encryptedMemo)
    console.log('parsedEncryptedMessage: ', parsedEncryptedMessage)
    const opts = { privkey, tryAllKeys, ...parsedEncryptedMessage }
    const decryptedMessage = await decryptMessage(opts)

    return decryptedMessage
    // return this
  }

 export async function encryptMemo (privkey, pubkey, memo) {
 	// encrypt message
    const encryptedMessage = encryptMessage({
      data: memo,
      privkey: privkey,
      pubkeys: pubkey
    })
   	const serializedEncryptedMessage = compressEncryptedMessage(encryptedMessage)
    const message = serializedEncryptedMessage

    return message
 }