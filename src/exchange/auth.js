import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { backend } from './backend'
import { wallet as rampWallet } from './wallet'
import { loadChatIdentity } from './chat'
import { bus } from 'src/wallet/event-bus'
const TOKEN_STORAGE_KEY = 'ramp-p2p-auth-key'

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

async function fetchUser () {
  const { data: userData } = await backend.get('/auth/')
  return new ExchangeUser(userData)
}

export async function loadAuthenticatedUser (forceLogin = false) {
  try {
    const user = await fetchUser()
    user.emitSignal(null, { signal: 'logging-in', data: true })
    await user.login(!user.is_authenticated || forceLogin)
    await Promise.all([user.fetchChatIdentity(), user.savePubkeyAndAddress()])
    user.emitSignal(null, { signal: 'logging-in', data: false })
    return Promise.resolve(user)
  } catch (error) {
    bus.emit('logging-in', false)
    return Promise.reject(error)
  }
}

export function saveAuthToken (value) {
  SecureStoragePlugin.set({ TOKEN_STORAGE_KEY, value }).then(success => { return success.value })
}

export function getAuthToken () {
  return new Promise((resolve, reject) => {
    SecureStoragePlugin.get({ TOKEN_STORAGE_KEY })
      .then(token => {
        resolve(token.value)
      })
      .catch(error => {
        console.error('Item with specified key does not exist:', error)
        resolve(null)
      })
  })
}

export function deleteAuthToken () {
  SecureStoragePlugin.remove({ TOKEN_STORAGE_KEY })
  console.log('P2P Exchange auth token deleted')
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
