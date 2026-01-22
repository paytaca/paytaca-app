import { Store } from 'src/store'
import { decompressEncryptedMessage, decryptMessage as decryptMessageCore } from 'src/marketplace/chat/encryption'
import { encryptMessage as encryptMessageCore, compressEncryptedMessage } from 'src/marketplace/chat/encryption'
import { getEncryptionKeypairFromMnemonic } from './memo-key-utils'
import { privToPub } from 'src/exchange/chat/keys'
import * as fetchMemoAPI from './transaction-memos'

/**
 * Gets encryption keypair derived from mnemonic (address 0/0)
 * Always derives fresh from mnemonic to ensure cross-platform consistency
 * @param {number} walletIndex - Optional wallet index, defaults to current wallet
 * @returns {Promise<{privkey: string, pubkey: string}>}
 */
export async function ensureKeypair(walletIndex = null) {
  try {
    // Get wallet index from store if not provided
    if (walletIndex === null || walletIndex === undefined) {
      walletIndex = Store.getters['global/getWalletIndex']
    }
    
    // Always derive fresh from mnemonic (no caching for cross-platform consistency)
    const keypair = await getEncryptionKeypairFromMnemonic(walletIndex)
    
    if (!keypair || !keypair.privkey || !keypair.pubkey) {
      throw new Error('Failed to generate keypair for memo operations')
    }
    
    // Validate keypair format
    const privkeyValid = /^[0-9a-f]{64}$/i.test(keypair.privkey)
    const pubkeyValid = /^[0-9a-f]{66}$/i.test(keypair.pubkey)
    
    if (!privkeyValid || !pubkeyValid) {
      throw new Error('Generated keypair has invalid format')
    }
    
    return keypair
  } catch (error) {
    console.error('[memoService] ensureKeypair error:', error)
    throw new Error(`Failed to ensure keypair: ${error.message}`)
  }
}

/**
 * Simplified and robust memo decryption
 * @param {string} encryptedMemo - Base64 encoded encrypted memo
 * @param {string} privkey - Private key for decryption
 * @returns {Promise<{success: boolean, memo: string|null, error: string|null}>}
 */
