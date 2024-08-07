<template>
  <div class="text-bow"
    :class="getDarkModeClass(darkMode)">
    <q-pull-to-refresh class="q-mb-md" @refresh="$emit('refresh')">
      <div v-if="loading">
        <div class="row justify-center q-py-lg" style="margin-top: 50px">
          <ProgressLoader/>
        </div>
      </div>
      <div v-else>
        <!-- Contract info -->
        <div class="q-px-sm q-pt-sm q-ma-sm">
          <div class="sm-font-size q-pb-xs text-italic">{{ $t('ContractAddress') }}</div>
          <q-input
            class="q-pb-xs"
            readonly
            dense
            filled
            :dark="darkMode"
            v-model="contractAddress">
            <template v-slot:append>
              <div v-if="contractAddress" @click="copyToClipboard(contractAddress)">
                <q-icon size="sm" name='o_content_copy' color="blue-grey-6"/>
              </div>
            </template>
          </q-input>
          <div class="sm-font-size q-pb-xs text-italic">{{ $t('ContractBalance') }}</div>
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
        <div class="row justify-end text-blue sm-font-size q-mx-md">
          <q-btn class="col q-py-none" no-caps flat dense @click="showStatusHistory = true">View Status History</q-btn>
          <q-btn class="col q-py-none" no-caps flat dense @click="showTransactionHistory = true">View Transactions</q-btn>
        </div>
        <div v-if="state === 'form' || state === 'form-sending'" class="q-my-sm">
          <q-card v-if="appeal?.resolved_at === null" class="br-15 q-pa-sm q-mx-md q-my-sm" bordered flat :class="[darkMode ? 'pt-card-2 dark' : '']">
            <div class="text-center q-py-xs text-weight-bold text-uppercase">
              {{ $t('SelectAction') }}
            </div>
            <q-card-actions>
                <q-btn
                  class="col q-ml-xs"
                  size="md"
                  rounded
                  :disable="sendingBch"
                  :outline="selectedAction !== 'refund'"
                  :color="selectedAction === 'refund' ? 'blue-6' : 'grey-6'"
                  :label="$t('Refund')"
                  @click="selectActionType('refund')"
                />
                <q-btn
                  class="col q-ml-xs"
                  size="md"
                  rounded
                  :disable="sendingBch"
                  :outline="selectedAction !== 'release'"
                  :color="selectedAction === 'release' ? 'blue-6' : 'grey-6'"
                  :label="$t('Release')"
                  @click="selectActionType('release')"
                />
            </q-card-actions>
          </q-card>
        </div>
        <div v-else>
          <q-card class="br-15 q-pa-sm q-mx-md q-my-sm" bordered flat :class="[darkMode ? 'pt-card-2 dark' : '']">
            <div class="text-center q-py-xs text-weight-bold text-uppercase">
              SELECTED ACTION
            </div>
            <q-card-actions>
              <q-btn
                class="col q-ml-xs"
                size="md"
                rounded
                disable
                :outline="selectedAction !== 'refund'"
                :color="selectedAction === 'refund' ? 'blue-6' : 'grey-6'"
                :label="$t('Refund')"
                @click="selectActionType('refund')"
              />
              <q-btn
                class="col q-ml-xs"
                size="md"
                rounded
                disable
                :outline="selectedAction !== 'release'"
                :color="selectedAction === 'release' ? 'blue-6' : 'grey-6'"
                :label="$t('Release')"
                @click="selectActionType('release')"
              />
            </q-card-actions>
            <div class="row justify-center text-center subtext">Resolved at {{ formatDate(appeal?.resolved_at) }}</div>
          </q-card>
        </div>
        <div class="q-mx-lg q-mt-md" v-if="sendingBch">
          <q-spinner class="q-mr-xs"/>
          <template v-if="selectedAction === 'release'">
            {{ $t('ReleasingBch') }}
          </template>
          <template v-else>
            {{ $t('RefundingBch') }}
          </template>
        </div>
        <div v-if="sendError" class="bg-red-1 q-mx-md q-px-sm q-my-sm" style="overflow-x: auto;">
          <q-card flat class="row pt-card-2 bg-red-1 text-red q-pa-lg pp-text bg-red-1" :class="getDarkModeClass(darkMode)">
            {{ sendError }}
          </q-card>
        </div>
      </div>
    </q-pull-to-refresh>
  </div>

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
    :text="$t('SwipeToConfirmLower')"
  />
  <OrderStatusDialog v-if="showStatusHistory" :status-history="statusHistory" @back="showStatusHistory = false" />
  <TransactionHistoryDialog v-if="showTransactionHistory" :transaction-history="transactionHistory" @back="showTransactionHistory = false" />
