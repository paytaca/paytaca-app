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
        <div v-else class="text-h6">{{ $t('SubscriptionDetails') }}</div>
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
        <q-btn unelevated rounded color="pt-primary1" :label="$t('Retry')" @click="fetchSubscription" />
      </q-card-section>

      <!-- Content -->
      <q-card-section v-else-if="sub" class="q-pt-md">

        <!-- Status header & Vault Focus -->
        <div class="q-mb-md">
          <!-- Plan Name & Status -->
          <div class="row items-start q-gutter-x-sm q-mb-sm">
            <div class="text-h6 q-mr-sm">{{ sub.plan_details?.name || $t('Subscription') }}</div>
            <q-badge
              :color="getSubscriptionStatusColor(sub)"
              :text-color="darkMode ? 'black' : 'white'"
              class="text-weight-bold q-px-sm q-py-xs br-5"
              style="font-size: 0.75rem;"
            >
              {{ sub.status }}
            </q-badge>

            <div class="row justify-end q-space q-gutter-x-sm">
              <q-btn
                v-if="isCustomer && sub.balance > 0"
                flat
                rounded
                color="red"
                :label="sub.status === 'ACTIVE' || sub.status === 'PENDING' ? $t('Cancel') : $t('Reclaim')"
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
                :label="$t('TopUp', 'Top Up')"
                class="q-px-md"
                @click="topUp"
              />
            </div>
          </div>
          <div class="col">
            <!-- Contract Balance -->
            <div class="q-mb-sm" v-if="sub.plan_details">
              <div class="text-caption text-grey">{{ $t('ContractBalance') }}</div>
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
                <span>{{ $t('BillingAmount', 'Billing Amount') }}</span>
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
              <div class="text-caption text-grey">{{ $t('BillingReceivingPeriod', 'Billing/Receiving Period') }}</div>
              <div class="row items-center">
                <div class="text-body2 text-weight-medium">
                  {{ getPeriodTextBase(sub.plan_details || sub) }}
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
            <div class="q-mb-sm" v-if="(sub.status === 'ACTIVE' || sub.status === 'PENDING') && overduePayments > 0 && remainingPayouts === 0">
              <div class="text-caption text-red">Overdue Payments</div>
              <div class="text-body2 text-weight-medium text-red">
                {{ overduePayments }}
              </div>
            </div>
          </div>
          <div class="col-auto text-right">
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
          <q-tab name="details" :label="$t('Details')" />
          <q-tab name="invoices" :label="$t('Invoices')" />
          <q-tab v-if="sub?.subscription_data?.length || Object.getOwnPropertyNames(sub?.subscription_data)?.length" name="form-data" :label="$t('Data', 'Data')" />
        </q-tabs>

        <q-tab-panels v-model="tab" animated style="background: none;">

          <q-tab-panel name="details" class="q-pa-none q-pt-md">
            <!-- Plan Details -->
            <div v-if="sub.plan_details?.description" class="q-mb-md">
              <div class="text-caption text-grey">{{ $t('Description') }}</div>
              <div class="text-body2">{{ sub.plan_details.description }}</div>
            </div>

            <!-- Vault Address Prominent -->
            <div class="q-mb-md">
              <div class="text-caption text-grey">{{ $t('ContractAddress', 'Contract Address') }}</div>
              <div class="row no-wrap items-center">
                <div class="text-body2 font-mono ellipsis" style="max-width: 320px;">{{ sub.contract_address }}</div>
                <q-btn flat round dense icon="content_copy" size="sm" class="q-ml-xs" @click="copyText(sub.contract_address, $t('ContractAddress'))" />
              </div>
            </div>

            <q-expansion-item
              dense
              dense-toggle
              expand-separator
              icon="info"
              :label="$t('MoreDetails', 'More Details')"
              class="q-mb-md br-10 pt-card border-grey-4"
              :class="getDarkModeClass(darkMode)"
            >
              <div class="q-pa-md">
                <!-- ID fields -->
                <div class="q-gutter-y-sm q-mb-md">
                  <div>
                    <div class="text-caption text-grey">{{ $t('SubscriptionID', 'Subscription ID') }}</div>
                    <div class="row no-wrap items-center">
                      <div class="text-body2 ellipsis q-mr-xs font-mono" style="max-width: 340px;">{{ sub.id }}</div>
                      <q-btn flat round dense icon="content_copy" size="sm" @click="copyText(sub.id, 'Subscription ID')" />
                    </div>
                  </div>
                  <div v-if="sub.short_id">
                    <div class="text-caption text-grey">{{ $t('ShortID', 'Short ID') }}</div>
                    <div class="row no-wrap items-center">
                      <div class="text-body2 font-mono">{{ sub.short_id }}</div>
                      <q-btn flat round dense icon="content_copy" size="sm" @click="copyText(sub.short_id, $t('ShortID'))" />
                    </div>
                  </div>
                </div>

                <!-- Funder & Merchant -->
                <div class="row q-col-gutter-sm q-mb-md">
                  <div class="col-12">
                    <div class="text-caption text-grey">{{ $t('FunderAddress', 'Funder Address') }}</div>
                    <div class="row no-wrap items-center">
                      <div class="text-body2 ellipsis q-mr-xs font-mono" style="max-width: 340px;">{{ sub.funder_address }}</div>
                      <q-btn flat round dense icon="content_copy" size="sm" @click="copyText(sub.funder_address, $t('FunderAddress'))" />
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="text-caption text-grey">{{ $t('MerchantAddress', 'Merchant Address') }}</div>
                    <div class="row no-wrap items-center">
                      <div class="text-body2 ellipsis q-mr-xs font-mono" style="max-width: 340px;">{{ sub.merchant_address }}</div>
                      <q-btn flat round dense icon="content_copy" size="sm" @click="copyText(sub.merchant_address, $t('MerchantAddress'))" />
                    </div>
                  </div>
                </div>

                <!-- Dates -->
                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <div class="text-caption text-grey">{{ $t('DateCreated', 'Date Created') }}</div>
                    <div class="text-body2">{{ formatDate(sub.date_created) }}</div>
                  </div>
                  <div class="col-6">
                    <div class="text-caption text-grey">{{ $t('LastPayment', 'Last Payment') }}</div>
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
              {{ $t('NoInvoices', 'No invoices found') }}
            </div>
            <div v-else>
              <q-list separator class="br-10 border-grey-4">
                <InvoiceListItem
                  v-for="inv in invoices" :key="inv.invoice_id"
                  :invoice="inv"
                  status-style="badge"
                  date-format="absolute"
                  @click="showInvoiceDetail(inv)"
                />
              </q-list>
            </div>
          </q-tab-panel>

          <q-tab-panel name="form-data" class="q-pa-none">
            <div v-if="displayFormSchema">
              <div class="text-subtitle1 text-weight-medium q-mb-sm">
                {{ $t('SubscriberData', 'Subscriber Data') }}
              </div>
              <JSONFormPreview
                :model-value="sub?.subscription_data || {}"
                :schema-data="displayFormSchema"
                :readonly="true"
              />
            </div>
            <div v-else class="q-pa-md text-center text-grey">
              {{ $t('NoDataAvailable', 'No data available') }}
            </div>
          </q-tab-panel>
        </q-tab-panels>
        <q-separator class="q-mb-md" :dark="darkMode" />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useDialogPluginComponent, copyToClipboard, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { inferSchemaFromData } from 'src/components/jsonforms/jsonform-utils'
