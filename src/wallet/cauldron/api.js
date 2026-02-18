import axios from 'axios'

const baseUrl = new URL('https://indexer.riften.net/')

export const cauldronApiAxios = axios.create({
  baseURL: baseUrl.toString(),
})
