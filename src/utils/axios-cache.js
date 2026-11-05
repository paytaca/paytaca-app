import { setupCache as setupAxiosCache, defaultKeyGenerator } from 'axios-cache-interceptor'

function toPlainValue (value) {
  if (Array.isArray(value)) return value.map(toPlainValue)
  if (value && typeof value === 'object' && [null, Object.prototype].includes(Object.getPrototypeOf(value))) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toPlainValue(item)]))
  }
  return value
}

// axios 0.32+ merges params and data into null-prototype objects, which the
// default key generator hashes to the same key whatever their contents.
export function generateCacheKey (request) {
  return defaultKeyGenerator({
    ...request,
    params: toPlainValue(request.params),
    data: toPlainValue(request.data),
  })
}

// Cache keys don't include headers, so never store a response to an
// authenticated request where another request could be served it.
// A caller passing its own cachePredicate replaces this guard.
const AUTH_HEADERS = ['authorization', 'x-paytaca-customer']

export const cachePredicate = {
  statusCheck: (status) => status >= 200 && status < 400,
  responseMatch: ({ config }) => !Object.entries(config?.headers || {})
    .some(([name, value]) => value && AUTH_HEADERS.includes(name.toLowerCase())),
}

export function setupCache (instance, options) {
  return setupAxiosCache(instance, {
    cachePredicate,
    ...options,
    generateKey: options?.generateKey || generateCacheKey,
  })
}
