export async function asyncSleep(interval) {
  return new Promise((resolve, reject) => {
    try {
      setTimeout(() => resolve(), interval)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * @param {String} url
 * @param {Object} params
 */
export function appendQueryParams(url, params={}) {
  const parsed = new URL(url, window.location.origin)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    parsed.searchParams.set(key, value)
  }
  return parsed.toString()
}

/**
 * Builds an authenticated websocket url. Requests a short-lived one-time token
 * first, then falls back to the legacy query auth for older backends.
 *
 * @param {String} baseUrl
 * @param {Object} opts
 * @param {import('axios').AxiosInstance} [opts.backend] Backend whose interceptors attach auth headers
 * @param {() => Promise<String>} [opts.getLegacyAuthToken] Legacy user auth token
 * @param {() => Promise<String>} [opts.getLegacyCustomerSignature] Legacy customer signature
 */
export async function buildAuthenticatedWebsocketUrl(baseUrl, opts={}) {
  if (opts.backend) {
    try {
      const response = await opts.backend.post('ws-auth-token/')
      const token = response?.data?.token
      if (token) {
        return appendQueryParams(baseUrl, { ws_auth_token: token })
      }
    } catch(error) {
      // Endpoint may not be deployed yet or the auth may have been rejected.
      console.log('Websocket auth token request failed', error?.response?.status)
    }
  }

  if (typeof opts.getLegacyAuthToken === 'function') {
    try {
      const legacyAuthToken = await opts.getLegacyAuthToken()
      if (legacyAuthToken) return appendQueryParams(baseUrl, { token: legacyAuthToken })
    } catch(error) {
      console.error('Failed to get legacy websocket auth token', error)
    }
  }

  if (typeof opts.getLegacyCustomerSignature === 'function') {
    try {
      const customerSignature = await opts.getLegacyCustomerSignature()
      if (customerSignature) return appendQueryParams(baseUrl, { paytaca_customer_sig: customerSignature })
    } catch(error) {
      console.error('Failed to get legacy websocket customer signature', error)
    }
  }

  // No auth available. This only works while the backend is not in strict mode.
  return baseUrl
}

/**
 * @param {String | (() => Promise<String>)} url
 * @param {Object} reconnectOpts 
 * @param {Number} reconnectOpts.maxAttempts 
 * @param {Number} reconnectOpts.baseInterval
 * @param {Number} [reconnectOpts.exponentialBackoff]
 */
export async function connectWebsocket(url='', reconnectOpts={maxAttempts:5, baseInterval: 5000, exponentialBackoff: 1 }) {
  const maxAttempts = parseInt(reconnectOpts?.maxAttempts)
  const baseInterval = parseInt(reconnectOpts?.baseInterval)
  const exponentialBackoff = parseFloat(reconnectOpts?.exponentialBackoff) || 1

  if (isNaN(maxAttempts)) return Promise.reject('Invalid max attempts value')
  if (isNaN(baseInterval)) return Promise.reject('Invalid base interval value')
  if (isNaN(exponentialBackoff)) return Promise.reject('Invalid backoff value')

  let lastError = null
  for (var i = 0; i < maxAttempts; i++) {
    try {
      // Resolve on every attempt so one-time auth tokens are never reused.
      const connectUrl = typeof url === 'function' ? await url() : url
      const resp = await initWebsocket(connectUrl)
      return Promise.resolve(resp.target)
    } catch(error) {
      lastError = error
      const interval = baseInterval * exponentialBackoff ** i
      console.log(i+1, 'of', maxAttempts, 'attempts. Reconnecting in', interval/1000, 'seconds')
      await asyncSleep(interval)
    }
  }

  if (lastError) console.error(lastError)
  return Promise.reject('Max connections reached')
}

export async function initWebsocket(...websocketArgs) {
  return new Promise((resolve, reject) => {
    const websocket = new WebSocket(...websocketArgs)
    websocket.onopen = (...args) => {
      websocket.onopen = null
      websocket.onerror = null
      resolve(...args)
    }

    websocket.onerror = (...args) => {
      websocket.onopen = null
      websocket.onerror = null
      reject(...args)
    }
  })
}
