<template>
  <div 
    class="transaction-item text-bow"
    :class="[
      'q-mx-lg q-px-sm',
      compact ? 'q-py-sm compact' : 'q-py-md',
      getDarkModeClass(darkMode),
      { 'new-transaction-shine': isNewTransaction }
    ]"
  >
    <div class="transaction-content">
      <div class="transaction-header">
        <div class="transaction-type">
          <div class="type-with-asset" v-if="showAssetInfo && !isNftTransaction">
            <q-avatar size="20px" class="q-mr-xs">
              <img 
                v-if="assetImageUrl" 
                :src="assetImageUrl" 
                class="asset-icon"
                @contextmenu.prevent
                @selectstart.prevent
              />
              <q-icon v-else name="apps" size="14px" />
            </q-avatar>
            <span class="asset-symbol" :class="getDarkModeClass(darkMode)">{{ assetSymbol }}</span>
          </div>
          <span class="type-text text-uppercase" :class="getDarkModeClass(darkMode)">
            {{ recordTypeText }}
          </span>
          <span class="transaction-date" :class="getDarkModeClass(darkMode)">
            <template v-if="transaction.tx_timestamp">{{ formatDate(transaction.tx_timestamp) }}</template>
            <template v-else>{{ formatDate(transaction.date_created) }}</template>
          </span>
        </div>
        <div class="transaction-amount" :class="getDarkModeClass(darkMode)">
          <!-- For NFT transactions, show type name instead of quantity and symbol -->
          <div v-if="isNftTransaction" class="amount-primary">
            {{ asset?.name || 'NFT' }}
          </div>
          <template v-else>
            <div class="amount-primary">
              {{
                `${parseAssetDenomination(
                  denomination === $t('DEEM') || denomination === 'BCH' ? denominationTabSelected : denomination, {
                  ...asset,
                  balance: transaction?.amount,
                  thousandSeparator: true
                })}`
              }}
            </div>
            <div
              v-if="displayFiatAmount !== null && displayFiatAmount !== undefined"
              class="amount-secondary"
              :class="getDarkModeClass(darkMode)"
            >
              {{ parseFiatCurrency(displayFiatAmount, selectedMarketCurrency) }}
            </div>
          </template>
        </div>
      </div>
      <div v-if="decryptedMemo" class="transaction-footer">
        <span class="transaction-memo" :class="getDarkModeClass(darkMode)">
          <q-icon name="mdi-note-text" size="14px" class="q-mr-xs" />
          {{ decryptedMemo }}
        </span>
      </div>
    </div>
    <div v-if="badges.length > 0" class="transaction-badges q-mt-sm">
      <q-badge
        v-for="(badge, index) in badges" :key="index"
        class="badge-item"
        :color="badgeColor"
        rounded
        @click.stop
      >
        <q-icon v-if="badge?.icon" :name="badge?.icon" class="q-mr-xs" size="14px"/>
        <span class="badge-text">
          {{ badge?.text }}
        </span>
        <q-popup-proxy :breakpoint="0">
          <div class="badge-popup pt-card pt-label" :class="getDarkModeClass(darkMode)">
            <div v-if="badge?.text?.length >= 14">
              {{ badge?.text }}
            </div>
            <div class="text-caption">{{ badge?.description }}</div>
          </div>
        </q-popup-proxy>
      </q-badge>
    </div>
  </div>
</template>
<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseAttributeToBadge } from 'src/utils/tx-attributes'
import * as memoService from 'src/utils/memo-service'

const $store = useStore()
const { t: $t, locale: i18nLocale } = useI18n()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const denomination = computed(() => $store.getters['global/denomination'])
const theme = computed(() => $store.getters['global/theme'])
const useRelativeTxTimestamp = computed(() => Boolean($store.getters['global/relativeTxTimestamp']))
const userLocale = computed(() => {
  // Prefer app-selected language; fall back to i18n locale; then browser locale.
  const fromStore = $store.getters['global/language']
  const candidate = fromStore || i18nLocale?.value || globalThis?.navigator?.language || 'en-US'
  return String(candidate).replace('_', '-')
})

const badgeColor = computed(() => {
  const themeMap = {
    'glassmorphic-blue': 'blue-6',
    'glassmorphic-green': 'green-6',
    'glassmorphic-gold': 'amber-7',
    'glassmorphic-red': 'pink-6'
  }
  return themeMap[theme.value] || 'blue-6'
})

const decryptedMemo = ref('')
const currentTime = ref(Date.now())
let updateTimer = null

