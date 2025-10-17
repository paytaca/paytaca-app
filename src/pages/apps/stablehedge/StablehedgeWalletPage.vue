<template>
  <q-pull-to-refresh id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)" @refresh="refreshPage">
    <header-nav :title="$t('Stablehedge')" class="header-nav apps-header" />

    <div ref="fixedSection">
      <q-card id="bch-card" class="q-ma-md" @click="setSelectedAsset(bchAsset)">
        <q-card-section class="row items-center justify-between">
          <template v-if="fetchingBalances">
            <div class="q-space q-pr-md">
              <q-skeleton type="rect" class="text-h5 q-mb-xs"/>
              <q-skeleton type="rect" class="q-mb-xs"/>
            </div>
            <q-skeleton type="circle" height="60px" width="60px"/>
          </template>
          <template v-else>
            <div>
              <div class="text-h5">{{ bchBalanceText }}</div>
              <div v-if="balanceMarketValue">{{ balanceMarketValue }}</div>
            </div>
            <img src="assets/img/stablehedge/stablehedge-bch.svg" style="height: 60px;"/>
          </template>
        </q-card-section>
      </q-card>
  
      <div class="q-mx-md" style="overflow:hidden;">
        <div class="row no-wrap justify-around items-center q-gutter-x-md" style="overflow-x: auto;">
          <div
            v-for="asset in tokenAssets" :key="asset?.id"
            class="method-cards asset-card-border q-px-md q-py-sm row items-start justify-between"
            :class="[{ 'pt-dark-box-shadow': darkMode }]"
            @click="setSelectedAsset(asset)"
          >
            <template v-if="fetchingBalances">
              <q-skeleton type="circle"/>
              <div class="q-space q-pl-md">
                <q-skeleton type="rect" class="asset-symbol q-mb-xs"/> 
                <q-skeleton type="rect" class="asset-balance q-mb-xs"/> 
              </div>
            </template>
            <template v-else>
              <img :src="getImageUrl(asset)" height="30" class="q-mr-xs" alt="">
              <div class="q-gutter-y-sm text-right">
                <div class="asset-symbol">{{ asset?.symbol }}</div>
                <div class="asset-balance">{{ parseAssetDenomination(denomination, { ...asset, excludeSymbol: true }) }}</div>
              </div>
            </template>
          </div>
        </div>
      </div>
  
      <AssetOptions 
        :stablehedgeView="true"
        :loaded="true"
        @deposit="onStablehedgeTransaction"
        @redeem="onStablehedgeTransaction"
        @stats="openStablehedgeMarketsDialog = true"
      />
      <StablehedgeMarketsDialog v-model="openStablehedgeMarketsDialog"/>

      <div class="text-subtitle1 q-mx-lg q-mb-sm">
        {{ selectedAsset?.symbol || 'BCH' }} {{ $t('Transactions') }}
      </div>
      <div class="row q-px-lg q-mb-sm" :class="darkMode ? 'text-light' : 'text-dark'">
        <div class="col br-15 pt-card" :class="getDarkModeClass(darkMode)"
          :style="`background-color: ${darkMode ? '' : '#dce9e9 !important;'}`" >
          <button
              v-for="(transactionFilterOpt, index) in transactionsFilterOpts" :key="index"
              class="btn-custom q-mt-none"
              :class="[
                darkMode ? 'text-light' : 'text-dark', 
                `btn-${transactionFilterOpt.value}`,
                {'active-transaction-btn border': transactionsFilter == transactionFilterOpt?.value },
              ]"
              @click="setTransactionsFilter(transactionFilterOpt.value)"
            >
              {{ transactionFilterOpt?.label }}
            </button>
        </div>		      
      </div>	
    </div>

    <StablehedgeHistory
      :ref="el => txHistoryRef = el"
      auto-fetch
      :selectedAssetId="selectedAsset?.id"
      :transactionsFilter="transactionsFilter"
      @resolved-transaction="onStablehedgeTransaction"
      style="padding-bottom: 5vh;"
    />    
  </q-pull-to-refresh>
