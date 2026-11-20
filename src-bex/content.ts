import { MAX_REQUEST_BYTES, isWc2Request } from 'src/utils/bex'

interface Wc2Request {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: unknown
}

interface Wc2Response {
  jsonrpc: '2.0'
  id: number
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

interface TransportRequest {
  type: 'request'
  message: Wc2Request
}

const CHANNEL = 'paytaca-bex'
const PORT_NAME = 'paytaca-content'
const RECONNECT_DELAY_MS = 1000
const RELOAD_ERROR = { code: 4900, message: 'Paytaca was updated: reload the page to reconnect' }

let port: chrome.runtime.Port | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let orphaned = false
const outbox: TransportRequest[] = []

function postToPage (message: Record<string, unknown>) {
  window.postMessage({ channel: CHANNEL, ...message }, window.location.origin)
}

function answerPage (response: Wc2Response) {
  postToPage({ type: 'response', message: response })
}

function refuse (request: TransportRequest) {
  answerPage({ jsonrpc: '2.0', id: request.message.id, error: RELOAD_ERROR })
}

function scheduleReconnect () {
  port = null
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, RECONNECT_DELAY_MS)
}

function orphan () {
  orphaned = true
  port = null
  for (const request of outbox.splice(0)) refuse(request)
  postToPage({ type: 'event', event: 'disconnect', data: RELOAD_ERROR })
}

function deliver (request: TransportRequest) {
  if (orphaned) {
    refuse(request)
    return
  }
  if (!port) {
    outbox.push(request)
    return
  }
  try {
    port.postMessage(request)
  } catch {
    outbox.push(request)
    scheduleReconnect()
  }
}

function handlePageMessage (event: MessageEvent) {
  if (event.source !== window) return
  const data = event.data as { channel?: unknown; type?: unknown; message?: unknown }
  if (data?.channel !== CHANNEL || data.type !== 'request' || !isWc2Request(data.message)) return
  const message = data.message as Wc2Request

  let serialized: string
  try {
    serialized = JSON.stringify(message)
  } catch {
    answerPage({ jsonrpc: '2.0', id: message.id, error: { code: -32602, message: 'Request params must be JSON' } })
    return
  }
  if (serialized.length > MAX_REQUEST_BYTES) {
    answerPage({ jsonrpc: '2.0', id: message.id, error: { code: -32005, message: 'Request too large' } })
    return
  }
  deliver({ type: 'request', message: JSON.parse(serialized) as Wc2Request })
}

function connect () {
  let connected: chrome.runtime.Port
  try {
    connected = chrome.runtime.connect({ name: PORT_NAME })
  } catch {
    orphan()
    return
  }
  port = connected
  orphaned = false

  connected.onMessage.addListener((message: unknown) => {
    const data = message as { type?: unknown; event?: unknown; data?: unknown; message?: unknown }
    if (data?.type === 'event') {
      postToPage({ type: 'event', event: data.event, data: data.data })
      return
    }
    if (data?.type !== 'response' || !data.message) return
    postToPage({ type: 'response', message: data.message })
  })

  connected.onDisconnect.addListener(() => {
    if (port === connected) scheduleReconnect()
  })

  for (const request of outbox.splice(0)) deliver(request)
}

window.addEventListener('message', handlePageMessage)
connect()
