import BCHJS from "@psf/bch-js"
import axios from "axios";
import { backend, sigAuthInterceptor } from "../backend";

const bchjs = new BCHJS()

export function createBackend(opts={ chatIdentityRef: '', privkey: '' }) {
  const chatIdentityRef = opts?.chatIdentityRef
  const privkey = opts?.privkey
  if (!chatIdentityRef) throw new Error('Chat identity ref required')
  if (!privkey) throw new Error('Private key required')

  const chatBackend = axios.create({
    ...backend.defaults,
    signFunction: async (config, opts) => {
      const data = opts?.data
      const isCustomSignData = opts?.isCustomSignData
      const timestamp = opts?.timestamp
  
      const signature = bchjs.BitcoinCash.signMessageWithPrivKey(privkey, data)
      if (isCustomSignData) config.headers['X-Chat-Signdata'] = data
      config.headers['X-Chat-Identity'] = [chatIdentityRef, timestamp, signature].join(':')
  
      return config
    }
  })
  chatBackend.interceptors.request.use(sigAuthInterceptor)
  return chatBackend
}