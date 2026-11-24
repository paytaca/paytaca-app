import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { Store } from 'src/store'
import { backend, assertP2PIdentity } from 'src/exchange/backend'
import { wallet as rampWallet, loadRampWallet } from './wallet'
import { loadChatIdentity } from './chat'
import { bus } from 'src/wallet/event-bus'

const TOKEN_STORAGE_KEY_PREFIX = 'ramp-p2p-auth-key'

/**
 * @typedef {'peer'|'arbiter'} RampUserType
 */

/**
 * Resolve user type for token operations.
 * Defaults to peer if unknown.
 * @param {RampUserType | null | undefined} userType
 * @returns {RampUserType}
 */
function resolveUserType (userType) {
  if (userType === 'peer' || userType === 'arbiter') return userType

  // Try from ramp store user
  const storedUser = Store.getters?.['ramp/getUser']
  if (storedUser?.user_type === 'peer' || storedUser?.user_type === 'arbiter') return storedUser.user_type
  if (storedUser?.is_arbiter === true) return 'arbiter'
  if (storedUser?.is_arbiter === false) return 'peer'

  return 'peer'
}

/**
 * Get the currently selected wallet hash from the global store.
 * This is the source of truth for request headers.
 * @returns {string|null}
 */
function getCurrentWalletHash () {
  return Store.getters?.['global/getWallet']?.('bch')?.walletHash || null
}

/**
 * Get legacy (pre userType split) storage key for authentication token.
 * @param {string|null|undefined} walletHash
 * @returns {string|null}
 */
function getLegacyWalletTokenStorageKey (walletHash) {
  if (!walletHash) return null
  return `${TOKEN_STORAGE_KEY_PREFIX}-${walletHash}`
}

/**
 * Get wallet-specific storage key for authentication token
 * @returns {string} Storage key with wallet hash
 */
function getTokenStorageKey (userType) {
  userType = resolveUserType(userType)
  // Always prefer current wallet hash from store (source of truth)
  const walletHash = getCurrentWalletHash() || rampWallet?.walletHash
  if (!walletHash) {
    // If wallet not loaded yet, return a temporary key
    // This should only happen during initial load before wallet is set
    return `${TOKEN_STORAGE_KEY_PREFIX}-temp-${userType}`
  }
  return `${TOKEN_STORAGE_KEY_PREFIX}-${walletHash}-${userType}`
}

/**
 * Remove legacy (pre wallet/userType scoping) auth token keys once a
 * wallet-scoped token has been generated, so stale tokens don't accumulate.
 * @param {string|null|undefined} walletHash
 */
function removeLegacyRampTokenKeys (walletHash) {
  const keys = [TOKEN_STORAGE_KEY_PREFIX]
  const legacyWalletKey = getLegacyWalletTokenStorageKey(walletHash)
  if (legacyWalletKey) keys.push(legacyWalletKey)
  for (const key of keys) {
    SecureStoragePlugin.remove({ key }).catch(err => {
      console.warn('Failed to remove legacy ramp token:', err)
    })
  }
}

export class ExchangeUser {
  constructor (data) {
    this.raw = data
  }

  static parse (data) {
    return ExchangeUser(data)
  }

  get raw () {
    return this.raw
  }

  set raw (data) {
    this.id = data?.id
    this.name = data?.name
    this.chat_identity_id = data?.chat_identity_id
    this.wallet_hash = data?.wallet_hash
    this.public_key = data?.public_key
    this.address = data?.address
    this.address_path = data?.address_path
    this.user_type = data?.is_arbiter ? 'arbiter' : 'peer'
    this.is_arbiter = data?.is_arbiter
    this.is_authenticated = data?.is_authenticated
  }

  async getOTP () {
    const { data: { otp } } = await backend.get(`/auth/otp/${this.user_type}`, { authorize: false, cache: false, timeout: 10000 })
    return otp
  }

  isLoggedIn () {
    return this.is_authenticated
  }

  async login (forceLogin) {
    const token = await getAuthToken(this.user_type)
    if (token && !forceLogin && this.isLoggedIn()) return token

    this.emitSignal('login')
    await deleteAuthToken(this.user_type)

    const otp = await this.getOTP()
    rampWallet.assertIdentity(this)
    const libauthWallet = rampWallet.wallet
    const addressPath = rampWallet.addressPath()
    const privkey = libauthWallet.getPrivateKeyWifAt(addressPath)
    const pubkey = libauthWallet.getPubkeyAt(addressPath)
    const signature = rampWallet.signMessage(privkey, otp)
    const body = {
      wallet_hash: rampWallet.walletHash,
      signature: signature,
      public_key: pubkey
    }
    const loginResponse = await backend.post(`/auth/login/${this.user_type}`, body, { authorize: false, timeout: 10000 })
    await saveAuthToken(loginResponse.data.token, this.user_type)
    return loginResponse.data.token
  }

