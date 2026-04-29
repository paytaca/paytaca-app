<template>
  <div class="transaction-summary-wrapper" :class="getDarkModeClass(darkMode, 'bg-pt-dark-page', 'bg-pt-light-page')">
    <div class="transaction-summary-header-wrapper">
      <header-nav :title="$t('Transaction', {}, 'Transaction')" :backnavpath="backNavPath" class="header-nav apps-header" @click:left="goBack" />
    </div>
    <div class="transaction-summary-content-wrapper" :class="getDarkModeClass(darkMode)">
      <!-- Skeleton Loading State -->
      <div v-if="isLoading" class="q-pa-lg">
        <div class="text-bow text-center content-container-ss" :class="getDarkModeClass(darkMode)">
          <!-- Page title skeleton -->
          <q-skeleton type="text" width="120px" height="28px" class="q-mx-auto q-mb-md" />
          
          <!-- Direction icon skeleton -->
          <div class="row justify-center q-mt-sm q-mb-md">
            <q-skeleton type="circle" size="60px" />
          </div>

          <!-- Amount block skeleton -->
          <div class="amount-block q-mt-md text-center section-block-ss">
            <div class="row justify-center q-gutter-sm amount-row-ss" style="margin-top: 25px;">
              <q-skeleton type="circle" size="40px" />
              <q-skeleton type="text" width="150px" height="32px" />
            </div>
            <q-skeleton type="text" width="100px" height="20px" class="q-mt-sm q-mx-auto" />
            <q-skeleton type="text" width="120px" height="18px" class="q-mt-sm q-mx-auto" />
          </div>

          <!-- Reference ID skeleton -->
          <div class="reference-id-section section-block-ss q-mt-lg" style="margin-top: 25px;">
            <q-skeleton type="text" width="100px" height="14px" class="q-mb-xs" />
            <q-skeleton type="text" width="80px" height="24px" class="q-mx-auto" />
            <q-separator color="grey" class="q-mt-sm ref-separator-ss"/>
          </div>

          <!-- Transaction ID skeleton -->
          <div class="transaction-id-section section-block-ss q-mt-md" style="margin-top: 25px;">
            <q-skeleton type="text" width="120px" height="14px" class="q-mb-sm" />
            <q-skeleton type="rect" height="40px" class="q-mb-sm" style="border-radius: 8px;" />
            <q-skeleton type="text" width="140px" height="16px" class="q-mx-auto" />
          </div>

          <!-- Date skeleton -->
          <q-skeleton type="text" width="100px" height="14px" class="q-mt-md" />
          <q-skeleton type="text" width="180px" height="20px" class="q-mt-xs q-mb-lg" />
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="loadError && !isLoading" class="q-pa-md text-center">
        <div class="text-subtitle1 q-mb-sm">{{ loadError }}</div>
        <q-btn outline color="primary" no-caps @click="retryFetch" class="q-mr-sm">{{ $t('Retry', {}, 'Retry') }}</q-btn>
        <q-btn outline color="primary" no-caps @click="goBack">{{ $t('Back', {}, 'Back') }}</q-btn>
      </div>

      <!-- Transaction Content -->
      <div v-else-if="histories.length > 0 && transactionId" class="q-pa-lg">
        <div class="text-bow text-center content-container-ss" :class="getDarkModeClass(darkMode)">
          <!-- Page title and direction icon -->
          <template v-if="primaryRecordType">
            <div class="text-center page-title text-uppercase">
              <template v-if="primaryRecordType === 'incoming'">{{ $t('Received') }}</template>
              <template v-else>{{ $t('Sent') }}</template>
            </div>
            <div class="row justify-center q-mt-sm q-mb-md" style="margin-top: 12px;">
              <div class="direction-icon-container" :class="getDarkModeClass(darkMode)">
                <q-icon :name="primaryRecordType === 'incoming' ? 'arrow_downward' : 'arrow_upward'" class="direction-icon" />
              </div>
            </div>
          </template>
          <template v-else>
            <div class="text-center page-title text-uppercase">
              {{ $t('Summary') }}
            </div>
          </template>

          <!-- Amounts List (mirrors SendSuccessBlock proportions) -->
          <div class="amount-block q-mt-md text-center section-block-ss">
            <template v-for="({ history, header }, index) in transactionContentData">
              <div v-if="header" class="text-left page-title text-uppercase q-mt-md q-mb-sm">
                {{ header }}
              </div>
              <div 
                v-else-if="history"
                :key="index"
                class="asset-item-elevated q-py-md q-px-md q-mb-sm"
                :class="getDarkModeClass(darkMode)"
                @click="viewAssetDetail(history); showAllAssetsDialog = false"
              >
                <div class="row items-center no-wrap full-width">
                  <q-avatar size="40px" class="q-mr-md">
                    <img :src="getImageUrl(history.asset)" class="asset-icon" @contextmenu.prevent @selectstart.prevent />
                  </q-avatar>
                  <div class="col">
                    <div class="asset-symbol text-weight-medium">{{ history.asset?.symbol || 'Unknown' }}</div>
                    <div class="asset-name text-caption">{{ history.asset?.name || 'Unknown Asset' }}</div>
                  </div>
                  <div class="text-right q-mr-sm">
                    <div class="asset-amount text-weight-medium">{{ formatAmount(history) }}</div>
                    <div v-if="getFiatValue(history)" class="asset-fiat text-caption">{{ getFiatValue(history) }}</div>
                  </div>
                  <q-icon name="chevron_right" size="24px" class="arrow-icon" />
                </div>
              </div>
            </template>

            <!-- Network Fee -->
            <div v-if="networkFee" class="amount-fee-ss text-caption q-mt-sm">
              <div class="text-grey">{{ $t('NetworkFee') }}</div>
              {{ networkFee }}
              <template v-if="networkFeeFiat">
                ({{ networkFeeFiat }})
              </template>
            </div>
          </div>

          <!-- Reference ID (big, spaced, with separator) -->
          <div class="reference-id-section section-block-ss q-mt-lg" style="margin-top: 25px;">
            <div class="text-grey text-weight-medium text-caption">&nbsp;{{ $t('ReferenceId')}}</div>
            <div class="reference-id-value-ss">{{ referenceId }}</div>
            <q-separator color="grey" class="q-mt-sm ref-separator-ss"/>
          </div>

          <!-- Transaction ID block (copyable with explorer link below) -->
          <div class="transaction-id-section section-block-ss q-mt-md" style="margin-top: 25px;">
            <div class="text-grey text-weight-medium text-caption q-mb-sm">&nbsp;{{ $t('TransactionId')}}</div>
            <div class="txid-container-ss" :class="getDarkModeClass(darkMode)" @click="transactionId && copyToClipboard(transactionId)">
              <span class="txid-text-ss">{{ transactionId ? `${transactionId.slice(0, 8)}...${transactionId.slice(-8)}` : '' }}</span>
              <q-icon name="content_copy" size="18px" class="copy-icon-ss" />
            </div>
            <div class="view-explorer-container q-mt-sm">
              <a class="view-explorer-link-ss" :class="getDarkModeClass(darkMode)" :href="explorerLink" target="_blank">
                <q-icon name="open_in_new" size="16px" class="q-mr-xs" />
                {{ $t('ViewInExplorer') }}
              </a>
            </div>
          </div>

          <!-- Date & Time -->
          <div class="text-grey text-weight-medium text-caption" style="margin-top: 14px;">&nbsp;{{ $t('DateAndTime', {}, 'Date & Time') }}</div>
          <div class="date-prominent q-mt-xs q-mb-lg date-block-ss" :class="getDarkModeClass(darkMode)" style="margin-top: 10px;">
            {{ formattedDate }}
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!isLoading && !loadError" class="q-pa-lg text-center">
        <div class="text-subtitle1 q-mb-sm">{{ $t('NoTransactionFound', {}, 'No transaction found') }}</div>
        <q-btn outline color="primary" no-caps @click="goBack">{{ $t('Back', {}, 'Back') }}</q-btn>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import headerNav from 'src/components/header-nav'
