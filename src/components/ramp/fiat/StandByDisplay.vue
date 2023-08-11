<template>
  <div v-if="isloaded">
    <div class="q-mx-lg text-h5 text-center lg-font-size bold-text" :class="statusColor">
      <span v-if="$parent.isExpired">EXPIRED</span>
      <span v-else>{{ order.status.label.toUpperCase() }}</span>
      <!-- <span v-if="order.status.label === 'Submitted'">Order Created</span>
      <span v-else-if="type === 'completed'">History</span>
      <span v-else>Processing Order</span> -->
    </div>
    <div class="q-px-lg q-pt-lg">
      <div class="sm-font-size q-pb-xs">Fiat Amount</div>
      <q-input class="q-pb-xs" disable dense filled :dark="darkMode" v-model="$parent.fiatAmount">
        <template v-slot:prepend>
          <span class="sm-font-size bold-text">{{ order.fiat_currency.symbol }}</span>
        </template>
      </q-input>

      <div class="text-center q-py-sm">
        <q-icon size="md" name="mdi-swap-vertical" />
      </div>

      <div class="sm-font-size q-pb-xs">Crypto Amount</div>
      <q-input class="q-pb-xs" disable dense filled :dark="darkMode" v-model="cryptoAmount">
        <template v-slot:prepend>
          <span class="sm-font-size bold-text">{{ order.crypto_currency.symbol }}</span>
        </template>
      </q-input>
    </div>

    <q-separator :dark="darkMode" class="q-mt-md q-mx-md"/>

    <div class="q-mt-md q-px-md">
      <div class="row q-px-lg text-center md-font-size" style="overflow-wrap: break-word;">
        <div v-if="order.status.label === 'Submitted'">
          <q-icon class="col-auto" size="sm" name="info" color="blue-6"/>
          <span  class="col">Please wait for the seller to confirm your order.</span>
        </div>
        <div v-if="order.status.label === 'Confirmed'">
          <q-icon class="col-auto" size="sm" name="info" color="blue-6"/>
          <span  class="col">Please wait for the seller to Escrow the funds</span>
        </div>
        <div v-if="order.status.label === 'Escrowed'">
          <q-icon class="col-auto" size="sm" name="info" color="blue-6"/>
          <span  class="col">Please wait for the buyer to confirm their fiat payment.</span>
        </div>
      </div>

      <div class="text-center" style="font-size: 35px; color: #ed5f59;" v-if="hasCountDown">
        {{ countDown }}
      </div>
      <div class="row q-pt-md" v-if="type === 'ongoing' && hasCancel">
        <q-btn
          rounded
          no-caps
          label='Cancel Order'
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

      return stat.includes(this.order.status.label) && !this.$parent.isExpired
    },
    hasCancel () {
      const stat = ['Submitted', 'Confirmed', 'Escrow Pending']

      return stat.includes(this.order.status.label)
    },
    cryptoAmount () {
      return this.$parent.formattedCurrency(this.order.crypto_amount)
    },
    statusColor () {
      const stat = this.order.status.label

      if (stat === 'Released') {
        return 'text-green-6'
      } else if (stat === 'Canceled' || this.$parent.isExpired) {
        return 'text-red-6'
      } else {
        return ''
      }
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
      if (completedStatus.includes(this.order.status.label)) {
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
