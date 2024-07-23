import axios from 'axios'
import { Store } from 'src/store'
import { getAuthToken } from './auth'

export const backend = axios.create()
backend.interceptors.request.use(async (config) => {
  config.baseURL = Store.getters['global/isChipnet'] ? process.env.CHIPNET_WATCHTOWER_BASE_URL : process.env.MAINNET_WATCHTOWER_BASE_URL || ''
  const wallet = Store.getters['global/getWallet']('bch')
  config.headers['wallet-hash'] = wallet.walletHash
  if (config.authorize) {
    await getAuthToken().then(token => {
      config.headers.Authorization = `Token ${token}`
    })
  }
  return config
})

export function getBackendWsUrl () {
  return Store.getters['global/isChipnet'] ? process.env.CHIPNET_RAMP_WS_URL : process.env.MAINNET_RAMP_WS_URL || ''
}
