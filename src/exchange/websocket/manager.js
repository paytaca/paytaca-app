import { bus } from 'src/wallet/event-bus'
import { WebSocketService } from 'src/exchange/websocket/service'
import { Store } from 'src/store'
import { getAuthToken } from 'src/exchange/auth'
import { backend } from 'src/exchange/backend'
import { fetchP2PAvailability, isP2PAvailabilityError } from 'src/exchange/availability'
import { Notify } from 'quasar'
import { markRaw } from 'vue'

export class WebSocketManager {
  constructor () {
    this.url = null
    this.retryCount = 0
    this.maxRetries = 5
    this.baseBackoff = 1000
    this.backoffMultiplier = 2
    this.websocketService = null
    this.pingInterval = null
    this.reconnectTimer = null
    this.authenticationTimer = null
    this.generation = 0
    this.ready = false
    this.stopped = true
    this.connecting = false
  }

  setWebSocketUrl (url, { userType = 'peer' } = {}) {
    if (this.url === url && this.userType === userType && !this.stopped) return
    this.closeConnection()
    this.url = url
    this.userType = userType
    this.privateStream = /\/ws\/ramp-p2p\/subscribe\/(order|general)\/[^/]+\/$/.test(url)
    this.stopped = false
    this.retryCount = 0
    this.scope = this._currentScope()
    if (this.privateStream) {
      this.unwatch = Store.watch(() => this._currentScope(), () => this.closeConnection(), { flush: 'sync' })
      this.unwatchUser = Store.watch(() => {
        const user = Store.getters['ramp/getUser']
        return user ? (user.user_type || (user.is_arbiter ? 'arbiter' : 'peer')) : null
      }, (next, previous) => {
        if (previous && previous !== next) this.closeConnection()
      }, { flush: 'sync' })
      this.onRelogged = () => {
        if (!this.stopped && !this.websocketService && this.scope === this._currentScope()) {
          this.blocked = false
          this._connectToWebSocket()
        }
      }
      this.onAuthCleared = ({ walletHash, userType }) => {
        if (walletHash === this.walletHash && (!userType || userType === this.userType)) {
          this.blocked = true
          this._disconnect()
        }
      }
      bus.on('relogged', this.onRelogged)
      bus.on('p2p-auth-cleared', this.onAuthCleared)
    }
    this._connectToWebSocket()
  }

  _currentScope () {
    return JSON.stringify([
      Store.getters['global/getWallet']('bch')?.walletHash,
      Store.getters['global/getWalletIndex'],
      Store.getters['global/isChipnet']
    ])
  }

  isOpen () {
    return this.ready && !!this.websocketService?.isOpen()
  }

  _disconnect () {
    this.generation++
    this.connecting = false
    this.ready = false
    clearTimeout(this.reconnectTimer)
    clearTimeout(this.authenticationTimer)
    this.reconnectTimer = null
    this.authenticationTimer = null
    this._stopKeepAlive()
    const service = this.websocketService
    this.websocketService = null
    service?.closeConnection({ retry: false })
  }

  closeConnection () {
    this.stopped = true
    this._disconnect()
    this.unwatch?.()
    this.unwatch = null
    this.unwatchUser?.()
    this.unwatchUser = null
    if (this.onRelogged) bus.off('relogged', this.onRelogged)
    if (this.onAuthCleared) bus.off('p2p-auth-cleared', this.onAuthCleared)
    this.rejectedToken = null
    this.blocked = false
  }

  subscribeToMessages (callback) {
    this.messageCallback = callback
  }

  sendMessage (message) {
    if (this.isOpen()) this.websocketService.sendMessage(message)
  }

