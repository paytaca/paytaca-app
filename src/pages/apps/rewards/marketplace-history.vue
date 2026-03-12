<template>
  <div id="app-container" class="sticky-header-container text-bow" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      :title="$t('UserRewards', 'User Rewards')"
      back-button
    />

    <h5 class="q-ma-none q-px-md text-primary text-weight-bold text-center">
      Merchant Transactions History
    </h5>

    <div class="q-px-md q-pt-md">
      <!-- Summary Section -->
      <q-card
        class="q-mb-md summary-card"
        :class="getDarkModeClass(darkMode)"
        flat
      >
        <q-card-section>
          <template v-if="isLoading">
            <div class="row justify-around">
              <div class="text-center" v-for="n in 3" :key="`stat-skeleton-${n}`">
                <q-skeleton type="text" width="60px" class="q-mx-auto" />
                <q-skeleton type="text" width="40px" class="q-mx-auto" />
              </div>
            </div>
          </template>
          
          <template v-else>
            <div class="row justify-around">
              <div class="text-center">
                <div class="text-h6 text-bold text-primary">{{ summaryStats.total_transactions }}</div>
                <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                  {{ $t('Total', 'Total') }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-h6 text-bold text-primary">{{ summaryStats.order_count }}</div>
                <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                  {{ $t('Orders', 'Orders') }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-h6 text-bold text-primary">{{ summaryStats.otc_count }}</div>
                <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                  {{ $t('OTC', 'OTC') }}
                </div>
              </div>
            </div>
            
            <q-separator class="q-my-md" />
            
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
        <!-- Sticky Filters Section -->
        <div class="pt-header sticky-filters-wrapper" :class="getDarkModeClass(darkMode)">
          <transaction-filters
            v-model="activeTab"
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
          @refresh="refreshData"
          @load-more="loadMore"
        >
          <template #item="{ item }">
            <order-transaction-item
              v-if="item.type === 'order'"
              :data="item"
              :dark-mode="darkMode"
            />
            <o-t-c-transaction-item
              v-else-if="item.type === 'otc'"
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
  fetchMarketplaceHistory,
  filterTransactionsByType,
  calculateSummaryStats
} from 'src/utils/engagementhub-utils/marketplace-history'

import HeaderNav from 'src/components/header-nav.vue'
import ErrorCard from 'src/components/rewards/cards/ErrorCard.vue'
import TransactionFilters from 'src/components/rewards/marketplace/TransactionFilters.vue'
import TransactionList from 'src/components/rewards/marketplace/TransactionList.vue'
import OrderTransactionItem from 'src/components/rewards/marketplace/OrderTransactionItem.vue'
import OTCTransactionItem from 'src/components/rewards/marketplace/OTCTransactionItem.vue'

export default {
  name: 'MarketplaceHistory',

  components: {
    HeaderNav,
    ErrorCard,
    TransactionFilters,
    TransactionList,
    OrderTransactionItem,
    OTCTransactionItem
  },

  props: {
    id: { type: String, default: '-1' }
  },

  data() {
    return {
      isLoading: false,
      dataError: '',
      
      upId: -1,
      activeTab: 'all',
      sortDesc: true,
      
      allTransactions: [],
      filteredTransactions: [],
      summaryStats: {
        total_transactions: 0,
        total_points: 0,
        order_count: 0,
        order_points: 0,
        otc_count: 0,
        otc_points: 0
      },
      
      limit: 20,
      offset: 0,
      hasMoreData: false
    }
  },

  computed: {
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  async mounted() {
    await this.loadData()

    // adjust style of sticky-filters-wrapper
    const headerNavHeight = document.getElementsByClassName('header-nav-wrapper')[0].clientHeight
    const stickyFilterWrapper = document.getElementsByClassName('sticky-filters-wrapper')[0]
    if (stickyFilterWrapper) stickyFilterWrapper.style.top = `${headerNavHeight - 1}px`
  },

  methods: {
    getDarkModeClass,
    
    async loadData() {
      this.isLoading = true
      this.dataError = ''
      
      this.upId = Number(this.$route.params.id || -1)
      
      try {
        const response = await fetchMarketplaceHistory(this.upId, {
          limit: this.limit,
          offset: this.offset
        })
        
        if (response) {
          this.allTransactions = response.transactions
          this.summaryStats = calculateSummaryStats(this.allTransactions)
          this.applyFilters()
          this.hasMoreData = this.allTransactions.length >= this.limit
        } else {
          this.dataError = this.$t('FailedToLoadData', 'Unable to load your Marketplace history. Please try again.')
        }
      } catch (error) {
        console.error('Error loading marketplace history:', error)
        this.dataError = this.$t('FailedToLoadData', 'Unable to load your Marketplace history. Please try again.')
      }
      
      this.isLoading = false
    },
    
    applyFilters() {
      // Filter by type
      let filtered = filterTransactionsByType(this.allTransactions, this.activeTab)
      
      // Sort by date
      filtered.sort((a, b) => {
        const dateA = new Date(a.date)
        const dateB = new Date(b.date)
        return this.sortDesc ? dateB - dateA : dateA - dateB
      })
      
      this.filteredTransactions = filtered
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
      // PLACEHOLDER: Implement pagination loading when API supports it
      this.hasMoreData = false
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
    position: relative;
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
