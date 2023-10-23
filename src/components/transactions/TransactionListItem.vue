<template>
  <div class="col q-mt-md q-mr-lg q-ml-lg q-pt-none q-pb-sm" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
    <div class="row">
      <div class="col col-transaction">
        <div>
          <p
            class="q-mb-none transactions-wallet type ib-text text-uppercase"
            style="font-size: 15px;"
            :class="getDarkModeClass(darkMode)"
          >
            {{ recordTypeText }}
          </p>
          <p
            class="q-mb-none transactions-wallet amount float-right ib-text text-right"
            :class="[getDarkModeClass(darkMode), {'q-mt-sm': !marketValueData?.marketValue }]"
          >
            <div>
              {{
                parseAssetDenomination(denomination, {
                  ...asset,
                  balance: transaction?.amount
                })
              }}
            </div>
            <div
              v-if="marketValueData?.marketValue"
              class="transactions-wallet market-value"
              :class="getDarkModeClass(darkMode, 'text-weight-light', '')"
              style="margin-top:-0.25em;"
            >
              {{ parseFiatCurrency(marketValueData?.marketValue, selectedMarketCurrency) }}
            </div>
          </p>
        </div>
        <div class="col">
            <span class="float-left transactions-wallet date" :class="getDarkModeClass(darkMode)">
              <template v-if="transaction.tx_timestamp">{{ formatDate(transaction.tx_timestamp) }}</template>
              <template v-else>{{ formatDate(transaction.date_created) }}</template>
            </span>
            <!-- <span class="float-right subtext"><b>12 January 2021</b></span> -->
        </div>
      </div>
    </div>
    <div class="row items-center q-gutter-xs">
      <q-badge
        v-for="(badge,index) in badges" :key="index"
        class="q-py-xs q-px-sm"
        rounded
        @click.stop
      >
        <q-icon v-if="badge?.icon" :name="badge?.icon" class="q-mr-xs"/>
        <span style="max-width:5em" class="ellipsis">
          {{ badge?.text }}
        </span>
        <q-popup-proxy :breakpoint="0">
          <div
            :class="['q-px-sm q-py-xs', darkMode ? 'pt-dark-label pt-dark' : 'text-black']"
            class="text-caption"
          >
            {{ badge?.text }}
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
import { parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const $store = useStore()
const $t = useI18n().t
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const denomination = computed(() => $store.getters['global/denomination'])

const props = defineProps({
  transaction: Object,
  selectedAsset: Object,
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
  }
  return data
})

const badges = computed(() => {
  if (!Array.isArray(props.transaction?.attributes)) return []
  const badges = []
  const icons = {
    anyhedge: 'img:anyhedge-logo.png',
    voucher_claim: 'mdi-ticket-confirmation',
  }
  const pushBadge = (icon, text, value) => {
    badges.push({
      icon,
      text,
      data: {
        address: value
      }
    })
  }

  props.transaction?.attributes.forEach(attribute => {
    const key = attribute?.key.includes('anyhedge') ? 'anyhedge' : attribute?.key
    const value = attribute?.value
    const icon = icons[key]
    
    switch(key) {
      case('anyhedge_funding_tx'):
        pushBadge(icon, 'AnyHedge funding transaction', value)
        break
      case('anyhedge_hedge_funding_utxo'):
      case('anyhedge_long_funding_utxo'):
        pushBadge(icon, 'AnyHedge funding UTXO', value)
        break
      case('anyhedge_settlement_tx'):
        pushBadge(icon, 'AnyHedge settlement transaction', value)
        break
      case('voucher_claim'):
        pushBadge(icon, value, value)
        break
    }
  })
  return badges
})

function formatDate (date) {
  return ago(new Date(date))
}
</script>
<style scoped>
.col-transaction {
  padding-top: 2px;
  font-weight: 500;
}
.ib-text {
  display: inline-block;
}
</style>
