import axios from 'axios'

export const backend = axios.create({
  baseURL: process.env.MARKETPLACE_BASE_URL || 'http://localhost:8000/api',
})
