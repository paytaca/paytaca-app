import { mergeDappMetadata, toWireJson } from 'src/utils/bex'

type Listener = (...args: unknown[]) => void

interface Wc2Error {
  code: number
  message: string
  data?: unknown
}

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
  error?: Wc2Error
}

interface PendingRequest {
  callerId: number
  resolve: (response: Wc2Response) => void
  timer: ReturnType<typeof setTimeout>
}

interface ProviderRequest {
  method: string
  params?: unknown
}

interface PageMetadata {
  name: string
  description?: string
  icons?: string[]
}

const CHANNEL = 'paytaca-bex'
const REQUEST_TIMEOUT_MS = 15 * 60 * 1000
const ACCOUNT_METHODS = ['bch_requestAccounts', 'bch_connect', 'bch_getAddresses', 'bch_getAccounts']
const ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAABXUExURUdwTCh5/iZ//yZ5/yd4/yh4/yh5/yl4/3doxP9RUf9SUih4//5RUf9TUyh6//9RUf9SUv5RUSh5/+dbbCh5//9UVCl5//9RUf9RUSl5//9RUSh4/yl5/2SpMQUAAAAadFJOUwDpDlz7MO7+BPpvv5xHSLUt6ZIL3hhxyNYVouonrQAAAkhJREFUSMeNVtm2gyAMpBUlCGrdW+H/v/MmQb1W0eqxnD5kMplsKMT3k9v3aF9CgLjzQDHqadJa2/a3LaDPtmJzPem6aC9JYD7bokYIv9V1XJCW6ZN4esvm+NM5nCIg6bz33cA+i/dC8i7OSBrplVROmZSd5gGBJLaP2pdSIkIpPJonyX9VM4mu8xiJQXsEeC+d7EqygLwmBoLExHcew3GOgkJk8yGD1k4zZDqKz5xSTmYeIR7fjMTDlXgC+C5tMCZS72fxba4Xkp34jEJ5PEVqZIAoOQTx2ClLUbYkHBICMF+GWVAJiceGWsRrPb7EAYCBcwklZlgqEg+i34iPMCDrc8gwx0SSJZzhRbzWK0eGHgOAST5UeBLvzYeaGKwO6apWgJ8ZPhDaPO0ovVROLqOgyuNTHxgSkkosRlG+VDbMceaB46AhwSjYp2H3JmVzyi6HFGHAbvIG/xhHtWAy8T8hFew1JIr6Fv0aqnawz+vFfipiDNjlDJjdF+NsHq8DARwxNClr7UNC1w6MMhAgZBdyvbqnAd8A/J5hM9vzFH3NRIRB9NW0iSY2QF8Mfa71Go1tYQ/YMwj77z4200cNdpmbOrrNYgzzaMaX8kEDWK7UeLZe4wwYDZzs1qiGqj/f3keGqi6ulv1Rw+v6OjlWGq6vuGOlf1yJAQBfvfQToGhr3wV0jhYRLq6bABh4R+D8P6ggNxig4asBU4XHHQBvbUfzf5OBZnh4KL5IEXSHgbZ2Q9tUStfd/C4RfAE550u4hyBIaTpT/jD/A8pHQGEunbxWAAAAAElFTkSuQmCC'

class ProviderRpcError extends Error {
  code: number
  data?: unknown

  constructor (code: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ProviderRpcError'
    this.code = code
    this.data = data
  }
}

const pending = new Map<number, PendingRequest>()
const listeners = new Map<string, Set<Listener>>()
let nextWireId = crypto.getRandomValues(new Uint32Array(1))[0]! * 2 ** 20
let nextRequestId = 1
let chainId: string | undefined
let networkVersion: string | undefined
let accounts: string[] = []
let connectAnnounced = false
let declaredMetadata: unknown

function emit (event: string, data: unknown) {
  for (const listener of [...listeners.get(event) ?? []]) {
    try {
      listener(data)
    } catch (error) {
      setTimeout(() => { throw error })
    }
  }
}

