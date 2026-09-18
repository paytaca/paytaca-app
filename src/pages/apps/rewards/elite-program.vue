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
        :class="getDarkModeClass(darkMode)"
        flat
      >
        <q-card-section class="q-py-lg">
          <!-- Loading State -->
          <template v-if="isLoading">
            <div class="row flex-center q-mb-md">
              <q-skeleton type="circle" size="40px" />
            </div>
            <q-skeleton type="text" width="160px" height="20px" class="q-mx-auto q-mb-sm" />
            <q-skeleton type="text" width="140px" height="32px" class="q-mx-auto q-mb-md" />
            <div class="row q-col-gutter-md q-mb-md">
              <div class="col">
                <q-skeleton type="text" width="80px" class="q-mx-auto" />
                <q-skeleton type="text" width="60px" class="q-mx-auto" />
              </div>
              <div class="col">
                <q-skeleton type="text" width="80px" class="q-mx-auto" />
                <q-skeleton type="text" width="60px" class="q-mx-auto" />
              </div>
            </div>
            <q-skeleton type="text" width="100%" height="8px" class="q-mx-auto" />
          </template>

          <!-- Error State -->
          <error-card
            v-else-if="!isLoading && pointsError"
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
                <span class="elite-name q-ml-sm">Paytaca Elite Program</span>
                <span class="elite-pill active q-ml-xs">Active</span>
              </div>
            </div>

            <div class="row q-col-gutter-md q-mb-md">
              <div class="col elite-stat-box br-10">
                <div class="elite-stat-value">{{ formattedCashback }} LIFT</div>
                <div class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">Total cashback received</div>
              </div>
              <div class="col elite-stat-box br-10">
                <div class="elite-stat-value">{{ eliteData.eligibleTxCount }}</div>
                <div class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">Eligible transactions</div>
              </div>
            </div>

            <div class="row justify-between text-caption q-mb-xs" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
              <span>Monthly cashback limit</span>
              <span class="text-weight-medium">{{ formattedMonthlyCashback }} of ₱{{ (eliteData.maxCashbackPerMonth || 1000).toLocaleString() }}</span>
            </div>
            <q-linear-progress
              :value="monthlyPct"
              track-color="secondary"
              class="rounded-borders"
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
          <div class="section-icon">
            <q-icon name="storefront" />
          </div>
          <span class="section-title">Eligible Transactions</span>
        </div>
        <transaction-list
          :items="transactions"
          :loading="isLoading"
          :loading-more="loadingMore"
          :has-more="hasMoreTransactions"
          :dark-mode="darkMode"
          :include-separator="false"
          :empty-state="txEmptyState"
          @refresh="refreshData"
          @load-more="loadMoreTransactions"
        >
          <template #item="{ item }">
            <div class="elite-row">
              <div class="elite-row-icon">
                <q-icon :name="item.type === 'otc' ? 'store' : 'storefront'" />
              </div>
              <div class="elite-row-main">
                <div class="elite-row-title">
                  {{ item.type === 'otc' ? 'OTC' : 'Marketplace' }}
                  <span class="elite-row-tx">{{ formatTxDisplay(item.txId) }}</span>
                </div>
                <div class="elite-row-sub">{{ formatDateLocaleRelative(item.date, false) }}</div>
              </div>
              <div class="elite-row-side">
                <div class="elite-row-amt">+{{ formatLift(item.liftCashback) }} LIFT</div>
                <div class="elite-row-bch">{{ formatBch(item.bchSpent) }} BCH spent</div>
              </div>
            </div>
          </template>
        </transaction-list>

        <!-- Top-ups Section -->
        <div class="section-head q-mb-sm q-mt-lg">
          <div class="section-icon">
            <q-icon name="arrow_upward" />
          </div>
          <span class="section-title">Top-ups</span>
        </div>
        <transaction-list
          :items="topups"
          :loading="isLoading"
          :dark-mode="darkMode"
          :include-separator="false"
          :empty-state="topupEmptyState"
        >
          <template #item="{ item }">
            <div class="elite-row">
              <div class="elite-row-icon">
                <q-icon :name="item.asset === 'bch' ? 'currency_bitcoin' : 'workspace_premium'" />
              </div>
              <div class="elite-row-main">
                <div class="elite-row-title">
                  {{ item.asset === 'bch' ? 'BCH' : 'LIFT' }}
                  <span class="elite-row-tx">{{ formatTxDisplay(item.txId) }}</span>
                </div>
                <div class="elite-row-sub">{{ formatDateLocaleRelative(item.date, false) }}</div>
              </div>
              <div class="elite-row-side">
                <div class="elite-row-amt">+{{ item.asset === 'bch' ? formatBch(item.amount) : formatLift(item.amount) }} {{ item.asset === 'bch' ? 'BCH' : 'LIFT' }}</div>
              </div>
            </div>
          </template>
        </transaction-list>
      </template>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { formatDateLocaleRelative } from 'src/utils/time'
import { formatWithLocale } from 'src/utils/denomination-utils'
import { LIFT_TOKEN_DECIMALS } from 'src/utils/subscription-utils'
import { getEliteProgramPageData } from 'src/utils/engagementhub-utils/rewards'

import HeaderNav from 'src/components/header-nav.vue'
import ErrorCard from 'src/components/rewards/cards/ErrorCard.vue'
import TransactionList from 'src/components/rewards/transactions/TransactionList.vue'