import { usePaymentHubCore, usePaymentHubUtils, useSubscriptionFormSchema, useSubscriptionUtils } from 'src/composables/payment-hub/usePaymentHub'
import { bus } from 'src/wallet/event-bus'
import TopUpDialog from 'src/components/payment-hub/TopUpDialog.vue'
import UpdateNftDialog from 'src/components/payment-hub/UpdateNftDialog.vue'
import InvoiceDetailDialog from 'src/components/payment-hub/InvoiceDetailDialog.vue'
import JSONFormPreview from 'src/components/jsonforms/JSONFormPreview.vue'
import InvoiceListItem from 'src/components/payment-hub/InvoiceListItem.vue'

const { t: $t } = useI18n()

const props = defineProps({
  subscriptionId: { type: String, required: true },
  isCustomer: { type: Boolean, default: false }
})

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
const $store = useStore()
const $q = useQuasar()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const { hub, initHub } = usePaymentHubCore()
const { formatDate, formatAmount } = usePaymentHubUtils()
const { PAYOUT_TX_FEE, getPeriodTextBase, satsToBchDisplay, getPaytacaFee, getTotalCostPerCycle, showBlocksInfo, getSubscriptionStatusColor } = useSubscriptionUtils();

const loading = ref(true)
const error = ref('')
const sub = ref(null)
const tab = ref('details')

const invoices = ref([])
const loadingInvoices = ref(false)

const { subscriptionFormSchema, hasSubscriptionForm } = useSubscriptionFormSchema(sub);

// Fallback: infer schema from subscription_data if form schema doesn't match
const subscriptionDataSchema = computed(() => {
  const subData = sub.value?.subscription_data
  if (!subData || typeof subData !== 'object') return null
  return inferSchemaFromData(subData)
})

