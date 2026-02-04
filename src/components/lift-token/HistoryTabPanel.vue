<template>
  <div style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
    <!-- Summary Cards -->
    <div class="summary-section q-pa-md" style="flex-shrink: 0;" :class="getDarkModeClass(darkMode)">
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-6">
          <div class="summary-card q-pa-sm" :class="getDarkModeClass(darkMode)">
            <div class="text-caption text-grey-6">{{ $t('TotalInvested') }}</div>
            <div class="text-body1 text-weight-bold">{{ totalInvestedBCH }} BCH</div>
            <div class="text-caption">{{ totalInvestedUSD }} USD</div>
          </div>
        </div>
        <div class="col-6">
          <div class="summary-card q-pa-sm" :class="getDarkModeClass(darkMode)">
            <div class="text-caption text-grey-6">{{ $t('TotalLIFT') }}</div>
            <div class="text-body1 text-weight-bold">{{ totalLift }} LIFT</div>
            <div class="text-caption">{{ $t('Purchased') }}</div>
          </div>
        </div>
        <div class="col-6">
          <div class="summary-card q-pa-sm" :class="getDarkModeClass(darkMode)">
            <div class="text-caption text-grey-6">{{ $t('Vested') }}</div>
            <div class="text-body1 text-weight-bold">{{ vestedLift }} LIFT</div>
          </div>
        </div>
        <div class="col-6">
          <div class="summary-card q-pa-sm" :class="getDarkModeClass(darkMode)">
            <div class="text-caption text-grey-6">{{ $t('NextRelease') }}</div>
            <div class="text-body2 text-weight-bold">{{ nextReleaseDate }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter Section -->
    <div class="q-px-md q-pb-sm" style="flex-shrink: 0;">
      <div class="row justify-between items-center">
        <div class="text-caption text-grey-7" :class="{'text-grey-4': darkMode}">
          <template v-if="activeFiltersCount > 0">
            <span class="text-weight-medium">{{ activeFiltersCount }} {{ $t('FiltersActive') }}</span>
          </template>
        </div>
        <q-btn
          flat
          dense
          round
          icon="mdi-filter-variant"
          :class="activeFiltersCount > 0 ? 'filter-active' : ''"
          :color="activeFiltersCount > 0 ? getThemeColor() : 'grey-7'"
          @click="showFilterDialog = true"
        >
          <q-badge v-if="activeFiltersCount > 0" color="red" floating rounded>
            {{ activeFiltersCount }}
          </q-badge>
        </q-btn>
      </div>

      <!-- Active Filter Chips -->
      <div v-if="activeFiltersCount > 0" class="row q-gutter-xs q-mt-sm">
        <q-chip
          v-if="typeFilter !== 'all'"
          removable
          :color="getThemeColor()"
          text-color="white"
          size="sm"
          @remove="typeFilter = 'all'"
        >
          {{ getTypeFilterLabel(typeFilter) }}
        </q-chip>
        <q-chip
          v-if="roundFilter !== 'all'"
          removable
          color="secondary"
          text-color="white"
          size="sm"
          @remove="roundFilter = 'all'"
        >
          <sale-group-chip :saleGroup="roundFilter" size="xs" />
        </q-chip>
        <q-chip
          v-if="statusFilter !== 'all'"
          removable
          color="accent"
          text-color="white"
          size="sm"
          @remove="statusFilter = 'all'"
        >
          {{ getStatusFilterLabel(statusFilter) }}
        </q-chip>
      </div>
    </div>

    <!-- Filter Dialog -->
    <q-dialog v-model="showFilterDialog" position="bottom">
      <q-card class="pt-card-2 text-bow filter-dialog-card bottom-card" :class="getDarkModeClass(darkMode)">
        <q-card-section class="row justify-between items-center q-pb-sm">
          <div class="text-subtitle1 text-weight-bold">{{ $t('FilterHistory') }}</div>
          <q-btn
            flat
            round
            padding="sm"
            icon="close"
            class="close-button"
            v-close-popup
          />
        </q-card-section>
        <q-card-section class="q-pt-sm">
          <!-- Type Filter -->
          <div class="filter-section q-mb-md">
            <div class="section-label text-caption q-mb-sm">{{ $t('FilterByType') }}</div>
            <div class="filter-chips row q-gutter-sm">
              <q-chip
                :outline="typeFilter !== 'all'"
                clickable
                @click="typeFilter = 'all'"
                :color="typeFilter === 'all' ? getThemeColor() : 'grey-5'"
                :text-color="typeFilter === 'all' ? 'white' : 'grey-8'"
              >
                {{ $t('All') }}
              </q-chip>
              <q-chip
                :outline="typeFilter !== 'reservations'"
                clickable
                @click="typeFilter = 'reservations'"
                :color="typeFilter === 'reservations' ? getThemeColor() : 'grey-5'"
                :text-color="typeFilter === 'reservations' ? 'white' : 'grey-8'"
              >
                {{ $t('Reservations') }}
              </q-chip>
              <q-chip
                :outline="typeFilter !== 'purchases'"
                clickable
                @click="typeFilter = 'purchases'"
                :color="typeFilter === 'purchases' ? getThemeColor() : 'grey-5'"
                :text-color="typeFilter === 'purchases' ? 'white' : 'grey-8'"
              >
                {{ $t('Purchases') }}
              </q-chip>
            </div>
          </div>

          <!-- Round Filter -->
          <div class="filter-section q-mb-md">
            <div class="section-label text-caption q-mb-sm">{{ $t('FilterByRound') }}</div>
            <div class="filter-chips row q-gutter-sm">
              <sale-group-chip
                :saleGroup="'all'"
                :outline="roundFilter !== 'all'"
                @click="roundFilter = 'all'"
              />
              <sale-group-chip
                :saleGroup="SaleGroup.SEED"
                :outline="roundFilter !== SaleGroup.SEED"
                @click="roundFilter = SaleGroup.SEED"
              />
              <sale-group-chip
                :saleGroup="SaleGroup.PRIVATE"
                :outline="roundFilter !== SaleGroup.PRIVATE"
                @click="roundFilter = SaleGroup.PRIVATE"
              />
              <sale-group-chip
                :saleGroup="SaleGroup.PUBLIC"
                :outline="roundFilter !== SaleGroup.PUBLIC"
                @click="roundFilter = SaleGroup.PUBLIC"
              />
            </div>
          </div>

          <!-- Status Filter (for reservations) -->
          <div v-if="typeFilter !== 'purchases'" class="filter-section">
            <div class="section-label text-caption q-mb-sm">{{ $t('FilterByStatus') }}</div>
            <div class="filter-chips row q-gutter-sm">
              <q-chip
                :outline="statusFilter !== 'all'"
                clickable
                @click="statusFilter = 'all'"
                :color="statusFilter === 'all' ? getThemeColor() : 'grey-5'"
                :text-color="statusFilter === 'all' ? 'white' : 'grey-8'"
              >
                {{ $t('All') }}
              </q-chip>
              <q-chip
                :outline="statusFilter !== 'pending'"
                clickable
                @click="statusFilter = 'pending'"
                :color="statusFilter === 'pending' ? 'warning' : 'grey-5'"
                :text-color="statusFilter === 'pending' ? 'white' : 'grey-8'"
              >
                {{ $t('Pending') }}
              </q-chip>
              <q-chip
                :outline="statusFilter !== 'paid'"
                clickable
                @click="statusFilter = 'paid'"
                :color="statusFilter === 'paid' ? 'positive' : 'grey-5'"
                :text-color="statusFilter === 'paid' ? 'white' : 'grey-8'"
              >
                {{ $t('Paid') }}
              </q-chip>
              <q-chip
                :outline="statusFilter !== 'expired'"
                clickable
                @click="statusFilter = 'expired'"
                :color="statusFilter === 'expired' ? 'negative' : 'grey-5'"
                :text-color="statusFilter === 'expired' ? 'white' : 'grey-8'"
              >
                {{ $t('Expired') }}
              </q-chip>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Timeline List -->
    <template v-if="filteredItems.length === 0">
      <div class="row full-width flex-center text-center q-mt-lg q-px-md">
        <div class="empty-state-card q-pa-xl" :class="getDarkModeClass(darkMode)">
          <q-icon name="mdi-timeline-clock-outline" size="64px" class="text-grey-5 q-mb-md" />
          <div class="text-h6 q-mb-sm text-bold">{{ $t("NoHistoryFound") }}</div>
          <div class="text-body2">{{ $t("NoHistorySubtext") }}</div>
        </div>
      </div>
    </template>

    <template v-else>
      <q-scroll-area style="flex: 1;">
        <div class="q-pa-md">
          <q-timeline :color="getThemeColor()">
            <q-timeline-entry
              v-for="(item, index) in filteredItems"
              :key="index"
              :icon="getItemIcon(item)"
              :color="getItemColor(item)"
            >
              <template v-slot:title>
                <div class="row items-center justify-between">
                  <span class="text-weight-medium">{{ getItemTitle(item) }}</span>
                  <sale-group-chip :saleGroup="item.saleGroup" size="sm" />
                </div>
              </template>
              <template v-slot:subtitle>
                {{ getItemDate(item) }}
              </template>

              <!-- Item Details Card -->
              <q-card
                flat
                class="history-item-card q-pa-md q-mt-sm"
                :class="getDarkModeClass(darkMode)"
              >
                <div class="row justify-between items-center q-mb-sm">
                  <div>
                    <div class="text-h6 text-weight-bold">{{ getItemAmount(item) }}</div>
                    <div class="text-caption text-grey-6">{{ getItemCost(item) }}</div>
                  </div>
                  <q-badge
                    :color="getItemStatusColor(item)"
                    :label="getItemStatus(item)"
                  />
                </div>

                <q-separator class="q-my-sm" />

                <div class="text-caption">
                  <div v-if="item.type === 'reservation'" class="q-mb-xs">
                    <q-icon name="schedule" size="xs" class="q-mr-xs" />
                    {{ $t('ExpiresOn') }}: {{ formatDate(item.order_deadline_at) }}
                  </div>
                  <div v-if="item.is_paid || item.type === 'purchase'" class="q-mb-xs">
                    <q-icon name="receipt" size="xs" class="q-mr-xs" />
                    {{ $t('TxID') }}: {{ getShortTxid(item) }}
                  </div>
                </div>

                <!-- Action Button -->
                <q-btn
                  v-if="item.type === 'reservation' && !item.is_paid && !isExpired(item)"
                  :label="$t('PayNow')"
                  :color="getThemeColor()"
                  unelevated
                  no-caps
                  size="sm"
                  class="q-mt-sm full-width"
                  @click="$emit('pay-reservation', item)"
                />
                <q-btn
                  v-else
                  :label="$t('ViewDetails')"
                  outline
                  :color="getThemeColor()"
                  no-caps
                  size="sm"
                  class="q-mt-sm full-width"
                  @click="$emit('view-details', item)"
                />
              </q-card>
            </q-timeline-entry>
          </q-timeline>
        </div>
      </q-scroll-area>
    </template>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { SaleGroup } from 'src/utils/engagementhub-utils/lift-token'
import { parseLiftToken } from 'src/utils/engagementhub-utils/shared'
import {
  parseAssetBalance,
  parseFiatCurrency
} from 'src/utils/denomination-utils'
import SaleGroupChip from './SaleGroupChip.vue'

export default {
  name: 'HistoryTabPanel',
  components: {
    SaleGroupChip
  },
  props: {
    reservationsList: Array,
    purchasesList: Array,
    darkMode: Boolean,
    theme: String
  },
  emits: ['pay-reservation', 'view-details'],
  data() {
    return {
      SaleGroup,
      typeFilter: 'all',
      roundFilter: 'all',
      statusFilter: 'all',
      showFilterDialog: false
    }
  },
  computed: {
    combinedItems() {
      const reservations = (this.reservationsList || []).map(item => ({
        ...item,
        type: 'reservation',
        saleGroup: item.sale_group,
        date: item.created_at || item.order_deadline_at
      }))

      const purchases = (this.purchasesList || []).map(item => ({
        ...item,
        type: 'purchase',
        saleGroup: item.purchase_more_details?.sale_group,
        date: item.purchased_at || item.created_at
      }))

      return [...reservations, ...purchases].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      )
    },
    filteredItems() {
      return this.combinedItems.filter(item => {
        // Type filter
        if (this.typeFilter !== 'all' && item.type !== this.typeFilter) {
          return false
        }

        // Round filter
        if (this.roundFilter !== 'all' && item.saleGroup !== this.roundFilter) {
          return false
        }

        // Status filter (for reservations only)
        if (this.statusFilter !== 'all' && item.type === 'reservation') {
          if (this.statusFilter === 'pending' && (item.is_paid || this.isExpired(item))) {
            return false
          }
          if (this.statusFilter === 'paid' && !item.is_paid) {
            return false
          }
          if (this.statusFilter === 'expired' && !this.isExpired(item)) {
            return false
          }
        }

        return true
      })
    },
    activeFiltersCount() {
      let count = 0
      if (this.typeFilter !== 'all') count++
      if (this.roundFilter !== 'all') count++
      if (this.statusFilter !== 'all') count++
      return count
    },
    totalInvestedBCH() {
      const total = this.purchasesList.reduce((sum, purchase) => {
        return sum + (purchase.purchased_amount_sats / 10 ** 8)
      }, 0)
      return total.toFixed(6)
    },
    totalInvestedUSD() {
      const total = this.purchasesList.reduce((sum, purchase) => {
        return sum + parseFloat(purchase.purchase_partial_details?.usd_paid || 0)
      }, 0)
      return parseFiatCurrency(total, 'USD')
    },
    totalLift() {
      const total = this.purchasesList.reduce((sum, purchase) => {
        return sum + parseFloat(purchase.purchase_partial_details?.tkn_paid || 0)
      }, 0)
      return parseLiftToken(total)
    },
    vestedLift() {
      // Calculate vested amount based on vesting schedule
      // This is a simplified calculation - implement proper vesting logic
      return parseLiftToken(0)
    },
    nextReleaseDate() {
      return 'TBD'
    }
  },
  methods: {
    getDarkModeClass,
    parseAssetBalance,
    parseFiatCurrency,
    parseLiftToken,
    getThemeColor() {
      const themeColors = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-red': '#f54270'
      }
      return themeColors[this.theme] || '#42a5f5'
    },
    getItemIcon(item) {
      if (item.type === 'reservation') {
        if (item.is_paid) return 'check_circle'
        if (this.isExpired(item)) return 'cancel'
        return 'pending'
      }
      return 'shopping_bag'
    },
    getItemColor(item) {
      if (item.type === 'reservation') {
        if (item.is_paid) return 'positive'
        if (this.isExpired(item)) return 'negative'
        return 'warning'
      }
      return 'primary'
    },
    getItemTitle(item) {
      if (item.type === 'reservation') {
        return this.$t('Reservation')
      }
      return this.$t('Purchase')
    },
    getItemDate(item) {
      return this.formatDate(item.date)
    },
    getItemAmount(item) {
      if (item.type === 'reservation') {
        return this.parseLiftToken(item.reserved_amount_tkn)
      }
      return this.parseLiftToken(item.purchase_partial_details?.tkn_paid)
    },
    getItemCost(item) {
      if (item.type === 'reservation') {
        const cost = item.discounted_amount > 0 ? item.discounted_amount : item.reserved_amount_usd
        return this.parseFiatCurrency(cost, 'USD')
      }
      return this.parseFiatCurrency(item.purchase_partial_details?.usd_paid, 'USD')
    },
    getItemStatus(item) {
      if (item.type === 'reservation') {
        if (item.is_paid) return this.$t('Paid')
        if (this.isExpired(item)) return this.$t('Expired')
        return this.$t('Pending')
      }
      return this.$t('Completed')
    },
    getItemStatusColor(item) {
      if (item.type === 'reservation') {
        if (item.is_paid) return 'positive'
        if (this.isExpired(item)) return 'negative'
        return 'warning'
      }
      return 'positive'
    },
    getShortTxid(item) {
      let txid = item.paid_txid || item.txid || 'N/A'
      if (txid.length > 16) {
        return `${txid.substring(0, 8)}...${txid.substring(txid.length - 8)}`
      }
      return txid
    },
    isExpired(item) {
      if (!item.order_deadline_at) return false
      return new Date(item.order_deadline_at) < new Date()
    },
    formatDate(dateString) {
      if (!dateString) return 'N/A'
      const date = new Date(dateString)
      return date.toLocaleString()
    },
    getTypeFilterLabel(type) {
      return type === 'reservations' ? this.$t('Reservations') : this.$t('Purchases')
    },
    getStatusFilterLabel(status) {
      const labels = {
        pending: this.$t('Pending'),
        paid: this.$t('Paid'),
        expired: this.$t('Expired')
      }
      return labels[status] || status
    }
  }
}
</script>

<style lang="scss" scoped>
.summary-section {
  background-color: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  
  &.dark {
    background-color: rgba(0, 0, 0, 0.2);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
  
  .summary-card {
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 12px;
    
    &.dark {
      background-color: rgba(255, 255, 255, 0.05);
    }
  }
}

.history-item-card {
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  
  &.dark {
    background-color: rgba(0, 0, 0, 0.2);
  }
}

.empty-state-card {
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  max-width: 400px;
  
  &.dark {
    background-color: rgba(255, 255, 255, 0.03);
  }
}

.filter-dialog-card {
  border-radius: 24px 24px 0 0;
}
</style>

