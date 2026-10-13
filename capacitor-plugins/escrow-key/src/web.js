import { WebPlugin } from '@capacitor/core'

export class EscrowKeyWeb extends WebPlugin {
  async isAvailable () {
    return { value: false }
  }

  async get () {
    return { value: null }
  }

  async set () {
    return { value: false }
  }

  async remove () {
    return { value: false }
  }
}
