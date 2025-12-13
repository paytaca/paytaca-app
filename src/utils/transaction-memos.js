import axios from 'axios'
import crypto from 'crypto'
import { Store } from 'src/store'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { getCurrentWalletStorageKey, getWalletStorageKey, getWalletHash } from 'src/utils/wallet-storage'

import { compressEncryptedMessage, encryptMessage, compressEncryptedImage, encryptImage } from 'src/marketplace/chat/encryption'
import { decompressEncryptedMessage, decryptMessage, decompressEncryptedImage, decryptImage } from 'src/marketplace/chat/encryption'
import { privToPub } from 'src/exchange/chat/keys'

const TOKEN_STORAGE_KEY_PREFIX = 'memo-auth-key'

/**
 * Get wallet-specific storage key for memo auth token
 * @param {string} walletHash - Optional wallet hash, if not provided uses current wallet
 * @returns {string} Storage key with wallet hash
 */
function getTokenStorageKey(walletHash = null) {
  if (walletHash) {
    return getWalletStorageKey(TOKEN_STORAGE_KEY_PREFIX, walletHash)
  }
  return getCurrentWalletStorageKey(TOKEN_STORAGE_KEY_PREFIX)
}


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
			if (error.response) {
				if (error.response.status === 404) {
					memoData = error.response.data
				}					
			}			
		})
		
		return memoData

}

export async function createMemo (data) {	
	const TOKEN_HEADER = 'Bearer ' + await getAuthToken()

	let memoData = null	
	await backend.post(baseURL + '/memos/', data, { headers: { 'wallet-hash': walletHash, 'Authorization': TOKEN_HEADER }})
		.then(response => {			
			memoData = response.data
		})
		.catch(error => {
			// console.error(error)
			if (error.response) {
				// if (error.response.status === 404) {
					memoData = error.response.data
				// }
			}			
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
			// console.error(error)
			if (error.response) {
				if (error.response.status === 404) {
					memoData = error.response.data
				}
			}			
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
			if (error.response) {
				if (error.response.status === 404) {
					memoData = error.response.data
				}
			}			
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
			// console.error(error.response)
			// memoData = error.response.data
			if (error.response) {				
				if (error.response.status === 400) {					
					await authMemo()
				}				
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
			registerMemoUser()
			// console.error(error.response.data)

			// memoData = error.response.data
		})
}

export async function decryptMemo (privkey, encryptedMemo, tryAllKeys = false) {		
    // if (!this.encrypted) return
    if (!privkey || !encryptedMemo) {
      console.error('[decryptMemo] Missing privkey or encryptedMemo')
      return null
    }
    
    try {
      const parsedEncryptedMessage = decompressEncryptedMessage(encryptedMemo)
      const opts = { privkey, tryAllKeys, ...parsedEncryptedMessage }
      
      // Check if we have the required data
      if (!opts.data || !opts.iv || !opts.authorPubkey) {
        console.error('[decryptMemo] Missing required decryption data')
        return null
      }
      
      // Check if we have pubkeys
      if (!opts.pubkeys || opts.pubkeys.length === 0) {
        console.error('[decryptMemo] No pubkeys found in encrypted message')
        return null
      }
      
      // Get the wallet's pubkey from the private key
      const ourPubkey = privToPub(privkey)
      const pubkeyMatches = opts.pubkeys.some(pk => {
        const pubkey = pk.split('|', 2)[0]
        return pubkey === ourPubkey
      })
      
      if (!pubkeyMatches && !tryAllKeys) {
        return null
      }
      
      // decryptMessage is synchronous, not async
      const decryptedMessage = decryptMessage(opts)
      
      return decryptedMessage || null
    } catch (error) {
      console.error('[decryptMemo] Error during decryption:', error)
      return null
    }
  }

 export async function encryptMemo (privkey, pubkey, memo) {
 	try {
 		// encrypt message
 		console.log('encryptMemo - Input memo:', memo)
 		console.log('encryptMemo - privkey exists:', !!privkey)
 		console.log('encryptMemo - pubkey exists:', !!pubkey)
 		
 		if (!memo || !privkey || !pubkey) {
 			console.error('encryptMemo - Missing required parameters')
 			return null
 		}
 		
    	const encryptedMessage = encryptMessage({
      		data: memo,
      		privkey: privkey,
      		pubkeys: pubkey
    	})
    	
    	console.log('encryptMemo - Encrypted message:', encryptedMessage)
    	
    	if (!encryptedMessage) {
    		console.error('encryptMemo - encryptMessage returned null/undefined')
    		return null
    	}
    	
   		const serializedEncryptedMessage = compressEncryptedMessage(encryptedMessage)
   		console.log('encryptMemo - Serialized message:', serializedEncryptedMessage)
   		
   		if (!serializedEncryptedMessage) {
   			console.error('encryptMemo - compressEncryptedMessage returned null/undefined')
   			return null
   		}
    	
    	return serializedEncryptedMessage
 	} catch (error) {
 		console.error('encryptMemo - Error during encryption:', error)
 		return null
 	}
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
								.catch(e => console.warn('Failed to migrate memo token:', e))
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
	console.log('Memo auth token deleted for wallet:', walletHash || 'current')
}

/**
 * Delete authentication token for a specific wallet hash
 * @param {string} walletHash - The wallet hash to delete token for
 */
export function deleteAuthTokenForWallet(walletHash) {
	if (walletHash) {
		const key = getTokenStorageKey(walletHash)
		SecureStoragePlugin.remove({ key })
		console.log('Memo auth token deleted for wallet:', walletHash)
	}
}

