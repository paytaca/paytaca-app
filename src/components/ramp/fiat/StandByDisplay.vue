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
      <div class="row q-px-lg text-center sm-font-size" style="overflow-wrap: break-word;" v-if="!$parent.isExpired">
        <div v-if="hasLabel" class="row">
          <q-icon class="col-auto" size="sm" name="info" color="blue-6"/>&nbsp;
          <span  class="col">{{ label }}</span>
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
      const stat = ['ESCRW', 'PD_PN', 'PD', 'RLS_PN']

      return stat.includes(this.order.status.value) && !this.$parent.isExpired
    },
    hasCancel () {
      const stat = ['SBM', 'CNF', 'ESCRW_PN']
      console.log('hasCancel:', stat.includes(this.order.status.value))
      return stat.includes(this.order.status.value)
    },
    cryptoAmount () {
      return this.$parent.formattedCurrency(this.order.crypto_amount)
    },
    statusColor () {
      const stat = this.order.status.value

      if (stat === 'RLS') {
        return 'text-green-6'
      } else if (stat === 'CNCL' || this.$parent.isExpired) {
        return 'text-red-6'
      } else {
        return ''
      }
    },
    hasLabel () {
      const stat = ['SBM', 'CNF', 'ESCRW_PN', 'ESCRW', 'PD_PN', 'PD', 'RLS_PN']
      return stat.includes(this.order.status.value)
    },
    label () {
      const labels = {
        SBM: 'Please wait for the seller to confirm your order.',
        CNF: 'Please wait for the seller to Escrow the funds.',
        ESCRW_PN: 'Please wait for the seller to Escrow the funds.',
        ESCRW: 'Please wait for the buyer to confirm their fiat payment.',
        PD_PN: 'Please wait for the seller to confirm your fiat payment.',
        PD: 'Please wait for the fund release.',
        RLS_PN: 'Please wait for the fund release.'
      }
      return labels[this.order.status.value]
    }
  },
  async mounted () {
    this.order = this.orderData
    console.log('order:', this.order)
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
      const completedStatus = ['RLS', 'RFN', 'CNCL']
      if (completedStatus.includes(this.order.status.value)) {
        this.type = 'completed'
      }
    },
    paymentCountdown () {
      // console.log('counting down')
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
