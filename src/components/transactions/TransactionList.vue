<template>
  <div class="transaction-list" :style="{height: transactionsListHeight}">
    <template v-if="transactionsLoaded">
      <template v-if="!transactionsAppending">
        <TransactionListItem
          v-for="(transaction, index) in transactions"
          :key="'tx-' + index"
          :transaction="transaction"
          :selected-asset="selectedAsset"
          :denominationTabSelected="denominationTabSelected"
          @click="() => $emit('on-show-transaction-details', transaction)"
        />
      </template>
      <template v-else>
        <div ref="bottom-transactions-list"></div>
        <TransactionListItemSkeleton v-for="i in 5" :key="i"/>
      </template>
      <div v-if="transactions.length > 0 && transactionsMaxPage > 1" class="q-mt-md">
        <q-pagination
          class="justify-center"
          padding="xs"
          :modelValue="transactionsPage"
          :max="transactionsMaxPage"
          :max-pages="6"
          :dark="darkMode"
          :class="getDarkModeClass(darkMode)"
          :hide-below-pages="2"
          @update:modelValue="(val) => getTransactions(val)"
        />
      </div>
      <div v-else-if="transactions.length === 0" class="relative text-center q-pt-md">
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
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const sep20IdRegexp = /sep20\/(.*)/
const recordTypeMap = {
  all: 'all',
  sent: 'outgoing',
  received: 'incoming'
}

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
      transactionsMaxPage: 0,
      selectedNetwork: 'BCH',
      selectedAsset: {
        id: 'bch',
        symbol: 'BCH',
        name: 'Bitcoin Cash',
        logo: 'bch-logo.png',
        balance: 0
      },
      transactionsListHeight: '100px'
    }
  },

  mounted () {
    this.selectedNetwork = this.selectedNetworkProps
    this.selectedAsset = this.selectedAssetProps
    this.computeTransactionsListHeight()
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    earliestBlock () {
      if (!Array.isArray(this.transactions) || !this.transactions.length) return 0
      return Math.min(
        ...this.transactions
          .map(tx => tx?.block)
          .filter(Boolean)
          .filter(Number.isSafeInteger)
      )
    },
    showTokens () {
      return this.$store.getters['global/showTokens']
    }
  },

  watch: {
    showTokens () {
      this.computeTransactionsListHeight()
    }
  },

  methods: {
    getDarkModeClass,
    computeTransactionsListHeight () {
      const vm = this

      const screenHeight = vm.$q.screen.height
      const fixedSectionHeight = 0//vm.$parent.$refs.transactionSection.clientHeight
      const footerMenuHeight = 0//vm.$parent.$refs.footerMenu.$el.clientHeight
      vm.transactionsListHeight = `${screenHeight - (fixedSectionHeight + footerMenuHeight)}px`
    },
    scrollToBottomTransactionList () {
      this.$refs['bottom-transactions-list']?.scrollIntoView({ behavior: 'smooth' })
    },
    getTransactions (page = 1, opts = { scrollToBottom: false, txSearchReference: null }) {
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

      const filterOpts = {
        limit: 10,
        includeTimestamp: true,
        type: recordTypeMap[vm.transactionsFilter]
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
      const recordType = recordTypeMap[vm.transactionsFilter]
      const txSearchReference = opts.txSearchReference

      let requestPromise
      if (id.indexOf('slp/') > -1) {
        const tokenId = id.split('/')[1]
        requestPromise = getWalletByNetwork(vm.wallet, 'slp').getTransactions({tokenId, page, recordType})
      } else if (id.indexOf('ct/') > -1) {
        const tokenId = id.split('/')[1]
        requestPromise = getWalletByNetwork(vm.wallet, 'bch').getTransactions({page, recordType, tokenId, txSearchReference})
      } else {
        requestPromise = getWalletByNetwork(vm.wallet, 'bch').getTransactions({page, recordType, txSearchReference})
      }

      if (!requestPromise) return
      vm.transactionsAppending = true
      requestPromise
        .then(function (response) {
          const transactions = response.history || response
          const page = Number(response?.page)
          const hasNext = response?.has_next

          if (!Array.isArray(transactions)) return

          vm.transactions = []
          transactions.map(function (item) {
            item.asset = asset
            return vm.transactions.push(item)
          })

          vm.transactionsPage = page
          vm.transactionsMaxPage = response?.num_pages
          vm.transactionsLoaded = true

          setTimeout(() => {
            vm.transactionsPageHasNext = hasNext
          }, 250)
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
      this.pagination = {
        count: 0,
        limit: 0,
        offset: 0
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  .transaction-list {
    overflow: auto;
    padding-bottom: 20vh;
  }
  @media (min-height: 600px) and (max-height: 700px) {
    .transaction-list {
      padding-bottom: 23vh;
    }
  }
  @media (min-height: 900px) and (max-height: 1100px) {
    .transaction-list {
      padding-bottom: 17vh;
    }
  }
  .no-transaction-img {
    width: 75px;
    fill: gray;
  }
</style>
