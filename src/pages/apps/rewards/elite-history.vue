<template>
  <div id="app-container" class="sticky-header-container text-bow" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      title="Paytaca Elite"
    />

    <h5
      class="q-ma-none q-px-md text-primary text-weight-bold text-center"
      style="color: #d4a643 !important;"
    >
      Transactions History
    </h5>

    <div class="q-px-md q-pt-md">
      <error-card
        v-if="dataError"
        :is-points-card="false"
        :is-rewards-home-page="false"
        :error-text="dataError"
        @on-retry="loadTab(activeTab)"
      />

      <template v-else>
        <!-- Tab-aware summary -->
        <q-card
          class="summary-card q-mb-md"
          :class="[getDarkModeClass(darkMode), { 'summary-anim': !isActiveLoading }]"
          flat
        >
          <q-card-section class="q-py-sm q-px-md">
            <template v-if="isActiveLoading">
              <div class="text-center q-mb-md">
                <q-skeleton type="text" width="40%" height="22px" class="q-mx-auto" />
                <q-skeleton type="text" width="25%" class="q-mx-auto" />
              </div>
              <div class="row">
                <div class="col text-center" v-for="n in 2" :key="`stat-skeleton-${n}`">
                  <q-skeleton type="text" width="60%" class="q-mx-auto" />
                  <q-skeleton type="text" width="40%" class="q-mx-auto" />
                </div>
              </div>
            </template>

            <template v-else>
              <div class="text-center q-mb-sm">
                <div class="summary-value summary-value-lg">
                  <template v-if="activeTab === 'transactions'">{{ summary.transactions.eligibleTxCount }}</template>
                  <template v-else>{{ summary.topups.totalCount }}</template>
                </div>
                <div class="text-caption summary-label">
                  {{ activeTab === 'transactions' ? 'Eligible transactions' : 'Total top-ups' }}
                </div>
              </div>

              <q-separator class="summary-separator" />

              <div class="row">
                <div class="col text-center">
                  <div class="summary-value">
                    {{ parseFiatCurrencyWrapper(
                      activeTab === 'transactions' ? summary.transactions.totalFiatCashback : summary.topups.totalFiatTopUp
                      ) }}
                  </div>
                  <div class="text-caption summary-label">
                    {{ activeTab === 'transactions' ? 'Total cashback' : 'Total top-ups' }}
                  </div>
                </div>
                <div class="col text-center">
                  <div class="summary-value">
                    {{ parseLiftToken(
                      activeTab === 'transactions' ? summary.transactions.totalCashbackLift : summary.topups.totalTopUp
                      ) }}
                  </div>
                  <div class="text-caption summary-label">
                    {{ activeTab === 'transactions' ? 'LIFT cashback' : 'LIFT top-ups' }}
                  </div>
                </div>
              </div>
            </template>
          </q-card-section>
        </q-card>

        <div class="tabs-wrapper q-mt-sm q-mb-md" :class="getDarkModeClass(darkMode)">
          <div class="elite-tabs q-pa-xs" :class="getDarkModeClass(darkMode)">
            <button
              class="elite-tab text-bow"
              :class="[getDarkModeClass(darkMode), { 'active-tab': activeTab === 'transactions' }]"
              @click="activeTab = 'transactions'"
            >
              Eligible Transactions
            </button>
            <button
              class="elite-tab text-bow"
              :class="[getDarkModeClass(darkMode), { 'active-tab': activeTab === 'topups' }]"
              @click="activeTab = 'topups'"
            >
              Top-ups
            </button>
          </div>
        </div>

        <q-tab-panels v-model="activeTab" animated>
          <q-tab-panel name="transactions" class="q-pa-none">
            <elite-list
              type="transactions"
              :items="transactions"
              :loading="isLoadingTx"
              :loading-more="loadingMoreTx"
              :has-more="hasMoreTransactions"
              :dark-mode="darkMode"
              :pull-to-refresh="false"
              @load-more="loadMoreTx"
            />
          </q-tab-panel>

          <q-tab-panel name="topups" class="q-pa-none">
            <elite-list
              type="topups"
              :items="topups"
              :loading="isLoadingTopups"
              :loading-more="loadingMoreTopups"
              :has-more="hasMoreTopups"
              :dark-mode="darkMode"
              :pull-to-refresh="false"
              @load-more="loadMoreTopups"
            />
          </q-tab-panel>
        </q-tab-panels>
      </template>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  getEliteProgramHistorySummaryData,
  getEliteProgramTransactionsData,
  getEliteProgramTopupsData
} from 'src/utils/engagementhub-utils/rewards'
import { parseLiftToken } from 'src/utils/engagementhub-utils/shared'
import { parseFiatCurrencyWrapper } from 'src/utils/denomination-utils'

