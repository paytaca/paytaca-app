<template>
  <div class="col q-mt-md q-mr-lg q-ml-lg q-pt-none q-pb-sm" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
    <div class="row">
      <div class="col col-transaction">
        <div>
          <p
            :class="{'pt-dark-label': darkMode}"
            class="q-mb-none transactions-wallet ib-text text-uppercase"
            style="font-size: 15px;"
          >
            {{ recordTypeText }}
          </p>
          <p
            :class="{'text-grey': darkMode, 'q-mt-sm': !marketValueData?.marketValue }"
            class="q-mb-none transactions-wallet float-right ib-text text-right"
          >
            <div>{{ +(transaction.amount) }} {{ asset?.symbol }}</div>
            <div 
              v-if="marketValueData?.marketValue"
              class="text-caption text-grey"
              :class="[darkMode ? 'text-weight-light' : '']"
              style="margin-top:-0.25em;"
            >
              {{ marketValueData?.marketValue }} {{ selectedMarketCurrency }}
            </div>
          </p>
        </div>
        <div class="col">
            <span class="float-left subtext" :class="{'pt-dark-label': darkMode}" style="font-size: 12px;">
              <template v-if="transaction.tx_timestamp">{{ formatDate(transaction.tx_timestamp) }}</template>
              <template v-else>{{ formatDate(transaction.date_created) }}</template>
            </span>
            <!-- <span class="float-right subtext"><b>12 January 2021</b></span> -->
        </div>
      </div>
    </div>
    <div class="q-gutter-xs">
      <q-badge v-for="(badge,index) in badges" :key="index" class="q-py-xs q-px-sm" @click.stop>
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

const $store = useStore()
const $t = useI18n().t
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

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

  props.transaction?.attributes.forEach(attribute => {
    switch(attribute?.key) {
      case('anyhedge_funding_tx'):
        badges.push({
          text: 'Anyhedge funding transaction',
          data: { address: attribute?.value },
        })
        break
      case('anyhedge_hedge_funding_utxo'):
      case('anyhedge_long_funding_utxo'):
        badges.push({
          text: 'Anyhedge funding UTXO',
          data: { address: attribute?.value },
        })
        break
      case('anyhedge_settlement_tx'):
        badges.push({
          text: 'Anyhedge settlement transaction',
          data: { address: attribute?.value },
        })
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
.transactions-wallet {
  color: #4C4F4F;
}
.ib-text {
  display: inline-block;
}

.subtext {
  font-size: 11px;
  color: #4C4F4F;
  opacity: .5;
}
</style>