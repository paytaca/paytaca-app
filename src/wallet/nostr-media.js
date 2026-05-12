/**
 * Encrypted media upload for Nostr Chat (NIP-17 + Blossom).
 * Handles file encryption, upload to Blossom server, and kind:15 event creation.
 *
 * Encryption scheme:
 * - File is encrypted with a random AES-256-GCM key + nonce
 * - The raw AES key (hex) and nonce are stored in the kind:15 rumor tags
 * - The NIP-59 gift wrap encrypts the entire rumor per-recipient (NIP-44),
 *   so the AES key is only visible to intended recipients
 */

import { sha256 } from 'js-sha256'
import { getEventHash, finalizeEvent } from 'nostr-tools'
import { nip59 } from 'nostr-tools'

/**
 * Encrypt a file using AES-256-GCM.
 * @param {File|Blob} file - The file to encrypt
 * @returns {Promise<{ encrypted: Uint8Array, aesKeyHex: string, nonceHex: string, hash: string, originalHash: string, mimeType: string, size: number, encryptedSize: number }>}
 */
export async function encryptFile(file) {
  const arrayBuffer = await file.arrayBuffer()
  const data = new Uint8Array(arrayBuffer)

  const aesKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )

  const nonce = window.crypto.getRandomValues(new Uint8Array(12))

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    data
  )

  const encrypted = new Uint8Array(encryptedBuffer)

  const originalHash = sha256(arrayBuffer)
  const encryptedHash = sha256(encryptedBuffer)

  const exportedKey = await window.crypto.subtle.exportKey('raw', aesKey)
  const aesKeyHex = bytesToHex(new Uint8Array(exportedKey))

  let imageWidth = null
  let imageHeight = null
  if (file.type?.startsWith('image/')) {
    const dims = await getImageDimensions(file)
    if (dims) {
      imageWidth = dims.width
      imageHeight = dims.height
    }
  }

  return {
    encrypted,
    aesKeyHex,
    nonceHex: bytesToHex(nonce),
    hash: encryptedHash,
    originalHash,
    mimeType: file.type,
    size: file.size,
    encryptedSize: encrypted.byteLength,
    imageWidth,
    imageHeight,
  }
}

/**
 * Get image dimensions from a File/Blob.
 * @param {File|Blob} file
 * @returns {Promise<{ width: number, height: number }|null>}
 */
export function getImageDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

/**
 * Decrypt a file using AES-256-GCM.
 * @param {Uint8Array} encryptedData - Encrypted file data
 * @param {string} aesKeyHex - Raw AES key (hex)
 * @param {string} nonceHex - AES-GCM nonce (hex)
 * @returns {Promise<Uint8Array>} - Decrypted file data
 */
export async function decryptFile(encryptedData, aesKeyHex, nonceHex) {
  const keyBytes = hexToBytes(aesKeyHex)
  const nonce = hexToBytes(nonceHex)

  const aesKey = await window.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    encryptedData
  )

  return new Uint8Array(decryptedBuffer)
}

/**
 * Create a kind:15 file message event (NIP-17).
 * @param {Object} opts
 * @param {string} opts.senderPubKey - Hex pubkey of sender
 * @param {string[]} opts.members - All room member pubkeys (including sender)
 * @param {string} opts.fileUrl - Blossom URL of encrypted file
 * @param {string} opts.mimeType - MIME type of original file
 * @param {string} opts.aesKeyHex - Raw AES key (hex) for decryption
 * @param {string} opts.nonceHex - AES-GCM nonce (hex)
 * @param {string} opts.hash - SHA-256 hash of encrypted file
 * @param {string} opts.originalHash - SHA-256 hash of original file
 * @param {number} opts.size - Size of encrypted file in bytes
 * @param {string} [opts.fileName] - Original file name
 * @param {string} [opts.subject] - Optional conversation subject
 * @param {string} [opts.replyTo] - Optional kind:14 id being replied to
 * @returns {import('nostr-tools').Rumor}
 */
