import axios from 'axios'

const baseUrl = new URL('https://indexer2.cauldron.quest/')

export const cauldronApiAxios = axios.create({
  baseURL: baseUrl.toString(),
})
