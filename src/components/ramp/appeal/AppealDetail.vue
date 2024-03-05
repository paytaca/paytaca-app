<template>
  <div class="q-mx-md q-mx-none text-bow"
    :class="getDarkModeClass(darkMode)"
    v-if="state === 'form'">
    <q-pull-to-refresh class="q-mb-md" @refresh="$emit('refresh')">
      <div v-if="loading">
        <div class="row justify-center q-py-lg" style="margin-top: 50px">
          <ProgressLoader/>
        </div>
      </div>
      <div v-else>
        <div class="text-center q-pb-sm">
          <div v-if="appeal?.resolved_at" class="text-weight-bold" style="font-size: large;">{{ appeal?.order?.status?.label?.toUpperCase() }} </div>
          <div v-if="!appeal?.resolved_at" class="text-weight-bold" style="font-size: large;">{{ appeal?.type?.label?.toUpperCase() }} APPEAL</div>
          <div class="sm-font-size" :class="darkMode ? 'text-grey-4' : 'text-grey-6'">ORDER #{{ appeal?.order?.id }}</div>
        </div>
        <q-scroll-area ref="scrollArea" :style="`height: ${minHeight - 150}px`" style="overflow-y:auto;">
          <div class="q-mx-sm q-mb-sm">
            <TradeInfoCard
              :order="order"
              :ad="ad_snapshot"
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
                    <div class="text-weight-bold md-font-size">Appeal reasons</div>
                    <q-badge v-for="(reason, index) in appeal.reasons" class="row q-px-sm" :key="index" size="sm" outline :color="darkMode ? 'blue-grey-4' : 'blue-grey-6'" :label="reason" />
                  </div>
                  <q-space/>
                  <div class="col q-mt-sm">
                    <q-btn size="1.3em" padding="none" dense ripple round flat class="button button-icon" icon="forum" :disabled="completedOrder" @click="openChat=true"/>
                  </div>
                </div>
              </q-card-section>
            </q-card>
            <div class="q-my-sm">
              <q-card class="br-15 q-py-sm" bordered flat :class="[ darkMode ? 'pt-card-2 dark' : '',]">
                <div class="text-center q-py-xs text-weight-bold text-uppercase">
                  Contract Information
                </div>
                <q-separator class="q-my-sm" :dark="darkMode"/>
                <div class="q-mx-lg">
                  <div class="sm-font-size q-pb-xs text-italic">Address</div>
                  <q-input
                    class="q-pb-xs"
                    readonly
                    dense
                    filled
                    :dark="darkMode"
                    v-model="contractAddress">
                  </q-input>
                  <div class="sm-font-size q-pb-xs text-italic">Balance</div>
                  <q-input
                    class="q-pb-xs"
                    readonly
                    dense
                    filled
                    :dark="darkMode"
                    :loading="contractBalance === null"
                    v-model="contractBalance">
                    <template v-slot:append>
                      <span class="sm-font-size">BCH</span>
                    </template>
                  </q-input>
                </div>
              </q-card>
            </div>
            <div class="q-my-sm">
              <q-card class="br-15" bordered flat :class="[darkMode ? 'pt-card-2 dark' : '']">
                <q-tabs
                  v-model="tab"
                  dense
                  class=""
                  active-color="primary"
                  indicator-color="primary"
                  align="justify"
                  narrow-indicator>
                  <q-tab name="status" label="Status" />
                  <q-tab name="transaction" label="Transactions" />
                </q-tabs>

                <q-separator class="q-mb-sm" :dark="darkMode"/>

                <div v-if="tab === 'status'">
                  <div v-for="(status, index) in statusHistory" :key="index" class="sm-font-size q-pb-sm">
                    <q-separator class="q-my-sm" :dark="darkMode" v-if="index !== 0"/>
                    <div class="row justify-between no-wrap q-mx-lg">
                      <span class="col">{{ formattedOrderStatus(status.status) }}</span>
                      <span class="col text-nowrap q-ml-xs">
                        {{ formattedDate(status.created_at) }}
                      </span>
                    </div>
                  </div>
                </div>

                <div v-if="tab === 'transaction'">
                  <div class="row text-weight-bold sm-font-size">
                    <div class="col text-center">Action</div>
                    <div class="col text-center">Txid</div>
                    <div class="col text-center">Status</div>
                    <div class="col text-center">Date</div>
                  </div>
                  <q-separator class="q-my-sm" :dark="darkMode"/>
                  <div>
                    <div v-for="(transaction, index) in transactionHistory" :key=index>
                      <q-separator class="q-my-sm" :dark="darkMode" v-if="index !== 0"/>
                      <div class="row sm-font-size" :class="darkMode ? '' : 'text-grey-7'">
                        <div class="col text-center">{{ transaction.action }}</div>
                        <div class="col text-blue text-center" @click="viewTxid(transaction.txid)"><u>{{ formattedTxid(transaction.txid) }}</u></div>
                        <div class="col text-center">{{ transaction.valid ? 'Validated' : 'Not Validated'}}</div>
                        <div class="col xs-font-size">{{ formattedDate(transaction.created_at, true)}}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </q-card>
            </div>
            <div v-if="state === 'form'" class="q-my-sm">
              <q-card v-if="appeal?.resolved_at === null" class="br-15 q-py-sm" bordered flat :class="[ darkMode ? 'pt-card-2 dark' : '',]">
                <div class="text-center q-py-xs text-weight-bold text-uppercase">
                  Select Action
                </div>
                <q-separator class="q-my-sm" :dark="darkMode"/>
                  <div class="row justify-between no-wrap q-mx-lg">
                    <span class="sm-font-size">Release</span>
                    <span class="text-nowrap q-ml-xs">
                      <q-btn
                        rounded
                        size="sm"
                        icon="done"
                        :disable="sendingBch"
                        :outline="selectedAction !== 'release'"
                        :color="selectedAction === 'release' ? 'blue-6' : 'grey-6'"
                        class="q-ml-xs"
                        @click="selectReleaseType('release')"
                      />
                    </span>
                  </div>
                  <q-separator class="q-my-sm" :dark="darkMode"/>
                  <div class="row justify-between no-wrap q-mx-lg">
                    <span class="sm-font-size">Refund</span>
                    <span class="text-nowrap q-ml-xs">
                      <q-btn
                        rounded
                        size="sm"
                        icon="done"
                        :disable="sendingBch"
                        :outline="selectedAction !== 'refund'"
                        :color="selectedAction === 'refund' ? 'blue-6' : 'grey-6'"
                        class="q-ml-xs"
                        @click="selectReleaseType('refund')"
                      />
                    </span>
                  </div>
              </q-card>
            </div>
          </div>
          <div class="q-mx-lg q-px-md q-my-sm" v-if="sendingBch">
            <q-spinner class="q-mr-xs"/>{{ selectedAction === 'release' ? 'Releasing' : 'Refunding'}} BCH, please wait.
          </div>
          <div v-if="sendError" class="q-mx-lg q-px-lg q-my-sm">
            <q-card flat class="col q-pa-md pt-card-2 text-bow bg-red-1" :class="getDarkModeClass(darkMode)">
              <q-icon name="error" left/>
              {{ sendError }}
            </q-card>
          </div>
        </q-scroll-area>
      </div>
    </q-pull-to-refresh>
  </div>

  <!-- Ad Snapshot -->
  <!-- <AdSnapshot
    v-if="state === 'snapshot'"
    :snapshot="ad_snapshot"
    :selected-payment-methods="order.payment_methods"
    @back="state = 'form'"
  /> -->

  <!-- Chat Dialog -->
  <!-- <div v-if="openChat">
    <ChatDialog
      :openDialog="openChat"
      :data="order"
      v-on:close="openChat = false"
    />
  </div> -->

  <!-- Add DragSlide -->
  <RampDragSlide
    :key="dragSlideKey"
    v-if="showDragSlide && state === 'form'"
    :locked="!selectedAction"
    :style="{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1500,
    }"
    @ok="onSubmit"
    @cancel="onSecurityCancel"
    text="Swipe To Confirm"
  />
  <AdSnapshotDialog v-if="showAdSnapshot" :snapshot-id="order?.ad?.id" @back="showAdSnapshot=false"/>
  <UserProfileDialog v-if="showPeerProfile" :user-info="peerInfo" @back="showPeerProfile=false"/>
  <ChatDialog v-if="openChat" :data="order" @close="openChat=false"/>
