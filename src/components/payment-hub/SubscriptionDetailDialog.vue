<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width: 520px; max-width: 95vw;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ $t('SubscriptionDetails') || 'Subscription Details' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <!-- Loading -->
      <q-card-section v-if="loading" class="text-center q-pa-xl">
        <q-spinner color="pt-primary1" size="3em" />
      </q-card-section>

      <!-- Error -->
      <q-card-section v-else-if="error" class="text-center q-pa-xl">
        <q-icon name="error" color="red" size="3em" />
        <p class="text-grey q-mt-md">{{ error }}</p>
        <q-btn unelevated rounded color="pt-primary1" :label="$t('Retry') || 'Retry'" @click="fetchSubscription" />
      </q-card-section>

      <!-- Content -->
      <q-card-section v-else-if="sub" class="q-pt-md">

        <!-- Status header & Vault Focus -->
        <div class="row justify-between items-start q-mb-md">
          <div class="col">
            <q-badge
              :color="statusColor"
              :text-color="darkMode ? 'black' : 'white'"
              class="text-weight-bold q-px-md q-py-xs br-5 q-mb-sm"
              style="font-size: 0.85rem;"
            >
              {{ sub.status }}
            </q-badge>
            <div class="text-h6">{{ sub.plan_details?.name || 'Subscription' }}</div>

            <!-- Vault Address Prominent -->
            <div class="q-mt-sm">
              <div class="text-caption text-grey">{{ $t('ContractAddress') || 'Contract Address' }}</div>
              <div class="row no-wrap items-center">
                <div class="text-body2 font-mono ellipsis" style="max-width: 250px;">{{ sub.contract_address }}</div>
                <q-btn flat round dense icon="content_copy" size="sm" class="q-ml-xs" @click="copyText(sub.contract_address, 'Contract Address')" />
              </div>
            </div>

            <!-- Contract Balance -->
            <div class="q-mt-sm" v-if="sub.plan_details">
              <div class="text-caption text-grey">{{ $t('ContractBalance') || 'Contract Balance' }}</div>
              <div class="row items-baseline q-gutter-x-sm">
                <div class="text-body2 text-weight-medium">
                  <span v-if="sub.plan_details.currency !== 'BCH' && bchPrice > 0">{{ contractBalanceFiat }} {{ sub.plan_details.currency }}</span>
                  <span v-else>{{ contractBalanceBch }} BCH</span>
                </div>
                <div class="text-caption text-grey" v-if="sub.plan_details.currency !== 'BCH' && bchPrice > 0">
                  ~{{ contractBalanceBch }} BCH
                </div>
                <div class="text-caption text-grey" v-else>
                  ({{ contractBalanceSats }} sats)
                </div>
              </div>
            </div>
          </div>
          <div class="col-auto text-right">
            <div class="q-mt-md">
              <q-btn
                v-if="isCustomer && (sub.status === 'ACTIVE' || sub.status === 'PENDING')"
                unelevated
                rounded
                color="pt-primary1"
                :label="$t('TopUp') || 'Top Up'"
                class="q-px-md"
                @click="topUp"
              />
            </div>
          </div>
        </div>

        <q-separator class="q-mb-md" :dark="darkMode" />

        <q-tabs
          v-model="tab"
          dense
          class="text-grey q-mb-md"
          active-color="pt-primary1"
          indicator-color="pt-primary1"
          align="justify"
          narrow-indicator
        >
          <q-tab name="details" :label="$t('Details') || 'Details'" />
          <q-tab name="invoices" :label="$t('Invoices') || 'Invoices'" />
        </q-tabs>

        <q-tab-panels v-model="tab" animated style="background: none;">
          
          <q-tab-panel name="details" class="q-pa-none q-pt-md">
            <!-- Plan Details -->
            <div v-if="sub.plan_details?.description" class="q-mb-md">
              <div class="text-caption text-grey">{{ $t('Description') || 'Description' }}</div>
              <div class="text-body2">{{ sub.plan_details.description }}</div>
            </div>

            <!-- Billing Amount -->
            <div class="q-mb-md" v-if="sub.plan_details">
              <div class="row items-center q-gutter-x-xs text-caption text-grey">
                <span>{{ $t('BillingAmount') || 'Billing Amount' }}</span>
                <q-btn flat round dense icon="help_outline" size="xs" color="grey" @click="showBillingInfo" />
              </div>
              <div class="row items-baseline q-gutter-x-sm">
                <div class="text-weight-bold text-body1">{{ formatAmount(sub.plan_details.amount) }} {{ sub.plan_details.currency }}</div>
                <div class="text-caption text-grey" v-if="sub.plan_details.currency !== 'BCH' && bchPrice > 0">
                  ~{{ getEquivalentBch(sub.plan_details.amount) }} BCH
                </div>
              </div>
            </div>

            <!-- Billing Period -->
            <div class="q-mb-md" v-if="sub.plan_details">
              <div class="text-caption text-grey">{{ $t('BillingReceivingPeriod') || 'Billing/Receiving Period' }}</div>
              <div class="row items-center">
                <div class="text-body2 text-weight-medium">
                  {{ getPeriodText(sub.plan_details) }}
                </div>
                <q-btn flat round dense icon="info" size="xs" color="grey" class="q-ml-xs" @click="showBlocksInfo(sub.plan_details.period_blocks)" v-if="sub.plan_details.period_blocks" />
              </div>
            </div>

            <q-expansion-item
              dense
              dense-toggle
              expand-separator
              icon="info"
              :label="$t('MoreDetails') || 'More Details'"
              class="q-mb-md br-10 pt-card border-grey-4"
              :class="getDarkModeClass(darkMode)"
            >
              <div class="q-pa-md">
                <!-- ID fields -->
                <div class="q-gutter-y-sm q-mb-md">
                  <div>
                    <div class="text-caption text-grey">{{ $t('SubscriptionID') || 'Subscription ID' }}</div>
                    <div class="row no-wrap items-center">
                      <div class="text-body2 ellipsis q-mr-xs font-mono" style="max-width: 340px;">{{ sub.id }}</div>
                      <q-btn flat round dense icon="content_copy" size="sm" @click="copyText(sub.id, 'Subscription ID')" />
                    </div>
                  </div>
                  <div v-if="sub.short_id">
                    <div class="text-caption text-grey">{{ $t('ShortID') || 'Short ID' }}</div>
                    <div class="row no-wrap items-center">
                      <div class="text-body2 font-mono">{{ sub.short_id }}</div>
                      <q-btn flat round dense icon="content_copy" size="sm" @click="copyText(sub.short_id, 'Short ID')" />
                    </div>
                  </div>
                </div>

                <!-- Funder & Merchant -->
                <div class="row q-col-gutter-sm q-mb-md">
                  <div class="col-12">
                    <div class="text-caption text-grey">{{ $t('FunderAddress') || 'Funder Address' }}</div>
                    <div class="row no-wrap items-center">
                      <div class="text-body2 ellipsis q-mr-xs font-mono" style="max-width: 340px;">{{ sub.funder_address }}</div>
                      <q-btn flat round dense icon="content_copy" size="sm" @click="copyText(sub.funder_address, 'Funder Address')" />
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="text-caption text-grey">{{ $t('MerchantAddress') || 'Merchant Address' }}</div>
                    <div class="row no-wrap items-center">
                      <div class="text-body2 ellipsis q-mr-xs font-mono" style="max-width: 340px;">{{ sub.merchant_address }}</div>
                      <q-btn flat round dense icon="content_copy" size="sm" @click="copyText(sub.merchant_address, 'Merchant Address')" />
                    </div>
                  </div>
                </div>

                <!-- Dates -->
                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <div class="text-caption text-grey">{{ $t('DateCreated') || 'Date Created' }}</div>
                    <div class="text-body2">{{ formatDate(sub.date_created) }}</div>
                  </div>
                  <div class="col-6">
                    <div class="text-caption text-grey">{{ $t('LastPayment') || 'Last Payment' }}</div>
                    <div class="text-body2">{{ sub.last_payment_date ? formatDate(sub.last_payment_date) : '-' }}</div>
                  </div>
                </div>
              </div>
            </q-expansion-item>
          </q-tab-panel>

          <q-tab-panel name="invoices" class="q-pa-none q-pt-md">
            <div v-if="loadingInvoices" class="text-center q-my-xl">
              <q-spinner color="pt-primary1" size="2em" />
            </div>
            <div v-else-if="!invoices.length" class="text-center q-my-xl text-grey">
              {{ $t('NoInvoices') || 'No invoices found' }}
            </div>
            <div v-else>
              <q-list separator class="br-10 border-grey-4">
                <q-item v-for="inv in invoices" :key="inv.invoice_id" class="q-py-md">
                  <q-item-section side top>
                    <q-badge
                      :color="inv.status === 'PAID' ? 'green-4' : (inv.status === 'PENDING' ? 'orange-4' : 'grey-5')"
                      :text-color="darkMode ? 'black' : 'white'"
                      class="text-weight-bold br-5"
                    >
                      {{ inv.status }}
                    </q-badge>
                  </q-item-section>
                  <q-item-section>
                    <div class="text-body2 text-weight-medium ellipsis-2-lines" :class="getDarkModeClass(darkMode)" style="word-break: break-all;">
                      {{ inv.memo || $t('NoMemo') || 'No Memo' }}
                    </div>
                    <div class="text-caption text-grey q-mt-xs">{{ formatDate(inv.date_created) }}</div>
                  </q-item-section>
                  <q-item-section side top class="text-right">
                    <div class="text-weight-bold">{{ inv.total_bch }} BCH</div>
                    <div class="text-caption text-grey">{{ inv.total_fiat }}</div>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-tab-panel>
        </q-tab-panels>

        <q-separator class="q-mb-md" :dark="darkMode" />



      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDialogPluginComponent, copyToClipboard, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { date } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import TopUpDialog from 'src/components/payment-hub/TopUpDialog.vue'
