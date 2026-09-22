<template>
  <q-dialog ref="dialogRef" :persistent="sendingTopup" @hide="onDialogHide">
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width: 400px; max-width: 95vw;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ $t('TopUpSubscription', 'Top Up Subscription') }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-md">
        <p class="text-body2 text-grey">
          {{ $t('TopUpCyclesPrompt', 'How many billing cycles do you want to top up for?') }}
        </p>

        <!-- Input for number of cycles -->
        <q-input
          v-model.number="cycles"
          type="number"
          inputmode="numeric"
          pattern="[0-9]*"
          dense
          outlined
          rounded
          :label="$t('NumberOfCycles')"
          :dark="darkMode"
          :bg-color="darkMode ? 'pt-dark' : 'white'"
          color="pt-primary1"
          class="q-mb-md"
          :min="1"
          step="1"
        />

        <!-- Calculate amounts and periods -->
        <div class="q-mb-md" v-if="planDetails">
          <div class="text-subtitle2 text-grey">{{ $t('TotalAmountWithFees') }}</div>
          <div v-if="totalTokensFormatted" class="text-weight-bold text-h6">
            {{ totalTokensFormatted }}
          </div>
          <div class="row items-baseline q-gutter-x-sm">
            <template v-if="planDetails.currency !== 'BCH' && bchPrice > 0">
              <div class="text-weight-bold text-h6">~{{ totalFiatFormatted }} {{ planDetails.currency }}</div>
              <div class="text-caption text-grey">{{ totalBchFormatted }} BCH</div>
            </template>
            <template v-else>
              <div class="text-weight-bold text-h6">{{ totalBchFormatted }} BCH</div>
            </template>
          </div>
        </div>

        <div class="q-mb-md" v-if="planDetails && planDetails.period_blocks">
          <div class="text-subtitle2 text-grey">{{ $t('TotalDuration') }}</div>
          <div class="text-body2 text-weight-medium">
            {{ totalBlocks }} {{ $t('Blocks') }} (~{{ getPeriodTextBase({ period_blocks: totalBlocks }) }})
          </div>
        </div>

        <div class="q-mb-md" v-else-if="planDetails && planDetails.period_days">
          <div class="text-subtitle2 text-grey">{{ $t('TotalDuration') }}</div>
          <div class="text-body2 text-weight-medium">
            {{ totalDays }} {{ totalDays === 1 ? $t('Day') : $t('Days') }}
          </div>
        </div>

        <div v-if="sendingTopup" class="text-center text-grey text-caption">
          {{ $t('SendingFundsToContract', 'Sending funds to contract') }}
          <q-spinner/>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat :label="$t('Cancel')" color="grey" :disable="sendingTopup" v-close-popup />
        <q-btn
          unelevated
          rounded
          color="pt-primary1"
          :label="$t('ConfirmTopUp', 'Confirm Top Up')"
          class="q-px-md"
          :loading="sendingTopup"
          @click="securityCheckConfirm"
          :disable="cycles < 1 || sendingTopup"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { usePaymentHubCore, useSubscriptionUtils } from 'src/composables/payment-hub/usePaymentHub'
import { topUpSubscription } from 'src/wallet/payment-hub/services'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'

const props = defineProps({
  subscription: { type: Object, required: true }
})

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
const $store = useStore()
const $router = useRouter()
const { t: $t } = useI18n()
const $q = useQuasar()
const { initWallet } = usePaymentHubCore();
const { getPeriodTextBase, satsToBchDisplay, getTotalCostPerCycle } = useSubscriptionUtils()

const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const isChipnet = computed(() => $store.getters['global/isChipnet'])

const cycles = ref(1)

const planDetails = computed(() => props.subscription?.plan_details || null)

const bchPrice = computed(() => {
  if (!planDetails.value || planDetails.value.currency === 'BCH') return 0
  return $store.getters['market/getAssetPrice']('bch', planDetails.value.currency) || 0
})

const totalCostSatsPerCycle = computed(() => getTotalCostPerCycle(props.subscription))

const totalAmount = computed(() => {
  if (!planDetails.value) return 0
  const amt = parseFloat(planDetails.value.amount)
  if (isNaN(amt)) return 0
  return amt * (cycles.value || 0)
})

const totalAmountFormatted = computed(() => {
  return parseFloat(totalAmount.value.toFixed(2)).toString()
})

