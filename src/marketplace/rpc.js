import { RpcWebSocketClient } from 'rpc-websocket-client';
import { backend } from './backend';


// Ideally this will be a singleton class
class MarketplaceRPCWrapper {
  /**
   * @param {Object} opts 
   * @param {Object} opts.reconnectionOpts 
   */
  constructor(opts) {
    this.reconnectionOpts = {
      enable: opts?.reconnectionOpts?.enable !== undefined ? opts?.reconnectionOpts?.enable : true,
      baseInterval: parseInt(opts?.reconnectionOpts?.baseInterval) || 5000,
      exponentialBackoff: parseFloat(opts?.reconnectionOpts?.exponentialBackoff) || 1.5,
      maxAttempts: parseInt(opts?.reconnectionOpts?.maxAttempts) || 5,
    }

    this.client = new RpcWebSocketClient()
    this._ctr = 0
    this.client.customId(() => ++this._ctr)
    this.client.onOpen(() => this._ctr = 0)
    this.client.onClose(() => this.client.ws = undefined)

    this._currentRetries = 0
    this._reconnectTimeout = null
    this.client.onOpen(() => {
      this._currentRetries = 0
      clearTimeout(this._reconnectTimeout)
      this._reconnectTimeout = null
    })

    this.client.onClose(() => {
      if (!this.reconnectionOpts.enable) return console.log('Websocket closed. Reconnection disabled.')
      if (this._currentRetries > this.reconnectionOpts.maxAttempts) return console.log('Websocket closed. Max retries reached')

      this._currentRetries += 1
      let timeout = 10000 // just a default value
      if (!Number.isNaN(this.reconnectionOpts.baseInterval) && !Number.isNaN(this.reconnectionOpts.exponentialBackoff)) {
        timeout = this.reconnectionOpts.baseInterval * (this.reconnectionOpts.exponentialBackoff ** this._currentRetries)
      }

      if (isNaN(timeout) || timeout < 0) return console.error(`Websocket closed. Invalid reconnection interval ${timeout}`)

      this._reconnectTimeout = clearTimeout(this._reconnectTimeout)
      this._reconnectTimeout = setTimeout(() => this.connect(), timeout)
    })
  }

  getUrl() {
    const backendUrl = new URL(backend.defaults.baseURL)
    const host = backendUrl.host
    const scheme = backendUrl.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${scheme}://${host}/ws/main/`
    return url
  }

  async _connect(opts={ forceReconnect: false }) {
    if (!opts?.forceReconnect && this.isConnected()) return

    await this.disconnect()

    const url = await this.getUrl()
    return await this.client.connect(url)
  }

  async connect(opts={ forceReconnect: false }) {
    if (!this._connectPromise) this._connectPromise = this._connect(opts)
    return await this._connectPromise.finally(() => this._connectPromise = null)
  }

  async disconnect() {
    this.client?.ws?.close?.()
    clearTimeout(this._reconnectTimeout)
    this._reconnectTimeout = null
  }

  isConnected() {
    return this.client?.ws?.readyState == WebSocket.OPEN
  }
}

export const marketplaceRpc = new MarketplaceRPCWrapper()
