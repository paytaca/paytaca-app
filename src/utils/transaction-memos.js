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

/**
 * Fetch a memo for a transaction
 * @param {string} txid - Transaction ID
 * @returns {Promise<{success: boolean, data: any, error: string|null}>}
 */
export async function fetchMemo (txid) {
	if (!txid || typeof txid !== 'string') {
		return {
			success: false,
			data: null,
			error: 'Invalid transaction ID'
		}
	}

	if (!walletHash) {
		return {
			success: false,
			data: null,
			error: 'Wallet hash not available'
		}
	}

	try {
		const response = await backend.get(baseURL + '/memos/', {
			params: { 'txid': txid },
			headers: { 'wallet-hash': walletHash }
		})
		
		return {
			success: true,
			data: response.data,
			error: null
		}
	} catch (error) {
		// 404 is not an error - it just means no memo exists
		if (error.response && error.response.status === 404) {
			return {
				success: true,
				data: null,
				error: null
			}
		}
		
		const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch memo'
		console.error('[fetchMemo] Error:', errorMessage)
		
		return {
			success: false,
			data: null,
			error: `Network error: ${errorMessage}`
		}
	}
}

/**
 * Create a new memo for a transaction
 * @param {Object} data - Memo data { txid, note }
 * @returns {Promise<{success: boolean, data: any, error: string|null}>}
 */
export async function createMemo (data) {
	if (!data || typeof data !== 'object' || !data.txid || !data.note) {
		return {
			success: false,
			data: null,
			error: 'Invalid memo data: must contain txid and note'
		}
	}

	if (!walletHash) {
		return {
			success: false,
			data: null,
			error: 'Wallet hash not available'
		}
	}

	try {
		// Ensure we're authenticated
		await authMemo()
		const token = await getAuthToken()
		
		if (!token) {
			return {
				success: false,
				data: null,
				error: 'Failed to get authentication token'
			}
		}

		const TOKEN_HEADER = 'Bearer ' + token
		const response = await backend.post(baseURL + '/memos/', data, {
			headers: {
				'wallet-hash': walletHash,
				'Authorization': TOKEN_HEADER
			}
		})
		
		return {
			success: true,
			data: response.data,
			error: null
		}
	} catch (error) {
		const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create memo'
		console.error('[createMemo] Error:', errorMessage)
		
		return {
			success: false,
			data: null,
			error: errorMessage
		}
	}
}


/**
 * Update an existing memo for a transaction
 * @param {Object} data - Memo data { txid, note }
 * @returns {Promise<{success: boolean, data: any, error: string|null}>}
 */
export async function updateMemo (data) {
	if (!data || typeof data !== 'object' || !data.txid || !data.note) {
		return {
			success: false,
			data: null,
			error: 'Invalid memo data: must contain txid and note'
		}
	}

	if (!walletHash) {
		return {
			success: false,
			data: null,
			error: 'Wallet hash not available'
		}
	}

	try {
		// Ensure we're authenticated
		await authMemo()
		const token = await getAuthToken()
		
		if (!token) {
			return {
				success: false,
				data: null,
				error: 'Failed to get authentication token'
			}
		}

		const TOKEN_HEADER = 'Bearer ' + token
		const response = await backend.patch(baseURL + '/memos/', data, {
			headers: {
				'wallet-hash': walletHash,
				'Authorization': TOKEN_HEADER
			}
		})
		
		return {
			success: true,
			data: response.data,
			error: null
		}
	} catch (error) {
		// 404 means memo doesn't exist - treat as error for update
		if (error.response && error.response.status === 404) {
			return {
				success: false,
				data: null,
				error: 'Memo not found'
			}
		}
		
		const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to update memo'
		console.error('[updateMemo] Error:', errorMessage)
		
		return {
			success: false,
			data: null,
			error: errorMessage
		}
	}
}

/**
 * Delete a memo for a transaction
 * @param {string} txid - Transaction ID
 * @returns {Promise<{success: boolean, data: any, error: string|null}>}
 */