import { PaymentHub } from 'src/wallet/payment-hub'
import { loadWallet } from 'src/wallet'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  subscriptionId: { type: String, required: true },
  isCustomer: { type: Boolean, default: false }
})

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide } = useDialogPluginComponent()
const $store = useStore()
const $router = useRouter()
const $q = useQuasar()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const loading = ref(true)
const error = ref('')
const sub = ref(null)
const tab = ref('details')

const invoices = ref([])
const loadingInvoices = ref(false)

let hub = null

const statusColor = computed(() => {
  if (!sub.value) return 'grey-5'
  const s = sub.value.status
  if (s === 'ACTIVE') return 'green-4'
  if (s === 'CANCELLED') return 'red-4'
  if (s === 'PENDING') return 'orange-4'
  return 'grey-5'
})

const bchPrice = computed(() => {
  if (!sub.value?.plan_details || sub.value.plan_details.currency === 'BCH') return 0
  return $store.getters['market/getAssetPrice']('bch', sub.value.plan_details.currency) || 0
})

function getEquivalentBch(amount) {
  if (!bchPrice.value) return 0
  const bchAmount = parseFloat(amount) / bchPrice.value
  const sats = Math.round(bchAmount * 100000000)
  return (sats / 100000000).toFixed(8).replace(/\.?0+$/, '') || '0'
}

