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
        :label="merchant?.id ? $t('Update', {}, 'Update') : $t('Set', {}, 'Set')"
        class="col button"
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
import { loadWallet } from 'src/wallet'
import PinLocationDialog from 'src/components/PinLocationDialog.vue'
import PhoneCountryCodeSelector from 'src/components/PhoneCountryCodeSelector.vue'

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

const walletHash = computed(() => {
  if (props.merchant?.walletHash) return props.merchant?.walletHash
  return $store.getters['global/getWallet']('bch')?.walletHash
})
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

async function hasEnoughBalance () {
  const wallet = await loadWallet('BCH')
  const response = await wallet.BCH.getBalance()
  const enough = response.balance >= 0.00003

  if (!enough) {
    $q.notify({
      icon: 'warning',
      color: 'warning',
      message: $t('MerchantVerificationMintingFeeMsg'),
    })
  }
  return enough
}

async function updateMerchantInfo() {
  const data = Object.assign({ walletHash: walletHash.value }, merchantInfoForm.value)

  if (data?.id) {
    const merchant = await $store.dispatch('paytacapos/getMerchant', { id: data.id })
    if (!merchant?.minter) {
      const enoughBal = await hasEnoughBalance()
      if (!enoughBal) return
    }
  } else {
    const enoughBal = await hasEnoughBalance()
    if (!enoughBal) return
  }
  
  loading.value = true
  $store.dispatch('paytacapos/updateMerchantInfo', data)
    .then(response => {
      $q.notify({
        icon: 'check',
        color: 'positive',
        message: $t('MerchantDetailsSaved', {}, 'Merchant details saved'),
      })
      $store.dispatch('paytacapos/mintVerificationMintingNft', { merchantId: response?.data?.id })
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
</script>
