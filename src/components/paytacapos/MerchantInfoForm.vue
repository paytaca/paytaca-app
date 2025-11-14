<template>
  <q-form ref="form" @submit="updateMerchantInfo()">
    <div class="q-gutter-sm">
      <div class="text-subtitle1 text-grey">{{ $t('BusinessDetails', {}, 'Business details') }}</div>
      <q-input
        outlined
        dense
        :readonly="readOnly"
        :disable="loading"
        :dark="darkMode"
        :label="$t('BusinessName', {}, 'Business name') + ' *'"
        v-model="merchantInfoForm.name"
        hide-bottom-space
        :rules="[
          val => Boolean(val) || $t('Required', {}, 'Required'),
        ]"
      />
      <q-input
        outlined
        dense
        :readonly="readOnly"
        :disable="loading"
        :dark="darkMode"
        :label="$t('PrimaryContactNumber', {}, 'Primary contact number')"
        v-model="merchantInfoForm.primaryContactNumber"
        lazy-rules
        hide-bottom-space
        clearable
        :rules="[
          // val => Boolean(val),
          val => !val || String(val).match(/(0|(\+\d+))\d{3}-?\d{3}-?\d{4}/) || $t('InvalidPhoneNumber', {}, 'Invalid phone number'),
        ]"
        @update:model-value="() => merchantInfoForm.showContactNumberCodeSelector = true"
      >
        <PhoneCountryCodeSelector
          v-model="merchantInfoForm.showContactNumberCodeSelector"
          :needle="merchantInfoForm.primaryContactNumber"
          @selected-code="code => replacePrimaryNumberCode(code)"
          :dark="darkMode"
        />
      </q-input>
    </div>
    <div class="q-mt-sm q-gutter-sm">
      <div class="text-subtitle1 text-grey">{{ $t('Location', {}, 'Location') }}</div>
      <q-input
        outlined
        dense
        :readonly="readOnly"
        :disable="loading"
        :dark="darkMode"
        :label="$t('Address', {}, 'Address')"
        v-model="merchantInfoForm.location.location"
      >
        <template v-slot:append>
          <q-btn
            flat
            padding="sm"
            icon="search"
            @click="() => selectCoordinates({ autoFocusSearch: true })"
          />
        </template>
      </q-input>
      <q-input
        outlined
        dense
        :readonly="readOnly"
        :disable="loading"
        :dark="darkMode"
        :label="$t('Street', {}, 'Street')"
        v-model="merchantInfoForm.location.street"
      />
      <q-input
        outlined
        dense
        :readonly="readOnly"
        :disable="loading"
        :dark="darkMode"
        :label="$t('City', {}, 'City')"
        v-model="merchantInfoForm.location.city"
      />
      <q-input
        v-if="!countriesOpts.length"
        outlined
        dense
        :readonly="readOnly"
        :disable="loading"
        :dark="darkMode"
        :label="$t('Country', {}, 'Country')"
        v-model="merchantInfoForm.location.country"
      />
      <q-select
        v-else
        outlined
        dense
        :readonly="readOnly"
        :disable="loading"
        :dark="darkMode"
        :label="$t('Country', {}, 'Country')"
        clearable
        use-input
        fill-input
        hide-selected
        :options="filteredCountriesOpts"
        @filter="filterCountriesOpts"
        v-model="merchantInfoForm.location.country"
        :popup-content-class="darkMode ? '': 'text-black'"
      />
    </div>
    <div class="row items-center q-gutter-x-sm q-mt-sm">
      <q-btn
        v-if="!readOnly || validCoordinates"
        :disable="readOnly"
        no-caps flat
        class="q-space"
        @click="selectCoordinates()"
      >
        <q-icon name="location_on"/>
        <template v-if="validCoordinates">
          {{ merchantInfoForm.location.longitude }}, {{ merchantInfoForm.location.latitude }}
        </template>
        <template v-else>
          {{ $t('SetCoordinates', {}, 'Set coordinates') }}
        </template>
      </q-btn>
      <q-btn
        v-if="!readOnly && validCoordinates"
        icon="close"
        padding="xs"
        flat
        :disable="readOnly"
        @click="() => {
          merchantInfoForm.location.longitude = null
          merchantInfoForm.location.latitude = null
        }"
      />
    </div>
    <div v-if="!readOnly" class="q-mt-sm row q-gutter-sm">
      <q-btn
        outline
        no-caps
        :disable="loading"
        color="grey"
        :label="$t('Cancel', {}, 'Cancel')"
        class="col"
        @click="$emit('cancel')"
      />
      <q-btn
        no-caps
        :disable="loading"
        :label="merchant?.id ? $t('Update', {}, 'Update') : $t('Set', {}, 'Set')"
        class="col button"
        type="submit"
      />
    </div>
  </q-form>
