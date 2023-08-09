<template>
  <div>
    <q-btn
      flat
      padding="md"
      icon="arrow_back"
      @click="$emit('back')"
    />
    </div>
  <!-- Progress Loader -->
  <div v-if="!isloaded">
    <div class="row justify-center q-py-lg" style="margin-top: 50px">
      <ProgressLoader/>
    </div>
  </div>

  <!-- Order Process Pages -->
  <div v-if="isloaded">
    <!-- Ad Owner Confirm / Decline -->
    <RecieveOrder
      v-if="state === 'orderConfirmDecline'"
      :order-data="order"
      :ad-data="ad"
      @confirm="confirmingOrder"
      @cancel="cancellingOrder"
    />

    <!-- Buyer Waiting Page -->
    <div v-if="state === 'standByView'" class="q-px-lg">
      <StandByDisplay
        :order-data="order"
      />
    </div>
  </div>

  <div v-if="openDialog" >
    <MiscDialogs
      :type="dialogType"
      v-on:back="openDialog = false"
      v-on:submit="handleDialogResponse()"
    />
  </div>
</template>
<script>
import { loadP2PWalletInfo, formatCurrency } from 'src/wallet/ramp'
import { signMessage } from '../../../wallet/ramp/signature.js'

import ProgressLoader from 'src/components/ProgressLoader.vue'
import RecieveOrder from './RecieveOrder.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'
import StandByDisplay from './StandByDisplay.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      state: '',
      isloaded: false,

      dialogType: '',
      openDialog: false,

      ad: null,
      order: null,
      contract: null,
      wallet: null
    }
  },
  components: {
    RecieveOrder,
    StandByDisplay,
    ProgressLoader,
    MiscDialogs
  },
  props: {
    orderData: {
      type: Object,
      default: null
    }
  },
  computed: {
    getAdLimit () {
      return formatCurrency(this.ad.trade_floor, this.order.fiat_currency.symbol) + ' - ' + formatCurrency(this.ad.trade_ceiling, this.order.fiat_currency.symbol)
    },
    fiatAmount () {
      return (parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price)).toFixed(2)
    },
    cryptoAmount () {
      return (this.fiatAmount / this.order.locked_price).toFixed(8)
    },
    bchBalance () {
      console.log(this.$store.getters['assets/getAssets'][0].balance)
      return this.$store.getters['assets/getAssets'][0].balance
    }
  },
  emits: ['back'],
  async mounted () {
    const vm = this

    const walletInfo = vm.$store.getters['global/getWallet']('bch')
    vm.wallet = await loadP2PWalletInfo(walletInfo)

    if (!vm.orderData) {
      await vm.fetchOrderData()
    } else {
      vm.order = vm.orderData
    }

    await vm.fetchAdData()
    this.checkStep()
    console.log(vm.order)
    vm.isloaded = true
  },
  methods: {
    // STEP CHECKER
    checkStep () {
      const vm = this

      switch (vm.order.status) {
        case 'Submitted':
          if (this.order.is_ad_owner) {
            vm.state = 'orderConfirmDecline'
          } else {
            vm.state = 'standByView'
          }
          break
        case 'Escrow Pending':
          vm.state = 'standByView'
          break
      }
    },

    // API CALLS
    async fetchOrderData () {
      const vm = this

      await vm.$axios.get(vm.apiURL + '/order/' + vm.orderData.id, {
        headers: {
          'wallet-hash': vm.wallet.walletHash
        }
      })
        .then(response => {
          vm.order = response.data.order
          vm.contract = response.data.contract
          console.log('order', vm.order)
        })
        .catch(error => {
          console.log(error)
        })
    },
    async fetchAdData () {
      const vm = this

      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_GET', timestamp)

      const adId = vm.order.ad.id
      const url = `${vm.apiURL}/ad/${adId}`

      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }

      await vm.$axios.get(url, { headers: headers })
        .then(response => {
          vm.ad = response.data
          console.log('ad', vm.ad)
        })
        .catch(error => {
          console.error(error)
          console.error(error.response)
        })
    },
    async confirmOrder () {
      const vm = this

      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_GET', timestamp)

      const orderID = vm.order.id
      const url = `${vm.apiURL}/order/${orderID}/confirm`

      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }

      await vm.$axios.post(url, {}, { headers: headers })
        .then(response => {
          console.log(response)
        })
        .catch(error => {
          console.log(error)
        })
    },
    async cancelOrder () {
      const vm = this

      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_GET', timestamp)

      const orderID = vm.order.id
      const url = `${vm.apiURL}/order/${orderID}/cancel`

      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }

      await vm.$axios.post(url, {}, { headers: headers })
        .then(response => {
          console.log(response)
        })
        .catch(error => {
          console.log(error)
        })
    },

    // Recieve Dialogs
    handleDialogResponse () {
      const vm = this
      vm.isloaded = false
      switch (vm.dialogType) {
        case 'confirmCancelOrder':
          vm.cancelOrder()
          vm.$emit('back')
          break
        case 'confirmOrderCreate':
          this.confirmOrder()
          this.fetchOrderData()
          this.checkStep()
      }

      vm.isloaded = true
    },

    // Opening Dialog
    confirmingOrder () {
      console.log('confirming order')
      this.dialogType = 'confirmOrderCreate'
      this.openDialog = true
    },
    cancellingOrder () {
      console.log('cancelling order')

      this.dialogType = 'confirmCancelOrder'
      this.openDialog = true
    },

    // Others
    formattedCurrency (value, currency = null) {
      if (currency) {
        return formatCurrency(value, currency)
      } else {
        return formatCurrency(value)
      }
    },
    isValidInputAmount (value) {
      if (value === undefined) return false
      const parsedValue = parseFloat(value)
      const tradeFloor = parseFloat(this.ad.trade_floor)
      const tradeCeiling = parseFloat(this.ad.trade_ceiling)
      if (isNaN(parsedValue) || parsedValue < tradeFloor || parsedValue > tradeCeiling) {
        return false
      }
      return true
    }
  }
}
</script>
