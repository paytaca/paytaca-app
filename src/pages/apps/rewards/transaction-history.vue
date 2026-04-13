<template>
  <div id="app-container" class="sticky-header-container text-bow" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      :title="$t('UserRewards', 'User Rewards')"
    />

    <h5 class="q-ma-none q-px-md text-primary text-weight-bold text-center">
      {{ pageTitle }}
    </h5>

    <div class="q-px-md q-pt-md">
      <!-- Summary Section -->
      <q-card
        class="q-mb-md summary-card"
        :class="getDarkModeClass(darkMode)"
        flat
      >
        <q-card-section class="q-pa-sm">
          <template v-if="isLoading">
            <div class="row q-col-gutter-md">
              <div class="col text-center" v-for="n in currentConfig.stats.length" :key="`stat-skeleton-${n}`">
                <q-skeleton type="text" width="60px" class="q-mx-auto" />
                <q-skeleton type="text" width="40px" class="q-mx-auto" />
              </div>
            </div>
          </template>
          
          <template v-else>
            <div class="row">
              <div class="col text-center q-pa-sm" v-for="stat in currentConfig.stats" :key="stat.key">
                <div class="text-h6 text-bold text-primary">{{ summaryStats[stat.count] }}</div>
                <div 
                  class="text-caption" 
                  :class="darkMode ? 'text-grey-6' : 'text-grey-8'"
                  style="word-break: break-word;"
                >
                  {{ $t(stat.label, stat.label) }}
                </div>
              </div>
            </div>
            
            <q-separator class="q-my-sm" />
            
            <div class="row items-center justify-center q-gutter-sm">
              <q-icon name="loop" color="primary" size="sm" />
              <span class="text-subtitle1 text-weight-medium">
                {{ summaryStats.total_points }} {{ $t('pointsEarned', 'points earned') }}
              </span>
            </div>
          </template>
        </q-card-section>
      </q-card>

      <!-- Error State -->
      <error-card
        v-if="dataError"
        :is-points-card="false"
        :is-rewards-home-page="false"
        :error-text="dataError"
        @on-retry="loadData()"
      />

      <template v-else>
        <!-- Sticky Filters Section - Only show if has filters -->
        <div class="pt-header sticky-filters-wrapper" :class="getDarkModeClass(darkMode)">
          <transaction-filters
            v-model="activeTab"
            :tabs="filterTabs"
            :display-count="filteredTransactions.length"
            :dark-mode="darkMode"
            v-model:sort-desc="sortDesc"
            @filter-changed="onFilterChange"
            class="sticky-filters"
          />
        </div>

        <!-- Transaction List -->
        <transaction-list
          :items="filteredTransactions"
          :loading="isLoading"
          :has-more="hasMoreData"
          :dark-mode="darkMode"
          :empty-state="currentConfig.emptyState"
          @refresh="refreshData"
          @load-more="loadMore"
        >
          <template #item="{ item }">
            <transaction-item
              :data="item"
              :dark-mode="darkMode"
            />
          </template>
        </transaction-list>
      </template>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { 
  fetchMerchantTransactionsData,
  fetchCashinTransactionsData,
  fetchEloadTransactionsData
} from 'src/utils/engagementhub-utils/rewards'

import HeaderNav from 'src/components/header-nav.vue'
import ErrorCard from 'src/components/rewards/cards/ErrorCard.vue'
import TransactionList from 'src/components/rewards/transactions/TransactionList.vue'
import TransactionFilters from 'src/components/rewards/transactions/TransactionFilters.vue'
import TransactionItem from 'src/components/rewards/transactions/TransactionItem.vue'

