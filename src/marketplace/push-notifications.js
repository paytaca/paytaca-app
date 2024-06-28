import { BigNumber } from 'ethers'
import { pushNotificationsManager } from 'src/boot/push-notifications'
import { backend } from './backend'

class MarketplacePushNotificationsManager {
  constructor() {
    this.appInfo = null
    this.deviceId = ''
    this.registrationToken = ''
    this.permissionStatus = null
  }

  fetchAppInfo() {
    return pushNotificationsManager.fetchAppInfo()
      .then(response => {
        this.appInfo = pushNotificationsManager.appInfo
        return response
      })
  }

  fetchDeviceId() {
    return pushNotificationsManager.fetchDeviceId()
      .then(response => {
        this.deviceId = pushNotificationsManager.deviceId
        return response
      })
  }

  isPushNotificationEnabled() {
    return pushNotificationsManager.isPushNotificationEnabled()
  }

  openPushNotificationsSettings() {
    return pushNotificationsManager.openPushNotificationsSettings()
  }

  openPushNotificationsSettingsPrompt(opts) {
    return pushNotificationsManager.openPushNotificationsSettingsPrompt(opts)
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

  async subscribe(customerId=0, multiWalletIndex=[].map(Number)[0]) {
    if (!customerId) return
    if (!this.appInfo?.id) await this.fetchAppInfo()
    if (!this.deviceId) await this.fetchDeviceId()
    if (!this.registrationToken) await this.fetchRegistrationToken()

    if (this.permissionStatus !== 'granted') await this.requestPermission()
    if (this.permissionStatus !== 'granted') {
      console.warn('Aborting push notification subscribe due to permission status:', this.permissionStatus)
      return
    }

    const data = {
      customer_id: customerId,
      gcm_device: undefined, apns_device: undefined,
      application_id: this.appInfo?.id,
      multi_wallet_index: multiWalletIndex,
    }
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

  async unsubscribe(opts={ customerId: 0, customerRef: '', userId: 0 }) {
    if (!this.deviceId) await this.fetchDeviceId()
    if (!this.deviceId) return console.warn('Aborting unsubscribe, no device id')

    if (!this.appInfo?.id) await this.fetchAppInfo()
    if (!this.appInfo?.id) return console.warn('Aborting unsubscribe, no app id')

    const platform = Capacitor.getPlatform()

    const customerId = opts?.customerId
    const userId = opts?.userId
    const customerRef = opts?.customerRef

    if (!customerId && userId && !customerRef) return
    if ((customerId || customerRef) && userId) {
      console.warn('Unsubscribing both user id & customer id for marketplace push notifications is not allowed')
      return
    }

    const data = {
      application_id: this.appInfo?.id,
      customer_id: customerId || undefined,
      customer_ref: customerRef || undefined,
      user_id: userId || undefined,
    }

    if (platform === 'ios') {
      data.apns_device_id = this.deviceId
    } else if (platform === 'android') {
      const _device_id = BigNumber.from('0x' + this.deviceId).toString()
      data.gcm_device_id = _device_id
    } else {
      return console.log('Aborting unsubscribe, no valid platform found')
    }

    const response = await backend.post(
      '/notifications/unsubscribe/',
      data,
    )

    console.log('Unsubscribed to push notiications', {
      data: data,
      result: response?.data
    })

    return response?.data
  }
}

export const marketplacePushNotificationsManager = new MarketplacePushNotificationsManager()
window.mpnm = marketplacePushNotificationsManager