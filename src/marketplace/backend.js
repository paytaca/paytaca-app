import BCHJS from '@psf/bch-js';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import axios from 'axios'

const bchjs = new BCHJS()

export const backend = axios.create({
  baseURL: process.env.MARKETPLACE_BASE_URL || 'https://commercehub.paytaca.com/api',

  /**
   * @param {import('axios').AxiosRequestConfig} config 
   * @param {{ data:any, isCustomSignData:Boolean, timestamp:Number }} opts 
   */
  signFunction: async (config, opts={data, isCustomSignData, timestamp}) => {
    const data = opts?.data
    const isCustomSignData = opts?.isCustomSignData
    const timestamp = opts?.timestamp

    const signResponse = await signPaytacaCustomerData(data)
    if (!signResponse.signature) return config

    if (isCustomSignData) config.headers['X-Paytaca-Signdata'] = data
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

  let isCustomSignData = false
  if (config.signData) {
    data = config.signData
    isCustomSignData = true
  }

  if (data === null || data === undefined) data = ''
  data = Buffer.from(`${data}${timestamp}`).toString('hex')

  if (typeof config?.signFunction !== 'function') return config
  return await config.signFunction?.(config, { data, isCustomSignData, timestamp })
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
