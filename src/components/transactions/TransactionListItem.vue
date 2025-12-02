<template>
  <div 
    class="transaction-item" 
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
          <div class="type-with-asset" v-if="showAssetInfo">
            <q-avatar size="20px" class="q-mr-xs">
              <img v-if="assetImageUrl" :src="assetImageUrl" />
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
          <template v-if="isStablehedgeTx">
            <div class="amount-primary">
              {{ 
                parseAssetDenomination(
                  denomination === $t('DEEM') || denomination === 'BCH' ? denominationTabSelected : denomination, {
                  ...asset,
                  balance: stablehedgeTxData?.bch,
                  thousandSeparator: true
                })
              }}
            </div>
            <div
              v-if="isStablehedgeTx && stablehedgeTxData?.amount"
              class="amount-secondary"
              :class="getDarkModeClass(darkMode)"
            >
              {{ parseFiatCurrency(stablehedgeTxData?.amount, stablehedgeTxData?.currency) }}
            </div>
          </template>
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
import ago from 's-ago'
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { extractStablehedgeTxData } from 'src/wallet/stablehedge/history-utils'
import { parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseAttributeToBadge } from 'src/utils/tx-attributes'
import { decryptMemo } from 'src/utils/transaction-memos.js'
import { getKeypair } from 'src/exchange/chat/keys'

const $store = useStore()
const $t = useI18n().t
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const denomination = computed(() => $store.getters['global/denomination'])

const decryptedMemo = ref('')
const currentTime = ref(Date.now())

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
  if (stablehedgeTxData.value?.transactionTypeText) {
    return stablehedgeTxData.value?.transactionTypeText
  }

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
    .filter(badge => isStablehedgeTx.value || badge.key !== 'stablehedge_transaction')
})

const stablehedgeTxData = computed(() => extractStablehedgeTxData(props.transaction))
const isStablehedgeTx = computed(() => Boolean(stablehedgeTxData.value))

function formatDate (date) {
  return ago(new Date(date))
}

const isNewTransaction = computed(() => {
  const timestamp = props.transaction?.tx_timestamp || props.transaction?.date_created
  if (!timestamp) return false
  
  const txDate = new Date(timestamp)
  const now = new Date(currentTime.value)
  const diffMs = now - txDate
  const diffSeconds = Math.floor(diffMs / 1000)
  
  // Check if formatted date shows "Just now" (less than 60 seconds old)
  // Also check the formatted string to match "just now" (case-insensitive)
  const formattedDate = formatDate(timestamp)
  const isJustNow = diffSeconds < 60 || 
                    /just\s+now/i.test(formattedDate) ||
                    formattedDate.toLowerCase().includes('just now')
  
  return isJustNow
})

async function loadMemo() {
  if (!props.transaction?.encrypted_memo) {
    decryptedMemo.value = ''
    return
  }

  try {
    const keypair = await getKeypair().catch(console.error)
    if (!keypair) {
      console.error('Failed to get keypair for memo decryption')
      return
    }

    const decrypted = await decryptMemo(keypair.privkey, props.transaction.encrypted_memo)
    decryptedMemo.value = decrypted
  } catch (error) {
    console.error('Error decrypting memo:', error)
    decryptedMemo.value = ''
  }
}

onMounted(() => {
  loadMemo()
  
  // Update current time every second to keep shine effect reactive
  const updateTimer = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
  
  // Clean up timer on unmount
  onUnmounted(() => {
    clearInterval(updateTimer)
  })
})

// Watch for changes to encrypted_memo and reload
watch(
  () => props.transaction?.encrypted_memo,
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
