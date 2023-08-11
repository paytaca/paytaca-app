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
      v-if="state === 'order-confirm-decline'"
      :order-data="order"
      :ad-data="ad"
      @confirm="confirmingOrder"
      @cancel="cancellingOrder"
    />

    <!-- Waiting Page -->
    <div v-if="state === 'standby-view'" class="q-px-lg">
    <div v-if="order.is_ad_owner">
      <!-- Ad Owner Confirm / Decline -->
      <ReceiveOrder
        v-if="state === STATUS_CODE.SUBMITTED"
        :order-data="order"
        :ad-data="ad"
        @confirm="confirmingOrder"
        @cancel="cancellingOrder"
      />
      <TransferToEscrowProcess
        v-if="state === STATUS_CODE.CONFIRMED"
        :wallet="wallet"
        :order="order"
        :amount="transferAmount"
        @back="onBack"
        @success="onEscrowSuccess"
      />
      <VerifyEscrowTx
        v-if="state === STATUS_CODE.ESCROW_PENDING"
        :wallet="wallet"
        :order-id="order.id"
        :tx-id="transactionId"
        @back="onBack"
        @success="onVerifyTxSuccess"
      />
    </div>
    <div v-else class="q-px-lg">
      <!-- Buyer Waiting Page -->
      <StandByDisplay
        :order-data="order"
      />
    </div>

    <!-- Payment Confirmation -->
    <div v-if="state === 'payment-confirmation'">
      <PaymentConfirmation
        :order-data="order"
        :type="confirmType"
        @confirm="handleConfirmPayment"
      />
    </div>
  </div>

  <!-- Escrow BCH -->
  <div v-if="state === 'escrow-bch'">
    Escrow BCH Page
  </div>

  <!-- Completed transaction -->
  <div v-if="state === 'completed'">
    Completed Page
  </div>

  <!-- Dialogs -->
  <div v-if="openDialog" >
    <MiscDialogs
      :type="dialogType"
      v-on:back="openDialog = false"
      v-on:submit="handleDialogResponse()"
    />
  </div>
