<template>
  <q-pull-to-refresh
    id="app-container"
    class="marketplace-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('Marketplace')" backnavpath="/apps/marketplace" class="header-nav" />

    <div class="q-pa-sm q-pt-md text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row items-center q-px-sm">
        <div class="text-h5 q-space">Customer</div>
        <q-btn
          flat
          no-caps
          label="Reset"
          class="button button-text-primary"
          :class="getDarkModeClass(darkMode)"
          @click="() => resetFormData()"
        />
      </div>
      <q-form ref="form" @submit="() => updateCustomerData()" class="q-pa-sm">
        <q-banner v-if="formErrors?.detail?.length" class="bg-red text-white rounded-borders q-mb-md">
          <div v-if="formErrors?.detail?.length === 1">
            {{ formErrors?.detail?.[0] }}
          </div>
          <ul v-else class="q-pl-md">
            <li v-for="(err, index) in formErrors?.detail" :key="index">{{err}}</li>
          </ul>
        </q-banner>
        <q-input
          dense
          outlined
          :disable="loading"
          :dark="darkMode"
          label="First name"
          v-model="formData.firstName"
          :error="Boolean(formErrors?.firstName)"
          :error-message="formErrors?.firstName"
        />

        <q-input
          dense
          outlined
          :disable="loading"
          :dark="darkMode"
          label="Last name"
          v-model="formData.lastName"
          :error="Boolean(formErrors?.lastName)"
          :error-message="formErrors?.lastName"
        />

        <q-input
          dense
          outlined
          :disable="loading"
          :dark="darkMode"
          label="Phone number"
          v-model="formData.phoneNumber"
          :error="Boolean(formErrors?.phoneNumber)"
          :error-message="formErrors?.phoneNumber"
        />

        <div class="row items-center q-mb-sm">
          <div class="text-subtitle1">Default Address</div>
          <q-space/>
          <GeolocateBtn @geolocate="position => onGeolocate(position)" />
        </div>
        <div v-if="customer?.id" class="row q-mb-xs">
          <q-space/>
          <q-btn
            flat
            no-caps label="Manager other addresses"
            padding="sm md"
            class="text-underline q-r-mr-lg button button-text-primary"
            :class="getDarkModeClass(darkMode)"
            @click="() => showCustomerLocationsDialog = true"
          />
        </div>
        <q-input
          outlined
          dense
          :disable="loading"
          :dark="darkMode"
          label="Address"
          v-model="formData.defaultLocation.address1"
          :error="Boolean(formErrors?.defaultLocation?.address1)"
          :error-message="formErrors?.defaultLocation?.address1"
        />
        <div class="row items-start">
          <q-input
            outlined
            dense
            :disable="loading"
            :dark="darkMode"
            label="Street"
            v-model="formData.defaultLocation.street"
            class="col-12 col-sm-6"
            :error="Boolean(formErrors?.defaultLocation?.street)"
            :error-message="formErrors?.defaultLocation?.street"
            :rules="[
              val => Boolean(val) || 'Required',
            ]"
          />
          <q-input
            outlined
            dense
            :disable="loading"
            :dark="darkMode"
            label="City"
            v-model="formData.defaultLocation.city"
            class="col-12 col-sm-6"
            :error="Boolean(formErrors?.defaultLocation?.city)"
            :error-message="formErrors?.defaultLocation?.city"
            :rules="[
              val => Boolean(val) || 'Required',
            ]"
          />
        </div>

        <div class="row items-start">
          <q-input
            outlined
            dense
            :disable="loading"
            :dark="darkMode"
            label="State / Province"
            v-model="formData.defaultLocation.state"
            class="col-12 col-sm-6"
            :error="Boolean(formErrors?.defaultLocation?.state)"
            :error-message="formErrors?.defaultLocation?.state"
          />
          <CountriesFieldWrapper v-slot="{ filteredCountriesOpts, filterCountriesOpts }">
            <q-select
              outlined
              dense
              :disable="loading"
              :dark="darkMode"
              label="Country"
              clearable
              use-input
              fill-input
              hide-selected
              :options="filteredCountriesOpts"
              @filter="filterCountriesOpts"
              v-model="formData.defaultLocation.country"
              class="col-12 col-sm-6"
              :popup-content-class="darkMode ? '': 'text-black'"
              :error="Boolean(formErrors?.defaultLocation?.country)"
              :error-message="formErrors?.defaultLocation?.country"
              :rules="[
                val => Boolean(val) || 'Required',
              ]"
            />
          </CountriesFieldWrapper>
        </div>
        <q-field
          dense borderless
          no-error-icon
          :dark="darkMode"
          :color="darkMode ? 'white' : 'black'"
          :model-value="validCoordinates"
          :rules="[
            value => value || 'Input location',
          ]"
        >
          <div class="row items-center q-gutter-x-sm q-mt-sm full-width">
            <q-btn
              no-caps flat
              class="q-space button button-text-primary"
              :class="getDarkModeClass(darkMode)"
              @click="selectCoordinates()"
            >
              <q-icon name="location_on"/>
              <template v-if="validCoordinates">
                {{ formData.defaultLocation.longitude }}, {{ formData.defaultLocation.latitude }}
              </template>
              <template v-else>
                {{ $t('PinLocation') }}
              </template>
            </q-btn>
            <q-btn
              v-if="validCoordinates"
              icon="close"
              padding="xs"
              flat
              class="close-button"
              @click="() => {
                formData.defaultLocation.longitude = null
                formData.defaultLocation.latitude = null
              }"
            />
          </div>
        </q-field>

        <div class="q-mt-sm">
          <q-btn
            no-caps
            label="Save"
            type="submit"
            class="full-width button"
          />
        </div>
      </q-form>
    </div>
    <CustomerLocationsDialog v-model="showCustomerLocationsDialog"/>
  </q-pull-to-refresh>
