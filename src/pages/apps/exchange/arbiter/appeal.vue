<template>
  <HeaderNav :title="`Ramp Appeals`" :backnavpath="previousRoute" class="header-nav" />
  
  <!-- Skeleton Loading State -->
  <div v-if="!isloaded || !escrowContract" class="q-mx-md q-pa-md text-bow" :class="getDarkModeClass(darkMode)">
    <!-- Header Skeleton -->
    <div class="text-center q-pb-md">
      <q-skeleton type="text" width="200px" height="24px" class="q-mb-xs" style="margin: 0 auto;" />
      <q-skeleton type="text" width="120px" height="16px" style="margin: 0 auto;" />
    </div>
    
    <!-- Trade Info Card Skeleton -->
    <q-card class="br-15 q-mb-md" bordered flat :class="[darkMode ? 'pt-card-2 dark' : '']">
      <q-card-section>
        <div class="row items-center q-mb-sm">
          <q-skeleton type="QAvatar" size="40px" class="q-mr-sm" />
          <div class="col">
            <q-skeleton type="text" width="60%" height="18px" class="q-mb-xs" />
            <q-skeleton type="text" width="40%" height="14px" />
          </div>
        </div>
        <q-skeleton type="rect" height="80px" class="q-mt-md" style="border-radius: 12px;" />
      </q-card-section>
    </q-card>
    
    <!-- Appeal Details Skeleton -->
    <q-card class="br-15 q-mb-md" bordered flat :class="[darkMode ? 'pt-card-2 dark' : '']">
      <q-card-section>
        <div class="row items-start q-mb-sm">
          <div class="col">
            <q-skeleton type="QBadge" width="80px" height="20px" class="q-mb-sm" />
            <q-skeleton type="text" width="70%" height="18px" class="q-mb-xs" />
            <q-skeleton type="text" width="50%" height="16px" class="q-mb-xs" />
            <q-skeleton type="text" width="45%" height="14px" class="q-mb-sm" />
            <div class="row q-gutter-xs">
              <q-skeleton type="QBadge" width="70px" height="18px" />
              <q-skeleton type="QBadge" width="90px" height="18px" />
            </div>
          </div>
          <q-skeleton type="QBtn" size="40px" />
        </div>
      </q-card-section>
    </q-card>
    
    <!-- Contract Info Skeleton -->
    <q-card class="br-15 q-mb-md" bordered flat :class="[darkMode ? 'pt-card-2 dark' : '']">
      <q-card-section>
        <q-skeleton type="text" width="40%" height="14px" class="q-mb-xs" />
        <q-skeleton type="rect" height="40px" class="q-mb-md" style="border-radius: 8px;" />
        <q-skeleton type="text" width="40%" height="14px" class="q-mb-xs" />
        <q-skeleton type="rect" height="40px" class="q-mb-md" style="border-radius: 8px;" />
        <div class="row justify-end q-gutter-sm">
          <q-skeleton type="text" width="120px" height="14px" />
          <q-skeleton type="text" width="120px" height="14px" />
        </div>
      </q-card-section>
    </q-card>
    
    <!-- Action Buttons Skeleton -->
    <q-card class="br-15 q-pa-sm" bordered flat :class="[darkMode ? 'pt-card-2 dark' : '']">
      <q-skeleton type="text" width="40%" height="18px" class="q-mb-sm" style="margin: 0 auto;" />
      <div class="row q-gutter-sm q-px-sm">
        <q-skeleton type="QBtn" class="col" height="40px" style="border-radius: 20px;" />
        <q-skeleton type="QBtn" class="col" height="40px" style="border-radius: 20px;" />
      </div>
    </q-card>
  </div>
  
  <div v-else
    class="q-mx-md q-px-none text-bow"
    :class="getDarkModeClass(darkMode)">
      <div class="text-center q-pb-sm">
        <div class="text-weight-bold" style="font-size: large;">{{ !appeal?.resolved_at ? 'PENDING' : 'RESOLVED' }} {{ $t('APPEAL') }}</div>
        <div class="sm-font-size" :class="darkMode ? 'text-grey-4' : 'text-grey-6'">
          {{
            $t(
              'AppealIdNo',
              { ID: appeal?.id },
              `Appeal No. ${ appeal?.id }`
            )
          }}</div>
      </div>
      <q-pull-to-refresh :scroll-target="scrollTarget" @refresh="refreshData">
        <div ref="scrollTarget" :style="`height: ${scrollHeight}px; overflow-y:auto; padding-bottom: ${state === 'form' ? '180px' : '20px'};`" class="scroll-y" @touchstart="preventPull">
          <div class="q-mx-sm q-mb-sm">
            <TradeInfoCard
              :order="order"
              :ad="adSnapshot"
              type="appeal"
              @view-ad="showAdSnapshot=true"
              @view-peer="onViewPeer"
              @view-reviews="showReviews=true"/>
          </div>
          <div class="q-mx-sm">
            <q-card class="br-15 q-mt-xs" bordered flat :class="[darkMode ? 'pt-card-2 dark' : '']">
              <q-card-section>
                <div class="row justify-end no-wrap">
                  <div class="col-9 q-mr-lg">
                    <q-badge v-if="order?.is_cash_in" class="row md-font-size" outline color="warning">
                      <span>Cash-in</span>
                    </q-badge>
                    <div class="row text-weight-bold md-font-size">
                      <span>{{ appeal?.type?.label }} Appeal</span>
                    </div>
                    <div class="row md-font-size">
                      <span>Order ID: {{ order?.id}}</span>
                    </div>
                    <div class="row subtext md-font-size">
                      <span>Submitted by {{ appeal?.owner?.name }}</span>
                    </div>
                    <div class="md-font-size">Reasons</div>
                    <q-badge
                      class="row q-px-sm"
                      size="sm"
                      outline
                      :label="reason"
                      :color="darkMode ? 'blue-grey-4' : 'blue-grey-6'"
                      v-for="(reason, index) in appeal.reasons"
                      :key="index"/>
                  </div>
                  <q-space/>
                  <div class="col q-mt-sm">
                    <q-btn size="1.3em" padding="none" dense ripple round flat class="button button-icon" icon="forum" @click="openChat=true">
                      <q-badge v-if="unread" floating color="red" rounded>{{ unread }}</q-badge>
                    </q-btn>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
          <AppealDetail
            v-if="state === 'form' || state === 'completed'"
            ref="appealDetail"
            :key="appealDetailKey"
            :data="appealDetailData"
            :escrowContract="escrowContract"
            :state="state"
            :chatOpen="openChat"
            @back="$emit('back')"
            @refresh="refreshData"
            @update-page-name="(val) => {$emit('updatePageName', val)}"
            @sending-bch="onSendingBch"
          />
          <AppealTransfer
            v-if="state === 'tx-confirmation'"
            :key="appealTransferKey"
            :data="appealTransferData"
            @back="$emit('back')"
            @update-page-name="(val) => {$emit('updatePageName', val)}"
            @verifying-tx="onVerifyingTx"
          />

          <div v-if="completedOrder" class="text-center q-mb-sm">
            <q-btn padding="none" flat no-caps color="primary" @click="openFeedback"> View my Feedback </q-btn>
          </div>
        </div>
      </q-pull-to-refresh>
    <AdSnapshotDialog v-if="showAdSnapshot" :order-id="order?.id" @back="showAdSnapshot=false"/>
    <UserProfileDialog v-if="showPeerProfile" :user-info="peerInfo" :clickable-ads="false" @back="showPeerProfile=false"/>
    <ChatDialog v-if="openChat" :order="order" @close="openChat=false"/>
    <ContractProgressDialog v-if="showContractProgDialog" :message="contractProgMsg"/>
  </div>
