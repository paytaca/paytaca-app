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
      <div
        v-for="record in history" :key="record?.id"
        class="row items-center history-record"
        v-ripple
        @click="() => showRecordDetail(record)"
      >
        <div class="q-space">
          <div class="text-subtitle1">
            <span class="text-uppercase transactions-wallet type" :class="getDarkModeClass(darkMode)">
              {{ record?.txTypeText }}
            </span>
            <q-badge
              v-if="record?.status && record?.status != 'success'"
              class="q-ml-xs"
              :color="record?.status === 'failed' ? 'red' : 'grey'"
            >
              <template v-if="record?.status === 'pending'">{{ $t('Pending') }}</template>
              <template v-else-if="record?.status === 'failed'">{{ $t('Failed') }}</template>
              <template v-else>{{ record?.status }}</template>
            </q-badge>
          </div>
          <div class="transactions-wallet date" :class="getDarkModeClass(darkMode)">
            {{ formatDate(record?.timestamp) }}
          </div>
        </div>
        <div class="text-right">
          <div class="transactions-wallet amount" :class="getDarkModeClass(darkMode)">
            {{ formatBCH(record?.bch) }}
          </div>
          <div class="transactions-wallet market-value" :class="getDarkModeClass(darkMode)">
            {{ formatTokenUnits(record?.amount, record?.category) }}
          </div>
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
    <StablehedgeHistoryDetailDialog
      v-model="detailDialog.show"
      :record="detailDialog.record"
      :selectedDenomination="selectedDenomination"
    />
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { getAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils';
import { parseStablehedgeHistory } from 'src/wallet/stablehedge/history-utils';
import { getStablehedgeBackend } from 'src/wallet/stablehedge/api';
import { StablehedgeRPC } from 'src/wallet/stablehedge/rpc';
import ago from 's-ago'
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { ref, computed, defineComponent, onMounted, watch, getCurrentInstance, onUnmounted } from 'vue';
import TransactionListItemSkeleton from 'src/components/transactions/TransactionListItemSkeleton.vue'
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue';
import StablehedgeHistoryDetailDialog from './StablehedgeHistoryDetailDialog.vue'


export default defineComponent({
  name: 'StablehedgeHistory',
  components: {
    TransactionListItemSkeleton,
    LimitOffsetPagination,
    StablehedgeHistoryDetailDialog,
  },
  emits: [
    'resolved-transaction',
  ],
  props: {
    autoFetch: Boolean,
    selectedAssetId: String,
    transactionsFilter: String,
    selectedDenomination: String,
  },
  setup(props, { emit: $emit }) {
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

    const filterOpts = computed(() => {
      const walletData = $store.getters['global/getWallet']?.('bch')
      let transactionTypes = []
      if (props.transactionsFilter === 'freeze') transactionTypes = ['inject', 'deposit']
      if (props.transactionsFilter === 'unfreeze') transactionTypes = ['redeem']

      let category = ''
      if (typeof props.selectedAssetId == 'string') {
        const assetIdComponents = props.selectedAssetId?.split('/')
        const assetIdPrefix = assetIdComponents?.[0]
        const assetTokenId = assetIdComponents?.[1]
        if (assetIdPrefix === 'ct') {
          category = assetTokenId
        }
      }

      return {
        wallet_hashes: walletData?.walletHash || '',
        transaction_types: transactionTypes.join(',') || undefined,
        categories: category || undefined,
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

    const detailDialog = ref({ show: false, record: parseStablehedgeHistory() })
    function showRecordDetail(record=parseStablehedgeHistory()) {
      detailDialog.value = { show: true, record: record }
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
      const fixedSectionTop = (fixedSection?.offsetTop || 0);
      const fixedSectionHeight = fixedSection?.clientHeight || 0
      const footerMenuHeight = footerMenu?.clientHeight || 0
      transactionsListHeight.value = `${screenHeight - (fixedSectionTop + fixedSectionHeight + footerMenuHeight)}px`
    }
    /** stuff relating to parent component(main page) -- end */

    const denomination = computed(() => {
      return props.selectedDenomination || $store.getters['global/denomination']
    })
    function formatBCH(balance) {
      const currentDenomination = denomination.value || 'BCH'
      const parsedBCHBalance = getAssetDenomination(currentDenomination, balance)

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

    let subscribedHistoryIds = []
    const redemptionTxResultEventName = 'redemption_contract_tx_result'
    /** @type {StablehedgeRPC} */
    let stablehedgeRpc
    onUnmounted(() => stablehedgeRpc?.disconnect?.())
    onMounted(() => setupRpc())
    watch(isChipnet, () => setupRpc())
    function setupRpc() {
      if (stablehedgeRpc?.isConnected?.()) stablehedgeRpc.disconnect()

      stablehedgeRpc = new StablehedgeRPC({ isChipnet: isChipnet.value })      
      stablehedgeRpc.client.onClose(() => subscribedHistoryIds = [])
      stablehedgeRpc.client.onOpen(subscribePendingHistoriesToListener)
      stablehedgeRpc.client.onNotification = [onNotificationHandler]
      window.rpc = stablehedgeRpc

      checkAndRunPendingHistoryListener()
    }

    const pendingHistoryIds = computed(() => {
      return history.value
        .filter(record => record?.status === 'pending')
        .map(record => record?.id)
    })

    watch(pendingHistoryIds, () => checkAndRunPendingHistoryListener())
    function checkAndRunPendingHistoryListener() {
      if (!pendingHistoryIds.value.length) return

      if (!stablehedgeRpc.isConnected()) stablehedgeRpc.connect()
      else subscribePendingHistoriesToListener()
    }


    function subscribePendingHistoriesToListener() {
      if (!pendingHistoryIds.value.length) return
      pendingHistoryIds.value.forEach(id => {
        if (subscribedHistoryIds?.includes?.(id)) return
        const eventParams = { id: parseInt(id) }
        stablehedgeRpc.client.call('subscribe', [redemptionTxResultEventName, eventParams])
        subscribedHistoryIds.push(id)
      })
    }

    /**
     * @param {{ event: String, data: any }} notification 
     */
    function onNotificationHandler(notification) {
      const eventName = notification?.event
      const data = notification?.data
      if (eventName !== redemptionTxResultEventName) return

      const historyId = parseInt(data?.id)
      const recordIsInList = history.value.find(record => record?.id === historyId)
      if (!recordIsInList) return
      backend.get(`stablehedge/redemption-contract-transactions/${historyId}/history_detail/`)
        .then(response => {
          const parsedRecord = parseStablehedgeHistory(response?.data)
          $emit('resolved-transaction', [parsedRecord])
          const index = history.value.findIndex(record => {
            return record?.id === parsedRecord?.id
          })
          if (index >= 0) history.value[index] = parsedRecord
        })
    }

    return {
      darkMode, getDarkModeClass,

      historyLoaded,
      fetchingHistory,
      historyPagination,
      history,
      fetchHistory,
      detailDialog,
      showRecordDetail,

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
  position: relative;

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
