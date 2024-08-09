import EventEmitter from 'events'

export class WebSocketService {
  constructor (url) {
    this.retryOnClose = true
    this.url = url
    this.websocket = new WebSocket(url)

    // Set up event listeners
    this.websocket.addEventListener('open', this.onWebSocketOpen.bind(this))
    this.websocket.addEventListener('message', this.onWebSocketMessage.bind(this))
    this.websocket.addEventListener('close', this.onWebSocketClose.bind(this))

    // Initialize an event emitter for messages
    this.messageEmitter = new EventEmitter()
  }

  openConnection () {}

  closeConnection (params) {
    this.retryOnClose = params ? params.retry : this.retryOnClose
    this.websocket.close()
  }

  // Event handlers
  onWebSocketOpen (event) {
    console.log('WebSocket connection opened')
    this.messageEmitter.emit('open', event)
  }

  onWebSocketMessage (event) {
    // Emit the message to subscribers
    this.messageEmitter.emit('message', event.data)
  }

  onWebSocketClose (event) {
    console.log('WebSocket connection closed')
    event.retry = this.retryOnClose
    this.messageEmitter.emit('close', event)
  }

  // Subscribe to WebSocket messages
  subscribeToMessages (callback) {
    this.messageEmitter.on('message', callback)
  }

  // Subscribe to WebSocket events
  subscribeToEvents (callback) {
    this.messageEmitter.on('open', callback)
    this.messageEmitter.on('close', callback)
  }
}