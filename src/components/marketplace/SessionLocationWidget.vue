<template>
  <div>
    <q-item
      dense
      clickable v-ripple
      @click="() => openLocationSelector = true"
    >
      <q-item-section side class="q-pr-xs button button-text-primary" :class="getDarkModeClass(darkMode)">
        <q-icon name="location_on" size="1.5rem"/>
      </q-item-section>
      <q-item-section class="text-bow" :class="getDarkModeClass(darkMode)">
        <q-item-label v-if="sessionLocation?.name" caption>{{ sessionLocation?.name }}</q-item-label>
        <!-- <q-item-label v-else caption><i>Set Location</i></q-item-label> -->
        <q-item-label >
          {{ sessionLocation?.formatted }}
        </q-item-label>
      </q-item-section>
    </q-item>
    <q-dialog v-model="openLocationSelector" position="bottom">
      <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            Select Location
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
            <div v-if="sessionLocation?.name" class="text-caption">{{ sessionLocation?.name }}</div>
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
              Use current location
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
              Select pin location
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
                <template v-else>Address #{{ location?.id }}</template>
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
                <span class="text-underline">View in map</span>
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
import { useQuasar } from "quasar";
import { useStore } from "vuex";
import { ref, computed } from "vue";
import PinLocationDialog from "src/components/PinLocationDialog.vue";
import { LMap, LTileLayer, LMarker } from '@vue-leaflet/vue-leaflet'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const openLocationSelector = ref(false)
const sessionLocation = computed(() => $store.getters['marketplace/sessionLocation'])
const deviceLocation = computed(() => $store.getters['marketplace/deviceLocation'])
const customerLocations = computed(() => $store.getters['marketplace/customerLocations'])

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
  })
}

function updateDeviceLocation() {
  $q.dialog({
    component: PinLocationDialog,
    componentProps: {
      initLocation: {
        latitude: parseFloat(deviceLocation?.value?.latitude),
        longitude: parseFloat(deviceLocation?.value?.longitude)
      },
      headerText: 'Pin location',
    }
  }).onOk(data => setDeviceLocation(data))
}

function setCurrentLocation() {
  const dialog = $q.dialog({
    title: 'Set location',
    message: 'Getting device location & address',
    color: 'brandblue',
    progress: true,
    persistent: true,
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode)}`,
    ok: false,
    cancel: false,
  })

  $store.dispatch('marketplace/updateLocation')
    .then(() => {
      dialog.hide()
      $store.commit('marketplace/setSelectedSessionLocationId')
    })
    .catch(error => {
      console.error(error)
    })
    .finally(() => {
      dialog.update({ progress: false, persistent: false, ok: true })
    })
}

function setDeviceLocation(data, dialogTitle='Pin location') {
  const dialog = $q.dialog({
    title: dialogTitle,
    color: 'brandblue',
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode)}`
  })
  if (Number.isNaN(data?.lat) || Number.isNaN(data?.lng)) {
    return dialog.update({ message: 'Invalid pin location' })
  }
  dialog.update({
    message: 'Getting address of pinned location',
    progress: true, ok: false, cancel: false, persistent: true,
  })
  geolocationManager.reverseGeocode({ lat: data?.lat, lon: data?.lng })
    .then(response => {
      $store.commit('marketplace/updateLocationData', response)
      $store.commit('marketplace/setSelectedSessionLocationId')
      dialog.hide()
      openLocationSelector.value = false
    })
    .catch(error => {
      console.error(error)
      dialog.update({ message: 'Unable to get address' })
    })
    .finally(() => {
      dialog.update({ progress: false, persistent: false, ok: true })
    })
}
</script>