import { boot } from 'quasar/wrappers'
import axios from 'axios';
import { ref, computed } from 'vue'
import { Geolocation } from '@capacitor/geolocation'
import { registerPlugin } from '@capacitor/core'
import { Capacitor } from '@capacitor/core'

const GpsService = registerPlugin('GpsService'); 

class GeolocationManager {
  constructor() {
    this.permission = ref({ location: 'prompt', coarseLocation: 'prompt', error: null })
    this.permissionState = computed(() => {
      return {
        granted: this.permission.value?.location === 'granted' || 
              this.permission.value?.coarseLocation === 'granted',
        denied: this.permission.value?.location === 'denied' || 
          this.permission.value?.coarseLocation === 'denied',
      }
    })
    this.location = ref({
      loading: false,
      timestamp: 0,
      position: { latitude: undefined, longitude: undefined },
    })
    this.tracker = ref({ callbackId: null })
    this.isGpsStatusEnabled = ref(null)

    this.geoip = ref({ longitude: NaN, latitude: NaN })
  }

  get geolocateOpts() {
    return {
      enableHighAccuracy: this.permission.value.location === 'granted',
      maximumAge: 30 * 1000,
      timeout: 10 * 1000,
    }
  }

  /**
   * @returns {Promise<{ isEnabled:boolean }>}
   */
  async isGpsEnabled() {
    return await GpsService.isEnabled().catch(error => {
      if (error.code === 'UNIMPLEMENTED') return { isEnabled: null }
      return Promise.reject(error)
    }).then(response => {
      this.isGpsStatusEnabled.value = response?.isEnabled
      return response
    })
  }

  /**
   * @returns {Promise<{ isEnabled:boolean, resultCode:Number, data:any }>}
   */
  async openLocationSettings() {
    return await GpsService.openLocationSettings().catch(error => {
      if (error.code === 'UNIMPLEMENTED') return { isEnabled: null }
      return Promise.reject(error)
    }).then(response => {
      this.isGpsStatusEnabled.value = response?.isEnabled
      return response
    })
  }

  /**
   * @param {{message: String, title: String}} opts
   * @returns {Promise<{ isEnabled:boolean, resultCode:Number, data:any } | null>}
   */
  async openLocationSettingsPrompt(opts) {
    return await GpsService.openLocationSettingsPrompt(opts).catch(error => {
      if (error.code === 'UNIMPLEMENTED') return { isEnabled: null }
      return Promise.reject(error)
    }).then(response => {
      this.isGpsStatusEnabled.value = response?.isEnabled
      return response
    })
  }

  /**
   * @param {{message: String, title: String, skipPrompt:Boolean }} opts
   * @returns {Promise<{ isEnabled:boolean, resultCode:Number, data:any } | null>}
   */
  async openLocationSettingsIfGpsDisabled(opts) {
    const response = await this.isGpsEnabled()?.catch(console.error)
    if (this.isGpsStatusEnabled.value == true) return response
    return opts?.skipPrompt
      ? this.openLocationSettings(opts) : this.openLocationSettingsPrompt(opts)
  }

  onPositionUpdate(response, error) {
    if (error) {
      if (this.tracker.value.callbackId) this.clearWatch()
      return Promise.reject(error)
    }

    this.location.value = {
      timestamp: response?.timestamp,
      position: response?.coords,
    }

    return this.location.value
  }

  updateGeolocationPermission(opts = { request: false, geolocateOnGrant: false }) {
    const promiseObj = opts?.request ? Geolocation.requestPermissions(['location']) : Geolocation.checkPermissions()

    return promiseObj
      .finally(() => {
        this.permission.value = { location: 'prompt', coarseLocation: 'prompt', error: null }
      })
      .then(response => {
        this.permission.value = response
        if (this.permissionState.value.granted && opts?.geolocateOnGrant) return this.geolocate()
        return response
      })
      .catch(error => {
        this.permission.value.error = error
        return Promise.reject(error)
      })
      .finally(() => {
        if (
          this.permission.value?.location === 'denied' &&
          this.permission.value?.coarseLocation === 'denied'
        ) {
          this.permission.value.error = 'Enable access location in app settings'
        } else if (!this.permissionState.value.granted && !this?.permission.value?.error) {
          this.permission.value.error = 'Unable to access geolocation'
        }
      })
  }