export default {
  name: 'EliteProgram',

  components: {
    HeaderNav,
    ErrorCard,
    TransactionList
  },

  data () {
    return {
      isLoading: false,
      pointsError: '',
      dataError: '',

      eliteData: null,
      transactions: [],
      topups: [],

      limit: 20,
      offset: 0,
      hasMoreTransactions: false,
      loadingMore: false,

      txEmptyState: {
        title: 'No eligible transactions yet',
        description: 'Your LIFT cashbacks from eligible OTC and marketplace purchases will appear here.'
      },
      topupEmptyState: {
        title: 'No top-ups yet',
        description: 'Your BCH and LIFT top-ups that qualify for the program will appear here.'
      }
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    monthlyPct () {
      const max = this.eliteData?.maxCashbackPerMonth || 0
      const current = this.eliteData?.monthlyCashback || 0
      return max > 0 ? Math.min(current / max, 1) : 0
    },
    formattedCashback () {
      const amount = this.eliteData?.cashbackLift ?? 0
      return formatWithLocale(amount, { min: LIFT_TOKEN_DECIMALS, max: LIFT_TOKEN_DECIMALS })
    },
    formattedMonthlyCashback () {
      const amount = this.eliteData?.monthlyCashback ?? 0
      return `₱ ${amount.toLocaleString()}`
    }
  },

  async mounted () {
    await this.loadData()
  },

  methods: {
    getDarkModeClass,
    formatDateLocaleRelative,

    async loadData (append = false) {
      if (!append) this.isLoading = true
      this.pointsError = ''
      this.dataError = ''

      try {
        const data = await getEliteProgramPageData()
        if (data) {
          this.eliteData = data
          this.transactions = data.transactions || []
          this.topups = data.topups || []

          const fetchedCount = this.transactions.length
          this.hasMoreTransactions = fetchedCount >= this.limit
        } else {
          this.dataError = 'Failed to load elite program data'
        }
      } catch (error) {
        console.error('Error loading elite program data: ', error)
        this.pointsError = 'Failed to load elite program data'
      }

      if (!append) this.isLoading = false
    },

    async refreshData (done) {
      this.offset = 0
      await this.loadData()
      if (done) done()
    },

    async loadMoreTransactions () {
      this.loadingMore = true
      this.offset += this.limit
      await this.loadData(true)
      this.loadingMore = false
    },

    formatTxDisplay (txId) {
      if (!txId) return ''
      if (txId.length <= 12) return txId
      return `${txId.substring(0, 6)}…${txId.substring(txId.length - 4)}`
    },

    formatBch (amount) {
      return formatWithLocale(amount ?? 0, { min: 0, max: 8 })
    },

    formatLift (amount) {
      return formatWithLocale(amount ?? 0, { min: 0, max: LIFT_TOKEN_DECIMALS })
    }
  }
}
</script>

<style lang="scss" scoped>
.hero-card {
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(212, 166, 67, 0.16) 0%, rgba(212, 166, 67, 0.04) 100%);
  border: 1px solid rgba(212, 166, 67, 0.35);

  &.dark {
    background: linear-gradient(135deg, rgba(212, 166, 67, 0.28) 0%, rgba(212, 166, 67, 0.06) 100%);
    border: 1px solid rgba(212, 166, 67, 0.45);
  }
}

/* Hero icon always gold, overriding any theme color applied to q-icon */
.hero-card :deep(.elite-icon) {
  color: #d4a643 !important;
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

/* Elite title always gold, overriding `.group-currency .text-token` theme colors */
.elite-name {
  color: #d4a643 !important;
  font-weight: 700 !important;
  font-size: 15px;
}

/* Elite status pill */
.elite-pill {
  font-size: 9px;
  letter-spacing: 1.5px;
  font-weight: 800;
  color: #fff;
  border-radius: 6px;
  padding: 3px 7px;
  text-transform: uppercase;
  flex-shrink: 0;

  &.active { background: #d4a643; color: #3a3325; }
}

/* Elite stat boxes (active state) */
.elite-stat-box {
  background: rgba(212, 166, 67, 0.15);
  border: 1px dashed rgba(212, 166, 67, 0.5);
  padding: 10px 12px;
  text-align: center;
}

.elite-stat-value {
  font-size: 16px;
  font-weight: 800;
  color: #d4a643;
}

/* Section header */
.section-head {
  display: flex;
  align-items: center;
}

.section-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #d4a643;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  margin-right: 8px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
}

/* Elite list rows */
.elite-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  min-height: 72px;
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba(212, 166, 67, 0.05);
  }

  .dark &:hover {
    background: rgba(212, 166, 67, 0.1);
  }
}

.elite-row-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(212, 166, 67, 0.15);
  color: #d4a643;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.elite-row-main {
  flex: 1;
  min-width: 0;
}

.elite-row-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #d4a643;
}

.elite-row-tx {
  font-weight: 500;
  color: #6b6b7b;
  font-size: 12px;
  margin-left: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
}

.dark .elite-row-tx {
  color: #9a97ad;
}

.elite-row-sub {
  font-size: 11px;
  color: #6b6b7b;
  margin-top: 2px;
}

.dark .elite-row-sub {
  color: #9a97ad;
}

.elite-row-side {
  text-align: right;
  flex-shrink: 0;
}

.elite-row-amt {
  font-size: 13px;
  font-weight: 800;
  color: #d4a643;
}

.elite-row-bch {
  font-size: 10.5px;
  color: #6b6b7b;
  margin-top: 2px;
}

.dark .elite-row-bch {
  color: #9a97ad;
}
</style>