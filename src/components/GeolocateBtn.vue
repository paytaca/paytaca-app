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
      no-caps label="Locate"
      v-bind="btnProps"
      @click="() => attemptGeolocate()"
    />
  </slot>
</template>
<script setup>
import { Geolocation } from '@capacitor/geolocation'
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { ref, computed, onMounted } from 'vue'

const $emit = defineEmits([
  'grant',
  'geolocate',
])
const props = defineProps({
  btnProps: Object,
})

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
          message: 'Enable access location in app settings',
          class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
        })
      }
    })
}

function geolocate() {
  const dialog = $q.dialog({
    message: 'Finding device location',
    persistent: true,
    progress: true,
    ok: false,
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
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
      if (errorMsg === 'location disabled') errorMsg = 'Please enable device\'s location service.'
      dialog.update({
        title: 'Unable to locate device',
        message: errorMsg || '',
      })
    })
    .finally(() => {
      dialog.update({ progress: false, ok: true, persistent: false })
    })
}
</script>