</template>
<script>
import { signMessage } from '../../../wallet/ramp/signature.js'
import { formatCurrency } from 'src/wallet/ramp'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import ReceiveOrder from './ReceiveOrder.vue'
import TransferToEscrowProcess from './TransferToEscrowProcess.vue'
import VerifyEscrowTx from './VerifyEscrowTx.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'
import StandByDisplay from './StandByDisplay.vue'
import PaymentConfirmation from './PaymentConfirmation.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      state: '',
      isloaded: false,
      confirmType: '',

      dialogType: '',
      openDialog: false,

      ad: null,
      order: null,
      contract: null,
      wallet: null,
      txid: null
    }
  },
  components: {
    ProgressLoader,
    MiscDialogs,
    ReceiveOrder,
    TransferToEscrowProcess,
    VerifyEscrowTx,
    StandByDisplay,
    PaymentConfirmation
  },
  props: {
    wallet: {
      type: Object,
      default: null
    },
    orderData: {
      type: Object,
      default: null
    }
  },
  computed: {
    transferAmount () {
      return Number(this.order.crypto_amount)
    },
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

    // const walletInfo = vm.$store.getters['global/getWallet']('bch')
    // vm.wallet = await loadP2PWalletInfo(walletInfo)

    vm.order = vm.orderData
    await vm.fetchOrderData()
    await vm.fetchAdData()
    this.checkStep()
    this.updateStep(this.order.status.value)
    vm.isloaded = true
  },
  methods: {
    // STEP CHECKER
    updateStep (status) {
      this.state = status
      console.log('state:', this.state)
    },
    checkStep () {
      const vm = this
      console.log('checking step')
      switch (vm.order.status) {
        case 'Submitted':
          if (this.order.is_ad_owner) {
            vm.state = 'order-confirm-decline'
          } else {
            vm.state = 'standby-view'
          }
          break
        case 'Confirmed':
          if (this.order.trade_type === 'BUY') {
            vm.state = vm.order.is_ad_owner ? 'escrow-bch' : 'standby-view'
          } else if (this.order.trade_type === 'SELL') {
            vm.state = vm.order.is_ad_owner ? 'standby-view' : 'escrow-bch'
          }
          break
        case 'Escrow Pending':
          vm.state = 'standby-view'
          break
        case 'Escrowed':
          if (this.order.trade_type === 'BUY') {
            vm.state = vm.order.is_ad_owner ? 'standby-view' : 'payment-confirmation'
          } else if (this.order.trade_type === 'SELL') {
            vm.state = vm.order.is_ad_owner ? 'payment-confirmation' : 'standby-view'
          }
          vm.confirmType = 'buyer'
          break
        case 'Paid Pending':
          if (this.order.trade_type === 'BUY') {
            vm.state = vm.order.is_ad_owner ? 'payment-confirmation' : 'standby-view'
          } else if (this.order.trade_type === 'SELL') {
            vm.state = vm.order.is_ad_owner ? 'standby-view' : 'payment-confirmation'
          }
          vm.confirmType = 'seller'
          break
        case 'Paid':
        case 'Release Pending':
          vm.state = 'standby-view'
          break
        case 'Released':
        case 'Canceled':
          this.state = 'standby-view'
          break
          // TODO: add pages
        case 'Appealed for Release':
        case 'Appealed for Refund':
          this.status = 'appeal'
          break
        case 'Refund Pending':
        case 'Refunded':
          this.status = 'refund'
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
          if (response.data.status === 'CNF') {
            vm.updateStep(response.data.status)
          }
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
          // if (response.data.status === 'CNCL') {
          //   vm.updateStep(response.data.status)
          // }
        })
        .catch(error => {
          console.log(error)
        })
    },
    async sendConfirmPayment (type) {
      const vm = this
      vm.isloaded = false

      const url = `${this.apiURL}/order/${vm.order.id}/confirm-payment/${type}`
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_LIST', timestamp) // update later

      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }
      // console.log(headers)
      await vm.$axios.post(url, {}, {
        headers: headers
      })
        .then(response => {
          console.log(response.data)
        })
        .catch(error => {
          console.log(error)
        })

      await this.fetchOrderData()
      this.checkStep()
      vm.isloaded = true
    },
    async verifyRelease () {
      const vm = this

      const url = `${vm.apiURL}/order/${vm.order.id}/verify-release`
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_LIST', timestamp) // update later

      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }

      await vm.$axios.post(url,
        {
          txid: this.txid
        }, {
          headers: headers
        })
        .then(response => {
          console.log(response)
        })
        .catch(error => {
          console.log(error)
        })
    },
    async sendConfirmPayment (type) {
      const vm = this
      vm.isloaded = false

      const url = `${this.apiURL}/order/${vm.order.id}/confirm-payment/${type}`
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_LIST', timestamp) // update later

      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }
      // console.log(headers)
      await vm.$axios.post(url, {}, {
        headers: headers
      })
        .then(response => {
          console.log(response.data)
        })
        .catch(error => {
          console.log(error)
        })

      await this.fetchOrderData()
      this.checkStep()
      vm.isloaded = true
    },
    async verifyRelease () {
      const vm = this

      const url = `${vm.apiURL}/order/${vm.order.id}/verify-release`
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_LIST', timestamp) // update later

      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }

      await vm.$axios.post(url,
        {
          txid: this.txid
        }, {
          headers: headers
        })
        .then(response => {
          console.log(response)
        })
        .catch(error => {
          console.log(error)
        })
    },

    // Recieve Dialogs
    async handleDialogResponse () {
      const vm = this
      vm.isloaded = false
      switch (vm.dialogType) {
        case 'confirmCancelOrder':
          await vm.cancelOrder()
          vm.$emit('back')
          break
        case 'confirmOrderCreate':
          await this.confirmOrder()
          await this.fetchOrderData()
          this.checkStep()
          break
        case 'confirmPaymentSeller':
          await this.sendConfirmPayment(this.confirmType)
          await this.verifyRelease()
          this.checkStep()
          break
        case 'confirmPaymentBuyer':
          await this.sendConfirmPayment(this.confirmType)
          await this.fetchOrderData()
          this.checkStep()
          break
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
    handleConfirmPayment () {
      this.dialogType = this.confirmType === 'buyer' ? 'confirmPaymentBuyer' : 'confirmPaymentSeller'
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
    },
    onEscrowSuccess (data) {
      console.log('onEscrowSubmit:', data)
      this.transactionId = data.txid
      this.updateStep(data.status)
    },
    onVerifyTxSuccess (status) {
      console.log('onVerifyTxSuccess:', status)
      this.state = 'order-list'
      this.updateStep(status)
    },
    onBack () {
      this.state = 'order-list'
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
  }
}
</script>
