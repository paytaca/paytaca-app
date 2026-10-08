const DB_NAME = 'paytaca-avatar-cache'
const DB_VERSION = 1
const STORE_NAME = 'avatars'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

let _dbPromise = null

function openDatabase () {
  if (!_dbPromise) {
    _dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
    })
  }
  return _dbPromise
}

export async function getCachedAvatar (pubKeyHex) {
  if (!pubKeyHex) return null
  try {
    const db = await openDatabase()
    const entry = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(pubKeyHex)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    })
    if (!entry) return null
    if (Date.now() - entry.ts > MAX_AGE_MS) {
      // Lazily clean expired entry
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).delete(pubKeyHex)
      } catch {}
      return null
    }
    return entry.url
  } catch {
    return null
  }
}

export async function setCachedAvatar (pubKeyHex, url) {
  if (!pubKeyHex || !url) return
  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ id: pubKeyHex, url, ts: Date.now() })
  } catch (err) {
    console.warn('[AvatarCache] Failed to write cache:', err)
  }
}

export async function clearAvatarCache () {
  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
  } catch {}
}
