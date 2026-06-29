<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width: 500px; max-width: 95vw;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ $t('PlanDetails') || 'Plan Details' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section v-if="loading" class="text-center q-pa-xl">
        <q-spinner color="pt-primary1" size="3em" />
      </q-card-section>

      <q-card-section v-else-if="error" class="text-center q-pa-xl">
        <q-icon name="error" color="red" size="3em" />
        <p class="text-grey q-mt-md">{{ error }}</p>
        <q-btn unelevated rounded color="pt-primary1" :label="$t('Retry')" @click="fetchPlan" />
      </q-card-section>

      <q-card-section v-else-if="plan" class="q-pt-md">
        <!-- Status & Name -->
        <div class="row justify-between items-start q-mb-lg">
          <div class="col">
            <q-badge
              :color="plan.is_active ? 'green-4' : 'grey-5'"
              :text-color="darkMode ? 'black' : 'white'"
              class="text-weight-bold q-px-md q-py-xs br-5"
              style="font-size: 0.9rem;"
            >
              {{ plan.is_active ? ($t('Active') || 'Active') : ($t('Inactive') || 'Inactive') }}
            </q-badge>
            <div class="text-h6 q-mt-sm">{{ plan.name }}</div>
          </div>
          <div class="col-auto text-right">
            <div class="text-h6 text-weight-bold">{{ formatAmount(plan.amount) }} {{ plan.currency }}</div>
            <div class="row items-center justify-end text-subtitle2 text-grey">
              {{ getPeriodText(plan) }}
              <q-btn flat round dense icon="info" size="xs" color="grey" class="q-ml-xs" @click="showBlocksInfo(plan.period_blocks)" v-if="plan.period_blocks" />
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="q-mb-md">
          <div class="text-subtitle2 text-grey">{{ $t('Description') || 'Description' }}</div>
          <div class="text-body1">{{ plan.description || '-' }}</div>
        </div>

        <q-separator class="q-my-md" :dark="darkMode" />

        <!-- Details -->
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12">
            <div class="text-caption text-grey">{{ $t('PlanID') || 'Plan ID' }}</div>
            <div class="row no-wrap items-center">
              <div class="text-body2 ellipsis q-mr-xs font-mono">{{ plan.id }}</div>
              <q-btn flat round dense icon="content_copy" size="sm" @click="copyText(plan.id, 'Plan ID')" />
            </div>
          </div>
          
          <div class="col-12" v-if="plan.short_id">
            <div class="text-caption text-grey">{{ $t('ShortID') || 'Short ID' }}</div>
            <div class="row no-wrap items-center">
              <div class="text-body2 ellipsis q-mr-xs font-mono">{{ plan.short_id }}</div>
              <q-btn flat round dense icon="content_copy" size="sm" @click="copyText(plan.short_id, 'Short ID')" />
            </div>
          </div>

          <div class="col-12" v-if="plan.plan_url">
            <div class="text-caption text-grey">{{ $t('PlanURL') || 'Plan URL' }}</div>
            <div class="row no-wrap items-center">
              <div class="text-body2 ellipsis q-mr-xs font-mono text-pt-primary1 cursor-pointer" @click="openUrl(plan.plan_url)">{{ plan.plan_url }}</div>
              <q-btn flat round dense icon="content_copy" size="sm" @click="copyText(plan.plan_url, 'Plan URL')" />
            </div>
          </div>

          <div class="col-6">
            <div class="text-caption text-grey">{{ $t('DateCreated') }}</div>
            <div class="text-body2">{{ formatDate(plan.date_created) }}</div>
          </div>
          
          <div class="col-6">
            <div class="text-caption text-grey">{{ $t('Store') || 'Store' }}</div>
            <div class="row no-wrap items-center">
              <div class="text-body2 ellipsis q-mr-xs font-mono" style="max-width: 150px;">{{ plan.store }}</div>
              <q-btn flat round dense icon="content_copy" size="sm" @click="copyText(plan.store, 'Store ID')" />
            </div>
          </div>
        </div>

      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDialogPluginComponent, copyToClipboard, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { loadWallet } from 'src/wallet'
import { PaymentHub } from 'src/wallet/payment-hub'
import { date, openURL } from 'quasar'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  planId: { type: String, required: true }
})

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide } = useDialogPluginComponent()
const $store = useStore()
const $q = useQuasar()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const loading = ref(true)
const error = ref('')
const plan = ref(null)

let hub = null

async function initHub() {
  const wallet = await loadWallet()
  if (!wallet) throw new Error('Wallet not found')
  if (!hub) hub = new PaymentHub(wallet)
  return hub
}

async function fetchPlan() {
  loading.value = true
  error.value = ''
  try {
    const paymentHub = await initHub()
    plan.value = await paymentHub.getPlan(props.planId)
  } catch (err) {
    console.error('Error fetching plan:', err)
    error.value = err.response?.data?.error || err.message || 'Failed to load plan details'
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return date.formatDate(dateStr, 'MMM D, YYYY HH:mm')
}

function formatAmount(amount) {
  const num = parseFloat(amount)
  if (isNaN(num)) return amount
  return parseFloat(num.toFixed(2)).toString()
}

function getPeriodText(p) {
  if (p.period_days) {
    return `Every ${p.period_days} ${p.period_days === 1 ? (t('Day') || 'day') : (t('Days') || 'days')}`
  }
  const blocks = p.period_blocks
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

function showBlocksInfo(blocks) {
  $q.dialog({
    title: t('BillingReceivingPeriod') || 'Billing/Receiving Period',
    message: `${t('EstimatedTimeBasedOnBlocks') || 'The displayed time is an estimate based on the Bitcoin Cash network block target of 10 minutes per block. The exact interval is'} ${blocks} ${t('Blocks') || 'blocks'}.`,
    color: 'pt-primary1',
    ok: {
      flat: true,
      color: 'pt-primary1',
      label: 'OK'
    }
  })
}

function copyText(text, label = 'Text') {
  if (!text) return
  copyToClipboard(text)
  $q.notify({
    message: `${label} copied to clipboard`,
    color: 'positive',
    icon: 'check',
    position: 'bottom',
    timeout: 2000
  })
}

function openUrl(url) {
  if (url) openURL(url)
}

onMounted(() => {
  fetchPlan()
})

</script>