import axios from 'axios'
import { getWatchtowerApiUrl } from 'src/wallet/chipnet'
import { parseAssetDenomination, parseFiatCurrency, formatWithLocale } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getExplorerLink } from 'src/utils/send-page-utils'
import { hexToRef as hexToRefUtil } from 'src/utils/reference-id-utils'
import { useI18n } from 'vue-i18n'

const { t: $t } = useI18n();
const $store = useStore()
const $route = useRoute()
const $router = useRouter()

const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const props = defineProps({
  txid: String,
  from: String,
})

const walletHash = computed(() => {
  if ($route.params.walletHash) return $route.params.walletHash
  return $store.getters['global/getWallet']('bch')?.walletHash
})

const loadError = ref('')
const histories = ref([])
const isLoading = ref(false)
const retryCount = ref(0)
const maxRetries = 3

const transactionContentData = computed(() => {
  const data = [];
  const incomingTypeHistory = [];
  const outgoingTypeHistory = [];
  for (const history of histories.value) {
    if (history.record_type === 'incoming') incomingTypeHistory.push({ history })
    else outgoingTypeHistory.push({ history })
  }

  const addHeaders = Boolean(incomingTypeHistory.length && outgoingTypeHistory.length);
  if (outgoingTypeHistory.length) {
    if (addHeaders) data.push({ header: $t('Sent') });
    data.push(...outgoingTypeHistory);
  }

  if (incomingTypeHistory.length) {
    if (addHeaders) data.push({ header: $t('Received') });
    data.push(...incomingTypeHistory);
  }

  return data;
})

