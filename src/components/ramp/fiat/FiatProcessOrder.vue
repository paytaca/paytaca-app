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
      @refresh="$emit('refresh')"
    />
    <EscrowTransferProcess
      v-if="state === 'escrow-bch'"
      :key="escrowTransferProcessKey"
      :data="escrowTransferData"
      @back="onBack"
      @success="onEscrowSuccess"
    />
    <VerifyEscrowTx
      v-if="state === 'tx-confirmation'"
      :key="verifyEscrowTxKey"
      :order-id="order.id"
      :contract-id="order.contract"
      :action="verifyAction"
      :escrow="rampContract"
      @back="onBack"
      @success="onVerifyTxSuccess"
      @refresh="$emit('refresh')"
    />
    <!-- Waiting Page -->
    <div v-if="state === 'standby-view'" class="q-px-lg">
      <StandByDisplay
        :key="standByDisplayKey"
        :escrow="rampContract"
        :order="order"
        :feedback="feedback"
        :contract-address="contract.address"
        @send-feedback="sendFeedback"
        @submit-appeal="submitAppeal"
        @refresh="$emit('refresh')"
      />
    </div>

    <!-- Payment Confirmation -->
    <div v-if="state === 'payment-confirmation'">
      <PaymentConfirmation
        :key="paymentConfirmationKey"
        :order-id="order.id"
        :type="confirmType"
        :ramp-contract="rampContract"
        :errors="errorMessages"
        :contract-address="contract.address"
        @expired="handleExpired"
        @verify-release="handleVerifyRelease"
        @refresh="$emit('refresh')"
      />
    </div>

    <!-- Chat button -->
    <div class="fixed" style="right: 35px; bottom: 100px;" v-if="status.value !== 'RLS'">
      <q-btn size="md" padding="sm" dense ripple round color="primary" icon="comment" @click="openChat = true"/>
    </div>
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
  <div v-if="openChat">
    <ChatDialog
      :openDialog="openChat"
      :data="order"
      v-on:close="openChat = false"
    />
  </div>
