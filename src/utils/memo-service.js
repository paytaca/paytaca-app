import { getKeypair } from 'src/exchange/chat/keys'
import { updateOrCreateKeypair } from 'src/exchange/chat/index'
import { decompressEncryptedMessage, decryptMessage } from 'src/marketplace/chat/encryption'
import { encryptMessage, compressEncryptedMessage } from 'src/marketplace/chat/encryption'
import { privToPub } from 'src/exchange/chat/keys'
import * as fetchMemoAPI from './transaction-memos'

// In-memory cache for keypair to avoid repeated storage reads
let keypairCache = null

/**
 * Ensures a valid keypair is available for memo operations
 * Automatically regenerates if missing or invalid
 * @returns {Promise<{privkey: string, pubkey: string}>}
 */
export async function ensureKeypair() {
  // Check cache first
  if (keypairCache && keypairCache.privkey && keypairCache.pubkey) {
    // Validate cache - check if keys are valid hex strings
    const privkeyValid = /^[0-9a-f]{64}$/i.test(keypairCache.privkey)
    const pubkeyValid = /^[0-9a-f]{66}$/i.test(keypairCache.pubkey)
    if (privkeyValid && pubkeyValid) {
      return keypairCache
    }
    // Cache invalid, clear it
    keypairCache = null
  }

  try {
    // Try to get existing keypair from storage
    let keypair = await getKeypair()
    
    // Validate keypair if found
    if (keypair && keypair.privkey && keypair.pubkey) {
      const privkeyValid = /^[0-9a-f]{64}$/i.test(keypair.privkey)
      const pubkeyValid = /^[0-9a-f]{66}$/i.test(keypair.pubkey)
      
      if (privkeyValid && pubkeyValid) {
        keypairCache = keypair
        return keypair
      }
    }
    
    // Keypair missing or invalid, regenerate it
    keypair = await updateOrCreateKeypair(false)
    
    if (!keypair || !keypair.privkey || !keypair.pubkey) {
      throw new Error('Failed to generate keypair for memo operations')
    }
    
    // Validate regenerated keypair
    const privkeyValid = /^[0-9a-f]{64}$/i.test(keypair.privkey)
    const pubkeyValid = /^[0-9a-f]{66}$/i.test(keypair.pubkey)
    
    if (!privkeyValid || !pubkeyValid) {
      throw new Error('Generated keypair has invalid format')
    }
    
    keypairCache = keypair
    return keypair
  } catch (error) {
    console.error('[memoService] ensureKeypair error:', error)
    throw new Error(`Failed to ensure keypair: ${error.message}`)
  }
}

/**
 * Decrypts encrypted memo data with robust error handling
 * @param {string} encryptedMemo - Base64 encoded encrypted memo
 * @param {string} privkey - Private key for decryption
 * @returns {Promise<{success: boolean, memo: string|null, error: string|null}>}
 */