// Use form schema if available, otherwise fall back to inferred schema
const displayFormSchema = computed(() => {
  if (hasSubscriptionForm.value) {
    return subscriptionFormSchema.value
  }
  return subscriptionDataSchema.value
})

const bchPrice = computed(() => {
  if (!sub.value?.plan_details || sub.value.plan_details.currency === 'BCH') return 0
  return $store.getters['market/getAssetPrice']('bch', sub.value.plan_details.currency) || 0
})

function showBillingInfo() {
  if (!sub.value?.plan_details) return
  const p = sub.value.plan_details
  const periodText = getPeriodTextBase(p)

  let msg = ''
  if (p.period_days) {
    msg = $t(
      'TotalBilledEveryPeriodMsg',
      { periodText },
      `This is the total amount billed every ${periodText}.`
    )
  } else if (p.period_blocks) {
    msg = $t(
      'TotalBilledEveryPeriodBlockMsg',
      { periodText, blocks: p.period_blocks },
      `This is the total amount billed every ${periodText} or every ${p.period_blocks} blocks.`
    )
  }

  const mFee = PAYOUT_TX_FEE
  const pFee = getPaytacaFee(sub.value)

  msg += ' ' + $t(
    'TotalSubscriptionCostMsg',
    { mFee, pFee },
    `This total cost includes the base plan pledge, a small miner fee (${mFee} sats), and the Paytaca platform fee (${pFee} sats).`
  )

  $q.dialog({
    title: $t('BillingAmount', 'Billing Amount'),
    message: msg,
    color: 'pt-primary1',
    ok: { flat: true, color: 'pt-primary1', label: 'OK' }
  })
}

const contractBalanceSats = computed(() => {
  if (!sub.value?.balance && sub.value?.balance !== 0) return '0'
  return sub.value.balance.toLocaleString()
})

const contractBalanceBch = computed(() => {
  if (!sub.value?.balance) return '0'
  return satsToBchDisplay(sub.value.balance)
})

const contractBalanceFiat = computed(() => {
  if (!sub.value?.plan_details) return '0.00'
  if (!bchPrice.value || sub.value.plan_details.currency === 'BCH') return contractBalanceBch.value

  const bchVal = parseFloat(contractBalanceBch.value)
  if (isNaN(bchVal)) return '0.00'

  const fiatVal = bchVal * bchPrice.value
  return formatAmount(fiatVal, 2)
})

const totalCostSats = computed(() => getTotalCostPerCycle(sub.value))

const totalCostBch = computed(() => {
  if (!totalCostSats.value) return '0'
  return satsToBchDisplay(totalCostSats.value)
})

const totalCostFiat = computed(() => {
  if (!totalCostSats.value || !bchPrice.value) return '0.00'
  const bchVal = parseFloat(totalCostBch.value)
  const fiatVal = bchVal * bchPrice.value
  return formatAmount(fiatVal, 2)
})

const cashtokenDustAmount = computed(() => 1000)
const remainingPayouts = computed(() => {
  if (!sub.value?.balance || !totalCostSats.value) return 0
  const available = sub.value.balance - cashtokenDustAmount.value
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

async function fetchSubscription(opts) {
  loading.value = true
  error.value = ''
  try {
    await initHub({ isBackground: true, autoRegister: false })
    sub.value = await hub.value.getSubscription(props.subscriptionId, props.isCustomer ? { customer: true } : undefined)
    await fetchInvoices()
  } catch (err) {
    console.error('Error fetching subscription:', err)
    error.value = err.response?.data?.error || err.message || $t('FailedToLoadSubscriptions', 'Failed to load subscription details')
  } finally {
    loading.value = false
  }
}

async function fetchInvoices() {
  loadingInvoices.value = true
  try {
    await initHub({ isBackground: true, autoRegister: false })
    // Note: The method `listSubscriptionInvoices` will be implemented in payment-hub.js
    const data = await hub.value.listSubscriptionInvoices(props.subscriptionId, { page: 1, ...(props.isCustomer ? { customer: true } : {}) })
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

function copyText(text, label = $t('Text')) {
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

function onPaymentHubSubscriptionUpdate(subData) {
  if (subData?.id === props.subscriptionId) {
    sub.value = subData
    fetchInvoices()
  }
}

onBeforeUnmount(() => {
  bus.off('payment-hub-subscription-update', onPaymentHubSubscriptionUpdate)
})
onMounted(() => {
  bus.on('payment-hub-subscription-update', onPaymentHubSubscriptionUpdate)
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
