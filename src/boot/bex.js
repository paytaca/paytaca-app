import { boot } from 'quasar/wrappers'
import { watch } from 'vue'
import { isWc2Request, isWebOrigin } from 'src/utils/bex'
import { suppressHomeDialogs } from 'src/utils/home-dialog-queue'
import { BexRpcError, bexActiveWalletId, handleBexRequest, loadBexPermissions, writeBexProviderState } from 'src/wallet/bex'

const APP_PORT = 'paytaca-app'
const RECONNECT_DELAY_MS = 1000

export default boot(async () => {
  if (process.env.MODE !== 'bex') return

  const isPopupPage = await chrome.windows.getCurrent()
    .then(current => current?.type === 'popup', () => false)
  if (isPopupPage) suppressHomeDialogs()

  let port = null
  const inFlight = new Map()
  const unsent = []

  loadBexPermissions()
  watch(bexActiveWalletId, () => writeBexProviderState(), { immediate: true })

  function postResponse (response) {
    if (!port) {
      unsent.push(response)
      return
    }
    try {
      port.postMessage(response)
    } catch {
      unsent.push(response)
    }
  }

  function handleRequest (message) {
    if (typeof message.internalRequestId !== 'number' || inFlight.has(message.internalRequestId)) return
    if (!isWebOrigin(message.origin) || !isWc2Request(message.message)) return
    const { internalRequestId } = message
    const controller = new AbortController()
    inFlight.set(internalRequestId, controller)

    handleBexRequest({
      origin: message.origin,
      method: message.message.method,
      params: message.message.params
    }, controller.signal).then(
      result => postResponse({ type: 'response', internalRequestId, result }),
      error => postResponse({
        type: 'response',
        internalRequestId,
        error: {
          code: error instanceof BexRpcError ? error.code : -32603,
          message: error?.message || 'Unknown error'
        }
      })
    ).finally(() => inFlight.delete(internalRequestId))
  }

  function connect () {
    if (port) return
    let connected
    try {
      connected = chrome.runtime.connect({ name: APP_PORT })
    } catch {
      return
    }
    port = connected

    connected.onMessage.addListener(message => {
      if (message?.type === 'cancel') inFlight.get(message.internalRequestId)?.abort()
      else if (message?.type === 'request') handleRequest(message)
    })

    connected.onDisconnect.addListener(() => {
      if (port === connected) port = null
      setTimeout(connect, RECONNECT_DELAY_MS)
    })

    for (const response of unsent.splice(0)) postResponse(response)
    connected.postMessage({ type: 'ready', isPopup: isPopupPage })
  }

  connect()
})
