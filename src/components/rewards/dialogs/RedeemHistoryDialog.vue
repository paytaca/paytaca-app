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
        <div class="row items-center q-gutter-sm">
          <q-icon name="history" size="28px" color="primary" />
          <span class="text-h6 text-weight-bold">Redemption History</span>
        </div>
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
                    -{{ formatNumber(redemption.redeemed_points) }} pts
                  </q-item-label>
                  <q-item-label caption :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                    {{ formatDateLocaleRelative(redemption.redeemed_date, false) }}
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
                    Lift: {{ formatNumber(redemption.lift_received) }} LIFT
                  </span>
                </q-item-label>

                <!-- RP Promo Monthly Max -->
                <q-item-label v-if="promo === 'rp' && redemption.month_max" caption class="q-mt-xs">
                  <q-badge
                    color="info"
                    :text-color="darkMode ? 'black' : 'white'"
                    class="monthly-badge"
                  >
                    <q-icon name="info" size="12px" class="q-mr-xs" />
                    Max {{ formatNumber(redemption.month_max) }} pts/mo
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
import { formatDateLocaleRelative } from 'src/utils/time';
import { getExplorerLink } from 'src/utils/send-page-utils';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { Promos, getPromoRedeemHistory } from 'src/utils/engagementhub-utils/rewards';

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
      limit: 10,
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
        const data = { limit: this.limit, offset: this.offset }
        if (this.promo === Promos.USERREWARDS) data.ur_id = this.promoId
        else if (this.promo === Promos.RFPROMO) data.rp_id = this.promoId

        const resp = await getPromoRedeemHistory(this.promo, data)
        this.redemptions = resp.redeem_history
        this.hasMoreData = resp.has_more_data
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
        const data = { limit: this.limit, offset: this.offset }
        if (this.promo === Promos.USERREWARDS) data.ur_id = this.promoId
        else if (this.promo === Promos.RFPROMO) data.rp_id = this.promoId

        const resp = await getPromoRedeemHistory(this.promo, data)
        this.redemptions += resp.redeem_history
        this.hasMoreData = resp.has_more_data
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
