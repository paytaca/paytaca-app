<template>
  <div id="app-container" class="sticky-header-container text-bow" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      :title="'Paytaca Elite'"
    />

    <div class="q-px-md q-pt-md">
      <!-- Hero Section: Cashback Summary -->
      <q-card
        class="q-mb-lg hero-card"
        :class="[getDarkModeClass(darkMode), { loaded: heroLoaded }]"
        flat
      >
        <q-card-section class="q-py-md">
          <!-- Loading State -->
          <template v-if="isLoading">
            <div class="hero-top q-mb-md">
              <div class="row items-center">
                <q-skeleton type="circle" size="40px" />
                <div class="column q-ml-sm" style="flex: 1;">
                  <q-skeleton type="text" width="150px" height="16px" class="q-mb-xs" />
                  <q-skeleton type="text" width="70px" height="10px" />
                </div>
              </div>
            </div>

            <div class="row q-mb-sm q-pb-xs">
              <div class="col elite-stat-box q-mx-xs br-10">
                <q-skeleton type="text" width="70%" height="16px" class="q-mx-auto q-mb-xs" />
                <q-skeleton type="text" width="55%" height="12px" class="q-mx-auto" />
              </div>
              <div class="col elite-stat-box q-mx-xs br-10">
                <q-skeleton type="text" width="50%" height="16px" class="q-mx-auto q-mb-xs" />
                <q-skeleton type="text" width="55%" height="12px" class="q-mx-auto" />
              </div>
            </div>

            <div class="row justify-center text-caption q-mb-xs">
              <q-skeleton type="text" width="40%" height="12px" class="q-mx-auto" />
              <q-skeleton type="text" width="60%" height="14px" class="q-mx-auto" />
            </div>
            <q-skeleton type="text" width="100%" height="8px" class="q-mx-auto" />
          </template>

          <!-- Error State -->
          <error-card
            v-else-if="!isLoading && pointsError"
            class="text-center"
            :is-points-card="true"
            :is-rewards-home-page="false"
            :error-text="pointsError"
            @on-retry="loadData()"
          />

          <!-- Loaded State -->
          <template v-else-if="eliteData">
            <div class="hero-top q-mb-md">
              <div class="row items-center">
                <div class="hero-icon">
                  <q-icon name="workspace_premium" size="md" class="elite-icon" />
                </div>
                <div class="column q-ml-sm">
                  <span class="elite-name">Paytaca Elite Program</span>
                  <span class="elite-pill q-mt-xs" :class="eliteStatus">{{ EliteStatusLabels[eliteStatus] }}</span>
                </div>
              </div>
            </div>

            <div class="row q-mb-sm q-pb-xs">
              <div class="col elite-stat-box q-mx-xs br-10">
                <div class="elite-stat-value">{{ parseLiftToken(eliteData.cashbackLift) }}</div>
                <div class="text-caption">Cashback this month</div>
              </div>
              <div class="col elite-stat-box q-mx-xs br-10">
                <div class="elite-stat-value">{{ eliteData.eligibleTxCount }}</div>
                <div class="text-caption">Transactions this month</div>
              </div>
            </div>

            <div class="row justify-center text-caption q-mb-xs">
              <span class="col-12 text-center">Cashback limit this month</span>
              <span class="col-12 text-weight-bold text-center">
                {{ formatEliteFiat(eliteData.monthlyCashback) }} of {{ formatEliteFiat(eliteData.maxCashbackPerMonth) }}
              </span>
            </div>
            <q-linear-progress
              :value="monthlyPct"
              class="rounded-borders elite-progress"
              size="8px"
            />

            <q-btn
              class="full-width q-mt-md elite-map-button"
              outline
              no-caps
              rounded
              icon="history"
              label="View Monthly History"
              @click="openMonthlyHistoryDialog"
            />
          </template>
        </q-card-section>
      </q-card>

      <div class="elite-map-cta q-mb-lg">
        <q-btn
          class="full-width elite-map-button elite-map-button--halo"
          outline
          no-caps
          rounded
          icon="map"
          label="Find merchants on the map"
          @click="openMerchantMap"
        />
      </div>

      <q-banner
        v-if="heroLoaded && isNonPhilippineCountry"
        rounded
        dense
        class="br-15 q-mb-lg"
        :class="darkMode ? 'bg-grey-9 text-white' : 'bg-grey-2 text-grey-9'"
      >
        <template #avatar>
          <q-icon name="info" color="primary" />
        </template>
        <div class="text-body2">
          Note: The BCH requirement and cashback limits are in Philippine pesos (PHP). Set your country to the Philippines in Settings if you want to see the real values.
        </div>
      </q-banner>

      <!-- Error state for data -->
      <error-card
        v-if="dataError"
        :is-points-card="false"
        :is-rewards-home-page="false"
        :error-text="dataError"
        @on-retry="loadData()"
      />

      <template v-else>
        <!-- Eligible Transactions Section -->
        <div class="section-head q-mb-sm">
          <div class="row items-center no-wrap">
            <div class="section-icon">
              <q-icon name="storefront" />
            </div>
            <div class="column">
              <span class="section-title">Eligible Transactions</span>
              <q-skeleton
                v-if="isLoading"
                type="text"
                width="64px"
                height="10px"
                class="q-mt-xs"
              />
              <span v-else-if="!pointsError" class="section-count q-mt-xs">
                {{ eliteData.eligibleTxCount }} this month
              </span>
            </div>
          </div>
          <q-btn
            v-if="!isLoading"
            flat
            class="view-all-button q-pr-none"
            :class="getDarkModeClass(darkMode)"
            size="sm"
            icon-right="chevron_right"
            label="View All"
            @click="$router.push(`/apps/rewards/elite-history/${this.eliteId}/transactions`)"
          />
        </div>
        <elite-list
          type="transactions"
          :items="transactions"
          :loading="isLoading"
          :dark-mode="darkMode"
          @refresh="refreshData"
        />

        <!-- Top-ups Section -->
        <div class="section-head q-mb-sm q-mt-lg">
          <div class="row items-center no-wrap">
            <div class="section-icon">
              <q-icon name="arrow_upward" />
            </div>
            <div class="column">
              <span class="section-title">Top-ups</span>
              <q-skeleton
                v-if="isLoading"
                type="text"
                width="64px"
                height="10px"
                class="q-mt-xs"
              />
              <span v-else-if="!pointsError" class="section-count q-mt-xs">
                {{ eliteData.topupCount }} this month
              </span>
            </div>
          </div>
          <q-btn
            v-if="!isLoading"
            flat
            class="view-all-button q-pr-none"
            :class="getDarkModeClass(darkMode)"
            size="sm"
            icon-right="chevron_right"
            label="View All"
            @click="$router.push(`/apps/rewards/elite-history/${this.eliteId}/topups`)"
          />
        </div>
        <elite-list
          type="topups"
          :items="topups"
          :loading="isLoading"
          :dark-mode="darkMode"
          @refresh="refreshData"
        />
      </template>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseLiftToken } from 'src/utils/engagementhub-utils/shared'
