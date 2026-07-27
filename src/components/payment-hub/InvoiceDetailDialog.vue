<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width: 500px; max-width: 95vw;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ $t('InvoiceDetails') }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section v-if="loading" class="text-center q-pa-xl">
        <q-spinner color="pt-primary1" size="3em" />
      </q-card-section>

      <q-card-section v-else-if="error" class="text-center q-pa-xl">
        <q-icon name="error" color="red" size="3em" />
        <p class="text-grey q-mt-md">{{ error }}</p>
        <q-btn unelevated rounded color="pt-primary1" :label="$t('Retry')" @click="fetchInvoice" />
      </q-card-section>

      <q-card-section v-else-if="invoice" class="q-pt-md">
        <!-- Status & Summary -->
        <div class="row justify-between items-start q-mb-lg">
          <div class="col">
            <q-badge
              :color="getStatusColor(invoice.status)"
              :text-color="darkMode ? 'black' : 'white'"
              class="text-weight-bold q-px-md q-py-xs br-5"
              style="font-size: 0.9rem;"
            >
              {{ invoice.status }}
            </q-badge>
            <div class="text-caption text-grey q-mt-xs">
              ID: {{ invoice.invoice_id }}
              <CopyButton :text="invoice.invoice_id" />
            </div>
          </div>
          <div class="col-auto text-right">
            <div class="text-h6 text-weight-bold">{{ invoice.total_bch }} BCH</div>
            <div class="text-subtitle2 text-grey">{{ invoice.total_fiat }}</div>
          </div>
        </div>

        <!-- Memo -->
        <div class="q-mb-md">
          <div class="text-subtitle2 text-grey">{{ $t('Memo') }}</div>
          <div class="text-body1" style="word-break: break-all;">{{ invoice.memo || $t('NoMemo') }}</div>
        </div>

        <q-separator class="q-my-md" :dark="darkMode" />

        <!-- Timestamps -->
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-6">
            <div class="text-caption text-grey">{{ $t('DateCreated') }}</div>
            <div class="text-body2">{{ formatDate(invoice.date_created) }}</div>
          </div>
          <div class="col-6">
            <template v-if="invoice.status === 'PAID'">
              <div class="text-caption text-grey">{{ $t('DatePaid') }}</div>
              <div class="text-body2 text-green-7">{{ formatDate(invoice.date_paid) }}</div>
            </template>
            <template v-else-if="invoice.status === 'CANCELLED'">
              <div class="text-caption text-grey">{{ $t('DateCancelled') }}</div>
              <div class="text-body2 text-red">{{ formatDate(invoice.date_cancelled) }}</div>
            </template>
            <template v-else-if="invoice.status === 'EXPIRED'">
              <div class="text-caption text-grey">{{ $t('DateExpired') }}</div>
              <div class="text-body2 text-red">{{ formatDate(invoice.date_expired) }}</div>
            </template>
            <template v-else>
              <div class="text-caption text-grey">{{ $t('ExpiryDate') }}</div>
              <div class="text-body2">{{ formatDate(invoice.expires) }}</div>
            </template>
          </div>
        </div>

        <!-- Payment URL -->
        <div v-if="invoice.payment_url" class="q-mb-md">
          <div class="text-caption text-grey">{{ $t('PaymentUrl') }}</div>
          <div class="row no-wrap items-center">
            <div class="text-body2 ellipsis q-mr-xs font-mono">{{ invoice.payment_url }}</div>
            <CopyButton :text="invoice.payment_url" />
            <q-btn
              flat
              round
              dense
              icon="open_in_new"
              size="sm"
              color="pt-primary1"
              @click="openPaymentUrl(invoice.payment_url)"
            >
              <q-tooltip>{{ $t('OpenPaymentUrl') }}</q-tooltip>
            </q-btn>
          </div>
        </div>

        <!-- TX ID (if paid) -->
        <div v-if="invoice.tx_id" class="q-mb-md">
          <div class="text-caption text-grey">{{ $t('TransactionId') }}</div>
          <div class="row no-wrap items-center">
            <div class="text-body2 ellipsis q-mr-xs font-mono">{{ invoice.tx_id }}</div>
            <CopyButton :text="invoice.tx_id" />
            <q-btn
              flat
              round
              dense
              icon="open_in_new"
              size="sm"
              color="pt-primary1"
              @click="openExplorer(invoice.tx_id)"
            >
              <q-tooltip>{{ $t('ViewInExplorer') }}</q-tooltip>
            </q-btn>
          </div>
        </div>

        <q-separator class="q-my-md" :dark="darkMode" />

        <!-- Outputs -->
        <div>
          <div class="text-subtitle2 text-grey q-mb-sm">{{ $t('Recipients') }} ({{ invoice.outputs?.length || 0 }})</div>
          <q-list bordered class="br-10 overflow-hidden">
            <q-item v-for="(output, idx) in invoice.outputs" :key="idx" class="q-py-sm">
              <q-item-section>
                <q-item-label class="text-caption text-grey">{{ $t('Address') }}</q-item-label>
                <q-item-label class="text-body2 font-mono ellipsis row items-center">
                  {{ output.address }}
                  <CopyButton :text="output.address" />
                </q-item-label>
                <q-item-label v-if="output.description" caption>
                  {{ output.description }}
                </q-item-label>
              </q-item-section>
              <q-item-section side top class="text-right">
                <template v-if="output.token">
                  <div class="text-weight-bold row items-center justify-end no-wrap">
                    <q-img
                      v-if="getTokenIcon(output.token)"
                      :src="getTokenIcon(output.token)"
                      class="q-mr-xs"
                      style="width: 16px; height: 16px; border-radius: 50%;"
                      fit="contain"
                    />
                    <div class="ellipsis">
                      {{ getTokenDisplayAmount(output.token) }}
                      <q-tooltip>{{ output.token.category }}</q-tooltip>
                    </div>
                  </div>
                  <div class="text-caption text-grey cursor-help" style="font-size: 0.7rem;">
                    {{ formatSatoshis(output.amount_satoshis) }} BCH
                    <q-tooltip>{{ $t('TokenDustAmountDescription') }}</q-tooltip>
                  </div>
                </template>
                <template v-else>
                  <div class="text-weight-bold">
                    {{ formatSatoshis(output.amount_satoshis) }} BCH
                  </div>
                </template>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </q-card-section>

      <q-card-actions align="center" class="q-pb-md">
        <q-btn unelevated rounded color="pt-primary1" :label="$t('Close')" v-close-popup class="q-px-xl" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useQuasar, useDialogPluginComponent, openURL } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { PaymentHub } from 'src/wallet/payment-hub'