</template>
<script>
import TransactionHistoryDialog from 'src/components/ramp/appeal/dialogs/TransactionHistoryDialog.vue'
import OrderStatusDialog from 'src/components/ramp/appeal/dialogs/OrderStatusDialog.vue'
import ProgressLoader from '../../ProgressLoader.vue'
import RampDragSlide from '../fiat/dialogs/RampDragSlide.vue'
import { formatCurrency, formatDate, formatOrderStatus, formatAddress } from 'src/wallet/ramp'
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/wallet/ramp/backend'
import { loadRampWallet } from 'src/wallet/ramp/wallet'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  components: {
    RampDragSlide,
    ProgressLoader,
    OrderStatusDialog,
    TransactionHistoryDialog
  },
  data () {
    return {
      isChipnet: this.$store.getters['global/isChipnet'],
      darkMode: this.$store.getters['darkmode/getStatus'],
      wallet: null,
      tab: 'status',
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
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 110 : this.$q.screen.height - 85,
      showStatusHistory: false,
      showTransactionHistory: false
    }
  },
  props: {
    data: Object,
    escrowContract: Object,
    state: String
  },
  emits: ['back', 'refresh', 'success', 'update-state', 'updatePageName'],
  watch: {
    sendError (value) {
      console.log('sendError:', value)
    },
    sendingBch (value) {
      if (value) {
        this.$emit('update-state', 'form-sending')
      } else {
        this.$emit('update-state', 'form')
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
    this.fetchContractBalance().then((balance) => {
      if (balance === 0 && this.order.status.value === 'APL') {
        const result = this.loadTransactionId(this.order.id)
        if (result.txid) this.setOrderPending(result.txid, result.action)
      }
    })
    this.wallet = loadRampWallet()
  },
  methods: {
    formatDate,
    getDarkModeClass,
    updateState (state) {
      this.$emit('update-state', state)
    },
    loadTransactionId (orderId) {
      const rlsTxid = this.$store.getters['ramp/getOrderTxid'](orderId, 'RELEASE')
      const rfnTxid = this.$store.getters['ramp/getOrderTxid'](orderId, 'REFUND')
      return {
        action: rlsTxid ? 'release' : 'refund',
        txid: rlsTxid || rfnTxid
      }
    },
    loadData () {
      const vm = this
      vm.appeal = vm.data?.appeal
      vm.order = vm.data?.order
      vm.ad_snapshot = vm.data?.ad_snapshot
      vm.statusHistory = vm.data?.statuses
      vm.transactionHistory = vm.data?.transactions
      vm.contract = vm.data?.contract
      vm.fees = vm.data?.fees
      if (vm.state === 'form') {
        vm.showDragSlide = true
      } else {
        vm.showDragSlide = false
        const actionType = vm.order?.status?.value === 'RLS' ? 'release' : 'refund'
        vm.selectActionType(actionType)
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
          .catch(error => { reject(error) })
      })
    },
    async onSubmit () {
      const vm = this
      vm.showDragSlide = false
      vm.sendingBch = true
      let txid = null
      if (vm.selectedAction === 'release') {
        txid = await vm.releaseBch()
      }
      if (vm.selectedAction === 'refund') {
        txid = await vm.refundBch()
      }
      if (txid) {
        vm.setOrderPending(vm.selectedAction)
      }
    },
    async setOrderPending (action) {
      const vm = this
      const url = `/ramp-p2p/order/${vm.appeal.order.id}/appeal/pending-${action}`
      await backend.post(url, {}, { authorize: true })
        .then(response => {
          console.log(response.data)
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
        })
      vm.sendingBch = true
    },
    async releaseBch () {
      const vm = this
      vm.sendError = null
      if (!vm.escrowContract) return
      const arbiterMember = (vm.contract?.members).find(member => { return member.member_type === 'ARBITER' })
      const keypair = await this.wallet.keypair(arbiterMember.address_path)
      let txid = null
      await vm.escrowContract.release(keypair.privateKey, keypair.publicKey, this.order.crypto_amount)
        .then(result => {
          console.log(result)
          if (result.success) {
            txid = result.txInfo.txid
            const txidData = {
              id: vm.order.id,
              txidInfo: {
                action: 'RELEASE',
                txid: txid
              }
            }
            vm.$store.commit('ramp/saveTxid', txidData)
          } else {
            vm.sendError = result.reason
            vm.sendingBch = false
            vm.showDragSlide = true
          }
        })
        .catch(error => {
          console.error(error)
          vm.sendError = error
          vm.sendingBch = false
          vm.showDragSlide = true
        })
      return txid
    },
    async refundBch () {
      const vm = this
      vm.sendError = null
      if (!vm.escrowContract) return
      const arbiterMember = (vm.contract?.members).find(member => { return member.member_type === 'ARBITER' })
      const privateKey = await vm.wallet.privkey(null, arbiterMember.address_path)
      let txid = null
      await vm.escrowContract.refund(privateKey, this.order.crypto_amount)
        .then(result => {
          console.log(result)
          if (result.success) {
            txid = result.txInfo.txid
            const txidData = {
              id: vm.order.id,
              txidInfo: {
                action: 'REFUND',
                txid: txid
              }
            }
            vm.$store.commit('ramp/saveTxid', txidData)
          } else {
            vm.sendError = result.reason
            vm.sendingBch = false
            vm.showDragSlide = true
            console.log('state:', vm.state)
          }
        })
        .catch(error => {
          console.error(error)
          vm.sendError = error
          vm.sendingBch = false
          vm.showDragSlide = true
        })
      return txid
    },
    onSecurityCancel () {
      this.showDragSlide = true
      this.dragSlideKey++
    },
    selectActionType (type) {
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
    formattedOrderStatus (value) {
      return formatOrderStatus(value)
    },
    viewTxid (txid) {
      console.log('txid:', txid)
    },
    formattedTxid (txid) {
      if (txid && txid.length > 6) {
        return `${txid.substring(0, 3)}...${txid.slice(-3)}`
      }
      return ''
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        color: 'blue-9',
        message: this.$t('CopiedToClipboard'),
        icon: 'mdi-clipboard-check',
        timeout: 200
      })
    }
  }
}
</script>
<style lang="scss" scoped>
.subtext {
  opacity: .5;
}
</style>