export async function decryptMemoData(encryptedMemo, privkey) {
  if (!encryptedMemo || typeof encryptedMemo !== 'string') {
    return {
      success: false,
      memo: null,
      error: 'Invalid encrypted memo: must be a non-empty string'
    }
  }

  if (!privkey || typeof privkey !== 'string') {
    return {
      success: false,
      memo: null,
      error: 'Invalid private key: must be a non-empty string'
    }
  }

  // Validate privkey format
  if (!/^[0-9a-f]{64}$/i.test(privkey)) {
    return {
      success: false,
      memo: null,
      error: 'Invalid private key format: must be 64-character hex string'
    }
  }

  try {
    // Step 1: Decompress encrypted message
    let parsedEncryptedMessage
    try {
      parsedEncryptedMessage = decompressEncryptedMessage(encryptedMemo)
    } catch (decompressError) {
      console.error('[memoService] decompressEncryptedMessage error:', decompressError)
      return {
        success: false,
        memo: null,
        error: `Failed to decompress encrypted memo: ${decompressError.message}`
      }
    }

    // Step 2: Validate decompressed data structure
    if (!parsedEncryptedMessage) {
      return {
        success: false,
        memo: null,
        error: 'Decompressed message is null or undefined'
      }
    }

    const { data, iv, authorPubkey, pubkeys } = parsedEncryptedMessage

    if (!data || typeof data !== 'string') {
      return {
        success: false,
        memo: null,
        error: 'Missing or invalid encrypted data in memo'
      }
    }

    if (!iv || typeof iv !== 'string') {
      return {
        success: false,
        memo: null,
        error: 'Missing or invalid IV in memo'
      }
    }

    if (!authorPubkey || typeof authorPubkey !== 'string') {
      return {
        success: false,
        memo: null,
        error: 'Missing or invalid author pubkey in memo'
      }
    }

    if (!pubkeys || !Array.isArray(pubkeys) || pubkeys.length === 0) {
      return {
        success: false,
        memo: null,
        error: 'Missing or empty pubkeys array in memo'
      }
    }

    // Step 3: Get our pubkey and check if we're in the pubkeys list
    let ourPubkey
    try {
      ourPubkey = privToPub(privkey)
    } catch (pubkeyError) {
      console.error('[memoService] privToPub error:', pubkeyError)
      return {
        success: false,
        memo: null,
        error: `Failed to derive pubkey from private key: ${pubkeyError.message}`
      }
    }

    // Step 4: Check if our pubkey matches any in the list
    const pubkeyMatches = pubkeys.some(pk => {
      const pubkey = pk.split('|', 2)[0]
      return pubkey === ourPubkey
    })

    if (!pubkeyMatches) {
      // Try all keys anyway as a fallback
    }

    // Step 5: Attempt decryption
    const opts = {
      privkey,
      tryAllKeys: true, // Always try all keys for robustness
      data,
      iv,
      authorPubkey,
      pubkeys
    }

    let decryptedMessage
    try {
      decryptedMessage = decryptMessage(opts)
    } catch (decryptError) {
      console.error('[memoService] decryptMessage error:', decryptError)
      return {
        success: false,
        memo: null,
        error: `Decryption failed: ${decryptError.message}`
      }
    }

    if (!decryptedMessage || typeof decryptedMessage !== 'string') {
      return {
        success: false,
        memo: null,
        error: 'Decryption returned null or invalid result'
      }
    }

    return {
      success: true,
      memo: decryptedMessage,
      error: null
    }
  } catch (error) {
    console.error('[memoService] decryptMemoData unexpected error:', error)
    return {
      success: false,
      memo: null,
      error: `Unexpected error during decryption: ${error.message}`
    }
  }
}

/**
 * Loads and decrypts a memo for a transaction
 * @param {string} txid - Transaction ID
 * @param {string|null} encryptedMemoFromTx - Optional encrypted memo from transaction object
 * @returns {Promise<{success: boolean, memo: string|null, error: string|null}>}
 */
export async function loadMemo(txid, encryptedMemoFromTx = null) {
  if (!txid || typeof txid !== 'string') {
    return {
      success: false,
      memo: null,
      error: 'Invalid transaction ID'
    }
  }

  try {
    // Ensure keypair is available
    const keypair = await ensureKeypair()
    if (!keypair || !keypair.privkey) {
      return {
        success: false,
        memo: null,
        error: 'Failed to get keypair for memo decryption'
      }
    }

    // Try to get encrypted memo from transaction object first
    let encryptedMemo = encryptedMemoFromTx

    // If not in transaction object, fetch from server
    if (!encryptedMemo) {
      const fetchResult = await fetchMemoAPI.fetchMemo(txid)
      
      if (!fetchResult.success) {
        // 404 is not an error - just means no memo exists
        if (fetchResult.error && typeof fetchResult.error === 'string' && fetchResult.error.includes('404')) {
          return {
            success: true,
            memo: null,
            error: null
          }
        }
        return {
          success: false,
          memo: null,
          error: fetchResult.error || 'Failed to fetch memo from server'
        }
      }

      if (fetchResult.data && !('error' in fetchResult.data) && fetchResult.data.note) {
        encryptedMemo = fetchResult.data.note
      } else {
        // No memo found
        return {
          success: true,
          memo: null,
          error: null
        }
      }
    }

    // If we have an encrypted memo, decrypt it
    if (encryptedMemo) {
      const decryptResult = await decryptMemoData(encryptedMemo, keypair.privkey)
      return decryptResult
    }

    // No memo found
    return {
      success: true,
      memo: null,
      error: null
    }
  } catch (error) {
    console.error('[memoService] loadMemo error:', error)
    return {
      success: false,
      memo: null,
      error: `Failed to load memo: ${error.message}`
    }
  }
}

