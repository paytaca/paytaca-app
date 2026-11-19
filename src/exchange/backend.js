import axios from 'axios'
import { Notify } from 'quasar'
import { fetchP2PAvailability, isP2PAvailabilityError, p2pRequestFeature } from 'src/exchange/availability'
import { Store } from 'src/store'
import { deleteAuthTokenForUserType, getAuthToken } from './auth'
import { wallet } from './wallet'

import { bus } from 'src/wallet/event-bus'
import { requestManager } from 'src/utils/request-manager'

export const backend = axios.create()

requestManager.attachTo(backend)

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

  if (/\/ramp-p2p\/peer(?:\/|$)/i.test(url)) return 'peer'

  // Try from store
  const storedUser = Store.getters?.['ramp/getUser']
  if (storedUser?.user_type === 'peer' || storedUser?.user_type === 'arbiter') return storedUser.user_type
  if (storedUser?.is_arbiter === true) return 'arbiter'
  if (storedUser?.is_arbiter === false) return 'peer'

  return 'peer'
}

function assertRequestWallet (config) {
  if (config?.p2pWalletHash !== Store.getters['global/getWallet']('bch')?.walletHash ||
      config?.p2pWalletIndex !== Store.getters['global/getWalletIndex'] ||
      config?.p2pChipnet !== Store.getters['global/isChipnet']) {
    throw Object.assign(new Error('The active wallet changed. Please reopen this P2P action.'), { code: 'p2p_identity_mismatch' })
  }
}

backend.interceptors.request.use(async (config) => {
  config.p2pRegistrationCheck?.()
  const isChipnet = Store.getters['global/isChipnet']
  config.baseURL = isChipnet
    ? (process.env.CHIPNET_WATCHTOWER_BASE_URL || '')
    : (process.env.MAINNET_WATCHTOWER_BASE_URL || '')
  const wallet = Store.getters['global/getWallet']('bch')
  config.p2pWalletHash = wallet.walletHash
  config.p2pWalletIndex = Store.getters['global/getWalletIndex']
  config.p2pChipnet = isChipnet
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
  const feature = p2pRequestFeature(config)
  if (feature) {
    await fetchP2PAvailability(backend, feature)
    await assertP2PIdentity(null, 'peer')
  }
  assertRequestWallet(config)
  config.p2pRegistrationCheck?.()
  return config
})

