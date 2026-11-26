import axios from 'axios'
import { Notify } from 'quasar'
import { availabilityError, fetchP2PAvailability, isP2PAvailabilityError, p2pRequestFeature } from 'src/exchange/availability'
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

  if (/\/ramp-p2p\/(?:peer|ad)(?:\/|\?|$)/i.test(url)) return 'peer'

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
      config?.p2pChipnet !== Store.getters['global/isChipnet'] ||
      (Object.prototype.hasOwnProperty.call(config, 'p2pAccountType') &&
       config.p2pAccountType !== (Store.getters['ramp/getUser']?.user_type || Store.getters['ramp/getUser']?.is_arbiter))) {
    throw Object.assign(new Error('The active wallet changed. Please reopen this P2P action.'), { code: 'p2p_identity_mismatch' })
  }
}

async function authorizeRequest (config) {
  for (const headers of [config.headers, config.headers.common, config.headers[String(config.method).toLowerCase()]]) {
    if (!headers || typeof headers !== 'object') continue
    for (const name of Object.keys(headers)) {
      if (name.toLowerCase() === 'authorization') delete headers[name]
    }
  }
  delete config.auth
  if (!config.authorize) return
  const token = await getAuthToken(resolveRequestUserType(config))
  assertRequestWallet(config)
  if (typeof token !== 'string' || !token.trim()) {
    throw Object.assign(new Error('Please log in before continuing this P2P action.'), {
      code: 'p2p_auth_required',
      config,
      response: { status: 401, data: { detail: 'P2P login is required.' } }
    })
  }
  config.headers.Authorization = `Token ${token}`
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
  config.p2pAccountType = Store.getters['ramp/getUser']?.user_type || Store.getters['ramp/getUser']?.is_arbiter
  config.headers['wallet-hash'] = wallet.walletHash
  await authorizeRequest(config)
  const feature = p2pRequestFeature(config)
  if (feature) {
    try {
      await fetchP2PAvailability(backend, feature, { userType: resolveRequestUserType(config) })
      await assertP2PIdentity(null, 'peer')
    } finally {
      assertRequestWallet(config)
    }
    await authorizeRequest(config)
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
  async error => {
    if (error?.config?.p2pWalletHash) assertRequestWallet(error.config)
    if (error?.response?.status === 503 && !isP2PAvailabilityError(error)) {
      error = Object.assign(availabilityError(), { config: error.config })
    }
    const maintenanceIndicator = error?.config?.p2pMaintenanceIndicator === true && error.config.authorize === false &&
      String(error.config.method || '').toLowerCase() === 'get' &&
      /\/ramp-p2p\/feature-control\/?$/.test(String(error.config.url || '').split('?')[0])
    if (isP2PAvailabilityError(error) && !maintenanceIndicator) bus.emit('p2p-unavailable', error)
    // Handle 401 Unauthorized and 403 Forbidden errors - typically means session expired or not authenticated
    // Check if this was an authorized request (requires authentication)
    const wasAuthorizedRequest = !!error?.config?.authorize
    const status = error?.response?.status
    const metadataRead = String(error?.config?.method || '').toLowerCase() === 'get' &&
      /\/ramp-p2p\/(?:currency\/(?:fiat|crypto)(?:\/\d+)?|utils\/(?:market-price|calculate-fees)|user)\/?$/.test(String(error?.config?.url || '').split('?')[0])
    if (wasAuthorizedRequest && metadataRead && [401, 403].includes(status) && error?.code !== 'p2p_auth_required') {
      const failure = Object.assign(availabilityError(), { config: error.config, code: 'p2p_metadata_auth_failed' })
      bus.emit('p2p-authentication-failed', failure)
      return Promise.reject(failure)
    }
    
    const profileUpdate = /\/ramp-p2p\/(peer|arbiter)\/?$/.test(String(error?.config?.url || '')) &&
      ['patch', 'put'].includes(String(error?.config?.method || '').toLowerCase())
    if (profileUpdate && status === 400 && error.response?.data?.chat_identity_id) {
      const messages = error.response.data.chat_identity_id
      error.message = Array.isArray(messages) ? messages.join(' ') : String(messages)
      error.code = 'p2p_chat_link_unavailable'
      return Promise.reject(error)
    }
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
      }
      
      // Emit session-expired event to trigger authentication
      // This will show the login dialog in P2P Ramp
      // If backend explicitly says token is invalid on 401 as well, clear it.
      // Some auth backends return 401 with "Invalid token".
      const errorDetail = error?.response?.data?.detail || ''
      const errorMessage = error?.response?.data?.error || ''
      const fullErrorText = `${errorDetail} ${errorMessage}`.toLowerCase()
      if (status === 401 || /\b(?:invalid|expired)\b.*\btoken\b|\btoken\b.*\b(?:invalid|expired)\b/i.test(fullErrorText)) {
        const userType = resolveRequestUserType(error?.config)
        await deleteAuthTokenForUserType(userType)
        assertRequestWallet(error.config)
      }

      bus.emit('session-expired')
    }
    return Promise.reject(error)
  }
)

export function getBackendWsUrl () {
  return Store.getters['global/isChipnet'] ? process.env.CHIPNET_RAMP_WS_URL : process.env.MAINNET_RAMP_WS_URL || ''
}

