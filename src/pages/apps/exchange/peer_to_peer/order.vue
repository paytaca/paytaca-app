<template>
    <HeaderNav :title="`P2P Exchange`" backnavpath="/apps/exchange/peer-to-peer/orders" class="header-nav" />
    
    <!-- Skeleton Loader -->
    <div v-if="!isloaded" class="text-bow order-page-container" :class="getDarkModeClass(darkMode)">
      <!-- Header Skeleton -->
      <div class="order-header" :class="getDarkModeClass(darkMode)">
        <q-skeleton type="text" width="60%" class="q-mx-auto" style="height: 20px;" />
        <q-skeleton type="text" width="40%" class="q-mx-auto q-mt-xs" style="height: 16px;" />
      </div>

      <!-- Tabs Skeleton -->
      <div class="skeleton-tabs" :class="getDarkModeClass(darkMode)">
        <q-skeleton type="rect" width="80px" height="40px" class="skeleton-tab" />
        <q-skeleton type="rect" width="80px" height="40px" class="skeleton-tab" />
        <q-skeleton type="rect" width="80px" height="40px" class="skeleton-tab" />
      </div>

      <!-- Content Skeleton -->
      <div class="skeleton-content q-pa-md">
        <!-- Card Skeleton -->
        <q-skeleton type="rect" height="120px" class="q-mb-md" style="border-radius: 8px;" />
        
        <!-- Trade Info Skeleton -->
        <div class="q-mb-md">
          <q-skeleton type="text" width="30%" height="16px" class="q-mb-sm" />
          <q-skeleton type="text" width="100%" height="20px" class="q-mb-xs" />
          <q-skeleton type="text" width="70%" height="20px" />
        </div>

        <!-- Details Skeleton -->
        <div class="q-mb-md">
          <q-skeleton type="text" width="40%" height="16px" class="q-mb-sm" />
          <q-skeleton type="text" width="100%" height="18px" class="q-mb-xs" />
          <q-skeleton type="text" width="90%" height="18px" class="q-mb-xs" />
          <q-skeleton type="text" width="80%" height="18px" />
        </div>

        <!-- Action Button Skeleton -->
        <q-skeleton type="rect" height="48px" class="q-mt-lg" style="border-radius: 24px;" />
      </div>
    </div>

    <div v-if="isloaded" class="text-bow order-page-container" :class="getDarkModeClass(darkMode)">
      <!-- Order Header -->
      <div class="order-header" :class="getDarkModeClass(darkMode)">
        <div class="order-title">{{ headerTitle }}</div>
        <div class="order-id">{{ $t('OrderIdNo2', { ID: order?.id }, `Order #${ order?.id }`) }}</div>
      </div>

      <!-- Tabs -->
      <q-tabs
        v-model="activeTab"
        dense
        no-caps
        class="order-tabs"
        :class="[getDarkModeClass(darkMode), `text-${theme}`]"
        :active-color="theme"
        :indicator-color="theme"
        align="center"
      >
        <q-tab name="details" :label="$t('Details', {}, 'Details')" />
        <q-tab name="history" :label="$t('History', {}, 'History')">
          <q-badge v-if="order?.has_unread_status" color="red" floating rounded />
        </q-tab>
        <q-tab v-if="showChatTab" name="chat" :label="$t('Chat', {}, 'Chat')">
          <q-badge v-if="isChatEnabled && unreadChatCount > 0" color="red" floating rounded>
            {{ unreadChatCount }}
          </q-badge>
        </q-tab>
      </q-tabs>

      <!-- Tab Panels -->
      <q-tab-panels
        v-model="activeTab"
        animated
        :style="`height: ${scrollHeight}px`"
        class="order-tab-panels"
        :class="getDarkModeClass(darkMode)"
      >
        <!-- DETAILS Tab -->
        <q-tab-panel name="details" class="q-pa-none">
          <div class="tab-content-wrapper details-tab-content">
            <q-pull-to-refresh ref="pullToRefresh" @refresh="refreshPage">
            <div class="q-mx-md q-px-sm q-mb-sm">
            <TradeInfoCard
              :key="tradeInfoCardKey"
              :order="order"
              :ad="ad"
              type="order"
              @view-ad="showAdSnapshot=true"
              @view-peer="onViewPeer"
              @view-reviews="showReviews=true"/>
          </div>
          <div class="component-wrapper">
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
          </div>
              <div v-if="reconnectingWebSocket" class="fixed" style="right: 50px;" :style="$q.platform.is.ios? 'top: 130px' : 'top: 100px;'">
                <q-spinner-ios size="1.5em"/>
              </div>
            </q-pull-to-refresh>
          </div>
        </q-tab-panel>

        <!-- HISTORY Tab -->
        <q-tab-panel name="history" class="q-pa-none">
          <div class="tab-content-wrapper">
          <div v-if="statusHistory.length === 0" class="row justify-center q-py-lg">
            <ProgressLoader/>
          </div>
          <div v-else>
            <div v-for="(status, index) in statusHistory" :key="index" class="q-pb-sm">
              <q-card flat bordered class="status-card" :class="[getDarkModeClass(darkMode), !isStatusRead(status) ? 'unread-status' : '']">
                <q-card-section class="row q-pa-md">
                  <q-badge v-if="!isStatusRead(status)" color="red" rounded floating/>
                  <div class="col q-pr-sm">
                    <div class="text-weight-medium text-body1">{{ formatOrderStatus(status.status) }}</div>
                    <div class="text-caption text-grey q-mt-xs">{{ formatDate(status.created_at, false) }}</div>
                    <div class="text-caption q-mt-xs status-relative-time">{{ formatDate(status.created_at, true) }}</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
          </div>
        </q-tab-panel>

        <!-- CHAT Tab -->
        <q-tab-panel v-if="showChatTab" name="chat" class="q-pa-none chat-tab-panel">
          <div class="tab-content-wrapper">
          <!-- Chat Disabled Notice (Before Escrow) -->
          <div v-if="!isChatEnabled" class="chat-disabled-notice">
            <q-banner class="chat-disabled-banner" :class="getDarkModeClass(darkMode)">
              <template v-slot:avatar>
                <q-icon name="chat_bubble_outline" color="grey-6" size="48px"/>
              </template>
              <div class="chat-disabled-content">
                <div class="text-h6 q-mb-sm">{{ $t('ChatNotYetActive', {}, 'Chat Not Yet Active') }}</div>
                <div class="text-body2">
                  {{ $t('ChatActivationMessage', {}, 'The chat window will be activated once BCH funds have been sent to escrow. Please wait for the seller to escrow the funds.') }}
                </div>
              </div>
            </q-banner>
          </div>
          
          <!-- Chat Loading -->
          <div v-else-if="chatMessages.length === 0 && !chatLoaded" class="row justify-center q-py-lg">
            <ProgressLoader />
          </div>
          
          <!-- Chat Content (Active) -->
          <div v-else class="chat-container">
            <!-- Messages area (flex-grows to push input down) -->
            <div class="chat-messages-area">
              <!-- Encrypted message notice -->
              <q-banner class="encrypted-banner" :class="getDarkModeClass(darkMode)">
                <template v-slot:avatar>
                  <q-icon name="lock" color="positive" size="20px"/>
                </template>
                <span class="encrypted-banner-text">{{ $t('EncryptedChatMsg', {}, 'Messages are end-to-end encrypted. No one outside this chat, not even Paytaca, can read them.') }}</span>
              </q-banner>

              <!-- Chat messages -->
              <div class="chat-messages-wrapper" ref="chatScrollTarget">
              <q-infinite-scroll
                :scroll-target="chatScrollTarget"
                ref="infiniteScroll"
                @load="loadMoreChatData"
                :offset="0"
                reverse
                class="chat-messages-scroll"
              >
                <template v-slot:loading>
                  <div class="row justify-center q-my-md">
                    <q-spinner-dots color="primary" size="32px" />
                  </div>
                </template>

                <div v-if="chatMessages.length === 0" class="empty-chat-state">
                  <q-icon name="chat_bubble_outline" size="48px" class="text-grey-5"/>
                  <div class="text-grey-6 q-mt-sm">{{ $t('NoMessages', {}, 'No messages yet') }}</div>
                  <div class="text-caption text-grey-6">{{ $t('StartConversation', {}, 'Start the conversation') }}</div>
                </div>

                <div v-else class="chat-messages-list" :key="chatMessagesKey">
                  <div v-for="message in chatMessages" :key="message.id" class="chat-message-wrapper">
                    <q-chat-message
                      :name="userName(message.chatIdentity?.name)"
                      :avatar="`https://ui-avatars.com/api/?background=random&name=${message.chatIdentity?.name}&color=fff&size=128`"
                      :stamp="formatChatDate(message.createdAt)"
                      :sent="message.chatIdentity?.is_user"
                      bg-color="transparent"
                      :text-color="getDarkModeClass(darkMode) === 'dark' ? 'white' : 'black'"
                      class="professional-chat-message"
                      :class="getDarkModeClass(darkMode)"
                    >
                      <div v-if="message.message || message._decryptedMessage" class="message-text">
                        {{ message._decryptedMessage || message.message }}
                      </div>
                    </q-chat-message>
                  </div>
                </div>
              </q-infinite-scroll>
              </div>
            </div>

            <!-- Chat input -->
            <div class="chat-input-wrapper" :class="getDarkModeClass(darkMode)">
              <div class="chat-input-container">
                <q-input
                  v-model="chatMessageInput"
                  outlined
                  rounded
                  dense
                  autogrow
                  :placeholder="$t('TypeMessage', {}, 'Type a message...')"
                  :dark="darkMode"
                  @keyup.enter.exact="sendChatMessage"
                  class="chat-input"
                  :maxlength="1000"
                >
                  <template v-slot:append>
                    <q-btn 
                      round 
                      unelevated
                      color="primary" 
                      :icon="sendingMessage ? 'sync' : 'send'" 
                      size="sm"
                      @click="sendChatMessage" 
                      :disable="!chatMessageInput.trim() || sendingMessage"
                      :loading="sendingMessage"
                      class="send-button"
                    />
                  </template>
                </q-input>
              </div>
            </div>
          </div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
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
    <ContractProgressDialog v-if="showContractLoading" :message="contractLoadingMessage"/>
    <NoticeBoardDialog v-if="showNoticeDialog" :type="noticeType" action="orders" :message="errorMessage" @hide="showNoticeDialog = false"/>
  </template>
