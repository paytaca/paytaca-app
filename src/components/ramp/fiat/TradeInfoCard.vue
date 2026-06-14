<template>
  <q-card flat bordered :dark="darkMode" class="text-bow br-15 q-mt-md">
    <q-card-section bordered class="pt-card" :class="getDarkModeClass(darkMode)" style="overflow-x: auto;">
      <div v-if="type !== 'appeal'">
        <div class="xs-font-size">{{ tradeTypeLabel() }}</div>
        <div class="row justify-end">
            <div class="col q-py-none">
                <div style="overflow-x: auto; max-width: 200px;">
                  <q-btn flat no-caps dense
                      padding="none"
                      color="primary"
                      class="q-py-none q-my-none lg-font-size text-weight-bold"
                      @click="onViewPeer(counterparty?.id)">
                      {{ counterparty?.name }}
                  </q-btn>
                  <q-icon
                  class="q-ml-xs"
                  size="1em"
                  :color="onlineStatusColor(counterparty)"
                  :name="onlineStatusColor(counterparty) === 'orange' ? 'bedtime' : 'circle'"/>
                  <q-badge class="q-ml-xs" v-if="isReported(counterparty?.reported_at)" rounded size="xs" color="red" label="Reported" />
                </div>
                <div class="row" :class="{ 'reported-greyed': isReported(counterparty?.reported_at) }">
                  <q-rating
                  readonly
                  :model-value="counterparty?.rating || 0"
                  :v-model="counterparty?.rating || 0"
                  size="1em"
                  color="yellow-9"
                  icon="star"
                  icon-half="star_half"
                  @click="onViewReviews"/>
                  <span class="q-mx-xs sm-font-size">({{ counterparty?.rating?.toFixed(1) || 0 }})</span>
                </div>
                <div class="sm-font-size" :class="{ 'reported-greyed': isReported(counterparty?.reported_at) }">
                  <span class="text-green">
                    {{
                      $t(
                        'TradesCompleted',
                        { count: counterparty?.completed_trades },
                        `${ counterparty?.completed_trades || 0 } completed`
                      )
                    }}
                  </span>
                  <span> &middot; </span>
                  <span class="text-red">
                    {{
                      $t(
                        'TradesFailed',
                        { count: counterparty?.failed_trades },
                        `${ counterparty?.failed_trades || 0 } failed`
                      )
                    }}
                  </span>
                  <span> &middot; </span>
                  <span>
                    {{
                      $t(
                        'CompletionPercentage',
                        { percentage: formatCompletionRate(counterparty?.completion_rate) },
                        `${ formatCompletionRate(counterparty?.completion_rate) }% completion`
                      )
                    }}
                  </span>
                </div>
                <div v-if="counterparty && counterparty?.last_online_at && counterparty?.is_online === false" class="row xs-font-size text-grey">
                  Online {{ this.formatDate(counterparty?.last_online_at, true).toLowerCase() }}
                </div>
                <div v-if="!counterparty?.last_online_at" class="row xs-font-size text-grey">
                  Offline for a long time
                </div>
            </div>
        </div>
      </div>
      <div v-else>
        <div class="row justify-between no-wrap">
          <div class="col-auto">
            <div class="sm-font-size">{{ ad?.trade_type === 'SELL'? $t('Buyer') : $t('Seller') }}</div>
            <div class="row justify-end">
                <div class="col q-py-none">
                    <div style="max-width: 200px; overflow-x: auto;">
                      <q-btn flat no-caps dense
                          padding="none"
                          color="primary"
                          class="q-py-none q-my-none lg-font-size text-weight-bold"
                          @click="onViewPeer(orderOwner.id)">
                          {{ orderOwner.name }}
                      </q-btn>
                      <q-icon
                        class="q-ml-xs"
                        size="1em"
                        :color="onlineStatusColor(orderOwner)"
                        :name="onlineStatusColor(orderOwner) === 'orange' ? 'bedtime' : 'circle'"/>
                    </div>
                    <div class="row">
                        <q-rating
                        readonly
                        :model-value="orderOwner.rating || 0"
                        :v-model="orderOwner.rating || 0"
                        size="1em"
                        color="yellow-9"
                        icon="star"
                        @click="onViewReviews"/>
                        <span class="q-mx-xs sm-font-size">({{ orderOwner.rating?.toFixed(1) || 0 }})</span>
                    </div>
                    <div v-if="orderOwner?.last_online_at && orderOwner?.is_online === false" class="row xs-font-size text-grey">
                      Online {{ this.formatDate(orderOwner?.last_online_at, true).toLowerCase() }}
                    </div>
                    <div v-if="!orderOwner?.last_online_at" class="row xs-font-size text-grey">
                      Offline for a long time
                    </div>
                </div>
            </div>
          </div>
          <div class="col-auto text-right">
            <div class="sm-font-size">{{ ad.trade_type === 'SELL' ? $t('Seller') : $t('Buyer') }}</div>
            <div class="row justify-end q-py-none">
              <div style="max-width: 125px; overflow-x: auto;">
                <q-btn
                    flat
                    no-caps
                    dense
                    padding="none"
                    color="primary"
                    class="lg-font-size text-weight-bold"
                    @click="onViewPeer(adOwner.id)">
                    {{ adOwner.name }}
                </q-btn>
                <q-icon
                  class="q-ml-xs"
                  size="1em"
                  :color="onlineStatusColor(adOwner)"
                  :name="onlineStatusColor(adOwner) === 'orange' ? 'bedtime' : 'circle'"/>
              </div>
            </div>
            <div class="row justify-end text-right">
                <q-rating
                readonly
                :model-value="adOwner.rating || 0"
                :v-model="adOwner.rating || 0"
                size="1em"
                color="yellow-9"
                icon="star"
                @click="onViewReviews"/>
                <span class="q-ml-xs sm-font-size">({{ adOwner.rating?.toFixed(1) || 0 }})</span>
            </div>
            <div v-if="adOwner?.last_online_at && adOwner?.is_online === false" class="row xs-font-size text-grey">
              <span class="col" style="text-align: right;">Online {{ this.formatDate(adOwner?.last_online_at, true).toLowerCase() }}</span>
            </div>
            <div v-if="!adOwner?.last_online_at" class="row xs-font-size text-grey text-right">
              <span class="col" style="text-align: right;">Offline for a long time</span>
            </div>
          </div>
        </div>
      </div>
      <div>
        <q-separator class="q-my-sm"/>
        <div v-if="type !== 'appeal'" class="row justify-end">
            <div class="col-auto">
              <!-- Ad price display -->
              <div v-if="type === 'ad'">
                <div class="xs-font-size">{{ $t('Price') }}</div>
                <span
                    class="col-transaction text-uppercase text-weight-bold lg-font-size pt-label"
                    :class="getDarkModeClass(darkMode)">
                    {{ this.ad?.fiat_currency?.symbol }} {{ formatCurrency(ad?.price, this.ad?.fiat_currency?.symbol).replace(/[^\d.,-]/g, '') }}
                </span>
                <span class="sm-font-size q-ml-xs">/BCH </span>
                <q-skeleton
                  v-if="marketPriceLoading"
                  type="text"
                  width="40px"
                  class="q-ml-xs inline-block"
                  style="vertical-align: middle;"
                />
                <span
                  v-else-if="pricePercentage !== null"
                  class="sm-font-size q-ml-xs text-weight-bold cursor-pointer"
                  :class="{
                    'text-green': isPriceUp,
                    'text-red': isPriceDown
                  }">
                  {{ isPriceUp ? '+' : '' }}{{ pricePercentage }}%
                  <q-tooltip>{{ $t('PriceVsMarketTooltip') }}</q-tooltip>
                </span>
              </div>
              <div v-if="type === 'order'">
                <div class="xs-font-size q-mb-sm">{{ $t('Amount', {}, 'Amount') }}</div>
                <div>
                  <span class="col-transaction text-uppercase text-weight-bold lg-font-size pt-label" :class="getDarkModeClass(darkMode)">
                    {{ tradeAmountBCH }}
                  </span>
                  <span class="sm-font-size q-ml-xs">BCH</span>
                </div>
                <div class="md-font-size text-grey" style="margin-top: 2px;">
                  {{ order?.ad?.fiat_currency?.symbol }} {{ tradeAmountFiat }}
                </div>
              </div>
            </div>
            <q-space/>
            <div class="col-auto q-py-sm q-mx-sm">
              <q-btn v-if="type === 'order'|| type === 'appeal'" dense flat padding="none" color="primary" label="view ad" class="sm-font-size" @click="onViewAd"/>
            </div>
        </div>
        <div v-else>
          <div class="row no-wrap justify-between">
            <div class="col-auto">
              <div class="row xs-font-size q-mb-sm">{{ $t('TradeAmount') }}</div>
              <div class="q-mb-none">
                <div>
                  <span class="col-transaction text-uppercase text-weight-bold lg-font-size pt-label" :class="getDarkModeClass(darkMode)">
                    {{ tradeAmountBCH }}
                  </span>
                  <span class="sm-font-size q-ml-xs">BCH</span>
                </div>
                <div class="md-font-size text-grey" style="margin-top: 2px;">
                  {{ order?.ad?.fiat_currency?.symbol }} {{ tradeAmountFiat }}
                </div>
              </div>
            </div>
            <div class="col-auto q-ml-md q-mr-sm text-right">
              <div class="xs-font-size">{{ $t('AdPrice') }}</div>
              <div>
                <span
                    class="col-transaction text-uppercase text-weight-bold lg-font-size pt-label"
                    :class="getDarkModeClass(darkMode)">
                    {{ this.ad?.fiat_currency?.symbol }} {{ formatCurrency(ad?.price, this.ad?.fiat_currency?.symbol).replace(/[^\d.,-]/g, '') }}
                </span>
                <!-- <span class="sm-font-size">/BCH</span> -->
              </div>
              <div class="row justify-end q-mt-none text-right">
                <q-btn style="font-size: smaller;" padding="none" flat no-caps color="primary" @click="onViewAd"> {{ $t('ViewAd') }} </q-btn>
              </div>
            </div>
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bchToFiat, formatCurrency, formatDate, satoshiToBch } from 'src/exchange'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      websocket: null
    }
  },
  emits: ['view-ad', 'view-peer', 'view-reviews'],
  props: {
    order: Object,
    ad: Object,
    marketPrice: {
      type: Number,
      default: 0
    },
    marketPriceLoading: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      default: 'ad'
    }
  },
  async mounted () {
  },
  computed: {
    orderOwner () {
      if (this.ad?.trade_type === 'SELL') {
        return this.order?.members?.buyer
      }
      return this.order?.members?.seller
    },
    adOwner () {
      if (this.ad?.trade_type === 'SELL') {
        return this.order?.members?.seller
      }
      return this.order?.members?.buyer
    },
    userInfo () {
      return this.$store.getters['ramp/getUser']
    },
    tradeAmountBCH () {
      const amount = satoshiToBch(this.order?.trade_amount)
      return String(amount).replace(/[^\d.,-]/g, '')
    },
    tradeAmountFiat () {
      const amount = formatCurrency(bchToFiat(satoshiToBch(this.order?.trade_amount), this.order?.price), this.order?.fiat_currency?.symbol)
      return String(amount).replace(/[^\d.,-]/g, '')
    },
    counterparty () {
      let counterparty = this.ad?.owner
      if (this.order?.is_ad_owner) {
        counterparty = this.order?.owner
      }
      return counterparty
    },
    pricePercentage () {
      if (!this.marketPrice || !this.ad?.price) return null
      const diff = ((this.ad.price - this.marketPrice) / this.marketPrice) * 100
      return diff.toFixed(1)
    },
    isPriceUp () {
      return this.pricePercentage > 0
    },
    isPriceDown () {
      return this.pricePercentage < 0
    }
  },
  methods: {
    formatDate,
    formatCurrency,
    getDarkModeClass,
    onlineStatusColor (peer) {
      if (peer?.is_online) return 'green'
      return 'grey-5'
    },
    getElapsedTimeInHours (date) {
      const givenDateTime = new Date(date)
      const currentDateTime = new Date()
      const diffInMilliseconds = currentDateTime - givenDateTime
      const diffInHours = diffInMilliseconds / (1000 * 60 * 60)
      return diffInHours
    },
    tradeTypeLabel () {
      const order = this.order
      if (!order) return this.$t('TradingWith')
      switch (order.trade_type) {
        case 'BUY':
          if (order.owner.name === this.userInfo.name) {
            return 'Buying From'
          } else {
            return 'Selling To'
          }
        case 'SELL':
          if (order.owner.name === this.userInfo.name) {
            return 'Selling To'
          } else {
            return 'Buying From'
          }
      }
    },
    onViewAd () {
      this.$emit('view-ad')
    },
    onViewPeer (peerId) {
      this.$emit('view-peer', { id: peerId, self: false })
    },
    onViewReviews () {
      this.$emit('view-reviews')
    },
    isReported (reportedAt) {
      if (!reportedAt) return false
      return Date.now() - new Date(reportedAt).getTime() < 24 * 60 * 60 * 1000
    },
    formatCompletionRate (value) {
      return Math.floor(value || 0).toString()
    }
  }
}
</script>
<style scoped>
  .xs-font-size {
    font-size: smaller
  }
  .sm-font-size {
    font-size: small;
  }
  .md-font-size {
    font-size: medium;
  }
  .lg-font-size {
    font-size: large;
  }
  .subtext {
    opacity: .5;
  }
  .reported-greyed {
    filter: grayscale(1);
    opacity: 0.4;
    user-select: none;
    pointer-events: none;
  }
</style>