export async function deleteMemo (txid) {
	if (!txid || typeof txid !== 'string') {
		return {
			success: false,
			data: null,
			error: 'Invalid transaction ID'
		}
	}

	if (!walletHash) {
		return {
			success: false,
			data: null,
			error: 'Wallet hash not available'
		}
	}

	try {
		// Ensure we're authenticated
		await authMemo()
		const token = await getAuthToken()
		
		if (!token) {
			return {
				success: false,
				data: null,
				error: 'Failed to get authentication token'
			}
		}

		const TOKEN_HEADER = 'Bearer ' + token
		const response = await backend.delete(baseURL + '/memos/', {
			params: { 'txid': txid },
			headers: {
				'wallet-hash': walletHash,
				'Authorization': TOKEN_HEADER
			}
		})
		
		return {
			success: true,
			data: response.data,
			error: null
		}
	} catch (error) {
		// 404 means memo doesn't exist - treat as success for delete (idempotent)
		if (error.response && error.response.status === 404) {
			return {
				success: true,
				data: null,
				error: null
			}
		}
		
		const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to delete memo'
		console.error('[deleteMemo] Error:', errorMessage)
		
		return {
			success: false,
			data: null,
			error: errorMessage
		}
	}
}

/**
 * Register a new memo user
 * @returns {Promise<boolean>} - Returns true if registration successful
 */
export async function registerMemoUser () {
	if (!walletHash) {
		console.error('[registerMemoUser] Wallet hash not available')
		return false
	}

	try {
		const user = 'MEMO_' + walletHash
		const memoHash = await generateMemoHash(walletHash)

		await backend.post(baseURL + '/memos/register/', {}, {
			headers: {
				'x-authmemo-wallethash': user,
				'x-authmemo-pass': memoHash
			}
		})
		
		// After registration, authenticate
		return await authMemo()
	} catch (error) {
		// 400 means user already exists, try to authenticate
		if (error.response && error.response.status === 400) {
			return await authMemo()
		}
		
		console.error('[registerMemoUser] Registration error:', error.message)
		return false
	}
}

/**
 * Authenticate and get auth token for memo operations
 * Automatically registers user if not found
 * @returns {Promise<boolean>} - Returns true if authentication successful
 */
export async function authMemo () {
	if (!walletHash) {
		console.error('[authMemo] Wallet hash not available')
		return false
	}

	try {
		const user = 'MEMO_' + walletHash
		const memoHash = await generateMemoHash(walletHash)

		const response = await backend.post(baseURL + '/memos/auth/', {
			'username': user,
			'password': memoHash
		})
		
		if (response.data && response.data.access) {
			await saveAuthToken(response.data.access)
			return true
		}
		
		return false
	} catch (error) {
		// If auth fails, try to register the user
		if (error.response && (error.response.status === 401 || error.response.status === 404)) {
			try {
				await registerMemoUser()
				return true
			} catch (registerError) {
				console.error('[authMemo] Registration failed:', registerError)
				return false
			}
		}
		
		console.error('[authMemo] Authentication error:', error.message)
		return false
	}
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
 		if (!memo || !privkey || !pubkey) {
 			console.error('encryptMemo - Missing required parameters')
 			return null
 		}
 		
    	const encryptedMessage = encryptMessage({
      		data: memo,
      		privkey: privkey,
      		pubkeys: pubkey
    	})
    	
    	if (!encryptedMessage) {
    		console.error('encryptMemo - encryptMessage returned null/undefined')
    		return null
    	}
    	
   		const serializedEncryptedMessage = compressEncryptedMessage(encryptedMessage)
   		
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
}

/**
 * Delete authentication token for a specific wallet hash
 * @param {string} walletHash - The wallet hash to delete token for
 */
export function deleteAuthTokenForWallet(walletHash) {
	if (walletHash) {
		const key = getTokenStorageKey(walletHash)
		SecureStoragePlugin.remove({ key })
	}
}

