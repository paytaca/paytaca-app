<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      title="Cauldron Pool"
      class="apps-header"
    >
      <template v-slot:top-right-menu>
        <CauldronHeaderMenu />
      </template>
    </HeaderNav>

    <div class="q-pa-md text-bow" :class="getDarkModeClass(darkMode)">
      <!-- Loading State -->
      <div v-if="fetchingHistory" class="text-center q-pa-lg">
        <q-spinner size="3em" color="primary" />
        <div class="q-mt-md text-grey">{{ $t('LoadingHistory') }}</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center q-pa-lg">
        <q-icon name="error_outline" size="80px" color="negative" />
        <div class="text-h6 q-mt-md q-mb-sm">{{ $t('ErrorLoadingHistory') }}</div>
        <div class="text-caption text-grey q-mb-md">{{ error }}</div>
        <q-btn
          no-caps
          :label="$t('Retry')"
          color="primary"
          rounded
          @click="fetchHistory"
        />
      </div>

      <!-- Content -->
      <div v-else>
        <!-- Time Filter -->
        <div class="row q-mb-md">
          <div class="col-12">
            <q-tabs
              v-model="selectedTimeFilter"
              :class="getDarkModeClass(darkMode)"
              active-color="primary"
              mobile-arrows
              outside-arrows
              inline-label
              @update:model-value="onTimeFilterChange"
            >
              <q-tab
                v-for="(option, index) in timeFilterOptions" :key="index"
                :name="option.value"
                :label="option.label"
              />
            </q-tabs>
          </div>
        </div>

        <!-- Pool Stats Summary -->
        <div v-if="historyData && parsedTransactions.length > 0" class="row justify-between q-px-sm q-col-gutter-md q-mb-md">
          <div>
            <div class="text-caption text-grey q-mb-xs">{{ $t('Transactions') }}</div>
            <div class="text-h6 text-weight-bold">
              {{ filteredTransactions.length }}
            </div>
          </div>
          <div>
            <div class="text-caption text-grey q-mb-xs">{{ $t('APY') }}</div>
            <div class="text-h6 text-weight-bold">
              {{ formatAPY(calculatedAPY) }}
            </div>
            <div class="text-caption text-grey">
              {{ $t('BasedOnSelectedPeriod') }}
            </div>
          </div>
          <div>
            <div class="text-caption text-grey q-mb-xs">{{ $t('CurrentLiquidity') }}</div>
            <div class="text-subtitle1 text-weight-bold">
              {{ formatAmount(currentLiquidity.sats, 8) }} BCH /
              {{ formatTokenAmount(currentLiquidity.token_amount, tokenData) }} {{ tokenData?.bcmr?.token?.symbol || '' }}
            </div>
            
          </div>
        </div>

        <!-- Transactions List -->
        <div v-if="filteredTransactions.length === 0" class="text-center q-pa-lg">
          <q-icon name="history" size="80px" color="grey-5" />
          <div class="text-h6 q-mt-md q-mb-sm">{{ $t('NoTransactionsToDisplay') }}</div>
          <div class="text-caption text-grey">{{ $t('NoTransactionsInSelectedPeriod') }}</div>
        </div>

        <div v-else>
          <q-virtual-scroll
            style="max-height:50vh;"
            :items="filteredTransactions"
            virtual-scroll-item-size="300"
            v-slot="{ item: transaction }"
          >
            <q-card class="br-15 pt-card q-mb-md" :class="getDarkModeClass(darkMode)">
              <q-card-section>
                <div class="row items-center q-mb-sm">
                  <div class="col">
                    <div class="row items-center">
                      <q-badge
                        :color="getTransactionTypeColor(transaction.type)"
                        :label="getTransactionTypeLabel(transaction.type)"
                        class="q-mr-sm"
                      />
                      <div class="text-caption text-grey">
                        {{ formatDate(transaction.timestamp) }}
                      </div>
                    </div>
                  </div>
                  <q-btn
                    flat
                    round
                    dense
                    icon="open_in_new"
                    size="sm"
                    :href="getExplorerLink(transaction.txid)"
                    target="_blank"
                  />
                </div>

                <q-separator class="q-my-md" />

                <div class="row q-col-gutter-md">
                  <div class="col-6 column">
                    <div class="text-caption text-grey q-mb-xs">{{ $t('BCHAmount') }}</div>
                    <div class="text-h6 text-weight-bold">
                      {{ formatAmountChange(transaction.satsChange) }} BCH
                    </div>
                    <q-space/>
                    <div class="text-caption text-grey">
                      {{ $t('Total') }}: {{ formatAmount(transaction.sats, 8) }} BCH
                    </div>
                  </div>
                  <div class="col-6 column">
                    <div class="text-caption text-grey q-mb-xs">{{ $t('TokenAmount') }}</div>
                    <div class="text-h6 text-weight-bold">
                      {{ formatTokenAmountChange(transaction.tokenChange, tokenData) }} {{ tokenData?.bcmr?.token?.symbol || '' }}
                    </div>
                    <q-space/>
                    <div class="text-caption text-grey">
                      {{ $t('Total') }}: {{ formatTokenAmount(transaction.token_amount, tokenData) }} {{ tokenData?.bcmr?.token?.symbol || '' }}
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </q-virtual-scroll>
        </div>
      </div>
    </div>
  </q-pull-to-refresh>
