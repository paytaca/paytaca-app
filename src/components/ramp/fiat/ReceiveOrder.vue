<template>
  <div v-if="isloaded">
    <q-pull-to-refresh @refresh="$emit('refresh')">
      <q-scroll-area
        style="overflow-y:auto;"
        :style="`height: ${ minHeight }px;`">
        <div class="q-mx-lg text-center">
          <div class="lg-font-size text-weight-bold">
            <span>{{ order?.status?.label?.toUpperCase() }}</span>
          </div>
          <div class="text-center subtext md-font-size">ORDER #{{ order.id }}</div>
        </div>
        <div class="q-mx-md">
            <q-separator class="q-my-sm" :dark="darkMode"/>
            <div :class="getDarkModeClass(darkMode)" class="row justify-between no-wrap q-mx-lg pt-label">
              <span>Locked Price</span>
              <span class="text-nowrap q-ml-xs">{{ price }}/{{ order.crypto_currency.symbol }}</span>
            </div>
            <div :class="getDarkModeClass(darkMode)" class="row justify-between no-wrap q-mx-lg pt-label">
              <span>Min Trade Limit</span>
              <span class="text-nowrap q-ml-xs">
                {{ parseFloat($parent.getAdLimits?.floor) }} BCH
              </span>
            </div>
            <div :class="getDarkModeClass(darkMode)" class="row justify-between no-wrap q-mx-lg pt-label">
              <span>Max Trade Limit</span>
              <span class="text-nowrap q-ml-xs">
                {{ parseFloat($parent.getAdLimits?.ceiling) }} BCH
              </span>
            </div>
            <!-- <div class="row justify-between no-wrap q-mx-lg pt-label" :class="getDarkModeClass(darkMode)">
              <span>Time Limit</span>
              <span class="text-nowrap q-ml-xs">{{ formattedPlt(order.ad.time_duration).label }} </span>
            </div> -->
            <div class="row justify-between no-wrap q-mx-lg pt-label text-weight-bold" :class="getDarkModeClass(darkMode)">
              <span>Status</span>
              <span
                class="text-nowrap q-ml-xs"
                :class="order.status.label.toLowerCase().includes('released') ? 'text-green-6' : 'text-orange-6'"
              >
                {{ order.status.label }}
              </span>
            </div>
          <!-- </q-card> -->
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
            class="q-space text-white q-mx-md button"
            @click="$emit('confirm')"
          />
        </div>
        <div class="row q-pt-sm q-pb-md q-mx-lg q-px-md">
          <q-btn
            rounded
            no-caps
            label='DECLINE'
            class="q-space text-white q-mx-md"
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

import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
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
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (145 + 120) : this.$q.screen.height - (70 + 100)
    }
  },
  props: {
    data: Object
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
    this.order = this.data?.order
    this.price = this.$parent.formattedCurrency(this.order.locked_price, this.order.fiat_currency.symbol)
    this.updateInput()
    this.isloaded = true
  },
  methods: {
    getDarkModeClass,
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
</style>