function showBillingInfo() {
  if (!sub.value?.plan_details) return
  const p = sub.value.plan_details
  const periodText = getPeriodText(p)
  
  let msg = ''
  if (p.period_days) {
    msg = t('BillingAmountInfoDays', { periodText }) || `This is the amount billed every ${periodText}.`
  } else if (p.period_blocks) {
    msg = t('BillingAmountInfoBlocks', { periodText, blocks: p.period_blocks }) || `This is the amount billed every ${periodText} or every ${p.period_blocks} blocks.`
  }

  $q.dialog({
    title: t('BillingAmount') || 'Billing Amount',
    message: msg,
    color: 'pt-primary1',
    ok: { flat: true, color: 'pt-primary1', label: 'OK' }
  })
}
const pledgeBch = computed(() => {
  if (!sub.value?.pledge_satoshis) return '-'
  return (sub.value.pledge_satoshis / 1e8).toFixed(8).replace(/\.?0+$/, '')
})

const contractBalanceSats = computed(() => {
  if (!sub.value?.balance && sub.value?.balance !== 0) return '0'
  return sub.value.balance.toLocaleString()
})

const contractBalanceBch = computed(() => {
  if (!sub.value?.balance) return '0'
  return (sub.value.balance / 1e8).toFixed(8).replace(/\.?0+$/, '')
})