import { parseFiatCurrency, parseFiatCurrencyWrapper } from 'src/utils/denomination-utils'
import { getEliteProgramSummaryData, EliteStatus, EliteStatusLabels } from 'src/utils/engagementhub-utils/rewards'

import HeaderNav from 'src/components/header-nav.vue'
import ErrorCard from 'src/components/rewards/cards/ErrorCard.vue'
import EliteList from 'src/components/rewards/transactions/EliteList.vue'
import EliteMonthlyHistoryDialog from 'src/components/rewards/dialogs/EliteMonthlyHistoryDialog.vue'

export default {
  name: 'EliteProgram',

  components: {
    HeaderNav,
    ErrorCard,
    EliteList
  },

  data () {
    return {
      isLoading: false,
      pointsError: '',
      dataError: '',
      EliteStatus,
      EliteStatusLabels,

      eliteData: {
        status: EliteStatus.ACTIVE,
        cashbackLift: 0,
        eligibleTxCount: 0,
        topupCount: 0,
        maxCashbackPerMonth: 0,
        monthlyCashback: 0
      },
      eliteId: -1,
      transactions: [],
      topups: []
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    isNonPhilippineCountry () {
      const code = this.$store.getters['global/country']?.code
      return Boolean(code) && String(code).toUpperCase() !== 'PH'
    },
    eliteStatus () {
      const status = this.eliteData?.status
      return Object.values(EliteStatus).includes(status) ? status : EliteStatus.ACTIVE
    },
    monthlyPct () {
      const max = this.eliteData?.maxCashbackPerMonth || 0
      const current = this.eliteData?.monthlyCashback || 0
      return max > 0 ? Math.min(current / max, 1) : 0
    },
    heroLoaded () {
      return !this.isLoading && !this.pointsError && !!this.eliteData
    }
  },

  async mounted () {
    await this.loadData()
  },

  methods: {
    getDarkModeClass,
    parseLiftToken,

    formatEliteFiat (amount) {
      return this.isNonPhilippineCountry
        ? parseFiatCurrency(amount, 'PHP')
        : parseFiatCurrencyWrapper(amount)
    },

    openMerchantMap () {
      this.$router.push({ name: 'app-map' })
    },

    openMonthlyHistoryDialog () {
      this.$q.dialog({
        component: EliteMonthlyHistoryDialog,
        componentProps: { eliteId: this.eliteId }
      })
    },

    async loadData (append = false) {
      if (!append) this.isLoading = true
      this.pointsError = ''
      this.dataError = ''
      this.eliteId = Number(this.$route.params.id || -1)

      try {
        // TODO add guard for -1 id
        const epSummaryData = await getEliteProgramSummaryData(this.eliteId)
        if (epSummaryData) {
          this.eliteData.status = epSummaryData.status
          this.eliteData.cashbackLift = epSummaryData.eligible_transactions.current_month_total_lift_cashback
          this.eliteData.eligibleTxCount = epSummaryData.eligible_transactions.count
          this.eliteData.topupCount = epSummaryData.topups?.count ?? 0
          this.eliteData.maxCashbackPerMonth = epSummaryData.monthly_cashback_limit
          this.eliteData.monthlyCashback = epSummaryData.eligible_transactions.current_month_fiat_lift_cashback

          this.transactions = epSummaryData.eligible_transactions.results
          this.topups = epSummaryData.topups.results
        } else {
          this.dataError = 'Failed to load Elite program data. Please try again later.'
        }
      } catch (error) {
        console.error('Error loading elite program data: ', error)
        this.pointsError = 'Failed to load Elite program data. Please try again later.'
      }

      if (!append) this.isLoading = false
    },

    async refreshData (done) {
      await this.loadData()
      if (done) done()
    }
  }
}
</script>

<style lang="scss" scoped>
@import 'src/css/rewards/elite-row-styles.scss';

.hero-card {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(212, 166, 67, 0.16) 0%, rgba(212, 166, 67, 0.04) 100%);
  border: 1px solid rgba(212, 166, 67, 0.35);

  &.dark {
    background: linear-gradient(135deg, rgba(212, 166, 67, 0.28) 0%, rgba(212, 166, 67, 0.06) 100%);
    border: 1px solid rgba(212, 166, 67, 0.45);
  }

  &.loaded::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 40%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.18), transparent);
    transform: translateX(-120%);
    animation: elite-glimmer 3s ease-in-out infinite;
    pointer-events: none;
  }

  &.loaded.dark::after {
    background: linear-gradient(90deg, transparent, rgba(212, 166, 67, 0.08), rgba(212, 166, 67, 0.14), transparent);
  }
}

