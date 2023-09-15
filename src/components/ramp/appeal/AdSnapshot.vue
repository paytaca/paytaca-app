<template>
  <q-card class="br-15 q-pt-sm q-mx-md q-mx-none q-my-lg" bordered flat
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]">
      <div>
        <q-btn
          flat
          padding="md"
          icon="close"
          @click="$emit('back')"
        />
      </div>
      <div class="text-center bold-text lg-font-size text-uppercase">Ad Snapshot</div>
      <div class="text-center sm-font-size" :class="darkMode ? 'text-grey-4' : 'text-grey-6'">(Ad #{{ snapshot.ad }})</div>

      <q-separator class="q-my-sm" :dark="darkMode"/>

      <div class="sm-font-size q-px-md q-py-md" :class="darkMode ? '' : 'text-grey-7'">
        <div class="row justify-between no-wrap q-mx-lg">
          <span>Price Type</span>
          <span class="text-nowrap q-ml-xs">
            {{ snapshot.price_type }}
          </span>
        </div>
        <div class="row justify-between no-wrap q-mx-lg">
          <span>({{ snapshot.price_type === 'FIXED' ? 'Fixed' : 'Floating' }}) Price</span>
          <span class="text-nowrap q-ml-xs">
            {{ snapshot.price_type === 'FIXED' ? formattedCurrency(snapshot.fixed_price, snapshot.fiat_currency.symbol) : snapshot.floating_price }}
          </span>
        </div>
        <div class="row justify-between no-wrap q-mx-lg">
          <span>Market Price</span>
          <span class="text-nowrap q-ml-xs">
            {{ formattedCurrency(snapshot.market_price, snapshot.fiat_currency.symbol) }}
          </span>
        </div>
        <div class="row justify-between no-wrap q-mx-lg">
          <span>Trade Limit</span>
          <span class="text-nowrap q-ml-xs">
            {{ formattedCurrency(snapshot.trade_floor, snapshot.fiat_currency.symbol) }} - {{ formattedCurrency(snapshot.trade_ceiling, snapshot.fiat_currency.symbol) }}
          </span>
        </div>
        <div class="row justify-between no-wrap q-mx-lg">
          <span>Time Limit</span>
          <span class="text-nowrap q-ml-xs">
            {{ formattedTimeLimit(snapshot.time_duration_choice).label }}
          </span>
        </div>
      </div>

      <div class="q-mx-lg q-pb-sm">
        <div class="md-font-size bold-text q-px-md">Payment Methods</div>
        <div class="q-gutter-sm q-pt-sm q-px-md">
          <q-badge v-for="(method, index) in snapshot.payment_methods" :key="index" rounded outline :color="darkMode ? 'blue-grey-4' : 'blue-grey-7'" :label="method.payment_type" />
        </div>
      </div>

      <div class="q-py-md q-mx-lg q-pb-sm">
        <div class="md-font-size bold-text q-px-md">Selected Payment Method(s)</div>
        <q-card class="br-15 q-mt-sm q-mx-sm" bordered flat :class="[ darkMode ? 'pt-dark-card' : '',]">
          <q-card-section>
            <div class="bold-text md-font-size text-uppercase">Gcash</div>
          </q-card-section>

          <q-separator :dark="darkMode"/>

          <q-card-section :class="darkMode ? '' : 'text-grey-7'">
            <div class="bold-text sm-font-size">Nancy Wheeler</div>
            <div>xx-xxx-xxxx</div>
          </q-card-section>
        </q-card>
      </div>
    </q-card>
</template>
<script>
import { formatCurrency, getPaymentTimeLimit } from 'src/wallet/ramp'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      paymentMethods: ['Paypal', 'Gcash', 'BPI']
    }
  },
  props: {
    snapshot: Object
  },
  emits: ['back'],
  mounted () {
    console.log('snapshot:', this.snapshot)
  },
  methods: {
    formattedCurrency (value, currency = null) {
      if (currency) {
        return formatCurrency(value, currency)
      } else {
        return formatCurrency(value)
      }
    },
    formattedTimeLimit (value) {
      return getPaymentTimeLimit(value)
    }
  }
}
</script>
