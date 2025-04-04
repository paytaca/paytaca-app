import { bus } from 'src/wallet/event-bus'
import { WebSocketService } from './service'

export class WebSocketManager {
  constructor () {
    this.url = null
    this.retryCount = 0
    this.maxRetries = 5
    this.baseBackoff = 1000
    this.backoffMultiplier = 2
    this.websocketService = null
    this.pingInterval = null
    this._setupEventListeners()
  }

  // Expose a method to set the WebSocket URL
  setWebSocketUrl (url) {
    this.url = url
    this._connectToWebSocket()
  }

  isOpen () {
    return !!this.websocketService
  }

  // Expose a method to close connection without reconnection retries
  closeConnection () {
    this.websocketService?.closeConnection({ retry: false })
  }

  // Expose a method to subscribe to messages
  subscribeToMessages (callback) {
    this.messageCallback = callback
  }

  sendMessage (message) {
    if (this.websocketService) {
      this.websocketService.sendMessage(message)
    } else {
      console.error('WebSocketService is not initialized. Unable to send message.');
    }
  }

  _setupEventListeners () {
    if (this.websocketService) {
      // Handle WebSocket events globally
      this.websocketService.subscribeToEvents((event) => {
        if (event.type === 'close') {
          this._onWebSocketClose(event)
        }
      }
      )
      this.websocketService.subscribeToMessages((message) => {
        // Emit the message to subscribers (components)
        this._emitMessage(JSON.parse(message))
      })
      this._startKeepAlive()
    }
  }

  _connectToWebSocket () {
    if (!this.websocketService) {
      this.websocketService = new WebSocketService(this.url)
      this._setupEventListeners() // Reinitialize event listeners
    }
  }

  // Retry connection in exponential backoff when retry=true
  _onWebSocketClose (event) {
    this.websocketService = null
    if (event.retry) {
      if (this.retryCount < this.maxRetries) {
        const backoffTime = this.baseBackoff * Math.pow(this.backoffMultiplier, this.retryCount)
        console.log(`Retrying WebSocket in ${backoffTime} ms...`)
        setTimeout(() => {
          this.retryCount++
          this._connectToWebSocket()
        }, backoffTime)
      } else {
        bus.emit('websocket-disconnected', this.url)
        console.error('WebSocket connection failed after max retries.')
      }
    }
    this._stopKeepAlive()
  }

  _startKeepAlive () {
    this._stopKeepAlive() // Ensure no duplicate intervals
    this.pingInterval = setInterval(() => {
      if (this.websocketService && this.websocketService.isOpen()) {
        this.sendMessage(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  }

  _stopKeepAlive () {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  // Emit the message to subscribers (components)
  _emitMessage (message) {
    if (this.messageCallback) {
      this.messageCallback(message)
    }
  }
}

export const webSocketManager = new WebSocketManager()