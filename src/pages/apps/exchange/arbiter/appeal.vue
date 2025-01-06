<template>
  <HeaderNav :title="`Ramp Appeals`" :backnavpath="previousRoute"/>
  <div v-if="isloaded && escrowContract"
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
        <div ref="scrollTarget" :style="`height: ${scrollHeight}px`" style="overflow-y:auto;">
          <div class="q-mx-sm q-mb-sm">
            <TradeInfoCard
              :order="appealDetailData.order"
              :ad="appealDetailData.ad_snapshot"
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
                      <span>Order ID: {{ order?.tracking_id}}</span>
                    </div>
                    <div class="row subtext md-font-size">
                      <span>Submitted by {{ appeal?.owner?.name }}</span>
                    </div>
                    <div class="md-font-size">Reasons</div>
                    <q-badge v-for="(reason, index) in appeal.reasons" class="row q-px-sm" :key="index" size="sm" outline :color="darkMode ? 'blue-grey-4' : 'blue-grey-6'" :label="reason" />
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

          <div v-if="completedOrder" class="text-center q-pb-sm">
            <q-btn padding="none" flat no-caps color="primary" @click="openFeedback"> View my Feedback </q-btn>
          </div>
        </div>
      </q-pull-to-refresh>
    <AdSnapshotDialog v-if="showAdSnapshot" :order-id="appealDetailData?.order?.id" @back="showAdSnapshot=false"/>
    <UserProfileDialog v-if="showPeerProfile" :user-info="peerInfo" :clickable-ads="false" @back="showPeerProfile=false"/>
    <ChatDialog v-if="openChat" :order="appealDetailData?.order" @close="openChat=false"/>
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

      fees: null,
      status: null,
      isloaded: false,
      selectedAction: null,
      errorMessages: [],
      appealTransferKey: 0,
      appealDetailKey: 0,
      appealDetailData: null,
      escrowContract: null,
      txid: null,
      amount: 0,
      openChat: false,
      showAdSnapshot: false,
      showPeerProfile: false,
      peerInfo: {},
      previousRoute: null,
      sendingBch: false,
      verifyingTx: false
    }
  },
  emits: ['back', 'updatePageName'],
  computed: {
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
      return ['CNCL', 'RLS', 'RFN'].includes(this.appealDetailData?.order?.status?.value)
    }
  },
  created () {
    bus.on('last-read-update', this.onLastReadUpdate)
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
    this.isloaded = true
    if (this.notifType === 'new_message') { this.openChat = true }
  },
  beforeUnmount () {
    this.closeWSConnection()
  },
  methods: {
    getDarkModeClass,
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
          order: this.appealDetailData?.order
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
      this.generateContract()
      this.reloadChildComponents()
      this.fetchChatUnread(this.appealDetailData?.order?.chat_session_ref)
    },
    reloadChildComponents () {
      this.appealDetailKey++
      this.appealTransferKey++
    },
    updateOrderReadAt () {
      const vm = this
      if (vm.appeal.read_at) return
      return new Promise((resolve, reject) => {
        const url = `/ramp-p2p/order/${vm.appeal?.order?.id}/members/`
        backend.patch(url, null, { authorize: true })
          .then(response => {
            resolve(response.data)
          })
          .catch(error => {
            console.error(error?.response)
            if (error.response) {
              if (error?.response?.status === 403) {
                bus.emit('session-expired')
              }
            } else {
              bus.emit('network-error')
            }
            reject(error)
          })
      })
    },
    async fetchAppeal () {
      const vm = this
      await backend.get(`/ramp-p2p/order/${this.$route.params?.order}/appeal/`, { authorize: true })
        .then(response => {
          vm.appeal = response.data.appeal
          vm.contract = response.data.contract
          vm.fees = response.data.fees
          vm.order = response.data.order
          vm.appealDetailData = response.data
          vm.updateStatus(response.data.order?.status)
          vm.loading = false
        })
        .catch(error => {
          console.error(error.response)
          if (error.response) {
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            bus.emit('network-error')
          }
          this.loading = false
        })
    },
    generateContract () {
      if (!this.contract || !this.fees) return
      const publicKeys = this.contract.pubkeys
      const addresses = this.contract.addresses
      const fees = {
        arbitrationFee: this.fees.fees.arbitration_fee,
        serviceFee: this.fees.fees.service_fee,
        contractFee: this.fees.fees.contract_fee
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
    fetchOrder () {
      const vm = this
      return new Promise((resolve, reject) => {
        vm.loading = true
        backend.get(`/ramp-p2p/order/${vm.$route.params?.order}`, { authorize: true })
          .then(response => {
            vm.amount = satoshiToBch(response.data?.order?.trade_amount)
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
              bus.emit('network-error')
            }
            reject(error)
          })
      })
    },
    fetchContract () {
      return new Promise((resolve, reject) => {
        const vm = this
        const url = `/ramp-p2p/order/${vm.$route.params?.order}/contract/`
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
              bus.emit('network-error')
            }
            reject(error)
          })
      })
    },
    async fetchChatUnread (chatRef) {
      const user = this.$store.getters['ramp/getUser']
      await fetchChatMembers(chatRef).then(response => {
        const userMember = response?.filter(member => {
          return user.chat_identity_id === member.chat_identity.id
        })[0]
        this.unread = userMember?.unread_count
      }).catch(console.error)
    },
    onVerifyAction (data) {
      this.setOrderPending(data.txid, data)
    },
    onLastReadUpdate () {
      this.fetchChatUnread(this.appealDetailData?.order?.chat_session_ref)
    },
    setupWebsocket () {
      const wsWatchtowerUrl = `${getBackendWsUrl()}order/${this.appeal.order.id}/`
      this.websocketManager.watchtower = new WebSocketManager()
      this.websocketManager.watchtower.setWebSocketUrl(wsWatchtowerUrl)
      this.websocketManager.watchtower.subscribeToMessages((message) => {
        if (message?.success) {
          this.fetchAppeal().then(this.reloadChildComponents())
        } else if (message?.error || message?.errors) {
          this.errorMessages.push(message.error || [...message.errors])
          this.appealTransferKey++
        }
      })

      const wsChatUrl = `${getChatBackendWsUrl()}${this.appealDetailData?.order?.chat_session_ref}/`
      this.websocketManager.chat = new WebSocketManager()
      this.websocketManager.chat.setWebSocketUrl(wsChatUrl)
      this.websocketManager.chat.subscribeToMessages((message) => {
        if (message?.type === 'new_message') {
          const messageData = message.data
          // RECEIVE MESSAGE
          console.log('Received a new message:', messageData)
          this.fetchChatUnread(this.appealDetailData?.order?.chat_session_ref)
          if (this.openChat) bus.emit('new-message', messageData)
        }
      })
    },
    closeWSConnection () {
      if (this.websocketManager.watchtower) this.websocketManager.watchtower.closeConnection()
      if (this.websocketManager.chat) this.websocketManager.chat.closeConnection()
    },
    onViewPeer (data) {
      this.peerInfo = data
      this.showPeerProfile = true
    }
  }
}
</script>
<style>
.subtext {
  opacity: .5;
}
</style>