  async fetchChatIdentity () {
    this.emitSignal('chat-identity')

    const params = {
      name: this.name,
      chat_identity_id: this.chat_identity_id
    }
    const chatIdentity = await loadChatIdentity(this.user_type, params)
    this.chat_identity = chatIdentity
  }

  async savePubkeyAndAddress () {
    rampWallet.assertIdentity(this)
  }

  emitSignal (step, params = { signal: 'next-login-step', data: '' }) {
    let data = params.data
    if (step) {
      switch (step) {
        case 'login':
          data = 'LoggingYouIn'
          break
        case 'pubkey':
          data = 'UpdatingPubkeyAndAddress'
          break
        case 'chat-identity':
          data = 'LoadingChatIdentity'
          break
      }
    }

    bus.emit(params.signal, data)
  }
}

export async function fetchUser () {
  try {
    const { data: userData } = await backend.get('/auth/', { authorize: false, cache: false, timeout: 10000 })
    return new ExchangeUser(userData)
  } catch (error) {
    const status = error?.response?.status
    const message = error?.response?.data?.error || error?.response?.data?.detail
    if (status === 404 || (status === 400 && /^user does not exist\.?$/i.test(message || ''))) {
      error.code = 'p2p_account_missing'
    }
    throw error
  }
}

export async function loadAuthenticatedUser (forceLogin = false) {
  try {
    const user = await fetchUser()

    user.emitSignal(null, { signal: 'logging-in', data: true })

    await user.savePubkeyAndAddress()
    const token = await getAuthToken(user.user_type)
    const verifySession = async () => {
      await assertP2PIdentity(null, user.user_type, user)
      user.is_authenticated = true
      return true
    }
    let needsLogin = forceLogin || !token
    if (!needsLogin) {
      try {
        needsLogin = !await verifySession()
      } catch (error) {
        if (error?.response?.status === 401 || error?.code === 'p2p_auth_required' ||
            (error?.response?.status === 403 && /\b(?:invalid|expired)\b.*\btoken\b|\btoken\b.*\b(?:invalid|expired)\b/i.test(`${error.response.data?.detail || ''} ${error.response.data?.error || ''}`))) {
          needsLogin = true
        } else {
          throw error
        }
      }
    }
    await user.login(needsLogin)
    if (needsLogin && !await verifySession()) throw new Error('P2P login could not be confirmed.')
    
    await user.savePubkeyAndAddress()
    Store.commit('ramp/updateUser', user)
    const chatScope = JSON.stringify([
      getCurrentWalletHash(), Store.getters['global/getWalletIndex'], Store.getters['global/isChipnet']
    ])
    const isCurrent = () => chatScope === JSON.stringify([
      getCurrentWalletHash(), Store.getters['global/getWalletIndex'], Store.getters['global/isChipnet']
    ])
    const chatPreparation = Promise.resolve().then(async () => {
      if (!isCurrent()) return false
      try {
        await user.fetchChatIdentity()
      } catch (error) {
        if (!isCurrent()) return false
        if (error?.response?.status !== 401) throw error
        await user.login(true)
        if (!isCurrent()) return false
        if (!await verifySession()) throw new Error('P2P login could not be confirmed.')
        if (!isCurrent()) return false
        await user.savePubkeyAndAddress()
        await user.fetchChatIdentity()
        if (isCurrent()) bus.emit('relogged')
      }
      return isCurrent() && !!user.chat_identity
    }).catch(error => {
      if (!isCurrent()) return false
      if (error?.response?.status === 401) bus.emit('session-expired')
      else if (['p2p_chat_link_unavailable', 'p2p_identity_mismatch', 'p2p_account_type_mismatch'].includes(error?.code)) {
        bus.emit('handle-request-error', error)
      } else if (error?.response?.status !== 403) {
        console.error('Error preparing P2P chat:', error?.response?.status || error?.code || 'Request failed')
      }
      return false
    })
    Object.defineProperty(user, 'chatPreparation', { value: chatPreparation })

    user.emitSignal(null, { signal: 'logging-in', data: false })

    return Promise.resolve(user)
  } catch (error) {
    bus.emit('logging-in', false)
    return Promise.reject(error)
  }
}

export function saveAuthToken (value, userType) {
  return saveAuthTokenForUserType(value, userType)
}

/**
 * Save auth token scoped to wallet + user type.
 * @param {string} value
 * @param {RampUserType | null | undefined} userType
 */
export function saveAuthTokenForUserType (value, userType) {
  userType = resolveUserType(userType)
  const key = getTokenStorageKey(userType)
  return SecureStoragePlugin.set({ key, value }).then(success => {
    const walletHash = getCurrentWalletHash() || rampWallet?.walletHash
    if (walletHash) removeLegacyRampTokenKeys(walletHash)
    return success.value
  })
}

/**
 * @param {RampUserType | null | undefined} userType
 * @returns {Promise<string|null>}
 */
