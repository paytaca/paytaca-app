import '#q-app/bex/background'
import {
  BEX_PERMISSION_PREFIX,
  BEX_PROVIDER_STATE_KEY,
  BEX_QUEUE_KEY,
  CHAIN_ID_MAINNET,
  CONNECT_METHODS,
  admissionError,
  approvalPopupBounds,
  changedAccounts,
  isWc2Request,
  isWebOrigin,
  itemsBefore,
  normalizePermission,
  normalizeProviderState,
  normalizeQueue,
  permissionKey,
  storageView,
  visibleAccounts
} from 'src/utils/bex'

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

interface QueuedRequest {
  internalRequestId: number
  origin: string
  tabId?: number
  message: Wc2Request
  createdAt: number
}

interface ProviderState {
  chainId: string
  network: string
  walletId: string
}

interface Outcome {
  result?: unknown
  error?: Wc2Error
}

interface AppResponse {
  type: 'response'
  internalRequestId: number
  result?: unknown
  error?: Wc2Error
}

type ProviderEvent = 'connect' | 'chainChanged' | 'accountsChanged' | 'disconnect'

const APP_PORT = 'paytaca-app'
const CONTENT_PORT = 'paytaca-content'
const QUASAR_BRIDGE_PORT = 'app'
const EXTENSION_ORIGIN = new URL(chrome.runtime.getURL('')).origin
const REQUEST_TIMEOUT_MS = 15 * 60 * 1000
const USER_REJECTED = 5000
const CONNECT_COOLDOWN_MS = 10_000
const APPROVAL_POPUP_WIDTH = 420
const APPROVAL_POPUP_HEIGHT = 760
const MAX_APP_PAGE_ATTEMPTS = 2

const storageLocked: Promise<boolean> = typeof chrome.storage.local.setAccessLevel === 'function'
  ? chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).then(() => true, () => false)
  : Promise.resolve(false)

const appPorts = new Set<chrome.runtime.Port>()
const popupPorts = new Set<chrome.runtime.Port>()
const contentPorts = new Set<chrome.runtime.Port>()

const queue: QueuedRequest[] = []
const requestTimers = new Map<number, ReturnType<typeof setTimeout>>()
const sourcePorts = new Map<number, chrome.runtime.Port>()
const connectRefusedAt = new Map<string, number>()
let dispatchedId: number | null = null
let dispatchedPort: chrome.runtime.Port | null = null
let nextInternalRequestId = Date.now()
let openingAppPage = false
let appPageAttempts = 0
const approvalWindows = new Set<number>()
const closingWindows = new Set<number>()
let closeTimer: ReturnType<typeof setTimeout> | null = null
let persistChain: Promise<void> = Promise.resolve()

function isExtensionPage (port: chrome.runtime.Port): boolean {
  const sender = port.sender
  if (sender?.origin !== EXTENSION_ORIGIN) return false
  return sender.frameId === undefined || sender.frameId === 0
}

function postEvent (port: chrome.runtime.Port, event: ProviderEvent, data: unknown) {
  try {
    port.postMessage({ type: 'event', event, data })
  } catch {
    return
  }
}

function sitePorts (origin?: string): chrome.runtime.Port[] {
  return [...contentPorts].filter(port =>
    isWebOrigin(port.sender?.origin) && (origin === undefined || port.sender?.origin === origin))
}

async function announceStorageChange (changes: Record<string, chrome.storage.StorageChange>) {
  let after: Record<string, unknown>
  try {
    after = await chrome.storage.local.get(null)
  } catch {
    return
  }
  const previous = storageView(itemsBefore(after, changes))
  const next = storageView(after)
  if (next.state && next.state.chainId !== previous.state?.chainId) {
    for (const port of sitePorts()) postEvent(port, 'chainChanged', next.state.chainId)
  }
  for (const { origin, accounts } of changedAccounts(previous, next)) {
    for (const port of sitePorts(origin)) postEvent(port, 'accountsChanged', accounts)
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return
  const relevant = Object.keys(changes)
    .some(key => key === BEX_PROVIDER_STATE_KEY || key.startsWith(BEX_PERMISSION_PREFIX))
  if (relevant) void announceStorageChange(changes)
})

