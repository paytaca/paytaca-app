import { reactive } from 'vue'

const MAX_ENTRIES = 30
const cache = reactive({})

export function cacheVideoBlob (messageId, blobUrl) {
  if (cache[messageId]) {
    URL.revokeObjectURL(cache[messageId])
  }
  const keys = Object.keys(cache)
  while (keys.length >= MAX_ENTRIES) {
    const oldestKey = keys.shift()
    const oldUrl = cache[oldestKey]
    if (oldUrl) URL.revokeObjectURL(oldUrl)
    delete cache[oldestKey]
  }
  cache[messageId] = blobUrl
}

export function getCachedVideoBlob (messageId) {
  return cache[messageId] || null
}

export function removeCachedVideoBlob (messageId) {
  const url = cache[messageId]
  if (url) {
    URL.revokeObjectURL(url)
  }
  delete cache[messageId]
}