</template>
<script setup>
import { backend } from 'src/marketplace/backend'
import { errorParser } from 'src/marketplace/utils'
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ref, computed, onMounted } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import CountriesFieldWrapper from 'src/components/marketplace/countries-field-wrapper.vue'
import PinLocationDialog from 'src/components/PinLocationDialog.vue'
import GeolocateBtn from 'src/components/GeolocateBtn.vue'
import CustomerLocationsDialog from 'src/components/marketplace/CustomerLocationsDialog.vue'

const props = defineProps({
  returnOnSave: [String, Boolean],
  hideStayOnPageOpt: [String, Boolean],
})

const $router = useRouter()
window.router = $router
const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

onMounted(() => resetFormData())
const customer = computed(() => $store.getters['marketplace/customer'])

const redirectRouteOnSave = computed(() => {
  if (!props.returnOnSave) return
  if (props.returnOnSave === true || props.returnOnSave === 'true') return -1
  try {
    const routeParamObj = JSON.parse(props.returnOnSave)
    return $router.resolve(routeParamObj) || routeParamObj
  } catch {
    return $router.resolve(props.returnOnSave) || props.returnOnSave
  }
})

const loading = ref(false)
const form = ref()
const formData = ref({
  firstName: '', lastName: '', phoneNumber: '',
  defaultLocation: {
    address1: '',
    address2: '',
    street: '',
    city: '',
    state: '',
    country: '',
    longitude: null,
    latitude: null,
  },
})

function resetFormData() {
  formData.value.firstName = customer.value?.firstName
  formData.value.lastName = customer.value?.lastName
  formData.value.phoneNumber = customer.value?.phoneNumber
  formData.value.defaultLocation = {
    address1: customer.value?.defaultLocation?.address1,
    address2: customer.value?.defaultLocation?.address2,
    street: customer.value?.defaultLocation?.street,
    city: customer.value?.defaultLocation?.city,
    state: customer.value?.defaultLocation?.state,
    country: customer.value?.defaultLocation?.country,
    longitude: parseFloat(customer.value?.defaultLocation?.longitude),
    latitude: parseFloat(customer.value?.defaultLocation?.latitude),
  }

  setTimeout(() => form.value?.resetValidation?.(), 10)
}

const validCoordinates = computed(() => 
  Number.isFinite(formData.value.defaultLocation.longitude) && Number.isFinite(formData.value.defaultLocation.latitude)
)
function selectCoordinates() {
  $q.dialog({
    component: PinLocationDialog,
    componentProps: {
      initLocation: {
        latitude: formData.value.defaultLocation.latitude,
        longitude: formData.value.defaultLocation.longitude,
      }
    }
  })
    .onOk(coordinates => {
      formData.value.defaultLocation.longitude = coordinates.lng
      formData.value.defaultLocation.latitude = coordinates.lat
    })
}

const formErrors = ref({
  detail: [],
  firstName: '', lastName: '', phoneNumber: '',
  defaultLocation: {
    address1: '',
    address2: '',
    street: '',
    city: '',
    state: '',
    country: '',
    longitude: '',
    latitude: '',
  },
})

function resetFormErrors() {
  formErrors.value = {
    detail: [],
    firstName: '', lastName: '', phoneNumber: '',
    defaultLocation: {
      address1: '',
      address2: '',
      street: '',
      city: '',
      state: '',
      country: '',
      longitude: '',
      latitude: '',
    },
  }
}

