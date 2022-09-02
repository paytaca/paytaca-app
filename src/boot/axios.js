import { boot } from 'quasar/wrappers'
import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: 'https://wallet.paytaca.com/api'
})

const connectaAxios = axios.create({
  baseURL: process.env.CONNECTA_API_BASE_URL || 'http://localhost:8000/api'
})

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axiosInstance
  app.config.globalProperties.$connectaAxios = connectaAxios
})

export { axiosInstance, connectaAxios }
