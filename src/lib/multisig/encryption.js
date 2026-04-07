import { encrypt, decrypt } from 'eciesjs';
import { binToUtf8, hexToBin, binToHex, generateRandomBytes } from 'bitauth-libauth-v3';

/**
 * Decrypts an ECIES message using the owner's private key.
 * 
 * @param {Uint8Array|string} ownerPrivateKeyBytes - The owner's private key as a Uint8Array or hex string.
 * @param {string} encryptedData - The encrypted data in hexadecimal format (always hex-encoded binary).
 * @param {('utf8'|'hex'|'bytes')} [outputFormat='utf8'] - Format of the returned decrypted data:
 *   - 'utf8' (default): UTF-8 decoded string
 *   - 'hex': hex-encoded string of the decrypted bytes
 *   - 'bytes': raw Uint8Array of the decrypted bytes
 * @returns {Promise<string|Uint8Array>} The decrypted data in the requested format.
 * @throws {Error} If decryption fails or invalid format is provided.
 */
export async function decryptECIES(
  ownerPrivateKeyBytes,
  encryptedData,
  outputFormat = 'utf8'
) {

  try {
    if (!ownerPrivateKeyBytes || !encryptedData) {
      throw new Error('Missing required parameters');
    }
    
    const ciphertextBytes = hexToBin(encryptedData);
    if (!ciphertextBytes || ciphertextBytes.length === 0) {
      throw new Error('Invalid encrypted data');
    }
    
    const decryptedBytes = decrypt(ownerPrivateKeyBytes, ciphertextBytes);

    switch (outputFormat) {
      case 'utf8':
        return binToUtf8(decryptedBytes);

      case 'hex':
        return binToHex(decryptedBytes);

      case 'bytes':
        return decryptedBytes;  // Uint8Array

      default:
        throw new Error(
          `Invalid outputFormat: "${outputFormat}". Supported: 'utf8', 'hex', 'bytes'`
        );
    }
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }

  
}

/**
 * Encrypts data using ECIES for a specific recipient's public key.
 * 
 * @param {Uint8Array|string} recipientRawPublicKey - The recipient's raw public key as a Uint8Array or hex string.
 * @param {Uint8Array} dataBytes - The binary data to encrypt.
 * @returns {Promise<string>} The encrypted message in hexadecimal format.
 * @throws {Error} If recipientRawPublicKey is undefined or null, or if encryption fails.
 */
export async function encryptECIES(recipientRawPublicKey, dataBytes) {

    if (!recipientRawPublicKey) {
        throw new Error('recipientRawPublicKey is required for ECIES encryption');
    }
    if (!dataBytes || dataBytes.length === 0) {
        throw new Error('dataBytes is required and cannot be empty');
    }
    
    try {
        const encryptedBytes = encrypt(recipientRawPublicKey, dataBytes);
        return binToHex(encryptedBytes);
    } catch (error) {
        throw new Error(`ECIES encryption failed: ${error.message}`);
    }
}

/**
 * Generates a new AES-256 GCM key using the Web Crypto API.
 *
 * @param {boolean} [exportRaw=false] - If true, exports and returns the raw key bytes (as ArrayBuffer). Otherwise, returns the CryptoKey object.
 * @returns {Promise<CryptoKey|ArrayBuffer>} The generated CryptoKey or its raw key bytes.
 */

export async function generateAES256GCMKey(exportRaw = false) {
  const { subtle } = crypto
  const key = await subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256, // 256-bit key for AES-256
    },
    true, // Exportable
    ["encrypt", "decrypt"] // Intended usages for this key
  )
  if (exportRaw) {
    return subtle.exportKey("raw", key)
  }
  return key
}

/**
 * Encrypts data using AES-256 GCM mode.
 *
 * @param {Uint8Array} dataBytes - The data to encrypt as a Uint8Array.
 * @param {string} keyHex - The AES-256 key in hexadecimal string format.
 * @returns {Promise<{iv: string, encryptedData: string}>} An object containing:
 *   - iv: The initialization vector in hexadecimal string format (12 bytes).
 *   - encryptedData: The encrypted data in hexadecimal string format.
 * @throws {Error} If encryption fails.
 */

export async function encryptAES256GCM(dataBytes, keyHex) {

  const { subtle } = crypto

  const iv = generateRandomBytes(12)

  const key = await subtle.importKey(
    'raw',
    hexToBin(keyHex),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  const encryptedBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBytes // ← already Uint8Array
  )

  return {
    iv: binToHex(iv),
    encryptedData: binToHex(new Uint8Array(encryptedBuffer)),
    combinedIvAndEncryptedData: combineAES256GCMIvAndEncrypted(iv, new Uint8Array(encryptedBuffer))
  }
}

/**
 * Decrypts data using AES-256 GCM mode.
 *
 * @param {Uint8Array} encryptedDataBytes - The encrypted data as a hexadecimal string.
 * @param {Uint8Array} dekBytes - The AES-256 key in hexadecimal string format.
 * @param {Uint8Array} ivBytes - The initialization vector (IV) in hexadecimal string format (12 bytes).
 * @returns {Promise<string>} The decrypted data as a UTF-8 string.
 * @throws {Error} If decryption fails.
 */

export async function decryptAES256GCM(encryptedDataBytes, dekBytes, ivBytes) {
  const { subtle } = crypto
  const key = await subtle.importKey(
    'raw',
    dekBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )

  const decryptedBuffer = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes
    },
    key,
    encryptedDataBytes
  )

  return new TextDecoder().decode(decryptedBuffer)
}

/**
 * Combines IV and encrypted data (ciphertext + auth tag) into a single Uint8Array.
 * Then converts the result to hex string.
 * 
 * @param {Uint8Array} iv - 12-byte initialization vector
 * @param {Uint8Array} encryptedBytes - ciphertext + 16-byte auth tag (from subtle.encrypt)
 * @returns {string} Hex string of (IV || ciphertext || tag)
 */
export function combineAES256GCMIvAndEncrypted(iv, encryptedBytes) {
  if (iv.length !== 12) {
    throw new Error(`Expected 12-byte IV, got ${iv.length} bytes`);
  }
  
  const combined = new Uint8Array(iv.length + encryptedBytes.length);
  combined.set(iv, 0);
  combined.set(encryptedBytes, iv.length);
  
  return binToHex(combined);
}

/**
 * Splits a combined hex string back into IV and ciphertext+tag.
 * 
 * @param {string} combinedHex - Hex string containing IV prepended to encrypted data
 * @returns {{ iv: Uint8Array, encryptedBytes: Uint8Array }} 
 * @throws {Error} If input is too short or invalid
 */
export function splitAES256GCMIvAndEncrypted(combinedHex) {
  const combinedBytes = hexToBin(combinedHex);
  
  if (combinedBytes.length < 12 + 16) { // IV + at least some ciphertext + tag
    throw new Error(`Combined data too short: ${combinedBytes.length} bytes`);
  }
  
  const iv = combinedBytes.subarray(0, 12);
  const encryptedBytes = combinedBytes.subarray(12);
  
  return { iv, encryptedBytes };
}