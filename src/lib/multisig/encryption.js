import { subtle } from 'crypto'

import { encrypt, decrypt } from 'eciesjs';
import { binToUtf8, hexToBin, binToHex, generateRandomBytes } from 'bitauth-libauth-v3';

/**
 * Decrypts an ECIES message using the owner's private key.
 * 
 * @param {Uint8Array|string} ownerPrivateKeyBytes - The owner's private key as a Uint8Array or hex string.
 * @param {string} encryptedData - The encrypted data in hexadecimal format.
 * @returns {Promise<string>} The decrypted data as a UTF-8 string.
 * @throws {Error} If decryption fails.
 */
export async function decryptECIES(ownerPrivateKeyBytes, encryptedData) {
    return binToUtf8(decrypt(ownerPrivateKeyBytes, hexToBin(encryptedData)));
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
    const encryptedBytes = encrypt(recipientRawPublicKey, dataBytes);
    return binToHex(encryptedBytes);
}

export async function generateAES256GCMKey(exportRaw = false) {
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

export async function encryptAES256GCM(dataBytes, keyHex) {
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
    encryptedData: binToHex(new Uint8Array(encryptedBuffer))
  }
}

export async function decryptAES256GCM(encryptedDataHex, keyHex, ivHex) {
  const key = await subtle.importKey(
    'raw',
    hexToBin(keyHex),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )

  const decryptedBuffer = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: hexToBin(ivHex)
    },
    key,
    hexToBin(encryptedDataHex)
  )

  return new TextDecoder().decode(decryptedBuffer)
}