import HeaderNav from 'src/components/header-nav.vue'
import ErrorCard from 'src/components/rewards/cards/ErrorCard.vue'
import EliteList from 'src/components/rewards/transactions/EliteList.vue'

const TABS = new Set(['transactions', 'topups'])

export default {
  name: 'EliteHistory',

  components: {
    HeaderNav,
    ErrorCard,
    EliteList
  },

  data () {
    return {
      limit: 10,
      eliteId: -1,
      transactions: [],
      topups: [],
      offsetTx: 0,
      offsetTopups: 0,
      hasMoreTransactions: false,
      hasMoreTopups: false,
      loadingMoreTx: false,
      loadingMoreTopups: false,
      isLoadingTx: false,
      isLoadingTopups: false,
      dataError: '',
      summary: {
        transactions: { totalCashbackLift: 0, eligibleTxCount: 0, totalFiatCashback: 0 },
        topups: { totalCount: 0, totalTopUp: 0, totalFiatTopUp: 0 }
      }
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    activeTab: {
      get () {
        const tab = this.$route.params.tab
        return TABS.has(tab) ? tab : 'transactions'
      },
      set (tab) {
        if (tab !== this.activeTab) this.$router.replace(`/apps/rewards/elite-history/${this.eliteId}/${tab}`)
      }
    },
    isActiveLoading () {
      return this.activeTab === 'transactions' ? this.isLoadingTx : this.isLoadingTopups
    }
  },

  async mounted () {
    await this.loadTab(this.activeTab)
  },

  watch: {
    activeTab (tab) {
      if (tab === 'transactions' && !this.transactions.length && !this.isLoadingTx) this.loadTab(tab)
      if (tab === 'topups' && !this.topups.length && !this.isLoadingTopups) this.loadTab(tab)
    }
  },

  methods: {
    getDarkModeClass,
    parseLiftToken,
    parseFiatCurrencyWrapper,

    isTx (type) {
      return type === 'transactions'
    },

    async loadTab (type, append = false) {
      if (!append) {
        if (this.isTx(type)) this.isLoadingTx = true
        else this.isLoadingTopups = true
      }
      this.dataError = ''
      this.eliteId = Number(this.$route.params.id || -1)
      const offset = this.isTx(type) ? this.offsetTx : this.offsetTopups

      try {
        const listPromise = this.isTx(type)
          ? getEliteProgramTransactionsData(this.eliteId, this.limit, offset)
          : getEliteProgramTopupsData(this.eliteId, this.limit, offset)

        let data
        if (!append) {
          const [summaryData, listData] = await Promise.all([
            getEliteProgramHistorySummaryData(this.eliteId),
            listPromise
          ])
          if (summaryData) {
            this.summary = {
              transactions: {
                totalCashbackLift: summaryData.transactions?.total_lift_cashback_received ?? 0,
                eligibleTxCount: summaryData.transactions?.count ?? 0,
                totalFiatCashback: summaryData.transactions?.total_fiat_lift_cashback_received ?? 0
              },
              topups: {
                totalCount: summaryData.topups?.count ?? 0,
                totalTopUp: summaryData.topups?.total_top_up_amount ?? 0,
                totalFiatTopUp: summaryData.topups?.total_fiat_top_up_amount ?? 0
              }
            }
          }
          data = listData
        } else {
          data = await listPromise
        }

        const items = data?.results || []
        const hasMore = offset + items.length < (data?.count || 0)

        if (this.isTx(type)) {
          if (append) this.transactions.push(...items)
          else this.transactions = items
          this.hasMoreTransactions = hasMore
        } else {
          if (append) this.topups.push(...items)
          else this.topups = items
          this.hasMoreTopups = hasMore
        }
      } catch (error) {
        console.error('Error loading elite history: ', error)
        this.dataError = 'Failed to load Elite history. Please try again later.'
      }

      if (!append) {
        if (this.isTx(type)) this.isLoadingTx = false
        else this.isLoadingTopups = false
      }
    },

    loadMoreTx () {
      this.loadingMoreTx = true
      this.offsetTx += this.limit
      this.loadTab('transactions', true).finally(() => { this.loadingMoreTx = false })
    },

    loadMoreTopups () {
      this.loadingMoreTopups = true
      this.offsetTopups += this.limit
      this.loadTab('topups', true).finally(() => { this.loadingMoreTopups = false })
    }
  }
}
</script>

<style lang="scss" scoped>
.tabs-wrapper {
  display: flex;
  justify-content: center;
}

.elite-tabs {
  display: inline-flex;
  gap: clamp(4px, 1.5vw, 8px);
  background-color: rgb(242, 243, 252);
  border-radius: 24px;
  padding: 4px;
  max-width: 100%;
  box-sizing: border-box;

  &.dark {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.elite-tab {
  min-width: clamp(80px, 22vw, 110px);
  height: 40px;
  border-radius: 20px;
  border: none;
  background-color: transparent;
  outline: 0;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
  font-size: clamp(12px, 3vw, 14px);
  padding: 0 clamp(12px, 4vw, 20px);
  flex: 1 1 auto;

  &:hover:not(.active-tab) {
    background-color: rgba(0, 0, 0, 0.05);
  }

  &.dark {
    color: rgba(255, 255, 255, 0.7);

    &:hover:not(.active-tab) {
      background-color: rgba(255, 255, 255, 0.08);
    }
  }

  &.active-tab {
    background-color: #d4a643;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(120, 90, 20, 0.2);

    &.light {
      color: white;
    }
    &.dark {
      color: black;
    }
  }
}

.summary-card {
  border-radius: 16px;
  border: 1px dashed rgba(212, 166, 67, 0.5);
  background: linear-gradient(135deg, rgba(212, 166, 67, 0.12) 0%, rgba(212, 166, 67, 0.04) 100%);
  box-shadow: 0 4px 16px rgba(120, 90, 20, 0.12);

  &.dark {
    background: linear-gradient(135deg, rgba(212, 166, 67, 0.22) 0%, rgba(212, 166, 67, 0.06) 100%);
    border: 1px dashed rgba(212, 166, 67, 0.6);
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
  }

  .summary-value {
    font-size: 16px;
    font-weight: 800;
    color: #d4a643;
  }

  .summary-value-lg {
    font-size: 19px;
    font-weight: 800;
    color: #d4a643;
  }

  .light & .summary-value,
  .light & .summary-value-lg {
    color: #c89d36;
  }

  .summary-label {
    margin-top: 3px;
  }

  .summary-separator {
    background: rgba(212, 166, 67, 0.35);
    margin-top: 7px;
    margin-bottom: 7px;
    position: relative;
    overflow: hidden;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 45%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
      animation: summary-separator-glimmer 2.6s ease-in-out 0.7s infinite;
      pointer-events: none;
    }
  }

  .dark & .summary-separator::after {
    background: linear-gradient(90deg, transparent, rgba(212, 166, 67, 0.35), transparent);
  }

  /* Fade & Rise once on load */
  &.summary-anim {
    animation: summary-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
}

@keyframes summary-rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes summary-separator-glimmer {
  0% {
    transform: translateX(-120%);
  }
  55% {
    transform: translateX(320%);
  }
  100% {
    transform: translateX(320%);
  }
}
</style>