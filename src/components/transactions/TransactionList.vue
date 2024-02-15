<template>
  <div class="transaction-list">
    <template v-if="transactionsLoaded">
      <TransactionListItem
        v-for="(transaction, index) in transactions"
        :key="'tx-' + index"
        :transaction="transaction"
        :selected-asset="selectedAsset"
        :denominationTabSelected="denominationTabSelected"
        @click="() => $emit('on-show-transaction-details', transaction)"
      />
      <div ref="bottom-transactions-list"></div>
      <TransactionListItemSkeleton v-if="transactionsAppending"/>
      <div
        v-else-if="transactionsPageHasNext"
        class="pt-label show-more-label"
        :class="getDarkModeClass(darkMode, '', isNotDefaultTheme(theme) ? '' : 'default')"
      >
        <p @click="() => { getTransactions(transactionsPage + 1, { scrollToBottom: true }) }">{{ $t('ShowMore') }}</p>
      </div>
      <div v-if="transactions.length === 0" class="relative text-center q-pt-md">
        <q-img class="vertical-top q-my-md no-transaction-img" src="empty-wallet.svg" />
        <p class="text-bow" :class="getDarkModeClass(darkMode)">{{ $t('NoTransactionsToDisplay') }}</p>
      </div>
    </template>
    <div v-else>
      <TransactionListItemSkeleton v-for="i in 5" :key="i"/>
    </div>
  </div>
</template>

<script>
import TransactionListItem from 'src/components/transactions/TransactionListItem'
import TransactionListItemSkeleton from 'src/components/transactions/TransactionListItemSkeleton'

import { getWalletByNetwork } from 'src/wallet/chipnet'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

const sep20IdRegexp = /sep20\/(.*)/

