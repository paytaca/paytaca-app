<template>
  <div class="row items-center q-my-sm">
    <div>Payment type</div>
    <q-space/>
    <q-btn no-caps class="button" @click="openDialog = !openDialog">
      <template v-if="currentAmountToken?.category || currentDeliveryFeeToken?.category">
        CashTokens
      </template>
      <template v-else>
        BCH
      </template>
    </q-btn>

    <q-dialog v-model="openDialog" position="bottom" :persistent="savingPaymentOptions">
      <q-card class="br-15 pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)">
        <q-card-section style="transition: all 0.5 ease-in-out;">
          <div class="row items-center no-wrap">
            <div class="text-h6">{{ $t('SelectPayment') }}</div>
            <q-space/>
            <q-btn flat icon="close" v-close-popup class="q-r-mr-md close-button" />
          </div>
          <q-tab-panels :model-value="dialogTab" animated style="background: none;">
            <q-tab-panel name="main" class="q-pa-none">
              <div style="min-height:30vh;">
                <div v-if="formErrors.errors?.length" class="q-pa-sm rounded-borders bg-red text-white errors-list">
                  <div v-for="error in formErrors?.errors" class="errors-list-item">{{ error }}</div>
                </div>
                <div class="row items-center q-py-sm" @click="selectAmountToken()">
                  <div>
                    <div class="text-subtitle1">{{ $t('Merchant') }}</div>
                    <div class="text-caption">{{ checkoutAmounts?.subtotal?.currency }} {{ checkoutCurrency }}</div>
                  </div>
                  <q-space/>
                  <div>{{ tokenSelectForm?.amountToken?.symbol }}</div>
                  <q-icon name="chevron_right"/>
                </div>
                <div v-if="!isStorePickup" class="row items-center q-py-sm" @click="selectDeliveryFeeToken()">
                  <div>
                    <div class="text-subtitle1">{{ $t('DeliveryFee') }}</div>
                    <div class="text-caption">{{ checkoutAmounts?.deliveryFee?.currency }} {{ checkoutCurrency }}</div>
                  </div>
                  <q-space/>
                  <div>{{ tokenSelectForm?.deliveryFeeToken?.symbol }}</div>
                  <q-icon name="chevron_right"/>
                </div>
              </div>
              <q-btn
                no-caps label="Set"
                :disable="savingPaymentOptions"
                :loading="savingPaymentOptions"
                class="button full-width "
                @click="savePaymentOptions()"
              />
            </q-tab-panel>
            <q-tab-panel name="list" class="q-pa-none">
              <div style="min-height:30vh; max-height:50vh; overflow: auto;">
                <div
                  v-for="(token, index) in paymentOptions" :key="index"
                  class="row items-center q-mb-sm"
                  style="min-height:50px;"
                  @click="setSelectedToken(token)"
                >
                  <img
                    height="35"
                    :src="parseTokenImageUrl(token?.imageUrl)"
                    :fallback-src="parseTokenImageUrl(token?.imageUrl, true)"
                    class="q-mr-sm"
                    @error="onImgErrorIpfsSrc"
                  />
                  <div class="text-subtitle1">{{ token?.name }}</div>
                  <q-space/>
                  <div>
                    {{ getTokenBalance(token?.category || null) }}
                    {{ token?.symbol }}
                  </div>
                </div>
              </div>

              <q-btn
                no-caps label="Cancel"
                outline
                class="full-width"
                @click="cancelTokenSelect()"
              />
            </q-tab-panel>
          </q-tab-panels>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>
<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { convertIpfsUrl, IPFS_DOMAINS } from 'src/wallet/cashtokens';
import { Checkout, FungibleCashToken } from 'src/marketplace/objects';
import { errorParser } from 'src/marketplace/utils';
import { backend } from 'src/marketplace/backend';
import { useCheckoutDetails } from 'src/composables/marketplace/checkout';
import { useI18n } from 'vue-i18n'
import { useStore } from 'vuex'
import { computed, onMounted, ref, watch } from 'vue';

const $emit = defineEmits([
  'newCheckoutData',
])
const props = defineProps({
  checkout: Checkout,
})
const { t: $t } = useI18n()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const checkoutRef = computed(() => props.checkout)
const { isStorePickup, checkoutAmounts, checkoutCurrency } = useCheckoutDetails(checkoutRef)
const openDialog = ref(false)

const bchPaymentOpt = FungibleCashToken.parse({ name: 'Bitcoin Cash', symbol: 'BCH', decimals: 8, category: null, image_url: 'bch-logo.png' })
const paymentOptions = ref([bchPaymentOpt])

function parseTokenImageUrl(url, fallbackUrl=false) {
  let domain = !fallbackUrl ? undefined : IPFS_DOMAINS[1];
  return convertIpfsUrl(url, domain)
}

