import { reactive } from 'vue'

const cache = reactive({})

export function cacheVideoBlob (messageId, blobUrl) {
  cache[messageId] = blobUrl
}

export function getCachedVideoBlob (messageId) {
  return cache[messageId] || null
}

export function removeCachedVideoBlob (messageId) {
  delete cache[messageId]
}