</template>
<script>
import { getAssetDenomination, parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { defineComponent, computed, ref, onMounted, onUnmounted, nextTick } from "vue";
import HeaderNav from 'src/components/header-nav.vue';
import StablehedgeHistory from 'src/components/stablehedge/StablehedgeHistory.vue';
import AssetOptions from 'src/components/asset-options.vue'
import StablehedgeMarketsDialog from 'src/components/stablehedge/dashboard/StablehedgeMarketsDialog.vue';
import stablehedgePriceTracker from 'src/wallet/stablehedge/price-tracker';

export default defineComponent({
  name: 'StablehedgeWalletPage',
  components: {
    HeaderNav,
    AssetOptions,
    StablehedgeMarketsDialog,
    StablehedgeHistory,
  },
  setup() {
    const { t: $t } = useI18n();
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const isChipnet = computed(() => $store.getters['global/isChipnet'])

    const denomination = computed(() => $store.getters['global/denomination'] || 'BCH')
    const tokenAssets = computed(() => [
      ...$store.getters['stablehedge/tokenBalancesAsAssets'],
    ])
    const bchBalance = computed(() => {
      return $store.getters['stablehedge/totalTokenBalancesInSats'] / 10 ** 8;
    })
    const bchBalanceText = computed(() => {
      return getAssetDenomination(denomination.value, bchBalance.value)
    })

    const selectedMarketCurrency = computed(() => {
      const currency = $store.getters['market/selectedCurrency'];
      return currency?.symbol;
    })
    const balanceMarketValue = computed(() => {
      const assetPrice = $store.getters['market/getAssetPrice']('bch', selectedMarketCurrency.value)
      if (!assetPrice) return ''

      const computedBalance = bchBalance.value * Number(assetPrice)
      return parseFiatCurrency(computedBalance.toFixed(2), selectedMarketCurrency.value)
    })

    const fetchingBalances = ref(false);
    async function fetchBalance() {
      try {
        fetchingBalances.value = true
        return await $store.dispatch('stablehedge/updateTokenBalances');
      } finally {
        fetchingBalances.value = false
      }
    }

    const openStablehedgeMarketsDialog = ref(false);

    const bchAsset = computed(() => $store.getters['assets/getAssets'][0]);
    const selectedAsset = ref(bchAsset.value);
    function setSelectedAsset(asset) {
      selectedAsset.value = asset || bchAsset.value
      refetchTransactionHistory();
    }


    /** @type {import("vue").Ref<'all' | 'freeze' | 'unfreeze' >} */
    const transactionsFilter = ref('all');
    const transactionsFilterOpts = [
      { label: $t('All'), value: 'all' },
      { label: $t('Freeze'), value: 'freeze' },
      { label: $t('Unfreeze'), value: 'unfreeze' },
    ]
    function setTransactionsFilter(value) {
      const transactionsFilters = transactionsFilterOpts.map(opt => opt?.value);
      if (transactionsFilters.indexOf(value) >= 0) transactionsFilter.value = value;
      else transactionsFilter.value = 'all';
      refetchTransactionHistory();
    }

    const txHistoryRef = ref();
    function refetchTransactionHistory() {
      nextTick(() => {
        txHistoryRef.value?.resetValues?.()
        txHistoryRef.value?.getTransactions?.()
      })
    }

    /**
     * @typedef {Object} RedemptionTransactionResult
     * @property {Number} id
     * @property {String} redemptionContractAddress
     * @property {String} txType
     * @property {String} category
     * @property {Number} satoshis
     * @property {Number} bch
     * @property {Number} amount
     * @property {String} status
     * @property {String} txid
     * @property {String} resultMessage
     * 
     * @param {RedemptionTransactionResult[]} data
     */
    function onStablehedgeTransaction(data) {
      fetchBalance();
      refetchTransactionHistory();
    }

    function getImageUrl (asset) {
      if (asset?.logo) {
        if (asset.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
          return asset.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
        } else {
          return asset.logo
        }
      }
    }

    onMounted(() => $store.dispatch('stablehedge/updateTokenData'));
    onMounted(() => stablehedgePriceTracker.subscribe('stablehedge-wallet-page'))
    onUnmounted(() => stablehedgePriceTracker.unsubscribe('stablehedge-wallet-page'))

    async function refreshPage(done = () => {}) {
      try {
        await Promise.all([
          fetchBalance(),
          refetchTransactionHistory(),
        ])
      } finally {
        done()
      }
    }

    return {
      darkMode,
      isChipnet,

      denomination,

      tokenAssets,
      bchBalanceText,
      selectedMarketCurrency,
      balanceMarketValue,

      fetchingBalances,
      openStablehedgeMarketsDialog,

      bchAsset,
      selectedAsset,
      setSelectedAsset,

      txHistoryRef,
      transactionsFilter,
      transactionsFilterOpts,
      setTransactionsFilter,
      refetchTransactionHistory,
      onStablehedgeTransaction,

      getImageUrl,

      refreshPage,

      parseAssetDenomination,
      getDarkModeClass,
    }
  },
})
</script>
<style lang="scss" scoped>
#bch-card {
  border-radius: 15px;
}

.pt-dark-box-shadow {
  box-shadow: 2px 2px 2px 2px #212f3d !important;
}

.method-cards {
  .asset-symbol {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #EAEEFF;
    font-size: 19px;
  }
  .asset-balance {
    overflow: hidden;
    text-overflow: ellipsis;
    color: #EAEEFF;
    font-size: 18px;
  }
}

.btn-custom {
  height: 40px;
  width: calc(100% / 3);
  border-radius: 20px;
  border: none;
  background-color: transparent;
  outline:0;
  cursor: pointer;
  transition: .2s;
  font-weight: 500;
}
</style>