import { boot } from 'quasar/wrappers'
import axios from 'axios'
import { requestManager } from 'src/utils/request-manager'

const axiosInstance = axios.create({
  baseURL: 'https://wallet.paytaca.com/api'
})

const connectaAxios = axios.create({
  baseURL: process.env.CONNECTA_API_BASE_URL || 'http://localhost:8000/api'
})

requestManager.attachTo(axiosInstance)
requestManager.attachTo(connectaAxios)

// Extend coverage to raw fetch() and XMLHttpRequest calls
requestManager.attachToFetch()
requestManager.attachToXHR()

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axiosInstance
  app.config.globalProperties.$connectaAxios = connectaAxios
  app.config.globalProperties.$requestManager = requestManager
})

export { axiosInstance, connectaAxios }
