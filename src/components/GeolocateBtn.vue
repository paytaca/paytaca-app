<template>
  <slot v-bind="{
    geolocation,
    hasPermission,
    attemptGeolocate,
    updateGeolocationPermission,
    geolocate,
  }">
    <q-btn
      flat
      :icon="hasPermission ? 'my_location' : 'location_disabled'"
      no-caps
      :label="$t('Locate')"
      v-bind="btnProps"
      class="button button-text-primary"
      :class="getDarkModeClass(darkMode)"
      @click="() => attemptGeolocate()"
    />
  </slot>
</template>
<script setup>
import { Geolocation } from '@capacitor/geolocation'
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { ref, computed, onMounted } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useI18n } from 'vue-i18n'

const $emit = defineEmits([
  'grant',
  'geolocate',
])
const props = defineProps({
  btnProps: Object,
})

const { t } = useI18n()
const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])


onMounted(() => updateGeolocationPermission({ request: false, promptOnDeny: false }))
const geolocation = ref({
  permission: { location: 'prompt', coarseLocation: 'prompt', error: null },
  geolocated: {
    timestamp: 0,
    position: { latitude: null, longitude: null },
  }
})
const hasPermission = computed(() => {
  return geolocation.value?.permission?.location === 'granted' ||
        geolocation.value?.permission?.coarseLocation === 'granted'
})

function attemptGeolocate() {
  if (hasPermission.value) return geolocate()
  return updateGeolocationPermission({ request: true, geolocateOnGrant: true, promptOnDeny: true })
}

function updateGeolocationPermission(opts = { request: false, promptOnDeny: false, geolocateOnGrant: false }) {
  const promiseObj = opts?.request ? Geolocation.requestPermissions() : Geolocation.checkPermissions()

  return promiseObj
    .finally(() => {
      geolocation.value.permission = { location: 'prompt', coarseLocation: 'prompt', error: null }
    })
    .then(response => {
      geolocation.value.permission = response
      if (hasPermission.value) {
        $emit('grant')
        if (opts?.geolocateOnGrant) return geolocate()
      }
      return response
    })
    .catch(error => {
      geolocation.value.permission.error = error
      return Promise.reject(error)
    })
    .finally(() => {
      if (
        opts?.promptOnDeny &&
        geolocation.value.permission?.location === 'denied' &&
        geolocation.value.permission?.coarseLocation === 'denied'
      ) {
        $q.dialog({
          message: t('EnableLocation'),
          class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode)}`
        })
      } else if (opts?.promptOnDeny && !hasPermission.value) {
        $q.dialog({
          html: true,
          message: geolocation.value?.permission?.error?.message || t('UnableToAccessLocation'),
          class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode)}`
        })
      }
    })
}

function geolocate() {
  const dialog = $q.dialog({
    message: t('FindingDeviceLocation'),
    persistent: true,
    progress: true,
    ok: false,
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  })

  const opts = {
    enableHighAccuracy: geolocation.value.permission.location === 'granted',
    maximumAge: 30 * 1000,
    timeout: 10 * 1000,
  }
  return Geolocation.getCurrentPosition(opts)
    .then(response => {
      $emit('geolocate', response)
      geolocation.value.geolocated = {
        timestamp: response?.timestamp,
        position: response?.coords,
      }
      dialog.hide()
    })
    .catch(error => {
      updateGeolocationPermission()
      let errorMsg = error?.message
      if (errorMsg === 'location disabled') errorMsg = t('PleaseEnableLocationService')
      dialog.update({
        title: t('UnableToLocateDevice'),
        message: errorMsg || '',
      })
    })
    .finally(() => {
      dialog.update({ progress: false, ok: true, persistent: false })
    })
}
</script>