<template>
  <div v-if="!isloaded" class="row justify-center q-py-lg" style="margin-top: 50%">
    <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
  </div>
  <div v-if="isloaded" class="text-bow" :class="getDarkModeClass(darkMode)">
    <div class="q-pt-sm text-center text-weight-bold">
      <div class="lg-font-size">
        <span>{{ headerTitle.toUpperCase() }}</span>
      </div>
      <div class="text-center subtext sm-font-size q-mb-sm">
        {{
          $t(
            'OrderIdNo2',
            { ID: order?.id },
            `ORDER ID: ${ order?.id }`
          )
        }}
      </div>
    </div>
    <div ref="scrollTargetRef" :style="`height: ${scrollHeight}px`" style="overflow:auto;">
      <q-pull-to-refresh ref="pullToRefresh" @refresh="refreshContent">
        <div class="q-mx-lg q-px-sm q-mb-sm">
          <TradeInfoCard
            :order="order"
            :ad="ad"
            type="order"
            @view-ad="showAdSnapshot=true"
            @view-peer="onViewPeer"
            @view-reviews="showReviews=true"
            @view-chat="openChat=true"/>
        </div>
        <!-- Ad Owner Confirm / Decline -->
        <ReceiveOrder
          v-if="state === 'order-confirm-decline'"
          :data="receiveOrderData"
          @confirm="confirmingOrder"
          @cancel="cancellingOrder"
          @back="onBack"
        />
        <EscrowTransfer
          v-if="state === 'escrow-bch'"
          :key="escrowTransferKey"
          :data="escrowTransferData"
          @sending="onSendingBCH"
          @success="onEscrowSuccess"
          @back="onBack"
          @refresh="generateContract"
          @updateArbiterStatus="onUpdateArbiterStatus"
        />
        <VerifyTransaction
          v-if="state === 'tx-confirmation'"
          :key="verifyTransactionKey"
          :data="verifyTransactionData"
          @verifying="onVerifyingTx"
          @success="onVerifyTxSuccess"
          @back="onBack"
        />
        <!-- Waiting Page -->
        <div v-if="state === 'standby-view'">
          <StandByDisplay
            :key="standByDisplayKey"
            :data="standByDisplayData"
            @send-feedback="sendFeedback"
            @submit-appeal="submitAppeal"
            @back="onBack"
            @refresh="refreshContent"
            @cancel-order="cancellingOrder"
          />
        </div>

        <!-- Payment Confirmation -->
        <div v-if="state === 'payment-confirmation'">
          <PaymentConfirmation
            :key="paymentConfirmationKey"
            :data="paymentConfirmationData"
            @sending="onSendingBCH"
            @verify-release="handleVerifyRelease"
            @back="onBack"
          />
        </div>
        <div v-if="reconnectingWebSocket" class="fixed" style="right: 50px;" :style="$q.platform.is.ios? 'top: 130px' : 'top: 100px;'">
          <q-spinner-ios size="1.5em"/>
        </div>
      </q-pull-to-refresh>
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
  <AdSnapshotDialog v-if="showAdSnapshot" :order-id="order?.id" @back="showAdSnapshot=false"/>
  <UserProfileDialog v-if="showPeerProfile" :user-info="peerInfo" @back="showPeerProfile=false"/>
  <ChatDialog v-if="openChat" :order="order" @close="openChat=false"/>
  <ContractProgressDialog v-if="showContractProgDialog" :message="contractProgMsg"/>