import { loadWallet } from 'src/wallet'
import { getExplorerLink } from 'src/utils/send-page-utils'
import { getTokenImage } from 'src/wallet/cashtokens'
import CopyButton from 'src/components/CopyButton.vue'

const props = defineProps({
  invoiceId: {
    type: String,
    required: true
  },
  subscriptionId: {
    type: String,
    default: null
  },
  planId: {
    type: String,
    default: null
  }
})

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide } = useDialogPluginComponent()
const $store = useStore()
const $q = useQuasar()

const darkMode = computed(() => $store.getters['darkmode/getStatus'])

// State
const invoice = ref(null)
const loading = ref(false)
const error = ref('')

onMounted(() => {
  fetchInvoice()
})

async function fetchInvoice() {
  loading.value = true
  error.value = ''
  try {
    const walletIndex = $store.getters['global/getWalletIndex']
    const wallet = await loadWallet('BCH', walletIndex)
    const hub = new PaymentHub(wallet)
    
    if (props.subscriptionId) {
      invoice.value = await hub.getSubscriptionInvoice(props.subscriptionId, props.invoiceId)
    } else if (props.planId) {
      invoice.value = await hub.getPlanInvoice(props.planId, props.invoiceId)
    } else {
      invoice.value = await hub.getInvoice(props.invoiceId)
    }
  } catch (err) {
    console.error('Error fetching invoice details:', err)
    error.value = 'Failed to load invoice details'
  } finally {
    loading.value = false
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'PAID': return 'green'
    case 'PENDING': return 'orange'
    case 'EXPIRED': return 'grey'
    case 'CANCELLED': return 'red'
    case 'TOP UP': return 'blue'
    case 'RECLAIMED': return 'purple'
    default: return 'grey'
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString()
}

function formatSatoshis(sats) {
  if (!sats) return '0.00000000'
  return (sats / 100000000).toFixed(8)
}

const allAssets = computed(() => $store.getters['assets/getAssets'] || [])

function getTokenIcon(token) {
  if (!token) return null
  const assetId = `ct/${token.category}`
  const asset = allAssets.value.find(a => a.id === assetId)
  
  if (asset && asset.logo) {
    // Convert ipfs:// URLs to https://ipfs.paytaca.com/ipfs/ format
    return getTokenImage(asset.logo)
  }
  
  const logoGenerator = $store.getters['global/getDefaultAssetLogo']
  if (logoGenerator) {
    return logoGenerator(token.category)
  }
  
  return null
}

function getTokenDisplayAmount(token) {
  if (!token) return ''
  
  const assetId = `ct/${token.category}`
  const asset = allAssets.value.find(a => a.id === assetId)
  
  let displayAmount = token.amount
  let symbol = asset ? asset.symbol : truncateCategory(token.category)
  
  if (asset && asset.decimals !== undefined) {
    displayAmount = (Number(token.amount) / (10 ** asset.decimals)).toLocaleString(undefined, {
      maximumFractionDigits: asset.decimals
    })
  }

  if (token.nft) {
    const capability = token.nft.capability !== 'none' ? ` (${token.nft.capability})` : ''
    return `NFT${capability}: ${symbol}`
  }

  return `${displayAmount} ${symbol}`
}

function truncateCategory(category) {
  if (!category) return ''
  return category.substring(0, 4) + '...' + category.substring(category.length - 4)
}

function openExplorer(txid) {
  const link = getExplorerLink(txid)
  if (link) openURL(link)
}

function openPaymentUrl(url) {
  if (url) openURL(url)
}

const isExpired = computed(() => {
  if (!invoice.value?.expires) return false
  return new Date(invoice.value.expires) < new Date()
})
</script>

<style lang="scss" scoped>
.font-mono {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.8rem;
}
.br-5 { border-radius: 5px; }
.br-10 { border-radius: 10px; }
</style>