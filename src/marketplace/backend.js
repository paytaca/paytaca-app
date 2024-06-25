import BCHJS from '@psf/bch-js';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { setupCache } from 'axios-cache-interceptor'
import axios from 'axios'

const bchjs = new BCHJS()

export const backend = axios.create({
  baseURL: process.env.MARKETPLACE_BASE_URL || 'https://commercehub.paytaca.com/api',
  baseURL: 'http://localhost:8000/api',

  /**
   * @param {import('axios').AxiosRequestConfig} config 
   * @param {{ data:any, customSignData:String, timestamp:Number }} opts 
   */
  signFunction: async (config, opts={data, customSignData, timestamp}) => {
    const data = opts?.data
    const customSignData = opts?.customSignData
    const timestamp = opts?.timestamp

    const signResponse = await signPaytacaCustomerData(data)
    if (!signResponse.signature) return config

    if (customSignData) config.headers['X-Paytaca-Signdata'] = customSignData
    config.headers['X-Paytaca-Customer'] = [signResponse.walletHash, timestamp, signResponse.signature].join(':')

    return config
  },
})

export async function sigAuthInterceptor(config) {
  if (['get', 'option'].indexOf(config.method) >= 0 && !config.forceSign) return config
  if (config.skipSigning) return config

  let data = config.data
  let timestamp = Date.now()
  try {
    data = JSON.stringify(data)
  } catch(error) {}

  let customSignData
  if (config.signData) {
    data = config.signData
    customSignData = config.signData
  }

  if (data === null || data === undefined) data = ''
  if (customSignData) console.log('Custom sign data before', data)
  const dataBuffer = Buffer.from(`${data}${timestamp}`, 'utf-8')
  data = dataBuffer.toString('hex')

  if (typeof config?.signFunction !== 'function') return config
  return await config.signFunction?.(config, { data, customSignData, timestamp })
}
backend.interceptors.request.use(sigAuthInterceptor)

const SIGNER_STORAGE_KEY = 'marketplace-api-customer-signer-data'

export async function signPaytacaCustomerData(data) {
  const response = { walletHash: '', signature: '' }
  const { value } = await getSignerData()
  if (!value) return response

  const [walletHash, privkey] = value.split(':')
  if (!walletHash || !privkey) return response
  response.walletHash = walletHash

  response.signature = bchjs.BitcoinCash.signMessageWithPrivKey(privkey, data)
  return response
}

export async function getSignerData() {
  try {
    const data = await SecureStoragePlugin.get({ key: SIGNER_STORAGE_KEY })
    return { success: true, value: data.value } 
  } catch(error) {
    return { success: false, error: error }
  }
}

export async function setSignerData(value='') {
  try {
    if (value === undefined) {
      const removeResp = await SecureStoragePlugin.remove({ key: SIGNER_STORAGE_KEY })
      return { success: removeResp.value }
    }

    const setResponse = await SecureStoragePlugin.set({ key: SIGNER_STORAGE_KEY, value: value })
    return { success: setResponse.value }
  } catch(error) {
    console.error(error)
    return { success: false, error: error }
  }
}

/**
 * @param {import('axios-cache-interceptor').CacheOptions} cacheOpts 
 * @returns 
 */
export function getCachedBackend(cacheOpts) {
  return setupCache(axios.create({...backend.defaults}), cacheOpts)
}

export const cachedBackend = getCachedBackend()