const totalFiatFormatted = computed(() => {
  if (!planDetails.value || planDetails.value.currency === 'BCH') return '0'
  if (!bchPrice.value) return totalAmountFormatted.value
  const bchVal = parseFloat(totalBchFormatted.value)
  if (isNaN(bchVal)) return '0'
  const fiatVal = bchVal * bchPrice.value
  return parseFloat(fiatVal.toFixed(2)).toString()
})

// merge fee sats usually involve 2 inputs and 1 output, according to smart contract is
// 850 * inputCount + 60 * outputCount
const mergeFeeSats = computed(() => {
  if (props.subscription?.payment_category) return 0;
  return 850 * 2 + 60;
})

const totalSats = computed(() => {
  if (!planDetails.value) return 0
  const numCycles = cycles.value || 0
  if (totalCostSatsPerCycle.value > 0) {
    return totalCostSatsPerCycle.value * numCycles + mergeFeeSats.value
  }

  // Fallback: fiat-based conversion (shouldn't normally reach here)
  if (planDetails.value.currency === 'BCH') {
    return totalAmountFormatted.value
  }
  if (!bchPrice.value || totalAmount.value === 0) return '0'
  const bchAmount = totalAmount.value / bchPrice.value
  const sats = Math.round(bchAmount * 100000000)
  return sats
})
const totalBchFormatted = computed(() => {
  return satsToBchDisplay(totalSats.value) || '0'
})

const totalTokens = computed(() => {
  if (!props.subscription.pledge_tokens) return 0;
  return props.subscription.pledge_tokens * cycles.value;
})

const totalTokensFormatted = computed(() => {
  const token = props.subscription?.plan_details?.token;
  if (!token) return ''
  const decimals = parseInt(token?.decimals) || 0;
  const symbol = token?.symbol ?? $t('Cashtokens');
  if (!totalTokens.value) return `0 ${symbol}`
  const tokenAmount = totalTokens.value / 10 ** decimals;
  const tokenAmountFormatted = tokenAmount.toFixed(decimals);
  return tokenAmountFormatted + ' ' + symbol;
})

const totalBlocks = computed(() => {
  if (!planDetails.value) return 0
  return (planDetails.value.period_blocks || 0) * (cycles.value || 0)
})

const totalDays = computed(() => {
  if (!planDetails.value) return 0
  return (planDetails.value.period_days || 0) * (cycles.value || 0)
})

function securityCheckConfirm() {
  $q.dialog({
    component: SecurityCheckDialog,
    componentProps: {
      displayDialogCard: false,
    },
  }).onOk(() => sendTopup())
}

const sendingTopup = ref(false);
async function sendTopup() {
  try {
    sendingTopup.value = true;
    const wallet = await initWallet();
    const broadcastResult = await topUpSubscription({
      wallet,
      contractAddress: props.subscription.contract_address,
      satoshis: totalSats.value,
      tokenAmount: totalTokens.value,
      tokenCategory: props.subscription?.payment_category,
      isChipnet: isChipnet.value,
    })
  
    if (broadcastResult.error) throw new Error(broadcastResult.error)

    const txid = broadcastResult.txid;
    const backRoute = $router.resolve({
      path: '/apps/payment-hub-subscriptions/',
      query: { subId: props.subscription?.id }
    })
    const redirectRoute = {
      name: 'transaction-summary',
      query: { from: backRoute.fullPath },
      params: { txid: txid },
    };
    $router.push(redirectRoute);
  } catch(error) {
    console.error(error)
    $q.notify({
      message: $t('TopUpError', 'Encountered error during top-up'),
      caption: String(error),
    })
  } finally {
    sendingTopup.value = false;
  }
}


function onConfirm() {
  const bchAmount = totalBchFormatted.value
  const contractAddress = props.subscription.contract_address || ''

  // Embed amount as BIP21 URI parameter so the send page's onScannerDecode parses it
  const addressWithAmount = bchAmount && parseFloat(bchAmount) > 0
    ? `${contractAddress}?amount=${bchAmount}`
    : contractAddress

  const route = $router.resolve({
    path: '/apps/payment-hub-subscriptions/',
    query: { subId: props.subscription?.id }
  })
  const query = {
    address: addressWithAmount,
    assetId: 'bch',
    backPath: route.fullPath,
  }

  onDialogOK()
  $router.push({ name: 'transaction-send', query })
}
</script>