</template>
<script>
import ProgressLoader from '../../ProgressLoader.vue'
import RampDragSlide from '../fiat/dialogs/RampDragSlide.vue'
// import AdSnapshot from './AdSnapshot.vue'
import ChatDialog from '../fiat/dialogs/ChatDialog.vue'
import { formatCurrency, formatDate, formatOrderStatus, formatAddress } from 'src/wallet/ramp'
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/wallet/ramp/backend'
import { loadRampWallet } from 'src/wallet/ramp/wallet'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import TradeInfoCard from '../fiat/TradeInfoCard.vue'
import UserProfileDialog from 'src/components/ramp/fiat/dialogs/UserProfileDialog.vue'
import AdSnapshotDialog from 'src/components/ramp/fiat/dialogs/AdSnapshotDialog.vue'

export default {
  data () {
    return {
      isChipnet: this.$store.getters['global/isChipnet'],
      darkMode: this.$store.getters['darkmode/getStatus'],
      wallet: null,
      tab: 'status',
      state: 'form',
      order: null,
      ad_snapshot: null,
      contract: null,
      contractBalance: null,
      fees: null,
      statusHistory: [],
      transactionHistory: [],
      loading: true,
      amount: {
        buyer: 1,
        seller: 105500
      },
      selectedAction: null,
      showDragSlide: false,
      dragSlideKey: 0,
      sendingBch: false,
      sendError: null,
      openChat: false,
      showAdSnapshot: false,
      showPeerProfile: false,
      peerInfo: {},
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 110 : this.$q.screen.height - 85
    }
  },
  props: {
    data: Object,
    escrowContract: Object,
    initstate: String
  },
  emits: ['back', 'refresh', 'success', 'updatePageName'],
  components: {
    RampDragSlide,
    AdSnapshotDialog,
    UserProfileDialog,
    ChatDialog,
    ProgressLoader,
    TradeInfoCard
  },
  watch: {
    sendError (value) {
      console.log('sendError:', value)
    },
    sendingBch (value) {
      if (value) {
        this.$nextTick(() => {
          const scrollHeight = this.$refs.scrollArea.$el.scrollHeight
          this.$refs.scrollArea.setScrollPosition('vertical', scrollHeight * 3, 0)
        })
      }
    }
  },
  computed: {
    completedOrder () {
      return ['CNCL', 'RLS', 'RFN'].includes(this.order?.status?.value)
    },
    contractAddress () {
      return this.contract.address
    }
  },
  async mounted () {
    this.loadData()
    this.fetchContractBalance()
    this.wallet = loadRampWallet()
  },
  methods: {
    getDarkModeClass,
    loadData () {
      const vm = this
      vm.appeal = vm.data?.appeal
      vm.order = vm.data?.order
      vm.ad_snapshot = vm.data?.ad_snapshot
      vm.statusHistory = vm.data?.statuses
      vm.transactionHistory = vm.data?.transactions
      vm.contract = vm.data?.contract
      vm.fees = vm.data?.fees
      if (vm.initstate === 'release-form') {
        vm.state = 'form'
        vm.showDragSlide = true
      } else {
        vm.showDragSlide = false
      }
      vm.loading = false
    },
    fetchContractBalance () {
      return new Promise((resolve, reject) => {
        if (!this.escrowContract) return 0
        this.escrowContract?.getBalance()
          .then(balance => {
            this.contractBalance = balance
            resolve(balance)
          })
          .catch(error => reject(error))
      })
    },
    async onSubmit () {
      const vm = this
      vm.showDragSlide = false
      vm.sendingBch = true
      if (vm.selectedAction === 'release') {
        vm.releaseBch().then(txid => {
          const url = `/ramp-p2p/order/${vm.appeal.order.id}/appeal/pending-release`
          backend.post(url, {}, { authorize: true })
            .then(response => {
              console.log(response.data)
              vm.$emit('success', txid)
            })
            .catch(error => {
              console.error(error.response)
              if (error.response && error.response.status === 403) {
                bus.emit('session-expired')
              }
            })
            .finally(() => { vm.sendingBch = false })
        })
      }
      if (vm.selectedAction === 'refund') {
        vm.refundBch().then(txid => {
          const url = `/ramp-p2p/order/${vm.appeal.order.id}/appeal/pending-refund`
          backend.post(url, {}, { authorize: true })
            .then(response => {
              console.log(response.data)
              vm.$emit('success', txid)
            })
            .catch(error => {
              console.error(error.response)
              if (error.response && error.response.status === 403) {
                bus.emit('session-expired')
              }
            })
            .finally(() => { vm.sendingBch = false })
        })
      }
    },
    releaseBch () {
      return new Promise((resolve, reject) => {
        const vm = this
        if (!vm.escrowContract) reject('escrow contract is null')
        const arbiterMember = (vm.contract?.members).find(member => { return member.member_type === 'ARBITER' })
        this.wallet.keypair(arbiterMember.address_path).then(keypair => {
          vm.escrowContract.release(keypair.privateKey, keypair.publicKey, this.order.crypto_amount)
            .then(result => {
              console.log(result)
              if (result.success) {
                const txid = result.txInfo.txid
                const txidData = {
                  id: vm.order.id,
                  txidInfo: {
                    action: 'RELEASE',
                    txid: txid
                  }
                }
                vm.$store.commit('ramp/saveTxid', txidData)
                vm.$emit('verify-release', txid)
                resolve(txid)
              } else {
                vm.sendError = result.reason
                console.log('sendError:', vm.sendError)
                vm.sendingBch = false
                vm.showDragSlide = true
                reject(vm.sendError)
              }
            })
            .catch(error => {
              console.error(error)
              reject(error)
            })
        })
      })
    },
    refundBch () {
      return new Promise((resolve, reject) => {
        const vm = this
        if (!vm.escrowContract) reject('escrow contract is null')
        const arbiterMember = (vm.contract?.members).find(member => { return member.member_type === 'ARBITER' })
        this.wallet.privkey(null, arbiterMember.address_path).then(privateKeyWif => {
          vm.escrowContract.refund(privateKeyWif, this.order.crypto_amount)
            .then(result => {
              console.log(result)
              if (result.success) {
                const txid = result.txInfo.txid
                const txidData = {
                  id: vm.order.id,
                  txidInfo: {
                    action: 'REFUND',
                    txid: txid
                  }
                }
                vm.$store.commit('ramp/saveTxid', txidData)
                vm.$emit('verify-release', txid)
                resolve(txid)
              } else {
                vm.sendError = result.reason
                console.log('sendError:', vm.sendError)
                vm.sendingBch = false
                vm.showDragSlide = true
                reject(vm.sendError)
              }
              resolve(result)
            })
            .catch(error => {
              console.error(error)
              reject(error)
            })
        })
      })
    },
    onSecurityCancel () {
      this.showDragSlide = true
      this.dragSlideKey++
    },
    selectReleaseType (type) {
      if (this.selectedAction === type) {
        this.selectedAction = null
      } else {
        this.selectedAction = type
      }
    },
    refreshData () {
      this.$emit('refresh')
    },
    selectButtonColor (type) {
      const temp = this.selectedMethods.map(p => p.payment_type.name)
      return temp.includes(type) ? 'blue-6' : 'grey-6'
    },
    formattedCurrency (value, currency = null) {
      if (currency) {
        return formatCurrency(value, currency)
      } else {
        return formatCurrency(value)
      }
    },
    formattedAddress (address) {
      return formatAddress(address, 20, 5)
    },
    formattedDate (value, numeric = false) {
      if (numeric) {
        const options = {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric'
        }
        return formatDate(value, false, options)
      }
      return formatDate(value, false)
    },
    formattedOrderStatus (value) {
      return formatOrderStatus(value)
    },
    formattedTxid (txid) {
      if (txid && txid.length > 6) {
        return `${txid.substring(0, 3)}...${txid.slice(-3)}`
      }
      return ''
    },
    viewTxid (txid) {
      console.log('txid:', txid)
    },
    onViewPeer (data) {
      this.peerInfo = data
      this.showPeerProfile = true
    }
  }
}
</script>
<style lang="scss" scoped>
.subtext {
  opacity: .5;
}
</style>