const backNavPath = computed(() => {
  if (props.from === 'send' || props.from === 'send-page') return '/send'
  return '/transaction/list'
})

const transactionId = computed(() => props.txid || '')

const explorerLink = computed(() => getExplorerLink(transactionId.value || ''))

const formattedDate = computed(() => {
  if (!histories.value || histories.value.length === 0) return ''
  const firstHistory = histories.value[0]
  const date = firstHistory?.tx_timestamp || firstHistory?.date_created;
  const dateObj = new Date(date)
  const langs = [$store.getters['global/language'], 'en-US']
  return new Intl.DateTimeFormat(langs, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  }).format(dateObj)
})

const referenceId = computed(() => {
  if (!transactionId.value) return ''
  try {
    return hexToRefUtil(transactionId.value.substring(0, 6))
  } catch {
    return ''
  }
})

const primaryRecordType = computed(() => {
  if (!histories.value || histories.value.length === 0) return '';
  const recordTypes = histories.value.map(h => h.record_type).filter(Boolean);

  const firstRecordType = recordTypes[0];
  if (recordTypes.every(recordType => recordType === firstRecordType)) {
    return firstRecordType;
  }

  return '';
})

const selectedMarketCurrency = computed(() => $store.getters['market/selectedCurrency']?.symbol || 'USD')

const networkFeeSats = computed(() => {
  // Network fee would typically come from the transaction details
  // For now, return null - this can be enhanced later if fee data is available
  const firstHistory = histories.value[0]
  const sats = firstHistory?.tx_fee;
  if (!sats) return null;
  return Math.floor(Number(sats));
})
const networkFee = computed(() => {
  if (!Number.isSafeInteger(networkFeeSats.value)) return null;
  const txFeeBch = networkFeeSats.value / 10 ** 8;
  return parseAssetDenomination(
    $store.getters['global/denomination'] || 'BCH',
    { symbol: 'BCH', balance: txFeeBch }
  )
})

const networkFeeFiat = computed(() => {
  if (!Number.isSafeInteger(networkFeeSats.value)) return null;
  const networkFeeBch = networkFeeSats.value / 10 ** 8;
  return parseFiatCurrency(networkFeeBch, selectedMarketCurrency.value)
})

onMounted(() => {
  fetchAllHistories()
})

async function fetchAllHistories () {
  if (!walletHash.value || !props.txid) {
    loadError.value = 'Missing wallet hash or transaction ID'
    isLoading.value = false
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    const baseUrl = getWatchtowerApiUrl()
    const params = { all: true, txids: props.txid };
    const url = `${baseUrl}/history/wallet/${encodeURIComponent(walletHash.value)}/`
    const response = await axios.get(url, { params });
    const data = response?.data?.history || response?.data || []
    const enrichedHistories = await Promise.all(
      data.map(async (history) => {
        let assetId = history?.token?.asset_id;
        if (assetId === 'ct/1') assetId = 'bch';
        history._assetId = assetId
        await attachAssetToHistory(history);
        return history
      })
    )
    histories.value = enrichedHistories
    isLoading.value = false
    retryCount.value = 0
  } catch (error) {
    console.error('[TransactionSummary] Error fetching histories:', error)
    loadError.value = 'Failed to load transaction history'
    isLoading.value = false
    
    if (retryCount.value < maxRetries) {
      retryCount.value++
      setTimeout(() => fetchAllHistories(), 1000 * retryCount.value)
    }
  }
}

