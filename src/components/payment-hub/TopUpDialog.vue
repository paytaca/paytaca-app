<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width: 400px; max-width: 95vw;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ $t('TopUpSubscription') || 'Top Up Subscription' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-md">
        <p class="text-body2 text-grey">
          {{ $t('TopUpCyclesPrompt') || 'How many billing cycles do you want to top up for?' }}
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
          :label="$t('NumberOfCycles') || 'Number of Cycles'"
          :dark="darkMode"
          :bg-color="darkMode ? 'pt-dark' : 'white'"
          color="pt-primary1"
          class="q-mb-md"
          :min="1"
          step="1"
        />

        <!-- Calculate amounts and periods -->
        <div class="q-mb-md" v-if="planDetails">
          <div class="text-subtitle2 text-grey">{{ $t('TotalTopUpAmount') || 'Total Top Up Amount' }}</div>
          <div class="row items-baseline q-gutter-x-sm">
            <div class="text-weight-bold text-h6">{{ totalAmountFormatted }} {{ planDetails.currency }}</div>
            <div class="text-caption text-grey" v-if="planDetails.currency !== 'BCH' && bchPrice > 0">
              ~{{ totalBchFormatted }} BCH
            </div>
          </div>
        </div>

        <div class="q-mb-md" v-if="planDetails && planDetails.period_blocks">
          <div class="text-subtitle2 text-grey">{{ $t('TotalDuration') || 'Total Duration' }}</div>
          <div class="text-body2 text-weight-medium">
            {{ totalBlocks }} {{ $t('Blocks') || 'blocks' }} (~{{ getApproximateTime(totalBlocks) }})
          </div>
        </div>
        
        <div class="q-mb-md" v-else-if="planDetails && planDetails.period_days">
          <div class="text-subtitle2 text-grey">{{ $t('TotalDuration') || 'Total Duration' }}</div>
          <div class="text-body2 text-weight-medium">
            {{ totalDays }} {{ totalDays === 1 ? ($t('Day') || 'day') : ($t('Days') || 'days') }}
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat :label="$t('Cancel') || 'Cancel'" color="grey" v-close-popup />
        <q-btn
          unelevated
          rounded
          color="pt-primary1"
          :label="$t('ConfirmTopUp') || 'Confirm Top Up'"
          class="q-px-md"
          @click="onConfirm"
          :disable="cycles < 1"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const props = defineProps({
  subscription: { type: Object, required: true }
})

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
const $store = useStore()
const $router = useRouter()
const { t } = useI18n()

const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const cycles = ref(1)

const planDetails = computed(() => props.subscription?.plan_details || null)

const bchPrice = computed(() => {
  if (!planDetails.value || planDetails.value.currency === 'BCH') return 0
  return $store.getters['market/getAssetPrice']('bch', planDetails.value.currency) || 0
})

const totalAmount = computed(() => {
  if (!planDetails.value) return 0
  const amt = parseFloat(planDetails.value.amount)
  if (isNaN(amt)) return 0
  return amt * (cycles.value || 0)
})

const totalAmountFormatted = computed(() => {
  return parseFloat(totalAmount.value.toFixed(2)).toString()
})

const totalBchFormatted = computed(() => {
  if (!planDetails.value) return '0'
  if (planDetails.value.currency === 'BCH') {
    return totalAmountFormatted.value
  }
  if (!bchPrice.value || totalAmount.value === 0) return '0'
  const bchAmount = totalAmount.value / bchPrice.value
  const sats = Math.round(bchAmount * 100000000)
  return (sats / 100000000).toFixed(8).replace(/\.?0+$/, '') || '0'
})

const totalBlocks = computed(() => {
  if (!planDetails.value) return 0
  return (planDetails.value.period_blocks || 0) * (cycles.value || 0)
})

const totalDays = computed(() => {
  if (!planDetails.value) return 0
  return (planDetails.value.period_days || 0) * (cycles.value || 0)
})

function getApproximateTime(blocks) {
  if (!blocks) return ''
  let timeStr = ''
  if (blocks % 4320 === 0) {
    const v = blocks / 4320
    timeStr = `${v} ${v === 1 ? (t('Month') || 'month') : (t('Months') || 'months')}`
  } else if (blocks % 1008 === 0) {
    const v = blocks / 1008
    timeStr = `${v} ${v === 1 ? (t('Week') || 'week') : (t('Weeks') || 'weeks')}`
  } else if (blocks % 144 === 0) {
    const v = blocks / 144
    timeStr = `${v} ${v === 1 ? (t('Day') || 'day') : (t('Days') || 'days')}`
  } else if (blocks % 6 === 0) {
    const v = blocks / 6
    timeStr = `${v} ${v === 1 ? (t('Hour') || 'hour') : (t('Hours') || 'hours')}`
  } else {
    timeStr = `${blocks * 10} ${t('Minutes') || 'minutes'}`
  }
  return timeStr
}

function onConfirm() {
  const bchAmount = totalBchFormatted.value
  const contractAddress = props.subscription.contract_address || ''

  // Embed amount as BIP21 URI parameter so the send page's onScannerDecode parses it
  const addressWithAmount = bchAmount && parseFloat(bchAmount) > 0
    ? `${contractAddress}?amount=${bchAmount}`
    : contractAddress

  const query = { 
    address: addressWithAmount, 
    assetId: 'bch', 
    backPath: '/apps/payment-hub-subscriptions/'
  }
  
  onDialogOK()
  $router.push({ name: 'transaction-send', query })
}
</script>
