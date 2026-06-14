<template>
  <q-card flat bordered :dark="darkMode" class="text-bow br-15 q-mt-md">
    <q-card-section bordered class="pt-card" :class="getDarkModeClass(darkMode)" style="overflow-x: auto;">
      <div v-if="type !== 'appeal'">
        <div class="xs-font-size">{{ tradeTypeLabel() }}</div>
        <div class="row justify-end">
          <div class="col q-py-none">
            <PeerInfo
              :peer="counterparty"
              @click-name="onViewPeer"
              @click-reviews="onViewReviews"
            />
          </div>
        </div>
      </div>
      <div v-else>
        <div class="row justify-between no-wrap">
          <div class="col-auto">
            <div class="sm-font-size">{{ ad?.trade_type === 'SELL'? $t('Buyer') : $t('Seller') }}</div>
            <PeerInfo
              :peer="orderOwner"
              :show-trade-stats="false"
              :show-reported-badge="false"
              @click-name="onViewPeer"
              @click-reviews="onViewReviews"
            />
          </div>
          <div class="col-auto text-right">
            <div class="sm-font-size">{{ ad.trade_type === 'SELL' ? $t('Seller') : $t('Buyer') }}</div>
            <PeerInfo
              :peer="adOwner"
              :show-trade-stats="false"
              :show-reported-badge="false"
              :align-right="true"
              @click-name="onViewPeer"
              @click-reviews="onViewReviews"
            />
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
import PeerInfo from 'src/components/ramp/fiat/PeerInfo.vue'

export default {
  components: { PeerInfo },
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
    counterpartyPeerData: {
      type: Object,
      default: null
    },
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
      const order = this.order
      const user = this.userInfo
      if (!order?.members || !user?.id) return null
      const counterparty = order.members.buyer?.id === user.id ? order.members.seller : order.members.buyer
      if (this.counterpartyPeerData) {
        return { ...counterparty, ...this.counterpartyPeerData }
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
