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
      <div class="q-pa-md" :class="getDarkModeClass(darkMode)">
        <div class="row justify-between items-center">
          <div class="row items-center q-gutter-sm">
            <q-icon name="history" size="28px" class="elite-history-icon" />
            <span class="text-h6 text-weight-bold">Monthly History</span>
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
        <div class="text-caption text-bow-muted q-mt-xs">
          Months with no recorded transactions or cashback are shown as 0.
        </div>
      </div>

      <q-separator />

      <div class="scrollable-content" :class="getDarkModeClass(darkMode)">
        <template v-if="isLoading">
          <q-list>
            <q-item v-for="n in 5" :key="`skeleton-${n}`" class="month-row">
              <q-item-section>
                <div class="row items-center justify-between">
                  <q-skeleton type="text" width="35%" height="16px" />
                  <q-skeleton type="text" width="30%" height="16px" />
                </div>
                <div class="row items-center justify-between q-mt-xs">
                  <q-skeleton type="text" width="25%" height="12px" />
                  <q-skeleton type="text" width="20%" height="12px" />
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </template>

        <error-card
          v-else-if="hasError"
          error-text="Unable to load monthly history."
          @on-retry="fetchMonthlyStats"
        />

        <div v-else-if="months.length === 0" class="empty-state q-pa-xl text-center">
          <q-icon
            name="calendar_month"
            size="64px"
            class="text-bow-muted q-mb-md"
            :class="getDarkModeClass(darkMode)"
          />
          <div class="text-subtitle1 text-bow-muted q-mb-sm">No monthly history yet</div>
          <div class="text-body2 text-bow-muted">
            Your monthly cashback and transaction totals will appear here.
          </div>
        </div>

        <q-list v-else separator class="monthly-list">
          <q-item
            v-for="month in months"
            :key="`${month.year}-${month.month}`"
            class="month-row q-py-sm"
            :class="{ 'month-row--empty': isEmptyMonth(month) }"
          >
            <q-item-section>
              <div class="row items-center justify-between">
                <span class="text-weight-bold">{{ monthLabel(month) }}</span>
                <span class="text-weight-bold">{{ parseLiftToken(month.total_lift_cashback) }}</span>
              </div>
              <div class="row items-center justify-between q-mt-xs">
                <span class="text-caption">{{ transactionCountLabel(month.count) }}</span>
                <span class="text-caption">{{ formatEliteFiat(month.total_fiat_lift_cashback) }}</span>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseLiftToken } from 'src/utils/engagementhub-utils/shared'
import { parseFiatCurrency, parseFiatCurrencyWrapper } from 'src/utils/denomination-utils'
import { getEliteProgramMonthlyStats } from 'src/utils/engagementhub-utils/rewards'
import ErrorCard from 'src/components/rewards/cards/ErrorCard.vue'

export default {
  name: 'EliteMonthlyHistoryDialog',

  components: {
    ErrorCard
  },

  props: {
    eliteId: { type: Number, default: -1 }
  },

  data () {
    return {
      isLoading: false,
      hasError: false,
      months: []
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
    currentYear () {
      return new Date().getUTCFullYear()
    },
    currentMonth () {
      return new Date().getUTCMonth() + 1
    }
  },

  mounted () {
    this.fetchMonthlyStats()
  },

  methods: {
    getDarkModeClass,
    parseLiftToken,

    formatEliteFiat (amount) {
      return this.isNonPhilippineCountry
        ? parseFiatCurrency(amount, 'PHP')
        : parseFiatCurrencyWrapper(amount)
    },

    monthLabel (month) {
      if (month.year === this.currentYear && month.month === this.currentMonth) {
        return 'This month'
      }
      return new Date(Date.UTC(month.year, month.month - 1, 1)).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
      })
    },

    transactionCountLabel (count) {
      return `${count} transaction${count === 1 ? '' : 's'}`
    },

    isEmptyMonth (month) {
      return !month.count
    },

    async fetchMonthlyStats () {
      this.isLoading = true
      this.hasError = false

      try {
        const data = await getEliteProgramMonthlyStats(this.eliteId)
        if (!data) throw new Error('Unable to load monthly history.')
        this.months = data.months || []
      } catch (error) {
        console.error('Failed to fetch Elite Program monthly history:', error)
        this.hasError = true
      } finally {
        this.isLoading = false
      }
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

.elite-history-icon {
  color: #d4a643;

  .light & {
    color: #c89d36;
  }
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  max-height: calc(80dvh - 96px);

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

.month-row {
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.03);

    .dark & {
      background-color: rgba(255, 255, 255, 0.03);
    }
  }
}

.month-row--empty {
  opacity: 0.55;
}
</style>
