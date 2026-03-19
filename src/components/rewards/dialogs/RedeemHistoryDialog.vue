<template>
  <q-dialog
    persistent
    seamless
    ref="dialogRef"
    class="no-click-outside"
  >
    <q-card
      class="q-pa-none pt-card-2 history-card-wrapper text-bow br-15"
      :class="getDarkModeClass(darkMode)"
    >
      <!-- Sticky Header -->
      <div class="row justify-between items-center q-pa-md" :class="getDarkModeClass(darkMode)">
        <span class="text-h6 text-weight-bold">Redemption History</span>
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <q-separator />

      <!-- Scrollable Content Area -->
      <div class="scrollable-content" :class="getDarkModeClass(darkMode)">
        <!-- Loading State -->
        <template v-if="isLoading">
          <div class="q-pa-md">
            <q-card v-for="n in 5" :key="`skeleton-${n}`" flat class="q-mb-sm">
              <q-card-section>
                <div class="row items-center q-gutter-md">
                  <q-skeleton type="circle" size="40px" />
                  <div class="col">
                    <q-skeleton type="text" width="60%" />
                    <q-skeleton type="text" width="40%" />
                  </div>
                  <q-skeleton type="rect" width="80px" height="24px" />
                </div>
              </q-card-section>
            </q-card>
          </div>
        </template>

        <!-- Empty State -->
        <div v-else-if="redemptions.length === 0" class="empty-state q-pa-xl text-center">
          <q-icon name="redeem" size="64px" class="text-bow-muted q-mb-md" :class="getDarkModeClass(darkMode)" />
          <div class="text-subtitle1 text-bow-muted q-mb-sm">No redemptions yet</div>
          <div class="text-body2 text-bow-muted">Start redeeming your points to see them here</div>
        </div>

        <!-- Redemption List -->
        <template v-else>
          <q-list separator class="redemption-list">
            <q-item
              v-for="(redemption, index) in redemptions"
              :key="index"
              class="redemption-item q-py-md"
            >
              <q-item-section avatar>
                <q-icon
                  name="local_activity"
                  size="24px"
                  color="white"
                  class="q-pa-sm redeem-icon"
                  :class="darkMode ? 'bg-negative' : 'bg-red-4'"
                />
              </q-item-section>

              <q-item-section>
                <!-- Primary Info Row -->
                <div class="row items-center justify-between">
                  <q-item-label class="text-weight-bold text-body1">
                    -{{ formatNumber(redemption.points) }} pts
                  </q-item-label>
                  <q-item-label caption :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                    {{ formatDateLocaleRelative(redemption.redemption_date, false) }}
                  </q-item-label>
                </div>

                <!-- Secondary Details -->
                <q-item-label caption class="q-mt-xs">
                  <div class="row items-center q-gutter-x-sm">
                    <span :class="darkMode ? 'text-grey-6' : 'text-grey-8'">TX:</span>
                    <span 
                      class="cursor-pointer text-primary hover-underline"
                      @click="openExplorer(redemption.tx_id)"
                    >
                      {{ truncateTxId(redemption.tx_id) }}
                    </span>
                    <q-icon name="open_in_new" size="14px" color="primary" />
                  </div>
                </q-item-label>

                <q-item-label caption class="q-mt-xs">
                  <span :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                    Lift: {{ formatNumber(redemption.lift_amount) }} LIFT
                  </span>
                </q-item-label>

                <!-- RP Promo Monthly Max -->
                <q-item-label v-if="promo === 'rp' && redemption.monthly_max" caption class="q-mt-xs">
                  <q-badge
                    color="info"
                    text-color="black"
                    class="monthly-badge"
                  >
                    <q-icon name="info" size="12px" class="q-mr-xs" />
                    Max {{ formatNumber(redemption.monthly_max) }} pts/mo
                  </q-badge>
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <!-- Load More -->
          <div v-if="hasMoreData" class="text-center q-pa-md">
            <q-btn
              flat
              color="primary"
              :loading="isLoadingMore"
              @click="loadMore"
              class="load-more-btn"
            >
              <q-icon name="expand_more" class="q-mr-sm" />
              Load More
            </q-btn>
          </div>

          <!-- End of List -->
          <div v-else-if="redemptions.length > 0 && !hasMoreData" class="text-center q-pa-md end-of-list">
            <q-icon name="check_circle" size="24px" color="positive" />
            <span class="text-caption q-ml-sm" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
              All redemptions loaded
            </span>
          </div>
        </template>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { formatDateLocaleRelative } from 'src/utils/time';
