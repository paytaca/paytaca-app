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

/**
 * Class for listening to transactions of cashaddress through websocket.
 * - Works on mainnet & chipnet only
 * - Reconnects on address change. Only reconnects when there is existing connection
 */
export class TransactionListener {
  /**
   * @param {String} address
   * @param {Object} opts
   * @param {Boolean} opts.reconnect
   */
  constructor(address, opts) {
    this.address = address
    this.reconnection = {
      enable: Boolean(opts?.reconnect),
      reconnectAttempts: parseInt(opts?.reconnectAttempts) || 5,
    }

    this.websocket = [].map(() => new WebSocket())[0]

    this.listeners = []
    
    this._connectCtr = 0
    this._lastConnectId = null
  }

  get readyState() {
    return this?.websocket?.readyState
  }

  get address() {
    return this._address
  }

  set address(value) {
    const changed = value != this._address
    this._address = value
    if (changed && this.readyState == 1) {
      this.disconnect()
      this.connect()
    }
  }

  get url() {
    const host = this.address?.startsWith?.('bchtest:')
      ? 'chipnet.watchtower.cash' : 'watchtower.cash'

    return `wss://${host}/ws/watch/bch/${this.address}/`
  }

  disconnect() {
    if (this.websocket?.onclose) this.websocket.onclose = null
    this.websocket?.close?.()
    this.websocket = null
  }

  async connect() {    
    if (!this.address) return Promise.reject('Invalid address')

    // must close websocket before initializing, due to how
    // watchtower subscribes addresses to websocket channels
    this.websocket?.close?.()
    this.websocket = null

    if (isNaN(this._connectCtr)) this._connectCtr = 0
    const connectId = ++this._connectCtr
    this._lastConnectId = connectId

    const reconnectAttempts = this.reconnection?.enable ? this.reconnection.reconnectAttempts : 1
    const response = await connectWebsocket(this.url, {
      maxAttempts: reconnectAttempts || 5,
      baseInterval: 2000,
      exponentialBackoff: 1,
    })

    // Used for disconnecting connection attempts run at the same time;
    // except for the last connect attempt
    if (connectId != this._lastConnectId) {
      response?.close?.()
      return response
    }

    this.websocket = response
    this.websocket.onmessage = (...args) => this.emit(...args)
    this.websocket.onclose = (...args) => {
      if (!this.reconnection.enable) return console.error(...args)
      console.log('Websocket closed. Reconnecting')
      return this.connect()
    }
    return this.websocket
  }

  emit(...args) {
    try {
      const data = JSON.parse(args?.[0]?.data)
      const parsedData = this.parseWebsocketDataReceived(data)
      args.push(parsedData)
    } catch (error) { console.error(error) }
    this.listeners.forEach(listener => {
      listener?.(...args)
    })
  }

  /**
   * @param {Function} callback 
   */
  addListener(callback) {
    if (typeof callback != 'function') return

    if (!this.listeners.includes(callback)) this.listeners.push(callback)
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(_callback => _callback !== callback)
  }

  /**
   * @param {Object} data 
   * @param {String} data.token_name
   * @param {String} data.token_id
   * @param {String} data.token_symbol
   * @param {Number} data.amount
   * @param {Number} data.value
   * @param {String} data.address
   * @param {String} data.source
   * @param {String} data.txid
   * @param {Number} data.index
   * @param {String} data.address_path
   * @param {String[]} data.senders
   */
  parseWebsocketDataReceived(data) {
    const response = {
      amount: data?.amount,
      value: data?.value,
      txid: data?.txid,
      index: data?.index,
      address: data?.address,
      tokenName: data?.token_name,
      tokenId: data?.token_id,
      tokenSymbol: data?.token_symbol,
      addressPath: data?.address_path,
      senders: Array.isArray(data?.senders) ? data?.senders : [data?.senders],
      source: data?.source,
      logo: null,
    }

    if (!response?.amount && response?.value) response.amount = Math.round(response?.value) / 10 ** 8

    if (typeof response.tokenSymbol === 'string') response.tokenSymbol = response.tokenSymbol.toUpperCase()
    if (response.tokenSymbol === 'BCH') response.logo = 'bch-logo.png'
    return response
  }
}