export default {
  name: 'TransactionHistory',

  components: {
    HeaderNav,
    ErrorCard,
    TransactionList,
    TransactionFilters,
    TransactionItem
  },

  props: {
    id: { type: String, default: '-1' }
  },

  data() {
    return {
      isLoading: false,
      dataError: '',
      
      urId: -1,
      activeTab: 'all',
      sortDesc: true,
      
      allTransactions: [],
      filteredTransactions: [],
      summaryStats: {
        total_count: 0,
        total_points: 0
      },
      
      limit: 20,
      offset: 0,
      hasMoreData: false,

      // Category-specific configurations
      categoryConfig: {
        marketplace: {
          title: 'Merchant Transactions History',
          fetchFunction: fetchMerchantTransactionsData,
          filters: [
            { value: 'all', label: 'All' },
            { value: 'orders', label: 'Orders', type: 'order' },
            { value: 'otc', label: 'OTC', type: 'otc' }
          ],
          stats: [
            { key: 'total', count: 'total_count', points: 'total_points', label: 'Total' },
            { key: 'orders', count: 'order_count', points: 'order_points', label: 'Orders' },
            { key: 'otc', count: 'otc_count', points: 'otc_points', label: 'OTC' }
          ],
          emptyState: {
            title: 'No merchant transactions found',
            description: 'Start making orders or over-the-counter purchases to earn points!'
          },
          errorMessage: 'Unable to load your merchant history. Please try again.'
        },
        cashin: {
          title: 'Cash-in History',
          fetchFunction: fetchCashinTransactionsData,
          filters: [
            { value: 'all', label: 'All' },
            { value: 'ramp', label: 'P2P Ramp', type: 'ramp' },
            { value: 'vm', label: 'Vending Machine', type: 'vm' }
          ],
          stats: [
            { key: 'total', count: 'total_count', points: 'total_points', label: 'Total' },
            { key: 'ramp', count: 'ramp_count', points: 'ramp_points', label: 'P2P Ramp' },
            { key: 'vm', count: 'vm_count', points: 'vm_points', label: 'Vending Machine' }
          ],
          emptyState: {
            title: 'No cash-in transactions found',
            description: 'Cash in from the P2P Ramp app or through our vending machine to earn points!'
          },
          errorMessage: 'Unable to load your cash-in history. Please try again.'
        },
        eload: {
          title: 'E-Load History',
          fetchFunction: fetchEloadTransactionsData,
          filters: [], // No filters for eload
          stats: [
            { key: 'total', count: 'total_count', points: 'total_points', label: 'Total' }
          ],
          emptyState: {
            title: 'No e-load transactions found',
            description: 'Purchase eload services to earn points!'
          },
          errorMessage: 'Unable to load your eload history. Please try again.'
        }
      }
    }
  },

  computed: {
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
    },
    
    category() {
      // Detect category from route name
      const routeName = this.$route.name
      if (routeName === 'app-rewards-merchant-history') return 'marketplace'
      if (routeName === 'apps-rewards-cashin-history') return 'cashin'
      if (routeName === 'apps-rewards-eload-history') return 'eload'
      return 'marketplace' // Default fallback
    },
    
    currentConfig() {
      return this.categoryConfig[this.category]
    },
    
    pageTitle() {
      return this.currentConfig.title
    },
    
    filterTabs() {
      return this.currentConfig.filters
    }
  },

  async mounted() {
    await this.loadData()

    const headerNavHeight = document.getElementsByClassName('header-nav-wrapper')[0].clientHeight
    const stickyFilterWrapper = document.getElementsByClassName('sticky-filters-wrapper')[0]
    if (stickyFilterWrapper) stickyFilterWrapper.style.top = `${headerNavHeight - 1}px`
  },

  methods: {
    getDarkModeClass,
    
    async loadData() {
      this.isLoading = true
      this.dataError = ''
      
      this.urId = Number(this.$route.params.id || -1)
      
      try {
        const data = await this.currentConfig.fetchFunction({
          ur_id: this.urId,
          limit: this.limit,
          offset: this.offset
        })
        
        if (data) {
          this.allTransactions = data.overall_data
          
          // Build summary stats dynamically based on category config
          const stats = {
            total_count: data.total_count || data.overall_count || 0,
            total_points: data.total_points || data.overall_points || 0
          }
          
          // Add type-specific stats based on config
          this.currentConfig.stats.forEach(stat => {
            if (stat.key !== 'total') {
              stats[stat.count] = data[stat.count] || 0
              stats[stat.points] = data[stat.points] || 0
            }
          })
          
          this.summaryStats = stats
          this.applyFilters()
          this.hasMoreData = this.allTransactions.length >= this.limit
        } else {
          this.dataError = this.$t('FailedToLoadData', this.currentConfig.errorMessage)
        }
      } catch (error) {
        console.error(`Error loading ${this.category} history:`, error)
        this.dataError = this.$t('FailedToLoadData', this.currentConfig.errorMessage)
      }
      
      this.isLoading = false
    },
    
    applyFilters() {
      // Filter by type
      let filtered = this.filterTransactionsByType(this.allTransactions, this.activeTab)
      
      // Sort by date
      filtered.sort((a, b) => {
        const dateA = new Date(a.created_at)
        const dateB = new Date(b.created_at)
        return this.sortDesc ? dateB - dateA : dateA - dateB
      })
      
      this.filteredTransactions = filtered
    },
    
    filterTransactionsByType(transactions, type) {
      if (type === 'all') return transactions
      
      // Find the filter config for this type
      const filterConfig = this.currentConfig.filters.find(f => f.value === type)
      if (filterConfig && filterConfig.type) {
        return transactions.filter(t => t.type === filterConfig.type)
      }
      
      return transactions
    },
    
    onFilterChange() {
      this.applyFilters()
    },
    
    async refreshData(done) {
      this.offset = 0
      await this.loadData()
      if (done) done()
    },
    
    async loadMore() {
      this.offset += this.limit
      await this.loadData()
    }
  }
}
</script>

<style lang="scss" scoped>
.summary-card {
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(59, 123, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
  border: 1px solid rgba(59, 123, 246, 0.15);
  
  &.dark {
    background: linear-gradient(135deg, rgba(59, 123, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
    border: 1px solid rgba(139, 92, 246, 0.25);
  }
}

/* Sticky filters wrapper - uses same background as app container */
.sticky-filters-wrapper {
  position: sticky;
  top: 0;
  z-index: 2900;
  padding: 8px 16px;
  margin: 0 -16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  
  /* On mobile, the filter container inside is transparent */
  .filter-container {
    padding: 0;
  }
  
  /* Compensate for negative margins on mobile */
  @media (min-width: 600px) {
    margin: 0;
    border-radius: 12px;
    margin-bottom: 16px;
    top: 0;
    border-bottom: none;
    
    .filter-container {
      background: rgba(0, 0, 0, 0.02);
      border-radius: 12px;
      padding: 8px 12px;
      
      .dark & {
        background: rgba(255, 255, 255, 0.03);
      }
    }
  }
}

/* Make filters truly sticky only on mobile */
@media (max-width: 599px) {
  .sticky-filters-wrapper {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    
    &.dark {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
  }
}
</style>
