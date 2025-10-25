<template>
  <div 
    ref="transactionList"
    class="transaction-list"
    @scroll="onScroll"
  >
    <template v-if="transactionsLoaded">
      <div class="transactions-content">
        <TransactionListItem
          v-for="(transaction, index) in transactions"
          :key="'tx-' + index"
          :transaction="transaction"
          :selected-asset="selectedAsset"
          :denominationTabSelected="denominationTabSelected"
          @click="() => $emit('on-show-transaction-details', transaction)"
        />
      </div>
      
      <!-- Loading indicator for infinite scroll -->
      <div v-if="transactionsAppending && transactions.length > 0" class="loading-more">
        <q-spinner color="primary" size="32px" />
        <p class="loading-text" :class="getDarkModeClass(darkMode)">{{ $t('LoadingMore', {}, 'Loading more') }}...</p>
      </div>
      
      <!-- End of list indicator -->
      <div v-else-if="transactions.length > 0 && !hasMoreTransactions" class="end-of-list">
        <q-icon name="check_circle" size="24px" :class="getDarkModeClass(darkMode)" />
        <p class="end-text" :class="getDarkModeClass(darkMode)">{{ $t('AllTransactionsLoaded', {}, 'All transactions loaded') }}</p>
      </div>
      
      <!-- Empty state -->
      <div v-else-if="transactions.length === 0" class="empty-state">
        <q-img class="no-transaction-img" src="empty-wallet.svg" />
        <p class="empty-state-text text-bow" :class="getDarkModeClass(darkMode)">{{ $t('NoTransactionsToDisplay') }}</p>
      </div>
      
      <!-- Scroll sentinel for intersection observer -->
      <div ref="scrollSentinel" class="scroll-sentinel"></div>
    </template>
    <div v-else class="loading-state">
      <TransactionListItemSkeleton v-for="i in 12" :key="i"/>
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
    'on-show-transaction-details',
    'scroll-up',
    'scroll-down'
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
      isLoadingMore: false,
      intersectionObserver: null,
      lastScrollTop: 0,
      scrollThreshold: 50
    }
  },

  mounted () {
    this.selectedNetwork = this.selectedNetworkProps
    this.selectedAsset = this.selectedAssetProps
    this.setupIntersectionObserver()
  },

  beforeUnmount () {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect()
    }
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
    hasMoreTransactions () {
      return this.transactionsPage < this.transactionsMaxPage
    }
  },

  methods: {
    getDarkModeClass,
    scrollToBottomTransactionList () {
      this.$refs['bottom-transactions-list']?.scrollIntoView({ behavior: 'smooth' })
    },
    setupIntersectionObserver () {
      const options = {
        root: this.$refs.transactionList,
        rootMargin: '200px',
        threshold: 0.1
      }

      this.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && this.hasMoreTransactions && !this.isLoadingMore) {
            this.loadMoreTransactions()
          }
        })
      }, options)

      this.$nextTick(() => {
        if (this.$refs.scrollSentinel) {
          this.intersectionObserver.observe(this.$refs.scrollSentinel)
        }
      })
    },
    onScroll (event) {
      const element = event.target
      const scrollTop = element.scrollTop
      const scrollBottom = element.scrollHeight - scrollTop - element.clientHeight
      
      // Track scroll direction for footer hide/show
      if (Math.abs(scrollTop - this.lastScrollTop) > this.scrollThreshold) {
        if (scrollTop > this.lastScrollTop && scrollTop > 100) {
          // Scrolling down (to older transactions) - hide footer
          this.$emit('scroll-down')
        } else if (scrollTop < this.lastScrollTop) {
          // Scrolling up (to newer transactions) - show footer
          this.$emit('scroll-up')
        }
        this.lastScrollTop = scrollTop
      }
      
      // Load more when user is within 300px of the bottom
      if (scrollBottom < 300 && this.hasMoreTransactions && !this.isLoadingMore) {
        this.loadMoreTransactions()
      }
    },
    loadMoreTransactions () {
      if (this.isLoadingMore || !this.hasMoreTransactions) return
      
      const nextPage = this.transactionsPage + 1
      this.isLoadingMore = true
      this.getTransactions(nextPage, { append: true })
        .finally(() => {
          this.isLoadingMore = false
        })
    },
    getTransactions (page = 1, opts = { scrollToBottom: false, txSearchReference: null, append: false }) {
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
    getBchTransactions (page, opts = { scrollToBottom: false, append: false }) {
      const vm = this
      const asset = vm.selectedAsset
      const id = vm.selectedAsset.id
      const recordType = recordTypeMap[vm.transactionsFilter]
      const txSearchReference = opts.txSearchReference
      const shouldAppend = opts.append

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

      if (!requestPromise) return Promise.reject()
      vm.transactionsAppending = true
      return requestPromise
        .then(function (response) {
          const transactions = response.history || response
          const page = Number(response?.page)
          const hasNext = response?.has_next

          if (!Array.isArray(transactions)) return

          if (shouldAppend) {
            // Append new transactions to existing list
            transactions.forEach(function (item) {
              item.asset = asset
              vm.transactions.push(item)
            })
          } else {
            // Replace transactions list
            vm.transactions = []
            transactions.forEach(function (item) {
              item.asset = asset
              vm.transactions.push(item)
            })
          }

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
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    // overflow set by parent
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    
    // Custom scrollbar styling
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.05);
      border-radius: 10px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 10px;
      
      &:hover {
        background: rgba(0, 0, 0, 0.3);
      }
    }
  }

  .transactions-content {
    flex-shrink: 0; // Don't compress content
  }

  .loading-more {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    gap: 12px;
  }

  .loading-text {
    font-size: 14px;
    opacity: 0.7;
    margin: 0;
    
    &.dark {
      color: #e0e2e5;
    }
    
    &.light {
      color: rgba(0, 0, 0, 0.7);
    }
  }

  .end-of-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    gap: 8px;
    opacity: 0.6;
  }

  .end-text {
    font-size: 13px;
    margin: 0;
    
    &.dark {
      color: #a6acaf;
    }
    
    &.light {
      color: rgba(0, 0, 0, 0.6);
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
  }

  .no-transaction-img {
    width: 80px;
    height: 80px;
    margin-bottom: 24px;
    opacity: 0.6;
  }

  .empty-state-text {
    font-size: 16px;
    opacity: 0.7;
    margin: 0;
  }

  .loading-state {
    padding: 16px 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .scroll-sentinel {
    height: 1px;
    width: 100%;
    visibility: hidden;
  }
</style>