</template>
<script>
import ContractProgressDialog from 'src/components/ramp/fiat/dialogs/ContractProgressDialog.vue'
import RampContract from 'src/exchange/contract'
import AppealDetail from 'src/components/ramp/appeal/AppealDetail.vue'
import AppealTransfer from 'src/components/ramp/appeal/AppealTransfer.vue'
import TradeInfoCard from 'src/components/ramp/fiat/TradeInfoCard.vue'
import AppealFeedbackDialog from 'src/components/ramp/appeal/AppealFeedbackDialog.vue'
import UserProfileDialog from 'src/components/ramp/fiat/dialogs/UserProfileDialog.vue'
import AdSnapshotDialog from 'src/components/ramp/fiat/dialogs/AdSnapshotDialog.vue'
import ChatDialog from 'src/components/ramp/fiat/dialogs/ChatDialog.vue'
import HeaderNav from 'src/components/header-nav.vue'
import { WebSocketManager } from 'src/exchange/websocket/manager'
import { bus } from 'src/wallet/event-bus.js'
import { backend, getBackendWsUrl } from 'src/exchange/backend'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { fetchChatMembers } from 'src/exchange/chat'
import { getChatBackendWsUrl } from 'src/exchange/chat/backend'
import { ref } from 'vue'
import { satoshiToBch } from 'src/exchange'

