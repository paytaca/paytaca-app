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
    <ReceiveOrder
      v-if="state === 'order-confirm-decline'"
      :order-data="order"
      :ad-data="ad"
      @confirm="confirmingOrder"
      @cancel="cancellingOrder"
    />
    <TransferToEscrowProcess
      v-if="state === 'escrow-bch'"
      :key="transferToEscrowProcessKey"
      :wallet="wallet"
      :order="order"
      :contract="contract"
      :amount="transferAmount"
      @back="onBack"
      @success="onEscrowSuccess"
    />
    <VerifyEscrowTx
      v-if="state === 'tx-confirmation'"
      :wallet="wallet"
      :order-id="order.id"
      :txid="txid"
      @back="onBack"
      @success="onVerifyTxSuccess"
    />
    <!-- Waiting Page -->
    <div v-if="state === 'standby-view'" class="q-px-lg">
      <StandByDisplay
        :order-data="order"
        :key="standByDisplayKey"
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
  <!-- <div v-if="state === 'escrow-bch'">
    Escrow BCH Page
  </div> -->

  <!-- Completed transaction -->
  <div v-if="state === 'completed'">
    Completed Page
  </div>

  <!-- Dialogs -->
  <div v-if="openDialog" >
    <MiscDialogs
      :type="dialogType"
      :title="title"
      :text="text"
      v-on:back="openDialog = false"
      v-on:submit="handleDialogResponse()"
    />
  </div>
