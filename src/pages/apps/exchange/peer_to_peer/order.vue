<template>
    <HeaderNav :title="`P2P Exchange`" backnavpath="/apps/exchange/peer-to-peer/orders"/>
    <div v-if="!isloaded" class="row justify-center q-py-lg" style="margin-top: 50%">
      <ProgressLoader />
    </div>
    <div v-if="isloaded" class="text-bow" :class="getDarkModeClass(darkMode)">
      <div class="text-center text-weight-bold">
          <div padding="none none" class="lg-font-size" flat dense>{{ headerTitle.toUpperCase() }}</div>
        <div class="text-center subtext sm-font-size q-mb-sm">
          {{
            $t(
              'OrderIdNo2',
              { ID: order?.id },
              `ORDER ID: ${ order?.id }`
            )
          }}
        </div>
        <q-btn :color="darkMode ? 'white' : 'grey-6'" padding="0" round flat @click="showStatusHistory=true" dense size="1em" icon="notifications" :style="$q.platform.is.ios ? 'top: 110px' : 'top: 80px'" style="position: fixed; right: 40px;">
          <q-badge v-if="order?.has_unread_status" floating rounded color="red"/>
        </q-btn>
      </div>
      <div :style="`height: ${scrollHeight}px`" style="overflow:auto;">
        <q-pull-to-refresh ref="pullToRefresh" @refresh="refreshPage">
          <div class="q-mx-lg q-px-sm q-mb-sm">
            <TradeInfoCard
              :key="tradeInfoCardKey"
              :order="order"
              :ad="ad"
              type="order"
              @view-ad="showAdSnapshot=true"
              @view-peer="onViewPeer"
              @view-reviews="showReviews=true"
              @view-chat="openChat=true"/>
          </div>
          <EscrowTransfer
            ref="escrowTransferRef"
            v-if="state === 'escrow-bch'"
            :key="escrowTransferKey"
            :data="escrowTransferData"
            @sending="onSendingBCH"
            @success="onEscrowSuccess"
            @back="onBack"
            @refresh="generateContract"
            @updateArbiterStatus="onUpdateArbiterStatus"
            @cancel="cancellingOrder"
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
              ref="standbyRef"
              :key="standByDisplayKey"
              :data="standByDisplayData"
              @send-feedback="sendFeedback"
              @refresh="refreshPage"
              @back="onBack"
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
              @refresh="refreshPage"
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
    <AdSnapshotDialog :key="adSnapshotDialogKey" v-if="showAdSnapshot" :order-id="order?.id" @back="showAdSnapshot=false"/>
    <UserProfileDialog :key="userProfileDialogKey" v-if="showPeerProfile" :user-info="peerInfo" @back="showPeerProfile=false"/>
    <ChatDialog :key="chatDialogKey" v-if="openChat" :order="order" @close="openChat=false"/>
    <ContractProgressDialog v-if="showContractLoading" :message="contractLoadingMessage"/>
    <OrderStatusDialog v-if="showStatusHistory" :order-id="order?.id" :trader-type="userTraderType" @back="showStatusHistory=false; order.has_unread_status=false" />
    <NoticeBoardDialog v-if="showNoticeDialog" :type="noticeType" action="orders" :message="errorMessage" @hide="showNoticeDialog = false"/>
  </template>