async function updateCustomerData() {
  const customerId = customer.value?.id
  const data = {
    ref: undefined,
    first_name: formData.value.firstName,
    last_name: formData.value.lastName,
    phone_number: formData.value.phoneNumber,
    default_location: {
      address1: formData.value.defaultLocation.address1,
      address2: formData.value.defaultLocation.address2,
      street: formData.value.defaultLocation.street,
      city: formData.value.defaultLocation.city,
      state: formData.value.defaultLocation.state,
      country: formData.value.defaultLocation.country,
      longitude: formData.value.defaultLocation.longitude,
      latitude: formData.value.defaultLocation.latitude,
    }
  }

  let request = null
  if (!customerId) {
    data.ref = await $store.dispatch('marketplace/getCartRef')
    request = backend.post(`connecta/customers/`, data)
  } else {
    request = backend.patch(`connecta/customers/${customerId}/`, data)
  }

  loading.value = true
  return request
    .finally(() => resetFormErrors())
    .then(response => {
      if (!response?.data?.id) return Promise.reject({ response })
      $store.commit('marketplace/setCustomerData', response?.data)
      resetFormData()
      const dialog = $q.dialog({
        title: 'Profile updated!',
        ok: false,
        cancel: false,
        color: 'brandblue',
        class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
      })
      if (redirectRouteOnSave.value) {
        const redirect = () => {
          if (typeof redirectRouteOnSave.value === 'number') $router.go(redirectRouteOnSave.value)
          else if (redirectRouteOnSave.value) $router.push(redirectRouteOnSave.value)
        }
        dialog.update({
          ok: !props.hideStayOnPageOpt ? { noCaps: true, label: 'Stay on this page', class: 'button' } : false,
          cancel: !props.hideStayOnPageOpt
            ? { noCaps: true, label: 'Return', flat: true, color: 'grey' }
            : { noCaps: true, label: 'Return', color: 'brandblue' },
        }).onCancel(redirect)
      }

      return response
    })
    .catch(error => {
      const data = error?.response?.data
      formErrors.value.detail = errorParser.toArray(data?.non_field_errors)
      formErrors.value.firstName = errorParser.firstElementOrValue(data?.first_name)
      formErrors.value.lastName = errorParser.firstElementOrValue(data?.last_name)
      formErrors.value.phoneNumber = errorParser.firstElementOrValue(data?.phone_number)
      formErrors.value.defaultLocation = {
        address1: errorParser.firstElementOrValue(data?.default_location?.address1),
        address2: errorParser.firstElementOrValue(data?.default_location?.address2),
        street: errorParser.firstElementOrValue(data?.default_location?.street),
        city: errorParser.firstElementOrValue(data?.default_location?.city),
        state: errorParser.firstElementOrValue(data?.default_location?.state),
        country: errorParser.firstElementOrValue(data?.default_location?.country),
        longitude: errorParser.firstElementOrValue(data?.default_location?.longitude),
        latitude: errorParser.firstElementOrValue(data?.default_location?.latitude),
      }
      if (!formErrors.value.detail?.length) {
        if (Array.isArray(data)) formErrors.value.detail = data
        if (data?.detail) formErrors.value.detail = [data?.detail]
      }
      if (!formErrors.value.detail?.length) formErrors.value.detail = ['Unable to update info']
    })
    .finally(() => {
      loading.value = false
    })
}

function onGeolocate(response) {
  $q.dialog({
    component: PinLocationDialog,
    componentProps: {
      initLocation: {
        latitude: response?.coords?.latitude,
        longitude: response?.coords?.longitude,
      }
    }
  }).onOk(pinLocationResp => {
    return reverseGeocode({ lat: pinLocationResp?.lat, lng: pinLocationResp?.lng, syncToForm: true })
  })
}

function reverseGeocode(opts = { lat: null, lng: null, syncToForm: false}) {
  const params = {
    lat: opts?.lat,
    lon: opts?.lng,
    format: 'json',
  }

  return backend.get(`https://nominatim.openstreetmap.org/reverse`, { params })
    .then(response => {
      const result = response?.data?.address
      const address1 = [
        result?.amenity || result?.shop || '',
        result?.village || result?.neighbourhood || result?.suburb || '',
      ].filter(Boolean).join(', ')

      const data = {
        address1: address1,
        address2: '',
        street: result?.road,
        city: result?.city,
        state: result?.state || result?.province || '', // most results have returned none so far
        country: result?.country || '',
        latitude: parseFloat(params.lat),
        longitude: parseFloat(params.lon),
      }
      if (opts?.syncToForm) Object.assign(formData.value.defaultLocation, data)
      return data
    })
}

const showCustomerLocationsDialog = ref(false)

async function refreshPage(done=()=>{}) {
  try {
    await Promise.all([
      $store.dispatch('marketplace/refetchCustomerData').then(() => resetFormData()),
    ])
  } finally {
    done()
  }
}
</script>