</template>
<script>
import { formatCurrency } from 'src/wallet/ramp'
import RampContract from 'src/wallet/ramp/contract'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import ReceiveOrder from './ReceiveOrder.vue'
import EscrowTransferProcess from './EscrowTransferProcess.vue'
import VerifyEscrowTx from './VerifyEscrowTx.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'
import ChatDialog from './dialogs/ChatDialog.vue'
import StandByDisplay from './StandByDisplay.vue'
import PaymentConfirmation from './PaymentConfirmation.vue'
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/wallet/ramp/backend'
import { addChatMembers } from 'src/wallet/ramp/chat'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      isChipnet: this.$store.getters['global/isChipnet'],
      wsURL: process.env.RAMP_WS_URL + 'order/',
      wallet: this.$store.getters['ramp/wallet'],
      websocket: null,
      state: '',
      isloaded: false,
      confirmType: '',

      dialogType: '',
      openDialog: false,
      openChat: false,

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
    PaymentConfirmation,
    ChatDialog
  },
  props: {
    orderData: {
      type: Object,
      default: null
    }
  },
  computed: {
    escrowTransferData () {
      return {
        order: this.order,
        arbiter: this.order.arbiter,
        contractAddress: this.contract.address,
        transferAmount: this.transferAmount,
        fees: this.fees
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
      const expiryDate = new Date(vm.order.expires_at)
      const exception = ['Released', 'Canceled']
      if (expiryDate < now && vm.order.expires_at && !exception.includes(vm.order.status.label)) {
        return true
      } else {
        return false
      }
    }
  },
  emits: ['back', 'refresh'],
  mounted () {
    const vm = this
    vm.fetchOrder()
      .then(order => {
        vm.fetchFees().then(fees => {
          if (order.contract) {
            vm.fetchContract().then(contract => vm.generateContract(contract, fees))
          }
        })
        vm.fetchAd()
          .then(() => {
            vm.isloaded = true
          })
        vm.fetchFeedback()

        vm.setupWebsocket()
      })
  },
  beforeUnmount () {
    this.closeWSConnection()
  },
  methods: {
    updateStatus (status) {
      console.log('Updating order status to:', status)
      const vm = this
      if (!status || vm.status === status) return
      vm.status = status
      vm.order.status = status
      vm.checkStep()
    },
    checkStep () {
      const vm = this
      vm.openDialog = false
      const status = vm.status.value
      if (this.isExpired) {
        if (!vm.isPdPendingRelease(status) && !vm.isStatusCompleted(status)) {
          vm.state = 'standby-view'
          vm.standByDisplayKey++
          return
        }
      }
      switch (status) {
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
          break
        }
        case 'ESCRW_PN': { // Escrow Pending
          // vm.generateContract()
          vm.txid = vm.$store.getters['ramp/getOrderTxid'](vm.order.id, 'ESCROW')
          vm.verifyAction = 'ESCROW'
          let state = 'standby-view'
          let nextState = 'tx-confirmation'
          if (!vm.txid) nextState = 'escrow-bch'
          if (this.order.trade_type === 'BUY') {
            state = vm.order.is_ad_owner ? nextState : 'standby-view'
          } else if (this.order.trade_type === 'SELL') {
            state = vm.order.is_ad_owner ? 'standby-view' : nextState
          }
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
          break
        case 'PD_PN': // Paid Pending
          vm.txid = null
          if (vm.order.trade_type === 'BUY') {
            vm.state = vm.order.is_ad_owner ? 'payment-confirmation' : 'standby-view'
            vm.confirmType = vm.order.is_ad_owner ? 'seller' : 'buyer'
          } else if (vm.order.trade_type === 'SELL') {
            vm.state = vm.order.is_ad_owner ? 'standby-view' : 'payment-confirmation'
            vm.confirmType = vm.order.is_ad_owner ? 'buyer' : 'seller'
          }
          break
        case 'PD': { // Paid
          vm.txid = vm.$store.getters['ramp/getOrderTxid'](vm.order.id, 'RELEASE')
          let state = 'standby-view'
          vm.verifyAction = 'RELEASE'
          let nextState = 'tx-confirmation'
          if (!vm.txid) nextState = 'payment-confirmation'
          if (vm.order.trade_type === 'BUY') {
            state = vm.order.is_ad_owner ? nextState : 'standby-view'
            vm.confirmType = vm.order.is_ad_owner ? 'seller' : 'buyer'
          } else if (vm.order.trade_type === 'SELL') {
            state = vm.order.is_ad_owner ? 'standby-view' : nextState
            vm.confirmType = vm.order.is_ad_owner ? 'buyer' : 'seller'
          }
          vm.state = state
          if (state === 'tx-confirmation') vm.verifyEscrowTxKey++
          break
        }
        case 'RFN': // Refunded
          vm.state = 'standby-view'
          vm.standByDisplayKey++
          vm.$store.commit('ramp/clearOrderTxids', vm.order.id)
          break
        case 'RLS': // Released
          vm.state = 'standby-view'
          vm.standByDisplayKey++
          vm.$store.commit('ramp/clearOrderTxids', vm.order.id)
          break
        default:
          // includes status = CNCL, APL, RFN_PN, RLS_PN
          this.state = 'standby-view'
          vm.standByDisplayKey++
          break
      }
      if (vm.state === 'standby-view') {
        vm.standByDisplayKey++
      }
    },
    isStatusCompleted (status) {
      return (status === 'CNCL' || status === 'RLS' || status === 'RFN')
    },
    isPdPendingRelease (status) {
      return status === 'PD'
    },
    fetchOrder () {
      return new Promise((resolve, reject) => {
        const vm = this
        const url = `/ramp-p2p/order/${vm.orderData.id}`
        backend.get(url, { authorize: true })
          .then(response => {
            console.log(response)
            vm.order = response.data
            vm.updateStatus(vm.order.status)
            resolve(response.data)
          })
          .catch(error => {
            if (error.response) {
              console.error(error.response)
              if (error.response.status === 403) {
                bus.emit('session-expired')
              }
            } else {
              console.error(error)
            }
            reject(error)
          })
      })
    },
    fetchAd () {
      return new Promise((resolve, reject) => {
        const vm = this
        const url = `/ramp-p2p/ad/${vm.order.ad.id}`
        backend.get(url, { authorize: true })
          .then(response => {
            vm.ad = response.data
            resolve(response.data)
          })
          .catch(error => {
            if (error.response) {
              console.error(error.response)
              if (error.response.status === 403) {
                bus.emit('session-expired')
              }
            } else {
              console.error(error)
            }
            reject(error)
          })
      })
    },
    confirmOrder () {
      const vm = this
      const url = `/ramp-p2p/order/${vm.order.id}/confirm`
      backend.post(url, {}, { authorize: true })
        .then(response => {
          console.log(response)
          vm.updateStatus(response.data.status)
          vm.generateContract()
        })
        .catch(error => {
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            console.error(error)
          }
        })
    },
    cancelOrder () {
      const vm = this
      const url = `/ramp-p2p/order/${vm.order.id}/cancel`
      backend.post(url, {}, { authorize: true })
        .then(response => {
          if (response.data && response.data.status.value === 'CNCL') {
            vm.updateStatus(response.data.status)
          }
        })
        .catch(error => {
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            console.error(error)
          }
        })
    },
    fetchFees () {
      return new Promise((resolve, reject) => {
        const url = '/ramp-p2p/order/contracts/fees'
        backend.get(url, { authorize: true })
          .then(response => {
            console.log(response)
            this.fees = response.data
            resolve(response.data)
          })
          .catch(error => {
            if (error.response) {
              console.error(error.response)
              if (error.response.status === 403) {
                bus.emit('session-expired')
              }
            } else {
              console.error(error)
            }
            reject(error)
          })
      })
    },
    fetchContract () {
      return new Promise((resolve, reject) => {
        const vm = this
        const url = `/ramp-p2p/order/contracts/${vm.order.contract}`
        backend.get(url, { authorize: true })
          .then(response => {
            vm.contract = response.data
            resolve(response.data)
          })
          .catch(error => {
            if (error.response) {
              console.error(error.response)
              if (error.response.status === 403) {
                bus.emit('session-expired')
              }
            } else {
              console.error(error)
            }
            reject(error)
          })
      })
    },
    generateContract (contract, fees) {
      const vm = this
      if (vm.rampContract) return
      const publicKeys = contract.pubkeys
      const addresses = contract.addresses
      const fees_ = {
        arbitrationFee: fees.breakdown.arbitration_fee,
        serviceFee: fees.breakdown.service_fee,
        contractFee: fees.breakdown.hardcoded_fee
      }
      const timestamp = contract.timestamp
      vm.rampContract = new RampContract(publicKeys, fees_, addresses, timestamp, vm.isChipnet)
      vm.paymentConfirmationKey++
      vm.standByDisplayKey++
      vm.verifyEscrowTxKey++
    },
    submitAppeal (data) {
      const vm = this
      backend.post(`/ramp-p2p/order/${vm.order.id}/appeal`, data, { authorize: true })
        .then(response => vm.updateStatus(response.data.status))
        .then(vm.addArbiterToChat())
        .catch(error => {
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            console.error(error)
          }
        })
    },
    sendFeedback (feedback) {
      const vm = this
      vm.isloaded = false
      const url = '/ramp-p2p/order/feedback/peer'
      const body = {
        order_id: vm.order.id,
        rating: feedback.rating,
        comment: feedback.comment
      }
      backend.post(url, body, { authorize: true })
        .then(response => {
          const data = response.data
          vm.feedback = {
            rating: data.rating,
            comment: data.comment,
            is_posted: true
          }
        })
        .catch(error => {
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            console.error(error)
          }
        })
      vm.isloaded = true
    },
    fetchFeedback () {
      const vm = this
      const url = '/ramp-p2p/order/feedback/peer'
      backend.get(url, {
        params: {
          limit: 7,
          page: 1,
          from_peer: vm.$store.getters['ramp/getUser'].id,
          order_id: vm.order.id
        },
        authorize: true
      })
        .then(response => {
          console.log(response.data)
          if (response.data) {
            const data = response.data.feedbacks[0]
            vm.feedback = {
              rating: data.rating,
              comment: data.comment,
              is_posted: true
            }
          }
        })
        .catch(error => {
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            console.error(error)
          }
        })
    },
    fetchOrderMembers (orderId) {
      return new Promise((resolve, reject) => {
        backend.get(`/ramp-p2p/order/${orderId}/members`, { authorize: true })
          .then(response => {
            console.log(response)
            resolve(response.data)
          })
          .catch(error => {
            if (error.response) {
              console.error(error.response)
            } else {
              console.error(error)
            }
            reject(error)
          })
      })
    },
    addArbiterToChat () {
      const vm = this
      const chatRef = `ramp-order-${vm.order.id}-chat`
      vm.fetchOrderMembers(vm.order.id)
        .then(members => {
          const arbiter = members.filter(member => member.is_arbiter === true)
          const arbiterMembers = arbiter.map(({ chat_identity_id }) => ({ chat_identity_id, is_admin: true }))
          addChatMembers(chatRef, arbiterMembers)
        })
    },
    // Recieve Dialogs
    handleExpired () {
      this.state = 'standby-view'
    },
    handleVerifyRelease (txid) {
      this.txid = txid
      this.checkStep()
    },
    async handleDialogResponse () {
      const vm = this
      vm.isloaded = false
      switch (vm.dialogType) {
        case 'confirmCancelOrder':
          vm.cancelOrder()
          vm.$emit('back')
          break
        case 'confirmOrder':
          vm.confirmOrder()
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
      // TODO: Add and handle emit event
      this.updateStatus(status)
    },
    onBack () {
      this.state = 'order-list'
    },
    onEscrowSuccess (txid) {
      const vm = this
      vm.txid = txid
      vm.fetchOrder()
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
