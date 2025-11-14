import axios from 'axios'
import { Store } from 'src/store'
import { getAuthToken } from './auth'
import { wallet } from './wallet'

import { bus } from 'src/wallet/event-bus'

export const backend = axios.create()
backend.interceptors.request.use(async (config) => {
  config.baseURL = Store.getters['global/isChipnet'] ? process.env.CHIPNET_WATCHTOWER_BASE_URL : process.env.MAINNET_WATCHTOWER_BASE_URL || ''  
  const wallet = Store.getters['global/getWallet']('bch')
  config.headers['wallet-hash'] = wallet.walletHash
  if (config.authorize) {
    const token = await getAuthToken()
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
    // Handle 403 Forbidden errors - typically means session expired or not authenticated
    // Check if this was an authorized request (requires authentication)
    const wasAuthorizedRequest = error?.config?.authorize === true
    if (error?.response?.status === 403 && wasAuthorizedRequest) {
      // Check if it's a chat-related 403 (chat identity not ready)
      const errorDetail = error?.response?.data?.detail || ''
      const errorMessage = error?.response?.data?.error || ''
      const fullErrorText = `${errorDetail} ${errorMessage}`.toLowerCase()
      
      // Skip chat-related 403 errors
      if (!fullErrorText.includes('chat identity') && !fullErrorText.includes('chat_identity')) {
        // Emit session-expired event to trigger authentication
        // This will show the login dialog in P2P Exchange
        bus.emit('session-expired')
      }
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