import { getExplorerLink } from 'src/utils/send-page-utils';

export default {
  name: 'RedeemHistoryDialog',

  props: {
    promo: { type: String, default: '' },
    promoId: { type: Number, default: -1 }
  },

  data () {
    return {
      isLoading: false,
      isLoadingMore: false,
      hasMoreData: true,
      limit: 20,
      redemptions: []
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  mounted () {
    this.fetchRedemptionHistory()
  },

  methods: {
    getDarkModeClass,
    formatDateLocaleRelative,
    getExplorerLink,

    formatNumber (num) {
      if (!num) return '0'
      return new Intl.NumberFormat('en-US').format(num)
    },

    truncateTxId (txId) {
      if (!txId) return ''
      if (txId.length <= 16) return txId
      return `${txId.slice(0, 8)}...${txId.slice(-6)}`
    },

    openExplorer (txId) {
      if (!txId) return
      const url = this.getExplorerLink(txId, false)
      window.open(url, '_blank', 'noopener,noreferrer')
    },

    async fetchRedemptionHistory () {
      this.isLoading = true
      
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // Dummy data for testing
        const dummyData = [
          {
            points: 500,
            redemption_date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            tx_id: '0x7a8f9b2c3d4e5f6789012345678901234567890abcd',
            lift_amount: 50,
            monthly_max: this.promo === 'rp' ? 1000 : null
          },
          {
            points: 250,
            redemption_date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            tx_id: '0x1234567890abcdef1234567890abcdef1234567890',
            lift_amount: 25,
            monthly_max: this.promo === 'rp' ? 1000 : null
          },
          {
            points: 1000,
            redemption_date: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
            tx_id: '0xfedcba0987654321fedcba0987654321fedcba098',
            lift_amount: 100,
            monthly_max: this.promo === 'rp' ? 1000 : null
          },
          {
            points: 750,
            redemption_date: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
            tx_id: '0xabcdef1234567890abcdef1234567890abcdef12',
            lift_amount: 75,
            monthly_max: this.promo === 'rp' ? 1000 : null
          },
          {
            points: 300,
            redemption_date: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
            tx_id: '0x5678901234567890abcdef1234567890abcdef12',
            lift_amount: 30,
            monthly_max: this.promo === 'rp' ? 1000 : null
          },
        ]
        
        this.redemptions = dummyData
        
        // Simulate that there's more data available (next key would be true)
        this.hasMoreData = true
      } catch (error) {
        console.error('Failed to fetch redemption history:', error)
      } finally {
        this.isLoading = false
      }
    },

    async loadMore () {
      if (this.isLoadingMore) return
      
      this.isLoadingMore = true
      
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 600))
        
        // Generate more dummy data
        const moreDummyData = []
        for (let i = 0; i < 5; i++) {
          moreDummyData.push({
            points: Math.floor(Math.random() * 1000) + 100,
            redemption_date: new Date(Date.now() - (5 + i + 1) * 86400000).toISOString(),
            tx_id: `0x${Math.random().toString(16).substr(2, 40)}`,
            lift_amount: Math.floor(Math.random() * 100) + 10,
            monthly_max: this.promo === 'rp' ? 1000 : null
          })
        }
        
        // Append to existing data
        this.redemptions.push(...moreDummyData)
        
        // After 2 loads, simulate no more data
        if (this.redemptions.length >= 15) {
          this.hasMoreData = false
        }
      } catch (error) {
        console.error('Failed to load more redemptions:', error)
      } finally {
        this.isLoadingMore = false
      }
    },

    async onRefresh (done) {
      await this.fetchRedemptionHistory()
      done()
    }
  }
}
</script>

<style lang="scss" scoped>
.history-card-wrapper {
  min-width: 320px;
  max-width: 80dvw;
  max-height: 80dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  max-height: calc(80dvh - 70px);
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
    
    .dark & {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.redemption-item {
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.03);
    
    .dark & {
      background-color: rgba(255, 255, 255, 0.03);
    }
  }
}

.redeem-icon {
  border-radius: 50%;
}

.bg-negative-light {
  background-color: #ffcdd2;
}

.hover-underline {
  text-decoration: underline;
  text-decoration-style: dotted;
  
  &:hover {
    text-decoration-style: solid;
  }
}

.monthly-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
}

.load-more-btn {
  min-width: 150px;
}

.end-of-list {
  opacity: 0.7;
}
</style>
