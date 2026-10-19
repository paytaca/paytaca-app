import { signMessage } from 'src/utils/bch-keys'
import axios from "axios";
import { backend, sigAuthInterceptor } from "../backend";
import { requestManager } from "src/utils/request-manager";


export function createBackend(opts={ chatIdentityRef: '', privkey: '' }) {
  const chatIdentityRef = opts?.chatIdentityRef
  const privkey = opts?.privkey
  if (!chatIdentityRef) throw new Error('Chat identity ref required')
  if (!privkey) throw new Error('Private key required')

  const chatBackend = axios.create({
    ...backend.defaults,
    signFunction: async (config, opts) => {
      const data = opts?.data
      const customSignData = opts?.customSignData
      const timestamp = opts?.timestamp
  
      const signature = signMessage(privkey, data)
      if (customSignData) config.headers['X-Chat-Identity-Signdata'] = customSignData    
      config.headers['X-Chat-Identity'] = [chatIdentityRef, timestamp, signature].join(':')
  
      return config
    }
  })
  chatBackend.interceptors.request.use(sigAuthInterceptor)
  requestManager.attachTo(chatBackend)
  return chatBackend
}