</template>

<script setup>
import countriesJson from 'src/assets/countries.json'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { geolocationManager } from 'src/boot/geolocation';
import { useStore } from 'vuex';
import { useQuasar } from 'quasar';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n'
import PinLocationDialog from 'src/components/PinLocationDialog.vue'
import PhoneCountryCodeSelector from 'src/components/PhoneCountryCodeSelector.vue'
import { loadWallet } from 'src/wallet';

const $emit = defineEmits(['cancel', 'saved'])
const props = defineProps({
  walletHash: String,
  merchant: Object,
  readOnly: Boolean,
})

const $q = useQuasar()
const $store = useStore()
const $t = useI18n().t
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const loading = ref(false)

const wallet = ref(null)
onMounted(async () => wallet.value = await loadWallet('BCH', $store.getters['global/getWalletIndex']))

const walletHash = computed(() => {
  if (props.merchant?.walletHash) return props.merchant?.walletHash
  return $store.getters['global/getWallet']('bch')?.walletHash
})
const form = ref()
const merchantInfoForm = ref({
  id: 0,
  name: '',
  showContactNumberCodeSelector: false,
  primaryContactNumber: '',
  location: {
    landmark: '',
    location: '',
    street: '',
    city: '',
    country: '',
    latitude: null,
    longitude: null,
  }
})
const countriesOpts = computed(() => {
  if (!Array.isArray(countriesJson)) return []
  return countriesJson
    .map(countryJson => countryJson?.name)
    .filter(Boolean)
    .filter((e,i,s) => s.indexOf(e) === i)
})
const filteredCountriesOpts = ref([])
function filterCountriesOpts (val, update) {
  if (!val) {
    filteredCountriesOpts.value = countriesOpts.value
  } else {
    const needle = String(val).toLowerCase()
    filteredCountriesOpts.value = countriesOpts.value
      .filter(country => String(country).toLowerCase().indexOf(needle) >= 0)
  }
  update()
}

function replacePrimaryNumberCode(code='') {
  const isPhoneNumberLike = RegExp("\\+?[0-9\\-]+").test(merchantInfoForm.value.primaryContactNumber)
  if (typeof merchantInfoForm.value.primaryContactNumber !== 'string' || !isPhoneNumberLike) {
    merchantInfoForm.value.primaryContactNumber = code
    return
  }
  merchantInfoForm.value.primaryContactNumber = code + merchantInfoForm.value.primaryContactNumber.substring(code.length)
}


const validCoordinates = computed(() => 
  Number.isFinite(merchantInfoForm.value.location.longitude) && Number.isFinite(merchantInfoForm.value.location.latitude)
)
onMounted(() => resetForm())
watch(() => props.merchant?.id, () => resetForm())
function resetForm(opts={ clear: false }) {
  let merchantData = props.merchant
  if (opts?.clear) merchantData = null
  merchantInfoForm.value.id = merchantData?.id || 0
  merchantInfoForm.value.name = merchantData?.name || ''
  merchantInfoForm.value.primaryContactNumber = merchantData?.primaryContactNumber || ''
  merchantInfoForm.value.location.landmark = merchantData?.location?.landmark || ''
  merchantInfoForm.value.location.location = merchantData?.location?.location || ''
  merchantInfoForm.value.location.street = merchantData?.location?.street || ''
  merchantInfoForm.value.location.city = merchantData?.location?.city || ''
  merchantInfoForm.value.location.country = merchantData?.location?.country || ''
  merchantInfoForm.value.location.longitude = Number(merchantData?.location?.longitude) || null
  merchantInfoForm.value.location.latitude = Number(merchantData?.location?.latitude) || null

  setTimeout(() => form.value?.resetValidation(), 10)
}