export function createKind15FileMessage({
  senderPubKey,
  members,
  fileUrl,
  mimeType,
  aesKeyHex,
  nonceHex,
  hash,
  originalHash,
  size,
  fileName,
  imageWidth,
  imageHeight,
  subject,
  replyTo,
}) {
  const tags = []

  for (const member of members) {
    if (member !== senderPubKey) {
      tags.push(['p', member])
    }
  }

  tags.push(['file-type', mimeType])
  tags.push(['encryption-algorithm', 'aes-gcm'])
  tags.push(['decryption-key', aesKeyHex])
  tags.push(['decryption-nonce', nonceHex])
  tags.push(['x', hash])
  tags.push(['ox', originalHash])
  tags.push(['size', size.toString()])

  if (fileName) tags.push(['filename', fileName])
  if (imageWidth) tags.push(['image-width', imageWidth.toString()])
  if (imageHeight) tags.push(['image-height', imageHeight.toString()])
  if (subject) tags.push(['subject', subject])
  if (replyTo) tags.push(['e', replyTo, '', 'reply'])

  const event = {
    kind: 15,
    pubkey: senderPubKey,
    created_at: Math.floor(Date.now() / 1000),
    content: fileUrl,
    tags,
  }

  event.id = getEventHash(event)
  return event
}

/**
 * Wrap a kind:15 file message for each recipient (NIP-17 gift-wrap).
 * @param {import('nostr-tools').UnsignedEvent} kind15Event
 * @param {string} senderPrivKey - Hex private key of sender
 * @param {string[]} receiverPubKeys - All member pubkeys to send to
 * @returns {Promise<import('nostr-tools').NostrEvent[]>}
 */
export async function wrapKind15FileMessage(kind15Event, senderPrivKey, receiverPubKeys) {
  const senderPrivKeyBytes = hexToBytes(senderPrivKey)
  const giftWraps = nip59.wrapManyEvents(kind15Event, senderPrivKeyBytes, receiverPubKeys)
  return giftWraps
}

/**
 * Upload encrypted file to Blossom server with progress tracking and cancellation.
 * @param {Uint8Array} encryptedData - Encrypted file data
 * @param {string} serverUrl - Blossom server URL (e.g., https://blossom.paytaca.com)
 * @param {string} senderPrivKey - Hex private key for signing auth event
 * @param {string} senderPubKey - Hex public key
 * @param {Object} [opts]
 * @param {function(number): void} [opts.onProgress] - Progress callback (0-1)
 * @param {AbortSignal} [opts.signal] - AbortSignal to cancel the upload
 * @returns {Promise<{ url: string, sha256: string }>}
 */
export function uploadToBlossom(encryptedData, serverUrl, senderPrivKey, senderPubKey, opts = {}) {
  const { onProgress, signal } = opts
  const hashHex = sha256(encryptedData)

  const uploadUrl = `${serverUrl}/upload`
  const authEvent = {
    kind: 24242,
    pubkey: senderPubKey,
    created_at: Math.floor(Date.now() / 1000),
    content: '',
    tags: [
      ['u', uploadUrl],
      ['method', 'PUT'],
      ['payload', hashHex],
    ],
  }
  authEvent.id = getEventHash(authEvent)

  const privKeyBytes = hexToBytes(senderPrivKey)
  const signedAuthEvent = finalizeEvent(authEvent, privKeyBytes)

  const authHeader = btoa(JSON.stringify(signedAuthEvent))

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl, true)
    xhr.setRequestHeader('Authorization', `Nostr ${authHeader}`)
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.responseType = 'json'

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded / e.total)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          url: `${serverUrl}/${hashHex}`,
          sha256: hashHex,
        })
      } else {
        reject(new Error(`Blossom upload failed: ${xhr.status} ${xhr.responseText}`))
      }
    }

    xhr.onerror = () => reject(new Error('Blossom upload failed: network error'))
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'))

    if (signal) {
      if (signal.aborted) {
        xhr.abort()
        return
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.send(encryptedData)
  })
}