@keyframes elite-glimmer {
  0% { transform: translateX(-120%); }
  55% { transform: translateX(320%); }
  100% { transform: translateX(320%); }
}

.hero-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(212, 166, 67, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.elite-map-cta {
  max-width: 420px;
  margin-left: auto;
  margin-right: auto;
}

.elite-map-button {
  color: #d4a643;
  font-weight: 700;
}

.elite-map-button--halo {
  position: relative;
  isolation: isolate;
  transition: box-shadow 180ms ease;
}

.elite-map-button--halo::after {
  content: '';
  position: absolute;
  z-index: -1;
  inset: -2px;
  border-radius: inherit;
  box-shadow: 0 0 12px 0 rgba(212, 166, 67, 0.16);
  opacity: 0;
  pointer-events: none;
  animation: elite-map-halo 5.2s ease-in-out infinite;
}

.elite-map-button--halo:hover,
.elite-map-button--halo:focus-visible {
  box-shadow: 0 0 12px 0 rgba(212, 166, 67, 0.22);
}

.elite-map-button--halo:hover::after,
.elite-map-button--halo:focus-visible::after {
  animation: none;
  opacity: 0;
}

.light .elite-map-button {
  color: #c89d36;
}

.light .elite-map-button--halo::after {
  box-shadow: 0 0 12px 0 rgba(200, 157, 54, 0.16);
}

.light .elite-map-button--halo:hover,
.light .elite-map-button--halo:focus-visible {
  box-shadow: 0 0 12px 0 rgba(200, 157, 54, 0.20);
}

@keyframes elite-map-halo {
  0%, 58%, 100% { opacity: 0; }
  22% { opacity: 1; }
  40% { opacity: 0.35; }
}

@media (prefers-reduced-motion: reduce) {
  .elite-map-button--halo::after {
    animation: none;
    opacity: 0;
  }
}

.view-all-button {
  color: #d4a643;
  font-weight: bold;
}

.light .view-all-button {
  color: #c89d36;
}

/* Section header */
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  column-gap: 12px;
}

.section-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #d4a643;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  margin-right: 8px;
  flex-shrink: 0;
}

.light .section-icon {
  background: #c89d36;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
}

.section-count {
  font-size: 12px;
  line-height: 1.25;
  opacity: 0.65;
}
</style>