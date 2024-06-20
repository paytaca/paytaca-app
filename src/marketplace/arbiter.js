import BCHJS from '@psf/bch-js';
import axios from 'axios';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { bus } from 'src/wallet/event-bus';
import { backend } from './backend';
import { generateKeypair } from './chat/keys';

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

  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

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
window.f = (...args) => setArbiterKeys(...args) 

export async function getArbiterWifData() {
  const { wif } = await getArbiterKeys()
  if (!wif) return
  return parseWif(wif)
}