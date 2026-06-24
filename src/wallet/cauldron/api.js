import axios from 'axios'
import { requestManager } from 'src/utils/request-manager'

const baseUrl = new URL('https://indexer.riften.net/')

export const cauldronApiAxios = axios.create({
  baseURL: baseUrl.toString(),
})

requestManager.attachTo(cauldronApiAxios)