  geolocate(opts) {
    if (Capacitor.getPlatform() == 'ios') return this.geolocate2(opts)
    return this.geolocate1(opts)
  }

  geolocate1(opts) {
    this.location.value.loading = true
    const geolocateOpts = opts || this.geolocateOpts
    return Geolocation.getCurrentPosition(geolocateOpts)
      .then((...args) => this.onPositionUpdate(...args))
      .catch(error => {
        this.updateGeolocationPermission()
        let errorMsg = error?.message
        if (errorMsg === 'location disabled') {
          error.message = 'Location service disabled'
          this.permission.value.error = error.message
        }
        return Promise.reject(error)
      })
      .finally(() => {
        this.location.value.loading = false
      })
  }

  geolocate2(opts) {
    const geolocateOpts = opts || this.geolocateOpts
    return new Promise(async (resolve, reject) => {
      let watcherId
      let timeoutId
      try {
        const cleanUp = (error) => {
          if (error) reject(error)
          if (timeoutId) clearTimeout(timeoutId)
          Geolocation.clearWatch({ id: watcherId })
          this.location.value.loading = false
        }

        this.location.value.loading = true
        watcherId = await Geolocation.watchPosition(geolocateOpts, (position, error) => {
          Geolocation.clearWatch({ id: watcherId })
          if(!error) resolve(this.onPositionUpdate(position, error))
          cleanUp(error)
        })

      } finally {
        let timeoutDuration = parseFloat(geolocateOpts?.timeout)
        if (!Number.isFinite(timeoutDuration)) timeoutDuration = 15 * 1000
        timeoutId = setTimeout(() => cleanUp(new Error('Geolocate Timeout')), timeoutDuration)
      }
    })

  }

  /**
   * @param {Object} opts 
   * @param {Number | String} opts.lat
   * @param {Number | String} opts.lng
   * @returns 
   */
  reverseGeocode(opts = { lat: null, lon: null }) {
    const params = {
      lat: opts?.lat,
      lon: opts?.lon,
      format: 'json',
    }
  
    return axios.get(`https://nominatim.openstreetmap.org/reverse`, { params })
      .then(response => {
        const result = response?.data?.address
        const address1 = [
          result?.amenity || result?.shop || '',
          result?.village || result?.neighbourhood || result?.suburb || '',
        ].filter(Boolean).join(', ')
  
        const data = {
          address1: address1,
          address2: '',
          street: result?.road,
          city: result?.city,
          state: result?.state || result?.province || '', // most results have returned none so far
          country: result?.country || '',
          latitude: parseFloat(params.lat),
          longitude: parseFloat(params.lon),
        }

        return data
      })
  }

  clearWatch() {
    if (!this.tracker.value.callbackId) return
    console.log('Stopping location tracking. Callback ID:', this.tracker.value.callbackId)
    return Geolocation.clearWatch({ id: this.tracker.value.callbackId })
      .then(response => {
        this.tracker.value.callbackId = null
        return response
      })
      .catch(error => {
        console.error('Failed to clear location tracker')
        return Promise.reject(error)
      })
  }
  
  async watchPosition() {
    await this.clearWatch()
    this.tracker.value.callbackId = await Geolocation.watchPosition(
      this.geolocateOpts, (...args) => this.onPositionUpdate(...args)
    )
    console.log('Tracking location. Callback ID:', this.tracker.value.callbackId)
    return this.tracker.value.callbackId
  }

  getOrUpdateGeoIp() {
    if (!Number.isNaN(this.geoip.value.latitude) && !Number.isNaN(this.geoip.value.longitude)) {
      return this.geoip.value
    }
    return axios.get(`https://commercehub.paytaca.com/api/geoip/`)
      .then(response => {
        const result = Object.assign({}, response?.data, {
          latitude: parseFloat(response?.data?.latitude),
          longitude: parseFloat(response?.data?.longitude),
        })
        
        if (Number.isNaN(result.latitude) || Number.isNaN(result.longitude)) return

        this.geoip.value = result
        return this.geoip.value
      })
  }
}

export const geolocationManager = new GeolocationManager() 
export default boot(({ app }) => {
  window.gm = geolocationManager
  app.config.globalProperties.$geolocation = geolocationManager
  app.provide('$geolocation', app.config.globalProperties.$geolocation)
  geolocationManager.updateGeolocationPermission()
})
