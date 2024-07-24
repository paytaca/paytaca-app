import { WebSocketService } from './service'

class WebSocketManager {
  constructor () {
    this.url = null
    this.retryCount = 0
    this.maxRetries = 5
    this.baseBackoff = 1000
    this.backoffMultiplier = 2
    this.websocketService = null
    this._setupEventListeners()
  }

  // Expose a method to set the WebSocket URL
  setWebSocketUrl (url) {
    this.url = url
    this._connectToWebSocket()
  }

  // Expose a method to close connection without reconnection retries
  closeConnection () {
    this.websocketService?.closeConnection({ retry: false })
  }

  // Expose a method to subscribe to messages
  subscribeToMessages (callback) {
    this.messageCallback = callback
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
        console.log('Received message:', JSON.parse(message))
        // Emit the message to subscribers (components)
        this._emitMessage(JSON.parse(message))
      })
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
        console.error('WebSocket connection failed after max retries.')
      }
    }
  }

  // Emit the message to subscribers (components)
  _emitMessage (message) {
    if (this.messageCallback) {
      this.messageCallback(message)
    }
  }
}

const mainWebSocketManager = new WebSocketManager()
export {
  mainWebSocketManager
}
