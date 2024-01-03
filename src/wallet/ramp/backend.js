import axios from 'axios'

export const backend = axios.create({
  baseURL: process.env.WATCHTOWER_BASE_URL || 'https://watchtower.cash/api'
})