<script>
import { bchToFiat, formatCurrency, formatDate, satoshiToBch, formatOrderStatus } from 'src/exchange'
import { bus } from 'src/wallet/event-bus.js'
import { backend, getBackendWsUrl } from 'src/exchange/backend'
import { getChatBackendWsUrl } from 'src/exchange/chat/backend'
import { updateChatMembers, generateChatRef, fetchChatSession, createChatSession, updateOrderChatSessionRef, fetchChatMessages, fetchChatMembers, fetchChatPubkeys, sendChatMessage as sendChatMessageAPI, updateLastRead, generateChatIdentityRef, loadChatIdentity } from 'src/exchange/chat'
import { ChatMessage } from 'src/exchange/chat/objects'
import { compressEncryptedMessage, encryptMessage } from 'src/marketplace/chat/encryption'
import { getKeypair } from 'src/exchange/chat/keys'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { WebSocketManager } from 'src/exchange/websocket/manager'
import { wallet } from 'src/exchange/wallet'
import NoticeBoardDialog from 'src/components/ramp/fiat/dialogs/NoticeBoardDialog.vue'
import HeaderNav from 'src/components/header-nav.vue'
import RampContract from 'src/exchange/contract'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import EscrowTransfer from 'src/components/ramp/fiat/EscrowTransfer.vue'
import VerifyTransaction from 'src/components/ramp/fiat/VerifyTransaction.vue'
import MiscDialogs from 'src/components/ramp/fiat/dialogs/MiscDialogs.vue'
import StandByDisplay from 'src/components/ramp/fiat/StandByDisplay.vue'
import PaymentConfirmation from 'src/components/ramp/fiat/PaymentConfirmation.vue'
import TradeInfoCard from 'src/components/ramp/fiat/TradeInfoCard.vue'
import AdSnapshotDialog from 'src/components/ramp/fiat/dialogs/AdSnapshotDialog.vue'
import UserProfileDialog from 'src/components/ramp/fiat/dialogs/UserProfileDialog.vue'
import ContractProgressDialog from 'src/components/ramp/fiat/dialogs/ContractProgressDialog.vue'

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
      showNoticeDialog: false,

      // Tabs
      activeTab: 'details',
      
      // History Tab
      statusHistory: [],

      // Chat Tab
      chatLoaded: false,
      chatMessages: [],
      chatMessageInput: '',
      chatAttachmentUrl: null,
      chatScrollTarget: null,
      chatIdentity: null,
      keypair: {},
      chatMembers: [],
      chatPubkeys: [],
      sendingMessage: false,
      addingNewMessage: false,
      arbiterIdentity: null,
      chatMessagesKey: 0,
      unreadChatCount: 0
    }
  },
  components: {
    StandByDisplay,
    ProgressLoader,
    MiscDialogs,
    EscrowTransfer,
    VerifyTransaction,
    PaymentConfirmation,
    TradeInfoCard,
    AdSnapshotDialog,
    UserProfileDialog,
    ContractProgressDialog,
    HeaderNav,
    NoticeBoardDialog
  },
  props: {
    notifType: {
      type: String,
      default: ''
    }
  },
  created () {
    bus.on('new-message', this.onNewMessage)
  },
  beforeUnmount () {
    bus.off('new-message', this.onNewMessage)
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
      let height = this.$q.platform.is.ios ? this.$q.screen.height - 230 : this.$q.screen.height - 200
      if (this.sendingBch || this.verifyingTx) {
        height = height - 40
      } else if ((this.state === 'escrow-bch' && this.hasArbiters) || this.state === 'payment-confirmation') {
        height = height - 90
      }
      return height
    },
    showChatTab () {
      // Show chat tab from confirmation onwards
      const chatVisibleStatuses = ['CNF', 'ESCRW', 'PD_PN', 'PD', 'RLS_PN', 'RLS', 'RFN_PN', 'RFN', 'APL']
      return chatVisibleStatuses.includes(this.order?.status?.value)
    },
    isChatEnabled () {
      // Chat is only functional when funds are escrowed
      const escrowedStatuses = ['ESCRW', 'PD_PN', 'PD', 'RLS_PN', 'RLS', 'RFN_PN', 'RFN', 'APL']
      return escrowedStatuses.includes(this.order?.status?.value)
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
    },
    activeTab (newTab, oldTab) {
      if (newTab === 'history') {
        this.readOrderStatus()
      } else if (newTab === 'chat') {
        // Only load chat if escrow is complete
        if (!this.isChatEnabled) {
          console.log('Chat is not yet enabled - waiting for escrow')
          return
        }
        
        if (!this.chatLoaded) {
          this.loadChatData()
        } else {
          // Update last read when switching to chat tab
          updateLastRead(this.chatRef, this.chatMessages)
            .then(() => {
              bus.emit('last-read-update')
              // Refresh unread count after marking as read
              this.fetchChatUnread(this.chatRef)
            })
            .catch(error => {
              console.error('Error updating last read:', error)
            })
        }
      } else if (oldTab === 'chat') {
        // When leaving chat tab, refresh unread count (only if chat was enabled)
        if (this.isChatEnabled) {
          this.fetchChatUnread(this.chatRef)
        }
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
    formatOrderStatus,
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
        await vm.fetchStatusList() // Load status history
        if (this.notifType === 'new_message') { 
          this.activeTab = 'chat'
        }
        vm.isloaded = true
      } catch (error) {
        console.error(error)
      }
    },

    // Status History Tab Methods
    async fetchStatusList () {
      if (!this.order?.id) return
      try {
        const response = await backend.get(`/ramp-p2p/order/${this.order.id}/status/`, { authorize: true })
        this.statusHistory = response.data
      } catch (error) {
        this.handleRequestError(error)
      }
    },

    async readOrderStatus () {
      if (!this.order?.id || !this.userTraderType) return
      try {
        await backend.patch(`/ramp-p2p/order/${this.order.id}/status/`, null, { authorize: true })
        this.order.has_unread_status = false
        setTimeout(() => {
          this.fetchStatusList()
        }, 1000)
      } catch (error) {
        this.handleRequestError(error)
      }
    },

    isStatusRead (status) {
      if (!this.userTraderType) return true
      return (this.userTraderType === 'SELLER' && !!status.seller_read_at) || 
             (this.userTraderType === 'BUYER' && !!status.buyer_read_at)
    },

    // Chat Tab Methods
    async loadKeyPair () {
      this.keypair = await getKeypair().catch(console.error)
    },

    async loadChatIdentity () {
      const chatIdentityRef = generateChatIdentityRef(wallet.walletHash)
      this.chatIdentity = this.$store.getters['ramp/chatIdentity'](chatIdentityRef)
      
      if (!this.chatIdentity) {
        const user = this.$store.getters['ramp/getUser']
        const identity = await loadChatIdentity('peer', { 
          name: user?.name, 
          chat_identity_id: user?.chat_identity_id 
        }).catch(console.error)
        
        if (identity) {
          this.chatIdentity = identity
          this.$store.commit('ramp/updateChatIdentity', { 
            ref: identity.ref, 
            chatIdentity: identity 
          })
        }
      }
    },

    async loadChatData () {
      if (!this.chatRef || this.chatLoaded) return
      
      try {
        await this.loadKeyPair()
        await this.loadChatIdentity()

        // Fetch chat members
        const members = await fetchChatMembers(this.chatRef).catch(() => [])
        if (members?.length) {
          this.chatMembers = members.map(member => ({
            id: member.chat_identity.id,
            name: member.chat_identity.name,
            ref: member.chat_identity.ref,
            is_ad_owner: member.chat_identity.id === this.order?.ad?.owner?.chat_identity_id,
            is_order_owner: member.chat_identity.id === this.order?.owner?.chat_identity_id,
            is_arbiter: member.chat_identity.id === this.arbiterIdentity?.chat_identity_id || false,
            pubkeys: member.chat_identity.pubkeys
          }))
        }

        // Fetch chat pubkeys
        const pubkeys = await fetchChatPubkeys(this.chatRef).catch(() => [])
        if (pubkeys?.length) {
          this.chatPubkeys = pubkeys
        }

        // Fetch and decrypt messages
        const response = await fetchChatMessages(this.chatRef)
        if (response?.results) {
          this.chatMessages = response.results.reverse()
          await this.decryptChatMessages(this.chatMessages)
        }
        
        this.chatLoaded = true

        // Scroll to bottom with multiple attempts
        this.$nextTick(() => {
          this.scrollChatToBottom()
          setTimeout(() => {
            this.scrollChatToBottom()
          }, 200)
          setTimeout(() => {
            this.scrollChatToBottom()
          }, 500)
        })
      } catch (error) {
        console.error('Error loading chat:', error)
        this.chatLoaded = true
      }
    },

    async loadMoreChatData (index, done) {
      // Simplified - would need proper pagination
      done()
    },

    async sendChatMessage () {
      const vm = this
      if (!vm.chatMessageInput.trim() || vm.sendingMessage) return
      
      try {
        vm.sendingMessage = true
        const originalMessage = vm.chatMessageInput.trim()
        console.log('Sending message:', originalMessage)
        
        let message = originalMessage

        // Encrypt message
        if (vm.keypair.privkey && vm.chatPubkeys.length) {
          const encryptedMessage = encryptMessage({
            data: message,
            privkey: vm.keypair.privkey,
            pubkeys: vm.chatPubkeys
          })
          message = compressEncryptedMessage(encryptedMessage)
        }

        const data = {
          chat_session_ref: vm.chatRef,
          message: message,
          encrypted: true
        }

        console.log('Calling sendChatMessageAPI...')
        const response = await sendChatMessageAPI(data, originalMessage)
        console.log('Message sent, response:', response)
        console.log('Response has id?', response?.id)
        console.log('Response structure:', JSON.stringify(response))
        
        // Clear input immediately
        vm.chatMessageInput = ''
        
        // Optimistically add message to UI immediately
        if (response) {
          console.log('Adding sent message to UI optimistically')
          console.log('Current chatIdentity:', vm.chatIdentity)
          console.log('Current chatMessages length before:', vm.chatMessages.length)
          
          const messageId = response.id || response.data?.id || Date.now()
          
          const optimisticMessage = {
            id: messageId,
            message: originalMessage,
            _decryptedMessage: originalMessage,
            createdAt: response.created_at || response.data?.created_at || new Date().toISOString(),
            chatIdentity: {
              id: vm.chatIdentity?.chat_identity_id || vm.chatIdentity?.id,
              name: vm.chatIdentity?.name || 'You',
              ref: vm.chatIdentity?.ref,
              is_user: true
            }
          }
          console.log('Created optimistic message:', optimisticMessage)
          
          // Check if message already exists
          const exists = vm.chatMessages.some(msg => msg.id === messageId)
          console.log('Message already exists?', exists)
          
          if (!exists) {
            console.log('Adding message via addMessageToChat...')
            const added = vm.addMessageToChat(optimisticMessage)
            console.log('Message added?', added)
            console.log('All messages:', vm.chatMessages.map(m => ({ id: m.id, text: m._decryptedMessage })))
          } else {
            console.log('Message already exists in chatMessages, skipping')
          }
        } else {
          console.error('No response from API!')
        }
      } catch (error) {
        console.error('Error sending message:', error)
      } finally {
        vm.sendingMessage = false
      }
    },

    async onNewMessage (messageData) {
      const vm = this
      
      if (!messageData || vm.addingNewMessage) return
      
      // Ensure chat is initialized
      if (!vm.chatIdentity || !vm.keypair.privkey) {
        await vm.loadKeyPair()
        await vm.loadChatIdentity()
      }
      
      // Check if message already exists
      const messageId = messageData.id
      const exists = vm.chatMessages.some(msg => msg.id === messageId)
      if (exists) return
    
      try {
        vm.addingNewMessage = true
        const chatMessage = new ChatMessage(messageData)
        const decryptedMessage = await vm.decryptMessage(chatMessage)
        
        if (decryptedMessage) {
          const ref = vm.chatIdentity?.ref
          decryptedMessage.chatIdentity.is_user = decryptedMessage.chatIdentity.ref === ref
          
          const added = vm.addMessageToChat(decryptedMessage)

          if (added) {
            // Only update last read if user is on chat tab
            if (vm.activeTab === 'chat') {
              await updateLastRead(vm.chatRef, vm.chatMessages)
              bus.emit('last-read-update')
            } else if (!decryptedMessage.chatIdentity.is_user) {
              // If not on chat tab and message is from other party, refresh unread count
              vm.fetchChatUnread(vm.chatRef)
            }
          }
        }
      } catch (error) {
        console.error('Error adding new message:', error)
      } finally {
        vm.addingNewMessage = false
      }
    },

    async decryptMessage (message = ChatMessage.parse()) {
      if (!this.keypair.privkey) await this.loadKeyPair()
      if (!this.keypair.privkey) return null
      
      try {
        const decryptedMessage = await message.decryptMessage(this.keypair.privkey, false)
        return decryptedMessage
      } catch (error) {
        console.error('Error decrypting message:', error)
        return message
      }
    },

    async decryptChatMessages (messages) {
      if (!this.keypair.privkey) await this.loadKeyPair()
      if (!this.keypair.privkey) return

      try {
        const decryptedMessages = await Promise.all(
          messages.map(msg => this.decryptMessage(new ChatMessage(msg)))
        )
        
        const ref = this.chatIdentity?.ref
        decryptedMessages.forEach((item, index) => {
          if (item) {
            item.chatIdentity.is_user = item.chatIdentity.ref === ref
            messages[index] = item
          }
        })
      } catch (error) {
        console.error('Error decrypting messages:', error)
      }
    },

    addMessageToChat (message) {
      // Check if message already exists
      const exists = this.chatMessages.some(msg => msg.id === message.id)
      if (exists) return false
      
      // Add message using Vue's reactivity
      this.chatMessages = [...this.chatMessages, message]
      this.chatMessagesKey++
      
      // Scroll to bottom with multiple attempts to ensure it works
      this.$nextTick(() => {
        this.scrollChatToBottom()
      })
      
      setTimeout(() => {
        this.scrollChatToBottom()
      }, 250)
      
      setTimeout(() => {
        this.scrollChatToBottom()
      }, 500)
      
      return true
    },

    scrollChatToBottom () {
      // Scroll the window to bottom
      const scrollWindowToBottom = () => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        })
      }
      
      // Try scrolling the chat messages wrapper
      const scrollTarget = this.$refs.chatScrollTarget
      if (scrollTarget) {
        scrollTarget.scrollTo({
          top: scrollTarget.scrollHeight,
          behavior: 'smooth'
        })
        scrollTarget.scrollTop = scrollTarget.scrollHeight
      }
      
      // Find and scroll the tab panel
      const tabPanel = document.querySelector('.q-tab-panel')
      if (tabPanel) {
        tabPanel.scrollTo({
          top: tabPanel.scrollHeight,
          behavior: 'smooth'
        })
        tabPanel.scrollTop = tabPanel.scrollHeight
      }
      
      // Execute all scroll methods
      scrollWindowToBottom()
      
      // Repeat with delays to ensure it works
      setTimeout(scrollWindowToBottom, 100)
      setTimeout(scrollWindowToBottom, 300)
      setTimeout(scrollWindowToBottom, 500)
    },

    chatMemberType (chatIdentityId) {
      const members = this.order?.members
      for (const type in members) {
        if (members[type]?.chat_identity_id === chatIdentityId) {
          return type.charAt(0).toUpperCase() + type.slice(1)
        }
      }
      return 'User'
    },

    userName (name) {
      return name || 'Anonymous'
    },

    formatChatDate (date) {
      return formatDate(date, true)
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
              .catch(error => {
                if (error.response?.status === 404) {
                  vm.createGroupChat(vm.order?.id, chatRef)
                }
                this.handleRequestError(error)
              })
          }
          
          // Fetch unread count from chat members (only if chat is enabled)
          const escrowedStatuses = ['ESCRW', 'PD_PN', 'PD', 'RLS_PN', 'RLS', 'RFN_PN', 'RFN', 'APL']
          if (escrowedStatuses.includes(vm.order?.status?.value)) {
            vm.fetchChatUnread(chatRef)
          }
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },

    async fetchChatUnread (chatRef) {
      if (!chatRef) return
      
      const user = this.$store.getters['ramp/getUser']
      
      await fetchChatMembers(chatRef).then(response => {
        const userMember = response?.filter(member => {
          return user?.chat_identity_id === member?.chat_identity?.id
        })[0]
        
        this.unreadChatCount = userMember?.unread_count || 0
        this.hasUnread = this.unreadChatCount > 0
      }).catch(error => {
        console.error('Error fetching chat unread:', error?.response || error)
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
          bus.emit('last-read-update')
          bus.emit('new-message', messageData)
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

  // Page Container
  .order-page-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-width: 100vw;
    overflow: hidden;
  }

  // Skeleton Loader Styles
  .skeleton-tabs {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    justify-content: center;
    
    &.dark {
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
  }

  .skeleton-tab {
    border-radius: 4px;
  }

  .skeleton-content {
    padding: 16px;
    overflow-y: auto;
  }

  // Order Header
  .order-header {
    flex-shrink: 0;
    padding: 16px 20px;
    text-align: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    max-width: 100%;
    overflow-x: hidden;
    box-sizing: border-box;
    
    &.dark {
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
  }

  .order-title {
    font-size: 16px;
    font-weight: 500;
    line-height: 1.4;
    margin-bottom: 2px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .order-id {
    font-size: 12px;
    opacity: 0.5;
    font-weight: 400;
    letter-spacing: 0;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  // Tabs Styling
  .order-tabs {
    flex-shrink: 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    background: transparent;
    padding: 0 8px;
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    box-sizing: border-box;
    
    // Hide scrollbar on mobile
    &::-webkit-scrollbar {
      display: none;
      height: 0;
    }
    scrollbar-width: none;
    -ms-overflow-style: none;
    
    &.dark {
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    :deep(.q-tab) {
      padding: 12px 20px;
      font-weight: 400;
      font-size: 13px;
      text-transform: none;
      letter-spacing: 0.2px;
      transition: all 0.2s ease;
      opacity: 0.45;
      min-height: 44px;
      
      .q-icon {
        display: none;
      }
      
      &:hover {
        opacity: 0.7;
      }
    }

    :deep(.q-tab--active) {
      font-weight: 500;
      opacity: 1;
    }

    :deep(.q-tabs__indicator) {
      height: 2px;
      border-radius: 2px 2px 0 0;
    }
    
    :deep(.q-tab__label) {
      margin-top: 0;
    }
    
    // Badge positioning as superscript
    :deep(.q-badge--floating) {
      top: 4px;
      right: -16px;
      font-size: 10px;
      min-width: 18px;
      min-height: 18px;
      padding: 2px 5px;
      margin-left: 8px;
    }
  }

  .order-tab-panels {
    background: transparent;
    overflow: hidden;
    max-width: 100%;
    padding: 0;
    margin: 0;

    :deep(.q-tab-panel) {
      padding: 0 !important;
      margin: 0 !important;
      max-width: 100%;
      overflow: hidden;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
  }

  .tab-content-wrapper {
    padding: 16px 12px 12px 12px;
    min-height: 100%;
    max-width: 100%;
    overflow-x: hidden;
    box-sizing: border-box;
  }

  .details-tab-content {
    padding: 16px 0 8px 0;
    
    // Ensure child components are constrained
    > * {
      max-width: 100%;
      overflow-x: hidden;
    }
  }

  .component-wrapper {
    max-width: 100%;
    overflow-x: hidden;
    box-sizing: border-box;
    
    // Target all child components
    :deep(> *) {
      max-width: 100% !important;
      overflow-x: hidden !important;
      box-sizing: border-box !important;
    }
    
    // Ensure containers, cards, and forms are responsive
    :deep(.q-card),
    :deep(.q-list),
    :deep(.q-form),
    :deep(.container),
    :deep(div[class*="row"]) {
      max-width: 100% !important;
      overflow-x: hidden !important;
      box-sizing: border-box !important;
    }
  }

  // Status Card Styling
  .status-card {
    border-radius: 8px;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    
    &.unread-status {
      border: 1px solid rgba(33, 150, 243, 0.3);
      background: rgba(33, 150, 243, 0.04);
      box-shadow: 0 1px 4px rgba(33, 150, 243, 0.12);
    }

    &:hover {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    }
  }

  .status-relative-time {
    opacity: 0.5;
    font-size: 11px;
    font-weight: 400;
  }

  // Chat Styling
  .chat-tab-panel {
    :deep(.tab-content-wrapper) {
      padding: 0 !important;
      margin: 0 !important;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
      height: 100%;
    }
    
    :deep(.q-tab-panel__content) {
      padding: 0 !important;
      margin: 0 !important;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    }
  }

  .chat-disabled-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    padding: 24px;
  }

  .chat-disabled-banner {
    border-radius: 16px;
    background: rgba(158, 158, 158, 0.1);
    border: 1px solid rgba(158, 158, 158, 0.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    max-width: 500px;
    margin: 0 auto;
  }

  .chat-disabled-banner.dark {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .chat-disabled-content {
    text-align: center;
    padding: 16px;
  }

  .chat-disabled-content .text-h6 {
    font-weight: 600;
    font-size: 18px;
    color: inherit;
    opacity: 0.9;
  }

  .chat-disabled-content .text-body2 {
    font-size: 14px;
    line-height: 1.6;
    opacity: 0.7;
    color: inherit;
  }

  .chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: transparent;
    padding: 0;
    margin: 0;
    overflow: hidden;
  }

  .chat-messages-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: transparent;
    min-height: 0;
  }

  .encrypted-banner {
    flex-shrink: 0;
    margin: 12px;
    border-radius: 12px;
    background: rgba(76, 175, 80, 0.1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(76, 175, 80, 0.25);
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.08);
    
    &.dark {
      background: rgba(76, 175, 80, 0.15);
      border: 1px solid rgba(76, 175, 80, 0.3);
      box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
    }

    :deep(.q-banner__avatar) {
      align-self: center;
      display: flex;
      align-items: center;
    }

    :deep(.q-banner__content) {
      padding: 0;
      display: flex;
      align-items: center;
    }
  }

  .encrypted-banner-text {
    font-size: 13px;
    line-height: 1.4;
    font-weight: 400;
    opacity: 0.9;
  }

  .chat-messages-wrapper {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 8px 80px 8px;
    margin: 0;
    -webkit-overflow-scrolling: touch;
    
    // Hide scrollbar
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }

  .chat-messages-scroll {
    min-height: auto;
  }

  .chat-messages-list {
    padding: 0;
    min-height: auto;
  }

  .empty-chat-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 40px 20px;
    opacity: 0.4;
  }

  .chat-message-wrapper {
    margin-bottom: 12px;
  }

  .professional-chat-message {
    :deep(.q-message-text) {
      border-radius: 18px;
      padding: 10px 14px;
      min-width: 60px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    :deep(.q-message-text--sent) {
      background: rgba(255, 255, 255, 0.3) !important;
      border: 1px solid rgba(255, 255, 255, 0.35);
    }

    :deep(.q-message-text--received) {
      background: rgba(0, 0, 0, 0.04) !important;
      border: 1px solid rgba(0, 0, 0, 0.1);
    }

    :deep(.q-message-avatar) {
      width: 32px;
      height: 32px;
      min-width: 32px;
      min-height: 32px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    :deep(.q-message-name) {
      font-size: 11px;
      font-weight: 500;
      opacity: 0.6;
      margin-bottom: 4px;
      letter-spacing: 0.3px;
    }

    :deep(.q-message-stamp) {
      font-size: 10px;
      opacity: 0.45;
      margin-top: 4px;
      font-weight: 400;
    }

    .message-text {
      line-height: 1.5;
      word-break: break-word;
      font-size: 14px;
      font-weight: 400;
    }

    // Dark mode variants
    &.dark {
      :deep(.q-message-text) {
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      :deep(.q-message-text--sent) {
        background: rgba(255, 255, 255, 0.18) !important;
        border: 1px solid rgba(255, 255, 255, 0.25);
      }

      :deep(.q-message-text--received) {
        background: rgba(255, 255, 255, 0.12) !important;
        border: 1px solid rgba(255, 255, 255, 0.18);
      }

      :deep(.q-message-avatar) {
        border: 2px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
      
      :deep(.q-message-name) {
        opacity: 0.75;
      }

      :deep(.q-message-stamp) {
        opacity: 0.6;
      }
      
      .message-text {
        color: rgba(255, 255, 255, 0.95);
      }
    }
  }

  .chat-input-wrapper {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    z-index: 100;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.04);
    padding-bottom: env(safe-area-inset-bottom, 0);
    
    &.dark {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(0, 0, 0, 0.3);
      box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.4);
    }
  }

  .chat-input-container {
    padding: 12px 16px;
    display: flex;
    align-items: flex-end;
  }

  .chat-input {
    flex: 1;

    :deep(.q-field__control) {
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.6);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      padding: 2px 12px;
      min-height: 40px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      
      &:before {
        display: none;
      }
    }

    :deep(.q-field__native) {
      padding: 8px 0;
      font-size: 14px;
      line-height: 1.4;
    }

    :deep(.q-field--outlined.q-field--focused) {
      .q-field__control {
        border-color: currentColor;
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.05);
      }
    }

    &.dark {
      :deep(.q-field__control) {
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.15);
      }
      
      :deep(.q-field__native) {
        color: rgba(255, 255, 255, 0.95);
      }
      
      :deep(.q-field--outlined.q-field--focused) {
        .q-field__control {
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
        }
      }
    }
  }

  .send-button {
    margin-left: 8px;
    width: 36px;
    height: 36px;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  // Mobile Responsive Adjustments
  @media (max-width: 600px) {
    .order-header {
      padding: 12px 16px;
    }

    .order-tabs {
      padding: 0 4px;
    }

    .tab-content-wrapper {
      padding: 12px 8px 8px 8px;
    }

    .details-tab-content {
      padding: 12px 0 4px 0;
    }

    .encrypted-banner {
      margin: 8px;
    }

    .chat-input-container {
      padding: 8px 12px;
    }
    
    .chat-tab-panel {
      :deep(.tab-content-wrapper) {
        padding: 0 !important;
        margin: 0 !important;
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-height: 0;
        height: 100%;
      }
      
      :deep(.q-tab-panel__content) {
        padding: 0 !important;
        margin: 0 !important;
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-height: 0;
      }
    }
  }

  // Extra small screens
  @media (max-width: 400px) {
    .order-header {
      padding: 10px 12px;
    }

    .order-title {
      font-size: 14px;
    }

    .order-id {
      font-size: 11px;
    }

    .order-tabs {
      padding: 0 2px;
    }

    :deep(.q-tab) {
      padding: 10px 16px !important;
      font-size: 12px !important;
    }

    .tab-content-wrapper {
      padding: 10px 6px 6px 6px;
    }
    
    .chat-tab-panel {
      :deep(.tab-content-wrapper) {
        padding: 0 !important;
        margin: 0 !important;
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-height: 0;
        height: 100%;
      }
      
      :deep(.q-tab-panel__content) {
        padding: 0 !important;
        margin: 0 !important;
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-height: 0;
      }
    }
  }
  </style>