export async function downloadPaymentProof (url, userType, { cancelToken, isCurrent = () => true } = {}) {
  const configuredBase = () => Store.getters['global/isChipnet']
    ? process.env.CHIPNET_WATCHTOWER_BASE_URL
    : process.env.MAINNET_WATCHTOWER_BASE_URL
  const baseUrl = configuredBase()
  const base = new URL(baseUrl)
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password ||
      typeof url !== 'string' || !url || url !== url.trim() || /[\\\s]/.test(url) ||
      !['peer', 'arbiter'].includes(userType)) throw new Error('Invalid payment proof URL or account')
  const image = new URL(url, base.origin)
  if (image.origin !== base.origin || image.username || image.password || image.search || image.hash ||
      (url !== image.href && url !== image.pathname) ||
      !/^\/api\/ramp-p2p\/order\/payment\/image\/\d+\/$/.test(image.pathname)) {
    throw new Error('Invalid payment proof URL')
  }
  const identity = JSON.stringify([
    Store.getters['global/getWallet']('bch')?.walletHash,
    Store.getters['global/getWalletIndex'], Store.getters['global/isChipnet']
  ])
  const check = () => {
    if (!isCurrent() || configuredBase() !== baseUrl ||
        identity !== JSON.stringify([
          Store.getters['global/getWallet']('bch')?.walletHash,
          Store.getters['global/getWalletIndex'], Store.getters['global/isChipnet']
        ])) throw new Error('The payment proof viewer changed')
  }
  check()
  const response = await backend.get(image.href, {
    authorize: userType,
    responseType: 'blob',
    timeout: 30000,
    cache: false,
    cancelToken,
    p2pRegistrationCheck: check
  })
  check()
  return response
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

export async function assertP2PIdentity (member = null, userType = 'peer', registered = null) {
  const activeWallet = wallet
  if (!registered) {
    const discovery = await backend.get('/auth/', { authorize: false, cache: false, params: { _fresh: Date.now() }, timeout: 10000 })
    if (discovery.status !== 200 || discovery.cached === true) throw new Error('The registered P2P identity could not be verified.')
    registered = discovery.data
  }
  if ((registered?.is_arbiter ? 'arbiter' : 'peer') !== userType) {
    throw Object.assign(new Error('The current P2P account type cannot perform this action.'), { code: 'p2p_account_type_mismatch' })
  }
  const url = userType === 'peer' ? '/ramp-p2p/peer/' : `/ramp-p2p/arbiter/${activeWallet.walletHash}/`
  const response = await backend.get(url, { authorize: userType, cache: false, params: { _fresh: Date.now() }, timeout: 10000 })
  if (response.status !== 200 || response.cached === true) throw new Error('The registered P2P identity could not be verified. Signing and funding are blocked.')
  if (response.data?.id == null || String(response.data.id) !== String(registered?.id) ||
      response.data?.public_key !== registered?.public_key || response.data?.address !== registered?.address || response.data?.is_disabled === true) {
    throw Object.assign(new Error('The authenticated P2P profile does not match the registered identity.'), { code: 'p2p_identity_mismatch' })
  }
  activeWallet.assertIdentity(registered)
  activeWallet.assertIdentity({ ...registered, ...response.data, address_path: response.data.address_path ?? registered.address_path })
  if (activeWallet !== wallet) throw Object.assign(new Error('The active P2P wallet changed. Please reopen this P2P action.'), { code: 'p2p_identity_mismatch' })
  if (member) activeWallet.assertIdentity(member)
  return { ...registered, chat_identity_id: response.data.chat_identity_id, is_authenticated: true }
}

export async function updatePubkeyAndAddress (user) {
  wallet.assertIdentity(user)
  return { success: true, data: user }
}

const pendingAppealRequests = new Map()

export async function ensureAppealPending (appealId, orderId, action) {
  const statuses = { refund: ['RFN_PN', 'RFN'], release: ['RLS_PN', 'RLS'] }[action]
  if (!statuses || !appealId || !orderId) throw new Error('Invalid appeal settlement request.')
  const scope = {
    p2pWalletHash: Store.getters['global/getWallet']('bch')?.walletHash,
    p2pWalletIndex: Store.getters['global/getWalletIndex'],
    p2pChipnet: Store.getters['global/isChipnet']
  }
  const key = JSON.stringify([scope, appealId, orderId, action])
  if (pendingAppealRequests.has(key)) return pendingAppealRequests.get(key)
  const refreshOrder = async () => {
    const response = await backend.get(`/ramp-p2p/order/${orderId}/`, {
      authorize: 'arbiter', cache: false, params: { _fresh: Date.now() }, timeout: 10000
    })
    assertRequestWallet(scope)
    if (response.status !== 200 || response.cached === true) throw new Error('Unable to refresh the order status.')
    return response.data?.status?.value
  }
  const request = (async () => {
    const status = await refreshOrder()
    if (statuses.includes(status)) return
    if (status !== 'APL') throw new Error('The order is no longer awaiting this appeal decision. Refresh the order before continuing.')
    try {
      await backend.post(`/ramp-p2p/appeal/${appealId}/pending-${action}/`, {}, { authorize: 'arbiter', timeout: 10000 })
    } catch (error) {
      if (error.response?.status === 400) {
        if (statuses.includes(await refreshOrder())) return
      }
      throw error
    }
  })()
  pendingAppealRequests.set(key, request)
  try {
    return await request
  } finally {
    if (pendingAppealRequests.get(key) === request) pendingAppealRequests.delete(key)
  }
}

export function p2pErrorMessage (error, fallback) {
  const messages = value => {
    if (typeof value === 'string') return [value]
    if (Array.isArray(value)) return value.flatMap(messages)
    if (value && typeof value === 'object') return Object.values(value).flatMap(messages)
    return []
  }
  return messages(error?.response?.data).join(' ') || fallback
}
