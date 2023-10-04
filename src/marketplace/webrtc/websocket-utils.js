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
      const resp = await initWebsocket(url)
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