const props = defineProps({
  transaction: Object,
  selectedAsset: Object,
  denominationTabSelected: String,
  hideAssetInfo: {
    type: Boolean,
    default: false
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const asset = computed(() => {
  // When "All" is selected, always use the transaction's specific asset
  // Never fall back to "All" asset - if transaction asset is missing, use BCH as fallback
  if (props?.selectedAsset?.id === 'all') {
    // Force use of transaction asset when "All" is selected
    // If transaction asset is missing, fallback to BCH (not "All")
    const txAsset = props?.transaction?.asset
    if (!txAsset) {
      console.warn('Transaction missing asset when "All" selected:', props?.transaction)
      return {
        id: 'bch',
        symbol: 'BCH',
        name: 'Bitcoin Cash',
        logo: 'bch-logo.png',
        decimals: 8
      }
    }
    // Ensure we never use "All" as the symbol
    if (txAsset.symbol === 'All' || txAsset.id === 'all') {
      console.warn('Transaction asset has "All" symbol, using BCH fallback:', txAsset)
      return {
        id: 'bch',
        symbol: 'BCH',
        name: 'Bitcoin Cash',
        logo: 'bch-logo.png',
        decimals: 8
      }
    }
    return txAsset
  }
  // For specific asset selection, use transaction asset if available, otherwise selected asset
  return props?.transaction?.asset || props?.selectedAsset
})

const showAssetInfo = computed(() => {
  // Hide asset info if explicitly requested
  if (props.hideAssetInfo) return false
  // Show asset info when "All" is selected
  return props?.selectedAsset?.id === 'all' && asset.value?.id !== 'all'
})

const assetSymbol = computed(() => {
  if (!asset.value) return ''
  return asset.value.symbol || 'TOKEN'
})

const assetImageUrl = computed(() => {
  if (!asset.value) return null
  
  // Handle DEEM logo for BCH
  if (denomination.value === $t('DEEM') && asset.value.symbol === 'BCH') {
    return 'assets/img/theme/payhero/deem-logo.png'
  }
  
  if (asset.value.logo) {
    if (asset.value.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
      return asset.value.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
    } else {
      return asset.value.logo
    }
  }
  
  // Fallback to default logo generator
  const logoGenerator = $store.getters['global/getDefaultAssetLogo']
  return logoGenerator ? logoGenerator(String(asset.value.id)) : null
})

const selectedMarketCurrency = computed(() => {
  const currency = $store.getters['market/selectedCurrency']
  return currency?.symbol
})

const selectedAssetMarketPrice = computed(() => {
  if (!asset.value?.id) return
  if (!selectedMarketCurrency.value) return
  return $store.getters['market/getAssetPrice'](asset.value?.id, selectedMarketCurrency.value)
})

const recordTypeText = computed(() => {
  switch (props?.transaction?.record_type) {
    case('incoming'):
      return $t('Received')
    case('outgoing'):
      return $t('Sent')
  }

  return ''
})

const marketValueData = computed(() => {
  const data = {
    marketAssetPrice: null,
    isHistoricalPrice: false,
    marketValue: null
  }
  if (selectedMarketCurrency.value === 'USD' && props.transaction?.usd_price) {
    data.marketAssetPrice = props.transaction.usd_price
    data.isHistoricalPrice = true
  } else if (props.transaction?.market_prices?.[selectedMarketCurrency.value]) {
    data.marketAssetPrice = props.transaction?.market_prices?.[selectedMarketCurrency.value]
    data.isHistoricalPrice = true
  } else {
    data.marketAssetPrice = selectedAssetMarketPrice.value
    data.isHistoricalPrice = false
  }

  if (data.marketAssetPrice) {
    data.marketValue = (Number(props.transaction?.amount) * Number(data.marketAssetPrice)).toFixed(5)
    if (asset.value?.id !== 'bch') {
      const decimals = parseInt(asset.value?.decimals) || 0; 
      if (decimals > 0) {
        data.marketValue = (Number(data.marketValue) / (10 ** decimals)).toFixed(5)
      }
    }
  }
  return data
})

// Prefer provided fiat_amounts in the transaction when available for the
// wallet's preferred fiat currency; otherwise fall back to computed market value.
const fiatAmountOverride = computed(() => {
  const code = selectedMarketCurrency.value
  const provided = code && props.transaction?.fiat_amounts ? props.transaction.fiat_amounts[code] : undefined
  const numeric = Number(provided)
  return Number.isFinite(numeric) ? numeric : null
})

const displayFiatAmount = computed(() => {
  return fiatAmountOverride.value ?? marketValueData.value?.marketValue
})

const badges = computed(() => {
  if (!Array.isArray(props.transaction?.attributes)) return []
  return props.transaction?.attributes.map(parseAttributeToBadge)
    .filter(badge => badge?.custom)
})

// Check if this is an NFT transaction (has category/commitment or is_nft flag)
const isNftTransaction = computed(() => {
  if (!asset.value) return false
  // Check if asset has category and commitment (NFT indicators)
  if (asset.value.category && asset.value.commitment) return true
  // Check if transaction has is_nft flag
  if (props.transaction?.is_nft === true || props.transaction?.is_nft === 'true') return true
  if (props.transaction?.asset?.is_nft === true || props.transaction?.asset?.is_nft === 'true') return true
  // Check if asset ID starts with ct/ and has decimals 0 (NFT indicator)
  if (asset.value.id && asset.value.id.startsWith('ct/') && asset.value.decimals === 0) {
    // Additional heuristic: NFTs usually transfer exactly 1 unit.
    // Use absolute amount because outgoing transfers can be negative.
    const amount = Math.abs(Number(props.transaction?.amount) || 0)
    if (amount === 1 && asset.value.id !== 'bch') return true
  }
  return false
})

function formatDate (date) {
  const dt = new Date(date)
  if (Number.isNaN(dt.getTime())) return ''

  if (useRelativeTxTimestamp.value) {
    // Intl.RelativeTimeFormat handles grammar/plurals per locale.
    // Use currentTime to keep this reactive with our existing interval.
    const nowMs = Number(currentTime.value) || Date.now()
    const diffMs = dt.getTime() - nowMs // negative => in the past (e.g., "5 minutes ago")
    const diffSeconds = Math.round(diffMs / 1000)

    const absSeconds = Math.abs(diffSeconds)
    const rtf = typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat === 'function'
      ? new Intl.RelativeTimeFormat(userLocale.value, { numeric: 'auto' })
      : null

    const format = (value, unit) => {
      if (rtf) return rtf.format(value, unit)
      // Very defensive fallback (should rarely happen on modern platforms)
      return new Date(date).toLocaleString()
    }

    if (absSeconds < 60) return format(diffSeconds, 'second')
    const diffMinutes = Math.round(diffSeconds / 60)
    if (Math.abs(diffMinutes) < 60) return format(diffMinutes, 'minute')
    const diffHours = Math.round(diffMinutes / 60)
    if (Math.abs(diffHours) < 24) return format(diffHours, 'hour')
    const diffDays = Math.round(diffHours / 24)
    if (Math.abs(diffDays) < 7) return format(diffDays, 'day')
    const diffWeeks = Math.round(diffDays / 7)
    if (Math.abs(diffWeeks) < 4) return format(diffWeeks, 'week')
    const diffMonths = Math.round(diffDays / 30)
    if (Math.abs(diffMonths) < 12) return format(diffMonths, 'month')
    const diffYears = Math.round(diffDays / 365)
    return format(diffYears, 'year')
  }

  // Absolute timestamp formatted per user's locale.
  try {
    return new Intl.DateTimeFormat(userLocale.value, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dt)
  } catch {
    // Fallback: still show something useful.
    return dt.toLocaleString()
  }
}

const isNewTransaction = computed(() => {
  const timestamp = props.transaction?.tx_timestamp || props.transaction?.date_created
  if (!timestamp) return false
  
  const txDate = new Date(timestamp)
  const now = new Date(currentTime.value)
  const diffMs = now - txDate
  const diffSeconds = Math.floor(diffMs / 1000)
  
  // "New" means less than 60 seconds old regardless of display format.
  return diffSeconds < 60
})

async function loadMemo() {
  // Support both txid and tx_hash field names
  const txid = props.transaction?.txid || props.transaction?.tx_hash || props.transaction?.hash
  if (!txid) {
    decryptedMemo.value = ''
    return
  }

  // Capture transaction identifiers at the start to detect prop changes during async operation
  // This prevents race conditions in virtualized lists where components are recycled
  const initialTxid = txid
  const initialEncryptedMemo = props.transaction?.encrypted_memo

  try {
    // Use memo service to load and decrypt memo
    const result = await memoService.loadMemo(initialTxid, initialEncryptedMemo)

    // Verify the transaction hasn't changed while the async call was in flight
    // This prevents stale results from overwriting the memo for a different transaction
    const currentTxid = props.transaction?.txid || props.transaction?.tx_hash || props.transaction?.hash
    const currentEncryptedMemo = props.transaction?.encrypted_memo
    
    if (currentTxid !== initialTxid || currentEncryptedMemo !== initialEncryptedMemo) {
      // Transaction changed during async operation, ignore this result
      return
    }

    if (result.success && result.memo) {
      decryptedMemo.value = result.memo
    } else {
      decryptedMemo.value = ''
    }
  } catch (error) {
    // Only update state if transaction hasn't changed
    const currentTxid = props.transaction?.txid || props.transaction?.tx_hash || props.transaction?.hash
    if (currentTxid === initialTxid) {
      console.error('[TransactionListItem] Error loading memo:', error)
      decryptedMemo.value = ''
    }
  }
}

onMounted(() => {
  // Load memo when component mounts - use nextTick to ensure transaction prop is set
  nextTick(() => {
    loadMemo()
  })
  
  // Update current time every second to keep shine effect reactive
  updateTimer = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

// Clean up timer on unmount
onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer)
    updateTimer = null
  }
})

// Watch for changes to transaction txid and encrypted_memo
// This ensures memos load when transactions are set asynchronously
// Support multiple field names for transaction ID
watch(
  () => [
    props.transaction?.txid || props.transaction?.tx_hash || props.transaction?.hash,
    props.transaction?.encrypted_memo
  ],
  () => {
    loadMemo()
  }
)
</script>
<style lang="scss" scoped>
.transaction-item {
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  touch-action: pan-y;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }
  
  &:active {
    background-color: rgba(0, 0, 0, 0.04);
  }
  
  &.dark {
    border-bottom-color: rgba(255, 255, 255, 0.08);
    
    &:hover {
      background-color: rgba(255, 255, 255, 0.03);
    }
    
    &:active {
      background-color: rgba(255, 255, 255, 0.05);
    }
  }
  
  &:last-child {
    border-bottom: none;
  }
}