function extractCategoryFromAssetId (assetId) {
  if (!assetId) return ''
  if (assetId === 'bch' || assetId.startsWith('bch')) return ''
  const parts = assetId.split('/')
  if (parts.length === 2 && (parts[0] === 'ct' || parts[0] === 'slp')) {
    return parts[1]
  }
  return ''
}

async function attachAssetToHistory (history) {
  const assetId = history._assetId
  if (!assetId) return

  let asset = {
    id: assetId,
    symbol: 'UNKNOWN',
    name: 'Unknown Asset',
    logo: null
  }

  if (assetId === 'bch') {
    asset.symbol = 'BCH'
    asset.name = 'Bitcoin Cash'
    asset.logo = 'bch-logo.png'
  } else if (assetId.startsWith('ct/')) {
    try {
      const storeAsset = $store.getters['assets/getAsset'](assetId)?.[0];
      if (storeAsset) {
        asset = { ...storeAsset }
      }
    } catch (e) {
      console.warn('[TransactionSummary] Could not get asset from store:', e)
    }
  }

  history.asset = asset
}

function getImageUrl (asset) {
  if (!asset) return 'bch-logo.png'
  if (asset.logo) {
    if (asset.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
      return asset.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
    }
    return asset.logo
  }
  return 'bch-logo.png'
}

function formatAmount (history) {
  if (!history || !history.asset) return ''
  const amount = Math.abs(history.amount || 0);
  const denomination = $store.getters['global/denomination'] || 'BCH'
  
  return parseAssetDenomination(denomination, {
    ...history.asset,
    balance: amount
  })
}

function getFiatValue (history) {
  if (!history || !history.asset) return null

  let marketPrice = history?.market_prices?.[selectedMarketCurrency.value];
  if (!Number.isFinite(marketPrice)) {
    marketPrice = $store.getters['market/getAssetPrice'](history.asset.id, selectedMarketCurrency.value)
  }
  if (!marketPrice) return null

  const amount = Math.abs(parseFloat(history.amount || 0));
  if (!amount) return null

  const decimals = parseInt(history.asset?.decimals) || 0;
  const normalizedAmount = amount / 10 ** decimals;

  const fiatValue = normalizedAmount * marketPrice
  return parseFiatCurrency(fiatValue, selectedMarketCurrency.value)
}

function viewAssetDetail (history) {
  const assetId = history.asset?.id || ''
  const txid = transactionId.value

  let query = { from: 'summary' }

  
  if (assetId && assetId !== 'bch') {
    const parts = assetId.split('/')
    if (parts.length === 2 && (parts[0] === 'ct' || parts[0] === 'slp')) {
      query.category = parts[1]
    }
    query.assetID = assetId
  }

  const serializedTx = JSON.parse(JSON.stringify(history))

  $router.push({
    name: 'transaction-detail',
    params: { txid },
    query,
    state: { tx: serializedTx }
  })
}

function copyToClipboard (text) {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    window?.$q?.notify({
      message: 'Copied!',
      color: 'positive',
      position: 'top',
      timeout: 2000
    })
  }).catch(err => {
    console.error('Failed to copy:', err)
  })
}

function goBack () {
  if (window?.history?.state?.tx) {
    $router.back()
  } else {
    $router.push(backNavPath.value)
  }
}

function retryFetch () {
  retryCount.value = 0
  fetchAllHistories()
}
</script>

<style scoped>
/* New wrapper structure - completely independent of sticky-header-container */
.transaction-summary-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
  /* Constrain to viewport and enable scrolling */
  height: 100vh;
  max-height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Dark mode background colors */
.transaction-summary-wrapper.bg-pt-dark-page {
  background-color: #181818;
}

.transaction-summary-wrapper.bg-pt-light-page {
  background-color: #f5f5f5;
}

.transaction-summary-content-wrapper {
  padding-bottom: 80px;
}

.content-container-ss {
  min-width: 320px;
  max-width: 700px;
  margin: 0 auto;
  padding-top: 8px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: inherit;
}