/**
 * @param {Event} evt 
 */
function onImgErrorIpfsSrc(evt) {
  if (evt.target?.fallbackHandled) return

  evt.target.fallbackHandled = true;
  const fallbackSrc = evt.target?.attributes?.['fallback-src']?.value;
  if (fallbackSrc && evt.target.src != fallbackSrc) {
    evt.target.src = fallbackSrc;
  }
}


onMounted(() => fetchTokenOptions())
watch(() => props.checkout?.cart?.storefrontId, () => fetchTokenOptions())
function fetchTokenOptions() {
  const params = {
    checkout_id: props.checkout?.id || null,
  }

  return backend.get(`cashtokens/fungible/`, { params })
    .then(response => {
      const results = response?.data?.results
      if (!Array.isArray(results)) return

      paymentOptions.value = results.map(FungibleCashToken.parse)
      paymentOptions.value.unshift(bchPaymentOpt)
    })
}

const currentAmountToken = computed(() => props.checkout?.payment?.amountToken || bchPaymentOpt)
const currentDeliveryFeeToken = computed(() => props.checkout?.payment?.deliveryFeeToken || bchPaymentOpt)
const tokenSelectForm = ref({
  selectStateKey: '', // amountToken | deliveryFeeToken
  amountToken: currentAmountToken.value,
  deliveryFeeToken: currentDeliveryFeeToken.value,
})
const hasChanges = computed(() => {
  return currentAmountToken.value?.category != tokenSelectForm.value?.amountToken?.category ||
    currentDeliveryFeeToken.value?.category != tokenSelectForm.value?.deliveryFeeToken?.category
})
watch(openDialog, () => resetForm())
function resetForm() {
  tokenSelectForm.value.selectStateKey = '';
  tokenSelectForm.value.amountToken = currentAmountToken.value;
  tokenSelectForm.value.deliveryFeeToken = currentDeliveryFeeToken.value;
}

const formErrors = ref({ errors: [] })
function resetFormErrors() {
  formErrors.value = { errors: [] }
}

const dialogTab = computed(() => tokenSelectForm.value?.selectStateKey ? 'list' : 'main')

function selectAmountToken() {
  tokenSelectForm.value.selectStateKey = 'amountToken'
}
function selectDeliveryFeeToken() {
  tokenSelectForm.value.selectStateKey = 'deliveryFeeToken'
}
function cancelTokenSelect() {
  tokenSelectForm.value.selectStateKey = ''
} 
function setSelectedToken(token=FungibleCashToken.parse()) {
  tokenSelectForm.value[tokenSelectForm.value.selectStateKey] = token
  cancelTokenSelect()
}


const savingPaymentOptions = ref(false)
function savePaymentOptions() {
  const data = {
    payment: {
      amount_token_category: tokenSelectForm.value?.amountToken?.category,
      delivery_fee_token_category: tokenSelectForm.value?.deliveryFeeToken?.category,
    }
  }
  const requirePriceUpdates = hasChanges.value
  savingPaymentOptions.value = true
  return backend.patch(`connecta/checkouts/${props.checkout?.id}/`, data)
    .finally(() => savingPaymentOptions.value = false)
    .finally(() => resetFormErrors())
    .then(response => {
      openDialog.value = false
      $emit('newCheckoutData', response?.data, {
        updateBchPrice: requirePriceUpdates,
        checkNewPayment: requirePriceUpdates,
      })
      return response
    })
    .catch(error => {
      console.error('Checkout Payment Options', error);
      const data = error?.response?.data
      formErrors.value.errors = errorParser.toArray(data?.non_field_errors);
      const amountError = errorParser.firstElementOrValue(data?.payment?.amount_token_category);
      const deliveryFeeError = errorParser.firstElementOrValue(data?.payment?.delivery_fee_token_category);
      if (amountError) formErrors.value.errors.push(`${$t('Merchant')}: ${amountError}`)
      if (deliveryFeeError) formErrors.value.errors.push(`${$t('DeliveryFee')}: ${deliveryFeeError}`)
    })
}

function getTokenBalance(category=null) {
  const assetId = category == null ? 'bch' : `ct/${category}`
  const assets = $store.getters['assets/getAssets']
  if (!Array.isArray(assets)) return null

  const asset = assets?.find(asset => asset?.id === assetId)
  if (!asset) return 0
  const decimals = parseInt(asset?.decimals) || 0
  const parsedBalance = asset?.balance / 10 ** decimals
  return parsedBalance || 0
}
</script>
<style lang="scss" scoped>
.errors-list > .errors-list-item:not(:only-of-type) {
  display: list-item;
  margin-left: 1em;
}
</style>
