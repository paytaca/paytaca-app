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
    <EscrowTransferProcess
      v-if="state === 'escrow-bch'"
      :key="escrowTransferProcessKey"
      :action="state"
      :order="order"
      :contract="contract"
      :amount="transferAmount"
      @back="onBack"
      @success="onEscrowSuccess"
    />
    <VerifyEscrowTx
      v-if="state === 'tx-confirmation'"
      :key="verifyEscrowTxKey"
      :order-id="order.id"
      :action="verifyAction"
      :txid="txid"
      :errors="errorMessages"
      :ramp-contract="rampContract"
      @back="onBack"
      @success="onVerifyTxSuccess"
    />
    <!-- Waiting Page -->
    <div v-if="state === 'standby-view'" class="q-px-lg">
      <StandByDisplay
        :order-id="order.id"
        :feedback-data="feedback"
        :ramp-contract="rampContract"
        :key="standByDisplayKey"
        @send-feedback="sendFeedback"
        @submit-appeal="submitAppeal"
      />
    </div>

    <!-- Payment Confirmation -->
    <div v-if="state === 'payment-confirmation'">
      <PaymentConfirmation
        :key="paymentConfirmationKey"
        :order-id="order.id"
        :type="confirmType"
        :contract-info="contractInfo"
        @confirm="handleConfirmPayment"
      />
    </div>
  </div>

  <!-- Completed transaction -->
  <div v-if="state === 'completed'">
    Completed Page
  </div>

  <!-- Dialogs -->
  <div v-if="openDialog" >
    <MiscDialogs
      :type="'genericDialog'"
      :title="title"
      :text="text"
      v-on:back="openDialog = false"
      v-on:submit="handleDialogResponse()"
    />
  </div>