onMounted(() => {
  geolocationManager.getOrUpdateGeoIp()
})

const attemptedGeolocation = ref(false)
async function getInitialSelectCoordinatePosition() {
  let dialog
  let showDialogTimeout = 0
  let dialogPromise
  const initLocation = {
    latitude: merchantInfoForm.value.location.latitude,
    longitude: merchantInfoForm.value.location.longitude,
    zoom: 18,
  }

  try {
    dialogPromise = new Promise((resolve, reject) => {
      showDialogTimeout = setTimeout(() => {
        dialog = $q.dialog({
          title: 'Getting location',
          progress: true,
          ok: false,
          cancel: { label: $t('Cancel'), flat: true, color: 'grey' },
          persistent: true,
          color: 'brandblue',
          class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
        }).onCancel(() => {
          reject('cancelled')
        }).onDismiss(resolve)

        // to prevent memory leak from unresolved promise
        setTimeout(resolve, 30 * 1000)
      }, 250)
    })

    if (!initLocation.latitude || !initLocation.longitude) {
      const deviceLocation = geolocationManager.location.value?.position
      if ((!deviceLocation?.longitude || !deviceLocation?.latitude) && !attemptedGeolocation.value) {
        attemptedGeolocation.value = true
        await Promise.race([
          geolocationManager.geolocate({ timeout: 5000 }).catch(console.error),
          dialogPromise,
        ])
      }
      initLocation.latitude = deviceLocation?.latitude
      initLocation.longitude = deviceLocation?.longitude
      initLocation.zoom = 16
    }

    if (!initLocation.latitude || !initLocation.longitude) {
      initLocation.latitude = geolocationManager.geoip.value?.latitude
      initLocation.longitude = geolocationManager.geoip.value?.longitude
      initLocation.zoom = 11
    }

    if (!initLocation.latitude || !initLocation.longitude) {
      initLocation.zoom = 10
    }

  } catch(error) {
    console.log('Error', error)
    if (error === 'cancelled') return initLocation
    throw error
  } finally {
    clearTimeout(showDialogTimeout)
    try { dialog?.hide?.() } catch {}
    dialogPromise = undefined
  }
  return initLocation
}

