<template>
  <div v-if="isloaded">
    <div class="q-mx-lg text-h5 text-center lg-font-size">
      Order Created
    </div>
    <div class="q-pt-md sm-font-size">
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
        <span>Crypto Amount</span>
        <span class="text-nowrap q-ml-xs">{{ $parent.formattedCurrency(order.crypto_amount) }} {{ order.crypto_currency.symbol }}</span>
      </div>
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
        <span>Fiat Amount</span>
        <span class="text-nowrap q-ml-xs">{{ $parent.formattedCurrency($parent.fiatAmount, order.fiat_currency.symbol) }} </span>
      </div>
      <div class="row justify-between no-wrap q-mx-lg bold-text" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
        <span>Status</span>
        <span class="text-nowrap q-ml-xs" :class="order.status.toLowerCase().includes('released') ? 'text-green-6' : 'text-orange-6'">{{ order.status }}</span>
      </div>
    </div>
    <!-- Pending Confirmation -->
    <div class="q-mt-md q-px-md">
      <div class="row q-px-lg text-center xm-font-size" style="overflow-wrap: break-word;" v-if="order.status === 'Submitted'">
        <q-icon class="col-auto" size="sm" name="info" color="blue-6"/>
        <span class="col">
          Please wait for the seller to confirm your order.
        </span>
      </div>
      <div class="row q-pt-md">
        <q-btn
          rounded
          no-caps
          label='Cancel'
          class="q-space text-white"
          style="background-color: #ed5f59;"
          @click="$parent.cancellingOrder()"
        />
      </div>
      </div>
  </div>
</template>
<script>

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      order: null,
      isloaded: false
    }
  },
  props: {
    orderData: Object
  },
  async mounted () {
    this.order = this.orderData
    this.isloaded = true
  }
}
</script>
