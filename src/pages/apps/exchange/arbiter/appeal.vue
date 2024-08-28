<template>
  <HeaderNav :title="`P2P Exchange`" :backnavpath="previousRoute"/>
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
            v-if="state === 'form' || state === 'form-sending' || state === 'completed'"
            ref="appealDetail"
            :key="appealDetailKey"
            :data="appealDetailData"
            :escrowContract="escrowContract"
            :state="state"
            @back="$emit('back')"
            @refresh="refreshData"
            @update-page-name="(val) => {$emit('updatePageName', val)}"
            @update-state="updateState"
          />
          <AppealTransfer
            v-if="state === 'tx-confirmation'"
            :key="appealTransferKey"
            :escrowContract="escrowContract"
            :orderId="appeal?.order?.id"
            :txid="txid"
            :action="selectedAction"
            @back="$emit('back')"
            @update-page-name="(val) => {$emit('updatePageName', val)}"
          />

          <div v-if="completedOrder" class="text-center q-pb-sm">
            <q-btn padding="none" flat no-caps color="primary" @click="openFeedback"> View my Feedback </q-btn>
          </div>
        </div>
      </q-pull-to-refresh>
    <AdSnapshotDialog v-if="showAdSnapshot" :order-id="appealDetailData?.order?.id" @back="showAdSnapshot=false"/>
    <UserProfileDialog v-if="showPeerProfile" :user-info="peerInfo" :clickable-ads="false" @back="showPeerProfile=false"/>
    <ChatDialog v-if="openChat" :order="appealDetailData?.order" @close="openChat=false"/>
  </div>
</template>
<script>
import RampContract from 'src/exchange/contract'
import AppealDetail from 'src/components/ramp/appeal/AppealDetail.vue'
import AppealTransfer from 'src/components/ramp/appeal/AppealTransfer.vue'
import TradeInfoCard from 'src/components/ramp/fiat/TradeInfoCard.vue'
import AppealFeedbackDialog from 'src/components/ramp/appeal/AppealFeedbackDialog.vue'
import UserProfileDialog from 'src/components/ramp/fiat/dialogs/UserProfileDialog.vue'
import AdSnapshotDialog from 'src/components/ramp/fiat/dialogs/AdSnapshotDialog.vue'
import ChatDialog from 'src/components/ramp/fiat/dialogs/ChatDialog.vue'
import HeaderNav from 'src/components/header-nav.vue'
import { bus } from 'src/wallet/event-bus.js'
import { backend, getBackendWsUrl } from 'src/exchange/backend'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { fetchChatMembers } from 'src/exchange/chat'
import { getChatBackendWsUrl } from 'src/exchange/chat/backend'
import { ref } from 'vue'

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
    HeaderNav
  },
  data () {
    return {
      isChipnet: this.$store.getters['global/isChipnet'],
      darkMode: this.$store.getters['darkmode/getStatus'],
      websocket: {
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
      previousRoute: null
    }
  },
  emits: ['back', 'updatePageName'],
  computed: {
    scrollHeight () {
      let height = this.$q.platform.is.ios ? this.$q.screen.height - 150 : this.$q.screen.height - 140
      if (this.state === 'form') {
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
    if (this.notifType === 'new_message') { this.openChat = true}
  },
  beforeUnmount () {
    this.closeWSConnection()
  },
  methods: {
    getDarkModeClass,
    updateState (state) {
      this.state = state
    },
    async refreshData (done) {
      await this.loadData()
      done()
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
        const url = `/ramp-p2p/order/${vm.appeal?.order?.id}/members`
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
    fetchAppeal () {
      const vm = this
      return new Promise((resolve, reject) => {
        backend.get(`/ramp-p2p/order/${this.$route.params?.order}/appeal`, { authorize: true })
          .then(response => {
            vm.appeal = response.data.appeal
            vm.contract = response.data.contract
            vm.fees = response.data.fees
            vm.order = response.data.order
            vm.appealDetailData = response.data
            vm.updateStatus(response.data.order?.status)
            vm.loading = false
            resolve(response.data)
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
            reject(error)
          })
      })
    },
    generateContract () {
      if (!this.contract || !this.fees) return
      const publicKeys = this.contract.pubkeys
      const addresses = this.contract.addresses
      const fees = {
        arbitrationFee: this.fees.fees.arbitration_fee,
        serviceFee: this.fees.fees.service_fee,
        contractFee: this.fees.fees.hardcoded_fee
      }
      const timestamp = this.contract.timestamp
      this.escrowContract = new RampContract(publicKeys, fees, addresses, timestamp, this.isChipnet)
    },
    updateStatus (status) {
      // if (this.status && status && this.status.value === status.value) return
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
            vm.amount = response.data?.order?.crypto_amount
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
        const url = '/ramp-p2p/order/contract'
        backend.get(url, { params: { order_id: vm.$route.params?.order }, authorize: true })
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
      const wsChatUrl = `${getChatBackendWsUrl()}${this.appealDetailData?.order?.chat_session_ref}/`
      this.websocket.watchtower = new WebSocket(wsWatchtowerUrl)
      this.websocket.chat = new WebSocket(wsChatUrl)

      // on open
      this.websocket.watchtower.onopen = () => {
        console.log('WebSocket connection established to ' + wsWatchtowerUrl)
      }
      this.websocket.chat.onopen = () => {
        console.log('Chat WebSocket connection established to ' + wsChatUrl)
      }

      this.websocket.watchtower.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('WebSocket data:', data)
        if (data) {
          if (data.success) {
            this.fetchAppeal().then(this.reloadChildComponents())
          } else if (data.error) {
            this.errorMessages.push(data.error)
            this.appealTransferKey++
          } else if (data.errors) {
            this.errorMessages.push(...data.errors)
            this.appealTransferKey++
          }
        }
      }
      this.websocket.chat.onmessage = (event) => {
        const parsedData = JSON.parse(event.data)
        console.log('Chat WebSocket data:', parsedData)

        if (parsedData?.type === 'new_message') {
          const messageData = parsedData.data
          // RECEIVE MESSAGE
          console.log('Received a new message:', messageData)
          this.fetchChatUnread(this.appealDetailData?.order?.chat_session_ref)
          if (this.openChat) bus.emit('new-message', messageData)
        }
      }

      this.websocket.watchtower.onclose = () => {
        console.log('WebSocket connection closed.')
      }
      this.websocket.chat.onclose = () => {
        console.log('Chat WebSocket connection closed.')
      }
    },
    closeWSConnection () {
      if (this.websocket.watchtower) this.websocket.watchtower.close()
      if (this.websocket.chat) this.websocket.chat.close()
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
