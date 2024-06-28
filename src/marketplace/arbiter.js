import BCHJS from '@psf/bch-js';
import axios from 'axios';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { capitalize } from 'vue';
import { bus } from 'src/wallet/event-bus';
import { backend } from './backend';
import { generateKeypair } from './chat/keys';
import { EscrowArbiter } from './objects';
import { i18n } from 'src/boot/i18n';


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
  const chat = generateKeypair({ seed: wif })
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

const AUTH_TOKEN_STORAGE_KEY = 'marketplace-arbiter-key'
export async function getArbiterKeys() {
  try {
    const storageVal = await SecureStoragePlugin.get({ key: AUTH_TOKEN_STORAGE_KEY })
    const [wif, authToken] = storageVal.value.split(':')
    return { success: true, wif, authToken } 
  } catch(error) {
    return { success: false, error: error }
  }
}

export async function setArbiterKeys(wif, authToken) {
  try {
    if (!wif && !authToken) {
      const removeResp = await SecureStoragePlugin.remove({ key: AUTH_TOKEN_STORAGE_KEY })
      if (removeResp.value) bus.emit('arbiter-keys-removed')
      return { success: removeResp.value }
    }

    if (!wif || typeof wif !== 'string') return { success: false, error: 'Invalid private key'}
    if (!authToken || typeof authToken !== 'string') return { success: false, error: 'Invalid auth token'}

    const value = `${wif}:${authToken}`
    const setResponse = await SecureStoragePlugin.set({ key: AUTH_TOKEN_STORAGE_KEY, value: value })
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