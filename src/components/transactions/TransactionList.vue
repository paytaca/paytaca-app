<template>
  <div 
    ref="transactionList"
    class="transaction-list scroll-y"
    @scroll="onScroll"
    @touchstart="preventPull"
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

import { getWalletByNetwork, getWatchtowerApiUrl } from 'src/wallet/chipnet'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { refToHex } from 'src/utils/reference-id-utils'
import axios from 'axios'

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
    preventPull (e) {
      // Prevent pull-to-refresh from triggering when scrollable element is not at top
      let parent = e.target
      // eslint-disable-next-line no-void
      while (parent !== void 0 && !parent.classList.contains('scroll-y')) {
        parent = parent.parentNode
      }
      // eslint-disable-next-line no-void
      if (parent !== void 0 && parent.scrollTop > 0) {
        e.stopPropagation()
      }
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
    async getTransactions (page = 1, opts = { scrollToBottom: false, txSearchReference: null, txids: null, append: false }) {
      // SmartBCH support removed
      return this.getBchTransactions(page, opts)
    },
    getBchTransactions (page, opts = { scrollToBottom: false, append: false }) {
      const vm = this
      const asset = vm.selectedAsset
      const id = vm.selectedAsset.id
      const recordType = recordTypeMap[vm.transactionsFilter]
      let txSearchReference = opts.txSearchReference
      const txids = typeof opts?.txids === 'string' ? opts.txids.trim() : ''
      const shouldAppend = opts.append

      // Convert decimal reference to hex if needed (safety check)
      if (txSearchReference && /^[0-9]{8}$/.test(txSearchReference)) {
        txSearchReference = refToHex(txSearchReference)
      }

      // Txid search is supported by watchtower via `txids=<comma-separated>`.
      // When present, prefer this over reference-based filtering.
      const hasTxidsFilter = !!txids

      // Handle "All" selection - use special endpoint
      if (id === 'all') {
        const walletHash = getWalletByNetwork(vm.wallet, 'bch').getWalletHash()
        const baseUrl = getWatchtowerApiUrl(vm.$store.getters['global/isChipnet'])
        const url = `${baseUrl}/history/wallet/${walletHash}/`
        
        const params = {
          all: true,
          page: page,
          type: recordType
        }
        
        if (hasTxidsFilter) {
          params.txids = txids
        } else if (txSearchReference) {
          // watchtower API expects `reference` for ref-ID search
          params.reference = txSearchReference
        }

        vm.transactionsAppending = true
        return axios.get(url, { params })
          .then(async function (response) {
            const transactions = response.data.history || response.data
            const pageNum = Number(response.data?.page || page)
            const hasNext = response.data?.has_next

            if (!Array.isArray(transactions)) return

            // Enrich transactions with asset information
            const enrichedTransactions = await vm.enrichTransactionsWithAssetInfo(transactions)

            if (shouldAppend) {
              // Append new transactions to existing list
              enrichedTransactions.forEach(function (item) {
                vm.transactions.push(item)
              })
            } else {
              // Replace transactions list
              vm.transactions = []
              enrichedTransactions.forEach(function (item) {
                vm.transactions.push(item)
              })
            }

            vm.transactionsPage = pageNum
            vm.transactionsMaxPage = response.data?.num_pages || 1
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
      }

      // If we are filtering by txids, use the Watchtower REST endpoint directly for
      // BCH/CT/SLP, since wallet helper methods don't consistently expose `txids`.
      if (hasTxidsFilter) {
        const isChipnet = vm.$store.getters['global/isChipnet']
        const baseUrl = getWatchtowerApiUrl(isChipnet)

        let walletHash = ''
        let url = ''
        const params = { page: page, type: recordType, txids }

        if (id?.startsWith?.('slp/')) {
          const tokenId = id.split('/')[1]
          walletHash = getWalletByNetwork(vm.wallet, 'slp').getWalletHash()
          url = `${baseUrl}/history/wallet/${walletHash}/${tokenId}/`
        } else if (id?.startsWith?.('ct/')) {
          const tokenId = id.split('/')[1]
          walletHash = getWalletByNetwork(vm.wallet, 'bch').getWalletHash()
          url = `${baseUrl}/history/wallet/${walletHash}/${tokenId}/`
        } else {
          walletHash = getWalletByNetwork(vm.wallet, 'bch').getWalletHash()
          url = `${baseUrl}/history/wallet/${walletHash}/`
        }

        vm.transactionsAppending = true
        return axios.get(url, { params })
          .then(async function (response) {
            const data = response?.data
            const transactions = data?.history || data
            const pageNum = Number(data?.page || page)
            const hasNext = data?.has_next

            if (!Array.isArray(transactions)) return

            const enrichedTransactions = await vm.enrichTransactionsWithAssetInfo(transactions)

            if (shouldAppend) {
              enrichedTransactions.forEach(function (item) { vm.transactions.push(item) })
            } else {
              vm.transactions = []
              enrichedTransactions.forEach(function (item) { vm.transactions.push(item) })
            }

            vm.transactionsPage = pageNum
            vm.transactionsMaxPage = data?.num_pages || 1
            vm.transactionsLoaded = true

            setTimeout(() => { vm.transactionsPageHasNext = hasNext }, 250)
          })
          .catch(error => {
            console.error('error:', error.response)
          })
          .finally(() => {
            vm.transactionsAppending = false
          })
      }

      // Existing code for specific asset selection
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
          .then(async function (response) {
          const transactions = response.history || response
          const page = Number(response?.page)
          const hasNext = response?.has_next

            if (!Array.isArray(transactions)) return

            // Enrich transactions with asset information
            const enrichedTransactions = await vm.enrichTransactionsWithAssetInfo(transactions)

            if (shouldAppend) {
              // Append new transactions to existing list
              enrichedTransactions.forEach(function (item) {
                vm.transactions.push(item)
              })
            } else {
              // Replace transactions list
              vm.transactions = []
              enrichedTransactions.forEach(function (item) {
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
    async enrichTransactionsWithAssetInfo (transactions) {
      const vm = this
      const bchAsset = {
        id: 'bch',
        symbol: 'BCH',
        name: 'Bitcoin Cash',
        logo: 'bch-logo.png',
        decimals: 8
      }

      // Process transactions in parallel batches to avoid overwhelming the API
      const batchSize = 5
      const enrichedTransactions = []

      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize)
        const batchPromises = batch.map(async (transaction) => {
          const enrichedTx = { ...transaction }
          
          // Check if transaction has token.id === "1" (BCH)
          // When token.id is "1", it's a BCH transaction
          const tokenId = transaction?.token?.id
          const isBchToken = tokenId === "1" || tokenId === 1
          
          // Check if transaction has token.asset_id
          // Try multiple possible paths for asset_id
          const assetId = transaction?.token?.asset_id || 
                         transaction?.asset_id || 
                         transaction?.token_id ||
                         null
          
          // Debug logging
          if (vm.selectedAsset?.id === 'all') {
            console.log('Transaction asset_id:', assetId, 'Token ID:', tokenId, 'Transaction:', transaction)
          }
          
          // If token.id is "1", assetId is null/undefined/empty, or 'bch', it's a BCH transaction
          if (isBchToken || !assetId || assetId === null || assetId === '' || assetId === 'bch') {
            // BCH transaction
            enrichedTx.asset = bchAsset
            if (vm.selectedAsset?.id === 'all') {
              console.log('Set BCH asset for transaction:', enrichedTx.asset)
            }
          } else if (typeof assetId === 'string' && assetId.startsWith('ct/')) {
            // CashToken transaction - fetch metadata
            const tokenId = assetId.split('/')[1]
            const commitment = transaction?.token?.commitment || transaction?.commitment
            
            // Check if this is an NFT transaction
            const isNft = transaction?.is_nft === true || transaction?.is_nft === 'true' ||
                         transaction?.asset?.is_nft === true || transaction?.asset?.is_nft === 'true' ||
                         (Array.isArray(transaction?.attributes) && transaction.attributes.some(attr => 
                           attr.key === 'is_nft' && (attr.value === true || attr.value === 'true')
                         ))
            
            // Check if asset already exists in store
            const existingAssets = vm.$store.getters['assets/getAssets']
            let asset = existingAssets.find(a => a?.id === assetId)
            
            if (asset && asset.logo && asset.symbol && asset.decimals !== undefined) {
              // Use existing asset from store
              enrichedTx.asset = asset
            } else if (isNft && commitment) {
              // For NFT transactions with commitment, fetch metadata directly from BCMR indexer
              try {
                const { getBcmrBackend } = await import('src/wallet/cashtokens')
                const response = await getBcmrBackend().get(`tokens/${tokenId}/${commitment}/`)
                const metadata = response?.data
                
                if (metadata) {
                  // Extract collection name from top-level name field
                  const collectionName = metadata.name || 'NFT'
                  // Extract type name from type_metadata.name
                  const typeName = metadata.type_metadata?.name || collectionName
                  // Extract icon from uris.icon
                  let logo = metadata.uris?.icon || null
                  
                  // Convert IPFS URL if needed
                  if (logo && logo.startsWith('ipfs://')) {
                    const { convertIpfsUrl } = await import('src/wallet/cashtokens')
                    logo = convertIpfsUrl(logo)
                  }
                  
                  enrichedTx.asset = {
                    id: assetId,
                    symbol: metadata.token?.symbol || 'NFT',
                    name: typeName, // Use type name for NFT display
                    logo: logo || null,
                    decimals: 0,
                    category: tokenId,
                    commitment: commitment,
                    collectionName: collectionName // Store collection name separately if needed
                  }
                } else {
                  // Fallback if metadata not found
                  enrichedTx.asset = {
                    id: assetId,
                    symbol: 'NFT',
                    name: 'NFT',
                    logo: null,
                    decimals: 0,
                    category: tokenId
                  }
                }
              } catch (error) {
                console.error('Error fetching NFT metadata from BCMR for', assetId, error)
                // Fallback asset
                enrichedTx.asset = {
                  id: assetId,
                  symbol: 'NFT',
                  name: 'NFT',
                  logo: null,
                  decimals: 0,
                  category: tokenId
                }
              }
            } else {
              // For non-NFT CashTokens, fetch token details as before
              try {
                const bchWallet = getWalletByNetwork(vm.wallet, 'bch')
                const tokenDetails = await bchWallet.getTokenDetails(tokenId)
                
                if (tokenDetails) {
                  enrichedTx.asset = {
                    id: assetId,
                    symbol: tokenDetails.symbol,
                    name: tokenDetails.name,
                    logo: tokenDetails.logo,
                    decimals: parseInt(tokenDetails.decimals) || 0
                  }
                  
                  // Update store with metadata for future use
                  await vm.$store.dispatch('assets/getAssetMetadata', assetId)
                } else {
                  // Fallback if token details not found
                  enrichedTx.asset = {
                    id: assetId,
                    symbol: 'CT',
                    name: 'CashToken',
                    logo: null,
                    decimals: 0
                  }
                }
              } catch (error) {
                console.error('Error fetching token details for', assetId, error)
                // Fallback asset
                enrichedTx.asset = {
                  id: assetId,
                  symbol: 'CT',
                  name: 'CashToken',
                  logo: null,
                  decimals: 0
                }
              }
            }
          } else {
            // SLP or other token type - for now, use basic info
            enrichedTx.asset = {
              id: assetId,
              symbol: 'TOKEN',
              name: 'Token',
              logo: null,
              decimals: 0
            }
          }
          
          return enrichedTx
        })
        
        const batchResults = await Promise.allSettled(batchPromises)
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            enrichedTransactions.push(result.value)
          } else {
            console.error('Error enriching transaction:', result.reason)
            // Add transaction with fallback asset
            const tx = { ...batch[index] }
            tx.asset = bchAsset
            enrichedTransactions.push(tx)
          }
        })
      }
      
      return enrichedTransactions
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
    width: 50px;
    height: 50px;
    margin-bottom: 12px;
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
