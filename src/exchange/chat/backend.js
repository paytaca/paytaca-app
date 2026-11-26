import { signMessage } from 'src/utils/bch-keys'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { loadRampWallet, wallet } from 'src/exchange/wallet'
import axios from 'axios'
import { generateChatIdentityRef } from '.'
import { getCurrentWalletStorageKey, getWalletStorageKey } from 'src/utils/wallet-storage'
import { requestManager } from 'src/utils/request-manager'
import { Store } from 'src/store'
import { bus } from 'src/wallet/event-bus'
import { assertP2PIdentity } from 'src/exchange/backend'


export const chatBackend = axios.create({
  baseURL: process.env.MARKETPLACE_BASE_URL || 'https://commercehub.paytaca.com/api'
})

requestManager.attachTo(chatBackend)

let chatEpoch = 0
let chatIdentityVerification = null
let pendingChatIdentityVerification = null
let chatVerificationVersion = 0

function clearChatIdentityVerification () {
  chatVerificationVersion++
  chatIdentityVerification = null
  pendingChatIdentityVerification = null
}

for (const event of ['p2p-auth-cleared', 'relogged']) {
  bus.on(event, () => {
    chatEpoch++
    clearChatIdentityVerification()
  })
}

function chatScope () {
  const user = Store.getters['ramp/getUser']
  return JSON.stringify([
    Store.getters['global/getWallet']('bch')?.walletHash,
    Store.getters['global/getWalletIndex'], Store.getters['global/isChipnet'],
    user?.user_type || (user?.is_arbiter ? 'arbiter' : 'peer'), user?.id,
    user?.chat_identity_id, user?.public_key, user?.address, user?.address_path, user?.is_disabled, chatEpoch
  ])
}

function assertChatScope (scope) {
  if (scope !== chatScope()) {
    throw Object.assign(new Error('The active P2P chat account changed. Please reopen chat.'), { code: 'p2p_identity_mismatch' })
  }
}

async function verifyChatSigningIdentity (userType) {
  const scope = chatScope()
  const activeWallet = wallet
  const version = chatVerificationVersion
  if (chatIdentityVerification?.scope === scope && chatIdentityVerification.wallet === activeWallet &&
      Date.now() >= chatIdentityVerification.verifiedAt && chatIdentityVerification.expiresAt > Date.now()) {
    try {
      activeWallet.assertIdentity(chatIdentityVerification.profile)
      return chatIdentityVerification.profile
    } catch (error) {
      clearChatIdentityVerification()
      throw error
    }
  }
  if (pendingChatIdentityVerification?.scope === scope && pendingChatIdentityVerification.wallet === activeWallet) {
    return pendingChatIdentityVerification.promise
  }
  const started = Date.now()
  const promise = assertP2PIdentity(null, userType).then(profile => {
    assertChatScope(scope)
    if (wallet !== activeWallet || version !== chatVerificationVersion) {
      throw Object.assign(new Error('P2P chat authentication changed. Please retry chat setup.'), { code: 'p2p_identity_mismatch' })
    }
    activeWallet.assertIdentity(profile)
    const verified = Object.freeze({ ...profile })
    chatIdentityVerification = { scope, wallet: activeWallet, profile: verified, verifiedAt: started, expiresAt: started + 30000 }
    return verified
  }).finally(() => {
    if (pendingChatIdentityVerification?.promise === promise) pendingChatIdentityVerification = null
  })
  pendingChatIdentityVerification = { scope, wallet: activeWallet, promise }
  return promise
}