export function getAuthToken (userType) {
  userType = resolveUserType(userType)
  return new Promise(async (resolve) => {
    try {
      // Ensure ramp wallet is loaded and aligned with the current wallet hash.
      const currentWalletHash = getCurrentWalletHash()
      if (!rampWallet?.wallet || rampWallet.walletHash !== currentWalletHash || rampWallet.walletIndex !== Store.getters['global/getWalletIndex'] || rampWallet.isChipnet !== Store.getters['global/isChipnet']) {
        try {
          await loadRampWallet()
        } catch (error) {
          resolve(null)
          return
        }
      }
      
      const walletHash = getCurrentWalletHash() || rampWallet?.walletHash
      const key = getTokenStorageKey(userType)

      // 1) Preferred: new per-(wallet,userType) key
      try {
        const token = await SecureStoragePlugin.get({ key })
        resolve(token.value)
        return
      } catch (e) {
        // continue
      }

      // 2) Legacy wallet-scoped key (pre userType split)
      const legacyWalletKey = getLegacyWalletTokenStorageKey(walletHash)
      if (legacyWalletKey) {
        try {
          const legacyToken = await SecureStoragePlugin.get({ key: legacyWalletKey })
          if (legacyToken?.value) {
            // Migrate into the new key for this requested userType.
            // If it's actually the "other" userType's token, backend will reject and we'll re-login.
            SecureStoragePlugin.set({ key, value: legacyToken.value })
              .catch(err => console.warn('Failed to migrate legacy ramp token:', err))
            resolve(legacyToken.value)
            return
          }
        } catch (e) {
          // continue
        }
      }

      // 3) Old global key (very old builds)
      try {
        const oldToken = await SecureStoragePlugin.get({ key: TOKEN_STORAGE_KEY_PREFIX })
        if (oldToken?.value) {
          SecureStoragePlugin.set({ key, value: oldToken.value })
            .catch(err => console.warn('Failed to migrate global ramp token:', err))
          resolve(oldToken.value)
          return
        }
      } catch (e) {
        // continue
      }

      resolve(null)
    } catch (error) {
      resolve(null)
    }
  })
}

/**
 * Delete authentication token for the current wallet
 * This is used for explicit logout scenarios
 */
export function deleteAuthToken (userType) {
  const removal = deleteAuthTokenForUserType(userType)
  // Also remove legacy key for current wallet to prevent reusing wrong tokens.
  const walletHash = getCurrentWalletHash() || rampWallet?.walletHash
  const legacyKey = getLegacyWalletTokenStorageKey(walletHash)
  return Promise.allSettled([removal, ...(legacyKey ? [SecureStoragePlugin.remove({ key: legacyKey })] : [])])
}

/**
 * Delete authentication token for a specific wallet hash
 * Useful for cleanup or explicit wallet logout
 * @param {string} walletHash - The wallet hash to delete token for
 */
export function deleteAuthTokenForWallet(walletHash) {
  if (!walletHash) return
  bus.emit('p2p-auth-cleared', { walletHash })
  // Delete both user types + legacy key
  SecureStoragePlugin.remove({ key: `${TOKEN_STORAGE_KEY_PREFIX}-${walletHash}-peer` })
  SecureStoragePlugin.remove({ key: `${TOKEN_STORAGE_KEY_PREFIX}-${walletHash}-arbiter` })
  SecureStoragePlugin.remove({ key: `${TOKEN_STORAGE_KEY_PREFIX}-${walletHash}` })
  console.log('P2P Ramp auth tokens deleted for wallet:', walletHash)
}

/**
 * Delete authentication token for the current wallet + user type.
 * If userType is omitted, deletes both peer+arbiter tokens for current wallet.
 * @param {RampUserType | null | undefined} userType
 */
export function deleteAuthTokenForUserType (userType) {
  const walletHash = getCurrentWalletHash() || rampWallet?.walletHash
  if (!walletHash) return
  bus.emit('p2p-auth-cleared', { walletHash, userType })

  if (userType === 'peer' || userType === 'arbiter') {
    const key = `${TOKEN_STORAGE_KEY_PREFIX}-${walletHash}-${userType}`
    return Promise.allSettled([SecureStoragePlugin.remove({ key })])
  }

  // Delete both if caller passed null/undefined (or unknown)
  return Promise.allSettled([
    SecureStoragePlugin.remove({ key: `${TOKEN_STORAGE_KEY_PREFIX}-${walletHash}-peer` }),
    SecureStoragePlugin.remove({ key: `${TOKEN_STORAGE_KEY_PREFIX}-${walletHash}-arbiter` })
  ])
 }

let authController = null
export function createAuthAbortController () {
  authController = new AbortController()
  return authController
}

export function getAuthAbortController () {
  return authController
}

export function abortAuthController () {
  if (authController) {
    authController.abort()
    deleteAuthToken()
    console.log('Authentication aborted')
  }
}
