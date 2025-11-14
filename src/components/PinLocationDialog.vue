<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" position="bottom" seamless full-height full-width>
    <q-card class="pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)" style="height:100%;width:100%;">
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
      <div :id="mapUid" class="leaflet-map" style="height:70vh;width:100%;">
      </div>
      <div v-if="searchResultValid && searchResult?.label" class="text-center ellipsis q-px-md">
        {{ searchResult?.label }}
      </div>
      <div v-else-if="reverseGeocoding" class="text-grey text-center">
        <q-spinner/>
      </div>
      <div v-else>&nbsp;</div>
      <div class="text-center row items-center justify-center text-subtitle1 ellipsis">
        <q-icon name="location_on"/> {{ coordinates?.lat }}, {{ coordinates?.lng }}
      </div>
      <q-card-actions>
        <q-btn
          v-if="!hideCancel"
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
          @click="onDialogOK(computedInnerVal)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { OpenStreetMapProvider, GeoSearchControl } from 'leaflet-geosearch';
import { debounce, useDialogPluginComponent } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useStore } from 'vuex';
import { computed, getCurrentInstance, inject, markRaw, onMounted, ref, watch } from 'vue';
import { geolocationManager } from 'src/boot/geolocation';

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
  static: Boolean,
  hideCancel: Boolean,
  markerIcon: Object,
  search: {
    default: () => {
      return {
        enable: false,
        autofocus: false,
        limitPanToSearchResult: true,
        forceResults: true,
      }
    }
  },
  disableGeolocate: Boolean,
})

const computedInnerVal = computed(() => {
  if (!searchResultValid.value) return coordinates.value
  return {
    lat: coordinates.value?.lat,
    lng: coordinates.value?.lng,
    bounds: searchResult.value.bounds,
    label: searchResult.value.label,
    components: searchResultAddressDetails.value,
  }
})

const mapUid = computed(() => `leaflet-map-${uid.value}`)
const map = ref(null)
const pin = ref(null)
const moved = ref(false)
onMounted(() => {
  setTimeout(() => initMap(), 250)
})
function initMap() {
  const mapOptions = {
    center: [11.2674652, 124.9370791],
    zoom: 13,
    preferCanvas: true,
  }
  let autoLocate = true
  if (Number.isFinite(props.initLocation?.latitude) && Number.isFinite(props.initLocation?.longitude)) {
    mapOptions.center[0] = props.initLocation?.latitude
    mapOptions.center[1] = props.initLocation?.longitude
    mapOptions.zoom = parseInt(props.initLocation?.zoom) || 18
    autoLocate = false
  }

  const _map = new leaflet.Map(mapUid.value, mapOptions)
  leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(_map);
  console.log('props.markerIcon', props.markerIcon)
  const iconOpts = Object.assign({ prefix: 'mdi', glyph: 'location_on' }, props.markerIcon)
  const icon = iconOpts?.iconUrl ? leaflet.icon(iconOpts) : leaflet.icon.glyph(iconOpts)
  const _pin = leaflet.marker(_map.getCenter(), {
    icon: icon,
  }).addTo(_map)

  pin.value = markRaw(_pin)
  map.value = markRaw(_map)

  _map.on('move', () => {
    moved.value = true
    updateCoordinates()
  })
  
  // Function to trigger reverse geocoding after map is ready
  const triggerInitialReverseGeocode = () => {
    if (props.search?.forceResults && coordinates.value?.lat && coordinates.value?.lng) {
      // Use setTimeout to ensure search control is ready
      setTimeout(() => {
        reverseGeocode()
      }, 500)
    }
  }
  
  if (!props.disableGeolocate && autoLocate && !props.static) {
    _map.locate({setView: true, maxZoom: 16, timeout: 3000 })
    _map.on('locationfound', () => {
      updateCoordinates()
      triggerInitialReverseGeocode()
    })
  }

  if (props.static) {
   _map.off('move') 
  }
  updateCoordinates()

  if(!props.static && props.search?.enable) {
    addSearch()
    if (props.search?.autofocus) {
      document.getElementsByClassName('pin-dialog-search-input')?.item(0)?.focus?.()
    }
    // Automatically reverse geocode the initial location
    triggerInitialReverseGeocode()
  } else if (props.search?.forceResults) {
    // Even if search UI is not enabled, still reverse geocode if forceResults is true
    // This requires the search control to be added first
    addSearch()
    triggerInitialReverseGeocode()
  }
}
watch(() => [props.static], () => {
  if (props.static) map.value.off('move')
  else map.on('move', () => updateCoordinates())
})

