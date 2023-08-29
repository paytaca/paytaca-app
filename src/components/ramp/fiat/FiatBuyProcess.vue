<template>
  <div class="q-mt-md q-mx-md">
    <div>
      <q-btn
        flat
        padding="md"
        icon="arrow_back"
        @click="$emit('back')"
      />
    </div>
    <div v-if="step === 1">
      <div class="q-mx-lg text-h5 text-center lg-font-size">
        Order Created
      </div>
      <div class="q-pt-md sm-font-size">
        <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
          <span>Crypto Amount</span>
          <span class="text-nowrap q-ml-xs">{{ formattedCurrency(order.crypto_amount) }}</span>
        </div>
        <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
          <span>Fiat Amount</span>
          <span class="text-nowrap q-ml-xs">{{ formattedCurrency(fiatAmount, order.fiat_currency.symbol) }} </span>
        </div>
        <div class="row justify-between no-wrap q-mx-lg bold-text" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
          <span>Status</span>
          <span class="text-nowrap q-ml-xs" :class="order.status.toLowerCase().includes('released') ? 'text-green-6' : 'text-orange-6'">{{ order.status }}</span>
        </div>
      </div>

       <!-- Pending Confirmation -->
       <div class="q-mt-md q-px-md">
          <div class="row">
            <q-icon class="col-auto q-pr-sm" size="sm" name="info" color="blue-6"/>
            <span class="col">
              Please wait for the seller to confirm your order.
            </span>
          </div>
          <!-- <div class="q-pt-xs">
            <q-icon size="sm" name="info" color="blue-6"/>
            <span class="q-pl-xs">
              The crypto asset will be escrowed once the seller confirms your order. You will be notified of this event.
            </span>
          </div> -->
          <div class="row q-pt-md">
            <q-btn
              rounded
              no-caps
              label='Cancel'
              class="q-space text-white"
              style="background-color: #ed5f59;"
            />
          </div>
        </div>
    </div>
  </div>
</template>
<script>
import { loadP2PWalletInfo, formatCurrency } from 'src/wallet/ramp'
import { signMessage } from '../../../wallet/ramp/signature.js'
import { thirdparty } from 'ethereumjs-wallet'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      walletIndex: this.$store.getters['global/getWalletIndex'],
      step: 0,

      order: null,
      wallet: null,
      contract: null
    }
  },
  props: {
    orderData: {
      type: Object,
      default: null
    }
  },
  emits: ['back'],
  async mounted () {
    console.log('Updated Buying Process')
    const vm = this

    if (!vm.orderData) {
      const walletInfo = vm.$store.getters['global/getWallet']('bch')
      vm.wallet = await loadP2PWalletInfo(walletInfo, vm.walletIndex)

      await this.fetchOrderData()
    } else {
      vm.order = this.orderData
    }

    vm.stepChecker()
    console.log(vm.order)
  },
  computed: {
    fiatAmount () {
      return parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price)
    }
  },
  methods: {
    stepChecker () {
      switch (this.order.status) {
        case 'Submitted':
          console.log('submitted')
          this.step = 1
          break
      }
    },
    formattedCurrency (value, currency = null) {
      if (currency) {
        return formatCurrency(value, currency)
      } else {
        return formatCurrency(value)
      }
    },
    async fetchOrderData () {
      const vm = this

      // const timestamp = Date.now()
      // const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_LIST', timestamp)

      await vm.$axios.get(vm.apiURL + '/order/' + vm.orderData.id, {
        headers: {
          'wallet-hash': vm.wallet.walletHash
          // timestamp: timestamp,
          // signature: signature
        }
      })
        .then(response => {
          vm.order = response.data.order
          vm.contract = response.data.contract
          console.log(vm.order)
        })
        .catch(error => {
          console.log(error)
        })
    }
  }
}
</script>
