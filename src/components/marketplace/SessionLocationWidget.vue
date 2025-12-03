<template>
  <div>
    <q-item
      dense
      clickable v-ripple
      :class="darkMode ? '' : 'text-black'"
      @click="() => openLocationSelector = true"
    >
      <q-item-section side class="q-pr-xs" :class="getDarkModeClass(darkMode)">
        <q-icon name="edit_location_alt" size="1.5rem" color="white"/>
      </q-item-section>
      <q-item-section class="text-bow text-white" :class="getDarkModeClass(darkMode)">
        <q-item-label v-if="sessionLocation?.name" caption>{{ sessionLocation?.name }}</q-item-label>
        <q-item-label v-if="sessionLocation?.formatted && sessionLocation?.validCoordinates">
          {{ sessionLocation?.formatted }}
        </q-item-label>
        <q-item-label v-else class="text-white">Set delivery location</q-item-label>
      </q-item-section>
    </q-item>
    <q-dialog v-model="openLocationSelector" position="bottom">
      <q-card class="br-15 pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            {{ $t('SelectLocation') }}
          </div>
          <q-space/>
          <q-btn
            flat
            icon="close"
            class="q-r-mx-md close-button"
            v-close-popup
          />
        </q-card-section>
        <q-card-section v-if="sessionLocation?.id" class="q-py-none">
          <div class="br-15" @click="() => showLocationInDialog(sessionLocation)">
            <LMap
              :zoom="17"
              :center="[sessionLocation?.latitude, sessionLocation?.longitude]"
              style="height:6rem;"
            >
              <LTileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                layer-type="base"
                name="OpenStreetMap"
              ></LTileLayer>
              <LMarker
                :lat-lng="{
                  lat: sessionLocation?.latitude,
                  lng: sessionLocation?.longitude,
                }"
              ></LMarker>
            </LMap>
          </div>

          <div class="q-mt-sm">
            <div v-if="sessionLocation?.name" class="text-caption">
              {{ sessionLocation?.name }}
              <template v-if="Number.isFinite(sessionLocation?.id)"> #{{ sessionLocation?.id }}</template>
            </div>
            <div>{{ sessionLocation?.formatted }}</div>
          </div>
        </q-card-section>
        <q-list class="q-my-md" separator>
          <div class="row items-center full-width q-mx-md">
            <q-btn
              flat no-caps no-wrap
              padding="sm"
              size="0.75rem"
              class="q-space button button-text-primary"
              :class="getDarkModeClass(darkMode)"
              @click.stop="() => setCurrentLocation()"
            >
              <q-icon name="location_on"/>
              {{ $t('UseCurrentLocation') }}
            </q-btn>
            <q-btn
              flat no-caps no-wrap
              padding="sm"
              size="0.75rem"
              class="q-space button button-text-primary"
              :class="getDarkModeClass(darkMode)"
              @click.stop="() => updateDeviceLocation()"
            >
              <q-icon name="location_on"/>
              {{ $t('SelectPinLocation') }}
            </q-btn>
          </div>
          <q-separator inset/>
          <q-item
            v-for="location in customerLocations" :key="location?.id"
            clickable v-ripple
            v-close-popup
            @click="() => $store.commit('marketplace/setSelectedSessionLocationId', location?.id)"
          >
            <q-item-section>
              <q-item-label class="text-subtitle1">
                <template v-if="location?.name">
                  {{ location?.name }} <span class="text-grey">#{{ location?.id }}</span>
                </template>
                <template v-else>
                  {{
                    $t(
                      'AddressLocationId',
                      { locationId: location?.id },
                      `Address #${ location?.id }`,
                    )
                  }}
                </template>
              </q-item-label>
              <q-item-label class="text-caption ellipsis-2-lines">
                {{ location?.formatted }}
              </q-item-label>
              <q-item-label v-if="location?.validCoordinates" class="text-body2 text-underline">
              </q-item-label>
            </q-item-section>
            <q-item-section side top style="padding-left:4px;">
              <q-btn
                flat
                no-caps
                padding="none sm"
                class="q-r-mx-lg"
                @click.stop="() => showLocationInDialog(location)"
              >
                <q-icon name="location_on"/>
                <span class="text-underline">{{ $t('ViewInMap') }}</span>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </q-dialog>
  </div>
