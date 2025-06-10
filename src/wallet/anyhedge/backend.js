import { decodeExtendedJson } from '@generalprotocols/anyhedge'
import axios from 'axios'

const baseUrl = new URL(process.env.ANYHEDGE_BACKEND_BASE_URL)
//const baseUrl = new URL('https://watchtower.cash/api')
export const generalProtocolLPAuthToken = process.env.ANYHEDGE_SETTLEMENT_AUTH_TOKEN
const generalProtocolLPBaseUrl = process.env.GENERAL_PROTOCOLS_LP_BASE_URL || 'https://liquidity.anyhedge.com'

export const anyhedgeBackend = axios.create({
  baseURL: baseUrl.toString(),
})

export const generalProtocolLPBackend = axios.create({
  baseURL: generalProtocolLPBaseUrl,
  headers: {
    Authentication: generalProtocolLPAuthToken,
    'Content-Type': 'application/json',
  },
  transformResponse: [
    function(data, /* headers */) {
      try {
        return decodeExtendedJson(data)
      } catch {
        return data
      }
    }
  ],
})

export function connectWebsocketUpdates(walletHash) {
  const websocketUrl = new URL(baseUrl)
  websocketUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  websocketUrl.pathname = `/ws/anyhedge/updates/${walletHash}/`
  const socket = new WebSocket(websocketUrl.toString())

  return socket
}