const coordinates = ref({
  lat: null,
  lng: null,
})
function updateCoordinates() {
  const newCoordinates = map.value.getCenter()
  coordinates.value.lat = Number(newCoordinates.lat.toFixed(6))
  coordinates.value.lng = Number(newCoordinates.lng.toFixed(6))
  pin.value.setLatLng(newCoordinates)

  if (moved.value &&
      props.search?.enable &&
      props.search?.forceResults &&
      !searchResultValid.value
  ) {
    reverseGeocode()
  }
}


const searchControl = ref()
function addSearch() {
  const search = new GeoSearchControl({
    provider: new OpenStreetMapProvider({
      params: {
        'accept-language': $store.getters['global/language'],
        // countrycodes: $store.getters['global/country']?.code,
        addressdetails: 1,
        featureType: 'road',
      }
    }),
    searchLabel: $t('SearchAddress', {}, 'Search address'),
    clearSearchLabel: $t('ClearSearch', {}, 'Clear search'),
    notFoundMessage: $t('AddressCouldNotBeFound', {}, 'Sorry, that address could not be found.'),
    style: 'bar',
    showMarker: false,
    classNames: {
      input: 'pin-dialog-search-input',
      item: 'pin-dialog-search-result-item ellipsis-2-lines',
      notfound: 'pin-dialog-search-not-found',
    }
  });
  searchControl.value = search

  map.value.addControl(search);
  map.value.on('geosearch/showlocation', handleSearchResult);
  console.log('Added search control')
}


const searchResultValid = computed(() => {
  if (Number.isNaN(searchResult.value.lat) || Number.isNaN(searchResult.value.lng)) {
    return false
  }

  const down = searchResult.value.bounds?.[0]?.[0]
  const up = searchResult.value.bounds?.[1]?.[0]
  const left = searchResult.value.bounds?.[0]?.[1]
  const right = searchResult.value.bounds?.[1]?.[1]
  // console.log({ down, up, left, right })

  const lat = coordinates.value?.lat
  const lng = coordinates.value?.lng
  // console.log({ lat, lng })

  const validLat = lat >= down && lat <= up
  const validLng = lng >= left && lng <= right
  // console.log({ validLat, validLng })

  return validLat && validLng
})
const searchResultAddressDetails = computed(() => {
  const addressDetails = searchResult.value?.raw?.address
  const address1 = [
    addressDetails?.amenity || addressDetails?.shop || '',
    addressDetails?.village || addressDetails?.neighbourhood || addressDetails?.suburb || '',
  ].filter(Boolean).join(', ')

  const data = {
    address1: address1,
    address2: '',
    street: addressDetails?.road,
    city: addressDetails?.city,
    state: addressDetails?.state || addressDetails?.province || '',
    country: addressDetails?.country || '',
    latitude: parseFloat(searchResult.value.lat),
    longitude: parseFloat(searchResult.value.lng),
  }
  return data
})

const searchResult = ref({
  isReverseGeocode: false,
  lat: 0,
  lng: 0,
  bounds: [ [0, 0], [0,0] ],
  label: '',
  raw: {},
})
function handleSearchResult(result) {
  searchResult.value = {
    isReverseGeocode: result?.isReverseGeocode,
    bounds: result?.location?.bounds,
    lat: result?.location?.y,
    lng: result?.location?.x,
    label: result?.location?.label,
    raw: result?.location?.raw,
  }
}

const reverseGeocoding = ref(false)
async function reverseGeocode() {
  if (searchResultValid.value) return

  const provider = searchControl.value?.options?.provider
  if (!provider) return

  try {
    reverseGeocoding.value = true
  
    const _searchResult = await provider.search({
      query: `${coordinates.value.lat},${coordinates.value.lng}`,
      limit: 1,
    })
    const result = _searchResult?.[0]
    handleSearchResult({ location: result, isReverseGeocode: true })
  } finally {
    reverseGeocoding.value = false
  }
}
reverseGeocode = debounce(reverseGeocode, 500)
</script>
<style lang="scss" scoped>
::v-deep .leaflet-map .leaflet-control-geosearch {
  color: black;
}

::v-deep .leaflet-map .leaflet-control-geosearch input.pin-dialog-search-input {
  background-color: white;
  color: black;
}

::v-deep .leaflet-map .leaflet-control-geosearch .pin-dialog-search-result-item {
  white-space: normal;
  border-left: 2px solid currentColor;
  margin-bottom: 4px;
  // overflow: unset;
  // text-overflow: unset;
  // border-bottom: 2px solid black;
}
::v-deep .leaflet-map .leaflet-control-geosearch .pin-dialog-search-not-found {
  color: grey;
  white-space: normal;
  overflow: unset;
  text-overflow: unset;
}
</style>
