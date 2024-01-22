import axios from 'axios'
import { Store } from 'src/store'
import { getAuthCookie } from './auth'

export const backend = axios.create({
  baseURL: process.env.WATCHTOWER_BASE_URL || 'https://watchtower.cash/api'
})

backend.interceptors.request.use(async (config) => {
  const wallet = Store.getters['global/getWallet']('bch')
  config.headers['wallet-hash'] = wallet.walletHash
  if (config.authorize) {
    if (getAuthCookie()) {
      config.headers.Authorization = `Token ${getAuthCookie()}`
    }
  }
  return config
})
