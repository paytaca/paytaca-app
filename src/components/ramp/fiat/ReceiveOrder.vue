<template>
  <div v-if="isloaded">
    <div class="q-mx-lg text-h5 text-center lg-font-size" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
      ORDER #{{ order.id }}
    </div>
    <q-scroll-area :style="`height: ${minHeight - 145}px`" style="overflow-y:auto;">
      <div class="q-pt-md sm-font-size q-px-md  ">
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
        <!-- <div class="text-right subtext sm-font-size"> {{ $parent.formattedCurrency($parent.cryptoAmount) }} BCH</div> -->
        <q-btn
          class="sm-font-size"
          padding="none"
          flat
          no-caps
          color="primary"
          @click="byFiat = !byFiat">
          View amount in {{ byFiat ? 'BCH' : order.fiat_currency.symbol }}
        </q-btn>
        <!-- <q-separator :dark="darkMode" class="q-mt-md"/> -->
        <div class="no-wrap sm-font-size subtext q-pt-sm">
          <span>Balance: </span>
          <span class="text-nowrap q-ml-xs">
            {{ $parent.bchBalance }} BCH
          </span>
        </div>
      </div>
      <!-- <q-separator :dark="darkMode" class="q-mt-sm q-mx-lg"/> -->

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
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (95 + 120) : this.$q.screen.height - (70 + 100)
    }
  },
  props: {
    orderData: Object,
    adData: Object
  },
  emits: ['confirm', 'cancel'],
  computed: {
    fiatAmount () {
      return (parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price))
    },
    cryptoAmount () {
      return (this.fiatAmount / this.order.locked_price).toFixed(8)
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
    console.log(this.minHeight)
  },
  methods: {
    formattedPlt (value) {
      return getPaymentTimeLimit(value)
    },
    updateInput () {
      if (this.byFiat) {
        this.amount = parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price)
      } else {
        this.amount = parseFloat(this.order.crypto_amount)
      }
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
