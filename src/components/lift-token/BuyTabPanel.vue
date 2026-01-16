<template>
  <div style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
    <!-- Quick Stats Bar -->
    <div class="quick-stats q-pa-md" style="flex-shrink: 0;" :class="getDarkModeClass(darkMode)">
      <div class="row q-col-gutter-sm">
        <div class="col-6">
          <div class="stat-card q-pa-sm text-center" :class="getDarkModeClass(darkMode)">
            <div class="text-caption text-grey-6">{{ $t('YourBCHBalance') }}</div>
            <div class="text-body1 text-weight-bold">{{ bchBalance }} BCH</div>
          </div>
        </div>
        <div class="col-6">
          <div class="stat-card q-pa-sm text-center" :class="getDarkModeClass(darkMode)">
            <div class="text-caption text-grey-6">{{ $t('BestAvailablePrice') }}</div>
            <div class="text-body1 text-weight-bold">$0.05</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Reservations Alert (if any) -->
    <div v-if="unpaidReservations.length > 0" class="q-px-md q-pb-md" style="flex-shrink: 0;">
      <q-banner dense rounded class="bg-warning text-dark">
        <template v-slot:avatar>
          <q-icon name="pending" />
        </template>
        {{ $t('YouHaveUnpaidReservations', { count: unpaidReservations.length }, `You have ${unpaidReservations.length} pending reservation(s)`) }}
        <template v-slot:action>
          <q-btn 
            flat 
            dense 
            :label="$t('ViewAll')" 
            @click="$emit('navigate-to-history')"
          />
        </template>
      </q-banner>
    </div>

    <!-- Main Content -->
    <div style="flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;">
      <div class="q-pa-md">
        <!-- Filter Section -->
        <div class="row justify-between items-center q-mb-md">
          <div class="text-subtitle1 text-weight-medium">{{ $t('SelectRound') }}</div>
          <q-btn
            flat
            dense
            round
            icon="mdi-filter-variant"
            :class="selectedFilter !== 'all' ? 'filter-active' : ''"
            :color="selectedFilter !== 'all' ? getThemeColor() : 'grey-7'"
            @click="showFilterDialog = true"
          >
            <q-badge v-if="selectedFilter !== 'all'" color="red" floating rounded />
          </q-btn>
        </div>

        <!-- Filter Dialog -->
        <q-dialog v-model="showFilterDialog" position="bottom">
          <q-card class="pt-card-2 text-bow filter-dialog-card bottom-card" :class="getDarkModeClass(darkMode)">
            <q-card-section class="row justify-between items-center q-pb-sm">
              <div class="text-subtitle1 text-weight-bold">{{ $t('FilterRounds') }}</div>
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
              <div class="filter-section">
                <div class="section-label text-caption q-mb-sm">{{ $t('FilterByRound') }}</div>
                <div class="filter-chips row q-gutter-sm">
                  <sale-group-chip
                    :saleGroup="'all'"
                    :outline="isChipOutline('all')"
                    @click="applyFilter('all')"
                  />
                  <sale-group-chip
                    :saleGroup="SaleGroup.SEED"
                    :outline="isChipOutline(SaleGroup.SEED)"
                    @click="applyFilter(SaleGroup.SEED)"
                  />
                  <sale-group-chip
                    :saleGroup="SaleGroup.PRIVATE"
                    :outline="isChipOutline(SaleGroup.PRIVATE)"
                    @click="applyFilter(SaleGroup.PRIVATE)"
                  />
                  <sale-group-chip
                    :saleGroup="SaleGroup.PUBLIC"
                    :outline="isChipOutline(SaleGroup.PUBLIC)"
                    @click="applyFilter(SaleGroup.PUBLIC)"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-dialog>

        <!-- Reservations List -->
        <template v-if="finalRsvpList?.length === 0">
          <div class="row full-width flex-center text-center q-mt-lg q-px-md">
            <div class="empty-state-card q-pa-xl" :class="getDarkModeClass(darkMode)">
              <q-icon name="mdi-inbox-outline" size="64px" class="text-grey-5 q-mb-md" />
              <div class="text-h6 q-mb-sm text-bold">{{ $t("EmptyReservations1") }}</div>
              <div class="text-body2 q-mb-xs">{{ $t("EmptyReservations2") }}</div>
              <div class="text-body2" v-html="$t('EmptyReservations3')" />
            </div>
          </div>
        </template>

        <template v-else>
          <div class="cards-container">
            <div class="row q-gutter-y-md">
              <!-- Reuse existing reservation cards from ReservationsTabPanel -->
              <q-card
                v-for="(rsvp, index) in finalRsvpList"
                :key="index"
                class="reservation-card q-pa-md full-width"
                :class="[getDarkModeClass(darkMode), `theme-${theme}`]"
              >
                <div class="row col-12 q-mb-sm justify-between items-start">
                  <div class="col-7">
                    <div class="lift-amount text-h6 text-weight-bold q-mb-xs">
                      {{ parseLiftToken(rsvp.reserved_amount_tkn) }}
                    </div>
                    <div class="row items-center q-gutter-xs">
                      <span class="usd-amount text-subtitle1 text-weight-medium" :class="rsvp.discount > 0 ? 'discounted' : ''">
                        <span v-if="rsvp.discounted_amount > 0">
                          {{ parseFiatCurrency(rsvp.discounted_amount, "USD") }}
                        </span>
                        <span v-else>
                          {{ parseFiatCurrency(rsvp.reserved_amount_usd, "USD") }}
                        </span>
                      </span>
                      <span v-if="rsvp.discount > 0" class="original-price text-caption text-strike text-grey-6">
                        {{ parseFiatCurrency(rsvp.reserved_amount_usd, "USD") }}
                      </span>
                    </div>
                  </div>
                  <div class="col-5 text-right">
                    <sale-group-chip :saleGroup="rsvp.sale_group" />
                  </div>
                </div>

                <div v-if="rsvp.discount > 0" class="discount-banner q-mb-sm q-pa-xs text-center">
                  <q-icon name="celebration" size="xs" class="q-mr-xs" />
                  <span class="text-caption text-weight-bold">
                    {{ rsvp.discount }}% {{ $t("DiscountApplied") }}
                  </span>
                </div>

                <q-separator class="q-my-sm" />

                <div class="q-mb-sm">
                  <div class="row items-center justify-between">
                    <span class="text-caption text-grey-7">{{ $t("TotalCost") }}:</span>
                    <span v-if="rsvp.discounted_amount > 0" class="text-body2 text-weight-medium">
                      {{ parseFiatCurrency(rsvp.discounted_amount, "USD") }}
                    </span>
                    <span v-else class="text-body2 text-weight-medium">
                      {{ parseFiatCurrency(rsvp.reserved_amount_usd, "USD") }}
                    </span>
                  </div>
                  <div class="row items-center justify-between">
                    <span class="text-caption text-grey-7">≈ {{ $t("InBCH") }}:</span>
                    <span class="text-body2 text-weight-medium">{{ parseAssetBalance(rsvp.reserved_amount_bch, "BCH") }}</span>
                  </div>
                </div>

                <div class="status-section q-mb-sm">
                  <div class="row items-center q-mb-xs">
                    <q-icon :name="getStatusIcon(rsvp)" :color="getStatusColor(rsvp)" size="sm" class="q-mr-xs" />
                    <span class="text-caption text-weight-medium" :class="`text-${getStatusColor(rsvp)}`">
                      {{ getStatusText(rsvp) }}
                    </span>
                  </div>
                  <div v-if="rsvp.order_deadline_at" class="text-caption text-grey-6">
                    <q-icon name="schedule" size="xs" class="q-mr-xs" />
                    {{ $t("ExpiresOn") }}: {{ formatDate(rsvp.order_deadline_at) }}
                  </div>
                </div>

                <div v-if="rsvp.is_paid" class="payment-details q-mb-sm">
                  <q-expansion-item
                    dense
                    :label="$t('PaymentDetails')"
                    icon="receipt"
                    header-class="text-caption"
                  >
                    <div class="q-pa-sm">
                      <div class="text-caption q-mb-xs">
                        <span class="text-grey-7">{{ $t("TxID") }}:</span>
                        <div class="txid-text monospace">{{ rsvp.paid_txid || "N/A" }}</div>
                      </div>
                      <div class="text-caption">
                        <span class="text-grey-7">{{ $t("PaidOn") }}:</span>
                        {{ formatDate(rsvp.paid_at) }}
                      </div>
                    </div>
                  </q-expansion-item>
                </div>

                <div class="action-buttons">
                  <q-btn
                    v-if="!rsvp.is_paid && !isExpired(rsvp)"
                    :label="$t('PayNow')"
                    :color="getThemeColor()"
                    unelevated
                    no-caps
                    class="full-width"
                    @click="openPaymentDialog(rsvp)"
                  />
                  <q-btn
                    v-else-if="rsvp.is_paid"
                    :label="$t('ViewDetails')"
                    outline
                    :color="getThemeColor()"
                    no-caps
                    class="full-width"
                    @click="openInfoDialog(rsvp)"
                  />
                  <div v-else class="text-center text-caption text-negative q-pa-sm">
                    {{ $t("ReservationExpired") }}
                  </div>
                </div>
              </q-card>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Payment Dialog -->
    <pay-reservation-dialog
      v-model="showPaymentDialog"
      :rsvp="selectedReservation"
      :lift-swap-contract-address="liftSwapContractAddress"
      :dark-mode="darkMode"
      :theme="theme"
      @on-successful-purchase="handleSuccessfulPurchase"
    />

    <!-- Purchase Info Dialog -->
    <purchase-info-dialog
      v-model="showInfoDialog"
      :purchase="selectedReservation"
      :dark-mode="darkMode"
    />
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
import PayReservationDialog from './dialogs/PayReservationDialog.vue'
import PurchaseInfoDialog from './dialogs/PurchaseInfoDialog.vue'

