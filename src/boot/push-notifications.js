import { reactive, markRaw } from 'vue'
import { boot } from 'quasar/wrappers'
import { PushNotifications } from '@capacitor/push-notifications';
import { App } from '@capacitor/app'
import { registerPlugin } from '@capacitor/core'
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import Watchtower from 'watchtower-cash-js';
import { BigNumber } from 'ethers'
import { Platform } from 'quasar'
import axios from 'axios';
import { Store } from 'src/store';


const PushNotificationSettings = registerPlugin('PushNotificationSettings'); 
const PluginAvailability = {
  PushNotifications: Capacitor.isPluginAvailable('PushNotifications'),
  PushNotificationSettings: Capacitor.isPluginAvailable('PushNotificationSettings'),
}

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
        if (!PluginAvailability.PushNotifications) {
          console.log('Push notifications not available, skipping addListener')
          return
        }
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
    this.isEnabled = null

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

  /**
   * @returns {Promise<{ isEnabled:Boolean }>}
   */
  async isPushNotificationEnabled() {
    if (!PluginAvailability.PushNotifications) return { isEnabled: null }
    return PushNotificationSettings.getNotificationStatus()
      .catch(error => {
        if (error.code === 'UNIMPLEMENTED') return { isEnabled: null }
        return Promise.reject(error)
      })
      .then(response => {
        this.isEnabled = response?.isEnabled
        return response
      })
  }

  /**
   * @param {{message: String, title: String}} opts
   * @returns {Promise<{ resultCode:Number, isEnabled:Boolean, data:any }>}
   */
  async openPushNotificationsSettings() {
    if (this._openSettingsPromise) return this._openSettingsPromise
    this._openSettingsPromise = PushNotificationSettings.openNotificationSettingsPrompt(opts)
    return PushNotificationSettings.openNotificationSettings()
      .catch(error => {
        if (error.code === 'UNIMPLEMENTED') return { isEnabled: null }
        return Promise.reject(error)
      })
      .then(response => {
        this.isEnabled = response?.isEnabled
        return response
      })
      .finally(() => {
        this._openSettingsPromise = undefined
      })
  }

  /**
   * @param {{message: String, title: String}} opts
   * @returns {Promise<{ resultCode:Number, isEnabled:Boolean, data:any } | null>}
   */
  async openPushNotificationsSettingsPrompt(opts) {
    if (!PluginAvailability.PushNotificationSettings) {
      return
    }

    if (this._openSettingsPromptPromise) return this._openSettingsPromptPromise
    this._openSettingsPromptPromise = PushNotificationSettings.openNotificationSettingsPrompt(opts)
    return this._openSettingsPromptPromise
      .catch(error => {
        if (error.code === 'UNIMPLEMENTED') return { isEnabled: null }
        return Promise.reject(error)
      })
      .then(response => {
        this.isEnabled = response?.isEnabled
        return response
      })
      .finally(() => {
        this._openSettingsPromptPromise = undefined
      })
  }

  checkPermissions() {
    if (!PluginAvailability.PushNotifications) return Promise.resolve()
    return PushNotifications.checkPermissions()
      .then(response => {
        this.permissionStatus = response?.receive
        return Promise.resolve(response)
      })
  }

  requestPermission() {
    if (!PluginAvailability.PushNotifications) return Promise.resolve()
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
    if (!PluginAvailability.PushNotifications) return Promise.resolve()
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
        const deviceId = response?.uuid || response?.identifier
        if (!deviceId) throw response
        this.deviceId = deviceId
        return this.deviceId
      })
  }

  /**
   * @param {String[]} walletHashes 
   * @param {Number} [multiWalletIndex]
   * @param {Boolean} isCreateOrImport
   */
  async subscribe(walletHashes, multiWalletIndex, isCreateOrImport = false) {
    if (!this.deviceId) await this.fetchDeviceId()
    if (!this.registrationToken) await this.fetchRegistrationToken()


    // do not ask for permission to save device ID during wallet creation/import
    if (!isCreateOrImport) {
      if (this.permissionStatus !== 'granted') await this.requestPermission()
      if (this.permissionStatus !== 'granted') {
        console.warn('Aborting push notification subscribe due to permission status:', this.permissionStatus)
        return
      }
    }

    const data = {
      wallet_hashes: walletHashes,
      multi_wallet_index: multiWalletIndex,
      gcm_device: undefined,
      apns_device: undefined,
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

    const response = await this.watchtower.BCH._api.post(
      '/push-notifications/subscribe/',
      data,
    )

    await axios.post(
      `${process.env.ENGAGEMENT_HUB_URL}devicenotif/subscribe/`,
      data
    )

    this.subscriptionInfo = response?.data
    return response
  }

  async unsubscribe(walletHashes) {
    if (!this.deviceId) await this.fetchDeviceId()

    if (!this.deviceId) return console.log('Aborting unsubscribe, no device id')

    const platform = Capacitor.getPlatform()
    const data = {
      wallet_hashes: walletHashes,
    }

    if (platform === 'ios') {
      data.apns_device_id = this.deviceId
    } else if (platform === 'android') {
      const _device_id = BigNumber.from('0x' + this.deviceId).toString()
      data.gcm_device_id = _device_id
    } else {
      return console.log('Aborting unsubscribe, no valid platform found')
    }

    const response = await this.watchtower.BCH._api.post(
      '/push-notifications/unsubscribe/',
      data,
    )

    await axios.post(
      `${process.env.ENGAGEMENT_HUB_URL}devicenotif/unsubscribe/`,
      data
    )

    console.log('Unsubscribed to push notifications', {
      data: data,
      result: response?.data
    })

    return response?.data
  }
}

export const pushNotificationsManager = new PushNotificationsManager()

export default boot(({ app }) => {
  const store = Store

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

    // Clear notification state when app is closed
    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        store.commit('notification/clearOpenedNotification')
      }
    })
  
    app.config.globalProperties.$pushNotifications = manager
    app.provide('$pushNotifications', manager)
  }

})
