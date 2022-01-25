import Vue from 'vue'
import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: 'https://wallet.paytaca.com/api'
})

const connectaAxios = axios.create({
  baseURL: process.env.CONNECTA_API_BASE_URL || 'http://localhost:8000/api'
})

Vue.prototype.$axios = axiosInstance
Vue.prototype.$connectaAxios = connectaAxios

export { axiosInstance, connectaAxios }