export default {
  name: 'BuyTabPanel',
  components: {
    SaleGroupChip,
    PayReservationDialog,
    PurchaseInfoDialog
  },
  props: {
    reservationsList: Array,
    liftSwapContractAddress: String,
    darkMode: Boolean,
    theme: String,
    bchBalance: {
      type: Number,
      default: 0
    }
  },
  emits: ['on-successful-purchase', 'navigate-to-history'],
  data() {
    return {
      SaleGroup,
      selectedFilter: 'all',
      showFilterDialog: false,
      showPaymentDialog: false,
      showInfoDialog: false,
      selectedReservation: null
    }
  },
  computed: {
    finalRsvpList() {
      if (this.selectedFilter === 'all') {
        return this.reservationsList || []
      }
      return (this.reservationsList || []).filter(
        rsvp => rsvp.sale_group === this.selectedFilter
      )
    },
    unpaidReservations() {
      return (this.reservationsList || []).filter(
        rsvp => !rsvp.is_paid && !this.isExpired(rsvp)
      )
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
    isChipOutline(saleGroup) {
      return this.selectedFilter !== saleGroup
    },
    applyFilter(filter) {
      this.selectedFilter = filter
      this.showFilterDialog = false
    },
    getStatusIcon(rsvp) {
      if (rsvp.is_paid) return 'check_circle'
      if (this.isExpired(rsvp)) return 'cancel'
      return 'pending'
    },
    getStatusColor(rsvp) {
      if (rsvp.is_paid) return 'positive'
      if (this.isExpired(rsvp)) return 'negative'
      return 'warning'
    },
    getStatusText(rsvp) {
      if (rsvp.is_paid) return this.$t('Paid')
      if (this.isExpired(rsvp)) return this.$t('Expired')
      return this.$t('AwaitingPayment')
    },
    isExpired(rsvp) {
      if (!rsvp.order_deadline_at) return false
      return new Date(rsvp.order_deadline_at) < new Date()
    },
    formatDate(dateString) {
      if (!dateString) return 'N/A'
      const date = new Date(dateString)
      return date.toLocaleString()
    },
    openPaymentDialog(rsvp) {
      this.selectedReservation = rsvp
      this.showPaymentDialog = true
    },
    openInfoDialog(rsvp) {
      this.selectedReservation = rsvp
      this.showInfoDialog = true
    },
    handleSuccessfulPurchase() {
      this.$emit('on-successful-purchase')
      this.showPaymentDialog = false
    }
  }
}
</script>

<style lang="scss" scoped>
.quick-stats {
  background-color: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  
  &.dark {
    background-color: rgba(0, 0, 0, 0.2);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
  
  .stat-card {
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 8px;
    
    &.dark {
      background-color: rgba(255, 255, 255, 0.05);
    }
  }
}

.reservation-card {
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  transition: all 0.3s ease;
  
  &.dark {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .discounted {
    color: #4caf50;
  }
  
  .discount-banner {
    background: linear-gradient(90deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1));
    border-radius: 8px;
  }
  
  .txid-text {
    word-break: break-all;
    font-size: 11px;
  }
  
  .monospace {
    font-family: 'Courier New', monospace;
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