async function readSite (origin: string): Promise<{ state: ProviderState | undefined; accounts: string[] }> {
  const stored = await chrome.storage.local.get([BEX_PROVIDER_STATE_KEY, permissionKey(origin)])
  const state = normalizeProviderState(stored[BEX_PROVIDER_STATE_KEY])
  const permission = normalizePermission(stored[permissionKey(origin)])
  return { state, accounts: visibleAccounts(permission, state) }
}

async function ensureAppPage () {
  if (appPorts.size > 0 || openingAppPage || appPageAttempts >= MAX_APP_PAGE_ATTEMPTS) return
  openingAppPage = true
  appPageAttempts++

  for (const windowId of [...approvalWindows]) {
    if (await chrome.windows.get(windowId).then(() => true, () => false)) {
      openingAppPage = false
      return
    }
    approvalWindows.delete(windowId)
  }

  const current = await chrome.windows.getLastFocused().catch(() => undefined)
  const bounds = current ? approvalPopupBounds(current, APPROVAL_POPUP_WIDTH) : undefined
  const created = await chrome.windows.create({
    type: 'popup',
    url: chrome.runtime.getURL('www/index.html'),
    width: APPROVAL_POPUP_WIDTH,
    height: APPROVAL_POPUP_HEIGHT,
    focused: true
  }).catch(() => undefined)
  if (created?.id !== undefined) approvalWindows.add(created.id)
  if (bounds && created?.id !== undefined) {
    await chrome.windows.update(created.id, { left: bounds.left, top: bounds.top }).catch(() => undefined)
  }
  setTimeout(() => {
    openingAppPage = false
    if (created?.id === undefined && queue.length > 0 && appPorts.size === 0) dispatchNext()
  }, 2000)
}

chrome.windows.onRemoved.addListener((windowId) => {
  if (!approvalWindows.delete(windowId)) return
  const closedByWorker = closingWindows.delete(windowId)
  for (const port of [...appPorts]) {
    if (port.sender?.tab?.windowId !== windowId) continue
    appPorts.delete(port)
    popupPorts.delete(port)
    if (dispatchedPort === port) {
      dispatchedId = null
      dispatchedPort = null
    }
  }
  const head = queue[0]
  if (closedByWorker || appPorts.size > 0 || !head) {
    dispatchNext()
    return
  }
  if (CONNECT_METHODS.has(head.message.method)) connectRefusedAt.set(head.origin, Date.now())
  void failRequest(head.internalRequestId, { code: USER_REJECTED, message: 'User rejected.' })
})

function closeAppPage (port: chrome.runtime.Port) {
  if (closeTimer) clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    closeTimer = null
    const windowId = port.sender?.tab?.windowId
    if (windowId === undefined) return
    closingWindows.add(windowId)
    chrome.windows.remove(windowId).catch(() => closingWindows.delete(windowId))
  }, 100)
}

function cancelScheduledClose () {
  if (!closeTimer) return
  clearTimeout(closeTimer)
  closeTimer = null
}

function cancelDialog (internalRequestId: number) {
  for (const appPort of appPorts) {
    try {
      appPort.postMessage({ type: 'cancel', internalRequestId })
    } catch {
      continue
    }
  }
}

function persistQueue (): Promise<void> {
  const snapshot = queue.map(entry => ({ ...entry }))
  persistChain = persistChain.then(() => chrome.storage.session.set({ [BEX_QUEUE_KEY]: snapshot }).catch(() => undefined))
  return persistChain
}

function queueIndex (internalRequestId: number): number {
  return queue.findIndex(entry => entry.internalRequestId === internalRequestId)
}

function clearRequestTimer (internalRequestId: number) {
  const timer = requestTimers.get(internalRequestId)
  if (timer) clearTimeout(timer)
  requestTimers.delete(internalRequestId)
}

function scheduleTimeout (entry: QueuedRequest) {
  clearRequestTimer(entry.internalRequestId)
  const remaining = entry.createdAt + REQUEST_TIMEOUT_MS - Date.now()
  requestTimers.set(entry.internalRequestId, setTimeout(() => {
    void failRequest(entry.internalRequestId, { code: 4000, message: 'Paytaca request timed out' })
  }, Math.max(0, remaining)))
}

