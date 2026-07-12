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
import { nip44, nip59 } from 'nostr-tools'

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
  if (file.type?.startsWith('image/') || file.type?.startsWith('video/')) {
    const dims = await getMediaDimensions(file)
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
 * Get media dimensions from a File/Blob (image or video).
 * @param {File|Blob} file
 * @returns {Promise<{ width: number, height: number }|null>}
 */
export function getMediaDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    let settled = false

    const finish = (val) => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(url)
      resolve(val)
    }

    const timeout = setTimeout(() => finish(null), 10000)

    if (file.type?.startsWith('video/')) {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        clearTimeout(timeout)
        finish({ width: video.videoWidth, height: video.videoHeight })
      }
      video.onerror = () => {
        clearTimeout(timeout)
        finish(null)
      }
      video.src = url
    } else {
      const img = new Image()
      img.onload = () => {
        clearTimeout(timeout)
        finish({ width: img.naturalWidth, height: img.naturalHeight })
      }
      img.onerror = () => {
        clearTimeout(timeout)
        finish(null)
      }
      img.src = url
    }
  })
}

/**
 * Capture a thumbnail frame from a video file as a JPEG data URL.
 * @param {File|Blob} file - The video file
 * @returns {Promise<string|null>} - JPEG data URL or null on failure
 */
export function getVideoThumbnail(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    let settled = false

    const cleanup = () => {
      URL.revokeObjectURL(url)
      video.onloadedmetadata = null
      video.onseeked = null
      video.onerror = null
    }

    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      resolve(null)
    }, 10000)

    video.onloadedmetadata = () => {
      const seekTo = Math.min(1, video.duration * 0.1)
      video.currentTime = seekTo
    }
    video.onseeked = () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      try {
        const canvas = document.createElement('canvas')
        const maxDim = 360
        const scale = Math.min(maxDim / video.videoWidth, maxDim / video.videoHeight, 1)
        canvas.width = Math.round(video.videoWidth * scale)
        canvas.height = Math.round(video.videoHeight * scale)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        cleanup()
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      } catch {
        cleanup()
        resolve(null)
      }
    }
    video.onerror = () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      cleanup()
      resolve(null)
    }
    video.src = url
  })
}

/**
 * Encrypt raw bytes (e.g. a thumbnail JPEG) with a fresh AES-256-GCM key.
 * @param {Uint8Array} data - Raw plaintext bytes to encrypt
 * @returns {Promise<{ encrypted: Uint8Array, aesKeyHex: string, nonceHex: string, hash: string }>}
 */
export async function encryptBytes(data) {
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
  const exportedKey = await window.crypto.subtle.exportKey('raw', aesKey)
  return {
    encrypted,
    aesKeyHex: bytesToHex(new Uint8Array(exportedKey)),
    nonceHex: bytesToHex(nonce),
    hash: sha256(encryptedBuffer),
  }
}

/**
 * Capture a video thumbnail, encrypt it, and return everything needed to upload + reference it.
 * @param {File|Blob} file - The video file
 * @returns {Promise<{ encrypted: Uint8Array, aesKeyHex: string, nonceHex: string, hash: string, width: number, height: number }|null>}
 */
