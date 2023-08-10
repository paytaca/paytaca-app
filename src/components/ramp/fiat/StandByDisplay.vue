<template>
  <div v-if="isloaded">
    <div class="q-mx-lg text-h5 text-center lg-font-size">
      <span v-if="order.status === 'Submitted'">Order Created</span>
      <span v-else-if="type === 'completed'">History</span>
      <span v-else>Processing Order</span>
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

      <div class="text-center" style="font-size: 35px; color: #ed5f59;" v-if="hasCountDown">
        {{ countDown }}
      </div>
      <div class="row q-pt-md" v-if="type === 'ongoing'">
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
      isloaded: false,
      countDown: '',
      timer: null,
      type: 'ongoing'
    }
  },
  props: {
    orderData: Object
  },
  computed: {
    hasCountDown () {
      const stat = ['Escrowed', 'Paid Pending', 'Paid', 'Release Pending']

      return stat.includes(this.order.status)
    }
  },
  async mounted () {
    this.order = this.orderData
    await this.paymentCountdown()
    this.checkStatus()
    this.isloaded = true
  },
  beforeUnmount () {
    clearInterval(this.timer)
    this.timer = null
  },
  methods: {
    checkStatus () {
      const completedStatus = ['Released', 'Refunded', 'Canceled']
      if (completedStatus.includes(this.order.status)) {
        this.type = 'completed'
      }
    },
    paymentCountdown () {
      console.log('counting down')
      const vm = this

      const expiryDate = new Date(vm.order.expiration_date)

      vm.timer = setInterval(function () {
        const now = new Date().getTime()
        const distance = expiryDate - now

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        let seconds = Math.floor((distance % (1000 * 60)) / 1000)
        if (seconds.toString().length < 2) {
          seconds = '0' + seconds
        }
        if (minutes.toString().length < 2) {
          minutes = '0' + minutes
        }

        vm.countDown = `${hours}:${minutes}:${seconds}`

        if (distance < 0) {
          clearInterval(vm.timer)
          vm.countDown = 'Expired'
          // vm.order.status = 'Expired'
          // vm.shiftExpired = true
        }
      }, 1000)
    }
  }
}
</script>
