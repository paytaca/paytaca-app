import axios from 'axios'
import { rampWallet } from 'src/wallet/ramp/wallet'
import { getCookie } from '.'

export const backend = axios.create({
  baseURL: process.env.WATCHTOWER_BASE_URL || 'https://watchtower.cash/api'
})

backend.interceptors.request.use(async (config) => {
  config.headers['wallet-hash'] = rampWallet.walletHash
  if (config.authorize) {
    if (getCookie('token')) {
      config.headers.Authorization = `Token ${getCookie('token')}`
    }
  }
  return config
})
