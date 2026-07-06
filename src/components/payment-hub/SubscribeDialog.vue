<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width: 400px; max-width: 90vw;">
      <q-form ref="formRef" @submit="onFormSubmit">
        <q-card-section>
          <div class="text-h6">{{ $t('SubscribeToPlan') || 'Subscribe to Plan' }}</div>
          <div v-if="step === 1" class="text-caption text-grey">{{ $t('ScanQRCode') || 'Enter or scan a Plan ID to create a new subscription.' }}</div>
          <div v-else class="text-caption text-grey">{{ $t('PlanDetails') || 'Plan Details' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none q-gutter-y-md">
          <template v-if="step === 1">
            <q-input
              v-model="form.plan"
              :label="($t('PlanID') || 'Plan ID') + ' *'"
              outlined
              dense
              autofocus
              lazy-rules
              :rules="[val => !!val || $t('Required')]"
              hide-bottom-space
            >
              <template v-slot:append>
                <q-btn flat round dense icon="qr_code_scanner" @click="showQrScanner = true" />
              </template>
            </q-input>
          </template>

          <template v-else-if="step === 2">
            <div v-if="planDetails" class="q-gutter-y-sm">
              <div class="row items-center q-mb-sm" v-if="planDetails.store_info">
                <q-avatar size="32px" class="q-mr-sm" v-if="planDetails.store_info.logo || planDetails.store_info.logo_url">
                  <img :src="planDetails.store_info.logo || planDetails.store_info.logo_url" />
                </q-avatar>
                <q-avatar v-else size="32px" class="q-mr-sm bg-white">
                  <img src="~assets/paytaca_payment_hub_logo.png" />
                </q-avatar>
                <div class="text-subtitle1 text-weight-medium">{{ planDetails.store_info.name }}</div>
              </div>

              <div class="text-subtitle1 text-weight-bold">{{ planDetails.name }}</div>
              <div class="text-body2 text-grey">{{ planDetails.description || $t('NoDescription') }}</div>
              
              <q-separator class="q-my-md" />
              
              <div class="row justify-between q-mt-sm items-start">
                <div class="text-caption text-grey">{{ $t('BillingAmount') || 'Billing Amount' }}</div>
                <div class="text-right">
                  <div class="text-body2 text-weight-medium">{{ totalFiatStr }} {{ planDetails.currency }}</div>
                  <div class="text-caption text-grey" v-if="planDetails.currency !== 'BCH' && (planDetails.amount_satoshis > 0 || bchPrice > 0)">
                    ~{{ totalBchStr }} BCH
                  </div>
                </div>
              </div>
              
              <div class="row justify-between items-center">
                <div class="text-caption text-grey">{{ $t('BillingReceivingPeriod') || 'Billing/Receiving Period' }}</div>
                <div class="row items-center">
                  <div class="text-body2 text-weight-medium">
                    {{ getPeriodText(planDetails) }}
                  </div>
                  <q-btn flat round dense icon="info" size="xs" color="grey" class="q-ml-xs" @click="showBlocksInfo" v-if="planDetails.period_blocks" />
                </div>
              </div>
            </div>
          </template>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn v-if="step === 2" flat :label="$t('Back') || 'Back'" color="grey" @click="step = 1" />
          <q-btn v-if="step === 1" flat :label="$t('Cancel')" color="grey" @click="onCancelClick" />
          <q-btn 
            unelevated 
            rounded 
            :label="step === 1 ? ($t('Next') || 'Next') : ($t('Subscribe') || 'Subscribe')" 
            color="pt-primary1" 
            type="submit" 
            :loading="isLoading"
          />
        </q-card-actions>
      </q-form>
    </q-card>
    
    <QrScanner
      v-model="showQrScanner"
      @decode="onScannerDecode"
    />
  </q-dialog>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { PaymentHub, extractPlanId } from 'src/wallet/payment-hub'
import QrScanner from 'src/components/qr-scanner.vue'

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const { t } = useI18n()
const $store = useStore()
const $q = useQuasar()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const formRef = ref(null)

const step = ref(1)
const isLoading = ref(false)
const planDetails = ref(null)
const showQrScanner = ref(false)
const isChipnet = computed(() => $store.getters['global/isChipnet'])

const form = reactive({
  plan: '',
})

const bchPrice = computed(() => {
  if (!planDetails.value || planDetails.value.currency === 'BCH') return 0
  return $store.getters['market/getAssetPrice']('bch', planDetails.value.currency) || 0
})

function formatAmount(amount) {
  const num = parseFloat(amount)
  if (isNaN(num)) return amount
  return parseFloat(num.toFixed(8)).toString()
}

const bchUsdPrice = computed(() => $store.getters['market/getAssetPrice']('bch', 'usd') || 0)

const paytacaFeeSats = computed(() => {
  if (!planDetails.value) return 0
  
  let pledgeSats = planDetails.value.amount_satoshis
  if (!pledgeSats) {
    if (!bchPrice.value) return 546
    const bchAmount = parseFloat(planDetails.value.amount) / bchPrice.value
    pledgeSats = Math.round(bchAmount * 100000000)
  }
  
  let maxFee = 50000 // default if no USD price
  if (bchUsdPrice.value > 0) {
    maxFee = Math.round((1 / bchUsdPrice.value) * 100000000)
  }
  
  return Math.max(Math.min(maxFee, Math.floor(pledgeSats / 100)), Math.floor(maxFee / 100))
})

const totalCostSats = computed(() => {
  if (!planDetails.value) return 0
  let pledgeSats = planDetails.value.amount_satoshis
  if (!pledgeSats) {
    if (!bchPrice.value) return 0
    const bchAmount = parseFloat(planDetails.value.amount) / bchPrice.value
    pledgeSats = Math.round(bchAmount * 100000000)
  }
  return pledgeSats + paytacaFeeSats.value + 1000 // miner fee
})

const totalBchStr = computed(() => {
  if (totalCostSats.value === 0) return '0'
  return (totalCostSats.value / 100000000).toFixed(8).replace(/\.?0+$/, '') || '0'
})

const totalFiatStr = computed(() => {
  if (!planDetails.value) return '0'
  if (planDetails.value.currency === 'BCH') return totalBchStr.value
  
  if (totalCostSats.value > 0 && bchPrice.value > 0) {
    const totalBch = totalCostSats.value / 100000000
    return parseFloat((totalBch * bchPrice.value).toFixed(2)).toString()
  }
  return formatAmount(planDetails.value.amount)
})

function getPeriodText(plan) {
  if (plan.period_days) {
    return `Every ${plan.period_days} ${plan.period_days === 1 ? (t('Day') || 'day') : (t('Days') || 'days')}`
  }
  const blocks = plan.period_blocks
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
  return `Every ${timeStr}`
}

function showBlocksInfo() {
  $q.dialog({
    title: t('BillingReceivingPeriod') || 'Billing/Receiving Period',
    message: `${t('EstimatedTimeBasedOnBlocks') || 'The displayed time is an estimate based on the Bitcoin Cash network block target of 10 minutes per block. The exact interval is'} ${planDetails.value.period_blocks} ${t('Blocks') || 'blocks'}.`,
    color: 'pt-primary1',
    ok: {
      flat: true,
      color: 'pt-primary1',
      label: 'OK'
    }
  })
}

async function onFormSubmit() {
  const isValid = await formRef.value.validate()
  if (!isValid) return

  if (step.value === 1) {
    await fetchPlanDetails()
  } else if (step.value === 2) {
    onDialogOK({ plan: form.plan, plan_details: planDetails.value })
  }
}

async function fetchPlanDetails() {
  isLoading.value = true
  try {
    const wallet = $store.getters['global/getWallet']('bch')
    const paymentHub = new PaymentHub(wallet)
    
    const plan = await paymentHub.getPlan(form.plan)
    if (!plan) throw new Error('Plan not found')
    
    planDetails.value = plan
    step.value = 2
  } catch (err) {
    console.error('Error fetching plan:', err)
    $q.notify({
      type: 'negative',
      message: err?.response?.data?.message || err.message || 'Invalid Plan ID or plan not found'
    })
  } finally {
    isLoading.value = false
  }
}

function onScannerDecode(content) {
  showQrScanner.value = false
  form.plan = extractPlanId(content)
}

function onCancelClick() {
  onDialogCancel()
}
</script>