</template>
<script>
import { formatCurrency } from 'src/wallet/ramp'
import { bus } from 'src/wallet/event-bus.js'
import { ref } from 'vue'
import { backend, getBackendWsUrl } from 'src/wallet/ramp/backend'
import { getChatBackendWsUrl } from 'src/wallet/ramp/chat/backend'
import { updateChatMembers, generateChatRef, fetchChatSession, createChatSession, updateOrderChatSessionRef } from 'src/wallet/ramp/chat'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import RampContract from 'src/wallet/ramp/contract'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import ReceiveOrder from './ReceiveOrder.vue'
import EscrowTransfer from './EscrowTransfer.vue'
import VerifyTransaction from './VerifyTransaction.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'
import ChatDialog from './dialogs/ChatDialog.vue'
import StandByDisplay from './StandByDisplay.vue'
import PaymentConfirmation from './PaymentConfirmation.vue'
import TradeInfoCard from './TradeInfoCard.vue'
import AdSnapshotDialog from './dialogs/AdSnapshotDialog.vue'
import UserProfileDialog from './dialogs/UserProfileDialog.vue'
import ContractProgressDialog from './dialogs/ContractProgressDialog.vue'

export default {
  setup () {
    const scrollTargetRef = ref(null)
    return {
      scrollTargetRef
    }
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      isChipnet: this.$store.getters['global/isChipnet'],
      websocket: {
        watchtower: null,
        chat: null
      },
      state: '',
      isloaded: false,
      confirmType: '',

      dialogType: '',
      openDialog: false,
      showChatButton: true,

      ad: null,
      order: null,
      feedback: null,
      escrowContract: null,
      contract: {
        address: null,
        addresses: []
      },
      fees: null,
      txid: null,
      status: null,
      title: '',
      text: '',
      verifyAction: null,

      standByDisplayKey: 0,
      escrowTransferKey: 0,
      verifyTransactionKey: 0,
      paymentConfirmationKey: 0,

      errorMessages: [],
      selectedPaymentMethods: [],
      autoReconWebSocket: true,
      reconnectingWebSocket: false,
      showAdSnapshot: false,
      showPeerProfile: false,
      openChat: false,
      peerInfo: {},
      hasUnread: false,
      chatRef: '',
      hideTradeInfo: false,
      hasArbiters: true,
      sendingBch: false,
      verifyingTx: false
    }
  },
  components: {
    ReceiveOrder,
    StandByDisplay,
    ProgressLoader,
    MiscDialogs,
    EscrowTransfer,
    VerifyTransaction,
    PaymentConfirmation,
    ChatDialog,
    TradeInfoCard,
    AdSnapshotDialog,
    UserProfileDialog,
    ContractProgressDialog
  },
  props: {
    orderData: {
      type: Object,
      default: null
    },
    notifType: {
      type: String,
      default: ''
    }
  },
  computed: {
    showContractProgDialog () {
      return this.sendingBch || this.verifyingTx
    },
    contractProgMsg () {
      if (this.sendingBch) {
        return this.$t('SendingBchPleaseWait')
      }
      if (this.verifyingTx) {
        return this.$t('VerifyingPleaseWait')
      }
      return ''
    },
    scrollHeight () {
      let height = this.$q.platform.is.ios ? this.$q.screen.height - 180 : this.$q.screen.height - 150
      if (this.sendingBch || this.verifyingTx) {
        height = height - 40
      } else if ((this.state === 'escrow-bch' && this.hasArbiters) || this.state === 'payment-confirmation') {
        height = height - 90
      }
      return height
    },
    headerTitle () {
      switch (this.state) {
        case 'order-confirm-decline':
        case 'standby-view':
          return this.order?.status?.label
        case 'escrow-bch':
          return 'Escrow bch'
        case 'tx-confirmation':
          return `verifying ${this.verifyAction}`
        case 'payment-confirmation':
          return this.confirmType === 'buyer' ? this.$t('PayFiat') : this.$t('ReleaseBCH')
        default:
          return ''
      }
    },
    escrowTransferData () {
      return {
        order: this.order,
        arbiter: this.order?.arbiter,
        contractAddress: this.contract?.address,
        transferAmount: this.transferAmount,
        fees: this.fees
      }
    },
    verifyTransactionData () {
      return {
        orderId: this.order.id,
        contractId: this.order.contract,
        arbiter: {
          name: this.order.arbiter.name,
          address: this.contract.addresses.arbiter
        },
        action: this.verifyAction,
        escrow: this.escrowContract
      }
    },
    standByDisplayData () {
      let arbiter = null
      if (this.order?.arbiter) {
        arbiter = {
          name: this.order.arbiter.name,
          address: this.contract.addresses.arbiter
        }
      }
      return {
        order: this.order,
        ad: this.ad,
        feedback: this.feedback,
        contractAddress: this.contract.address,
        arbiter: arbiter,
        escrow: this.escrowContract
      }
    },
    paymentConfirmationData () {
      return {
        order: this.order,
        ad: this.ad,
        type: this.confirmType,
        contract: this.contract,
        arbiter: {
          name: this.order.arbiter.name,
          address: this.contract.addresses.arbiter
        },
        errors: this.errorMessages,
        escrow: this.escrowContract
      }
    },
    receiveOrderData () {
      return {
        order: this.order,
        ad: this.ad
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
    hasChat () {
      const stat = ['RFN', 'RLS', 'CNCL']
      return !stat.includes(this.status.value) && this.showChatButton
    },
    bchBalance () {
      return this.$store.getters['assets/getAssets'][0].balance
    },
    isExpired () {
      const vm = this
      const now = new Date().getTime()
      const expiryDate = new Date(vm.order.expires_at)
      const exception = [
        this.$t('Released'),
        this.$t('Canceled')
      ]
      if (expiryDate < now && vm.order.expires_at && !exception.includes(vm.order.status.label)) {
        return true
      } else {
        return false
      }
    }
  },
  emits: ['back', 'refresh', 'view-ad'],
  watch: {
    reconnectingWebSocket () {
      this.reloadChildComponents()
    },
    state (val) {
      if (val === 'tx-confirmation') {
        this.onSendingBCH(false)
      }
    }
  },
  created () {
    bus.emit('hide-menu')
  },
  async mounted () {
    const vm = this
    await vm.fetchOrder()
    await vm.fetchFees()
    if (vm.order.contract) {
      await vm.generateContract()
    }
    vm.isloaded = true
    vm.fetchAd()
    vm.fetchFeedback().then(() => {
      if (this.notifType === 'new_message') { this.openChat = true }
    })
    this.setupWebsocket(20, 1000)
    this.setupChatWebsocket(20, 1000)
  },
  beforeUnmount () {
    this.autoReconWebSocket = false
    this.closeWSConnection()
    this.closeChatWSConnection()
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    onVerifyingTx (verifying) {
      this.verifyingTx = verifying
    },
    onSendingBCH (sending) {
      this.sendingBch = sending
    },
    onUpdateArbiterStatus (hasArbiters) {
      this.hasArbiters = hasArbiters
    },
    reloadChildComponents () {
      this.standByDisplayKey++
      this.escrowTransferKey++
      this.verifyTransactionKey++
      this.paymentConfirmationKey++
    },
    updateStatus (status) {
      const vm = this
      if (!status || vm.status === status) return
      vm.status = status
      vm.order.status = status
      vm.checkStep()
    },
    hideChat () {
      this.showChatButton = false
    },
    showChat () {
      this.showChatButton = true
    },
    async checkStep () {
      const vm = this
      vm.openDialog = false
      const status = vm.status.value
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
          vm.generateContract()
          vm.txid = vm.$store.getters['ramp/getOrderTxid'](vm.order.id, 'ESCROW')
          vm.verifyAction = 'ESCROW'
          let state = 'standby-view'
          let nextState = 'tx-confirmation'
          const contractBalance = await vm.escrowContract?.getBalance()
          if (!vm.txid && contractBalance === 0) nextState = 'escrow-bch'
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
          const balance = await vm.escrowContract?.getBalance()
          let state = 'standby-view'
          vm.verifyAction = 'RELEASE'
          let nextState = 'tx-confirmation'
          if (!vm.txid || balance > 0) nextState = 'payment-confirmation'
          if (vm.order.trade_type === 'BUY') {
            state = vm.order.is_ad_owner ? nextState : 'standby-view'
            vm.confirmType = vm.order.is_ad_owner ? 'seller' : 'buyer'
          } else if (vm.order.trade_type === 'SELL') {
            state = vm.order.is_ad_owner ? 'standby-view' : nextState
            vm.confirmType = vm.order.is_ad_owner ? 'buyer' : 'seller'
          }
          vm.state = state
          if (state === 'tx-confirmation') vm.verifyTransactionKey++
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
            vm.order = response.data
            vm.updateStatus(vm.order.status)
            vm.updateOrderReadAt()
            const members = [vm.order?.members.buyer.public_key, vm.order?.members.seller.public_key].join('')
            const chatRef = generateChatRef(vm.order.id, vm.order.created_at, members)
            vm.chatRef = chatRef
            if (vm.order?.chat_session_ref !== chatRef) {
              updateOrderChatSessionRef(vm.order?.id, chatRef)
              fetchChatSession(chatRef)
                .then(res => {
                  vm.hasUnread = res.data.unread_count > 0
                })
                .catch(error => {
                  console.log(error)
                  if (error.response?.status === 404) {
                    vm.createGroupChat(vm.order?.id, chatRef)
                  }
                })
            }
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
    async createGroupChat (orderId, chatRef) {
      if (!orderId) throw Error(`Missing required parameter: orderId (${orderId})`)
      const vm = this
      const members = await vm.fetchOrderMembers(orderId)
      const chatMembers = members.map(({ chat_identity_id }) => ({ chat_identity_id, is_admin: true }))
      createChatSession(orderId, chatRef)
        .then(chatRef => { updateChatMembers(chatRef, chatMembers) })
        .catch(console.error)
    },
    updateOrderReadAt () {
      const vm = this
      if (vm.orderData.read_at) return
      return new Promise((resolve, reject) => {
        const url = `/ramp-p2p/order/${vm.orderData.id}/members`
        backend.patch(url, null, { authorize: true })
          .then(response => {
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
          .finally(() => { this.reloadChildComponents() })
      })
    },
    confirmOrder () {
      const vm = this
      const url = `/ramp-p2p/order/${vm.order.id}/confirm`
      backend.post(url, {}, { authorize: true })
        .then(response => {
          vm.updateStatus(response.data.status)
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
        const vm = this
        const url = '/ramp-p2p/order/contract/fees'
        backend.get(url, { authorize: true })
          .then(response => {
            vm.fees = response.data
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
        const url = '/ramp-p2p/order/contract'
        backend.get(url, {
          params: {
            order_id: vm.order?.id
          },
          authorize: true
        })
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
    async generateContract () {
      console.log('generating contract..')
      const vm = this
      const fees = await vm.fetchFees()
      await vm.fetchContract().then(async contract => {
        if (vm.escrowContract || !contract) return
        const publicKeys = contract.pubkeys
        const addresses = contract.addresses
        const fees_ = {
          arbitrationFee: fees.breakdown?.arbitration_fee,
          serviceFee: fees.breakdown?.service_fee,
          contractFee: fees.breakdown?.hardcoded_fee
        }
        const timestamp = contract.timestamp
        vm.escrowContract = new RampContract(publicKeys, fees_, addresses, timestamp, vm.isChipnet)
        vm.reloadChildComponents()
      })
    },
    submitAppeal (data) {
      const vm = this
      backend.post(`/ramp-p2p/order/${vm.order.id}/appeal`, data, { authorize: true })
        .then(response => {
          vm.updateStatus(response.data.status.status)
        })
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
          vm.standByDisplayKey++
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
      return new Promise((resolve, reject) => {
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
            if (response.data) {
              const data = response.data.feedbacks[0]
              if (data) {
                vm.feedback = {
                  rating: data.rating,
                  comment: data.comment,
                  is_posted: true
                }
              }
              resolve(response.data)
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
            reject(error)
          })
      })
    },
    fetchOrderMembers (orderId) {
      return new Promise((resolve, reject) => {
        backend.get(`/ramp-p2p/order/${orderId}/members`, { authorize: true })
          .then(response => {
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
      const members = [vm.order?.members.buyer.public_key, vm.order?.members.seller.public_key].join('')
      const chatRef = generateChatRef(vm.order.id, vm.order.created_at, members)
      vm.fetchOrderMembers(vm.order.id)
        .then(members => {
          const arbiter = members.filter(member => member.is_arbiter === true)
          const arbiterMembers = arbiter.map(({ chat_identity_id }) => ({ chat_identity_id, is_admin: true }))
          updateChatMembers(chatRef, arbiterMembers)
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
          vm.onBack()
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
      this.title = this.$t('ConfirmOrder')
      this.openDialog = true
    },
    cancellingOrder () {
      this.dialogType = 'confirmCancelOrder'
      this.openDialog = true
      this.title = this.$t('CancelThisOrder')
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
    onEscrowSuccess (txid) {
      this.txid = txid
      this.fetchOrder()
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
    setupChatWebsocket (retries, delayDuration) {
      const wsChatUrl = `${getChatBackendWsUrl()}${this.chatRef}/`
      this.websocket.chat = new WebSocket(wsChatUrl)
      this.websocket.chat.onopen = () => {
        console.log('Chat WebSocket connection established to ' + wsChatUrl)
      }
      this.websocket.chat.onmessage = (event) => {
        const parsedData = JSON.parse(event.data)
        console.log('Chat WebSocket data:', parsedData)
        if (parsedData?.type === 'new_message') {
          const messageData = parsedData.data
          // RECEIVE MESSAGE
          console.log('Received a new message:', messageData)
          bus.emit('last-read-update')
          if (this.openChat) {
            bus.emit('new-message', messageData)
          }
        }
      }
      this.websocket.chat.onclose = () => {
        console.log('Chat WebSocket connection closed.')
        if (this.autoReconWebSocket && retries > 0) {
          // this.reconnectingWebSocket = true
          console.log(`Chat WS reconnection failed. Retrying in ${delayDuration / 1000} seconds...`)
          return this.delay(delayDuration)
            .then(() => this.setupChatWebsocket(retries - 1, delayDuration * 2))
        }
      }
    },
    setupWebsocket (retries, delayDuration) {
      const wsWatchtowerUrl = `${getBackendWsUrl()}order/${this.order.id}/`
      this.websocket.watchtower = new WebSocket(wsWatchtowerUrl)
      this.websocket.watchtower.onopen = () => {
        console.log('WebSocket connection established to ' + wsWatchtowerUrl)
      }
      this.websocket.watchtower.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('WebSocket data:', data)
        if (data?.txdata) {
          this.verifyingTx = false
        }
        this.fetchOrder()
          .then(() => {
            if (data?.contract_address) {
              this.fetchContract().then(() => { this.escrowTransferKey++ })
            }
          })
      }
      this.websocket.watchtower.onclose = () => {
        console.log('WebSocket connection closed.')
        if (this.autoReconWebSocket && retries > 0) {
          this.reconnectingWebSocket = true
          console.log(`Websocket reconnection failed. Retrying in ${delayDuration / 1000} seconds...`)
          return this.delay(delayDuration)
            .then(() => this.setupWebsocket(retries - 1, delayDuration * 2))
        }
      }
    },
    closeWSConnection () {
      if (this.websocket.watchtower) this.websocket.watchtower.close()
    },
    closeChatWSConnection () {
      if (this.websocket.chat) this.websocket.chat.close()
    },
    delay (duration) {
      return new Promise(resolve => setTimeout(resolve, duration))
    },
    onBack () {
      bus.emit('show-menu', 'orders')
      this.$emit('back')
    },
    onViewPeer (data) {
      this.peerInfo = data
      this.showPeerProfile = true
    },
    refreshContent (done) {
      if (done) {
        this.$emit('refresh', done)
      } else {
        this.$refs.pullToRefresh.trigger()
      }
    }
  }
}
</script>
<style lang="scss" scoped>

.xs-font-size {
  font-size: smaller;
}
.sm-font-size {
  font-size: small;
}
.md-font-size {
  font-size: medium;
}
.lg-font-size {
  font-size: large;
}
.subtext {
  opacity: .5;
}
</style>
