<template>
  <div class="stablehedge-history-list" :style="{height: transactionsListHeight}">
    <template v-if="fetchingHistory">
      <TransactionListItemSkeleton v-for="i in 4" :key="i"/>
    </template>
    <div v-else-if="history.length === 0 && historyLoaded" class="relative text-center q-pt-md">
      <q-img class="vertical-top q-my-md no-transaction-img" src="empty-wallet.svg" />
      <p class="text-bow" :class="getDarkModeClass(darkMode)">{{ $t('NoTransactionsToDisplay') }}</p>
    </div>
    <template v-else>
      <div v-for="record in history" :key="record?.id" class="row items-center history-record">
        <div class="q-space">
          <div class="text-subtitle1">
            <span class="text-uppercase">{{ record?.txType }}</span>
            <q-badge v-if="record?.status && record?.status != 'success'" class="q-ml-xs">
              {{ record?.status }}
            </q-badge>
          </div>
          <div>{{ formatDate(record?.timestamp) }}</div>
        </div>
        <div class="text-right">
          <div>{{ formatBCH(record?.bch) }}</div>
          <div>{{ formatTokenUnits(record?.amount, record?.category) }}</div>
        </div>
      </div>
    </template>
    <LimitOffsetPagination
      :pagination-props="{
        maxPages: 6,
        padding: 'xs',
        dark: darkMode,
        class: ['justify-center', getDarkModeClass(darkMode)],
        disable: fetchingHistory,
      }"
      class="q-my-sm stablehedge-history-pagination"
      :hide-below-pages="2"
      :modelValue="historyPagination"
      @update:modelValue="fetchHistory"
    />
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils';
import { getStablehedgeBackend } from 'src/wallet/stablehedge/api';
import ago from 's-ago'
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { ref, computed, defineComponent, onMounted, watch, getCurrentInstance } from 'vue';
import TransactionListItemSkeleton from 'src/components/transactions/TransactionListItemSkeleton.vue'
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue';


