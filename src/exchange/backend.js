import axios from 'axios'
import { Store } from 'src/store'
import { deleteAuthTokenForUserType, getAuthToken } from './auth'
import { wallet } from './wallet'

import { bus } from 'src/wallet/event-bus'

export const backend = axios.create()

/**
 * @typedef {'peer'|'arbiter'} RampUserType
 */

/**
 * Heuristic to determine which ramp token should be used for a request.
 * @param {any} config
 * @returns {RampUserType}
 */
function resolveRequestUserType (config) {
  // Explicit override
  if (config?.authorize === 'peer' || config?.authorize === 'arbiter') return config.authorize
  if (config?.userType === 'peer' || config?.userType === 'arbiter') return config.userType

  // Strong signal: inspect URL for arbiter-only areas first.
  // This avoids reusing a cached "peer" store user when navigating directly to arbiter pages.
  const url = String(config?.url || '')
  const method = String(config?.method || '').toLowerCase()
  if (
    // Arbiter-only functional areas
    /\/ramp-p2p\/appeal\b/i.test(url) ||
    /\/ramp-p2p\/order\/feedback\/arbiter\b/i.test(url) ||
    /\/ramp-p2p\/order\/\d+\/appeal\b/i.test(url) ||
    // Arbiter profile lookups like /ramp-p2p/arbiter/<walletHash>
    /\/ramp-p2p\/arbiter\/[^/?]+/i.test(url) ||
    // Arbiter state changes like PATCH /ramp-p2p/arbiter/
    (method && method !== 'get' && /\/ramp-p2p\/arbiter\/?$/i.test(url))
  ) return 'arbiter'

  // Try from store
  const storedUser = Store.getters?.['ramp/getUser']
  if (storedUser?.user_type === 'peer' || storedUser?.user_type === 'arbiter') return storedUser.user_type
  if (storedUser?.is_arbiter === true) return 'arbiter'
  if (storedUser?.is_arbiter === false) return 'peer'

  return 'peer'
}

backend.interceptors.request.use(async (config) => {
  const isChipnet = Store.getters['global/isChipnet']
  config.baseURL = isChipnet
    ? (process.env.CHIPNET_WATCHTOWER_BASE_URL || '')
    : (process.env.MAINNET_WATCHTOWER_BASE_URL || '')
  const wallet = Store.getters['global/getWallet']('bch')
  config.headers['wallet-hash'] = wallet.walletHash
  if (config.authorize) {
    const userType = resolveRequestUserType(config)
    const token = await getAuthToken(userType)
    // Only set Authorization header if token exists
    // If token is null, the request will fail with 401/403, which should trigger authentication
    if (token) {
      config.headers.Authorization = `Token ${token}`
    }
  }
  return config
})

// Response interceptor to handle authentication errors
backend.interceptors.response.use(
  response => response,
  error => {
    // Handle 401 Unauthorized and 403 Forbidden errors - typically means session expired or not authenticated
    // Check if this was an authorized request (requires authentication)
    const wasAuthorizedRequest = !!error?.config?.authorize
    const status = error?.response?.status
    
    if ((status === 401 || status === 403) && wasAuthorizedRequest) {
      // For 403 errors, check if it's a chat-related error (chat identity not ready)
      if (status === 403) {
        const errorDetail = error?.response?.data?.detail || ''
        const errorMessage = error?.response?.data?.error || ''
        const fullErrorText = `${errorDetail} ${errorMessage}`.toLowerCase()
        
        // Skip chat-related 403 errors
        if (fullErrorText.includes('chat identity') || fullErrorText.includes('chat_identity')) {
          return Promise.reject(error)
        }

        // If backend explicitly says the token is invalid, clear it so the next auth flow
        // doesn't get stuck reusing a bad token (e.g. peer token on arbiter endpoints).
        if (fullErrorText.includes('invalid token')) {
          const userType = resolveRequestUserType(error?.config)
          deleteAuthTokenForUserType(userType)
        }
      }
      
      // Emit session-expired event to trigger authentication
      // This will show the login dialog in P2P Ramp
      // If backend explicitly says token is invalid on 401 as well, clear it.
      // Some auth backends return 401 with "Invalid token".
      const errorDetail = error?.response?.data?.detail || ''
      const errorMessage = error?.response?.data?.error || ''
      const fullErrorText = `${errorDetail} ${errorMessage}`.toLowerCase()
      if (fullErrorText.includes('invalid token')) {
        const userType = resolveRequestUserType(error?.config)
        deleteAuthTokenForUserType(userType)
      }

      bus.emit('session-expired')
    }
    return Promise.reject(error)
  }
)

export function getBackendWsUrl () {
  return Store.getters['global/isChipnet'] ? process.env.CHIPNET_RAMP_WS_URL : process.env.MAINNET_RAMP_WS_URL || ''
}

export async function updatePubkeyAndAddress (user) {
  const userType = user.is_arbiter ? 'arbiter' : 'peer'
  const pubkey = wallet.pubkey()

  // Default address path is 0/0
  const addressPath = wallet.addressPath()

  const payload = {
    public_key: pubkey,
    address: wallet.address(),
    address_path: addressPath
  }

  const respdata = { success: true }
  if (payload.public_key !== user.public_key || payload.address !== user.address || payload.address_path !== user.address_path) {
    backend.patch(`/ramp-p2p/${userType}/`, payload, { authorize: true })
      .then(response => {
        console.log('Updated pubkey and address:', response.data)
        respdata.data = response.data
      })
      .catch(error => {
        console.error('Failed to update pubkey and address:', error.response || error)
        respdata.success = false
        respdata.data = error.response || error
      })
  } else {
    console.log('Local wallet keys match server keys')
    respdata.success = false
    respdata.data = 'Local wallet keys match server keys'
  }
  return respdata
}
