import axios from 'axios'
import { getAuthToken } from './auth'

const API_BASE_URL = process.env.CARD_API_BASE_URL || 'http://localhost:8002/api' 

export const backend = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

backend.interceptors.request.use(async (config) => {
  await getAuthToken().then(token => {
    config.headers.Authorization = `Token ${token}`
  })
  return config
})