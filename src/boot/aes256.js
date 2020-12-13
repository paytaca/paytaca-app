import Vue from 'vue'
import { LocalStorage } from 'quasar'

const aes256 = require('aes256')

class Encryption {
  getSecretKey () {
    return LocalStorage.getItem('secretkey')
  }

  encrypt (str) {
    return aes256.encrypt(this.getSecretKey(), str)
  }

  decrypt (encryptedStr) {
    return aes256.decrypt(this.getSecretKey(), encryptedStr)
  }
}

Vue.prototype.$aes256 = new Encryption()
