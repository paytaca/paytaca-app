<template>
  <div 
    class="transaction-item" 
    :class="[
      'q-mx-lg q-py-md q-px-sm',
      getDarkModeClass(darkMode)
    ]"
  >
    <div class="transaction-content">
      <div class="transaction-header">
        <div class="transaction-type">
          <span class="type-text text-uppercase" :class="getDarkModeClass(darkMode)">
            {{ recordTypeText }}
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
              v-if="marketValueData?.marketValue"
              class="amount-secondary"
              :class="getDarkModeClass(darkMode)"
            >
              {{ parseFiatCurrency(marketValueData?.marketValue, selectedMarketCurrency) }}
            </div>
          </template>
        </div>
      </div>
      <div class="transaction-footer">
        <span class="transaction-date" :class="getDarkModeClass(darkMode)">
          <template v-if="transaction.tx_timestamp">{{ formatDate(transaction.tx_timestamp) }}</template>
          <template v-else>{{ formatDate(transaction.date_created) }}</template>
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
import { computed } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { extractStablehedgeTxData } from 'src/wallet/stablehedge/history-utils'
import { parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseAttributeToBadge } from 'src/utils/tx-attributes'

const $store = useStore()
const $t = useI18n().t
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const denomination = computed(() => $store.getters['global/denomination'])

const props = defineProps({
  transaction: Object,
  selectedAsset: Object,
  denominationTabSelected: String
})

const asset = computed(() => {
  return props?.transaction?.asset || props?.selectedAsset
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
    if (asset?.value?.id !== 'bch') {
      const decimals = parseInt(asset?.value?.decimals) || 0; 
      data.marketValue /= 10 ** decimals; 
    }
  }
  return data
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
</script>
<style lang="scss" scoped>
.transaction-item {
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  position: relative;
  
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

.transaction-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.transaction-type {
  flex: 1;
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
}

.transaction-date {
  font-size: 13px;
  opacity: 0.6;
  
  &.dark {
    color: #a6acaf;
  }
  
  &.light {
    color: rgba(0, 0, 0, 0.6);
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
</style>