export default {
  setup () {
    const scrollTarget = ref(null)
    return {
      scrollTarget
    }
  },
  components: {
    AppealDetail,
    AppealTransfer,
    TradeInfoCard,
    UserProfileDialog,
    AdSnapshotDialog,
    ChatDialog,
    HeaderNav,
    ContractProgressDialog
  },
  data () {
    return {
      isChipnet: this.$store.getters['global/isChipnet'],
      darkMode: this.$store.getters['darkmode/getStatus'],
      websocketManager: {
        watchtower: null,
        chat: null
      },
      unread: 0,
      state: 'form',
      actionState: 'verifying',

      appeal: null,
      contract: null,
      order: null,
      adSnapshot: null,
      fees: null,
      status: null,
      isloaded: false,
      selectedAction: null,
      errorMessages: [],
      appealTransferKey: 0,
      appealDetailKey: 0,
      escrowContract: null,
      txid: null,
      amount: 0,
      openChat: false,
      showAdSnapshot: false,
      showPeerProfile: false,
      peerInfo: {},
      previousRoute: null,
      sendingBch: false,
      verifyingTx: false,
      transactions: []
    }
  },
  emits: ['back', 'updatePageName'],
  computed: {
    appealDetailData () {
      return {
        appeal: this.appeal,
        order: this.order,
        ad_snapshot: this.adSnapshot,
        contract: this.contract,
        fees: this.fees,
        transactions: this.transactions
      }
    },
    appealTransferData () {
      return {
        escrow: this.escrowContract,
        orderId: this.appeal?.order?.id,
        txid: this.txid,
        action: this.selectedAction
      }
    },
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
      let height = this.$q.platform.is.ios ? this.$q.screen.height - 150 : this.$q.screen.height - 140
      if (this.sendingBch || this.verifyingTx) {
        height = height - 70
      } else if (this.state === 'form') {
        height = height - 115
      }
      return height
    },
    completedOrder () {
      return ['CNCL', 'RLS', 'RFN'].includes(this.order?.status?.value)
    }
  },
  created () {
    bus.on('last-read-update', this.onLastReadUpdate)
    bus.on('manual-add-tx', () => {
      this.manuallyAddingTx = true
    })
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.previousRoute = from.path
    })
  },
  async mounted () {
    await this.loadData()
    this.updateOrderReadAt()
    this.setupWebsocket()
    if (this.notifType === 'new_message') { this.openChat = true }
  },
  beforeUnmount () {
    this.closeWSConnection()
  },
  methods: {
    getDarkModeClass,
    preventPull (e) {
      // Prevent pull-to-refresh from triggering when scrollable element is not at top
      let parent = e.target
      // eslint-disable-next-line no-void
      while (parent !== void 0 && !parent.classList.contains('scroll-y')) {
        parent = parent.parentNode
      }
      // eslint-disable-next-line no-void
      if (parent !== void 0 && parent.scrollTop > 0) {
        e.stopPropagation()
      }
    },
    onSendingBch (sending) {
      this.sendingBch = sending
      if (!sending) {
        this.refreshData()
      }
    },
    onVerifyingTx (verifying) {
      this.verifyingTx = verifying
      if (!verifying) {
        this.refreshData()
      }
    },
    async refreshData (done) {
      if (this.sendingBch || this.verifyingTx) {
        if (done) done()
        return
      }
      await this.loadData()
      if (done) done()
    },
    openFeedback () {
      this.$q.dialog({
        component: AppealFeedbackDialog,
        componentProps: {
          order: this.order
        }
      })
    },
    onBackSnapshot () {
      this.$refs.appealDetail.state = 'form'
    },
    onSendSuccess (txid) {
      this.txid = txid
    },
    async loadData () {
      await this.fetchAppeal()
      this.isloaded = true
      await Promise.all([this.fetchOrder(), this.fetchContract(), this.fetchFees(), this.fetchAdSnapshot(), this.fetchTransactions()])
      this.generateContract()
      this.fetchChatUnread(this.order?.chat_session_ref)
    },
    reloadChildComponents () {
      this.appealDetailKey++
      this.appealTransferKey++
    },
    updateOrderReadAt () {
      const vm = this
      if (vm.appeal.read_at) return
      const orderId = vm.appeal?.order?.id
      if (!orderId) {
        console.warn('Order ID is missing, skipping updateOrderReadAt')
        return Promise.resolve()
      }
      return new Promise((resolve, reject) => {
        const url = `/ramp-p2p/order/${orderId}/members/`
        backend.patch(url, null, { authorize: true })
          .then(response => {
            resolve(response.data)
          })
          .catch(error => {
            this.handleRequestError(error)
            reject(error)
          })
      })
    },
    async fetchAppeal () {
      const vm = this
      const orderId = this.$route.params?.order
      if (!orderId) {
        console.warn('Order ID is missing from route params, skipping fetchAppeal')
        this.loading = false
        return
      }
      await backend.get(`/ramp-p2p/order/${orderId}/appeal/`, { authorize: true })
        .then(response => {
          vm.appeal = response.data.appeal
          vm.loading = false
        })
        .catch(error => {
          this.handleRequestError(error)
          this.loading = false
        })
    },
    async fetchTransactions () {
      const orderId = this.$route.params?.order || this.appeal?.order?.id
      if (!orderId) {
        console.warn('Order ID is missing, skipping fetchTransactions')
        return
      }
      await backend.get(`/ramp-p2p/order/${orderId}/contract/transactions/`, { authorize: true })
        .then(response => {
          this.transactions = response.data
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    async fetchFees () {
      const orderId = this.$route.params?.order || this.appeal?.order?.id
      if (!orderId) {
        console.warn('Order ID is missing, skipping fetchFees')
        return
      }
      await backend.get(`/ramp-p2p/order/${orderId}/contract/fees/`, { authorize: true })
        .then(response => {
          this.fees = response.data
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    async fetchAdSnapshot () {
      const orderId = this.$route.params?.order || this.appeal?.order?.id
      if (!orderId) {
        console.warn('Order ID is missing, skipping fetchAdSnapshot')
        return
      }
      await backend.get(`/ramp-p2p/order/${orderId}/ad/snapshot/`, { authorize: true })
        .then(response => {
          this.adSnapshot = response.data
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    async fetchOrder () {
      this.loading = true
      const orderId = this.$route.params?.order || this.appeal?.order?.id
      if (!orderId) {
        console.warn('Order ID is missing, skipping fetchOrder')
        this.loading = false
        return
      }
      await backend.get(`/ramp-p2p/order/${orderId}`, { authorize: true })
        .then(response => {
          this.amount = satoshiToBch(response.data?.order?.trade_amount)
          this.order = response.data
          this.updateStatus(this.order?.status)
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    async fetchContract () {
      const orderId = this.$route.params?.order || this.appeal?.order?.id
      if (!orderId) {
        console.warn('Order ID is missing, skipping fetchContract')
        return
      }
      const url = `/ramp-p2p/order/${orderId}/contract/`
      await backend.get(url, { authorize: true })
        .then(response => {
          this.contract = response.data
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    generateContract () {
      if (!this.contract || !this.fees) return
      const publicKeys = this.contract.pubkeys
      const addresses = this.contract.addresses
      const fees = {
        arbitrationFee: this.fees.breakdown?.arbitration_fee,
        serviceFee: this.fees.breakdown?.service_fee,
        contractFee: this.fees.breakdown?.contract_fee
      }
      const timestamp = this.contract.timestamp
      this.escrowContract = new RampContract(publicKeys, fees, addresses, timestamp, this.isChipnet)
    },
    updateStatus (status) {
      this.status = status
      switch (this.status.value) {
        case 'RFN_PN':
          this.selectedAction = 'REFUND'
          break
        case 'RLS_PN':
          this.selectedAction = 'RELEASE'
          break
      }
      this.checkStep()
    },
    checkStep () {
      const vm = this
      vm.openDialog = false
      if (!vm.status) return
      switch (vm.status.value) {
        case 'APL':
          vm.state = 'form'
          break
        case 'RFN_PN':
          vm.state = 'tx-confirmation'
          break
        case 'RLS_PN':
          vm.state = 'tx-confirmation'
          break
        case 'RLS':
          vm.state = 'completed'
          vm.$store.commit('ramp/clearOrderTxids', vm.appeal.order.id)
          break
        case 'RFN':
          vm.state = 'completed'
          vm.$store.commit('ramp/clearOrderTxids', vm.appeal.order.id)
          break
        default:
          vm.state = 'form'
          break
      }
    },
    async fetchChatUnread (chatRef) {
      const user = this.$store.getters['ramp/getUser']
      await fetchChatMembers(chatRef).then(response => {
        const userMember = response?.filter(member => {
          return user.chat_identity_id === member.chat_identity.id
        })[0]
        this.unread = userMember?.unread_count
      }).catch(error => {
        this.handleRequestError(error)
      })
    },
    onVerifyAction (data) {
      this.setOrderPending(data.txid, data)
    },
    onLastReadUpdate () {
      this.fetchChatUnread(this.order?.chat_session_ref)
    },
    setupWebsocket () {
      this.closeWSConnection()
      const wsWatchtowerUrl = `${getBackendWsUrl()}order/${this.appeal.order.id}/`
      this.websocketManager.watchtower = new WebSocketManager()
      this.websocketManager.watchtower.setWebSocketUrl(wsWatchtowerUrl)
      this.websocketManager.watchtower.subscribeToMessages(async (message) => {
        bus.emit('verify-tx', message)
        if (message?.success) {
          await this.fetchAppeal()
          if (message?.txdata) {
            this.verifyingTx = false
            this.sendingBch = false
          }
          if (this.manuallyAddingTx) {
            await this.refreshData()
            this.manuallyAddingTx = false
          } else {
            this.reloadChildComponents()
          }
        } else if (message?.error || message?.errors) {
          this.errorMessages.push(message.error || [...message.errors])
          this.appealTransferKey++
        }
      })

      const wsChatUrl = `${getChatBackendWsUrl()}${this.order?.chat_session_ref}/`
      this.websocketManager.chat = new WebSocketManager()
      this.websocketManager.chat.setWebSocketUrl(wsChatUrl)
      this.websocketManager.chat.subscribeToMessages((message) => {
        if (message?.type === 'new_message') {
          const messageData = message.data
          // RECEIVE MESSAGE
          this.fetchChatUnread(this.order?.chat_session_ref)
          if (this.openChat) bus.emit('new-message', messageData)
        }
      })
    },
    closeWSConnection () {
      this.websocketManager?.watchtower?.closeConnection()
      this.websocketManager?.chat?.closeConnection()
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
<style>
.subtext {
  opacity: .5;
}
</style>