.transaction-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.transaction-item.compact .transaction-content {
  gap: 4px;
}

.transaction-item.compact .transaction-header {
  gap: 12px;
}

.transaction-item.compact .transaction-footer {
  gap: 6px;
}

.transaction-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.transaction-type {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.transaction-type .transaction-date {
  margin-top: 2px;
}

.type-with-asset {
  display: flex;
  align-items: center;
  gap: 6px;
}

.asset-symbol {
  font-size: 13px;
  font-weight: 500;
  opacity: 0.8;
  
  &.dark {
    color: #b8bfc4;
  }
  
  &.light {
    color: rgba(0, 0, 0, 0.7);
  }
}

.type-text {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.3px;
  
  &.dark {
    color: #e0e2e5;
  }
  
  &.light {
    color: rgba(0, 0, 0, 0.87);
  }
}

.transaction-amount {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.amount-primary {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.amount-secondary {
  font-size: 13px;
  font-weight: 400;
  opacity: 0.7;
  line-height: 1.3;
}

.transaction-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.transaction-date {
  font-size: 14px;
  opacity: 0.6;
  flex-shrink: 0;
  
  &.dark {
    color: #a6acaf;
  }
  
  &.light {
    color: rgba(0, 0, 0, 0.6);
  }
}

.transaction-memo {
  font-size: 14px;
  opacity: 0.75;
  display: flex;
  align-items: center;
  text-align: right;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: italic;
  
  &.dark {
    color: #b8bfc4;
  }
  
  &.light {
    color: rgba(0, 0, 0, 0.65);
  }

  .q-icon {
    flex-shrink: 0;
  }
}

.transaction-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.badge-item {
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    opacity: 0.8;
    transform: translateY(-1px);
  }
}

.badge-text {
  max-width: 8em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge-popup {
  padding: 8px 12px;
  word-break: break-all;
  max-width: 280px;
}

// Shine effect for new transactions (similar to pending cards)
.transaction-item.new-transaction-shine {
  position: relative;
  overflow: hidden;
  
  // Shimmer effect overlay
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    animation: shimmer-sweep 3s ease-in-out infinite;
    z-index: 0;
    pointer-events: none;
  }
  
  &.dark::before {
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.08),
      transparent
    );
  }
  
  // Ensure content is above shimmer
  > * {
    position: relative;
    z-index: 1;
  }
}

@keyframes shimmer-sweep {
  0% {
    transform: translateX(-100%) translateY(-100%) rotate(45deg);
  }
  50%, 100% {
    transform: translateX(100%) translateY(100%) rotate(45deg);
  }
}
</style>
