<template>
  <q-dialog
    v-model="innerVal"
    ref="dialogRef"
    position="bottom"
    @hide="onDialogHide"
    @show="() => openPinOnShow ? selectCoordinates() : null"
  >
    <q-card class="br-15 pt-card text-bow bottom-card" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="row items-center q-pb-sm">
          <div class="text-h5 q-space">
            {{ locationObj?.id ? $t('UpdateAddress') : $t('NewAddress') }}
          </div>
          <q-btn flat icon="close" padding="sm" v-close-popup class="close-button" />
        </div>
        <q-form ref="form" @submit="() => saveLocation()">
          <div class="text-subtitle1">{{ $t('Name') }}</div>
          <q-input
            outlined
            dense
            :disable="loading"
            :dark="darkMode"
            v-model="formData.name"
            hide-bottom-space
            :error="Boolean(formErrors?.name)"
            :error-message="formErrors?.name"
          />

          <q-separator :dark="darkMode" spaced/>

          <div class="text-subtitle1">{{ $t('Address') }}</div>
          <q-input
            outlined
            dense
            :disable="loading"
            :dark="darkMode"
            :label="$t('Address')"
            v-model="formData.address1"
            :error="Boolean(formErrors?.address1)"
            :error-message="formErrors?.address1"
          />
          <div class="row items-start">
            <q-input
              outlined
              dense
              :disable="loading"
              :dark="darkMode"
              :label="$t('Street')"
              v-model="formData.street"
              class="col-12 col-sm-6"
              :error="Boolean(formErrors?.street)"
              :error-message="formErrors?.street"
              :rules="[
                val => Boolean(val) || $t('Required'),
              ]"
            />
            <q-input
              outlined
              dense
              :disable="loading"
              :dark="darkMode"
              :label="$t('City')"
              v-model="formData.city"
              class="col-12 col-sm-6"
              :error="Boolean(formErrors?.city)"
              :error-message="formErrors?.city"
              :rules="[
                val => Boolean(val) || $t('Required'),
              ]"
            />
          </div>
          <div class="row items-start">
            <q-input
              outlined
              dense
              :disable="loading"
              :dark="darkMode"
              :label="$t('StateProvince')"
              v-model="formData.state"
              class="col-12 col-sm-6"
              :error="Boolean(formErrors?.state)"
              :error-message="formErrors?.state"
            />
            <CountriesFieldWrapper v-slot="{ filteredCountriesOpts, filterCountriesOpts }">
              <q-select
                outlined
                dense
                :disable="loading"
                :dark="darkMode"
                :label="$t('Country')"
                clearable
                use-input
                fill-input
                hide-selected
                :options="filteredCountriesOpts"
                @filter="filterCountriesOpts"
                v-model="formData.country"
                class="col-12 col-sm-6"
                :popup-content-class="darkMode ? '': 'text-black'"
                :error="Boolean(formErrors?.country)"
                :error-message="formErrors?.country"
                :rules="[
                  val => Boolean(val) || $t('Required'),
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
              value => value || $t('InputLocation'),
            ]"
          >
            <div class="row items-center q-gutter-x-sm q-mt-sm full-width">
              <q-btn
                :disable="loading"
                no-caps flat
                class="q-space button button-text-primary"
                :class="getDarkModeClass(darkMode)"
                @click="selectCoordinates()"
              >
                <q-icon name="location_on"/>
                <template v-if="validCoordinates">
                  {{ formData.longitude }}, {{ formData.latitude }}
                </template>
                <template v-else>
                  {{ $t('PinLocation') }}
                </template>
              </q-btn>
              <q-btn
                v-if="validCoordinates"
                :disable="loading"
                icon="close"
                padding="xs"
                flat
                @click="() => {
                  formData.longitude = null
                  formData.latitude = null
                }"
              />
            </div>
          </q-field>

          <div class="q-mt-sm">
            <q-btn
              :disable="loading"
              :loading="loading"
              no-caps
              :label="locationObj?.id ? $t('Update') : $t('Save')"
              class="full-width button"
              type="submit"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { backend } from 'src/marketplace/backend'
import { Location } from 'src/marketplace/objects'
import { errorParser, reverseGeocode } from 'src/marketplace/utils'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { computed, defineComponent, onMounted, ref, watch } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import PinLocationDialog from 'src/components/PinLocationDialog.vue'
import CountriesFieldWrapper from 'src/components/marketplace/countries-field-wrapper.vue'
import { useI18n } from "vue-i18n"

