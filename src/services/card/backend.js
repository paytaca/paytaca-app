import axios from 'axios'
import { getAuthToken, clearAuthToken, clearCardUserCache, saveAuthToken } from './user'
import { loadWallet } from '../wallet';

const API_BASE_URL = process.env.MAINNET_CARD_API_BASE_URL

export const backend = axios.create({
  baseURL: API_BASE_URL,
  timeout: 100000,
  headers: {
    'Content-Type': 'application/json',
  },
})

backend.interceptors.request.use(async (config) => {
  if (config.authorize === false) {
    return config
  }
  const wallet = await loadWallet();
  config.headers['wallet-hash'] = wallet.walletHash
  await getAuthToken().then(token => {
    config.headers.Authorization = `Token ${token}`
  })
  return config
})

let isRefreshing = false
let failedQueue = []

function processQueue(error = null) {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

async function performRelogin() {
  await clearAuthToken()
  clearCardUserCache()

  const wallet = await loadWallet()
  const keypair = wallet.keypair()

  const { data: { challenge } } = await backend.post('/auth/user/challenge/', {
    public_key: keypair.publicKey,
  }, { authorize: false })

  const signature = wallet.signMessage(keypair.privateKey, challenge)

  const { data: verifyResp } = await backend.post('/auth/user/verify/', {
    public_key: keypair.publicKey,
    signature,
  }, { authorize: false })

  if (verifyResp?.token) {
    await saveAuthToken(verifyResp)
  }
}

backend.interceptors.response.use(
  response => response,
  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status === 403 &&
      !originalRequest._retry &&
      originalRequest.authorize !== false
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => {
          return backend(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        await performRelogin()
        processQueue()
        return backend(originalRequest)
      } catch (reloginError) {
        processQueue(reloginError)
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)