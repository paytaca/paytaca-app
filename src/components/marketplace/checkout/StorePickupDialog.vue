<template>
  <q-dialog
    v-model="innerVal"
    ref="dialogRef"
    @hide="onDialogHide"
    position="bottom"
    persistent
  >
    <q-card
      class="dialog-content-base br-15 text-bow"
      :class="getDarkModeClass(darkMode, 'pt-card-3', 'pt-card-2')"
      style="max-height:60vh !important;"
    >
      <div class="row items-start no-wrap dialog-content-header">
        <div class="text-h6">{{ title }}</div>
        <q-space/>
        <q-btn v-close-popup flat icon="close" class="q-r-mr-lg"/>
      </div>
      <q-card-section class="q-pt-none">
        <div>{{ message }}</div>
        <q-banner class="shadow-2 pt-card-2 q-mt-sm" :class="getDarkModeClass(darkMode)" rounded>
          <div class="row items-center no-wrap">
            <img :src="merchantLocationPin" style="height:2.5rem;" class="q-my-xs q-mr-sm"/>
            <div class="q-space">
              <div class="text-body2">{{ storefront?.name || 'Pickup location:' }}</div>
              <div class="text-body1">
                {{ storefront?.location?.formatted }}
                <template v-if="formattedDistance">
                  |
                  <span :class="`text-${distanceColor} text-weight-medium`">
                    <template v-if="distanceData?.type === 'aerial'">&GreaterEqual;</template>
                    {{ formattedDistance }}
                  </span>
                </template>
              </div>
            </div>
            <div>
              <q-btn
                :outline="darkMode"
                padding="1em"
                round
                icon="map"
                @click="() => showMap = !showMap"
              />
            </div>
          </div>
        </q-banner>
        <LeafletMapDialog v-model="showMap" :locations="mapLocations" :autoCenter="true"/>
        <div class="q-gutter-y-sm q-mt-md">
          <q-btn
            no-caps label="Pick up from store instead"
            color="brandblue"
            class="full-width"
            @click="() => onDialogOK()"
          />
          <!-- <q-btn
            outline
            no-caps label="Cancel"
            color="grey"
            class="full-width"
            @click="() => onDialogCancel()"
          /> -->
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { Storefront } from 'src/marketplace/objects';
import { aerialDistance, round } from 'src/marketplace/utils';
import { computedAsync } from '@vueuse/core';
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex';
import { defineComponent, ref, watch, computed } from 'vue'
import LeafletMapDialog from 'src/components/LeafletMapDialog.vue';

import merchantLocationPin from 'src/assets/marketplace/merchant_map_marker_2.png'
import customerLocationPin from 'src/assets/marketplace/customer_map_marker.png'
import { cachedBackend } from 'src/marketplace/backend';

export default defineComponent({
  name: 'StorePickupDialog',
  components: {
    LeafletMapDialog,
  },
  emits: [
    'update:modelValue',
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
    storefront: Storefront,
    title: {
      type: String,
      default: 'No riders available nearby',
    },
    message: {
      type: String,
      default: 'Delivery might not be available. Would you like to pickup your order from the store instead?'
    },
    relativeLocation: {
      type: Object,
      default: () => {
        return { latitude: parseFloat(), longitude: parseFloat() }
      }
    },
  },
  setup(props, { emit: $emit }) {
    const { dialogRef, onDialogCancel, onDialogHide, onDialogOK } = useDialogPluginComponent()

    const innerVal = ref(props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))
    watch(() => props.modelValue, () => innerVal.value = props.modelValue)

    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])

    const distanceData = computedAsync(() => {
      const lat = parseFloat(props.relativeLocation?.latitude)
      const lng = parseFloat(props.relativeLocation?.longitude)
      if (Number.isNaN(lat) || Number.isNaN(lng)) return
      if (!props.storefront?.location?.validCoordinates) return

      const params = {
        storefront_id: props.storefront?.id,
        delivery_location: [round(lat, 6), round(lng, 6)].join(','),
      }
      return cachedBackend.get(
        `connecta-express/calculate_delivery/`,
        { params, cache: { ttle: 300 * 1000 } },
      )
        .then(response => {
          return { type: 'driving', distance: response?.data?.distance }
        })
        .catch(() => {
          const distance = aerialDistance({
            pos1: { latitude: lat, longitude: lng },
            pos2: props.storefront?.location,
          })
          return { type: 'aerial', distance }
        })
    }, { type: 'aerial', distance: NaN})

    const distance = computed(() => distanceData.value.distance)
    const distanceColor = computed(() => {
      if (Number.isNaN(distance.value)) return 'grey'
      if (distance.value > 500) return 'amber'
      if (distance.value > 1000) return 'orange'
      return 'green'
    })

    const formattedDistance = computed(() => {
      if (Number.isNaN(distance.value)) return ''

      if (distance.value > 250) return `${round(distance.value/1000, 3)} km`
      return `${round(distance.value, 0)} meters`
    })

    const showMap = ref(false)
    const mapLocations = computed(() => {
      const data = []
      data.push({
        popup: ['Pickup location', props.storefront?.location?.formatted].filter(Boolean).join(': '),
        lat: props.storefront?.location?.latitude,
        lon: props.storefront?.location?.longitude,
        icon: {
          iconUrl: merchantLocationPin,
          iconSize: [30, 45],
          iconAnchor: [15, 45],
          popupAnchor:  [0, -45],
        },
      })

      data.push({
        popup: 'Your location',
        lat: parseFloat(props.relativeLocation?.latitude),
        lon: parseFloat(props.relativeLocation?.longitude),
        icon: {
          iconUrl: customerLocationPin,
          iconSize: [30, 45],
          iconAnchor: [15, 45],
          popupAnchor:  [0, -45],
        },
      })
      return data
    })

    return {
      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,
      darkMode,

      distanceData,
      distance,
      distanceColor,
      formattedDistance,

      showMap,
      mapLocations,

      merchantLocationPin,
      getDarkModeClass,
    }
  },
})
</script>
<style lang="scss" scoped>
.dialog-content-base {
  overflow: auto;
  background-color: white;
}

.dialog-content-base .dialog-content-header {
  position: sticky;
  top: 0;
  width: 100%;
  z-index: 100;
  background-color: inherit;
  padding: map-get($space-md, 'y') map-get($space-md, 'x');
}

body.body--dark .dialog-content-base {
  background-color: $dark;
}
</style>
