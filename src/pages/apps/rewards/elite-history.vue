<template>
  <div id="app-container" class="sticky-header-container text-bow" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      title="Paytaca Elite"
    />

    <h5 class="q-ma-none q-px-md text-primary text-weight-bold text-center">
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
        <div class="summary-card q-mb-md">
          <template v-if="isActiveLoading">
            <div class="row">
              <div class="col text-center q-pa-sm" v-for="n in 3" :key="`stat-skeleton-${n}`">
                <q-skeleton type="text" width="60%" class="q-mx-auto" />
                <q-skeleton type="text" width="40%" class="q-mx-auto" />
              </div>
            </div>
          </template>

          <template v-else>
            <div class="row">
              <div class="col text-center q-pa-sm">
                <div class="summary-value">{{ activeTab === 'transactions' ? `${summary.transactions.totalCashbackLift} LIFT` : summary.topups.totalCount }}</div>
                <div class="text-caption summary-label">{{ activeTab === 'transactions' ? 'Total cashback' : 'Total top-ups' }}</div>
              </div>
              <div class="col text-center q-pa-sm">
                <div class="summary-value">
                  <template v-if="activeTab === 'transactions'">{{ summary.transactions.eligibleTxCount }}</template>
                  <template v-else><bch-amount :amount="getAssetDenomination('BCH', summary.topups.totalBch, false, true)" symbol="BCH" /></template>
                </div>
                <div class="text-caption summary-label">{{ activeTab === 'transactions' ? 'Eligible transactions' : 'BCH top-ups' }}</div>
              </div>
              <div class="col text-center q-pa-sm">
                <div class="summary-value">
                  <template v-if="activeTab === 'transactions'"><bch-amount :amount="getAssetDenomination('BCH', summary.transactions.totalBchSpent, false, true)" symbol="BCH" /></template>
                  <template v-else>{{ summary.topups.totalLift }} LIFT</template>
                </div>
                <div class="text-caption summary-label">{{ activeTab === 'transactions' ? 'BCH spent' : 'LIFT top-ups' }}</div>
              </div>
            </div>
          </template>
        </div>

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
import { getEliteProgramHistoryData } from 'src/utils/engagementhub-utils/rewards'
import { sleep } from '@walletconnect/utils'

import HeaderNav from 'src/components/header-nav.vue'
import ErrorCard from 'src/components/rewards/cards/ErrorCard.vue'
import EliteList from 'src/components/rewards/transactions/EliteList.vue'
import BchAmount from 'src/components/common/BchAmount.vue'
import { getAssetDenomination } from 'src/utils/denomination-utils'

const TABS = ['transactions', 'topups']

export default {
  name: 'EliteHistory',

  components: {
    HeaderNav,
    ErrorCard,
    EliteList,
    BchAmount
  },

  data () {
    return {
      limit: 10,
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
        transactions: { totalCashbackLift: 0, eligibleTxCount: 0, totalBchSpent: 0 },
        topups: { totalCount: 0, totalBch: 0, totalLift: 0 }
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
        return TABS.includes(tab) ? tab : 'transactions'
      },
      set (tab) {
        if (tab !== this.activeTab) this.$router.replace(`/apps/rewards/elite-history/${tab}`)
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
    getAssetDenomination,

    isTx (type) {
      return type === 'transactions'
    },

    async loadTab (type, append = false) {
      if (!append) {
        if (this.isTx(type)) this.isLoadingTx = true
        else this.isLoadingTopups = true
      }
      this.dataError = ''

      try {
        const data = await getEliteProgramHistoryData({
          type,
          limit: this.limit,
          offset: this.isTx(type) ? this.offsetTx : this.offsetTopups
        })
        if (data) {
          this.summary = data.summary
          const items = data.items || []
          if (this.isTx(type)) {
            if (append) this.transactions.push(...items)
            else this.transactions = items
            this.hasMoreTransactions = data.hasMore
          } else {
            if (append) this.topups.push(...items)
            else this.topups = items
            this.hasMoreTopups = data.hasMore
          }
        } else {
          this.dataError = 'Failed to load Elite history. Please try again later.'
        }
      } catch (error) {
        console.error('Error loading elite history: ', error)
        this.dataError = 'Failed to load Elite history. Please try again later.'
      }

      await sleep(600)
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
  background: rgba(212, 166, 67, 0.1);

  .summary-value {
    font-size: 16px;
    font-weight: 800;
    color: #d4a643;
  }

  .light & .summary-value {
    color: #c89d36;
  }
}
</style>