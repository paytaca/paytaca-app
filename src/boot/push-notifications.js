import { reactive, markRaw } from 'vue'
import { boot } from 'quasar/wrappers'
import { PushNotifications } from '@capacitor/push-notifications';
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import Watchtower from 'watchtower-cash-js';
import { BigNumber } from 'ethers'
import { Platform } from 'quasar'

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
        } catch(error) {
          console.error(error)
        }
      })
  }
}

class PushNotificationsManager {
  constructor() {
    this.watchtower = new Watchtower()
    this.events = PushNotificationsEventEmitter.getInstance()
    this.registrationToken = ''
    this.deviceId = ''
    this.appInfo = null
    this.registrationTokenError= 'no error'
    this.permissionStatus = null

    this.fetchRegistrationToken()
      .catch(error => {
        this.registrationTokenError = error
      })
    this.fetchDeviceId()

    this.subscriptionInfo = {}
  }

  fetchAppInfo() {
    return App.getInfo()
      .then(response => {
        this.appInfo = response
        return response
      })
  }

  checkPermissions() {
    return PushNotifications.checkPermissions()
      .then(response => {
        this.permissionStatus = response?.receive
        return Promise.resolve(response)
      })
  }

  requestPermission() {
    return PushNotifications.requestPermissions()
      .then(response => {
        this.permissionStatus = response?.receive
        return Promise.resolve(response)
      })
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
      }, opts?.timeout || 30 * 1000)

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

    if (this.permissionStatus !== 'granted') await this.requestPermission()
    if (this.permissionStatus !== 'granted') {
      console.warn('Aborting push notification subscribe due to permission status:', this.permissionStatus)
      return
    }

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

    const response = await this.watchtower.BCH._api.post(
      '/push-notifications/subscribe/',
      data,
    )
    this.subscriptionInfo = response?.data
    return response
  }
}

export const pushNotificationsManager = new PushNotificationsManager()

export default boot(({ app, store }) => {

  if (Platform.is.mobile) {
    const manager = reactive(
      markRaw(pushNotificationsManager)
    )

    manager.events.addEventListener(
      'pushNotificationReceived',
      (notification) => {
        console.log('Notification:', notification)
      }
    )
  
    // Vuex notification module will act as the event bus for events when user opens app using
    // push notifications, any page expected to do something when a push notification arrives
    // should be handled within the page itself
    // the routing however will be handled by the App.vue & notification module
    // The reason is to have the same handlers for both cases where the app is closed/open
    manager.events.addEventListener(
      'pushNotificationActionPerformed',
      notificationAction => {
        console.log('Notification action:', JSON.stringify(notificationAction, null, 2))
        store.commit('notification/setOpenedNotification', notificationAction?.notification)
        store.dispatch('notification/handleOpenedNotification')
      },
    )
  
    app.config.globalProperties.$pushNotifications = manager
    app.provide('$pushNotifications', manager)
  }

})
