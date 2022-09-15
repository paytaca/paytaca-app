import axios from 'axios'

const baseUrl = new URL(process.env.ANYHEDGE_BACKEND_BASE_URL)
export const generalProtocolLPAuthToken = process.env.ANYHEDGE_SETTLEMENT_AUTH_TOKEN
const generalProtocolLPBaseUrl = process.env.GENERAL_PROTOCOLS_LP_BASE_URL || 'https://staging-liquidity.anyhedge.com'

export const anyhedgeBackend = axios.create({
  baseURL: baseUrl.toString(),
})

export const generalProtocolLPBackend = axios.create({
  baseURL: generalProtocolLPBaseUrl,
  headers: { Authentication: generalProtocolLPAuthToken }
})

export function connectWebsocketUpdates(walletHash) {
  const websocketUrl = new URL(baseUrl)
  websocketUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  websocketUrl.pathname = `/ws/anyhedge/updates/${walletHash}/`
  const socket = new WebSocket(websocketUrl.toString())

  return socket
}