function contentPortFor (entry: QueuedRequest): chrome.runtime.Port | undefined {
  const source = sourcePorts.get(entry.internalRequestId)
  if (source) return source
  if (entry.tabId === undefined) return undefined
  return [...contentPorts].find(port => port.sender?.origin === entry.origin && port.sender?.tab?.id === entry.tabId)
}

function respond (port: chrome.runtime.Port, id: number, outcome: Outcome) {
  const message = outcome.error
    ? { jsonrpc: '2.0', id, error: outcome.error }
    : { jsonrpc: '2.0', id, result: outcome.result }
  try {
    port.postMessage({ type: 'response', message })
  } catch {
    return
  }
}

function deliverResponse (entry: QueuedRequest, outcome: Outcome) {
  const port = contentPortFor(entry)
  if (port) respond(port, entry.message.id, outcome)
}

async function settleRequest (internalRequestId: number, outcome: Outcome): Promise<QueuedRequest | undefined> {
  const index = queueIndex(internalRequestId)
  if (index === -1) return undefined
  const wasHead = index === 0
  const entry = queue.splice(index, 1)[0]!
  clearRequestTimer(internalRequestId)
  await persistQueue()
  deliverResponse(entry, outcome)
  sourcePorts.delete(internalRequestId)
  if (wasHead) {
    dispatchedId = null
    dispatchedPort = null
  }
  return entry
}

async function failRequest (internalRequestId: number, error: Wc2Error) {
  const wasHead = queue[0]?.internalRequestId === internalRequestId
  const headPort = wasHead ? dispatchedPort : null
  const entry = await settleRequest(internalRequestId, { error })
  if (!entry) return
  cancelDialog(internalRequestId)
  if (queue.length > 0) {
    dispatchNext()
  } else if (headPort && popupPorts.has(headPort)) {
    closeAppPage(headPort)
  }
}

function dispatchNext () {
  if (queue.length === 0) return
  const appPort = [...appPorts].at(-1)
  if (!appPort) {
    void ensureAppPage()
    return
  }
  const entry = queue[0]
  if (!entry) return
  if (dispatchedId === entry.internalRequestId && dispatchedPort === appPort) return
  cancelScheduledClose()
  dispatchedId = entry.internalRequestId
  dispatchedPort = appPort
  try {
    appPort.postMessage({
      type: 'request',
      internalRequestId: entry.internalRequestId,
      origin: entry.origin,
      message: entry.message
    })
  } catch {
    dispatchedId = null
    dispatchedPort = null
    return
  }
  void bringToFront(appPort)
}

async function bringToFront (appPort: chrome.runtime.Port) {
  const tab = appPort.sender?.tab
  if (tab?.id === undefined) return
  await chrome.tabs.update(tab.id, { active: true }).catch(() => undefined)
  if (tab.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true }).catch(() => undefined)
}

async function handleAppResponse (response: AppResponse, appPort: chrome.runtime.Port) {
  if (response?.type !== 'response' || typeof response.internalRequestId !== 'number') return
  await queueReady
  const outcome: Outcome = response.error ? { error: response.error } : { result: response.result }
  const entry = await settleRequest(response.internalRequestId, outcome)
  if (!entry) return
  if (CONNECT_METHODS.has(entry.message.method) && response.error?.code === USER_REJECTED) {
    connectRefusedAt.set(entry.origin, Date.now())
  }
  if (queue.length > 0) {
    dispatchNext()
    return
  }
  if (popupPorts.has(appPort)) closeAppPage(appPort)
}

async function restoreQueue () {
  try {
    const stored = await chrome.storage.session.get(BEX_QUEUE_KEY)
    for (const entry of normalizeQueue(stored[BEX_QUEUE_KEY]) as QueuedRequest[]) {
      if (queueIndex(entry.internalRequestId) !== -1) continue
      queue.push(entry)
      nextInternalRequestId = Math.max(nextInternalRequestId, entry.internalRequestId + 1)
      scheduleTimeout(entry)
    }
  } catch {
    return
  }
}

