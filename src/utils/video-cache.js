import { openDatabase } from 'src/utils/chat-cache'

const VIDEO_STORE = 'videos'
const VIDEO_THUMB_STORE = 'videoThumbs'
const TTL_MS = 24 * 60 * 60 * 1000
const MAX_VIDEO_ENTRIES = 50

function isExpired (entry) {
  return !entry || !entry.timestamp || (Date.now() - entry.timestamp) > TTL_MS
}

export async function getCachedVideo (id) {
  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction(VIDEO_STORE, 'readonly')
      const store = tx.objectStore(VIDEO_STORE)
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

export async function setCachedVideo (id, blob, mimeType) {
  try {
    const db = await openDatabase()
    const tx = db.transaction(VIDEO_STORE, 'readwrite')
    const store = tx.objectStore(VIDEO_STORE)

    const countReq = store.count()
    countReq.onsuccess = () => {
      if (countReq.result >= MAX_VIDEO_ENTRIES) {
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
    console.warn('[video-cache] Failed to cache video:', err)
  }
}

export async function getCachedVideoThumb (id) {
  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction(VIDEO_THUMB_STORE, 'readonly')
      const store = tx.objectStore(VIDEO_THUMB_STORE)
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

export async function setCachedVideoThumb (id, blob) {
  try {
    const db = await openDatabase()
    const tx = db.transaction(VIDEO_THUMB_STORE, 'readwrite')
    const store = tx.objectStore(VIDEO_THUMB_STORE)
    store.put({ id, blob, timestamp: Date.now() })
  } catch (err) {
    console.warn('[video-cache] Failed to cache video thumbnail:', err)
  }
}

export async function clearVideoCache () {
  try {
    const db = await openDatabase()
    const tx1 = db.transaction(VIDEO_STORE, 'readwrite')
    tx1.objectStore(VIDEO_STORE).clear()
    const tx2 = db.transaction(VIDEO_THUMB_STORE, 'readwrite')
    tx2.objectStore(VIDEO_THUMB_STORE).clear()
    return true
  } catch {
    return false
  }
}