const contractBalanceFiat = computed(() => {
  if (!sub.value?.plan_details) return '0.00'
  if (!bchPrice.value || sub.value.plan_details.currency === 'BCH') return contractBalanceBch.value
  
  const bchVal = parseFloat(contractBalanceBch.value)
  if (isNaN(bchVal)) return '0.00'
  
  const fiatVal = bchVal * bchPrice.value
  return formatAmount(fiatVal)
})

const pledge_satoshis_formatted = computed(() => {
  if (!sub.value?.pledge_satoshis) return ''
  return sub.value.pledge_satoshis.toLocaleString()
})

async function fetchSubscription() {
  loading.value = true
  error.value = ''
  try {
    const wallet = await loadWallet('BCH', $store.getters['global/getWalletIndex'])
    if (!hub) hub = new PaymentHub(wallet)
    sub.value = await hub.getSubscription(props.subscriptionId, props.isCustomer ? { customer: true } : undefined)
    await fetchInvoices()
  } catch (err) {
    console.error('Error fetching subscription:', err)
    error.value = err.response?.data?.error || err.message || 'Failed to load subscription details'
  } finally {
    loading.value = false
  }
}

async function fetchInvoices() {
  loadingInvoices.value = true
  try {
    // Note: The method `listSubscriptionInvoices` will be implemented in payment-hub.js
    const data = await hub.listSubscriptionInvoices(props.subscriptionId, { page: 1, ...(props.isCustomer ? { customer: true } : {}) })
    invoices.value = data.results || []
  } catch (err) {
    console.error('Error fetching invoices:', err)
  } finally {
    loadingInvoices.value = false
  }
}

function topUp() {
  if (sub.value?.contract_address) {
    $q.dialog({
      component: TopUpDialog,
      componentProps: { subscription: sub.value }
    })
    onDialogHide()
  }
}

function formatAmount(amount) {
  const num = parseFloat(amount)
  if (isNaN(num)) return amount
  return parseFloat(num.toFixed(2)).toString()
}

function getPeriodText(p) {
  if (p.period_days) {
    return `${p.period_days} ${p.period_days === 1 ? (t('Day') || 'day') : (t('Days') || 'days')}`
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
  return timeStr
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

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return date.formatDate(dateStr, 'MMM D, YYYY HH:mm')
}

function copyText(text, label = 'Text') {
  if (!text) return
  copyToClipboard(text)
  $q.notify({
    message: `${label} copied`,
    color: 'positive',
    icon: 'check',
    position: 'bottom',
    timeout: 2000
  })
}

onMounted(() => {
  fetchSubscription()
})
</script>

<style scoped>
.font-mono {
  font-family: 'Courier New', Courier, monospace;
}
.border-grey-4 {
  border: 1px solid rgba(128, 128, 128, 0.2);
}
</style>