</template>
<script>
import { fetchPoolHistory, parsePoolHistoryTransaction } from "src/wallet/cauldron/wallet-pool";
import { fetchTokensList } from "src/wallet/cauldron/tokens";
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { getExplorerLink } from 'src/utils/send-page-utils';
import { useCauldronValueFormatters } from "src/composables/cauldron/ui-helpers";
import { useStore } from "vuex";
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { ref, computed, defineComponent, onMounted, watch } from "vue";
import HeaderNav from 'src/components/header-nav';
import CauldronHeaderMenu from "src/components/cauldron/CauldronHeaderMenu.vue";


export default defineComponent({
  name: 'cauldron-pool',
  components: {
    HeaderNav,
    CauldronHeaderMenu,
  },
  props: {
    poolId: String,
  },
  setup(props) {
    const { t: $t } = useI18n();
    const $store = useStore();
    const $route = useRoute();
    const darkMode = computed(() => $store.getters['darkmode/getStatus']);

    // Get poolId from prop or route query
    const poolId = computed(() => props.poolId || $route.query.poolId)

    /** @type {import('vue').Ref<import('src/wallet/cauldron/wallet-pool').PoolHistory>} */
    const historyData = ref(null)
    const fetchingHistory = ref(false)
    const error = ref(null)

    /** @type {import('vue').Ref<import('src/wallet/cauldron/tokens').CauldronTokenData>} */
    const tokenData = ref(null)

    const selectedTimeFilter = ref('all')

    const timeFilterOptions = [
      { label: $t('LastHour'), value: '1h' },
      { label: $t('Last24Hours'), value: '24h' },
      { label: $t('Last7Days'), value: '7d' },
      { label: $t('LastMonth'), value: '1m' },
      { label: $t('LastYear'), value: '1y' },
      { label: $t('AllTime'), value: 'all' },
    ]

    // Get timestamp for filter
    function getFilterTimestamp(filter) {
      const now = Date.now()
      switch (filter) {
        case '1h':
          return now - (60 * 60 * 1000)
        case '24h':
          return now - (24 * 60 * 60 * 1000)
        case '7d':
          return now - (7 * 24 * 60 * 60 * 1000)
        case '1m':
          return now - (30 * 24 * 60 * 60 * 1000)
        case '1y':
          return now - (365 * 24 * 60 * 60 * 1000)
        default:
          return null
      }
    }

    async function fetchHistory() {
      if (!poolId.value) {
        error.value = $t('PoolIdRequired')
        return
      }

      try {
        fetchingHistory.value = true
        error.value = null

        // Fetch all history, then filter client-side for better UX
        historyData.value = await fetchPoolHistory(poolId.value)

        // Fetch token data if we have a token_id
        if (historyData.value?.token_id && !tokenData.value) {
          const tokensResponse = await fetchTokensList({
            token_id: [historyData.value.token_id]
          })
          if (tokensResponse && tokensResponse.length > 0) {
            tokenData.value = tokensResponse[0]
          }
        }
      } catch (err) {
        console.error('Error fetching pool history:', err)
        error.value = err.message || $t('ErrorLoadingHistory')
      } finally {
        fetchingHistory.value = false
      }
    }

    // Parse transactions with previous record for comparison
    const parsedTransactions = computed(() => {
      if (!historyData.value?.history || historyData.value.history.length === 0) {
        return []
      }

      const transactions = []
      for (let i = 0; i < historyData.value.history.length; i++) {
        const record = historyData.value.history[i]
        const prevRecord = i > 0 ? historyData.value.history[i - 1] : null
        const parsed = parsePoolHistoryTransaction(record, prevRecord)
        transactions.push(parsed)
      }

      // Sort by timestamp descending (newest first)
      return transactions.sort((a, b) => b.timestamp - a.timestamp)
    })

    // Filter transactions by selected time period
    const filteredTransactions = computed(() => {
      if (selectedTimeFilter.value === 'all') {
        return parsedTransactions.value
      }

      const filterTimestamp = getFilterTimestamp(selectedTimeFilter.value)
      if (!filterTimestamp) return parsedTransactions.value

      const sortedList = parsedTransactions.value.filter(tx => {
        // timestamp is in seconds, filterTimestamp is in milliseconds
        return tx.timestamp * 1000 >= filterTimestamp
      })
      return Object.freeze(sortedList)
    })

    // Current liquidity (from the most recent transaction)
    const currentLiquidity = computed(() => {
      if (!parsedTransactions.value || parsedTransactions.value.length === 0) {
        return { sats: 0, token_amount: 0 }
      }
      const latest = parsedTransactions.value[0]
      return {
        sats: latest.sats,
        token_amount: latest.token_amount
      }
    })

    // Calculate APY based on trading volume and fees
    const calculatedAPY = computed(() => {
      if (!filteredTransactions.value || filteredTransactions.value.length <= 1) {
        return null
      }

      const ignoredK = filteredTransactions.value
        .filter(transaction => ['add-liquidity', 'withdraw-liquidity'].includes(transaction.type))
        .map(transaction => transaction.k - transaction.prevK)
        .reduce((subtotal, K_diff) => subtotal + K_diff, 0n)

      const currentPool = filteredTransactions.value.at(0)
      const initialPool = filteredTransactions.value.at(-1)

      const K_current = currentPool?.k - ignoredK
      const K_initial = initialPool?.k
      
      const K_current_sqrt = Math.sqrt(Number(K_current));
      const K_initial_sqrt = Math.sqrt(Number(K_initial));

      const poolYield = (K_current_sqrt - K_initial_sqrt) * 100 / K_initial_sqrt

      const daysElapsed = (currentPool.timestamp - initialPool.timestamp) / 86_400
      if (!daysElapsed) return 0

      const annualizationFactor = 365.25 / daysElapsed

      const apy = ((((poolYield / 100) + 1) ** annualizationFactor) - 1) * 100
      return apy
    })

    function onTimeFilterChange() {
      // Re-fetch if needed, or just filter client-side
      // Since we're filtering client-side, we don't need to re-fetch
    }

    function getTransactionTypeColor(type) {
      switch (type) {
        case 'initial':
          return 'grey'
        case 'add-liquidity':
          return 'positive'
        case 'withdraw-liquidity':
          return 'negative'
        case 'token-buy':
          return 'primary'
        case 'token-sell':
          return 'orange'
        default:
          return 'grey'
      }
    }

    function getTransactionTypeLabel(type) {
      switch (type) {
        case 'initial':
          return $t('Initial')
        case 'add-liquidity':
          return $t('AddLiquidity')
        case 'withdraw-liquidity':
          return $t('WithdrawLiquidity')
        case 'token-buy':
          return $t('TokenBuy')
        case 'token-sell':
          return $t('TokenSell')
        default:
          return type
      }
    }

    const {
      formatAmount,
      formatTokenAmount,
      formatDate,
      formatAPY,
      formatAmountChange,
      formatTokenAmountChange,
    } = useCauldronValueFormatters();

    async function refreshPage(done = () => {}) {
      try {
        await fetchHistory()
      } finally {
        done()
      }
    }

    // Watch for poolId changes
    watch(poolId, (newPoolId) => {
      if (newPoolId) {
        fetchHistory()
      }
    })

    onMounted(() => {
      if (poolId.value) {
        fetchHistory()
      }
    })

    return {
      darkMode,
      getDarkModeClass,
      historyData,
      tokenData,
      fetchingHistory,
      error,
      selectedTimeFilter,
      timeFilterOptions,
      parsedTransactions,
      filteredTransactions,
      currentLiquidity,
      calculatedAPY,
      onTimeFilterChange,
      formatAmount,
      formatTokenAmount,
      formatAmountChange,
      formatTokenAmountChange,
      getTransactionTypeColor,
      getTransactionTypeLabel,
      formatDate,
      formatAPY,
      getExplorerLink,
      refreshPage,
    }
  }
})
</script>
