// Notification websocket lifecycle: a ticket in the URL, one retry after the
// server rejects the handshake (4401), and exponential backoff for every other
// close. Kept out of the Vue component so the reconnect policy is unit-testable.

export const NOTIFICATION_WS_UNAUTHORIZED = 4401

const MIN_BACKOFF_MS = 1000
const MAX_BACKOFF_MS = 30000

export function buildNotificationWsUrl (walletHash, ticket, baseUrl = process.env.ENGAGEMENT_HUB_WS_URL) {
  const base = String(baseUrl || '')
  const separator = base.endsWith('/') || !base ? '' : '/'
  const url = `${base}${separator}notifications/${walletHash}/`
  if (!ticket) return url
  return `${url}?ticket=${encodeURIComponent(ticket)}`
}

export function classifyNotificationSocketClose (code) {
  return code === NOTIFICATION_WS_UNAUTHORIZED ? 'unauthorized' : 'retry'
}

export function notificationSocketBackoff (attempt) {
  return Math.min(MIN_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS)
}

export function createNotificationSocket ({
  walletHash,
  baseUrl = process.env.ENGAGEMENT_HUB_WS_URL,
  fetchTicket,
  isSigningEnabled = () => true,
  createSocket = (url) => new WebSocket(url),
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  onUnreadCount = () => {},
  log = console
}) {
  let socket = null
  let retryTimer = null
  let stopped = false
  let backoffAttempt = 0
  let unauthorizedRetries = 0
  let ticketUnavailable = false

  const connect = async () => {
    if (stopped) return null

    let ticket = null
    if (isSigningEnabled() && !ticketUnavailable) {
      try {
        ticket = await fetchTicket(walletHash)
      } catch (error) {
        ticketUnavailable = true
        log.warn('Notification websocket ticket unavailable; using the legacy URL.', error)
      }
    }
    if (stopped) return null

    const next = createSocket(buildNotificationWsUrl(walletHash, ticket, baseUrl))
    socket = next
    addListeners(next)
    return next
  }

  const addListeners = (ws) => {
    ws.addEventListener('open', () => {
      backoffAttempt = 0
    })

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data)
        if (typeof data?.unread_notifs_count === 'number') {
          onUnreadCount(data.unread_notifs_count)
        }
      } catch (error) {
        log.error('Notification websocket message was not JSON:', error)
      }
    })

    ws.addEventListener('close', (event) => {
      if (socket === ws) socket = null
      if (stopped) return

      if (classifyNotificationSocketClose(event?.code) === 'unauthorized') {
        unauthorizedRetries += 1
        if (unauthorizedRetries > 1) {
          log.warn('Notification websocket was rejected; stopping reconnect attempts.')
          return
        }
        connect()
        return
      }

      unauthorizedRetries = 0
      const delay = notificationSocketBackoff(backoffAttempt)
      backoffAttempt += 1
      retryTimer = setTimer(() => {
        retryTimer = null
        connect()
      }, delay)
    })

    ws.addEventListener('error', (event) => {
      log.error('Notification websocket error:', event)
    })
  }

  const stop = () => {
    stopped = true
    if (retryTimer) {
      clearTimer(retryTimer)
      retryTimer = null
    }
    if (socket) {
      const ws = socket
      socket = null
      try {
        ws.close()
      } catch {
        // The socket is already closed.
      }
    }
  }

  return { connect, stop }
}