export async function captureAndEncryptVideoThumbnail(file) {
  const dataUrl = await getVideoThumbnail(file)
  if (!dataUrl) return null

  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  const result = await encryptBytes(bytes)
  return { ...result, width: 0, height: 0 }
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
 * Minimal format to fit within relay size limits after NIP-59 double encryption.
 * - content: hex hash of encrypted file (used to construct Blossom URL)
 * - p-tags: standard hex pubkeys
 * - d-tag: base64 of (aes_key[32] || nonce[12]) — 44 bytes → 60 base64 chars
 * - m-tag: MIME type (e.g. "image/jpeg")
 * @param {Object} opts
 * @param {string} opts.senderPubKey - Hex pubkey of sender
 * @param {string[]} opts.members - All room member pubkeys (including sender, hex format)
 * @param {string} opts.hash - SHA-256 hash of encrypted file (hex, 64 chars)
 * @param {string} opts.aesKeyHex - Raw AES key (hex, 64 chars) for decryption
 * @param {string} opts.nonceHex - AES-GCM nonce (hex, 24 chars)
 * @param {string} [opts.mimeType] - MIME type of original file
 * @param {number} [opts.imageWidth] - Image width in pixels
 * @param {number} [opts.imageHeight] - Image height in pixels
 * @param {string} [opts.replyTo] - Optional kind:14 id being replied to
 * @returns {import('nostr-tools').Rumor}
 */
export function createKind15FileMessage({
  senderPubKey,
  members,
  hash,
  aesKeyHex,
  nonceHex,
  mimeType,
  imageWidth,
  imageHeight,
  replyTo,
  thumbHash,
  thumbAesKeyHex,
  thumbNonceHex,
}) {
  const tags = []

  for (const member of members) {
    if (member !== senderPubKey) {
      tags.push(['p', member])
    }
  }

  const keyBytes = hexToBytes(aesKeyHex)
  const nonceBytes = hexToBytes(nonceHex)
  const d = bytesToBase64(concatBytes(keyBytes, nonceBytes))
  tags.push(['d', d])

  if (mimeType) tags.push(['m', mimeType])
  if (imageWidth) tags.push(['w', String(imageWidth)])
  if (imageHeight) tags.push(['h', String(imageHeight)])
  if (replyTo) tags.push(['e', replyTo, '', 'reply'])
  if (thumbHash) {
    tags.push(['thumb', thumbHash, thumbAesKeyHex, thumbNonceHex])
  }

  const event = {
    kind: 15,
    pubkey: senderPubKey,
    created_at: Math.floor(Date.now() / 1000),
    content: hash,
    tags,
  }

  event.id = getEventHash(event)
  return event
}

/**
 * Wrap a kind:15 file message for each recipient (NIP-17 gift-wrap).
 * Logs gift wrap sizes for debugging relay size limits.
 * Self-addressed wraps get a ["self"] tag so the watchtower can skip
 * push notifications for the sender's own events.
 * @param {import('nostr-tools').UnsignedEvent} kind15Event
 * @param {string} senderPrivKey - Hex private key of sender
 * @param {string[]} receiverPubKeys - All member pubkeys to send to
 * @param {string} [senderPubKey] - Sender's own pubkey (for self-tagging; omit to skip)
 * @returns {Promise<import('nostr-tools').NostrEvent[]>}
 */
function createSelfSignedArchiveWrap(unsignedEvent, senderPrivKeyBytes, senderPubKey) {
  const seal = nip59.createSeal(unsignedEvent, senderPrivKeyBytes, senderPubKey)
  const conversationKey = nip44.getConversationKey(senderPrivKeyBytes, senderPubKey)
  const content = nip44.encrypt(JSON.stringify(seal), conversationKey)
  return finalizeEvent({
    kind: 1059,
    content,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['p', senderPubKey], ['self']],
  }, senderPrivKeyBytes)
}

export async function wrapKind15FileMessage(kind15Event, senderPrivKey, receiverPubKeys, senderPubKey) {
  const senderPrivKeyBytes = hexToBytes(senderPrivKey)
  const giftWraps = nip59.wrapManyEvents(kind15Event, senderPrivKeyBytes, receiverPubKeys)

  const rumorJson = JSON.stringify(kind15Event)
  console.log('[wrapKind15FileMessage] Rumor JSON size:', rumorJson.length, 'bytes')
  for (let i = 0; i < giftWraps.length; i++) {
    const wrapJson = JSON.stringify(giftWraps[i])
    console.log(`[wrapKind15FileMessage] Gift wrap[${i}] JSON size: ${wrapJson.length} bytes, content size: ${giftWraps[i].content.length} chars`)
  }

  if (senderPubKey) {
    giftWraps.push(createSelfSignedArchiveWrap(kind15Event, senderPrivKeyBytes, senderPubKey))
    return giftWraps.map((gw, i) =>
      (i === 0 || receiverPubKeys[i - 1] === senderPubKey)
        ? { ...gw, tags: [...gw.tags, ['self']] }
        : gw
    )
  }
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

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', downloadUrl, true)
    xhr.responseType = 'arraybuffer'

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(new Uint8Array(xhr.response))
      } else {
        reject(new Error(`Blossom download failed: ${xhr.status}`))
      }
    }

    xhr.onerror = () => {
      reject(new Error(`Blossom download network error`))
    }

    xhr.ontimeout = () => {
      reject(new Error(`Blossom download timed out`))
    }

    xhr.timeout = 300000

    xhr.send()
  })
}

