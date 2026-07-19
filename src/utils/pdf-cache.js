const DB_NAME = 'paytaca-chat-cache'
const DB_VERSION = 3
const PDF_STORE = 'pdfs'
const TTL_MS = 24 * 60 * 60 * 1000
const MAX_PDF_ENTRIES = 30

let _dbPromise = null

function openDatabase () {
  if (_dbPromise) return _dbPromise
  _dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(PDF_STORE)) {
        db.createObjectStore(PDF_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('thumbnails')) {
        db.createObjectStore('thumbnails', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('videos')) {
        db.createObjectStore('videos', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('videoThumbs')) {
        db.createObjectStore('videoThumbs', { keyPath: 'id' })
      }
    }
  })
  return _dbPromise
}

function isExpired (entry) {
  return !entry || !entry.timestamp || (Date.now() - entry.timestamp) > TTL_MS
}

export async function getCachedPdf (id) {
  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction(PDF_STORE, 'readonly')
      const store = tx.objectStore(PDF_STORE)
      const request = store.get(id)
      request.onsuccess = () => {
        const entry = request.result
        if (isExpired(entry)) {
          resolve(null)
        } else {
          resolve(entry)
        }
      }
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function setCachedPdf (id, blob, mimeType) {
  try {
    const db = await openDatabase()
    const tx = db.transaction(PDF_STORE, 'readwrite')
    const store = tx.objectStore(PDF_STORE)
    const countReq = store.count()
    countReq.onsuccess = () => {
      if (countReq.result >= MAX_PDF_ENTRIES) {
        const allReq = store.getAll()
        allReq.onsuccess = () => {
          const entries = allReq.result
          const oldest = entries.reduce((a, b) => a.timestamp < b.timestamp ? a : b)
          store.delete(oldest.id)
          store.put({ id, blob, mimeType, timestamp: Date.now() })
        }
      } else {
        store.put({ id, blob, mimeType, timestamp: Date.now() })
      }
    }
  } catch (err) {
    console.warn('[pdf-cache] Failed to cache PDF:', err)
  }
}

export async function clearPdfCache () {
  try {
    const db = await openDatabase()
    const tx = db.transaction(PDF_STORE, 'readwrite')
    tx.objectStore(PDF_STORE).clear()
    return true
  } catch {
    return false
  }
}
