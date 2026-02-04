import BCHJS from '@psf/bch-js';
import axios from 'axios';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { capitalize } from 'vue';
import { bus } from 'src/wallet/event-bus';
import { backend } from './backend';
import { EscrowArbiter } from './objects';
import { i18n } from 'src/boot/i18n';
import { getCurrentWalletStorageKey, getWalletStorageKey } from 'src/utils/wallet-storage';
import crypto from 'crypto'
import * as secp from '@noble/secp256k1'


const { t: $t } = i18n.global
const bchjs = new BCHJS()

export function getWifPubkey(wif) {
  const ecpair = bchjs.ECPair.fromWIF(wif)
  return Buffer.from(bchjs.ECPair.toPublicKey(ecpair)).toString('hex')
}

export function getWifAddress(wif) {
  const ecpair = bchjs.ECPair.fromWIF(wif)
  return bchjs.ECPair.toCashAddress(ecpair)
}

export function parseWif(wif) {
  const pubkey = getWifPubkey(wif)
  const address = getWifAddress(wif)
  
  // Derive encryption keypair from WIF using the same method as wallet encryption
  // Hash WIF string (SHA256) as UTF-8 to get derivative privkey (matches wallet encryption behavior)
  const _sha256 = crypto.createHash('sha256')
  _sha256.update(Buffer.from(wif, 'utf8'))
  const privkey = _sha256.digest().toString('hex')
  
  // Derive pubkey from privkey
  const privBytes = secp.etc.hexToBytes(privkey)
  const pub = secp.getPublicKey(privBytes)
  const pubkeyHex = secp.etc.bytesToHex(pub)
  
  const chat = { privkey, pubkey: pubkeyHex }
  
  return { wif, pubkey, address, chat}
}

export function ecdsaSign(wif, data) {
  return bchjs.BitcoinCash.signMessageWithPrivKey(wif, data)
}

export const arbiterBackend = axios.create({
  ...backend.defaults,
})

arbiterBackend.interceptors.request.use(async (config) => {
  let token
  if (config.auth?.bearerToken) token = config.auth.bearerToken
  else {
    const getAuthTokenResp = await getArbiterKeys()
    token = getAuthTokenResp.authToken
  }

  if (token && !config.excludeAuth) config.headers['Authorization'] = `Bearer ${token}`
  return config
})


export async function getAuthKey(opts ={ wif: '', nonce: '', saveAuthToken: false, onUpdateStep: (step='') => {} }) {
  const { wif, pubkey, address, chat } = parseWif(opts?.wif)
  let nonce = opts?.nonce
  if (!nonce) {
    opts?.onUpdateStep?.('nonce')
    const authChallengeResponse = await arbiterBackend.post(
      `connecta/escrow-arbiters/auth_token/`,
      { type: 'nonce', pubkey },
      { excludeAuth: true },
    ).catch(error => {
      console.error(error)

      const err = new Error()
      err.name = 'ArbiterAuthError'
      if (error?.response?.data?.detail?.indexOf?.('No matching arbiter found')) {
        err.message = 'NoMatchingArbiterFound'
      } else {
        err.message = 'FetchChallengeFailed'
      }
      return Promise.reject(err)
    })
    nonce = authChallengeResponse.data?.nonce
  }

  opts?.onUpdateStep?.('sign')
  let signature
  try {
    signature = ecdsaSign(wif, nonce)
  } catch(error) {
    console.error(error)
    const err = new Error('AuthChallengeSignError')
    err.name = 'ArbiterAuthError'
    throw err
  }

  opts?.onUpdateStep?.('authtoken')
  const authResponse = await arbiterBackend.post(
    `connecta/escrow-arbiters/auth_token/`,
    { type: 'authtoken', nonce, pubkey, signature },
    { excludeAuth: true },
  ).catch(error => {
    console.error(error)
    const err = new Error('AuthTokenError')
    err.name = 'ArbiterAuthError'
    throw error
  })

  const authToken = authResponse.data.auth_token
  const escrowArbiter = EscrowArbiter.parse(authResponse.data?.arbiter)
  if (!escrowArbiter.pubkey === pubkey) {
    console.error(error)
    const err = new Error('IncorrectArbiterData')
    err.name = 'ArbiterAuthError'
    throw err
  }

  if (opts?.saveAuthToken) {
    opts?.onUpdateStep?.('store')
    await setArbiterKeys(wif, authToken)
    const storeResponse = await setArbiterKeys(wif, authToken)
    if (!storeResponse.success) {
      console.error(storeResponse)
      const err = new Error('SaveAuthKeyError')
      err.name = 'ArbiterAuthError'
      throw err
    }
  }

  return {
    wif, pubkey, address, chat,
    authToken,
    escrowArbiter,
  }
}

const AUTH_TOKEN_STORAGE_KEY_PREFIX = 'marketplace-arbiter-key'

/**
 * Get wallet-specific storage key for marketplace arbiter keys
 * @param {string} walletHash - Optional wallet hash, if not provided uses current wallet
 * @returns {string} Storage key with wallet hash
 */
function getArbiterKeysStorageKey(walletHash = null) {
  if (walletHash) {
    return getWalletStorageKey(AUTH_TOKEN_STORAGE_KEY_PREFIX, walletHash)
  }
  return getCurrentWalletStorageKey(AUTH_TOKEN_STORAGE_KEY_PREFIX)
}

export async function getArbiterKeys(walletHash = null) {
  try {
    const key = getArbiterKeysStorageKey(walletHash)
    const storageVal = await SecureStoragePlugin.get({ key })
    const [wif, authToken] = storageVal.value.split(':')
    return { success: true, wif, authToken } 
  } catch(error) {
    return { success: false, error: error }
  }
}

export async function setArbiterKeys(wif, authToken, walletHash = null) {
  try {
    const key = getArbiterKeysStorageKey(walletHash)
    if (!wif && !authToken) {
      const removeResp = await SecureStoragePlugin.remove({ key })
      if (removeResp.value) bus.emit('arbiter-keys-removed')
      return { success: removeResp.value }
    }

    if (!wif || typeof wif !== 'string') return { success: false, error: 'Invalid private key'}
    if (!authToken || typeof authToken !== 'string') return { success: false, error: 'Invalid auth token'}

    const value = `${wif}:${authToken}`
    const setResponse = await SecureStoragePlugin.set({ key, value: value })
    if (setResponse.value) bus.emit('arbiter-keys-updated')
    return { success: setResponse.value }
  } catch(error) {
    console.error(error)
    return { success: false, error: error }
  }
}

export async function getArbiterWifData() {
  const { wif } = await getArbiterKeys()
  if (!wif) return
  return parseWif(wif)
}

/* ---------------------------------------------------------------------------- */
/** Formatters */
/**
 * @param {'release' | 'refund' | 'full_refund' } val 
 */
export function formatSettlementApealType(val) {
  switch(val) {
    case 'release':
      return $t('Release')
    case 'refund':
      return $t('Refund')
    case 'full_refund':
      return $t('FullRefund', undefined, 'Full refund')
    default:
      return capitalize(val).replaceAll('_', ' ')
  }
}
/* ---------------------------------------------------------------------------- */