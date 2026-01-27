import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { Store } from 'src/store'
import { backend } from './backend'
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
    this.public_key = data?.public_key
    this.address = data?.address
    this.address_path = data?.address_path
    this.user_type = data?.is_arbiter ? 'arbiter' : 'peer'
    this.is_arbiter = data?.is_arbiter
    this.is_authenticated = data?.is_authenticated
  }

  async getOTP () {
    const { data: { otp } } = await backend.get(`/auth/otp/${this.user_type}`)
    return otp
  }

  isLoggedIn () {
    return this.user.is_authenticated
  }

  async login (forceLogin) {
    const token = await getAuthToken(this.user_type)
    if (token && !forceLogin && this.isLoggedIn()) return token

    this.emitSignal('login')
    deleteAuthToken(this.user_type)

    const libauthWallet = rampWallet.wallet
    const otp = await this.getOTP()
    const addressPath = rampWallet.addressPath()
    const privkey = libauthWallet.getPrivateKeyWifAt(addressPath)
    const pubkey = libauthWallet.getPubkeyAt(addressPath)
    const signature = rampWallet.signMessage(privkey, otp)
    const body = {
      wallet_hash: rampWallet.walletHash,
      signature: signature,
      public_key: pubkey
    }
    const loginResponse = await backend.post(`/auth/login/${this.user_type}`, body)
    saveAuthToken(loginResponse.data.token, this.user_type)
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
    this.emitSignal('pubkey')

    const libauthWallet = rampWallet.wallet
    const addressPath = rampWallet.addressPath()
    const pubkey = libauthWallet.getPubkeyAt(addressPath)
    const address = libauthWallet.getAddressAt({ path: addressPath })
    const payload = {
      public_key: pubkey,
      address: address,
      address_path: addressPath
    }

    if (payload.public_key === this.public_key &&
          payload.address === this.address &&
          payload.address_path === this.address_path) {
      console.log('Local wallet keys match server keys')
      return Promise.resolve()
    }

    await backend.patch(`/ramp-p2p/${this.user_type}/`, payload, { authorize: true })
      .then(response => {
        console.log('Updated pubkey and address:', response.data)
      })

    return Promise.resolve()
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
  const { data: userData } = await backend.get('/auth/')
  return new ExchangeUser(userData)
}

export async function loadAuthenticatedUser (forceLogin = false) {
  try {
    const user = await fetchUser()

    user.emitSignal(null, { signal: 'logging-in', data: true })

    await user.login(!user.is_authenticated || forceLogin)
    
    // Fetch chat identity and save pubkey/address in parallel
    // Handle errors gracefully - chat identity might fail if not ready yet
    await Promise.allSettled([
      user.fetchChatIdentity().catch(error => {
        // Chat identity errors are expected if identity not ready yet
        // Don't log as error - it will be created/loaded when needed
        // Handle both Error objects and string errors
        const is403 = error?.response?.status === 403 || 
                     (typeof error === 'string' && error.includes('chat identity'))
        if (!is403) {
          console.error('Error fetching chat identity:', error)
        }
      }),
      user.savePubkeyAndAddress().catch(error => {
        // Pubkey/address update errors are non-critical
        // Only log if it's not a 403 (which means not authenticated, handled by login)
        // Handle both Error objects and string errors
        const is403 = error?.response?.status === 403 || 
                     (typeof error === 'string' && error.includes('pubkey'))
        if (!is403) {
          console.error('Error saving pubkey and address:', error)
        }
      })
    ])

    user.emitSignal(null, { signal: 'logging-in', data: false })

    return Promise.resolve(user)
  } catch (error) {
    console.error(error)
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
  return SecureStoragePlugin.set({ key, value }).then(success => { return success.value })
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
      if (!rampWallet?.walletHash || (currentWalletHash && rampWallet.walletHash !== currentWalletHash)) {
        try {
          await loadRampWallet()
        } catch (error) {
          // If wallet can't be loaded, try old global key as fallback
          try {
            const oldToken = await SecureStoragePlugin.get({ key: TOKEN_STORAGE_KEY_PREFIX })
            resolve(oldToken.value)
            return
          } catch (e) {
            resolve(null)
            return
          }
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
  deleteAuthTokenForUserType(userType)
  // Also remove legacy key for current wallet to prevent reusing wrong tokens.
  const walletHash = getCurrentWalletHash() || rampWallet?.walletHash
  const legacyKey = getLegacyWalletTokenStorageKey(walletHash)
  if (legacyKey) SecureStoragePlugin.remove({ key: legacyKey })
}

/**
 * Delete authentication token for a specific wallet hash
 * Useful for cleanup or explicit wallet logout
 * @param {string} walletHash - The wallet hash to delete token for
 */
export function deleteAuthTokenForWallet(walletHash) {
  if (!walletHash) return
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

  if (userType === 'peer' || userType === 'arbiter') {
    const key = `${TOKEN_STORAGE_KEY_PREFIX}-${walletHash}-${userType}`
    SecureStoragePlugin.remove({ key })
    return
  }

  // Delete both if caller passed null/undefined (or unknown)
  SecureStoragePlugin.remove({ key: `${TOKEN_STORAGE_KEY_PREFIX}-${walletHash}-peer` })
  SecureStoragePlugin.remove({ key: `${TOKEN_STORAGE_KEY_PREFIX}-${walletHash}-arbiter` })
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