function stringsOf (data: unknown): string[] {
  return Array.isArray(data) ? data.filter((item): item is string => typeof item === 'string') : []
}

function setAccounts (next: string[]) {
  if (next.length === accounts.length && next.every((account, index) => account === accounts[index])) return
  const wasConnected = accounts.length > 0
  accounts = next
  emit('accountsChanged', [...next])
  emit('addressChanged', next[0])
  if (wasConnected && !next.length) emit('disconnect', { code: 4900, message: 'The site is no longer connected' })
}

function setChain (nextChainId: string) {
  if (nextChainId === chainId) return
  const known = chainId !== undefined
  chainId = nextChainId
  networkVersion = nextChainId.split(':')[1]
  if (known) emit('chainChanged', nextChainId)
}

function resolveUrl (value: unknown): unknown {
  if (typeof value !== 'string' || !value.trim()) return value
  try {
    return new URL(value, document.baseURI).href
  } catch {
    return value
  }
}

function pageMetadata (): PageMetadata {
  const description = document.querySelector('meta[name="description"]')?.getAttribute('content') ??
    document.querySelector('meta[property="og:description"]')?.getAttribute('content') ??
    ''
  const iconHref = document.querySelector('link[rel~="icon"]')?.getAttribute('href')
  const icon = iconHref ? resolveUrl(iconHref) : undefined
  return {
    name: document.title.trim().slice(0, 64) || location.host,
    ...(description.trim() ? { description: description.trim().slice(0, 256) } : {}),
    ...(typeof icon === 'string' ? { icons: [icon] } : {})
  }
}

function withResolvedIcons (metadata: unknown): unknown {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return metadata
  const record = metadata as Record<string, unknown>
  return {
    ...record,
    ...(Array.isArray(record.icons) ? { icons: record.icons.map(resolveUrl) } : {}),
    ...(record.icon !== undefined ? { icon: resolveUrl(record.icon) } : {})
  }
}

function paramsWithMetadata (method: string, params: unknown): unknown {
  if (method !== 'bch_requestAccounts' && method !== 'bch_connect') return params
  const plain = params && typeof params === 'object' && !Array.isArray(params)
    ? params as Record<string, unknown>
    : undefined
  const supplied = withResolvedIcons(plain?.dappMetadata)
  if (supplied !== undefined && supplied !== null) declaredMetadata = supplied
  return { ...plain, dappMetadata: mergeDappMetadata(declaredMetadata, pageMetadata()) }
}

function handleProviderEvent (event: unknown, data: unknown) {
  if (event === 'connect') {
    const nextChainId = (data as { chainId?: unknown } | undefined)?.chainId
    if (typeof nextChainId !== 'string') return
    setChain(nextChainId)
    if (connectAnnounced) return
    connectAnnounced = true
    emit('connect', { chainId: nextChainId })
  } else if (event === 'chainChanged') {
    if (typeof data === 'string') setChain(data)
  } else if (event === 'accountsChanged') {
    setAccounts(stringsOf(data))
  } else if (event === 'disconnect') {
    setAccounts([])
  }
}

function send (message: Wc2Request): Promise<Wc2Response> {
  if (message?.jsonrpc !== '2.0' || typeof message.id !== 'number' || typeof message.method !== 'string') {
    return Promise.reject(new TypeError('Invalid JSON-RPC request'))
  }
  let params: unknown
  try {
    params = paramsWithMetadata(message.method, toWireJson(message.params))
  } catch {
    return Promise.reject(new TypeError('Request params must be JSON, apart from Uint8Array and bigint values'))
  }

  const wireId = nextWireId++
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(wireId)
      resolve({ jsonrpc: '2.0', id: message.id, error: { code: 4000, message: 'Paytaca request timed out' } })
    }, REQUEST_TIMEOUT_MS)
    pending.set(wireId, { callerId: message.id, resolve, timer })
    window.postMessage({ channel: CHANNEL, type: 'request', message: { ...message, id: wireId, params } }, window.location.origin)
  })
}

