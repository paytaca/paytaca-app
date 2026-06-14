<template>
  <div class="peer-info" :class="{ 'peer-info--right-aligned': alignRight }">
    <div v-if="showName" class="peer-info__name-row" :class="{ 'reported-greyed': isReported }">
      <q-btn
        v-if="clickableName"
        flat
        no-caps
        dense
        :padding="namePadding || 'none'"
        color="primary"
        class="q-py-none q-my-none lg-font-size text-weight-bold"
        :class="{ 'sm-font-size': !largeName }"
        @click="$emit('click-name', peer?.id)"
      >
        {{ truncateName ? userName(peer?.name) : peer?.name }}
      </q-btn>
      <span v-else class="text-weight-bold" :class="largeName ? 'lg-font-size' : 'sm-font-size'">
        {{ truncateName ? userName(peer?.name) : peer?.name }}
      </span>
      <q-icon
        v-if="showOnlineStatus"
        class="q-ml-xs"
        size="1em"
        :color="onlineStatusColor"
        :name="onlineStatusColor === 'orange' ? 'bedtime' : 'circle'"
      />
      <q-badge
        v-if="showReportedBadge && isReported"
        class="q-ml-xs"
        rounded
        size="xs"
        color="red"
        label="Reported"
      />
    </div>
    <div v-if="showRating" class="row" :class="[alignRight ? 'justify-end' : '', { 'reported-greyed': isReported }]">
      <q-rating
        readonly
        :model-value="peer?.rating || 0"
        size="1em"
        color="yellow-9"
        icon="star"
        icon-half="star_half"
        @click="$emit('click-reviews')"
      />
      <span class="q-mx-xs sm-font-size">({{ peer?.rating?.toFixed(1) || 0 }})</span>
    </div>
    <div v-if="showTradeStats" class="sm-font-size" :class="{ 'reported-greyed': isReported }">
      <span class="text-green">
        {{ $t('TradesCompleted', { count: peer?.completed_trades ?? 0 }) }}
      </span>
      <span> &middot; </span>
      <span class="text-red">
        {{ $t('TradesFailed', { count: peer?.failed_trades ?? 0 }) }}
      </span>
      <span> &middot; </span>
      <span>
        {{ $t('CompletionPercentage', { percentage: formatCompletionRate(peer?.completion_rate) }) }}
      </span>
    </div>
    <div v-if="showLastOnline && peer?.last_online_at && peer?.is_online === false" :class="alignRight ? 'row xs-font-size text-grey text-right' : 'row xs-font-size text-grey'">
      <span :class="{ 'col': alignRight }" :style="alignRight ? 'text-align: right' : ''">Online {{ formatLastOnline(peer?.last_online_at) }}</span>
    </div>
    <div v-else-if="showLastOnline && !peer?.last_online_at" :class="alignRight ? 'row xs-font-size text-grey text-right' : 'row xs-font-size text-grey'">
      <span :class="{ 'col': alignRight }" :style="alignRight ? 'text-align: right' : ''">Offline for a long time</span>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { formatCurrency, formatDate } from 'src/exchange'

export default {
  emits: ['click-name', 'click-reviews'],
  props: {
    peer: {
      type: Object,
      default: null
    },
    showName: {
      type: Boolean,
      default: true
    },
    showOnlineStatus: {
      type: Boolean,
      default: true
    },
    showRating: {
      type: Boolean,
      default: true
    },
    showTradeStats: {
      type: Boolean,
      default: true
    },
    showLastOnline: {
      type: Boolean,
      default: true
    },
    showReportedBadge: {
      type: Boolean,
      default: true
    },
    clickableName: {
      type: Boolean,
      default: true
    },
    truncateName: {
      type: Boolean,
      default: false
    },
    largeName: {
      type: Boolean,
      default: true
    },
    alignRight: {
      type: Boolean,
      default: false
    },
    namePadding: {
      type: String,
      default: 'none'
    }
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  computed: {
    isReported () {
      return this.isPeerReported(this.peer?.reported_at)
    },
    onlineStatusColor () {
      if (this.peer?.is_online) return 'green'
      return 'grey-5'
    }
  },
  methods: {
    getDarkModeClass,
    formatDate,
    formatCurrency,
    formatCompletionRate (value) {
      return Math.floor(value || 0).toString()
    },
    isPeerReported (reportedAt) {
      if (!reportedAt) return false
      return Date.now() - new Date(reportedAt).getTime() < 24 * 60 * 60 * 1000
    },
    userName (name) {
      if (!name) return ''
      const maxLength = 15
      if (name.length > maxLength) return name.substring(0, maxLength) + '...'
      return name
    },
    formatLastOnline (date) {
      return this.formatDate(date, true).toLowerCase()
    }
  }
}
</script>

<style scoped>
  .peer-info__name-row {
    display: flex;
    align-items: center;
  }
  .reported-greyed {
    filter: grayscale(1);
    opacity: 0.4;
    user-select: none;
    pointer-events: none;
  }
  .xs-font-size {
    font-size: smaller;
  }
  .sm-font-size {
    font-size: small;
  }
  .lg-font-size {
    font-size: large;
  }
</style>