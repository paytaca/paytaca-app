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
                {{ parseFiatCurrencyWrapper(eliteData.monthlyCashback) }} of {{ parseFiatCurrencyWrapper(eliteData.maxCashbackPerMonth) }}
              </span>
            </div>
            <q-linear-progress
              :value="monthlyPct"
              class="rounded-borders elite-progress"
              size="8px"
            />
          </template>
        </q-card-section>
      </q-card>

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
          <div class="row items-center">
            <div class="section-icon">
              <q-icon name="storefront" />
            </div>
            <span class="section-title">Eligible Transactions</span>
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
          <div class="row items-center">
            <div class="section-icon">
              <q-icon name="arrow_upward" />
            </div>
            <span class="section-title">Top-ups</span>
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
import { parseFiatCurrencyWrapper } from 'src/utils/denomination-utils'
import { getEliteProgramSummaryData, EliteStatus, EliteStatusLabels } from 'src/utils/engagementhub-utils/rewards'

import HeaderNav from 'src/components/header-nav.vue'
import ErrorCard from 'src/components/rewards/cards/ErrorCard.vue'
import EliteList from 'src/components/rewards/transactions/EliteList.vue'

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
    parseFiatCurrencyWrapper,

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
}

.light .section-icon {
  background: #c89d36;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
}
</style>