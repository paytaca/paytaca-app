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
            <div class="text-subtitle2 text-grey" v-if="sub.plan_details">
              {{ sub.plan_details.amount }} {{ sub.plan_details.currency }}
              /
              {{ intervalLabel }}
            </div>
            <!-- Vault Address Prominent -->
            <div class="q-mt-sm">
              <div class="text-caption text-grey">{{ $t('ContractAddress') || 'Contract Address' }}</div>
              <div class="row no-wrap items-center">
                <div class="text-body2 font-mono ellipsis" style="max-width: 250px;">{{ sub.contract_address }}</div>
                <q-btn flat round dense icon="content_copy" size="sm" class="q-ml-xs" @click="copyText(sub.contract_address, 'Contract Address')" />
              </div>
            </div>
          </div>
          <div class="col-auto text-right">
            <div class="q-mt-md">
              <q-btn
                v-if="sub.status === 'ACTIVE' || sub.status === 'PENDING'"
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

            <!-- Pledge -->
            <div class="q-mb-md">
              <div class="text-caption text-grey">{{ $t('PledgeAmount') || 'Pledge Amount' }}</div>
              <div class="row items-baseline q-gutter-x-sm">
                <div class="text-weight-bold text-body1">{{ pledgeBch }} BCH</div>
                <div class="text-caption text-grey">{{ pledge_satoshis_formatted }} sats</div>
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
                    <div class="text-body2 ellipsis">{{ inv.memo || $t('NoMemo') || 'No Memo' }}</div>
                    <div class="text-caption text-grey">{{ formatDate(inv.date_created) }}</div>
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
import { PaymentHub } from 'src/wallet/payment-hub'
import { loadWallet } from 'src/wallet'

const props = defineProps({
  subscriptionId: { type: String, required: true }
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

const intervalLabel = computed(() => {
  if (!sub.value?.plan_details) return ''
  const p = sub.value.plan_details
  if (p.period_days) return `${p.period_days} day${p.period_days !== 1 ? 's' : ''}`
  if (p.period_blocks) return `${p.period_blocks} blocks`
  // Fall back to period_blocks on the subscription itself
  if (sub.value.period_blocks) return `${sub.value.period_blocks} blocks`
  return ''
})

const pledgeBch = computed(() => {
  if (!sub.value?.pledge_satoshis) return '-'
  return (sub.value.pledge_satoshis / 1e8).toFixed(8).replace(/\.?0+$/, '')
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
    sub.value = await hub.getSubscription(props.subscriptionId, { customer: true })
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
    const data = await hub.listSubscriptionInvoices(props.subscriptionId, { page: 1, customer: true })
    invoices.value = data.results || []
  } catch (err) {
    console.error('Error fetching invoices:', err)
  } finally {
    loadingInvoices.value = false
  }
}

function topUp() {
  if (sub.value?.contract_address) {
    $router.push({ name: 'transaction-send', query: { address: sub.value.contract_address, assetId: 'bch' } })
    onDialogHide()
  }
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
