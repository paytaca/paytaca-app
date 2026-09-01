const DB_NAME = 'paytaca-chat-cache'
const DB_VERSION = 3
const STORE_NAME = 'thumbnails'

let _dbPromise = null

export function openDatabase() {
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
        if (!db.objectStoreNames.contains('videos')) {
          db.createObjectStore('videos', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('videoThumbs')) {
          db.createObjectStore('videoThumbs', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('pdfs')) {
          db.createObjectStore('pdfs', { keyPath: 'id' })
        }
      }
    })
  }
  return _dbPromise
}

const MAX_THUMBNAIL_CACHE_SIZE = 200

export const _imageThumbnailCache = new Map()
export const _replyThumbnailCache = new Map()

export function evictOldestThumbnail() {
  if (_imageThumbnailCache.size >= MAX_THUMBNAIL_CACHE_SIZE) {
    const firstKey = _imageThumbnailCache.keys().next().value
    const url = _imageThumbnailCache.get(firstKey)
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
    _imageThumbnailCache.delete(firstKey)
  }
}

export async function getThumbnailFromDB(cacheKey) {
  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(cacheKey)
      request.onsuccess = () => resolve(request.result?.thumbnailUrl || null)
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function saveThumbnailToDB(cacheKey, thumbnailUrl) {
  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put({ id: cacheKey, thumbnailUrl, timestamp: Date.now() })
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn('[chat-cache] Failed to save thumbnail to IndexedDB:', err)
  }
}

export async function clearChatCache() {
  try {
    const db = await openDatabase()
    const tx = db.transaction([STORE_NAME, 'videos', 'videoThumbs', 'pdfs'], 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    tx.objectStore('videos').clear()
    tx.objectStore('videoThumbs').clear()
    tx.objectStore('pdfs').clear()
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
    _imageThumbnailCache.clear()
    _replyThumbnailCache.clear()
    return true
  } catch (err) {
    console.error('[chat-cache] Failed to clear chat cache:', err)
    return false
  }
}

export async function hasChatCache() {
  try {
    if (_imageThumbnailCache.size > 0 || _replyThumbnailCache.size > 0) return true
    const db = await openDatabase()
    const stores = [STORE_NAME, 'videos', 'videoThumbs', 'pdfs']
    for (const name of stores) {
      if (!db.objectStoreNames.contains(name)) continue
      const has = await new Promise((resolve) => {
        const tx = db.transaction(name, 'readonly')
        const store = tx.objectStore(name)
        const countReq = store.count()
        countReq.onsuccess = () => resolve(countReq.result > 0)
        countReq.onerror = () => resolve(false)
      })
      if (has) return true
    }
    return false
  } catch {
    return false
  }
}

export async function getChatCacheSize () {
  try {
    let totalBytes = 0
    for (const url of _imageThumbnailCache.values()) {
      totalBytes += typeof url === 'string' ? url.length * 0.75 : 0
    }
    for (const url of _replyThumbnailCache.values()) {
      totalBytes += typeof url === 'string' ? url.length * 0.75 : 0
    }
    const db = await openDatabase()
    const stores = [STORE_NAME, 'videos', 'videoThumbs', 'pdfs']
    for (const name of stores) {
      if (!db.objectStoreNames.contains(name)) continue
      await new Promise((resolve) => {
        const tx = db.transaction(name, 'readonly')
        const store = tx.objectStore(name)
        const cursorReq = store.openCursor()
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result
          if (cursor) {
            const val = cursor.value
            if (val?.thumbnailUrl) totalBytes += val.thumbnailUrl.length * 0.75
            if (val?.blob?.size) totalBytes += val.blob.size
            cursor.continue()
          } else {
            resolve()
          }
        }
        cursorReq.onerror = () => resolve()
      })
    }
    return totalBytes
  } catch {
    return 0
  }
}
