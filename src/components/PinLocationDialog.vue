<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" position="bottom" seamless full-height full-width>
    <q-card class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="height:100%;width:100%;">
      <div class="row no-wrap items-center justify-center q-pl-md">
        <div class="text-h6 q-space q-mt-sm">{{ headerText || $t('PinLocation', {}, 'Pin location') }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
          class="close-button"
        />
      </div>
      <div :id="mapUid" style="height:75vh;width:100%;">
      </div>
      <div class="text-center row items-center justify-center text-subtitle1 ellipsis">
        <q-icon name="location_on"/> {{ coordinates?.lat }}, {{ coordinates?.lng }}
      </div>
      <q-card-actions>
        <q-btn
          no-caps
          :label="$t('Cancel', {}, 'Cancel')"
          outline
          color="grey"
          class="col"
          @click="hide()"
        />
        <q-btn
          no-caps
          label="OK"
          class="col button"
          @click="onDialogOK(coordinates)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { computed, getCurrentInstance, inject, markRaw, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useDialogPluginComponent } from 'quasar'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

// dialog plugins requirement
defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const $store = useStore()
const $t = useI18n().t
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const leaflet = inject('$leaflet')
const uid = ref(getCurrentInstance().uid)

const props = defineProps({
  headerText: String,
  initLocation: Object,
})

const mapUid = computed(() => `leaflet-map-${uid.value}`)
const map = ref(null)
const pin = ref(null)
onMounted(() => {
  setTimeout(() => initMap(), 250)
})
function initMap() {
  const mapOptions = {
    center: [11.2674652, 124.9370791],
    zoom: 13,
    preferCanvas: true,
  }
  if (Number.isFinite(props.initLocation?.latitude) && Number.isFinite(props.initLocation?.longitude)) {
    mapOptions.center[0] = props.initLocation?.latitude
    mapOptions.center[1] = props.initLocation?.longitude
    mapOptions.zoom = 18
  }

  const _map = new leaflet.Map(mapUid.value, mapOptions)
  leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(_map);
  const _pin = leaflet.marker(_map.getCenter(), {
    icon: leaflet.icon.glyph({
      prefix: 'mdi',
      glyph: 'location_on',
    }),
  }).addTo(_map)

  pin.value = markRaw(_pin)
  map.value = markRaw(_map)

  _map.on('move', () => updateCoordinates())
  _map.locate({setView: true, maxZoom: 16})
  _map.on('locationfound', console.log)

  updateCoordinates()
}

const coordinates = ref({
  lat: null,
  lng: null,
})
function updateCoordinates() {
  const newCoordinates = map.value.getCenter()
  coordinates.value.lat = Number(newCoordinates.lat.toFixed(6))
  coordinates.value.lng = Number(newCoordinates.lng.toFixed(6))
  pin.value.setLatLng(newCoordinates)
}
</script>
