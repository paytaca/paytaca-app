<template>
  <div class="latest-transactions-section" :class="getDarkModeClass(darkMode)">
    <div class="row items-center justify-between q-mb-sm q-mt-sm">
      <div class="q-ml-lg button button-text-primary" :class="getDarkModeClass(darkMode)" style="font-size: 20px;">
        {{ $t('Transactions', {}, 'Transactions') }}
      </div>
    </div>

    <div class="row q-px-lg q-pt-md q-pb-sm" :class="darkMode ? 'text-light' : 'text-dark'">
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

    <template v-if="transactionsLoaded">
      <div v-if="transactions.length > 0" class="transactions-list">
        <TransactionListItem
          v-for="(transaction, index) in transactions"
          :key="'latest-tx-' + index"
          :transaction="transaction"
          :selected-asset="allAsset"
          :denominationTabSelected="denominationTabSelected"
          :hide-asset-info="true"
          :compact="true"
          @click="() => handleTransactionClick(transaction)"
        />
        
        <div v-if="hasMoreTransactions" class="see-more-container q-px-lg q-py-md">
          <q-btn
            flat
            no-caps
            :color="darkMode ? 'blue-4' : 'blue-6'"
            :label="$t('SeeMore', {}, 'See more')"
            icon-right="arrow_forward"
            @click="goToTransactionsPage"
            class="see-more-btn"
          />
        </div>
      </div>
      
      <div v-else class="empty-state q-px-lg q-py-lg">
        <q-img class="no-transaction-img" src="empty-wallet.svg" />
        <p class="empty-state-text" :class="getDarkModeClass(darkMode)">
          {{ $t('NoTransactionsToDisplay') }}
        </p>
      </div>
    </template>
    
    <div v-else class="loading-state q-px-lg q-py-md">
      <TransactionListItemSkeleton v-for="i in 5" :key="i"/>
    </div>
  </div>
</template>

<script>
import TransactionListItem from 'src/components/transactions/TransactionListItem'
import TransactionListItemSkeleton from 'src/components/transactions/TransactionListItemSkeleton'
import { getWalletByNetwork, getWatchtowerApiUrl } from 'src/wallet/chipnet'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import axios from 'axios'

const recordTypeMap = {
  all: 'all',
  sent: 'outgoing',
  received: 'incoming'
}

