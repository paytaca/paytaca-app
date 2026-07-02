<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width: 520px; max-width: 95vw;">
      <q-card-section class="row items-center q-pb-none">
        <template v-if="sub && sub.plan_details?.store_info">
          <div class="row items-center">
            <q-avatar size="40px" class="q-mr-sm" v-if="sub.plan_details.store_info.logo || sub.plan_details.store_info.logo_url">
              <img :src="sub.plan_details.store_info.logo || sub.plan_details.store_info.logo_url" />
            </q-avatar>
            <q-avatar v-else size="40px" class="q-mr-sm bg-white">
              <img src="~assets/paytaca_payment_hub_logo.png" />
            </q-avatar>
            <div class="text-h5 text-weight-bold">{{ sub.plan_details.store_info.name }}</div>
          </div>
        </template>
        <div v-else class="text-h6">{{ $t('SubscriptionDetails') || 'Subscription Details' }}</div>
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
            <!-- Plan Name & Status -->
            <div class="row items-center q-mb-sm">
              <div class="text-h6 q-mr-sm">{{ sub.plan_details?.name || 'Subscription' }}</div>
              <q-badge
                :color="statusColor"
                :text-color="darkMode ? 'black' : 'white'"
                class="text-weight-bold q-px-sm q-py-xs br-5"
                style="font-size: 0.75rem;"
              >
                {{ sub.status }}
              </q-badge>
            </div>

            <!-- Contract Balance -->
            <div class="q-mb-sm" v-if="sub.plan_details">
              <div class="text-caption text-grey">{{ $t('ContractBalance') || 'Contract Balance' }}</div>
              <div class="row items-baseline q-gutter-x-sm">
                <div class="text-subtitle1 text-weight-bold">
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

            <!-- Billing Amount (Total Cost) -->
            <div class="q-mb-sm" v-if="sub.plan_details">
              <div class="row items-center q-gutter-x-xs text-caption text-grey">
                <span>{{ $t('BillingAmount') || 'Billing Amount' }}</span>
                <q-btn flat round dense icon="help_outline" size="xs" color="grey" @click="showBillingInfo" />
              </div>
              <div class="row items-baseline q-gutter-x-sm">
                <div class="text-body2 text-weight-medium" v-if="sub.plan_details.currency !== 'BCH' && bchPrice > 0">
                  ~{{ totalCostFiat }} {{ sub.plan_details.currency }}
                </div>
                <div class="text-body2 text-weight-medium" v-else>
                  {{ totalCostBch }} BCH
                </div>
                <div class="text-caption text-grey" v-if="sub.plan_details.currency !== 'BCH' && bchPrice > 0">
                  ({{ totalCostBch }} BCH)
                </div>
              </div>
            </div>

            <!-- Billing Period -->
            <div class="q-mb-sm" v-if="sub.plan_details || sub.period_blocks">
              <div class="text-caption text-grey">{{ $t('BillingReceivingPeriod') || 'Billing/Receiving Period' }}</div>
              <div class="row items-center">
                <div class="text-body2 text-weight-medium">
                  {{ getPeriodText(sub) }}
                </div>
                <q-btn flat round dense icon="info" size="xs" color="grey" class="q-ml-xs" @click="showBlocksInfo(sub.period_blocks || sub.plan_details?.period_blocks)" v-if="sub.period_blocks || sub.plan_details?.period_blocks" />
              </div>
            </div>

            <!-- Next Expected Payout -->
            <div class="q-mb-sm" v-if="sub.status === 'ACTIVE' && nextPayoutDisplay">
              <div class="row items-center q-gutter-x-xs text-caption text-grey">
                <span>Next Expected Payout</span>
                <q-icon name="info" size="xs" color="grey">
                  <q-tooltip class="bg-grey-9 text-body2" style="max-width: 250px">
                    A block is estimated to be 10 mins. Block times may vary but rarely go past 30 mins.
                  </q-tooltip>
                </q-icon>
              </div>
              <div class="text-body2 text-weight-medium text-pt-primary1">
                {{ nextPayoutDisplay }}
              </div>
            </div>

            <!-- Remaining Payouts -->
            <div class="q-mb-sm" v-if="sub.status === 'ACTIVE' || sub.status === 'PENDING'">
              <div class="text-caption text-grey">Remaining Payouts</div>
              <div class="text-body2 text-weight-medium text-pt-primary1">
                {{ remainingPayouts }}
              </div>
            </div>

            <!-- Overdue Payments -->
            <div class="q-mb-sm" v-if="(sub.status === 'ACTIVE' || sub.status === 'PENDING') && overduePayments > 0">
              <div class="text-caption text-red">Overdue Payments</div>
              <div class="text-body2 text-weight-medium text-red">
                {{ overduePayments }}
              </div>
            </div>
          </div>
          <div class="col-auto text-right">
            <div class="q-mt-md row q-gutter-x-sm">
              <q-btn
                v-if="isCustomer && sub.balance > 0"
                flat
                rounded
                color="red"
                :label="sub.status === 'ACTIVE' || sub.status === 'PENDING' ? ($t('Cancel') || 'Cancel') : ($t('Reclaim') || 'Reclaim')"
                class="q-px-sm"
                @click="onCancelSubscriptionClick"
              />
              <q-btn
                v-if="!isCustomer && (sub.status === 'ACTIVE' || sub.status === 'PENDING')"
                flat
                rounded
                color="red"
                :label="$t('Cancel') || 'Cancel'"
                class="q-px-sm"
                @click="onCancelSubscriptionClick"
              />
              <q-btn
                v-if="!isCustomer && sub.status === 'ACTIVE'"
                flat
                rounded
                color="pt-primary1"
                :label="$t('Update') || 'Update'"
                class="q-px-sm"
                @click="openUpdateDialog"
              />
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

            <!-- Vault Address Prominent -->
            <div class="q-mb-md">
              <div class="text-caption text-grey">{{ $t('ContractAddress') || 'Contract Address' }}</div>
              <div class="row no-wrap items-center">
                <div class="text-body2 font-mono ellipsis" style="max-width: 320px;">{{ sub.contract_address }}</div>
                <q-btn flat round dense icon="content_copy" size="sm" class="q-ml-xs" @click="copyText(sub.contract_address, 'Contract Address')" />
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
                <q-item v-for="inv in invoices" :key="inv.invoice_id" clickable v-ripple class="q-py-md" @click="showInvoiceDetail(inv)">
                  <q-item-section side top>
                    <q-badge
                      :color="getBadgeColor(inv.status)"
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
import UpdateNftDialog from 'src/components/payment-hub/UpdateNftDialog.vue'
import { PaymentHub } from 'src/wallet/payment-hub'
import InvoiceDetailDialog from 'src/components/payment-hub/InvoiceDetailDialog.vue'
import { loadWallet } from 'src/wallet'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  subscriptionId: { type: String, required: true },
  isCustomer: { type: Boolean, default: false }
})

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
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
    msg = `This is the total amount billed every ${periodText}.`
  } else if (p.period_blocks) {
    msg = `This is the total amount billed every ${periodText} or every ${p.period_blocks} blocks.`
  }

  const mFee = minerFee.value
  const pFee = paytacaFee.value
  const pledgeSats = sub.value?.pledge_satoshis || 0

  msg += ` This total cost includes the base plan pledge (${pledgeSats} sats), which is the actual amount sent to the merchant, a small miner fee (${mFee} sats), and the Paytaca platform fee (${pFee} sats).`

  $q.dialog({
    title: 'Billing Amount',
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

const minerFee = computed(() => 1000)

const paytacaFee = computed(() => {
  if (!sub.value) return 546
  if (typeof sub.value.paytaca_fee === 'number') return sub.value.paytaca_fee
  if (!sub.value.pledge_satoshis) return 546
  const pledge = sub.value.pledge_satoshis
  const maxFee = sub.value.max_fee || 546
  return Math.max(Math.min(maxFee, Math.floor(pledge / 100)), 546)
})

const totalCostSats = computed(() => {
  if (!sub.value?.pledge_satoshis) return 0
  return sub.value.pledge_satoshis + paytacaFee.value + minerFee.value
})

const totalCostBch = computed(() => {
  if (!totalCostSats.value) return '0'
  return (totalCostSats.value / 1e8).toFixed(8).replace(/\.?0+$/, '')
})

const totalCostFiat = computed(() => {
  if (!totalCostSats.value || !bchPrice.value) return '0.00'
  const bchVal = parseFloat(totalCostBch.value)
  const fiatVal = bchVal * bchPrice.value
  return formatAmount(fiatVal)
})

const remainingPayouts = computed(() => {
  if (!sub.value?.balance || !totalCostSats.value) return 0
  const available = sub.value.balance - 1000
  if (available <= 0) return 0
  return Math.floor(available / totalCostSats.value)
})

const overduePayments = computed(() => {
  if (!sub.value) return 0
  return sub.value.num_overdue || 0
})

const nextPayoutDate = computed(() => {
  if (!sub.value) return null
  const blocks = sub.value.period_blocks || (sub.value.plan_details && sub.value.plan_details.period_blocks)
  if (!blocks) return null

  if (!sub.value.date_created) return null

  const dateCreated = new Date(sub.value.date_created).getTime()
  const periodMs = blocks * 10 * 60000
  const now = Date.now()

  // Calculate based on a fixed schedule relative to date_created
  const totalExpected = Math.max(0, Math.floor((now - dateCreated) / periodMs))
  const numOverdue = sub.value.num_overdue || 0
  const paymentsMade = Math.max(0, totalExpected - numOverdue)

  return new Date(dateCreated + (paymentsMade + 1) * periodMs)
})

const nextPayoutDisplay = computed(() => {
  const expected = nextPayoutDate.value
  if (!expected) return ''

  const now = new Date()
  const isPast = now.getTime() > expected.getTime()

  const isSameDay = expected.getDate() === now.getDate() &&
                    expected.getMonth() === now.getMonth() &&
                    expected.getFullYear() === now.getFullYear()

  const dateString = isSameDay
    ? expected.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    : expected.toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'})

  if (remainingPayouts.value === 0 && isPast) {
    return `Overdue at ${dateString}`
  }

  if (isPast) {
    return 'Waiting for next block'
  }

  return dateString
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

function showInvoiceDetail(inv) {
  $q.dialog({
    component: InvoiceDetailDialog,
    componentProps: {
      invoiceId: inv.invoice_id,
      subscriptionId: props.subscriptionId || sub.value?.id
    }
  })
}

function topUp() {
  $q.dialog({
    component: TopUpDialog,
    componentProps: { subscription: sub.value }
  }).onOk(() => {
    fetchSubscription()
  })
}

function openUpdateDialog() {
  $q.dialog({
    component: UpdateNftDialog,
    componentProps: { subscription: sub.value }
  }).onOk((data) => {
    onDialogOK({ action: 'update_subscription_nft', subscription: sub.value, data })
  })
}

function onCancelSubscriptionClick() {
  onDialogOK({ action: 'cancel_subscription', subscription: sub.value })
}

function formatAmount(amount) {
  const num = parseFloat(amount)
  if (isNaN(num)) return amount
  return parseFloat(num.toFixed(2)).toString()
}

function getPeriodText(p) {
  const periodDays = p.period_days || p.plan_details?.period_days
  if (periodDays) {
    return `${periodDays} ${periodDays === 1 ? (t('Day') || 'day') : (t('Days') || 'days')}`
  }
  const blocks = p.period_blocks || p.plan_details?.period_blocks
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
function getBadgeColor(status) {
  switch(status) {
    case 'PAID': return 'green-4'
    case 'PENDING': return 'orange-4'
    case 'TOP UP': return 'blue-4'
    case 'RECLAIMED': return 'purple-4'
    case 'CANCELLED': return 'red-4'
    case 'EXPIRED': return 'grey-5'
    default: return 'grey-5'
  }
}
</script>

<style scoped>
.font-mono {
  font-family: 'Courier New', Courier, monospace;
}
.border-grey-4 {
  border: 1px solid rgba(128, 128, 128, 0.2);
}
</style>
