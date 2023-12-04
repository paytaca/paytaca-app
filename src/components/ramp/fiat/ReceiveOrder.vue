<template>
  <div v-if="isloaded">
    <q-pull-to-refresh @refresh="$emit('refresh')">
      <q-scroll-area
        style="overflow-y:auto;"
        :style="`height: ${ minHeight }px;`">
        <div class="q-mx-lg text-center">
          <div class="lg-font-size bold-text">
            <span>{{ order?.status?.label?.toUpperCase() }}</span>
          </div>
          <div class="text-center subtext md-font-size">ORDER #{{ order.id }}</div>
        </div>
        <div class="q-mx-sm">
          <q-card class="br-15 q-mx-md q-mt-md q-py-sm" bordered flat :class="[ darkMode ? 'pt-dark-card' : '',]">
            <div class="q-mx-lg q-my-xs row justify-between">
              <div>
                <div class="md-font-size">{{ order?.owner?.name }}</div>
                <q-rating
                  readonly
                  :model-value="order?.owner?.rating"
                  :v-model="order.owner?.rating"
                  size="1.1em"
                  color="yellow-9"
                  icon="star"/>
                <span class="q-mx-xs sm-font-size">({{ order.owner.rating ? parseFloat(order.owner.rating).toFixed(1) : 0 }})</span>
              </div>
              <div class="q-my-sm">
                <q-btn unelevated ripple dense size="md" icon="message"/>
              </div>
            </div>
            <q-separator class="q-my-sm" :dark="darkMode"/>
            <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
              <span>Locked Price</span>
              <span class="text-nowrap q-ml-xs">{{ price }}/{{ order.crypto_currency.symbol }}</span>
            </div>
            <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
              <span>Min Trade Limit</span>
              <span class="text-nowrap q-ml-xs">
                {{ parseFloat($parent.getAdLimits.floor) }} BCH
              </span>
            </div>
            <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
              <span>Max Trade Limit</span>
              <span class="text-nowrap q-ml-xs">
                {{ parseFloat($parent.getAdLimits.ceiling) }} BCH
              </span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
              <span>Time Limit</span>
              <span class="text-nowrap q-ml-xs">{{ formattedPlt(order.ad.time_duration).label }} </span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg bold-text" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
              <span>Status</span>
              <span class="text-nowrap q-ml-xs" :class="order.status.label.toLowerCase().includes('released') ? 'text-green-6' : 'text-orange-6'">{{ order.status.label }}</span>
            </div>
          </q-card>
        </div>

        <div class="q-mt-md q-mx-lg q-px-md">
          <div class="sm-font-size q-pb-xs">Amount</div>
          <q-input
            class="q-pb-xs"
            readonly
            filled
            :dark="darkMode"
            v-model="amount">
            <template v-slot:append>
              <span class="lg-font-size">{{ byFiat ? order.fiat_currency.symbol : order.crypto_currency.symbol }}</span>
            </template>
          </q-input>
          <q-btn
            class="sm-font-size"
            padding="none"
            flat
            no-caps
            color="primary"
            @click="byFiat = !byFiat">
            View amount in {{ byFiat ? 'BCH' : order.fiat_currency.symbol }}
          </q-btn>
          <div class="no-wrap sm-font-size subtext q-pt-sm">
            <span>Balance: </span>
            <span class="text-nowrap q-ml-xs">
              {{ $parent.bchBalance }} BCH
            </span>
          </div>
        </div>
        <div class="row q-pt-md q-mx-lg q-px-md">
          <q-btn
            rounded
            no-caps
            label='CONFIRM'
            class="q-space text-white"
            color="blue-6"
            @click="$emit('confirm')"
          />
        </div>
        <div class="row q-pt-sm q-pb-md q-mx-lg q-px-md">
          <q-btn
            rounded
            no-caps
            label='DECLINE'
            class="q-space text-white"
            color="white"
            text-color="black"
            @click="$emit('cancel')"
          />
        </div>
      </q-scroll-area>
    </q-pull-to-refresh>
  </div>
</template>
<script>

import { getPaymentTimeLimit } from 'src/wallet/ramp'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      order: null,
      ad: null,
      isloaded: false,
      byFiat: false,
      amount: null,
      price: null,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 235 : this.$q.screen.height - 170
    }
  },
  props: {
    orderData: Object,
    adData: Object
  },
  emits: ['confirm', 'cancel', 'refresh'],
  computed: {
    fiatAmount () {
      return (parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price)).toFixed(2)
    },
    cryptoAmount () {
      return (this.fiatAmount / this.order.locked_price).toFixed(2)
    }
  },
  watch: {
    byFiat () {
      this.updateInput()
    }
  },
  async mounted () {
    this.order = this.orderData
    this.price = this.$parent.formattedCurrency(this.order.locked_price, this.order.fiat_currency.symbol)
    this.updateInput()
    this.isloaded = true
    console.log('order:', this.order)
    console.log('this.$q.screen.height:', this.$q.screen.height)
  },
  methods: {
    formattedPlt (value) {
      return getPaymentTimeLimit(value)
    },
    updateInput () {
      let amount = 0
      if (this.byFiat) {
        amount = parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price)
      } else {
        amount = parseFloat(this.order.crypto_amount)
      }
      this.amount = Number(amount)
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

.bold-text {
  font-weight: bold;
}
</style>