export default {
  name: 'LatestTransactions',
  
  components: {
    TransactionListItem,
    TransactionListItemSkeleton
  },
  
  props: {
    wallet: Object,
    denominationTabSelected: String
  },
  
  data () {
    return {
      transactions: [],
      transactionsLoaded: false,
      hasMoreTransactions: false,
      transactionsFilter: 'all',
      allAsset: {
        id: 'all',
        symbol: 'All',
        name: 'All Assets',
        logo: null
      }
    }
  },
  
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    selectedNetwork () {
      return this.$store.getters['global/network']
    },
    transactionsFilterOpts() {
      return [
        { label: this.$t('All'), value: 'all' },
        { label: this.$t('Sent'), value: 'sent' },
        { label: this.$t('Received'), value: 'received' },
      ]
    }
  },
  
  mounted () {
    this.loadTransactions()
  },
  
  methods: {
    getDarkModeClass,
    async loadTransactions () {
      if (this.selectedNetwork === 'sBCH') {
        // For sBCH, we'll skip for now or implement separately
        this.transactionsLoaded = true
        return
      }
      
      try {
        this.transactionsLoaded = false
        const walletHash = getWalletByNetwork(this.wallet, 'bch').getWalletHash()
        const baseUrl = getWatchtowerApiUrl(this.$store.getters['global/isChipnet'])
        const url = `${baseUrl}/history/wallet/${walletHash}/`
        
        const recordType = recordTypeMap[this.transactionsFilter]
        const params = {
          all: true,
          page: 1,
          type: recordType
        }
        
        const response = await axios.get(url, { params })
        const transactions = response.data.history || response.data
        
        if (!Array.isArray(transactions)) {
          this.transactions = []
          this.transactionsLoaded = true
          return
        }
        
        // Enrich transactions with asset information
        const enrichedTransactions = await this.enrichTransactionsWithAssetInfo(transactions)
        
        // Limit to 5 transactions
        this.transactions = enrichedTransactions.slice(0, 5)
        this.hasMoreTransactions = response.data?.has_next || enrichedTransactions.length > 5
        this.transactionsLoaded = true
      } catch (error) {
        console.error('Error loading latest transactions:', error)
        this.transactions = []
        this.transactionsLoaded = true
      }
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
          
          // Check if transaction has token.asset_id
          // Try multiple possible paths for asset_id
          const assetId = transaction?.token?.asset_id || 
                         transaction?.asset_id || 
                         transaction?.token_id ||
                         null
          
          // If assetId is null, undefined, empty string, or 'bch', it's a BCH transaction
          if (!assetId || assetId === null || assetId === '' || assetId === 'bch') {
            // BCH transaction
            enrichedTx.asset = bchAsset
          } else if (typeof assetId === 'string' && assetId.startsWith('ct/')) {
            // CashToken transaction - fetch metadata
            const tokenId = assetId.split('/')[1]
            
            // Check if asset already exists in store
            const existingAssets = vm.$store.getters['assets/getAssets']
            let asset = existingAssets.find(a => a?.id === assetId)
            
            if (asset && asset.logo && asset.symbol && asset.decimals !== undefined) {
              // Use existing asset from store
              enrichedTx.asset = asset
            } else {
              // Fetch token details
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
    handleTransactionClick (transaction) {
      const txid = transaction?.txid
      if (!txid) return
      
      if (!transaction?.asset) {
        transaction.asset = {
          id: 'bch',
          symbol: 'BCH',
          name: 'Bitcoin Cash',
          logo: 'bch-logo.png',
          decimals: 8
        }
      }
      
      const assetId = String(transaction?.asset?.id || 'bch')
      const query = (() => {
        // BCH: asset id is 'bch' or starts with 'bch' without a slash
        if (assetId === 'bch' || (assetId.startsWith('bch') && !assetId.includes('/'))) {
          return {}
        }
        // Token: extract category from ct/{category} or slp/{category}
        const parts = assetId.split('/')
        if (parts.length === 2 && (parts[0] === 'ct' || parts[0] === 'slp')) {
          return { category: parts[1] }
        }
        return {}
      })()
      
      // Serialize transaction object to avoid DataCloneError
      const serializedTx = this.serializeTransaction(transaction)
      
      this.$router.push({
        name: 'transaction-detail',
        params: { txid },
        query: { ...query, from: 'home' },
        state: { tx: serializedTx }
      })
    },
    serializeTransaction (tx) {
      if (!tx) return null
      
      // Create a serializable copy of the transaction
      // Remove functions, circular references, and non-serializable objects
      try {
        const serialized = JSON.parse(JSON.stringify(tx, (key, value) => {
          // Skip functions
          if (typeof value === 'function') {
            return undefined
          }
          // Skip symbols
          if (typeof value === 'symbol') {
            return undefined
          }
          // Convert BigNumber-like objects to strings if they have toString
          if (value && typeof value === 'object' && 'toString' in value && typeof value.toString === 'function') {
            try {
              return value.toString()
            } catch (e) {
              return undefined
            }
          }
          return value
        }))
        return serialized
      } catch (error) {
        console.error('Error serializing transaction:', error)
        // Fallback: return only essential properties
        return {
          txid: tx.txid || tx.tx_hash || tx.hash,
          asset: tx.asset,
          record_type: tx.record_type,
          amount: tx.amount,
          date_created: tx.date_created,
          block: tx.block,
          from: tx.from,
          to: tx.to,
          senders: tx.senders,
          recipients: tx.recipients
        }
      }
    },
    goToTransactionsPage () {
      // Pass the current filter to the transactions page
      const query = { assetID: 'all' }
      if (this.transactionsFilter !== 'all') {
        query.filter = this.transactionsFilter
      }
      this.$router.push({ 
        name: 'transaction-list',
        query
      })
    },
    refresh () {
      return this.loadTransactions()
    },
    setTransactionsFilter(value) {
      const transactionsFilters = this.transactionsFilterOpts.map(opt => opt?.value)
      if (transactionsFilters.indexOf(value) >= 0) {
        this.transactionsFilter = value
      } else {
        this.transactionsFilter = 'all'
      }
      this.loadTransactions()
    }
  }
}
</script>

<style lang="scss" scoped>
.latest-transactions-section {
  width: 100%;
}

.transactions-list {
  display: flex;
  flex-direction: column;
}

.see-more-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 8px;
  padding-bottom: 16px;
}

.see-more-btn {
  font-weight: 500;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 200px;
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
  
  &.dark {
    color: #a6acaf;
  }
  
  &.light {
    color: rgba(0, 0, 0, 0.6);
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.btn-transaction {
  font-size: 16px;
  background-color: rgb(242, 243, 252);
  border-radius: 24px;
  padding: 4px;
  padding-left: 2px;
  padding-right: 2px;
}

.btn-custom {
  height: 40px;
  width: 32%;
  border-radius: 20px;
  border: none;
  background-color: transparent;
  outline: 0;
  cursor: pointer;
  transition: 0.2s;
  font-weight: 500;
  white-space: nowrap;
  font-size: clamp(13px, 2.5vw, 16px);
  overflow: hidden;
}

.btn-all {
  margin-left: 0px;
}

.active-transaction-btn {
  background-color: white !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.active-transaction-btn.border {
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
}
</style>