export default {
  name: 'TransactionList',

  components: {
    TransactionListItem,
    TransactionListItemSkeleton
  },

  props: {
    selectedAssetProps: Object,
    denominationTabSelected: String,
    wallet: Object,
    selectedNetworkProps: String
  },

  emits: [
    'on-show-transaction-details'
  ],

  data () {
    return {
      transactions: [],
      transactionsPage: 0,
      transactionsPageHasNext: false,
      transactionsLoaded: false,
      transactionsAppending: false,
      transactionsFilter: 'all',
      selectedNetwork: 'BCH',
      selectedAsset: {
        id: 'bch',
        symbol: 'BCH',
        name: 'Bitcoin Cash',
        logo: 'bch-logo.png',
        balance: 0
      }
    }
  },

  mounted () {
    this.selectedNetwork = this.selectedNetworkProps
    this.selectedAsset = this.selectedAssetProps
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    earliestBlock () {
      if (!Array.isArray(this.transactions) || !this.transactions.length) return 0
      return Math.min(
        ...this.transactions
          .map(tx => tx && tx.block)
          .filter(Boolean)
          .filter(Number.isSafeInteger)
      )
    }
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    scrollToBottomTransactionList () {
      this.$refs['bottom-transactions-list']?.scrollIntoView({ behavior: 'smooth' })
    },
    getTransactions (page = 1, opts = { scrollToBottom: false }) {
      if (this.selectedNetwork === 'sBCH') {
        const address = this.$store.getters['global/getAddress']('sbch')
        return this.getSbchTransactions(address, opts)
      }
      return this.getBchTransactions(page, opts)
    },
    getSbchTransactions (address, opts = { scrollToBottom: false }) {
      const vm = this
      const asset = vm.selectedAsset
      const id = String(vm.selectedAsset.id)

      const filterOpts = { limit: 10, includeTimestamp: true }
      if (vm.transactionsFilter === 'sent') {
        filterOpts.type = 'outgoing'
      } else if (vm.transactionsFilter === 'received') {
        filterOpts.type = 'incoming'
      }

      let appendResults = false
      if (Number.isSafeInteger(this.earliestBlock) && this.earliestBlock > 0) {
        filterOpts.before = '0x' + (this.earliestBlock - 1).toString(16)
        appendResults = true
      }

      let requestPromise = null
      if (sep20IdRegexp.test(id)) {
        const contractAddress = vm.selectedAsset.id.match(sep20IdRegexp)[1]
        requestPromise = vm.wallet.sBCH._watchtowerApi.getSep20Transactions(
          contractAddress,
          address,
          filterOpts
        )
      } else {
        requestPromise = vm.wallet.sBCH._watchtowerApi.getTransactions(
          address,
          filterOpts
        )
      }

      if (!requestPromise) return
      if (!appendResults) vm.transactionsLoaded = false
      vm.transactionsAppending = true
      requestPromise
        .then(response => {
          vm.transactionsPageHasNext = false
          if (Array.isArray(response.transactions)) {
            vm.transactionsPageHasNext = response.hasNextPage
            if (!appendResults) vm.transactions = []
            vm.transactions.push(...response.transactions
              .map(tx => {
                tx.senders = [tx.from]
                tx.recipients = [tx.to]
                tx.asset = asset
                return tx
              })
            )
            if (opts?.scrollToBottom) setTimeout(() => vm.scrollToBottomTransactionList(), 100)
          }
        })
        .finally(() => {
          vm.transactionsAppending = false
          vm.transactionsLoaded = true
        })
    },
    getBchTransactions (page, opts = { scrollToBottom: false }) {
      const vm = this
      const asset = vm.selectedAsset
      const id = vm.selectedAsset.id
      if (page === 1) vm.transactionsLoaded = false
      let recordType = 'all'
      if (vm.transactionsFilter === 'sent') {
        recordType = 'outgoing'
      } else if (vm.transactionsFilter === 'received') {
        recordType = 'incoming'
      }
      let requestPromise
      if (id.indexOf('slp/') > -1) {
        const tokenId = id.split('/')[1]
        requestPromise = getWalletByNetwork(vm.wallet, 'slp').getTransactions(tokenId, page, recordType)
      } else if (id.indexOf('ct/') > -1) {
        const tokenId = id.split('/')[1]
        requestPromise = getWalletByNetwork(vm.wallet, 'bch').getTransactions(page, recordType, tokenId)
      } else {
        requestPromise = getWalletByNetwork(vm.wallet, 'bch').getTransactions(page, recordType)
      }

      if (!requestPromise) return
      vm.transactionsAppending = true
      requestPromise
        .then(function (response) {
          console.log(response) // TODO remove
          const transactions = response.history || response
          const page = Number(response?.page)
          const hasNext = response?.has_next
          if (!Array.isArray(transactions)) return
          if (page > vm.transactionsPage) vm.transactionsPage = page
          transactions.map(function (item) {
            item.asset = asset
            return vm.transactions.push(item)
          })
          vm.transactionsLoaded = true
          setTimeout(() => {
            vm.transactionsPageHasNext = hasNext
          }, 250)
          if (opts?.scrollToBottom) setTimeout(() => vm.scrollToBottomTransactionList(), 100)
        })
        .catch(error => {
          console.error('error:', error.response)
        })
        .finally(() => {
          vm.transactionsAppending = false
        })
    },
    resetValues (filter = null, network = null, asset = null) {
      if (filter) this.transactionsFilter = filter
      if (network) this.selectedNetwork = network
      if (asset) this.selectedAsset = asset
      this.transactions = []
      this.transactionsPage = 0
      this.transactionsLoaded = false
    }
  }
}
</script>

<style lang="scss" scoped>
  .transaction-list {
    height: 440px;
    overflow: auto;
    padding-bottom: 80px;
  }
  /* iPhone 5/SE */
  @media (min-width: 280px) and (max-width: 320px) {
    .transaction-list {
      height: 430px;
    }
  }
  .show-more-label {
    margin-top: 20px;
    width: 100%;
    text-align: center;
    &.light.default {
      color: #3b7bf6 !important;
    }
  }
  .no-transaction-img {
    width: 75px;
    fill: gray;
  }
</style>
