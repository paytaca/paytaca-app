<template>
  <q-dialog
    ref="dialogRef"
    full-height full-width
    position="bottom"
    v-model="innerVal"
    @hide="onDialogHide"
    @show="autoCenter ? centerMap() : null"
  >
    <q-card
      class="br-15 pt-card-2 text-bow bottom-card"
      :class="getDarkModeClass(darkMode)"
      style="height:100%;width:100%;"
    >
      <div class="row no-wrap items-center justify-center q-pl-md">
        <div class="text-h6 q-space q-my-sm">{{ headerText || 'Map' }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
          class="close-button"
        />
      </div>
      <LMap
        ref="map"
        v-model:zoom="mapState.zoom"
        v-model:center="mapState.center"
        style="height:75vh;width:100%;"
      >
        <LTileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          layer-type="base"
          name="OpenStreetMap"
        />
        <slot name="map-content"></slot>
        <LMarker
          v-for="(location, index) in parsedLocations" :key="index"
          v-bind="location"
        >
          <LPopup v-if="location?.popup" :content="location?.popup"/>
        </LMarker>
        <slot name="controls" v-bind="{ centerMap, autoCenter }">
          <LControl>
            <div class="text-black q-pa-xs">
              <q-btn
                round
                icon="adjust"
                color="white"
                text-color="black"
                padding="xs"
                @click="() => centerMap()"
              />
              <!-- <q-checkbox dense v-model="autoCenter">
                <span class="text-weight-medium">Center view</span>
              </q-checkbox> -->
            </div>
          </LControl>
        </slot>
      </LMap>
    </q-card>
  </q-dialog>
</template>
<script>
import 'leaflet/dist/leaflet.css'
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex'
import { computed, defineComponent, ref, watch, inject } from 'vue'
import { LMap, LTileLayer, LMarker, LControl, LPopup } from '@vue-leaflet/vue-leaflet'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default defineComponent({
  name: 'LeafletMapDialog',
  components: {
    LMap,
    LTileLayer,
    LMarker,
    LControl,
    LPopup,
  },
  emits: [
    'update:modelValue',

    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
    locations: Array,
    headerText: String,
    autoCenter: Boolean,
  },
  setup(props, { emit: $emit }) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const leaflet = inject('$leaflet')

    const innerVal = ref(props?.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    const map = ref()
    const mapState = ref({
      zoom: 13,
      center: [11.2674652, 124.9370791],
    })

    const parsedLocations = computed(() => {
      if (!Array.isArray(props?.locations)) return []

      return props.locations.map(location => {
        const iconOpts = Object.assign({ prefix: 'mdi', glyph: 'location_on' }, location?.icon)
        const icon = iconOpts?.iconUrl ? leaflet.icon(iconOpts) : leaflet.icon.glyph(iconOpts)
        return {
          index: location?.index,
          latLng: {
            lng: parseFloat(location?.lon),
            lat: parseFloat(location?.lat),
          },
          options: {
            icon: icon,
            label: location?.label,
          },
          popup: location?.popup,
        }
      })
    })
    watch(parsedLocations, () => {
      if(autoCenter.value) centerMap()
    }, { deep: true })

    const autoCenter = ref(props.autoCenter)
    watch(() => [props.autoCenter], () => autoCenter.value = props.autoCenter)
    watch(autoCenter, () => autoCenter.value ? centerMap() : null)
    function centerMap() {
      const latitudes = parsedLocations.value.map(location => location?.latLng?.lat)
      const longitudes = parsedLocations.value.map(location => location?.latLng?.lng)
      const bottomLeft = [Math.min(...latitudes), Math.min(...longitudes)]
      const topRight = [Math.max(...latitudes), Math.max(...longitudes)]
      map.value?.leafletObject?.fitBounds?.([bottomLeft, topRight])
    }

    return {
      dialogRef, onDialogHide, onDialogOK, onDialogCancel,
      darkMode,
      innerVal,

      map,
      mapState,
      parsedLocations,
      autoCenter,
      centerMap,
    }
  },
  methods: {
    getDarkModeClass
  }
})
</script>