/**
 * Parse a kind:15 file message event.
 * Supports both the new minimal format (d-tag = key+nonce only, m-tag for mime)
 * and the legacy binary-packed format (d-tag with key+nonce+mime+size+filename).
 * @param {Object} event - Kind:15 event
 * @returns {{ fileUrl: string, mimeType: string, aesKeyHex: string, nonceHex: string, hash: string, size: number, fileName: string|null, imageWidth: number|null, imageHeight: number|null }|null}
 */
export function parseKind15FileMessage(event) {
  if (event.kind !== 15) return null

  const hashHex = event.content?.match(/^[a-f0-9]{64}$/)
    ? event.content
    : null

  let aesKeyHex = null
  let nonceHex = null
  let mimeType = null
  let size = 0
  let fileName = null
  let imageWidth = null
  let imageHeight = null

  const d = event.tags.find(t => t[0] === 'd')?.[1]
  if (d) {
    try {
      const bytes = base64ToBytes(d)
      aesKeyHex = bytesToHex(bytes.slice(0, 32))
      nonceHex = bytesToHex(bytes.slice(32, 44))
      if (bytes.length > 44) {
        const mimeLen = bytes[44]
        mimeType = new TextDecoder().decode(bytes.slice(45, 45 + mimeLen))
        let pos = 45 + mimeLen
        if (bytes.length >= pos + 4) {
          size = new DataView(bytes.buffer, bytes.byteOffset + pos, 4).getUint32(0, false)
          pos += 4
          if (bytes.length > pos) {
            const nameLen = bytes[pos]
            fileName = new TextDecoder().decode(bytes.slice(pos + 1, pos + 1 + nameLen))
          }
        }
      }
    } catch {}
  }

  const mTag = event.tags.find(t => t[0] === 'm')?.[1]
  if (mTag) mimeType = mTag
  imageWidth = parseInt(event.tags.find(t => t[0] === 'w')?.[1]) || null
  imageHeight = parseInt(event.tags.find(t => t[0] === 'h')?.[1]) || null

  const thumbTag = event.tags.find(t => t[0] === 'thumb')
  const thumbHash = thumbTag?.[1] || null
  const thumbAesKeyHex = thumbTag?.[2] || null
  const thumbNonceHex = thumbTag?.[3] || null

  let fileUrl = null
  if (hashHex) {
    fileUrl = `https://blossom.paytaca.com/${hashHex}`
  } else if (event.content?.startsWith('https://')) {
    fileUrl = event.content
  }

  let thumbUrl = null
  if (thumbHash) {
    thumbUrl = `https://blossom.paytaca.com/${thumbHash}`
  }

  return {
    fileUrl,
    mimeType,
    aesKeyHex,
    nonceHex,
    hash: hashHex,
    size,
    fileName,
    imageWidth,
    imageHeight,
    thumbUrl,
    thumbAesKeyHex,
    thumbNonceHex,
  }
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function bytesToBase64(bytes) {
  const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('')
  return btoa(binary)
}

function base64ToBytes(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function hexToBase64(hex) {
  return bytesToBase64(hexToBytes(hex))
}

export function base64ToHex(base64) {
  return bytesToHex(base64ToBytes(base64))
}

function concatBytes(...arrays) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) {
    result.set(a, offset)
    offset += a.length
  }
  return result
}

export function resizeImage(file, { maxDimension, quality, maxSizeBytes }) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > height && width > maxDimension) {
        height = Math.round(height * maxDimension / width)
        width = maxDimension
      } else if (height > maxDimension) {
        width = Math.round(width * maxDimension / height)
        height = maxDimension
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(img.src)
      const tryEncode = (q) => {
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Failed to encode image'))
          if (maxSizeBytes && blob.size > maxSizeBytes && q > 0.1) {
            tryEncode(Math.round((q - 0.1) * 100) / 100)
          } else {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg', lastModified: Date.now() }))
          }
        }, 'image/jpeg', q)
      }
      tryEncode(quality)
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image'))
    }
    img.src = URL.createObjectURL(file)
  })
}