  async _connectToWebSocket () {
    if (this.stopped || this.blocked || this.connecting || this.websocketService) return
    if (this.privateStream && this.scope !== this._currentScope()) return
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.connecting = true
    const generation = this.generation
    let credentials = null
    try {
      if (this.privateStream) {
        this.walletHash = Store.getters['global/getWallet']('bch')?.walletHash
        const token = await getAuthToken(this.userType)
        if (generation !== this.generation || this.scope !== this._currentScope()) return
        if (!this.walletHash || !token) {
          this.blocked = true
          bus.emit('session-expired')
          return
        }
        const rawToken = token.replace(/^Token\s+/i, '')
        if (rawToken === this.rejectedToken) {
          this.blocked = true
          return
        }
        const account = this.url.match(/\/general\/([^/]+)\/$/)
        if (account && account[1] !== this.walletHash) {
          this.closeConnection()
          return
        }
        credentials = { type: 'authenticate', wallet_hash: this.walletHash, token: rawToken }
      }
      if (generation !== this.generation || this.stopped) return
      const service = markRaw(new WebSocketService(this.url))
      this.websocketService = service
      service.subscribeToEvents(event => {
        if (service !== this.websocketService) return
        if (event.type === 'open') {
          if (this.privateStream) {
            service.sendMessage(JSON.stringify(credentials))
            this.authenticationTimer = setTimeout(() => {
              if (service === this.websocketService && !this.ready) {
                this.rejectedToken = credentials.token
                this.blocked = true
                this._disconnect()
                bus.emit('session-expired')
              }
            }, 10000)
          } else {
            this.ready = true
            this.retryCount = 0
            this._startKeepAlive()
          }
        } else if (event.type === 'close') {
          if (this.privateStream && [4401, 4403].includes(event.code)) this.rejectedToken = credentials.token
          this._onWebSocketClose(event)
        }
      })
      service.subscribeToMessages(data => {
        if (service !== this.websocketService) return
        let message
        try {
          message = JSON.parse(data)
        } catch {
          return
        }
        if (this.privateStream && !this.ready) {
          if (message.type !== 'ConnectionMessage') return
          clearTimeout(this.authenticationTimer)
          this.authenticationTimer = null
          this.ready = true
          this.retryCount = 0
          this.rejectedToken = null
          this._startKeepAlive()
        }
        this.messageCallback?.(message)
      })
    } catch {
      if (generation === this.generation && !this.stopped) {
        this.blocked = true
        bus.emit('network-error')
      }
    } finally {
      if (generation === this.generation) this.connecting = false
    }
  }

  _onWebSocketClose (event) {
    this._disconnect()
    if (this.stopped) return
    if (this.privateStream && [4401, 4403].includes(event.code)) {
      this.blocked = true
      if (event.code === 4401) bus.emit('session-expired')
      else this._checkRejectedAccess()
      return
    }
    if (event.retry && this.retryCount < this.maxRetries) {
      const backoffTime = this.baseBackoff * Math.pow(this.backoffMultiplier, this.retryCount++)
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        this._connectToWebSocket()
      }, backoffTime)
    } else if (event.retry) {
      bus.emit('websocket-disconnected', this.url)
    }
  }

  async _checkRejectedAccess () {
    const generation = this.generation
    const isCurrent = () => generation === this.generation && !this.stopped && this.scope === this._currentScope()
    try {
      await fetchP2PAvailability(backend)
      if (!isCurrent()) return
      const response = await backend.get('/auth/', { authorize: this.userType, cache: false })
      if (!isCurrent()) return
      if (!response.data?.is_authenticated) bus.emit('session-expired')
      else Notify.create({ type: 'error', message: 'P2P subscription access was rejected. Please check your account and order access.', timeout: 5000 })
    } catch (error) {
      if (!isCurrent()) return
      if (isP2PAvailabilityError(error)) bus.emit('p2p-unavailable', error)
      else if (![401, 403].includes(error?.response?.status)) bus.emit('network-error')
    }
  }

  _startKeepAlive () {
    this._stopKeepAlive()
    this.pingInterval = setInterval(() => {
      this.sendMessage(JSON.stringify({ type: 'ping' }))
    }, 30000)
  }

  _stopKeepAlive () {
    clearInterval(this.pingInterval)
    this.pingInterval = null
  }
}

export const webSocketManager = new WebSocketManager()