export default defineComponent({
  name: 'StablehedgeHistory',
  components: {
    TransactionListItemSkeleton,
    LimitOffsetPagination,
  },
  props: {
    autoFetch: Boolean,
    transactionsFilter: String,
    denominationTabSelected: String,
  },
  setup(props) {
    const vm = getCurrentInstance();
    const { t: $t } = useI18n();
    const $q = useQuasar();
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const isChipnet = computed(() => {
      return $store.getters['global/isChipnet']
    })
    let backend = getStablehedgeBackend(isChipnet.value)
    watch(isChipnet, () => backend = getStablehedgeBackend(isChipnet.value))

    const walletData = computed(() => $store.getters['global/getWallet']?.('bch'))

    const historyLoaded = ref(false)
    onMounted(() => {
      if (!props.autoFetch) return
      fetchHistory()
    })
    const fetchingHistory = ref(false)
    const historyPagination = ref({ offset: 0, limit: 10, count: 0})
    const history = ref([].map(parseStablehedgeHistory))

    /**
     * @param {Object} data 
     * @param {Number} data.id
     * @param {String} data.redemption_contract_address
     * @param {'pending' | 'success' | 'failed'} data.status
     * @param {'inject' | 'deposit' | 'redeem'} data.transaction_type
     * @param {String} data.category
     * @param {Number} data.satoshis
     * @param {Number} data.amount
     * @param {String} data.txid
     * @param {String} data.result_message
     * @param {String} data.resolved_at
     * @param {String} data.created_at
     */
    function parseStablehedgeHistory(data) {
      const timestamp = new Date(data?.resolved_at || data?.created_at) * 1
      const txType = data?.transaction_type
      const bch = data?.satoshis / 10 ** 8

      return {
        id: data?.id,
        redemptionContractAddress: data?.redemption_contract_address,
        status: data?.status,
        txType: txType,
        category: data?.category,
        bch: bch,
        amount: data?.amount,
        txid: data?.txid,
        resultMessage: data?.result_message,
        timestamp: timestamp,
      }
    }

    const filterOpts = computed(() => {
      const walletData = $store.getters['global/getWallet']?.('bch')
      let transactionTypes = []
      if (props.transactionsFilter === 'freeze') transactionTypes = ['inject', 'deposit']
      if (props.transactionsFilter === 'unfreeze') transactionTypes = ['redeem']

      return {
        wallet_hashes: walletData?.walletHash || '',
        transaction_types: transactionTypes.join(',') || undefined,
        statuses: 'pending,success',
        ordering: 'status,-created_at',
      }
    })

    function fetchHistory(opts={ limit: 10, offset: 0 }) {
      const params = {
        wallet_hash: walletData.value?.walletHash || '',
        ...filterOpts.value,
        limit: opts?.limit,
        offset: opts?.offset || undefined,
      }
      fetchingHistory.value = true
      return backend.get('stablehedge/redemption-contract-transactions/history/', { params })
        .then(response => {
          const results = response?.data?.results
          if (!Array.isArray(results)) return Promise.reject({ response })

          history.value = results.map(parseStablehedgeHistory)
          fetchMissingTokenData()
          historyPagination.value.offset = response.data?.offset
          historyPagination.value.limit = response.data?.limit
          historyPagination.value.count = response.data?.count
          return response
        })
        .finally(() => {
          fetchingHistory.value = false
          historyLoaded.value = true
        })
    }

    function fetchMissingTokenData() {
      const categories = history.value
        .map(token => token?.category)
        .filter(Boolean)
        .filter((element, index, list) => list.indexOf(element) === index)
        .filter(category => {
          const token = $store.getters['stablehedge/token']?.(category)
          if (!token) return true
          if (!Number.isSafeInteger(token?.decimals)) return true
          if (!token?.currency) return true
          return false
        })


      if (categories?.length === 0) return Promise.resolve()
      return $store.dispatch('stablehedge/updateTokenData', { categories })
    }

    /** start -- stuff called by parent component(main page) */
    function getTransactions() {
      return fetchHistory()
    }
    function resetValues() {
      historyLoaded.value = false
      historyPagination.value = {
        offset: 0, limit: 0, count: 0,
      }
      history.value = []
    }
    const showTokens = computed(() => $store.getters['global/showTokens'])
    watch(showTokens, () => computeTransactionsListHeight())
    onMounted(() => computeTransactionsListHeight())
    const transactionsListHeight = ref(undefined);
    function computeTransactionsListHeight () {
      const fixedSection = vm.parent?.parent?.refs?.fixedSection
      const footerMenu = vm.parent?.parent?.refs?.footerMenu?.$el
      if (!fixedSection || !footerMenu) {
        transactionsListHeight.value = undefined
      }
      const screenHeight = $q.screen.height
      const fixedSectionHeight = fixedSection?.clientHeight || 0
      const footerMenuHeight = footerMenu?.clientHeight || 0
      transactionsListHeight.value = `${screenHeight - (fixedSectionHeight + footerMenuHeight)}px`
    }
    /** stuff relating to parent component(main page) -- end */

    function formatBCH(balance) {
      const currentDenomination = props.denominationTabSelected || 'BCH'
      const parsedBCHBalance = parseAssetDenomination(currentDenomination, {
        id: '',
        balance,
        symbol: 'BCH',
        decimals: 0
      }, false, 10)

      if (currentDenomination === $t('DEEM')) {
        const commaBalance = parseFloat(parsedBCHBalance).toLocaleString('en-us', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })
        return `${commaBalance} ${currentDenomination}`
      }

      return parsedBCHBalance
    }

    function formatDate (date) {
      return ago(new Date(date))
    }

    function formatTokenUnits(amount, category) {
      const token = $store.getters['stablehedge/token'](category)
      const decimals = parseInt(token?.decimals) || 0
      const currency = token?.currency || 'UNIT'

      const tokens = amount / 10 ** decimals
      return `${tokens} ${currency}`
    }

    return {
      darkMode, getDarkModeClass,

      historyLoaded,
      fetchingHistory,
      historyPagination,
      history,
      fetchHistory,

      getTransactions,
      resetValues,
      transactionsListHeight,
      computeTransactionsListHeight,

      formatBCH,
      formatDate,
      formatTokenUnits,
      parseFiatCurrency,
    }
  },
})
</script>
<style scoped lang="scss">
.history-record {
  // padding: map-get($space-sm, 'y') map-get($space-sm, 'x');
  margin: map-get($space-sm, 'y') map-get($space-lg, 'x');
  padding-bottom: map-get($space-xs, 'y');
  border-bottom: 1px solid grey;
}
body.body--dark .history-record {
  border-bottom: 1px solid #DAE0E7;
}
</style>
<style scoped lang="scss">
.stablehedge-history-list {
  position: relative;

  overflow: auto;
  padding-bottom: 20vh;
}
.stablehedge-history-pagination.sticky {
  position: sticky;
  bottom: 0;
}

@media (min-height: 600px) and (max-height: 700px) {
  .stablehedge-history-list {
    padding-bottom: 23vh;
  }
}
@media (min-height: 900px) and (max-height: 1100px) {
  .stablehedge-history-list {
    padding-bottom: 17vh;
  }
}
.no-transaction-img {
  width: 75px;
  fill: gray;
}
</style>