async function selectCoordinates(opts={ autoFocusSearch: false }) {
  // Request location permission if not already granted
  if (!geolocationManager.permissionState.value.granted) {
    try {
      await geolocationManager.updateGeolocationPermission({ request: true })
    } catch (error) {
      console.log('Location permission request failed:', error)
    }
  }

  // Show loading dialog while getting location
  let loadingDialog
  const showLoadingDialog = () => {
    loadingDialog = $q.dialog({
      title: $t('GettingLocation', {}, 'Getting your location'),
      message: $t('PleaseWait', {}, 'Please wait...'),
      progress: true,
      ok: false,
      persistent: true,
      color: 'brandblue',
      class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
    })
  }

  // Get user's current GPS location if permission is granted
  let gpsLocation = null
  if (geolocationManager.permissionState.value.granted) {
    try {
      showLoadingDialog()
      const locationResult = await geolocationManager.geolocate({ 
        timeout: 15000,
        enableHighAccuracy: true 
      })
      if (locationResult?.position?.latitude && locationResult?.position?.longitude) {
        gpsLocation = {
          latitude: locationResult.position.latitude,
          longitude: locationResult.position.longitude,
          zoom: 16,
        }
      }
    } catch (error) {
      console.log('Geolocation failed:', error)
    } finally {
      if (loadingDialog) {
        try { loadingDialog.hide() } catch {}
      }
    }
  }

  // Determine initial location
  let initLocation = null
  let disableGeolocate = true
  
  if (gpsLocation) {
    // Use accurate GPS location
    initLocation = gpsLocation
    disableGeolocate = true
  } else if (merchantInfoForm.value.location.latitude && merchantInfoForm.value.location.longitude) {
    // Use existing merchant coordinates if available
    initLocation = {
      latitude: merchantInfoForm.value.location.latitude,
      longitude: merchantInfoForm.value.location.longitude,
      zoom: 18,
    }
    disableGeolocate = true
  } else {
    // No location available - let the dialog try to geolocate
    // Get fallback location but allow dialog to refine it
    const fallbackLocation = await getInitialSelectCoordinatePosition()
    // Only use fallback if it's from GPS, otherwise let dialog geolocate
    const deviceLocation = geolocationManager.location.value?.position
    if (deviceLocation?.latitude && deviceLocation?.longitude) {
      initLocation = {
        latitude: deviceLocation.latitude,
        longitude: deviceLocation.longitude,
        zoom: 16,
      }
      disableGeolocate = true
    } else {
      // Use fallback but enable geolocate to refine
      initLocation = fallbackLocation
      disableGeolocate = false
    }
  }

  $q.dialog({
    component: PinLocationDialog,
    componentProps: {
      disableGeolocate: disableGeolocate,
      search: {
        enable: true,
        autofocus: opts?.autoFocusSearch,
        forceResults: true,
      },
      initLocation: initLocation,
    }
  })
    .onOk(coordinates => {
      merchantInfoForm.value.location.longitude = coordinates.lng
      merchantInfoForm.value.location.latitude = coordinates.lat

      if (!coordinates?.components) return console.log('No components')

      const components = coordinates.components
      const current = merchantInfoForm.value.location

      const emptyOrEqual = (initialVal, newVal) => !initialVal || initialVal == newVal
      const replaceAddressDetails = emptyOrEqual(current?.country, components?.country) &&
                                    emptyOrEqual(current?.city, components?.city) &&
                                    emptyOrEqual(current?.street, components?.street)

      if (!replaceAddressDetails) return

      merchantInfoForm.value.location.location = components.address1
      merchantInfoForm.value.location.landmark = components.address2
      merchantInfoForm.value.location.street = components.street
      merchantInfoForm.value.location.city = components.city
      merchantInfoForm.value.location.country = components.country
    })
}

async function getPubKey (index) {
  return await wallet.value.BCH.getPublicKey(undefined, undefined, true, index)
}

async function updateMerchantInfo() {
  loading.value = true
  
  const data = Object.assign({ walletHash: walletHash.value }, merchantInfoForm.value)
  let index = props.merchant?.index

  if (index === null || props.merchant === undefined) {
    const response = await $store.dispatch('paytacapos/getLatestMerchantIndex', walletHash.value)
    index = response.data.index
    const pubkey = await getPubKey(index)

    data.index = index
    data.pubkey = pubkey.receiving
  }

  await wallet.value.BCH.getNewAddressSet(index) // subscribe addresses used in vault

  $store.dispatch('paytacapos/updateMerchantInfo', data)
    .then(response => {
      $q.notify({
        icon: 'check',
        color: 'positive',
        message: $t('MerchantDetailsSaved', {}, 'Merchant details saved'),
      })
      $emit('saved', response?.data)
      return response
    })
    .then(response => {
      if (!$store.getters['paytacapos/merchantBranches']?.length) {
        $store.dispatch('paytacapos/refetchBranches', {
          walletHash: data?.walletHash,
          merchantId: data?.response?.id,
        })
      }
      return response
    })
    .finally(() => {
      loading.value = false
    })
}

defineExpose({
  resetForm,
})
</script>