/**
 * Encrypts and saves a memo for a transaction
 * @param {string} txid - Transaction ID
 * @param {string} memoText - Memo text to encrypt and save
 * @param {boolean} isUpdate - Whether this is an update to existing memo
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function saveMemo(txid, memoText, isUpdate = false) {
  if (!txid || typeof txid !== 'string') {
    return {
      success: false,
      error: 'Invalid transaction ID'
    }
  }

  const trimmedMemo = String(memoText || '').trim()
  if (!trimmedMemo) {
    return {
      success: false,
      error: 'Memo text cannot be empty'
    }
  }

  try {
    // Ensure keypair is available
    const keypair = await ensureKeypair()
    if (!keypair || !keypair.privkey || !keypair.pubkey) {
      return {
        success: false,
        error: 'Failed to get keypair for memo encryption'
      }
    }

    // Encrypt the memo
    let encryptedMessage
    try {
      encryptedMessage = encryptMessage({
        data: trimmedMemo,
        privkey: keypair.privkey,
        pubkeys: keypair.pubkey
      })
    } catch (encryptError) {
      console.error('[memoService] encryptMessage error:', encryptError)
      return {
        success: false,
        error: `Failed to encrypt memo: ${encryptError.message}`
      }
    }

    if (!encryptedMessage) {
      return {
        success: false,
        error: 'Encryption returned null or undefined'
      }
    }

    // Compress the encrypted message
    let serializedEncryptedMessage
    try {
      serializedEncryptedMessage = compressEncryptedMessage(encryptedMessage)
    } catch (compressError) {
      console.error('[memoService] compressEncryptedMessage error:', compressError)
      return {
        success: false,
        error: `Failed to compress encrypted memo: ${compressError.message}`
      }
    }

    if (!serializedEncryptedMessage) {
      return {
        success: false,
        error: 'Compression returned null or undefined'
      }
    }

    // Save to server
    const data = { txid, note: serializedEncryptedMessage }
    const apiResult = isUpdate
      ? await fetchMemoAPI.updateMemo(data)
      : await fetchMemoAPI.createMemo(data)

    if (!apiResult.success) {
      return {
        success: false,
        error: apiResult.error || 'Failed to save memo to server'
      }
    }

    return {
      success: true,
      error: null
    }
  } catch (error) {
    console.error('[memoService] saveMemo error:', error)
    return {
      success: false,
      error: `Failed to save memo: ${error.message}`
    }
  }
}

/**
 * Deletes a memo for a transaction
 * @param {string} txid - Transaction ID
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteMemo(txid) {
  if (!txid || typeof txid !== 'string') {
    return {
      success: false,
      error: 'Invalid transaction ID'
    }
  }

  try {
    const apiResult = await fetchMemoAPI.deleteMemo(txid)
    
    if (!apiResult.success) {
      return {
        success: false,
        error: apiResult.error || 'Failed to delete memo from server'
      }
    }

    return {
      success: true,
      error: null
    }
  } catch (error) {
    console.error('[memoService] deleteMemo error:', error)
    return {
      success: false,
      error: `Failed to delete memo: ${error.message}`
    }
  }
}

/**
 * Clear the keypair cache (useful for testing or when wallet changes)
 */
export function clearKeypairCache() {
  keypairCache = null
}