chatBackend.interceptors.request.use(async (config) => {
  if (!config.forceSign) return config
  const base = new URL(chatBackend.defaults.baseURL)
  const target = new URL(config.url, `${base.href.replace(/\/$/, '')}/`)
  if (!['http:', 'https:'].includes(base.protocol) || target.origin !== base.origin ||
      base.username || base.password || target.username || target.password) throw new Error('Invalid P2P chat request URL.')
  config.baseURL = chatBackend.defaults.baseURL
  config.cache = false
  if (!config.timeout) config.timeout = String(config.method).toLowerCase() === 'get' ? 10000 : 30000
  const scope = chatScope()
  config.p2pChatScope = scope
  let data = config.signData ?? config.data
  if (config.signData != null) config.headers['X-Chat-Identity-Signdata'] = config.signData
  else if (data != null) data = JSON.stringify(data)
  if (data == null) data = ''
  const timestamp = Date.now()
  const payload = Buffer.from(`${data}${timestamp}`).toString('hex')
  const signResponse = await signRequestData(payload)
  assertChatScope(scope)
  if (!signResponse.signature) throw new Error('P2P chat authentication is unavailable. Please retry chat setup.')
  const chatIdentityRef = generateChatIdentityRef(signResponse.walletHash)
  config.headers['X-Chat-Identity'] = [chatIdentityRef, timestamp, signResponse.signature].join(':')
  return config
})

chatBackend.interceptors.response.use(response => {
  if (response.config?.p2pChatScope) assertChatScope(response.config.p2pChatScope)
  return response
}, error => {
  if (error.config?.p2pChatScope) assertChatScope(error.config.p2pChatScope)
  if ([401, 403, 404].includes(error.response?.status)) {
    clearChatIdentityVerification()
    error.code = 'p2p_chat_access_denied'
    error.message = 'Chat access could not be verified. Please reopen chat to retry.'
  }
  return Promise.reject(error)
})

const SIGNER_STORAGE_KEY_PREFIX = 'ramp-api-customer-signer-data'

/**
 * Get wallet-specific storage key for chat signer data
 * @param {string} walletHash - Optional wallet hash, if not provided uses current wallet
 * @returns {string} Storage key with wallet hash
 */
function getSignerDataStorageKey(walletHash = null) {
  if (walletHash) {
    return getWalletStorageKey(SIGNER_STORAGE_KEY_PREFIX, walletHash)
  }
  return getCurrentWalletStorageKey(SIGNER_STORAGE_KEY_PREFIX)
}

export async function signRequestData (data, walletHash = null) {
  const response = { walletHash: '', signature: '' }
  const userType = Store.getters['ramp/getUser']?.user_type || (Store.getters['ramp/getUser']?.is_arbiter ? 'arbiter' : 'peer')
  const scope = chatScope()
  const signerWallet = wallet
  const registered = await verifyChatSigningIdentity(userType)
  assertChatScope(scope)
  const { value } = await getSignerData(walletHash)
  if (!value) {
    throw new Error('P2P chat signer is unavailable. Please retry chat setup.')
  }

  const [storedWalletHash, privkey] = value.split(':')
  if (!storedWalletHash || !privkey) {
    throw new Error('P2P chat signer is invalid. Please retry chat setup.')
  }
  assertChatScope(scope)
  signerWallet.assertIdentity(registered)
  if (storedWalletHash !== signerWallet.walletHash || privkey !== signerWallet.privkey() ||
      (walletHash && walletHash !== signerWallet.walletHash)) {
    throw Object.assign(new Error('The cached P2P chat signer does not match the registered identity. Signing is blocked.'), { code: 'p2p_identity_mismatch' })
  }
  response.walletHash = storedWalletHash

  response.signature = signMessage(privkey, data)
  return response
}

export async function getSignerData (walletHash = null) {
  try {
    const key = getSignerDataStorageKey(walletHash)
    const data = await SecureStoragePlugin.get({ key })
    return { success: true, value: data.value }
  } catch (error) {
    return { success: false, error: error }
  }
}

export async function setSignerData (value = '', walletHash = null) {
  try {
    const key = getSignerDataStorageKey(walletHash)
    if (!value) {
      const removeResp = await SecureStoragePlugin.remove({ key })
      return { success: removeResp.value }
    }

    const setResponse = await SecureStoragePlugin.set({ key, value: value })
    return { success: setResponse.value }
  } catch (error) {
    console.error(error)
    return { success: false, error: error }
  }
}

