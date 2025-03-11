<template>
  <q-dialog ref="dialogRef" v-model="innerVal" @hide="onDialogHide" :persistent="loading" seamless class="no-click-outside">
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width:min(350px, 90vw)">
      <div class="row no-wrap items-center justify-center q-pl-md q-py-sm">
        <div class="text-h5 q-space q-mt-sm">
          <template v-if="newBranch">
            {{ $t('NewBranch') }}
          </template>
          <template v-else>
            {{ branchInfo?.name }}
          </template>
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-card-section>
        <q-form ref="form" @submit="saveBranchInfo()">

          <div class="q-gutter-sm">
            <div class="row items-center">
              <div class="text-subtitle1 text-grey">
                {{ $t('BranchDetails', {}, 'Branch details') }}
              </div>
              <q-space/>
              <q-btn v-if="branchInfo?.id" flat icon="delete_outline" color="red" @click="confirmDeleteBranch()"/>
            </div>
            <q-input
              outlined
              dense
              :readonly="readOnly"
              :disable="loading"
              :dark="darkMode"
              :label="$t('BranchName', {}, 'Branch name') + ' *'"
              v-model="branchInfoForm.name"
              hide-bottom-space
              :rules="[
                val => Boolean(val) || $t('Required', {}, 'Required'),
              ]"
            />
            <div class="row items-center">
              <div class="q-space"></div>
              <q-checkbox
                dense
                :dark="darkMode"
                :label="$t('IsNewBranch')"
                v-model="branchInfoForm.isMain"
              />
            </div>
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
              v-model="branchInfoForm.location.location"
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
              v-model="branchInfoForm.location.street"
            />
            <q-input
              outlined
              dense
              :readonly="readOnly"
              :disable="loading"
              :dark="darkMode"
              :label="$t('City', {}, 'City')"
              v-model="branchInfoForm.location.city"
            />
            <q-input
              v-if="!countriesOpts.length"
              outlined
              dense
              :readonly="readOnly"
              :disable="loading"
              :dark="darkMode"
              :label="$t('Country', {}, 'Country')"
              v-model="branchInfoForm.location.country"
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
              :popup-content-class="darkMode ? '': 'text-black'"
              :options="filteredCountriesOpts"
              @filter="filterCountriesOpts"
              v-model="branchInfoForm.location.country"
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
                {{ branchInfoForm.location.longitude }}, {{ branchInfoForm.location.latitude }}
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
                branchInfoForm.location.longitude = null
                branchInfoForm.location.latitude = null
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
              @click="onDialogCancel"
            />
            <q-btn
              no-caps
              :disable="loading"
              class="button col"
              :label="branchInfo?.id ? $t('Update', {}, 'Update') : $t('Set', {}, 'Set')"
              type="submit"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import countriesJson from 'src/assets/countries.json'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { geolocationManager } from 'src/boot/geolocation'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useStore } from 'vuex'
import { computed, ref, onMounted, watch } from 'vue'
import PinLocationDialog from 'src/components/PinLocationDialog.vue'

// dialog plugins requirement
const $emit = defineEmits([
  'update:modelValue',
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits,
])

const props = defineProps({
  modelValue: Boolean,
  newBranch: Boolean,
  readOnly: Boolean,
  merchantId: [Number, String],
  branchId: Number,
})
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const innerVal = ref(props.modelValue)
watch(innerVal, () => $emit('update:modelValue', innerVal.value))
watch(() => props.modelValue, () => innerVal.value = props.modelValue)

