<template>
  <q-card flat bordered :dark="darkMode" class="text-bow br-15">
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
                </div>
                <div class="row">
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
            <div class="sm-font-size">{{ ad?.trade_type === 'SELL'? $t('BUYER') : $t('SELLER') }}</div>
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
            <div class="sm-font-size">{{ ad.trade_type === 'SELL' ? $t('SELLER') : $t('BUYER') }}</div>
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
              </div>
              <div v-if="type === 'order'">
                <span class="col-transaction text-uppercase text-weight-bold lg-font-size pt-label" :class="getDarkModeClass(darkMode)">
                  {{ byFiat ? `${order?.ad?.fiat_currency?.symbol} ` : '' }}{{ tradeAmount }}
                </span>
                <span class="sm-font-size q-ml-xs">{{ byFiat ? '' : 'BCH' }}</span>
              </div>
              <div v-if="type === 'order'" class="row q-mt-none">
                <q-btn style="font-size: smaller;" padding="none" flat no-caps color="primary" @click="byFiat = !byFiat">
                  {{
                    $t(
                      'ViewAmountInCurrency',
                      { currency: byFiat ? 'BCH' : order?.ad?.fiat_currency?.symbol },
                      `View amount in ${ byFiat ? 'BCH' : order?.ad?.fiat_currency?.symbol }`
                    )
                  }}
                </q-btn>
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
              <div class="row xs-font-size">{{ $t('TradeAmount') }}</div>
              <div class="q-mb-none">
                <span class="col-transaction text-uppercase text-weight-bold lg-font-size pt-label">
                  {{ byFiat ? `${order?.ad?.fiat_currency?.symbol} ` : '' }}
                </span>
                <span class="col-transaction text-uppercase text-weight-bold lg-font-size pt-label" :class="getDarkModeClass(darkMode)">
                    {{ tradeAmount }}
                </span>
                <span class="sm-font-size q-ml-xs">{{ byFiat ? '' : 'BCH' }}</span>
              </div>
              <div class="row q-mt-none">
                <q-btn style="font-size: smaller;" padding="none" flat no-caps color="primary" @click="byFiat = !byFiat">
                  {{
                    $t(
                      'ViewAmountInCurrency',
                      { currency: byFiat ? 'BCH' : order?.ad?.fiat_currency?.symbol },
                      `View amount in ${ byFiat ? 'BCH' : order?.ad?.fiat_currency?.symbol }`
                    )
                  }}
                </q-btn>
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
      websocket: null,
      byFiat: false
    }
  },
  emits: ['view-ad', 'view-peer', 'view-reviews'],
  props: {
    order: Object,
    ad: Object,
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
    tradeAmount () {
      let amount = 0
      if (this.byFiat) {
        amount = formatCurrency(bchToFiat(satoshiToBch(this.order?.trade_amount), this.order?.price), this.order?.fiat_currency?.symbol)
      } else {
        amount = satoshiToBch(this.order?.trade_amount)
      }
      return String(amount).replace(/[^\d.,-]/g, '')
    },
    counterparty () {
      let counterparty = this.ad?.owner
      if (this.order?.is_ad_owner) {
        counterparty = this.order?.owner
      }
      return counterparty
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
            return 'BUYING FROM'
          } else {
            return 'SELLING TO'
          }
        case 'SELL':
          if (order.owner.name === this.userInfo.name) {
            return 'SELLING TO'
          } else {
            return 'BUYING FROM'
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
</style>
