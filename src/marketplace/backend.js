import BCHJS from '@psf/bch-js';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import axios from 'axios'

const bchjs = new BCHJS()

export const backend = axios.create({
  baseURL: process.env.MARKETPLACE_BASE_URL || 'http://localhost:8000/api',
})

backend.interceptors.request.use(async (config) => {
  if (['get', 'option'].indexOf(config.method) >= 0 && !config.forceSign) return config
  if (config.skipSigning) return config

  const { value } = await getSignerData()
  if (!value) return config

  const [walletHash, privkey] = value.split(':')
  if (!walletHash || !privkey) return config

  let data = config.data
  let timestamp = Date.now()
  try {
    data = JSON.stringify(data)
  } catch(error) {}
  if (data === null || data === undefined) data = ''
  data = Buffer.from(`${data}${timestamp}`).toString('hex')

  const signature = bchjs.BitcoinCash.signMessageWithPrivKey(privkey, data)
  if (!signature) return config

  config.headers['X-Paytaca-Customer'] = [walletHash, timestamp, signature].join(':')
  return config
})

const SIGNER_STORAGE_KEY = 'marketplace-api-customer-signer-data'

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
