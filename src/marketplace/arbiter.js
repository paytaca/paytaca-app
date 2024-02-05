import BCHJS from '@psf/bch-js';
import axios from 'src/boot/axios';
import { backend, sigAuthInterceptor } from './backend';
import { generateKeypair } from './chat/keys';

const bchjs = new BCHJS()

export function getWifPubkey(wif) {
  const ecpair = bchjs.ECPair.fromWIF(wif)
  return Buffer.from(bchjs.ECPair.toPublicKey(ecpair)).toString('hex')
}

export function getWifAddress(wif) {
  const ecpair = bchjs.ECPair.fromWIF(wif)
  return bchjs.ECPair.toCashAddress(ecpair)
}

export class ChatIdentityManager {
  constructor(privkey) {
    this.privkey = privkey
  }

  get chatIdentityRef() {
    return `marketplace-arbiter|${walletNodeData.value.pubkey}`
  }

  get privkey() {
    return this._keys?.privkey
  }

  set privkey(value) {
    this._keys = {
      privkey: value,
      pubkey: getWifPubkey(value),
      address: getWifAddress(value),
      chat: generateKeypair({ seed: value })
    }
  }

  get chatPrivkey() {
    return this._keys?.chat?.privkey
  }

  get chatPubkey() {
    return this._keys?.chat?.pubkey
  }

  createBackend() {
    const chatBackend = axios.create({
      ...backend.defaults,
      signFunction: async (config, opts) => {
        const data = opts?.data
        const isCustomSignData = opts?.isCustomSignData
        const timestamp = opts?.timestamp
    
        const privkey = walletNodeData.value.privkey
        const chatIdentityRef = computedChatIdentityRef.value
    
        const signature = bchjs.BitcoinCash.signMessageWithPrivKey(privkey, data)
        if (isCustomSignData) config.headers['X-Chat-Signdata'] = data
        config.headers['X-Chat-Identity'] = [chatIdentityRef, timestamp, signature].join(':')
    
        return config
      }
    })
    chatBackend.interceptors.request.use(sigAuthInterceptor)
    return chatBackend
  }
}