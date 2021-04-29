import Vue from 'vue'
import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: 'https://wallet.paytaca.com/api'
})

Vue.prototype.$axios = axiosInstance

export { axiosInstance }