async function request ({ method, params }: ProviderRequest): Promise<unknown> {
  const response = await send({ jsonrpc: '2.0', id: nextRequestId++, method, params })
  if (response.error) {
    throw new ProviderRpcError(response.error.code, response.error.message, response.error.data)
  }
  const result = response.result
  if (ACCOUNT_METHODS.includes(method)) {
    setAccounts(stringsOf(result))
  } else if (method === 'bch_disconnect') {
    setAccounts([])
  } else if (method === 'bch_getNetwork' && result && typeof result === 'object') {
    const network = result as { chainId?: unknown }
    if (typeof network.chainId === 'string') setChain(network.chainId)
  }
  return result
}

const provider = Object.freeze({
  isPaytaca: true,
  isBitcoinCash: true,

  send,
  request,

  on (event: string, listener: Listener) {
    if (typeof listener !== 'function') return provider
    const eventListeners = listeners.get(event) ?? new Set<Listener>()
    eventListeners.add(listener)
    listeners.set(event, eventListeners)
    return provider
  },

  removeListener (event: string, listener: Listener) {
    listeners.get(event)?.delete(listener)
    return provider
  },

  get chainId () {
    return chainId
  },

  get networkVersion () {
    return networkVersion
  },

  get selectedAddress () {
    return accounts[0]
  },

  isConnected () {
    return accounts.length > 0
  },

  enable () {
    return request({ method: 'bch_requestAccounts', params: {} })
  },

  async address (): Promise<string | undefined> {
    try {
      return stringsOf(await request({ method: 'bch_getAddresses', params: {} }))[0]
    } catch {
      return undefined
    }
  },

  signTransaction (options: unknown): Promise<unknown> {
    return request({ method: 'bch_signTransaction', params: options }).catch(() => undefined)
  },

  signMessage (options: unknown): Promise<unknown> {
    return request({ method: 'bch_signMessage', params: options }).catch(() => undefined)
  },

  async connect (options?: { chainId?: string; dappMetadata?: unknown }): Promise<void> {
    const params: Record<string, unknown> = {}
    if (options?.chainId !== undefined) params.chainId = options.chainId
    if (options?.dappMetadata !== undefined) params.dappMetadata = options.dappMetadata
    await request({ method: 'bch_requestAccounts', params }).catch(() => undefined)
  },

  async connected (): Promise<boolean> {
    return (await provider.address()) !== undefined
  },

  async disconnect (): Promise<void> {
    await request({ method: 'bch_disconnect', params: {} }).catch(() => undefined)
  }
})

window.addEventListener('message', (event) => {
  if (event.source !== window) return
  const data = event.data as { channel?: unknown; type?: unknown; message?: Wc2Response; event?: unknown; data?: unknown }
  if (data?.channel !== CHANNEL) return

  if (data.type === 'event') {
    handleProviderEvent(data.event, data.data)
    return
  }

  if (data.type !== 'response' || !data.message) return
  const response = data.message
  if (response.jsonrpc !== '2.0' || typeof response.id !== 'number') return
  const entry = pending.get(response.id)
  if (!entry) return
  pending.delete(response.id)
  clearTimeout(entry.timer)
  entry.resolve({ ...response, id: entry.callerId })
})

for (const name of ['paytaca', 'bitcoincash']) {
  if (!(name in window)) {
    Object.defineProperty(window, name, { value: provider, configurable: false, writable: false })
  }
}

const announceDetail = Object.freeze({
  info: Object.freeze({
    uuid: crypto.randomUUID(),
    name: 'Paytaca',
    icon: ICON,
    rdns: 'com.paytaca.app'
  }),
  provider
})

function announceProvider () {
  window.dispatchEvent(new CustomEvent('bitcoincash:announceProvider', { detail: announceDetail }))
}

window.addEventListener('bitcoincash:requestProvider', announceProvider)
announceProvider()