.direction-icon-container {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  position: relative;
}
.direction-icon-container.dark {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
.direction-icon-container.light {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}
.direction-icon-container .direction-icon {
  font-size: 32px;
  margin: 0;
  padding: 0;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.amount-block {
  text-align: center;
}

.amount-label-ss { 
  font-size: 28px; 
  font-weight: 600; 
  margin-top: -4px; 
  margin-bottom: 4px;
  line-height: 1; 
  display: inline-block;
}

.amount-fiat-label-ss { 
  font-size: 20px; 
  opacity: 0.85; 
  margin-top: 0;
}

.amount-fee-ss {
  font-size: 13px;
  margin-top: 6px;
  opacity: 0.9;
  font-weight: 500;
}

.amount-row-ss { 
  align-items: center !important; 
}

.amount-avatar-ss { 
  margin-top: -10px; 
}

.amount-avatar-ss img { 
  display: block; 
}

/* Additional assets styling */
.additional-assets-container {
  text-align: center;
}

.additional-asset-item {
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 8px 16px;
  border-radius: 8px;
  margin-bottom: 4px;
}

.additional-asset-item:not(.dark):hover {
  background: rgba(0, 0, 0, 0.05);
}

.additional-asset-item.dark:hover {
  background: rgba(255, 255, 255, 0.1);
}

.additional-asset-amount {
  font-size: 18px;
  font-weight: 500;
}

.additional-asset-fiat {
  font-size: 13px;
  opacity: 0.7;
}

.view-all-btn-container {
  margin-top: 8px;
}

.view-all-btn {
  font-size: 13px;
  padding: 4px 12px;
}

/* Elevated asset item - mirrors txid-container styling */
.asset-item-elevated {
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.25s ease;
  background: rgba(128, 128, 128, 0.08);
  border: 1px solid rgba(128, 128, 128, 0.2);
  display: flex;
  align-items: center;
  text-align: left;
}

.asset-item-elevated:hover {
  background: rgba(128, 128, 128, 0.15);
  border-color: rgba(128, 128, 128, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.asset-item-elevated .arrow-icon {
  opacity: 0.6;
  transition: all 0.2s ease;
}

.asset-item-elevated:hover .arrow-icon {
  opacity: 1;
  transform: translateX(2px);
}

.asset-item-elevated .asset-symbol {
  font-size: 16px;
  color: inherit;
}

.asset-item-elevated .asset-name {
  color: rgba(128, 128, 128, 0.8);
  margin-top: 2px;
}

.asset-item-elevated .asset-amount {
  font-size: 16px;
  color: inherit;
}

.asset-item-elevated .asset-fiat {
  color: rgba(128, 128, 128, 0.7);
  margin-top: 2px;
}

/* Reference + Txid blocks to mirror SendSuccessBlock */
.reference-id-value-ss {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 8px;
  margin-top: 8px;
  font-family: 'Courier New', monospace;
}

.txid-container-ss {
  cursor: pointer;
  padding: 12px 20px;
  border-radius: 12px;
  transition: all 0.25s ease;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: rgba(128, 128, 128, 0.08);
  border: 1px solid rgba(128, 128, 128, 0.2);
}

.txid-container-ss:hover {
  background: rgba(128, 128, 128, 0.15);
  border-color: rgba(128, 128, 128, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.txid-text-ss {
  font-family: 'Courier New', monospace;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.copy-icon-ss { 
  opacity: 0.7; 
  transition: all 0.2s ease; 
}

.view-explorer-link-ss { 
  display: inline-flex; 
  align-items: center; 
  text-decoration: none; 
  font-size: 15px; 
  font-weight: 500; 
  padding: 8px 16px; 
  border-radius: 8px; 
  color: var(--q-primary); 
  transition: all 0.2s ease; 
}

.view-explorer-link-ss:hover { 
  background: rgba(0, 128, 0, 0.08); 
  transform: translateX(2px); 
}

.view-explorer-link-ss.dark { 
  color: #4ade80; 
}

.date-prominent { 
  text-align: center; 
  font-size: 16px; 
  font-weight: 500; 
}

.date-prominent.dark { 
  color: rgba(255,255,255,0.85); 
}

.date-prominent:not(.dark) { 
  color: rgba(0,0,0,0.85); 
}

.section-block-ss { 
  margin-top: 12px; 
}

.date-block-ss { 
  opacity: 0.9; 
}

.ref-separator-ss {
  opacity: 0.3;
}

/* Asset icon styling */
.asset-icon {
  object-fit: cover;
  border-radius: 50%;
}
</style>