export async function decryptMemoData(encryptedMemo, privkey) {
  // Input validation
  if (!encryptedMemo || typeof encryptedMemo !== 'string' || encryptedMemo.trim() === '') {
    return { success: false, memo: null, error: 'Invalid encrypted memo: must be a non-empty string' }
  }

  if (!privkey || typeof privkey !== 'string' || !/^[0-9a-f]{64}$/i.test(privkey)) {
    return { success: false, memo: null, error: 'Invalid private key: must be 64-character hex string' }
  }

  try {
    // Step 1: Decompress encrypted message
    let parsedEncryptedMessage
    try {
      parsedEncryptedMessage = decompressEncryptedMessage(encryptedMemo)
    } catch (decompressError) {
      return { 
        success: false, 
        memo: null, 
        error: `Failed to decompress encrypted memo: ${decompressError.message}` 
      }
    }

    if (!parsedEncryptedMessage || typeof parsedEncryptedMessage !== 'object') {
      return { success: false, memo: null, error: 'Invalid decompressed message format' }
    }

    const { data, iv, authorPubkey, pubkeys } = parsedEncryptedMessage

    // Step 2: Validate required fields
    if (!data || typeof data !== 'string') {
      return { success: false, memo: null, error: 'Missing or invalid encrypted data' }
    }

    if (!iv || typeof iv !== 'string') {
      return { success: false, memo: null, error: 'Missing or invalid IV' }
    }

    if (!authorPubkey || typeof authorPubkey !== 'string') {
      return { success: false, memo: null, error: 'Missing or invalid author pubkey' }
    }

    if (!Array.isArray(pubkeys) || pubkeys.length === 0) {
      return { success: false, memo: null, error: 'Missing or empty pubkeys array' }
    }

    // Step 3: Get our pubkey
    let ourPubkey
    try {
      ourPubkey = privToPub(privkey)
    } catch (pubkeyError) {
      return { 
        success: false, 
        memo: null, 
        error: `Failed to derive pubkey: ${pubkeyError.message}` 
      }
    }

    // Step 4: Attempt decryption with all pubkeys (tryAllKeys: true for robustness)
    // This handles cases where the keypair might have been regenerated or memos from different wallets
    const decryptionOpts = {
      privkey,
      tryAllKeys: true, // Always try all keys
      data,
      iv,
      authorPubkey,
      pubkeys
    }

    let decryptedMessage
    try {
      decryptedMessage = decryptMessageCore(decryptionOpts)
    } catch (decryptError) {
      // Decryption failure is not necessarily an error - memo might be from different keypair/wallet
      // Return success with null memo to indicate "no memo found" rather than an error
      return { 
        success: true, 
        memo: null, 
        error: null 
      }
    }

    // Step 5: Validate decrypted result
    if (!decryptedMessage || typeof decryptedMessage !== 'string') {
      return { 
        success: true, 
        memo: null, 
        error: null 
      }
    }

    return {
      success: true,
      memo: decryptedMessage,
      error: null
    }
  } catch (error) {
    // Unexpected errors should still return gracefully
    console.error('[memoService] decryptMemoData unexpected error:', error)
    return { 
      success: true, 
      memo: null, 
      error: null 
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
    return { success: false, memo: null, error: 'Invalid transaction ID' }
  }

  try {
    // Ensure keypair is available
    const keypair = await ensureKeypair()
    if (!keypair || !keypair.privkey) {
      return { success: false, memo: null, error: 'Failed to get keypair for memo decryption' }
    }

    // Try to get encrypted memo from transaction object first
    let encryptedMemo = encryptedMemoFromTx

    // If not in transaction object, fetch from server
    if (!encryptedMemo) {
      const fetchResult = await fetchMemoAPI.fetchMemo(txid)
      
      if (!fetchResult.success) {
        // 404 means no memo exists - not an error
        if (fetchResult.error && typeof fetchResult.error === 'string' && fetchResult.error.includes('404')) {
          return { success: true, memo: null, error: null }
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
        return { success: true, memo: null, error: null }
      }
    }

    // If we have an encrypted memo, decrypt it
    if (encryptedMemo) {
      return await decryptMemoData(encryptedMemo, keypair.privkey)
    }

    return { success: true, memo: null, error: null }
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
    return { success: false, error: 'Invalid transaction ID' }
  }

  const trimmedMemo = String(memoText || '').trim()
  if (!trimmedMemo) {
    return { success: false, error: 'Memo text cannot be empty' }
  }

  try {
    // Ensure keypair is available
    const keypair = await ensureKeypair()
    if (!keypair || !keypair.privkey || !keypair.pubkey) {
      return { success: false, error: 'Failed to get keypair for memo encryption' }
    }

    // Encrypt the memo
    // For single-recipient memos, always use the derived pubkey to ensure consistency
    // This matches what encryptMessage derives internally (ourPubkey = privToPub(privkey))
    const ourPubkey = privToPub(keypair.privkey)
    let encryptedMessage
    try {
      encryptedMessage = encryptMessageCore({
        data: trimmedMemo,
        privkey: keypair.privkey,
        pubkeys: ourPubkey
      })
    } catch (encryptError) {
      console.error('[memoService] encryptMessage error:', encryptError)
      return { 
        success: false, 
        error: `Failed to encrypt memo: ${encryptError.message}` 
      }
    }

    if (!encryptedMessage || typeof encryptedMessage !== 'object') {
      return { success: false, error: 'Encryption returned invalid result' }
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

    if (!serializedEncryptedMessage || typeof serializedEncryptedMessage !== 'string') {
      return { success: false, error: 'Compression returned invalid result' }
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
      error: null,
      encrypted_memo: serializedEncryptedMessage 
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
    return { success: false, error: 'Invalid transaction ID' }
  }

  try {
    const apiResult = await fetchMemoAPI.deleteMemo(txid)
    
    if (!apiResult.success) {
      return { 
        success: false, 
        error: apiResult.error || 'Failed to delete memo from server' 
      }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('[memoService] deleteMemo error:', error)
    return { 
      success: false, 
      error: `Failed to delete memo: ${error.message}` 
    }
  }
}

/**
 * Clear the keypair cache (deprecated - keys are now always derived from mnemonic)
 * Kept for backward compatibility but does nothing
 * @deprecated
 */
export function clearKeypairCache() {
  // No-op: keys are always derived from mnemonic now
}