/**
 * Upload unencrypted (public) data to Blossom server.
 * Same auth mechanism as uploadToBlossom but sets proper Content-Type
 * and hashes the raw data directly.
 * @param {Uint8Array} data - Raw file data (unencrypted)
 * @param {string} mimeType - MIME type of the data (e.g. 'image/jpeg')
 * @param {string} serverUrl - Blossom server URL
 * @param {string} senderPrivKey - Hex private key for signing auth event
 * @param {string} senderPubKey - Hex public key
 * @param {Object} [opts]
 * @param {function(number): void} [opts.onProgress] - Progress callback (0-1)
 * @param {AbortSignal} [opts.signal] - AbortSignal to cancel the upload
 * @returns {Promise<{ url: string, sha256: string }>}
 */
export function uploadPublicToBlossom(data, mimeType, serverUrl, senderPrivKey, senderPubKey, opts = {}) {
  const { onProgress, signal } = opts
  const hashHex = sha256(data)

  const uploadUrl = `${serverUrl}/upload`
  const authEvent = {
    kind: 24242,
    pubkey: senderPubKey,
    created_at: Math.floor(Date.now() / 1000),
    content: '',
    tags: [
      ['u', uploadUrl],
      ['method', 'PUT'],
      ['payload', hashHex],
    ],
  }
  authEvent.id = getEventHash(authEvent)

  const privKeyBytes = hexToBytes(senderPrivKey)
  const signedAuthEvent = finalizeEvent(authEvent, privKeyBytes)

  const authHeader = btoa(JSON.stringify(signedAuthEvent))

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl, true)
    xhr.setRequestHeader('Authorization', `Nostr ${authHeader}`)
    xhr.setRequestHeader('Content-Type', mimeType)
    xhr.responseType = 'json'

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded / e.total)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          url: `${serverUrl}/${hashHex}`,
          sha256: hashHex,
        })
      } else {
        reject(new Error(`Blossom upload failed: ${xhr.status} ${xhr.responseText}`))
      }
    }

    xhr.onerror = () => reject(new Error('Blossom upload failed: network error'))
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'))

    if (signal) {
      if (signal.aborted) {
        xhr.abort()
        return
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.send(data)
  })
}

/**
 * Download encrypted file from Blossom server.
 * @param {string} url - Blossom URL or hash
 * @param {string} serverUrl - Blossom server URL
 * @returns {Promise<Uint8Array>}
 */
export async function downloadFromBlossom(url, serverUrl) {
  let hash = url
  if (url.startsWith('http')) {
    hash = url.replace(`${serverUrl}/`, '')
  }

  const downloadUrl = `${serverUrl}/${hash}`

  const response = await fetch(downloadUrl)
  if (!response.ok) {
    throw new Error(`Blossom download failed: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

/**
 * Parse a kind:15 file message event.
 * @param {Object} event - Kind:15 event
 * @returns {{ fileUrl: string, mimeType: string, aesKeyHex: string, nonceHex: string, hash: string, originalHash: string, size: number, fileName: string|null }|null}
 */
export function parseKind15FileMessage(event) {
  if (event.kind !== 15) return null

  const getTag = (name) => event.tags.find(t => t[0] === name)?.[1]

  return {
    fileUrl: event.content,
    mimeType: getTag('file-type'),
    aesKeyHex: getTag('decryption-key'),
    nonceHex: getTag('decryption-nonce'),
    hash: getTag('x'),
    originalHash: getTag('ox'),
    size: parseInt(getTag('size') || '0', 10),
    fileName: getTag('filename') || null,
    imageWidth: getTag('image-width') ? parseInt(getTag('image-width'), 10) : null,
    imageHeight: getTag('image-height') ? parseInt(getTag('image-height'), 10) : null,
  }
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}
