import { BigNumber } from 'ethers'
import { pushNotificationsManager } from 'src/boot/push-notifications'
import { backend } from './backend'

class MarketplacePushNotificationsManager {
  constructor() {
    this.deviceId = ''
    this.registrationToken = ''
    this.permissionStatus = null
  }

  fetchDeviceId() {
    return pushNotificationsManager.fetchDeviceId()
      .then(response => {
        this.deviceId = pushNotificationsManager.deviceId
        return response
      })
  }

  checkPermissions() {
    return pushNotificationsManager.checkPermissions()
      .then(response => {
        this.permissionStatus = pushNotificationsManager.permissionStatus
        return response
      })
  }

  requestPermission() {
    return pushNotificationsManager.requestPermission()
      .then(response => {
        this.permissionStatus = pushNotificationsManager.permissionStatus
        return response
      })
  }

  /**
   * @param {Object} opts 
   * @param {Number} opts.timeout
   */
  fetchRegistrationToken(opts) {
    return pushNotificationsManager.fetchRegistrationToken(opts)
      .then(response => {
        this.registrationToken = pushNotificationsManager.registrationToken
        return response
      })
  }

  async subscribe(customerId=0) {
    if (!customerId) return
    if (!this.deviceId) await this.fetchDeviceId()
    if (!this.registrationToken) await this.fetchRegistrationToken()

    if (this.permissionStatus !== 'granted') await this.requestPermission()
    if (this.permissionStatus !== 'granted') {
      console.warn('Aborting push notification subscribe due to permission status:', this.permissionStatus)
      return
    }

    const data = { customer_id: customerId, gcm_device: undefined, apns_device: undefined }
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

    const response = await backend.post(
      '/notifications/subscribe/',
      data,
    )
    this.subscriptionInfo = response?.data
    return response
  }
}

export const marketplacePushNotificationsManager = new MarketplacePushNotificationsManager()
window.mpnm = marketplacePushNotificationsManager