</template>
<script>
import { loadP2PWalletInfo, formatCurrency, makeid } from 'src/wallet/ramp'
import { signMessage } from '../../../wallet/ramp/signature.js'
import RampContract from 'src/wallet/ramp/contract'

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
      wsURL: process.env.RAMP_WS_URL + 'order/',
      state: '',
      isloaded: false,
      confirmType: '',

      dialogType: '',
      openDialog: false,

      ad: null,
      order: null,
      status: null,
      contract: {
        address: null
      },
      wallet: null,
      txid: null,
      title: '',
      text: '',
      standByDisplayKey: 0,
      transferToEscrowProcessKey: 0
    }
  },
  components: {
    ReceiveOrder,
    StandByDisplay,
    ProgressLoader,
    MiscDialogs,
    TransferToEscrowProcess,
    VerifyEscrowTx,
    PaymentConfirmation
  },
  props: {
    initWallet: {
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
    },
    isExpired () {
      const vm = this

      const now = new Date().getTime()
      const expiryDate = new Date(vm.order.expiration_date)

      const exception = ['Released', 'Canceled']

      if (expiryDate < now && vm.order.expiration_date && !exception.includes(vm.order.status.label)) {
        return true
      } else {
        return false
      }
    }
  },
  emits: ['back'],
  async mounted () {
    const vm = this
    if (vm.initWallet) {
      vm.wallet = vm.initWallet
    } else {
      const walletInfo = vm.$store.getters['global/getWallet']('bch')
      vm.wallet = await loadP2PWalletInfo(walletInfo)
    }
    await vm.fetchOrderData()
    if (!vm.order) {
      vm.order = vm.orderData
    }
    await vm.fetchAdData()
    vm.updateStatus(vm.order.status)
    vm.isloaded = true
    vm.setupWebsocket()
  },
  beforeUnmount () {
    console.log('Left FiatProcessOrder component')
    this.closeWSConnection()
  },
  methods: {
    // STEP CHECKER
    updateStatus (status) {
      this.status = status
      this.order.status = this.status
      this.checkStep()
    },
    checkStep () {
      const vm = this
      console.log('checking step:', vm.status)
      switch (vm.status.value) {
        case 'SBM': // Submitted
          if (this.order.is_ad_owner) {
            vm.state = 'order-confirm-decline'
          } else {
            vm.state = 'standby-view'
          }
          break
        case 'CNF': // Confirmed
          if (this.order.trade_type === 'BUY') {
            vm.state = vm.order.is_ad_owner ? 'escrow-bch' : 'standby-view'
          } else if (this.order.trade_type === 'SELL') {
            vm.state = vm.order.is_ad_owner ? 'standby-view' : 'escrow-bch'
          }
          break
        case 'ESCRW_PN': // Escrow Pending
          vm.state = 'standby-view'
          if (this.order.trade_type === 'BUY') {
            vm.state = vm.order.is_ad_owner ? 'tx-confirmation' : 'standby-view'
          } else if (this.order.trade_type === 'SELL') {
            vm.state = vm.order.is_ad_owner ? 'standby-view' : 'tx-confirmation'
          }
          break
        case 'ESCRW': // Escrowed
          if (this.order.trade_type === 'BUY') {
            vm.state = vm.order.is_ad_owner ? 'standby-view' : 'payment-confirmation'
          } else if (this.order.trade_type === 'SELL') {
            vm.state = vm.order.is_ad_owner ? 'payment-confirmation' : 'standby-view'
          }
          vm.confirmType = 'buyer'
          break
        case 'PD_PN': // Paid Pending
          if (this.order.trade_type === 'BUY') {
            vm.state = vm.order.is_ad_owner ? 'payment-confirmation' : 'standby-view'
          } else if (this.order.trade_type === 'SELL') {
            vm.state = vm.order.is_ad_owner ? 'standby-view' : 'payment-confirmation'
          }
          vm.confirmType = 'seller'
          break
        case 'PD': // Paid
        case 'RLS_PN': // Release Pending
          vm.state = 'standby-view'
          break
        case 'RLS': // Released
          vm.state = 'standby-view'
          vm.standByDisplayKey++
          break
        case 'CNCL': // Canceled
          this.state = 'standby-view'
          break
          // TODO: add pages
        case 'RLS_APL': // Appealed for Release
        case 'RFN_APL': // Appealed for Refund
          this.status = 'appeal'
          break
        case 'RFN_PN': // Refund Pending
        case 'RFN': // Refunded
          this.status = 'refund'
          break
      }
      if (this.isExpired) {
        vm.state = 'standby-view'
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
          console.log('response:', response.data)
          vm.order = response.data.order
          vm.contract = response.data.contract
          console.log('contract:', vm.contract)
          vm.updateStatus(vm.order.status)
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
          // console.log('ad', vm.ad)
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
          if (response.data && response.data.status.value === 'CNF') {
            vm.updateStatus(response.data.status)
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
          if (response.data && response.data.status.value === 'CNCL') {
            vm.updateStep(response.data.status)
          }
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
          if (response.data && response.data.status.value === 'PD_PN') {
            vm.updateStep(response.data.status)
          }
        })
        .catch(error => {
          console.log(error)
        })

      await this.fetchOrderData()
      this.checkStep()
      vm.isloaded = true
    },
    async releaseCrypto () {
      console.log('contract:', this.contract)
      this.txid = makeid(64)
      console.log('txid:', this.txid)
      // const contract = RampContract()
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
      const body = {
        txid: this.txid
      }
      console.log('body:', body)
      await vm.$axios.post(url,
        body,
        {
          headers: headers
        })
        .then(response => {
          console.log(response)
          if (response.data && response.data.status.value === 'RLS') {
            vm.updateStep(response.data.status)
          }
        })
        .catch(error => {
          console.error(error.response)
        })

      await this.fetchOrderData()
    },

    // Recieve Dialogs
    async handleDialogResponse () {
      const vm = this
      vm.isloaded = false
      switch (vm.dialogType) {
        case 'confirmReleaseCrypto':
          await this.releaseCrypto()
          await vm.verifyRelease()
          break
        case 'confirmCancelOrder':
          await vm.cancelOrder()
          vm.$emit('back')
          break
        case 'confirmOrderCreate':
          await this.confirmOrder()
          await this.fetchOrderData()
          this.checkStep()
          break
        case 'confirmPayment':
          await this.sendConfirmPayment(this.confirmType)
          if (this.confirmType === 'buyer') {
            await this.fetchOrderData()
          } else if (this.confirmType === 'seller') {
            await this.releaseCrypto()
            await this.verifyRelease()
          }
          this.checkStep()
          break
      }
      vm.title = ''
      vm.text = ''
      vm.isloaded = true
    },

    // Opening Dialog
    confirmingOrder () {
      // console.log('confirming order')
      this.dialogType = 'confirmOrderCreate'
      this.title = 'Confirm Order?'
      this.openDialog = true
    },
    cancellingOrder () {
      // console.log('cancelling order')
      this.dialogType = 'confirmCancelOrder'
      this.openDialog = true
      this.title = 'Cancel this order?'
    },
    releasingCrypto () {
      console.log('releasing crypto')
      this.dialogType = 'confirmReleaseCrypto'
      this.openDialog = true
      this.title = 'Release crypto?'
    },
    handleConfirmPayment () {
      this.dialogType = 'confirmPayment'
      this.title = 'Confirm Payment?'

      this.text = this.confirmType === 'buyer' ? 'This will inform the seller that you already sent the fiat fee to one of their selected payment methods.' : 'This will release the crypto held by the escrow account to the buyer.'
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
      this.txid = data.txid
      this.updateStatus(data.status)
    },
    onVerifyTxSuccess (status) {
      console.log('onVerifyTxSuccess:', status)
      this.updateStatus(status)
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

    setupWebsocket () {
      const wsUrl = `${this.wsURL}${this.order.id}/`
      this.websocket = new WebSocket(wsUrl)
      this.websocket.onopen = () => {
        console.log('WebSocket connection established to ' + wsUrl)
      }
      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('WebSocket data:', data)
        if (data && data.success) {
          if (data.txid) {
            this.txid = data.txid
          }
          if (data.status) {
            this.updateStatus(data.status.status)
          }
          if (data.contract_address) {
            if (this.contract) {
              this.contract.address = data.contract_address
            } else {
              this.contract = {
                address: data.contract_address
              }
            }
            console.log('contract:', this.contract)
            this.transferToEscrowProcessKey++
          }
        }
      }
      this.websocket.onclose = () => {
        console.log('WebSocket connection closed.')
      }
    },
    closeWSConnection () {
      if (this.websocket) {
        this.websocket.close()
      }
    }
  }
}
</script>
