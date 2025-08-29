import axios from 'axios'
import crypto from 'crypto'
import { Store } from 'src/store'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'

import { compressEncryptedMessage, encryptMessage, compressEncryptedImage, encryptImage } from 'src/marketplace/chat/encryption'
import { decompressEncryptedMessage, decryptMessage, decompressEncryptedImage, decryptImage } from 'src/marketplace/chat/encryption'

const TOKEN_STORAGE_KEY = 'memo-auth-key'


export const backend = axios.create()
const baseURL = Store.getters['global/isChipnet'] ? process.env.CHIPNET_WATCHTOWER_BASE_URL : process.env.MAINNET_WATCHTOWER_BASE_URL || ''
const walletHash = Store.getters['global/getWallet']('bch')?.walletHash

export async function fetchMemo (txid) {
	let memoData = null
	await backend.get(baseURL + '/memos/', { params: { 'txid': txid }, headers: { 'wallet-hash': walletHash } })
		.then(response => {			
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
	const TOKEN_HEADER = 'Bearer ' + await getAuthToken()

	let memoData = null	
	await backend.post(baseURL + '/memos/', data, { headers: { 'wallet-hash': walletHash, 'Authorization': TOKEN_HEADER }})
		.then(response => {			
			memoData = response.data
		})
		.catch(error => {
			console.error(error)
			memoData = error.response.data
		})

		return memoData
}


export async function updateMemo (data) {
	const TOKEN_HEADER = 'Bearer ' + await getAuthToken()

	let memoData = null
	await backend.patch(baseURL + '/memos/', data, { headers: { 'wallet-hash': walletHash, 'Authorization': TOKEN_HEADER }})
		.then(response => {			
			memoData = response.data
		})
		.catch(error => {
			console.error(error)
			memoData = error.response.data
		})

		return memoData
}

export async function deleteMemo (txid) {
	const TOKEN_HEADER = 'Bearer ' + await getAuthToken()
	let memoData = null
	await backend.delete(baseURL + '/memos/', { params: { 'txid': txid }, headers: { 'wallet-hash': walletHash, 'Authorization': TOKEN_HEADER } })
		.then(response => {			
			memoData = response.data
		})
		.catch(error => {			
			memoData = error.response.data
		})

		return memoData
}

export async function registerMemoUser () {	
	const user = 'MEMO_' + walletHash
	const memoHash = await generateMemoHash(walletHash)

	await backend.post(baseURL + '/memos/register/', {}, { headers: { 'x-authmemo-wallethash': user, 'x-authmemo-pass': memoHash}})
		.then(async (response) => {
			// console.log('response: ', response)
			// memoData = response.data
			await authMemo()
		})
		.catch(async (error) => {
			console.error(error.response)
			// memoData = error.response.data
			if (error.response.status === 400) {
				await authMemo()
			}
		})	
}

export async function authMemo () {
	const user = 'MEMO_' + walletHash
	const memoHash = await generateMemoHash(walletHash)

	await backend.post(baseURL + '/memos/auth/', { 'username': user, 'password': memoHash })
		.then(async (response) => {			
			// memoData = response.data
			await saveAuthToken(response.data.access)
		})
		.catch(error => {
			console.error(error.response.data)

			// memoData = error.response.data
		})
}

export async function decryptMemo (privkey, encryptedMemo, tryAllKeys = false) {
    // if (!this.encrypted) return
    const parsedEncryptedMessage = decompressEncryptedMessage(encryptedMemo)
 
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

 export async function generateMemoHash (wallethash) {
 	const hashVal = 'MEMO_' + walletHash

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
	console.log('Memo auth token deleted')
}