</template>
<script setup>
import { Location } from "src/marketplace/objects";
import { geolocationManager } from "src/boot/geolocation";
import { useMarketplaceLocationManager } from "src/composables/marketplace/session-location";
import { useQuasar } from "quasar";
import { useStore } from "vuex";
import { ref, computed } from "vue";
import PinLocationDialog from "src/components/PinLocationDialog.vue";
import { LMap, LTileLayer, LMarker } from '@vue-leaflet/vue-leaflet'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const openLocationSelector = ref(false)
const {
  sessionLocation,
  deviceLocation,
  customerLocations,
  setCurrentLocation: _setCurrentLocation,
} = useMarketplaceLocationManager()


function showLocationInDialog(location=Location.parse()) {
  $q.dialog({
    component: PinLocationDialog,
    componentProps: {
      initLocation: {
        latitude: parseFloat(location?.latitude),
        longitude: parseFloat(location?.longitude)
      },
      static: true,
      headerText: location?.name || undefined,
    }
  }).onOk(() => {
    if (location?.id) {
      $store.commit('marketplace/setSelectedSessionLocationId', location?.id)
      openLocationSelector.value = false
    }
  })
}

async function updateDeviceLocation(opts={ dialogTitle: '', keepSelectorOpen: false }) {
  const data = await dialogPromise({
    component: PinLocationDialog,
    componentProps: {
      initLocation: {
        latitude: parseFloat(deviceLocation?.value?.latitude),
        longitude: parseFloat(deviceLocation?.value?.longitude)
      },
      headerText: t('PinLocation'),
    }
  })
  return setDeviceLocation(data, opts)
}

function setCurrentLocation(opts={ keepSelectorOpen: false, hideDialogOnError: false }) {
  return _setCurrentLocation({ showDialog: true, hideDialogOnError: opts?.hideDialogOnError })
    .then(result => {
      if (!opts?.keepSelectorOpen) openLocationSelector.value = false
      return result
    })
}

function setDeviceLocation(data, opts={ dialogTitle: '', keepSelectorOpen: false }) {
  const dialog = $q.dialog({
    title: opts?.dialogTitle || 'Pin location',
    color: 'brandblue',
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  })
  if (Number.isNaN(data?.lat) || Number.isNaN(data?.lng)) {
    dialog.update({ message: 'Invalid pin location' })
    return Promise.reject('Invalid pin location')
  }
  dialog.update({
    message: 'Getting address of pinned location',
    progress: true, ok: false, cancel: false, persistent: true,
  })
  const closestLocation = $store.getters['marketplace/getClosestCustomerLocation']?.({
    latitude: data?.lat, longitude: data?.lng,
  }, 75)

  let reverseGeocodePromise
  if (closestLocation) {
    // dialog doesn't get hidden when there is no delay
    reverseGeocodePromise = new Promise(resolve => {
      const parsedLocation = {
        ...closestLocation,
        latitude: data?.lat,
        longitude: data?.lng,
      }
      setTimeout(() => resolve(parsedLocation), 750)
    })
  } else {
    reverseGeocodePromise = geolocationManager.reverseGeocode({ lat: data?.lat, lon: data?.lng })
  }

  return reverseGeocodePromise
    .then(response => {
      $store.commit('marketplace/updateLocationData', response)
      $store.commit('marketplace/setSelectedSessionLocationId')
      dialog.hide()
      if (!opts?.keepSelectorOpen) openLocationSelector.value = false
    })
    .catch(error => {
      console.error(error)
      dialog.update({ message: 'Unable to get address' })
    })
    .finally(() => {
      dialog.update({ progress: false, persistent: false, ok: true })
    })
}


async function dialogPromise(qDialogOptions) {
  return new Promise((resolve, reject) => {
    $q.dialog(qDialogOptions).onOk(resolve).onDismiss(reject)
  })
}

defineExpose({
  openLocationSelector,
  setCurrentLocation,
  updateDeviceLocation,
})
</script>