</template>
<script>
import { formatCurrency, getWalletPrivateKey } from 'src/wallet/ramp'
import RampContract from 'src/wallet/ramp/contract'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import ReceiveOrder from './ReceiveOrder.vue'
import EscrowTransferProcess from './EscrowTransferProcess.vue'
import VerifyEscrowTx from './VerifyEscrowTx.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'
import StandByDisplay from './StandByDisplay.vue'
import PaymentConfirmation from './PaymentConfirmation.vue'
import { bus } from 'src/wallet/event-bus.js'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      isChipnet: this.$store.getters['global/isChipnet'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wsURL: process.env.RAMP_WS_URL + 'order/',
      authHeaders: this.$store.getters['ramp/authHeaders'],
      wallet: this.$store.getters['ramp/wallet'],
      websocket: null,
      state: '',
      isloaded: false,
      confirmType: '',

      dialogType: '',
      openDialog: false,

      ad: null,
      order: null,
      feedback: null,
      rampContract: null,
      contract: {
        address: null
      },
      fees: null,
      txid: null,
      status: null,
      title: '',
      text: '',
      verifyAction: null,

      standByDisplayKey: 0,
      escrowTransferProcessKey: 0,
      verifyEscrowTxKey: 0,
      paymentConfirmationKey: 0,

      errorMessages: [],
      selectedPaymentMethods: []
    }
  },
  components: {
    ReceiveOrder,
    StandByDisplay,
    ProgressLoader,
    MiscDialogs,
    EscrowTransferProcess,
    VerifyEscrowTx,
    PaymentConfirmation
  },
  props: {
    orderData: {
      type: Object,
      default: null
    }
  },
  computed: {
    contractInfo () {
      return {
        address: this.contract.address,
        balance: this.contract.balance
      }
    },
    transferAmount () {
      return Number(this.order.crypto_amount)
    },
    getAdLimits () {
      if (!this.ad) return
      const floor = formatCurrency(this.ad.trade_floor)
      const ceiling = formatCurrency(this.ad.trade_amount)
      return {
        floor: floor,
        ceiling: ceiling
      }
    },
    fiatAmount () {
      return (parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price))
    },
    cryptoAmount () {
      return (this.fiatAmount / this.order.locked_price).toFixed(8)
    },
    bchBalance () {
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
    vm.fetchOrderData()
      .then(() => {
        if (vm.contract) {
          vm.generateContract()
        }
        vm.fetchAdData()
          .then(() => {
            vm.isloaded = true
          })
        vm.setupWebsocket()
      })
    // if (!vm.order) {
    //   vm.order = vm.orderData
    // }
    // if (vm.order.status.value === 'RLS') {
    //   vm.getOrderFeedback()
    // }
  },
  beforeUnmount () {
    this.closeWSConnection()
  },
  methods: {
    // STEP CHECKER
    updateStatus (status) {
      const vm = this
      if (!status || vm.status === status) return
      vm.status = status
      vm.order.status = status
      vm.checkStep()
    },
    checkStep () {
      const vm = this
      vm.openDialog = false
      console.log('Checking step:', vm.status)
      switch (vm.status.value) {
        case 'SBM': // Submitted
          if (this.order.is_ad_owner) {
            vm.state = 'order-confirm-decline'
          } else {
            vm.state = 'standby-view'
          }
          break
        case 'CNF': { // Confirmed
          let state = null
          if (this.order.trade_type === 'BUY') {
            state = vm.order.is_ad_owner ? 'escrow-bch' : 'standby-view'
          } else if (this.order.trade_type === 'SELL') {
            state = vm.order.is_ad_owner ? 'standby-view' : 'escrow-bch'
          }
          vm.state = state
          if (vm.state === 'standby-view') {
            vm.standByDisplayKey++
          }
          if (vm.order.is_ad_owner && !vm.rampContract) {
            vm.generateContract()
          }
          break
        }
        case 'ESCRW_PN': { // Escrow Pending
          vm.verifyAction = 'ESCROW'
          let state = 'standby-view'
          let nextState = 'tx-confirmation'
          if (this.order.trade_type === 'BUY') {
            if (!vm.txid) nextState = 'escrow-bch'
            state = vm.order.is_ad_owner ? nextState : 'standby-view'
          } else if (this.order.trade_type === 'SELL') {
            state = vm.order.is_ad_owner ? 'standby-view' : nextState
          }
          vm.updateContractBalance()
          vm.state = state
          break
        }
        case 'ESCRW': // Escrowed
          if (this.order.trade_type === 'BUY') {
            vm.state = vm.order.is_ad_owner ? 'standby-view' : 'payment-confirmation'
          } else if (this.order.trade_type === 'SELL') {
            vm.state = vm.order.is_ad_owner ? 'payment-confirmation' : 'standby-view'
          }
          vm.confirmType = 'buyer'
          vm.updateContractBalance()
          break
        case 'PD_PN': // Paid Pending
          if (this.order.trade_type === 'BUY') {
            vm.state = vm.order.is_ad_owner ? 'payment-confirmation' : 'standby-view'
            vm.confirmType = vm.order.is_ad_owner ? 'seller' : 'buyer'
          } else if (this.order.trade_type === 'SELL') {
            vm.state = vm.order.is_ad_owner ? 'standby-view' : 'payment-confirmation'
            vm.confirmType = vm.order.is_ad_owner ? 'buyer' : 'seller'
          }
          break
        case 'PD': // Paid
          vm.state = 'standby-view'
          vm.verifyAction = 'RELEASE'
          if (this.order.trade_type === 'BUY') {
            vm.state = vm.order.is_ad_owner ? 'tx-confirmation' : 'standby-view'
          } else if (this.order.trade_type === 'SELL') {
            vm.state = vm.order.is_ad_owner ? 'standby-view' : 'tx-confirmation'
          }
          this.txid = null
          if (!this.rampContract) {
            vm.generateContract()
          }
          break
        case 'RFN': // Refunded
          vm.state = 'standby-view'
          vm.standByDisplayKey++
          vm.$store.commit('ramp/clearOrderTxids', vm.order.id)
          vm.updateContractBalance()
          break
        case 'RLS': // Released
          vm.state = 'standby-view'
          vm.standByDisplayKey++
          vm.$store.commit('ramp/clearOrderTxids', vm.order.id)
          vm.updateContractBalance()
          break
        default:
          // includes status = CNCL, APL, RFN_PN, RLS_PN
          this.state = 'standby-view'
          vm.standByDisplayKey++
          break
      }
      if (this.isExpired) {
        vm.state = 'standby-view'
      }
    },
    updateContractBalance () {
      const vm = this
      if (!vm.rampContract) return
      vm.rampContract.getBalance()
        .then(balance => {
          vm.contract.balance = balance
          vm.paymentConfirmationKey++
        })
    },

    // API CALLS
    fetchOrderData () {
      const vm = this
      const url = `${vm.apiURL}/order/${vm.orderData.id}`
      return new Promise((resolve, reject) => {
        vm.$axios.get(url, { headers: vm.authHeaders })
          .then(response => {
            vm.order = response.data.order
            vm.contract = response.data.contract
            vm.fees = response.data.fees
            vm.updateStatus(vm.order.status)
            resolve(response.data)
          })
          .catch(error => {
            console.error(error)
            if (error.response) {
              console.error(error.response)
              if (error.response.status === 403) {
                bus.emit('session-expired')
              }
            }
            reject(error)
          })
      })
    },
    fetchAdData () {
      const vm = this
      const adId = vm.order.ad.id
      const url = `${vm.apiURL}/ad/${adId}`
      return new Promise((resolve, reject) => {
        vm.$axios.get(url, { headers: vm.authHeaders })
          .then(response => {
            vm.ad = response.data
            resolve(response.data)
          })
          .catch(error => {
            console.error(error)
            if (error.response) {
              console.error(error.response)
              if (error.response.status === 403) {
                bus.emit('session-expired')
              }
            }
            reject(error)
          })
      })
    },
    confirmOrder () {
      const vm = this
      const orderID = vm.order.id
      const url = `${vm.apiURL}/order/${orderID}/confirm`
      vm.$axios.post(url, {}, { headers: vm.authHeaders })
        .then(response => {
          if (response.data && response.data.status.value === 'CNF') {
            vm.generateContract()
          }
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        })
    },
    cancelOrder () {
      const vm = this
      const orderID = vm.order.id
      const url = `${vm.apiURL}/order/${orderID}/cancel`
      vm.$axios.post(url, {}, { headers: vm.authHeaders })
        .then(response => {
          if (response.data && response.data.status.value === 'CNCL') {
            vm.updateStatus(response.data.status)
          }
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        })
    },
    sendConfirmPayment (type) {
      const vm = this
      vm.isloaded = false
      const url = `${this.apiURL}/order/${vm.order.id}/confirm-payment/${type}`
      const body = {
        payment_methods: this.selectedPaymentMethods
      }
      vm.$axios.post(url, body, { headers: vm.authHeaders })
        .then(response => {
          vm.updateStatus(response.data.status)
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        })
      vm.isloaded = true
    },
    async releaseCrypto () {
      const vm = this
      vm.txid = null
      const feContractAddr = await vm.rampContract.getAddress()
      const beContractAddr = vm.contract.address
      if (feContractAddr !== beContractAddr) {
        vm.errorMessages.push('contract addresses mismatched')
      }
      const privateKeyWif = await getWalletPrivateKey()
      vm.rampContract.release(privateKeyWif, vm.order.crypto_amount)
        .then(result => {
          vm.txid = result.txInfo.txid
          vm.verifyEscrowTxKey++

          const txidData = {
            id: vm.order.id,
            txidInfo: {
              action: 'RELEASE',
              txid: vm.txid
            }
          }
          vm.$store.commit('ramp/saveTxid', txidData)
        })
        .catch(error => {
          console.error('release error:', error.response)
        })
    },
    verifyRelease () {
      const vm = this
      const url = `${vm.apiURL}/order/${vm.order.id}/verify-release`
      const body = {
        txid: this.txid
      }
      vm.$axios.post(url, body, { headers: vm.authHeaders })
        .then(response => {
          vm.updateStatus(response.data.status)
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        })
    },
    verifyEscrow () {
      const vm = this
      const url = vm.apiURL + '/order/' + vm.order.id + '/escrow-verify'
      const body = {
        txid: vm.txid
      }
      vm.$axios.post(url, body, { headers: vm.authHeaders })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
          const errorMsg = error.response.data.error
          vm.errorMessages.push(errorMsg)
          vm.verifyEscrowTxKey++
        })
    },
    generateContract () {
      const vm = this
      vm.fetchOrderData()
        .then(data => {
          const contract = data.contract
          const fees = data.fees
          const publicKeys = {
            arbiter: contract.arbiter.public_key,
            seller: contract.seller.public_key,
            buyer: contract.buyer.public_key,
            servicer: contract.servicer.public_key
          }
          const addresses = {
            arbiter: contract.arbiter.address,
            seller: contract.seller.address,
            buyer: contract.buyer.address,
            servicer: contract.servicer.address
          }
          const fees_ = {
            arbitrationFee: fees.fees.arbitration_fee,
            serviceFee: fees.fees.service_fee,
            contractFee: fees.fees.hardcoded_fee
          }
          const timestamp = contract.timestamp
          vm.rampContract = new RampContract(publicKeys, fees_, addresses, timestamp, vm.isChipnet)
          vm.updateContractBalance()
        })
        .catch(error => {
          console.error(error)
        })
    },
    submitAppeal (data) {
      const vm = this
      const url = `${vm.apiURL}/order/${vm.order.id}/appeal`
      vm.$axios.post(url, data, { headers: vm.authHeaders })
        .then(response => {
          this.updateStatus(response.data.status)
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        })
    },
    sendFeedback (feedback) {
      const vm = this
      vm.isloaded = false
      const url = `${vm.apiURL}/order/feedback/peer`
      const body = {
        order_id: vm.order.id,
        rating: feedback.rating,
        comment: feedback.comment
      }
      vm.$axios.post(url, body, { headers: vm.authHeaders })
        .then(response => {
          const data = response.data
          vm.feedback = {
            rating: data.rating,
            comment: data.comment,
            is_posted: true
          }
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        })
      vm.isloaded = true
    },
    getOrderFeedback () {
      const vm = this
      const url = `${vm.apiURL}/order/feedback/peer`
      vm.$axios.get(url, {
        params: {
          from_peer: vm.$store.getters['ramp/getUser'].id,
          order_id: vm.order.id
        },
        headers: vm.authHeaders
      })
        .then(response => {
          if (response.data) {
            const data = response.data[0]
            vm.feedback = {
              rating: data.rating,
              comment: data.comment,
              is_posted: true
            }
          }
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        })
    },
    // Recieve Dialogs
    async handleDialogResponse () {
      const vm = this
      vm.isloaded = false
      switch (vm.dialogType) {
        case 'confirmReleaseCrypto':
          await this.releaseCrypto()
          // await vm.verifyRelease()
          break
        case 'confirmCancelOrder':
          vm.cancelOrder()
          vm.$emit('back')
          break
        case 'confirmOrder':
          vm.confirmOrder()
          // vm.fetchOrderData()
          // vm.checkStep()
          break
        case 'confirmPayment':
          vm.sendConfirmPayment(vm.confirmType)
          if (vm.confirmType === 'buyer') {
            vm.fetchOrderData()
          }
          break
      }
      vm.title = ''
      vm.text = ''
      vm.isloaded = true
    },

    // Opening Dialog
    confirmingOrder () {
      this.dialogType = 'confirmOrder'
      this.title = 'Confirm Order?'
      this.openDialog = true
    },
    cancellingOrder () {
      this.dialogType = 'confirmCancelOrder'
      this.openDialog = true
      this.title = 'Cancel this order?'
    },
    releasingCrypto () {
      this.dialogType = 'confirmReleaseCrypto'
      this.openDialog = true
      this.title = 'Release crypto?'
    },
    async handleConfirmPayment (data) {
      this.selectedPaymentMethods = data
      if (this.confirmType === 'buyer') {
        this.dialogType = 'confirmPayment'
        this.title = this.confirmType === 'buyer' ? 'Confirm Payment?' : 'Release Crypto?'
        this.text = this.confirmType === 'buyer' ? 'This will inform the seller that you already sent the fiat fee to one of their selected payment methods.' : 'This will release the crypto held by the escrow account to the buyer.'
        this.openDialog = true
      } else {
        this.sendConfirmPayment(this.confirmType)
        this.releaseCrypto()
      }
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
    onVerifyTxSuccess (status) {
      this.updateStatus(status)
    },
    onBack () {
      this.state = 'order-list'
    },
    onEscrowSuccess (txid) {
      const vm = this
      vm.txid = txid
      vm.fetchOrderData()
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
        if (data) {
          if (data.success) {
            if (data.status) {
              this.updateStatus(data.status.status)
            }
          }
          if (data.error) {
            this.errorMessages.push(data.error)
            this.verifyEscrowTxKey++
          } else if (data.errors) {
            this.errorMessages.push(...data.errors)
            this.verifyEscrowTxKey++
          }
          if (data.txid) {
            this.txid = data.txid
          }
          if (data.contract_address) {
            if (this.contract) {
              this.contract.address = data.contract_address
            } else {
              this.contract = {
                address: data.contract_address
              }
            }
            this.escrowTransferProcessKey++
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
