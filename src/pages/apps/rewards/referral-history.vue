<template>
  <div id="app-container" class="sticky-header-container text-bow" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      :title="`RF ${$t('Promo')}`"
    />

    <h5 class="q-ma-none q-px-md text-primary text-weight-bold text-center">
      {{ $t('ReferralHistory') }}
    </h5>

    <div class="q-px-md q-pt-md">
      <!-- Summary Section -->
      <q-card
        class="q-mb-md summary-card"
        :class="getDarkModeClass(darkMode)"
        flat
      >
        <q-card-section class="q-pa-sm">
          <template v-if="isLoading">
            <div class="row q-col-gutter-md">
              <div class="col text-center" v-for="n in 3" :key="`stat-skeleton-${n}`">
                <q-skeleton type="text" width="60px" class="q-mx-auto" />
                <q-skeleton type="text" width="40px" class="q-mx-auto" />
              </div>
            </div>
          </template>

          <template v-else>
            <div class="row">
              <div class="col text-center q-pa-sm">
                <div class="text-h6 text-bold text-primary">{{ summaryStats.total_count }}</div>
                <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                  {{ $t('Total') }}
                </div>
              </div>
              <div class="col text-center q-pa-sm">
                <div class="text-h6 text-bold text-positive">{{ summaryStats.completed_count }}</div>
                <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                  {{ $t('Completed') }}
                </div>
              </div>
              <div class="col text-center q-pa-sm">
                <div class="text-h6 text-bold text-warning">{{ summaryStats.pending_count }}</div>
                <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                  {{ $t('Pending') }}
                </div>
              </div>
            </div>

            <q-separator class="q-my-sm" />

            <div class="row items-center justify-center q-gutter-sm">
              <q-icon name="group" color="primary" size="sm" />
              <span class="text-subtitle1 text-weight-medium">
                {{
                  summaryStats.points_earned === 1
                    ? $t('CountPointsEarned', { points: summaryStats.points_earned })
                    : $t('CountPointEarned', { point: summaryStats.points_earned })
                }}
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
        <div class="pt-header sticky-filters-wrapper" :class="getDarkModeClass(darkMode)">
          <!-- Filter Tabs -->
          <div class="flex justify-center">
            <div class="filter-tabs" :class="getDarkModeClass(darkMode)">
              <button
                v-for="tab in filterTabs"
                :key="tab.value"
                class="filter-tab"
                :class="[darkMode ? 'dark' : '', { 'tab-active': activeFilterTab === tab.value }]"
                @click="setFilterTab(tab.value)"
              >
                {{ $t(tab.label) }}
              </button>
            </div>
          </div>

          <!-- Sort Toggle -->
          <div class="row items-center justify-between q-mt-xs">
            <span class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
              {{
                displayCount === 1
                  ? $t('ShowingCountTransactions', { displayCount })
                  : $t('ShowingCountTransaction', { displayCount })
              }}
            </span>
            <q-btn
              flat
              dense
              size="sm"
              :icon="sortDesc ? 'arrow_downward' : 'arrow_upward'"
              :label="sortDesc ? $t('Newest') : $t('Oldest')"
              :class="darkMode ? 'text-grey-5' : 'text-grey-7'"
              @click="toggleSort"
            />
          </div>
        </div>

        <!-- Referral List -->
        <transaction-list
          :items="sortedReferrals"
          :loading="isLoading"
          :loading-more="loadingMore"
          :has-more="hasMoreData"
          :dark-mode="darkMode"
          :empty-state="emptyState"
          :include-separator="false"
          @refresh="refreshData"
          @load-more="loadMore"
        >
          <template #item="{ item }">
            <achievement-card>
              <template #achievement-card-content>
                <q-card-section class="q-py-md">
                  <div class="row items-center q-gutter-sm">
                    <achievement-icon
                      :complete="item.has_transacted"
                      :dark-mode-class="getDarkModeClass(darkMode)"
                    />
                    <div class="col">
                      <div class="row items-center">
                        <div class="text-subtitle1 text-weight-medium" style="line-height: normal;">
                          {{ formatWalletHashDisplay(item.wallet_hash) }}
                        </div>
                        <q-btn
                          flat
                          dense
                          round
                          size="xs"
                          icon="content_copy"
                          class="copy-hash-btn"
                          @click="copyWalletHash(item.wallet_hash)"
                        />
                      </div>
                      <div class="row items-center" style="line-break: anywhere;">
                        <span class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                          {{ formatDateLocaleRelative(item.date_created, false) }}
                        </span>
                      </div>
                      <div class="row items-center q-mt-xs">
                        <q-badge
                          v-if="item.has_transacted"
                          dense
                          color="positive"
                          :label="$t('Transacted')"
                          class="q-px-sm q-py-xs text-caption text-black"
                        />
                        <q-badge
                          v-else
                          dense
                          color="warning"
                          :label="$t('Pending')"
                          class="q-px-sm q-py-xs text-caption text-black"
                        />
                      </div>
                    </div>
                    <points-badge
                      :complete="item.has_transacted"
                      :dark-mode-class="getDarkModeClass(darkMode)"
                      :points="10"
                    />
                  </div>
                </q-card-section>
              </template>
            </achievement-card>
          </template>
        </transaction-list>
      </template>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { formatDateLocaleRelative } from 'src/utils/time'
import { fetchRfPromoReferrals } from 'src/utils/engagementhub-utils/rewards'