const $q = useQuasar()
const $store = useStore()
const $t = useI18n().t
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const branchInfo = computed(() => {
  if (props.newBranch) return
  return $store.getters['paytacapos/merchantBranches']
    .find(branchInfo => branchInfo?.id === props.branchId)
})
const loading = ref(false)
const form = ref()
const branchInfoForm = ref({
  name: '',
  isMain: false,
  location: {
    landmark: '',
    location: '',
    street: '',
    city: '',
    country: '',
    longitude: null,
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

const validCoordinates = computed(() => 
  Number.isFinite(branchInfoForm.value.location.longitude) && Number.isFinite(branchInfoForm.value.location.latitude)
)
onMounted(() => resetForm())
watch(() => [innerVal.value, props?.branchId, props?.newBranch], () => {
  if (!innerVal.value) return
  resetForm()
})
function resetForm(opts={ clear: false }) {
  let branchData = branchInfo.value
  if (opts?.clear) branchData = null
  branchInfoForm.value.name = branchData?.name || ''
  branchInfoForm.value.isMain = branchData?.isMain || false
  branchInfoForm.value.location.landmark = branchData?.location?.landmark || ''
  branchInfoForm.value.location.location = branchData?.location?.location || ''
  branchInfoForm.value.location.street = branchData?.location?.street || ''
  branchInfoForm.value.location.city = branchData?.location?.city || ''
  branchInfoForm.value.location.country = branchData?.location?.country || ''
  branchInfoForm.value.location.longitude = Number(branchData?.location?.longitude) || null
  branchInfoForm.value.location.latitude = Number(branchData?.location?.latitude) || null

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
    latitude: branchInfoForm.value.location.latitude,
    longitude: branchInfoForm.value.location.longitude,
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
  const initLocation = await getInitialSelectCoordinatePosition()
  $q.dialog({
    component: PinLocationDialog,
    componentProps: {
      disableGeolocate: true,
      search: {
        enable: true,
        autofocus: opts?.autoFocusSearch,
        forceResults: true,
      },
      initLocation: initLocation,
    }
  })
    .onOk(coordinates => {
      branchInfoForm.value.location.longitude = coordinates.lng
      branchInfoForm.value.location.latitude = coordinates.lat

      if (!coordinates?.components) return console.log('No components')

      const components = coordinates.components
      const current = branchInfoForm.value.location

      const emptyOrEqual = (initialVal, newVal) => !initialVal || initialVal == newVal
      const replaceAddressDetails = emptyOrEqual(current?.country, components?.country) &&
                                    emptyOrEqual(current?.city, components?.city) &&
                                    emptyOrEqual(current?.street, components?.street)

      if (!replaceAddressDetails) return

      branchInfoForm.value.location.location = components.address1
      branchInfoForm.value.location.landmark = components.address2
      branchInfoForm.value.location.street = components.street
      branchInfoForm.value.location.city = components.city
      branchInfoForm.value.location.country = components.country
    })
}

function saveBranchInfo() {
  loading.value = true
  const data = Object.assign({}, branchInfoForm.value)
  if (!props.newBranch) {
    data.id = branchInfo.value?.id
    data.merchantId = branchInfo.value?.merchant?.id
  } else {
    data.merchantId = props.merchantId
  }

  $store.dispatch('paytacapos/updateBranchInfo', data)
    .then((response) => {
      $q.notify({
        icon: 'check',
        color: 'positive',
        message: $t('BranchDetailsSaved', {}, 'Branch details saved'),
      })
      onDialogOK({ new: !data.id, branch: response?.data })
    })
    .catch(() => {
      $q.notify({
        icon: 'error',
        color: 'negative',
        message: $t('UnknownErrorOccurred', {}, 'Unknown error occurred'),
      })
    })
    .finally(() => {
      loading.value = false
    })
}

function confirmDeleteBranch() {
  $q.dialog({
    title: $t('RemoveBranch', {}, 'Remove branch'),
    message: $t('RemoveBranchConfirm', {}, 'Remove branch. Are you sure?'),
    seamless: true,
    cancel: true,
    ok: true,
    class: `pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })
    .onOk(() => {
      $store.dispatch('paytacapos/deleteBranch', { branchId: branchInfo.value?.id, walletHash: branchInfo.value?.merchantWalletHash })
        .then(() => {
          $q.dialog({
            message: $t('BranchRemoved', {}, 'Branch removed'),
            seamless: true,
            ok: true,
            class: `pt-card text-bow ${getDarkModeClass(darkMode.value)}`
          })
          onDialogCancel()
        })
        .catch(error => {
          const data = error?.response?.data
          let errorMessage
          if (typeof data?.detail == String && data?.detail) errorMessage = data?.detail
          if (Array.isArray(data) && data?.length) errorMessage = data?.[0]
          $q.dialog({
            message: errorMessage || $t('FailedRemoveBranch', {}, 'Failed to remove branch'),
            class: `pt-card text-bow ${getDarkModeClass(darkMode.value)}`,
            seamless: true,
            ok: true
          })
        })
    })
}
</script>
