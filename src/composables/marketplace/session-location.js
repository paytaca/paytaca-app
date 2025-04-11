import { useQuasar } from "quasar";
import { Store } from "src/store";
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { computed, ref } from "vue";

export function useMarketplaceLocationManager() {
  const $store = Store
  const $q = useQuasar()

  const darkMode = computed(() => $store.getters['darkmode/getStatus'])

  const customer = computed(() => $store.getters['marketplace/customer'])
  const customerLocations = computed(() => $store.getters['marketplace/customerLocations'])
  const sessionLocation = computed(() => $store.getters['marketplace/sessionLocation'])
  const deviceLocation = computed(() => $store.getters['marketplace/deviceLocation'])

  function validSessionLocationCoordinates(opts= {ignoreExpired: false }) {
    return sessionLocation.value?.id &&
           sessionLocation.value?.validCoordinates &&
           (!sessionLocation.value?.expired || opts?.ignoreExpired)
  }

  async function initializeLocation() {
    if (validSessionLocationCoordinates()) return

    await setCurrentLocation({ showDialog: true, hideDialogOnError: true })
      ?.catch?.(console.error)

    if (validSessionLocationCoordinates({ ignoreExpired: true })) return

    if (customer.value?.defaultLocation?.validCoordinates) {
      $store.commit('marketplace/addCustomerLocation', customer.value?.defaultLocation?.$raw)
      $store.commit('marketplace/setSelectedSessionLocationId', customer.value?.defaultLocation?.id)
    }
  }

  const updateLocationPromise = ref(null)
  /**
   * @param {...Parameters<typeof _setCurrentLocation>} args
   */
  function setCurrentLocation(...args) {
    if (updateLocationPromise.value) return updateLocationPromise.value

    return updateLocationPromise.value = _setCurrentLocation(...args)
      .finally(() => {
        updateLocationPromise.value = null
      })
  } 
  async function _setCurrentLocation(opts={ showDialog: true, hideDialogOnError: false }) {
    const dialog = opts?.showDialog ? $q.dialog({
      title: 'Location',
      message: 'Getting device location & address',
      color: 'brandblue',
      progress: true,
      persistent: true,
      class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
      ok: false,
      cancel: false,
    }) : {
      hide: () => {},
      update: () => {},
    }

    return $store.dispatch('marketplace/updateLocation')
      .then(() => {
        if (!deviceLocation.value?.validCoordinates) return Promise.reject({ errorMessage: 'Device location invalid' })

        $store.commit('marketplace/setSelectedSessionLocationId')
        dialog.hide()
      })
      .catch(error => {
        if (opts?.hideDialogOnError) {
          dialog.hide()
          return
        }
        let errorMsg = ''
        if (typeof error === 'string') errorMsg = error
        if (typeof error?.message === 'string') errorMsg = error?.message
        if (!errorMsg) errorMsg = 'Unable to find location'

        dialog.update({ message: errorMsg })
      })
      .finally(() => {
        dialog.update({ progress: false, persistent: false })
      })
  }

  return {
    customer,
    sessionLocation,
    deviceLocation,
    customerLocations,
    validSessionLocationCoordinates,
    initializeLocation,
    setCurrentLocation,
  }
}