<template>
    <q-card flat bordered :dark="darkMode">
        <q-card-section bordered class="pt-card" :class="getDarkModeClass(darkMode)">
        <div class="xs-font-size">Trading with</div>
        <div class="row justify-end">
            <div class="col">
                <q-btn flat no-caps dense
                    padding="none"
                    color="primary"
                    class="q-py-none q-my-none row lg-font-size text-weight-bold"
                    @click="onViewPeer">
                    {{ counterparty.name }}
                </q-btn>
                <div class="row">
                    <q-rating
                    readonly
                    :model-value="ad?.owner?.rating || 0"
                    :v-model="ad?.owner?.rating || 0"
                    size="1em"
                    color="yellow-9"
                    icon="star"
                    @click="onViewReviews"/>
                    <span class="q-mx-xs sm-font-size">({{ ad?.owner?.rating ? ad?.owner?.rating.toFixed(1) : 0 }})</span>
                </div>
            </div>
            <div class="col-auto q-mx-sm">
                <q-btn size="1.2em" padding="none" dense ripple round flat class="button button-icon" icon="forum" @click="onViewChat"/>
            </div>
        </div>
        <q-separator class="q-my-sm"/>
        <div class="row justify-end">
            <div class="col-auto">
                <div class="xs-font-size">Trade Amount</div>
                <span
                    class="col-transaction text-uppercase text-weight-bold lg-font-size pt-label"
                    :class="getDarkModeClass(darkMode)">
                    {{ tradeAmount }}
                </span>
                <span class="sm-font-size q-ml-xs">{{ byFiat ? order?.ad?.fiat_currency?.symbol : 'BCH' }}</span>
            </div>
            <q-space/>
            <div class="col-auto q-py-sm q-mx-sm">
                <q-btn dense flat padding="none" color="primary" label="view ad" class="sm-font-size" @click="onViewAd"/>
            </div>
        </div>
        <q-btn style="font-size: smaller;" padding="none" flat no-caps color="primary" @click="byFiat = !byFiat"> View amount in {{ byFiat ? 'BCH' : order?.ad?.fiat_currency?.symbol }}</q-btn>
        </q-card-section>
    </q-card>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { formatCurrency } from 'src/wallet/ramp'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      byFiat: false
    }
  },
  emits: ['view-ad', 'view-peer', 'view-reviews', 'view-chat'],
  props: {
    order: Object,
    ad: Object
  },
  computed: {
    lockedPrice () {
      return formatCurrency(this.order?.locked_price, this.order?.ad?.fiat_currency?.symbol)
    },
    tradeAmount () {
      let amount = 0
      if (this.byFiat) {
        amount = formatCurrency(Number(this.order.crypto_amount) * Number(this.order.locked_price), this.order?.ad?.fiat_currency?.symbol)
      } else {
        amount = Number(this.order.crypto_amount)
      }
      return amount
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
    getDarkModeClass,
    onViewAd () {
      console.log('onViewAd')
      this.$emit('view-ad')
    },
    onViewPeer () {
      console.log('onViewPeer')
      this.$emit('view-peer', { id: this.counterparty.id, self: false })
    },
    onViewReviews () {
      console.log('onViewReviews')
      this.$emit('view-reviews')
    },
    onViewChat () {
      console.log('onViewChat')
      this.$emit('view-chat')
    }
  }
}
</script>
<style scoped>
.sm-font-size {
  font-size: small;
}
.md-font-size {
  font-size: medium;
}

.lg-font-size {
  font-size: large;
}
</style>