const queueReady = restoreQueue()

async function enqueueRequest (port: chrome.runtime.Port, origin: string, message: Wc2Request) {
  if (queue.length === 0) appPageAttempts = 0
  const entry: QueuedRequest = {
    internalRequestId: nextInternalRequestId++,
    origin,
    ...(port.sender?.tab?.id !== undefined ? { tabId: port.sender.tab.id } : {}),
    message,
    createdAt: Date.now()
  }
  queue.push(entry)
  sourcePorts.set(entry.internalRequestId, port)
  scheduleTimeout(entry)
  await persistQueue()
  dispatchNext()
}

async function cancelQueuedRequests (origin: string): Promise<number> {
  const cancelled = queue.filter(entry => entry.origin === origin)
  if (cancelled.length === 0) return 0
  const headCancelled = queue[0]?.origin === origin
  const popupPort = headCancelled && dispatchedPort && popupPorts.has(dispatchedPort) ? dispatchedPort : null

  for (const entry of cancelled) {
    clearRequestTimer(entry.internalRequestId)
    deliverResponse(entry, { error: { code: USER_REJECTED, message: 'Request cancelled by the dApp' } })
    sourcePorts.delete(entry.internalRequestId)
    queue.splice(queue.indexOf(entry), 1)
    cancelDialog(entry.internalRequestId)
  }
  if (headCancelled) {
    dispatchedId = null
    dispatchedPort = null
  }
  await persistQueue()

  if (queue.length > 0 && dispatchedId === null) dispatchNext()
  if (popupPort && queue.length === 0) closeAppPage(popupPort)
  return cancelled.length
}

async function dropRequestsFromPort (port: chrome.runtime.Port) {
  const droppedIds = [...sourcePorts]
    .filter(([, source]) => source === port)
    .map(([internalRequestId]) => internalRequestId)
  if (!droppedIds.length) return

  let closePort: chrome.runtime.Port | null = null
  for (const internalRequestId of droppedIds) {
    const index = queueIndex(internalRequestId)
    if (index === -1) continue
    if (index === 0) {
      closePort = dispatchedPort && popupPorts.has(dispatchedPort) ? dispatchedPort : null
      dispatchedId = null
      dispatchedPort = null
    }
    queue.splice(index, 1)
    clearRequestTimer(internalRequestId)
    sourcePorts.delete(internalRequestId)
    cancelDialog(internalRequestId)
  }

  await persistQueue()
  if (queue.length > 0) dispatchNext()
  else if (closePort) closeAppPage(closePort)
}

async function restoreProviderState (port: chrome.runtime.Port, origin: string) {
  try {
    const { state, accounts } = await readSite(origin)
    postEvent(port, 'connect', { chainId: state?.chainId ?? CHAIN_ID_MAINNET })
    postEvent(port, 'accountsChanged', accounts)
  } catch {
    return
  }
}

