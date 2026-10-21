import { WebPlugin } from '@capacitor/core'

/**
 * Web fallback for the OrderLiveActivity plugin. Live activities are a native
 * only concept, so every call is a no-op that keeps the shared service usable
 * when the app runs in a browser.
 */
export class OrderLiveActivityWeb extends WebPlugin {
  async isSupported () {
    return { supported: false, platform: 'web', version: 0 }
  }

  async start () {
    return { id: null }
  }

  async update () {
    return { id: null }
  }

  async end () {}

  async endAll () {}
}