<script>
import { bchToFiat, formatCurrency, formatDate, satoshiToBch } from 'src/exchange'
import { bus } from 'src/wallet/event-bus.js'
import { backend, getBackendWsUrl } from 'src/exchange/backend'
import { getChatBackendWsUrl } from 'src/exchange/chat/backend'
import { updateChatMembers, generateChatRef, fetchChatSession, createChatSession, updateOrderChatSessionRef } from 'src/exchange/chat'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { WebSocketManager } from 'src/exchange/websocket/manager'
import NoticeBoardDialog from 'src/components/ramp/fiat/dialogs/NoticeBoardDialog.vue'
import HeaderNav from 'src/components/header-nav.vue'
import RampContract from 'src/exchange/contract'
import ProgressLoader from 'src/components/ProgressLoader.vue'
// import ReceiveOrder from 'src/components/ramp/fiat/ReceiveOrder.vue'
import EscrowTransfer from 'src/components/ramp/fiat/EscrowTransfer.vue'
import VerifyTransaction from 'src/components/ramp/fiat/VerifyTransaction.vue'
import MiscDialogs from 'src/components/ramp/fiat/dialogs/MiscDialogs.vue'
import ChatDialog from 'src/components/ramp/fiat/dialogs/ChatDialog.vue'
import StandByDisplay from 'src/components/ramp/fiat/StandByDisplay.vue'
import PaymentConfirmation from 'src/components/ramp/fiat/PaymentConfirmation.vue'
import TradeInfoCard from 'src/components/ramp/fiat/TradeInfoCard.vue'
import AdSnapshotDialog from 'src/components/ramp/fiat/dialogs/AdSnapshotDialog.vue'
import UserProfileDialog from 'src/components/ramp/fiat/dialogs/UserProfileDialog.vue'
import ContractProgressDialog from 'src/components/ramp/fiat/dialogs/ContractProgressDialog.vue'
import OrderStatusDialog from 'src/components/ramp/appeal/dialogs/OrderStatusDialog.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      isChipnet: this.$store.getters['global/isChipnet'],
      websockets: {
        order: null,
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
      tradeInfoCardKey: 0,
      userProfileDialogKey: 0,
      adSnapshotDialogKey: 0,
      chatDialogKey: 0,

      errorMessages: [],
      errorMessage: null,
      selectedPaymentMethods: [],
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
      verifyingTx: false,
      showStatusHistory: false,
      noticeType: 'info',
      showNoticeDialog: false
    }
  },
  components: {
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
    ContractProgressDialog,
    HeaderNav,
    OrderStatusDialog,
    NoticeBoardDialog
  },
  props: {
    notifType: {
      type: String,
      default: ''
    }
  },
  computed: {
    userTraderType () {
      const user = this.$store.getters['ramp/getUser']
      if (this.order?.owner?.id === user.id) {
        return this.order?.trade_type === 'BUY' ? 'BUYER' : 'SELLER'
      }
      return this.order?.ad?.trade_type === 'BUY' ? 'BUYER' : 'SELLER'
    },
    showContractLoading () {
      return this.sendingBch || this.verifyingTx
    },
    contractLoadingMessage () {
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
          if (this.order?.status?.value === 'CNF') {
            return 'Escrow Pending'
          } else { return this.order?.status?.label }
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
    transferAmount () {
      return Number(this.order.trade_amount)
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
      return bchToFiat(satoshiToBch(this.order?.trade_amount), this.order?.price)
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
    bus.on('relogged', this.refreshPage)
    bus.on('update-status', this.handleNewStatus)
  },
  async mounted () {
    await this.loadData()
    this.setupWebSocket()
  },
  beforeUnmount () {
    this.closeWSConnection()
  },
  methods: {
    formatDate,
    getDarkModeClass,

    async loadData () {
      try {
        const vm = this
        await vm.fetchOrder()
        if (vm.order.contract) {
          await vm.generateContract()
        }
        await vm.fetchAd()
        await vm.fetchFeedback()
        if (this.notifType === 'new_message') { this.openChat = true }
        vm.isloaded = true
      } catch (error) {
        console.error(error)
      }
    },

    async fetchOrder () {
      const vm = this
      const url = `/ramp-p2p/order/${this.$route.params?.order}/`
      await backend.get(url, { authorize: true })
        .then(response => {
          vm.order = response.data
          vm.handleNewStatus(vm.order.status)
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
                if (error.response?.status === 404) {
                  vm.createGroupChat(vm.order?.id, chatRef)
                }
                this.handleRequestError(error)
              })
          }
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },

    async generateContract () {
      const vm = this
      await vm.fetchFees()
      await vm.fetchContract()
      if (vm.escrowContract || !vm.contract) return
      const publicKeys = vm.contract.pubkeys
      const addresses = vm.contract.addresses
      const fees_ = {
        arbitrationFee: vm.fees?.breakdown?.arbitration_fee,
        serviceFee: vm.fees?.breakdown?.service_fee,
        contractFee: vm.fees?.breakdown?.contract_fee
      }
      const timestamp = vm.contract.timestamp
      vm.escrowContract = new RampContract(publicKeys, fees_, addresses, timestamp, vm.isChipnet)
      vm.reloadChildComponents()
    },

    async fetchAd () {
      const vm = this
      const url = `/ramp-p2p/order/${vm.order.id}/ad/snapshot/`
      await backend.get(url, { authorize: true })
        .then(response => {
          vm.ad = response.data
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },

    async fetchFeedback () {
      const vm = this
      const url = '/ramp-p2p/order/feedback/peer/'
      const params = {
        limit: 7,
        page: 1,
        from_peer: vm.$store.getters['ramp/getUser'].id,
        order_id: vm.order.id
      }
      await backend.get(url, { params: params, authorize: true })
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
          }
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },

    async updateOrderReadAt () {
      const vm = this
      if (vm.order?.read_at) return
      const url = `/ramp-p2p/order/${vm.order?.id || vm.$route.params?.order}/members/`
      backend.patch(url, null, { authorize: true }).catch(error => { this.handleRequestError(error) })
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

    async fetchOrderMembers (orderId) {
      try {
        const response = await backend.get(`/ramp-p2p/order/${orderId}/members/`, { authorize: true })
        return response.data
      } catch (error) {
        this.handleRequestError(error)
      }
    },

    handleNewStatus (newStatus) {
      this.updateStatus(newStatus)
      this.updateStateByStatus(newStatus?.value)
    },

    updateStatus (newStatus) {
      if (!newStatus || this.status === newStatus) return
      this.status = newStatus
      this.order.status = newStatus
    },

    async updateStateByStatus (status = this.status.value) {
      const order = this.order
      const kwargs = {
        tradeType: order?.trade_type,
        userIsAdOwner: order?.is_ad_owner
      }
      let state = null
      let confirmType = null

      switch (status) {
        case 'SBM': // Submitted
          state = this.getSubmittedState(kwargs)
          break
        case 'CNF': { // Confirmed
          state = this.getConfirmedState(kwargs)
          break
        }
        case 'ESCRW_PN': { // Escrow Pending
          await this.generateContract()
          const balance = await this.escrowContract?.getBalance()

          kwargs.orderId = order?.id
          kwargs.contractBalance = balance
          state = this.getEscrowPendingState(kwargs)
          break
        }
        case 'ESCRW': // Escrowed
          state = this.getEscrowedState(kwargs)
          this.reloadChildComponents()
          break
        case 'PD_PN': // Paid Pending
          this.txid = null
          state = this.getPaidPendingState(kwargs)
          confirmType = this.getConfirmTypeByTradeType(kwargs)
          break
        case 'PD': { // Paid
          kwargs.orderId = order?.id
          kwargs.contractBalance = await this.escrowContract?.getBalance()
          state = this.getPaidState(kwargs)
          confirmType = this.getConfirmTypeByTradeType(kwargs)
          if (state === 'tx-confirmation') this.verifyTransactionKey++
          break
        }
        case 'RFN': // Refunded
        case 'RLS': // Released
          this.clearStoredTxids(this.order?.id)
          state = this.getDefaultState()
          this.reloadChildComponents()
          break
        default:
          // includes status = CNCL, APL, RFN_PN, RLS_PN
          state = this.getDefaultState()
          this.reloadChildComponents()
          break
      }
      if (confirmType) this.confirmType = confirmType
      this.state = state
    },

    getSubmittedState (kwargs) {
      return kwargs?.userIsAdOwner ? 'order-confirm-decline' : 'standby-view'
    },

    getConfirmedState (kwargs) {
      let state = null
      if (kwargs?.tradeType === 'BUY') {
        state = kwargs?.userIsAdOwner ? 'escrow-bch' : 'standby-view'
      }
      if (kwargs?.tradeType === 'SELL') {
        state = kwargs?.userIsAdOwner ? 'standby-view' : 'escrow-bch'
      }
      return state
    },

    getEscrowPendingState (kwargs) {
      this.txid = this.$store.getters['ramp/getOrderTxid'](kwargs?.orderId, 'ESCROW')
      this.verifyAction = 'ESCROW'

      let state = 'standby-view'
      let nextState = 'tx-confirmation'

      if (!this.txid && kwargs?.contractBalance === 0) nextState = 'escrow-bch'
      if (kwargs?.tradeType === 'BUY') {
        state = kwargs.userIsAdOwner ? nextState : 'standby-view'
      }
      if (kwargs?.tradeType === 'SELL') {
        state = kwargs?.userIsAdOwner ? 'standby-view' : nextState
      }
      return state
    },

    getEscrowedState (kwargs) {
      let state = null
      if (kwargs?.tradeType === 'BUY') {
        state = kwargs?.userIsAdOwner ? 'standby-view' : 'payment-confirmation'
      }
      if (kwargs?.tradeType === 'SELL') {
        state = kwargs?.userIsAdOwner ? 'payment-confirmation' : 'standby-view'
      }
      this.confirmType = 'buyer'
      return state
    },

    getPaidPendingState (kwargs) {
      if (kwargs?.tradeType === 'BUY') {
        return kwargs?.userIsAdOwner ? 'payment-confirmation' : 'standby-view'
      }
      if (kwargs?.tradeType === 'SELL') {
        return kwargs?.userIsAdOwner ? 'standby-view' : 'payment-confirmation'
      }
    },

    getConfirmTypeByTradeType (kwargs) {
      if (kwargs?.tradeType === 'BUY') return kwargs?.userIsAdOwner ? 'seller' : 'buyer'
      if (kwargs?.tradeType === 'SELL') return kwargs?.userIsAdOwner ? 'buyer' : 'seller'
    },

    getPaidState (kwargs) {
      this.verifyAction = 'RELEASE'
      this.txid = this.getTxidByAction({ orderId: kwargs?.orderId, action: this.verifyAction })

      let nextState = 'tx-confirmation'

      if (!this.txid || kwargs?.contractBalance > 0) nextState = 'payment-confirmation'
      if (kwargs?.tradeType === 'BUY') {
        return kwargs?.userIsAdOwner ? nextState : 'standby-view'
      }
      if (kwargs?.tradeType === 'SELL') {
        return kwargs?.userIsAdOwner ? 'standby-view' : nextState
      }
      return 'standby-view'
    },

    getDefaultState () {
      return 'standby-view'
    },

    getTxidByAction (kwargs) {
      return this.$store.getters['ramp/getOrderTxid'](kwargs?.orderId, kwargs?.action)
    },

    clearStoredTxids (orderId) {
      this.$store.commit('ramp/clearOrderTxids', orderId)
    },

    async cancelOrder () {
      const vm = this
      const url = `/ramp-p2p/order/${vm.order.id}/cancel/`
      await backend.post(url, {}, { authorize: true })
        .then(response => {
          if (response.data && response.data.status.value === 'CNCL') {
            vm.handleNewStatus(response.data.status)
          }
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },

    async fetchFees () {
      const vm = this
      const url = `/ramp-p2p/order/${vm.order?.id}/contract/fees/`
      await backend.get(url, { authorize: true })
        .then(response => {
          vm.fees = response.data
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },

    async fetchContract () {
      try {
        const url = `/ramp-p2p/order/${this.order?.id}/contract/`
        const response = await backend.get(url, { authorize: true })
        this.contract = response.data
      } catch (error) {
        this.handleRequestError(error)
      }
      return this.contract
    },

    async sendFeedback (feedback) {
      const vm = this
      vm.isloaded = false
      const url = '/ramp-p2p/order/feedback/peer/'
      const body = {
        order_id: vm.order.id,
        rating: feedback.rating,
        comment: feedback.comment
      }
      await backend.post(url, body, { authorize: true })
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
          this.handleRequestError(error)
        })
      vm.isloaded = true
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

    async refreshPage (done) {
      if (this.sendingBch || this.verifyingTx) {
        if (done) done()
        return
      }
      await this.loadData()
      if (done) done()
    },

    onVerifyingTx (verifying) {
      this.verifyingTx = verifying
    },

    onVerifyTxSuccess () {
      this.sendingBch = false
      this.verifyingTx = false
      this.fetchOrder()
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
      this.tradeInfoCardKey++
      this.userProfileDialogKey++
      this.adSnapshotDialogKey++
      this.chatDialogKey++
    },

    hideChat () {
      this.showChatButton = false
    },

    showChat () {
      this.showChatButton = true
    },

    // Recieve Dialogs
    handleVerifyRelease (txid) {
      this.txid = txid
      this.updateStateByStatus()
    },

    async handleDialogResponse () {
      const vm = this
      vm.isloaded = false
      switch (vm.dialogType) {
        case 'confirmCancelOrder':
          if (this.$refs.standbyRef) { this.$refs.standbyRef.loadCancelButton = true }
          if (this.$refs.escrowTransferRef) { this.$refs.escrowTransferRef.loadCancelButton = true}
          vm.cancelOrder()
          vm.onBack()
          break
      }
      vm.title = ''
      vm.text = ''
      vm.isloaded = true
    },

    cancellingOrder () {
      this.dialogType = 'confirmCancelOrder'
      this.openDialog = true
      this.title = this.$t('CancelThisOrder')
    },

    // Others

    onEscrowSuccess (txid) {
      this.txid = txid
      this.fetchOrder()
    },

    setupWebSocket () {
      this.closeWSConnection()
      // Subscribe to order updates
      this.websockets.order = new WebSocketManager()
      this.websockets.order.setWebSocketUrl(`${getBackendWsUrl()}order/${this.order.id}/`)
      this.websockets.order.subscribeToMessages(async (message) => {
        if (message?.success) {
          if (message?.txdata) {
            this.verifyingTx = false
            this.sendingBch = false
          }
          await this.fetchOrder()
          if (message?.contract_address) {
            await this.fetchContract()
            this.escrowTransferKey++
          }
        } else {
          if ((message?.action === 'ESCROW' || message?.action === 'RELEASE') &&
            this.userTraderType === 'SELLER') {
            this.noticeType = 'error'
            this.errorMessage = message?.error
            this.showNoticeDialog = true
          }
        }
      })

      // Subscribe to chat
      this.websockets.chat = new WebSocketManager()
      this.websockets.chat.setWebSocketUrl(`${getChatBackendWsUrl()}${this.chatRef}/`)
      this.websockets.chat.subscribeToMessages(message => {
        if (message?.type === 'new_message') {
          const messageData = message.data
          // RECEIVE MESSAGE
          console.log('Received a new message:', messageData)
          bus.emit('last-read-update')
          if (this.openChat) {
            bus.emit('new-message', messageData)
          }
        }
      })
    },

    closeWSConnection () {
      this.websockets?.order?.closeConnection()
      this.websockets?.chat?.closeConnection()
    },

    onBack () {
      bus.emit('show-menu', 'orders')
      this.$emit('back')
    },

    onViewPeer (data) {
      this.peerInfo = data
      this.showPeerProfile = true
    },

    handleRequestError (error) {
      bus.emit('handle-request-error', error)
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
