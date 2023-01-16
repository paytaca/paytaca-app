import axios from 'axios'
import { reactive, markRaw } from 'vue'
import { boot } from 'quasar/wrappers'
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import Watchtower from 'watchtower-cash-js';
import { BigNumber } from 'ethers'


class PushNotificationsManager {
  constructor() {
    this.watchtower = new Watchtower()
    this.registrationToken = ''
    this.deviceId = ''

    this.fetchRegistrationToken()
    this.fetchDeviceId()

    this.subscriptionInfo = {}
  }

  /**
   * @param {Object} opts 
   * @param {Number} opts.timeout
   */
  fetchRegistrationToken(opts) {
    const manager = this
    return new Promise((resolve, reject) => {
      const registrationSuccessHandler = token => {
        manager.registrationToken = token?.value || token
        resolve(token)
        PushNotifications.removeAllListeners()
      }
      const registrationErrorHandler = error => {
        reject(error)
        PushNotifications.removeAllListeners()
      }
      PushNotifications.addListener('registration', registrationSuccessHandler)
      PushNotifications.addListener('registrationError', registrationErrorHandler)
      setTimeout(() => {
        const error = new Error('Timeout exceeded')
        error.name = 'RegistrationTokenTimeout'
        reject(error)
        PushNotifications.removeAllListeners()
      }, opts?.timeout || 60 * 1000)

      PushNotifications.register()
    })
  }

  fetchDeviceId() {
    return Device.getId()
      .then(response => {
        if (!response?.uuid) throw response
        this.deviceId = response.uuid
        return this.deviceId
      })
  }

  /**
   * @param {String[]} walletHashes 
   */
  async subscribe(walletHashes) {
    if (!this.deviceId) await this.fetchDeviceId()
    if (!this.registrationToken) await this.fetchRegistrationToken()

    const data = { wallet_hashes: walletHashes, gcm_device: undefined, apns_device: undefined }
    const deviceInfo = {
      registration_id: this.registrationToken,
      device_id: this.deviceId,
    }

    const platform = Capacitor.getPlatform()
    if (platform === 'ios') {
      data.apns_device = deviceInfo
    } else if (platform === 'android') {
      const _device_id = BigNumber.from('0x' + deviceInfo.device_id)
      deviceInfo.device_id = _device_id.toString()
      data.gcm_device = deviceInfo
    }

    const response = await axios.post('http://192.168.1.12:8000/api/push-notifications/subscribe/', data)
    // const response = await this.watchtower.BCH._api.post('/push-notifications/subscribe/', data)
    this.subscriptionInfo = response?.data
    return response
  }
}

export default boot(({ app }) => {
  const manager = reactive(
    markRaw(new PushNotificationsManager())
  )

  app.config.globalProperties.$pushNotifications = manager
  app.provide('$pushNotifications', manager)
})