async function handleContentRequest (port: chrome.runtime.Port, message: Wc2Request) {
  const origin = port.sender?.origin
  if (origin === undefined || !isWebOrigin(origin)) {
    respond(port, message.id, { error: { code: 4100, message: 'Paytaca serves http(s) sites only' } })
    return
  }
  if (!(await storageLocked)) {
    respond(port, message.id, { error: { code: 4900, message: 'Paytaca needs Chrome 140 or later' } })
    return
  }
  await queueReady

  try {
    switch (message.method) {
      case 'bch_getAddresses':
      case 'bch_getAccounts': {
        const { accounts } = await readSite(origin)
        respond(port, message.id, { result: accounts })
        return
      }
      case 'bch_getNetwork': {
        const { state } = await readSite(origin)
        respond(port, message.id, {
          result: { chainId: state?.chainId ?? CHAIN_ID_MAINNET, network: state?.network ?? 'mainnet' }
        })
        return
      }
      case 'bch_disconnect':
        await chrome.storage.local.remove(permissionKey(origin))
        respond(port, message.id, { result: null })
        return
      case 'bch_cancelPendingRequests': {
        const cancelledCount = await cancelQueuedRequests(origin)
        respond(port, message.id, { result: { cancelledCount } })
        return
      }
      case 'bch_requestAccounts':
      case 'bch_connect': {
        const { state, accounts } = await readSite(origin)
        const chainId = (message.params as { chainId?: unknown } | undefined)?.chainId
        if (accounts.length && (chainId === undefined || chainId === state?.chainId)) {
          respond(port, message.id, { result: accounts })
          return
        }
        if (Date.now() - (connectRefusedAt.get(origin) ?? 0) < CONNECT_COOLDOWN_MS) {
          respond(port, message.id, { error: { code: USER_REJECTED, message: 'User rejected.' } })
          return
        }
        break
      }
      case 'bch_signMessage':
      case 'personal_sign':
      case 'bch_signTransaction': {
        const { accounts } = await readSite(origin)
        if (!accounts.length) {
          respond(port, message.id, { error: { code: 4100, message: 'Unauthorized: call bch_requestAccounts first' } })
          return
        }
        break
      }
      default:
        respond(port, message.id, { error: { code: 1001, message: `Unsupported method ${message.method}` } })
        return
    }
  } catch (error) {
    respond(port, message.id, {
      error: { code: -32603, message: error instanceof Error ? error.message : 'Request failed' }
    })
    return
  }

  const refusal = admissionError(queue, origin, message)
  if (refusal) {
    respond(port, message.id, { error: refusal })
    return
  }
  await enqueueRequest(port, origin, message)
}

function answerQuasarBridge (port: chrome.runtime.Port) {
  if (!isExtensionPage(port)) {
    port.disconnect()
    return
  }
  port.postMessage({
    id: 0,
    from: 'background',
    to: QUASAR_BRIDGE_PORT,
    type: 'full',
    payload: { portList: ['background'] },
    messageType: 'event-send',
    messageProps: { event: '@quasar:ports' }
  })
}

function acceptAppPort (port: chrome.runtime.Port) {
  if (!isExtensionPage(port)) {
    port.disconnect()
    return
  }
  appPorts.add(port)
  openingAppPage = false
  appPageAttempts = 0

  port.onMessage.addListener((message: unknown) => {
    const typed = message as { type?: unknown; isPopup?: unknown } | undefined
    if (typed?.type === 'ready') {
      const windowId = port.sender?.tab?.windowId
      if (typed.isPopup === true && windowId !== undefined) {
        popupPorts.add(port)
        approvalWindows.add(windowId)
      }
      void queueReady.then(() => {
        if (queue.length === 0 && popupPorts.has(port)) closeAppPage(port)
        else dispatchNext()
      })
      return
    }
    void handleAppResponse(message as AppResponse, port)
  })

  port.onDisconnect.addListener(() => {
    const wasPopup = popupPorts.has(port)
    appPorts.delete(port)
    popupPorts.delete(port)
    if (dispatchedPort === port) {
      dispatchedId = null
      dispatchedPort = null
    }
    if (!wasPopup) dispatchNext()
  })
}

function acceptContentPort (port: chrome.runtime.Port) {
  contentPorts.add(port)
  const origin = port.sender?.origin
  if (origin !== undefined && isWebOrigin(origin)) void restoreProviderState(port, origin)

  port.onMessage.addListener((message: unknown) => {
    const request = message as { type?: unknown; message?: unknown } | undefined
    if (request?.type !== 'request') return
    if (!isWc2Request(request.message)) {
      const id = (request.message as { id?: unknown } | undefined)?.id
      respond(port, typeof id === 'number' ? id : 0, { error: { code: -32600, message: 'Invalid JSON-RPC request' } })
      return
    }
    void handleContentRequest(port, request.message as Wc2Request)
  })

  port.onDisconnect.addListener(() => {
    contentPorts.delete(port)
    void dropRequestsFromPort(port)
  })
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === QUASAR_BRIDGE_PORT) answerQuasarBridge(port)
  else if (port.name === APP_PORT) acceptAppPort(port)
  else if (port.name === CONTENT_PORT) acceptContentPort(port)
})

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== 'install') return
  void chrome.tabs.create({ url: chrome.runtime.getURL('www/index.html') })
})
