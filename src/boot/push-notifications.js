import axios from 'axios'
import { reactive, markRaw } from 'vue'
import { boot } from 'quasar/wrappers'
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import Watchtower from 'watchtower-cash-js';
import { BigNumber } from 'ethers'


/**
 * This is a proxy events emitter for PushNotification plugin's events
 * - Created a proxy emitter class since the original event emitter lack removing specific event listeners
 * - This is meant to be singleton class, use `PushNotificationsEventEmitter.getInstance()` to access
 */
class PushNotificationsEventEmitter {
  static events = [
    'registration',
    'registrationError',
    'pushNotificationReceived',
    'pushNotificationActionPerformed',
  ]

  /**
   * @returns {PushNotificationsEventEmitter}
   */
  static getInstance() {
    if (!PushNotificationsEventEmitter.instance) {
      PushNotificationsEventEmitter.instance = new PushNotificationsEventEmitter()
    }

    return PushNotificationsEventEmitter.instance
  }

  constructor() {
    if (PushNotificationsEventEmitter.instance) return PushNotificationsEventEmitter.instance
    PushNotificationsEventEmitter.instance = this

    this.listeners = {}

    this.eventHandlers = {}
    PushNotificationsEventEmitter.events.forEach(eventName => {
      this.eventHandlers[eventName] = eventData => this.emitEvent(eventName, eventData)
    })
    this.setupEventHandlers()
  }

  setupEventHandlers() {
    Object.getOwnPropertyNames(this.eventHandlers)
      .forEach(eventName => {
        PushNotifications.addListener(eventName, this.eventHandlers[eventName])
      })
  }

  addEventListener(eventName='', callback) {
    if (!eventName || typeof callback !== 'function') return
    if (!Array.isArray(this.listeners[eventName])) this.listeners[eventName] = []
    if (this.listeners[eventName].indexOf(callback) >= 0) return
    this.listeners[eventName].push(callback)
  }

  removeEventListener(eventName='', callback) {
    if (!Array.isArray(this.listeners[eventName])) return

    const index = this.listeners[eventName].indexOf(callback)
    if (index >= 0) {
      this.listeners[eventName].splice(index, 1);
    }
  }

  emitEvent(eventName, data) {
    if (!Array.isArray(this.listeners[eventName])) return
    this.listeners[eventName]
      .forEach(callback => {
        try {
          callback(data)
        } catch(error) {}
      })
  }
}

class PushNotificationsManager {
  constructor() {
    this.watchtower = new Watchtower()
    this.events = PushNotificationsEventEmitter.getInstance()
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
        removeListeners()
      }
      const registrationErrorHandler = error => {
        reject(error)
        removeListeners()
      }

      const removeListeners = () => {
        this.events.removeEventListener('registration', registrationSuccessHandler)
        this.events.removeEventListener('registrationError', registrationErrorHandler)
      }

      this.events.addEventListener('registration', registrationSuccessHandler)
      this.events.addEventListener('registrationError', registrationErrorHandler)
      setTimeout(() => {
        const error = new Error('Timeout exceeded')
        error.name = 'RegistrationTokenTimeout'
        reject(error)
        removeListeners()
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
