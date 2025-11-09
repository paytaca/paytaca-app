import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { backend } from './backend'
import { wallet as rampWallet, loadRampWallet } from './wallet'
import { loadChatIdentity } from './chat'
import { bus } from 'src/wallet/event-bus'

const TOKEN_STORAGE_KEY_PREFIX = 'ramp-p2p-auth-key'

/**
 * Get wallet-specific storage key for authentication token
 * @returns {string} Storage key with wallet hash
 */
function getTokenStorageKey() {
  // Get wallet hash from rampWallet if available
  const walletHash = rampWallet?.walletHash
  if (!walletHash) {
    // If wallet not loaded yet, return a temporary key
    // This should only happen during initial load before wallet is set
    return `${TOKEN_STORAGE_KEY_PREFIX}-temp`
  }
  return `${TOKEN_STORAGE_KEY_PREFIX}-${walletHash}`
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
    const token = await getAuthToken()
    if (token && !forceLogin && this.isLoggedIn()) return token

    this.emitSignal('login')
    deleteAuthToken()

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
    saveAuthToken(loginResponse.data.token)
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

export function saveAuthToken (value) {
  const key = getTokenStorageKey()
  return SecureStoragePlugin.set({ key, value }).then(success => { return success.value })
}

export function getAuthToken () {
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure wallet is loaded to get walletHash for wallet-specific key
      if (!rampWallet?.walletHash) {
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
      
      const key = getTokenStorageKey()
      SecureStoragePlugin.get({ key })
        .then(token => {
          resolve(token.value)
        })
        .catch(async error => {
          // Fallback: try old global key for backward compatibility with existing users
          try {
            const oldToken = await SecureStoragePlugin.get({ key: TOKEN_STORAGE_KEY_PREFIX })
            // If found, trigger migration (async, non-blocking)
            if (oldToken?.value && rampWallet?.walletHash) {
              const newKey = getTokenStorageKey()
              SecureStoragePlugin.set({ key: newKey, value: oldToken.value })
                .catch(e => console.warn('Failed to migrate token:', e))
            }
            resolve(oldToken.value)
          } catch (e) {
            // No token found in either location
            resolve(null)
          }
        })
    } catch (error) {
      resolve(null)
    }
  })
}

/**
 * Delete authentication token for the current wallet
 * This is used for explicit logout scenarios
 */
export function deleteAuthToken () {
  // Only delete if wallet is loaded (has walletHash)
  if (rampWallet?.walletHash) {
    const key = getTokenStorageKey()
    SecureStoragePlugin.remove({ key })
    console.log('P2P Exchange auth token deleted for wallet:', rampWallet.walletHash)
  }
}

/**
 * Delete authentication token for a specific wallet hash
 * Useful for cleanup or explicit wallet logout
 * @param {string} walletHash - The wallet hash to delete token for
 */
export function deleteAuthTokenForWallet(walletHash) {
  if (walletHash) {
    const key = `${TOKEN_STORAGE_KEY_PREFIX}-${walletHash}`
    SecureStoragePlugin.remove({ key })
    console.log('P2P Exchange auth token deleted for wallet:', walletHash)
  }
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
