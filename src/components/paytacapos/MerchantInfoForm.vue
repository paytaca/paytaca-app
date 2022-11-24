<template>
  <q-form @submit="updateMerchantInfo()">
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
        mask="####-###-####"
        placeholder="09##-###-####"
        v-model="merchantInfoForm.primaryContactNumber"
        lazy-rules
        hide-bottom-space
        :rules="[
          val => !val || String(val).match(/09\d{2}-?\d{3}-?\d{4}/) || $t('InvalidPhoneNumber', {}, 'Invalid phone number'),
        ]"
      />
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
      />
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
        color="brandblue"
        :label="merchantInfo?.id ? $t('Update', {}, 'Update') : $t('Set', {}, 'Set')"
        class="col"
        type="submit"
      />
    </div>
  </q-form>
</template>
<script setup>
import countriesJson from 'src/assets/countries.json'
import { useStore } from 'vuex';
import { useQuasar } from 'quasar';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n'
import PinLocationDialog from 'src/components/PinLocationDialog.vue'

defineEmits(['cancel'])
const props = defineProps({
  walletHash: String,
  readOnly: Boolean,
})

const $q = useQuasar()
const $store = useStore()
const $t = useI18n().t
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const loading = ref(false)

const walletHash = computed(() => {
  if (merchantInfo.value?.walletHash) return merchantInfo.value?.walletHash
  return $store.getters['global/getWallet']('bch')?.walletHash
})
const merchantInfo = computed(() => $store.getters['paytacapos/merchantInfo'])
const merchantInfoForm = ref({
  name: '',
  primaryContactNumber: '',
  location: {
    landmark: '',
    location: '',
    street: '',
    city: '',
    country: '',
    longitude: null,
    langitude: null,
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
  Number.isFinite(merchantInfoForm.value.location.longitude) && Number.isFinite(merchantInfoForm.value.location.latitude)
)
onMounted(() => resetForm())
function resetForm(opts={ clear: false }) {
  if (opts?.clear) {
    merchantInfoForm.value.name = ''
    merchantInfoForm.value.primaryContactNumber = ''
    merchantInfoForm.value.location.landmark = ''
    merchantInfoForm.value.location.location = ''
    merchantInfoForm.value.location.street = ''
    merchantInfoForm.value.location.city = ''
    merchantInfoForm.value.location.country = ''
    merchantInfoForm.value.location.longitude = null
    merchantInfoForm.value.location.langitude = null
    return
  }

  merchantInfoForm.value.name = merchantInfo.value?.name || ''
  merchantInfoForm.value.primaryContactNumber = merchantInfo.value?.primaryContactNumber || ''
  merchantInfoForm.value.location.landmark = merchantInfo.value?.location?.landmark || ''
  merchantInfoForm.value.location.location = merchantInfo.value?.location?.location || ''
  merchantInfoForm.value.location.street = merchantInfo.value?.location?.street || ''
  merchantInfoForm.value.location.city = merchantInfo.value?.location?.city || ''
  merchantInfoForm.value.location.country = merchantInfo.value?.location?.country || ''
  merchantInfoForm.value.location.longitude = Number(merchantInfo.value?.location?.longitude) || null
  merchantInfoForm.value.location.latitude = Number(merchantInfo.value?.location?.latitude) || null
}
function selectCoordinates() {
  $q.dialog({
    component: PinLocationDialog,
    componentProps: {
      initLocation: {
        latitude: merchantInfoForm.value.location.latitude,
        longitude: merchantInfoForm.value.location.longitude,
      }
    }
  })
    .onOk(coordinates => {
      merchantInfoForm.value.location.longitude = coordinates.lng
      merchantInfoForm.value.location.latitude = coordinates.lat
    })
}

function updateMerchantInfo() {
  loading.value = true
  const data = Object.assign({
    walletHash: walletHash.value,
  }, merchantInfoForm.value)
  $store.dispatch('paytacapos/updateMerchantInfo', data)
    .then(() => {
      $q.notify({
        icon: 'check',
        color: 'positive',
        message: $t('MerchantDetailsSaved', {}, 'Merchant details saved'),
      })
    })
    .finally(() => {
      loading.value = false
    })
}
</script>