export default defineComponent({
  name: 'CustomerlocationFormDialog',
  components: {
    CountriesFieldWrapper,
  },
  emits: [
    'update:modelValue',
    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
    location: Location,
    hideOnSave: Boolean,
    openPinOnShow: Boolean,
  },
  setup(props, { emit: $emit }) {
    const { t } = useI18n()
    const $q = useQuasar()
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    const customer = computed(() => $store.getters['marketplace/customer'])
    const locationObj = ref(props.location)
    watch(() => [props.location?.id], () => {
      if (!props.location?.id) return
      locationObj.value = Location.parse(props.location?.raw)
    })

    onMounted(() => resetFormData())
    watch(innerVal, () => innerVal.value ? resetFormData() : null)
    watch(() => [locationObj.value?.id], () => resetFormData())
    const form = ref()
    const loading = ref(false)
    const formData = ref({
      name: '',
      address1: '',
      address2: '',
      street: '',
      city: '',
      state: '',
      country: '',
      longitude: '',
      latitude: '',
    })
    function resetFormData() {
      formData.value = {
        name: locationObj.value?.name,
        address1: locationObj.value?.address1,
        address2: locationObj.value?.address2,
        street: locationObj.value?.street,
        city: locationObj.value?.city,
        state: locationObj.value?.state,
        country: locationObj.value?.country,
        latitude: parseFloat(locationObj.value?.latitude),
        longitude: parseFloat(locationObj.value?.longitude),
      }
    }
    window.x = () => {
      formData.value.name = 'Test'
      formData.value.latitude = 11.203188
      formData.value.longitude = 124.993976
      reverseGeocodeFormData()
        .then(() => {
          formData.value.state = formData.value.state || 'Leyte'
        })
    }

    const validCoordinates = computed(() => 
      Number.isFinite(formData.value.longitude) && Number.isFinite(formData.value.latitude)
    )
    function selectCoordinates() {
      $q.dialog({
        component: PinLocationDialog,
        componentProps: {
          initLocation: {
            latitude: formData.value.latitude,
            longitude: formData.value.longitude,
          }
        }
      })
        .onOk(coordinates => {
          formData.value.longitude = coordinates.lng
          formData.value.latitude = coordinates.lat
          $q.dialog({
            title: t('ResolveAddress'),
            message: t('AutoFillFieldFromPinLocation'),
            ok: { class: 'button' },
            cancel: { flat: true, color: 'grey' },
            class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
          }).onOk(() => reverseGeocodeFormData())
        })
    }


    function createEmptyFormErrors() {
      return {
        detail: [],
        name: '',
        address1: '',
        address2: '',
        street: '',
        city: '',
        state: '',
        country: '',
        longitude: '',
        latitude: '',
      }
    }
    const formErrors = ref(createEmptyFormErrors())
    function clearFormErrors() {
      formErrors.value = createEmptyFormErrors()
    }

    function reverseGeocodeFormData() {
      if (!validCoordinates.value) return Promise.reject('Unable to reverse geocode due to invalid coordinates')
      loading.value = true
      return reverseGeocode({ lat: formData.value.latitude, lng: formData.value.longitude })
        .then(response => {
          formData.value.address1 = response?.address1
          formData.value.address2 = response?.address2
          formData.value.street = response?.street
          formData.value.city = response?.city
          formData.value.state = response?.state
          formData.value.country = response?.country
          formData.value.longitude = response?.longitude
          formData.value.latitude = response?.latitude
          return response
        })
        .finally(() => {
          loading.value = false
        })
    }

    function saveLocation() {
      const locationId = locationObj.value?.id
      const customerId = customer.value?.id
      const data = {
        name: formData.value?.name,
        address1: formData.value?.address1,
        address2: formData.value?.address2,
        street: formData.value?.street,
        city: formData.value?.city,
        state: formData.value?.state,
        country: formData.value?.country,
        longitude: formData.value?.longitude,
        latitude: formData.value?.latitude,
      }
      const request = locationId
        ? backend.patch(`connecta/customers/${customerId}/locations/${locationId}/`, data)
        : backend.post(`connecta/customers/${customerId}/locations/`, data)

      loading.value = true
      return request
        .finally(() => clearFormErrors())
        .then(response => {
          if (!response?.data?.id) return Promise.reject({ response })

          if (locationObj.value instanceof Location) {
            console.log('Instance of location')
            locationObj.value.raw = response?.data
          } else {
            console.log('Not instance')
            locationObj.value = Location.parse(response?.data)
          }
          resetFormData()
          $store.commit('marketplace/addCustomerLocation', response?.data)
          if (props.hideOnSave) onDialogOK(locationObj.value)
          return response
        })
        .catch(error => {
          console.error(error)
          const data = error?.response?.data
          formErrors.value.detail = errorParser.toArray(data?.non_field_errors)
          formErrors.value.address1 = errorParser.firstElementOrValue(data?.address1)
          formErrors.value.address2 = errorParser.firstElementOrValue(data?.address2)
          formErrors.value.street = errorParser.firstElementOrValue(data?.street)
          formErrors.value.city = errorParser.firstElementOrValue(data?.city)
          formErrors.value.state = errorParser.firstElementOrValue(data?.state)
          formErrors.value.country = errorParser.firstElementOrValue(data?.country)
          formErrors.value.longitude = errorParser.firstElementOrValue(data?.longitude)
          formErrors.value.latitude = errorParser.firstElementOrValue(data?.latitude)
          if (!formErrors.value.detail?.length) {
            if (Array.isArray(data)) formErrors.value.detail = data
            if (data?.detail) formErrors.value.detail = [data?.detail]
          }
          if (!formErrors.value.detail?.length) formErrors.value.detail = [
            locationId ? t('UnableToUpdateAddress') : t('UnableToAddAddress')
          ]
        })
        .finally(() => {
          loading.value = false
        })
    }

    return {
      darkMode,
      dialogRef, onDialogHide, onDialogOK, onDialogCancel,
      innerVal,

      locationObj,

      form,
      loading,
      formData,
      validCoordinates,
      selectCoordinates,
      formErrors,
      saveLocation,
    }
  },
  methods: {
    getDarkModeClass
  }
})
</script>