export async function updateSignerData () {
  console.log('Updating chat signer data')
  if (!wallet) await loadRampWallet()
  const userType = Store.getters['ramp/getUser']?.user_type || (Store.getters['ramp/getUser']?.is_arbiter ? 'arbiter' : 'peer')
  const scope = chatScope()
  const signerWallet = wallet
  const registered = await verifyChatSigningIdentity(userType)
  assertChatScope(scope)

  // fetches the verifying keypair at address path 0/0
  const verifyingPubkeyIndex = 0 // fixed verifying pubkey index at 0
  const addressPath = wallet.addressPath(verifyingPubkeyIndex)
  const privkey = wallet.privkey(addressPath)
  const verifyingPubkey = wallet.pubkey(addressPath)
  const walletHash = wallet?.walletHash

  if (!walletHash) {
    console.error('Wallet hash not available for updating signer data')
    return Promise.reject('Wallet hash not available')
  }

  // return if no need to update signer data
  const signerData = await getSignerData(walletHash)
  assertChatScope(scope)
  signerWallet.assertIdentity(registered)
  const storedWalletHash = signerData?.value?.split(':')[0]
  const storedPrivKey = signerData?.value?.split(':')[1]
  if (storedWalletHash === walletHash && storedPrivKey === privkey) {
    console.log('Chat signer data is still updated.')
    return
  }

  // generate message and signature to verify
  const message = `${Date.now()}`
  const signature = wallet.signMessage(privkey, message)

  // verify if signature is valid for address
  const valid = wallet.verifyMessage(verifyingPubkey, message, signature)
  if (!valid) return Promise.reject('Invalid signature on updateSignerData')

  // store this walletHash:privkey pair as current chat signer
  await setSignerData(`${walletHash}:${privkey}`, walletHash)
  console.log('Chat signer data updated')
}

export function getChatBackendWsUrl () {
  const baseUrl = process.env.MARKETPLACE_WS_URL
  if (!baseUrl) return ''
  const url = new URL(baseUrl)
  url.pathname = '/ws/chat/sessions/'
  url.search = ''
  url.hash = ''
  return url.toString()
}

export async function getAuthenticatedChatWsUrl (socketUrl, userType) {
  const scope = chatScope()
  const user = Store.getters['ramp/getUser']
  const currentType = user?.user_type || (user?.is_arbiter ? 'arbiter' : 'peer')
  if (!['peer', 'arbiter'].includes(userType) || userType !== currentType) {
    throw Object.assign(new Error('The P2P chat account type changed.'), { code: 'p2p_identity_mismatch' })
  }
  const base = new URL(getChatBackendWsUrl())
  const url = new URL(socketUrl)
  if (!['ws:', 'wss:'].includes(base.protocol) || url.origin !== base.origin ||
      url.username || url.password || url.search || url.hash ||
      !/^\/ws\/chat\/sessions\/[^/]+\/$/.test(url.pathname)) {
    throw new Error('Invalid P2P chat WebSocket URL.')
  }
  if (user?.chatPreparation && !await user.chatPreparation) throw new Error('P2P chat setup is unavailable. Please reopen chat to retry.')
  assertChatScope(scope)
  const started = Date.now()
  const response = await chatBackend.post('ws-auth-token/', {}, { forceSign: true, cache: false, timeout: 10000 })
  assertChatScope(scope)
  const { token, expires_in: expiresIn } = response.data || {}
  if (response.status !== 200 || response.cached === true || typeof token !== 'string' || !token.trim() ||
      token !== token.trim() || !Number.isFinite(expiresIn) || expiresIn <= 0 || Date.now() - started >= expiresIn * 1000) {
    throw new Error('P2P chat WebSocket authentication could not be confirmed.')
  }
  url.searchParams.set('ws_auth_token', token)
  return url.toString()
}
