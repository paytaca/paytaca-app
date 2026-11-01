import { setupCache as setupAxiosCache, defaultKeyGenerator } from 'axios-cache-interceptor'

function toPlainValue (value) {
  if (Array.isArray(value)) return value.map(toPlainValue)
  if (value && typeof value === 'object' && [null, Object.prototype].includes(Object.getPrototypeOf(value))) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toPlainValue(item)]))
  }
  return value
}

export function generateCacheKey (request) {
  return defaultKeyGenerator({
    ...request,
    params: toPlainValue(request.params),
    data: toPlainValue(request.data),
  })
}

export function setupCache (instance, options) {
  return setupAxiosCache(instance, { generateKey: generateCacheKey, ...options })
}
