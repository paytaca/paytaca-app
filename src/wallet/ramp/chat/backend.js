import BCHJS from '@psf/bch-js'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { rampWallet } from 'src/wallet/ramp/wallet'
import { getCookie } from '..'
import axios from 'axios'

const bchjs = new BCHJS()

export const backend = axios.create({
  baseURL: process.env.WATCHTOWER_BASE_URL || 'https://watchtower.cash/api'
})

backend.interceptors.request.use(async (config) => {
  if (config.authorize) {
    config.headers['wallet-hash'] = rampWallet.walletHash
    config.headers.Authorization = `Token ${getCookie('token')}`
  }
  return config
})

export const chatBackend = axios.create({
  baseURL: process.env.MARKETPLACE_BASE_URL || 'https://commercehub.paytaca.com/api'
})

chatBackend.interceptors.request.use(async (config) => {
  let data = config.data
  try {
    data = JSON.stringify(data)
  } catch (error) {}

  if (config.signData) {
    data = config.signData
    config.headers['X-Chat-Identity-Signdata'] = data
  }

  if (config.forceSign) {
    if (data === null || data === undefined) data = ''
    const timestamp = Date.now()
    data = Buffer.from(`${data}${timestamp}`).toString('hex')

    const signResponse = await signRequestData(data)
    if (!signResponse.signature) return config

    config.headers['X-Chat-Identity'] = [signResponse.walletHash, timestamp, signResponse.signature].join(':')
  }
  return config
})

const SIGNER_STORAGE_KEY = 'ramp-api-customer-signer-data'

export async function signRequestData (data) {
  const response = { walletHash: '', signature: '' }
  const { value } = await getSignerData()
  if (!value) return response

  const [walletHash, privkey] = value.split(':')
  if (!walletHash || !privkey) return response
  response.walletHash = walletHash

  response.signature = bchjs.BitcoinCash.signMessageWithPrivKey(privkey, data)
  return response
}

export async function getSignerData () {
  try {
    const data = await SecureStoragePlugin.get({ key: SIGNER_STORAGE_KEY })
    return { success: true, value: data.value }
  } catch (error) {
    return { success: false, error: error }
  }
}

export async function setSignerData (value = '') {
  try {
    if (value === undefined) {
      const removeResp = await SecureStoragePlugin.remove({ key: SIGNER_STORAGE_KEY })
      return { success: removeResp.value }
    }

    const setResponse = await SecureStoragePlugin.set({ key: SIGNER_STORAGE_KEY, value: value })
    return { success: setResponse.value }
  } catch (error) {
    console.error(error)
    return { success: false, error: error }
  }
}

export async function updateSignerData (_context) {
  console.log('Updating signer data')
  const walletHash = rampWallet?.walletHash
  const privkey = await rampWallet.privkey()
  const verifyingPubkey = await rampWallet.pubkey()
  const pubkeyBuffer = Buffer.from(verifyingPubkey, 'hex')

  const message = `${Date.now()}`
  const verifyingPubkeyIndex = rampWallet.addressIndex
  const signature = await (await rampWallet.raw()).signMessage(message, verifyingPubkeyIndex)

  const ecPair = bchjs.ECPair.fromPublicKey(pubkeyBuffer)
  const address = bchjs.ECPair.toLegacyAddress(ecPair)

  const valid = await (await rampWallet.raw()).verifyMessage(address, signature, message)
  if (!valid) return Promise.reject('invalid signature')

  setSignerData(`${walletHash}:${privkey}`)
}