import HeaderNav from 'src/components/header-nav.vue'
import ErrorCard from 'src/components/rewards/cards/ErrorCard.vue'
import TransactionList from 'src/components/rewards/transactions/TransactionList.vue'
import AchievementCard from 'src/components/rewards/cards/AchievementCard.vue'
import AchievementIcon from 'src/components/rewards/AchievementIcon.vue'
import PointsBadge from 'src/components/rewards/PointsBadge.vue'

export default {
  name: 'ReferralHistory',

  components: {
    HeaderNav,
    ErrorCard,
    TransactionList,
    AchievementCard,
    AchievementIcon,
    PointsBadge
  },

  props: {
    id: { type: String, default: '-1' }
  },

  data() {
    return {
      isLoading: false,
      dataError: '',
      rpId: -1,
      sortDesc: true,
      activeFilterTab: 'all',

      allReferrals: [],
      summaryStats: {
        total_count: 0,
        completed_count: 0,
        pending_count: 0,
        points_earned: 0,
      },

      limit: 20,
      offset: 0,
      hasMoreData: false,
      loadingMore: false,

      emptyState: {
        title: 'ReferralStatusWarningTitle',
        description: 'ReferralStatusWarningBody'
      }
    }
  },

  computed: {
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
    },
    displayCount() {
      return this.sortedReferrals.length
    },
    filterTabs() {
      return [
        { label: 'All', value: 'all' },
        { label: 'Completed', value: 'completed' },
        { label: 'Pending', value: 'pending' }
      ]
    },
    sortedReferrals() {
      const filtered = this.allReferrals.filter(item => {
        if (this.activeFilterTab === 'all') return true
        if (this.activeFilterTab === 'completed') return item.has_transacted
        if (this.activeFilterTab === 'pending') return !item.has_transacted
        return true
      })
      return [...filtered].sort((a, b) => {
        const dateA = new Date(a.date_created)
        const dateB = new Date(b.date_created)
        return this.sortDesc ? dateB - dateA : dateA - dateB
      })
    }
  },

  async mounted() {
    await this.loadData()

    this.$nextTick(() => {
      const headerNavHeight = document.getElementsByClassName('header-nav-wrapper')[0]?.clientHeight || 0
      const stickyFilter = document.getElementsByClassName('sticky-filters-wrapper')[0]
      if (stickyFilter) stickyFilter.style.top = `${headerNavHeight - 1}px`
    })
  },

  methods: {
    getDarkModeClass,
    formatDateLocaleRelative,

    formatWalletHashDisplay(walletHash) {
      const length = walletHash.length
      const prefix = walletHash.substring(0, 5)
      const suffix = walletHash.substring(length - 5, length)
      return `${prefix}...${suffix}`
    },

    copyWalletHash (hash) {
      this.$copyText(hash)
      this.$q.notify({
        color: 'blue-9',
        message: this.$t('CopiedToClipboard'),
        icon: 'mdi-clipboard-check',
        timeout: 200
      })
    },

    async loadData(append = false) {
      if (!append) this.isLoading = true
      this.dataError = ''

      this.rpId = Number(this.$route.params.id || -1)

      try {
        const data = await fetchRfPromoReferrals({
          rp_id: this.rpId,
          limit: this.limit,
          offset: this.offset
        })

        if (data) {
          if (append) {
            this.allReferrals.push(...(data.overall_data || []))
          } else {
            this.allReferrals = data.overall_data || []
          }

          this.summaryStats = {
            total_count: data.total_count,
            completed_count: data.completed_count,
            pending_count: data.pending_count,
            points_earned: data.points_earned
          }

          const fetchedCount = data.overall_data?.length || 0
          this.hasMoreData = fetchedCount >= this.limit
        } else {
          this.dataError = this.$t('ReferralHistoryError')
        }
      } catch (error) {
        console.error('Error loading referral history:', error)
        this.dataError = this.$t('ReferralHistoryError')
      }

      if (!append) this.isLoading = false
    },

    toggleSort() {
      this.sortDesc = !this.sortDesc
    },
    setFilterTab(tab) {
      this.activeFilterTab = tab
    },

    async refreshData(done) {
      this.offset = 0
      await this.loadData()
      if (done) done()
    },

    async loadMore() {
      this.loadingMore = true
      this.offset += this.limit
      await this.loadData(true)
      this.loadingMore = false
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

.copy-hash-btn {
  opacity: 0.4;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }
}

.filter-tabs {
  display: inline-flex;
  gap: 4px;
  background-color: rgb(242, 243, 252);
  border-radius: 24px;
  padding: 4px;

  &.dark {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.filter-tab {
  min-width: 80px;
  height: 36px;
  border-radius: 20px;
  border: none;
  color: #4C4F4F;
  background-color: transparent;
  outline: 0;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
  font-size: 13px;
  padding: 0 16px;

  &:hover:not(.tab-active) {
    background-color: rgba(0, 0, 0, 0.05);
  }

  &.dark {
    color: rgba(255, 255, 255, 0.7);

    &:hover:not(.tab-active) {
      background-color: rgba(255, 255, 255, 0.08);
    }
  }

  &.tab-active {
    background-color: var(--q-primary) !important;
    color: #fff !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
}

.sticky-filters-wrapper {
  position: sticky;
  top: 0;
  z-index: 2900;
  padding: 8px 0;
  margin: 0 -16px 10px -16px;
  padding-left: 16px;
  padding-right: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);

  &.dark {
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  @media (min-width: 600px) {
    margin: 0;
    border-radius: 12px;
    margin-bottom: 8px;
    border-bottom: none;
  }

  @media (max-width: 599px) {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

    &.dark {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
  }
}
</style>