// Response interceptor to handle authentication errors
backend.interceptors.response.use(
  response => {
    assertRequestWallet(response.config)
    return response
  },
  error => {
    if (error?.config?.p2pWalletHash) assertRequestWallet(error.config)
    if (isP2PAvailabilityError(error)) bus.emit('p2p-unavailable', error)
    // Handle 401 Unauthorized and 403 Forbidden errors - typically means session expired or not authenticated
    // Check if this was an authorized request (requires authentication)
    const wasAuthorizedRequest = !!error?.config?.authorize
    const status = error?.response?.status
    
    const profileUpdate = /\/ramp-p2p\/(peer|arbiter)\/?$/.test(String(error?.config?.url || '')) &&
      ['patch', 'put'].includes(String(error?.config?.method || '').toLowerCase())
    if (profileUpdate && (status === 403 || (status === 400 && /public_key|address|wallet_hash|(?:registered|profile|p2p) identity|identity.*(?:immutable|chang|rotat)|immutable/i.test(JSON.stringify(error.response.data))))) {
      error.message = status === 403
        ? 'This P2P profile cannot be updated with the current account type. Use the correct peer or arbiter account.'
        : 'Changing the registered P2P identity through profile editing is unsupported. The registered identity has been preserved.'
      error.code = 'p2p_profile_rejected'
      Notify.create({ type: 'error', message: error.message, timeout: 5000 })
      return Promise.reject(error)
    }
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

let registrationRetryUntil = 0
const pendingRegistrations = new Set()
const uncertainRegistrations = new Set()

export function getRegistrationRetrySeconds () {
  return Math.max(0, Math.ceil((registrationRetryUntil - Date.now()) / 1000))
}

export async function registerP2PAccount (accountType, data, isCurrent = () => true) {
  if (!['peer', 'arbiter'].includes(accountType)) throw new Error('Unsupported P2P account type')
  const signer = wallet
  const walletHash = signer.walletHash
  const publicKey = signer.pubkey()
  const addressPath = signer.addressPath()
  const originalBody = JSON.stringify(data)
  const body = JSON.parse(JSON.stringify(data))
  if (accountType === 'arbiter' && body.public_key && body.public_key !== publicKey) throw new Error('The registration public key does not match the wallet.')
  if (accountType === 'arbiter') body.public_key = publicKey
  const serializedBody = JSON.stringify(body)
  const identity = JSON.stringify([walletHash, signer.walletIndex, signer.isChipnet, accountType])
  const check = () => {
    if (!isCurrent() || signer !== wallet || walletHash !== Store.getters['global/getWallet']('bch')?.walletHash ||
        signer.walletIndex !== Store.getters['global/getWalletIndex'] || signer.isChipnet !== Store.getters['global/isChipnet'] ||
        publicKey !== signer.pubkey() || addressPath !== signer.addressPath() || JSON.stringify(data) !== originalBody || JSON.stringify(body) !== serializedBody) {
      throw Object.assign(new Error('The registration details changed. Please try again.'), { code: 'p2p_identity_mismatch' })
    }
  }
  check()
  if (pendingRegistrations.has(identity)) throw new Error('Registration is already in progress.')
  if (getRegistrationRetrySeconds()) throw Object.assign(new Error('Please wait before retrying registration.'), { code: 'p2p_registration_throttled' })
  pendingRegistrations.add(identity)
  let submitting = false
  const config = { authorize: false, timeout: 10000, p2pRegistrationCheck: check, headers: { 'wallet-hash': walletHash, 'Content-Type': 'application/json' } }
  try {
    if (uncertainRegistrations.has(identity)) {
      try {
        await backend.get('/auth/', { ...config, cache: false })
        check()
        return { recovered: true }
      } catch (error) {
        check()
        if (error.response?.status !== 404) throw error
        uncertainRegistrations.delete(identity)
      }
    }
    const challenge = await backend.post('/ramp-p2p/registration/challenge/', {
      account_type: accountType, wallet_hash: walletHash, public_key: publicKey, data: body
    }, config)
    check()
    const { challenge_id: challengeId, message, expires_at: expiresAt } = challenge.data
    if (challenge.status !== 201 || !challengeId || typeof message !== 'string' || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()) {
      throw new Error('The registration challenge is invalid or expired. Please try again.')
    }
    const signature = signer.signMessage(signer.privkey(addressPath), message)
    check()
    submitting = true
    uncertainRegistrations.add(identity)
    const response = await backend.post(`/ramp-p2p/${accountType}/`, body, {
      ...config,
      headers: { ...config.headers, 'public-key': publicKey, 'registration-challenge': challengeId, signature }
    })
    check()
    if (response.status !== (accountType === 'peer' ? 201 : 200)) throw new Error('Unexpected registration response')
    return response
  } catch (error) {
    const status = error.response?.status
    if (submitting && status && status < 500) uncertainRegistrations.delete(identity)
    if (status === 429) {
      const retryAfter = error.response.headers?.['retry-after']
      const seconds = Number(retryAfter)
      const deadline = retryAfter != null && Number.isFinite(seconds) ? Date.now() + seconds * 1000 : Date.parse(retryAfter)
      registrationRetryUntil = Math.max(registrationRetryUntil, Number.isFinite(deadline) ? deadline : Date.now() + 60000)
    }
    const failure = new Error(status === 403
      ? 'The registration challenge or signature was rejected, expired, or already used. Please try again.'
      : status === 429 ? 'Please wait before retrying registration.'
        : submitting && (!status || status >= 500) ? 'Registration could not be confirmed. Retry to check your account before registering again.'
          : status === 400 ? 'Please check your registration details.' : 'Registration failed. Please try again.')
    failure.code = error.code === 'p2p_identity_mismatch' ? error.code : 'p2p_registration_failed'
    if (status === 400) {
      const errors = error.response.data
      const messages = ['name', 'address', 'address_path', 'public_key', 'non_field_errors', 'detail', 'error']
        .flatMap(field => typeof errors?.[field] === 'string' ? [errors[field]] : Array.isArray(errors?.[field]) ? errors[field].filter(value => typeof value === 'string') : [])
      if (messages.length) failure.message = messages.join(' ')
    }
    throw failure
  } finally {
    pendingRegistrations.delete(identity)
  }
}

export function updateP2PProfile (userType, metadata) {
  const fields = userType === 'peer' ? ['name', 'chat_identity_id'] : userType === 'arbiter' ? ['name', 'chat_identity_id', 'inactive_hours'] : null
  if (!fields) throw new Error('Unsupported P2P account type')
  const payload = Object.fromEntries(fields.filter(field => Object.prototype.hasOwnProperty.call(metadata, field)).map(field => [field, metadata[field]]))
  return backend.patch(`/ramp-p2p/${userType}/`, payload, { authorize: userType })
}

export async function assertP2PIdentity (member = null, userType = 'peer') {
  const activeWallet = wallet
  const response = await backend.get('/auth/', { authorize: userType, cache: false, params: { _fresh: Date.now() }, timeout: 10000 })
  if (response.status !== 200 || response.cached === true) throw new Error('The registered P2P identity could not be verified. Signing and funding are blocked.')
  if ((response.data?.is_arbiter ? 'arbiter' : 'peer') !== userType) {
    throw Object.assign(new Error('The current P2P account type cannot perform this action.'), { code: 'p2p_account_type_mismatch' })
  }
  activeWallet.assertIdentity(response.data)
  if (activeWallet !== wallet) throw Object.assign(new Error('The active P2P wallet changed. Please reopen this P2P action.'), { code: 'p2p_identity_mismatch' })
  if (member) activeWallet.assertIdentity(member)
  return response.data
}

export async function updatePubkeyAndAddress (user) {
  wallet.assertIdentity(user)
  return { success: true, data: user }
}
