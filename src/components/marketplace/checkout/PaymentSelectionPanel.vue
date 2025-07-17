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
                  <img :src="token?.imageUrl" width="50" class="q-mr-sm"/>
                  <div class="text-subtitle1">{{ token?.name }}</div>
                  <q-space/>
                  <div>{{ token?.symbol }}</div>
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
import { Checkout, FungibleCashToken } from 'src/marketplace/objects';
import { backend } from 'src/marketplace/backend';
import { useCheckoutDetails } from 'src/composables/marketplace/checkout';
import { useStore } from 'vuex'
import { computed, onMounted, ref, watch } from 'vue';

const $emit = defineEmits([
  'newCheckoutData',
])
const props = defineProps({
  checkout: Checkout,
})
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const { isStorePickup, checkoutAmounts, checkoutBchPrice, checkoutCurrency } = useCheckoutDetails(props.checkout) 
const openDialog = ref(false)

const bchPaymentOpt = FungibleCashToken.parse({ name: 'Bitcoin Cash', symbol: 'BCH', decimals: 8, category: null, image_url: 'bch-logo.png' })
const paymentOptions = ref([bchPaymentOpt])

onMounted(() => fetchTokenOptions())
function fetchTokenOptions() {
  return backend.get(`http://localhost:8000/api/cashtokens/fungible/`)
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
    .then(response => {
      openDialog.value = false
      $emit('newCheckoutData', response?.data, {
        updateBchPrice: requirePriceUpdates,
        checkNewPayment: requirePriceUpdates,
      })
      return response
    })
}
</script>
