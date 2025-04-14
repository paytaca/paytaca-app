<template>
  <div class="text-bow"
    :class="getDarkModeClass(darkMode)">
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
            <div v-if="contractAddress">
              <q-icon size="sm" name='open_in_new' color="blue-grey-6" @click="openURL(explorerLink)"/>
              <q-icon size="sm" name='o_content_copy' color="blue-grey-6" @click="copyToClipboard(contractAddress)"/>
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
      <!-- Payment Methods -->
      <div v-if="order?.payment_methods_selected?.length > 0" class="q-pt-sm q-ma-sm">
        <div class="md-font-size q-pb-xs q-pl-sm text-center text-weight-bold">{{ $t('PAYMENTMETHODS') }}</div>
        <div class="text-center sm-font-size q-mx-md q-mb-sm">
          The buyer selected the following payment methods.
        </div>
        <div class="full-width">
          <div v-for="(method, index) in order?.payment_methods_selected" :key="index">
            <div class="q-px-sm q-py-xs">
              <q-card flat bordered :dark="darkMode">
                <q-expansion-item
                  class="pt-card text-bow"
                  :class="getDarkModeClass(darkMode, '', 'bg-grey-2')"
                  :default-opened=true
                  :label="method.payment_type"
                  expand-separator >
                  <q-card class="row no-wrap q-py-sm q-px-md pt-card" :class="getDarkModeClass(darkMode)">
                    <div class="col">
                      <div class="row">
                        <div class="col q-pr-sm q-py-xs">
                          <div v-for="(field, index) in method.values" :key="index">
                            <div v-if="field.value">{{ field.field_reference.fieldname }}:</div>
                            <div v-if="field.value" class="q-ml-sm text-weight-bold">
                              {{ field.value }}
                              <q-icon size="1em" name='o_content_copy' color="blue-grey-6" @click="copyToClipboard(field.value)"/>
                            </div>
                          </div>
                          <div v-for="(field, index) in method.dynamic_values" :key="index">
                            {{ field.fieldname }}
                            <div class="q-ml-sm text-weight-bold">
                              {{ dynamicVal(field) }}
                              <q-icon size="1em" name='o_content_copy' color="blue-grey-6" @click="copyToClipboard(dynamicVal(field))"/>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div v-if="method.attachments?.length > 0" class="row">
                        <q-btn
                          flat dense no-caps
                          icon="image"
                          class="row button button-text-primary q-my-none q-py-none"
                          label="View Proof of Payment"
                          style="font-size: small;"
                          @click="viewPaymentAttachment(method.attachments[0].image?.url)"/>
                      </div>
                    </div>
                  </q-card>
                </q-expansion-item>
              </q-card>
            </div>
          </div>
        </div>
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
          <div class="row justify-center text-center subtext" v-if="selectedAction">{{ actionMsg }}</div>
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
      <div v-if="sendError" class="bg-red-1 q-mx-md q-px-sm q-my-sm" style="overflow-x: auto;">
        <q-card flat class="row pt-card-2 bg-red-1 text-red q-pa-lg pp-text bg-red-1" :class="getDarkModeClass(darkMode)">
          {{ sendError }}
        </q-card>
      </div>
    </div>
  </div>

  <!-- Add DragSlide -->
  <RampDragSlide
    v-touch-swipe.mouse="checkDragslideStatus"
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
    @click="checkDragslideStatus()"
    @ok="onSubmit"
    @cancel="onSecurityCancel"
    :text="$t('SwipeToConfirmLower')"
  />
  <OrderStatusDialog v-if="showStatusHistory" :order-id="order?.id" @back="showStatusHistory = false" />
  <TransactionHistoryDialog v-if="showTransactionHistory" :data="txHistoryData" @back="showTransactionHistory = false" @refresh="refreshData" />
  <AttachmentDialog :show="showAttachmentDialog" :url="attachmentUrl" @back="showAttachmentDialog=false"/>
  <NoticeBoardDialog v-if="showNoticeDialog" :type="'info'" action="'orders'" :message="noticeMessage" @hide="showNoticeDialog = false"/>
</template>
<script>
import TransactionHistoryDialog from 'src/components/ramp/appeal/dialogs/TransactionHistoryDialog.vue'
import OrderStatusDialog from 'src/components/ramp/appeal/dialogs/OrderStatusDialog.vue'
import ProgressLoader from '../../ProgressLoader.vue'
import RampDragSlide from '../fiat/dialogs/RampDragSlide.vue'
import { formatCurrency, formatDate, formatOrderStatus, formatAddress } from 'src/exchange'
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/exchange/backend'
import { wallet } from 'src/exchange/wallet'
import { openURL } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import AttachmentDialog from 'src/components/ramp/fiat/dialogs/AttachmentDialog.vue'
import NoticeBoardDialog from '../fiat/dialogs/NoticeBoardDialog.vue'

export default {
  components: {
    RampDragSlide,
    ProgressLoader,
    OrderStatusDialog,
    TransactionHistoryDialog,
    AttachmentDialog,
    NoticeBoardDialog
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
      showTransactionHistory: false,

      showAttachmentDialog: false,
      attachmentUrl: null,
      showNoticeDialog: false
    }
  },
  props: {
    data: Object,
    escrowContract: Object,
    state: String
  },
  emits: ['back', 'refresh', 'success', 'sending-bch', 'updatePageName'],
  watch: {
    sendError (value) {
      console.log('sendError:', value)
    },
    sendingBch (value) {
      this.$emit('sending-bch', value)
    }
  },
  computed: {
    txHistoryData () {
      return {
        appeal: this.appeal,
        transactions: this.data?.transactions
      }
    },
    completedOrder () {
      return ['CNCL', 'RLS', 'RFN'].includes(this.order?.status?.value)
    },
    contractAddress () {
      return this.contract.address
    },
    explorerLink () {
      let url = ''

      if (this.isChipnet) {
        url = 'https://chipnet.imaginary.cash/address/'
      } else {
        url = 'https://blockchair.com/bitcoin-cash/address/'
      }
      return `${url}${this.contractAddress}`
    },
    actionMsg () {
      if (this.selectedAction === 'refund') {
        return 'The fund is refunded to the SELLER'
      } else if (this.selectedAction === 'release') {
        return 'The fund is released to the BUYER'
      } else { return null }
    },
    noticeMessage () {
      return 'Please select an Appeal Action to proceed with the appeal process'
    }
  },
  async mounted () {
    this.loadData()
    this.fetchContractBalance().then((balance) => {
      if (balance === 0 && this.order.status.value === 'APL') {
        const result = this.loadTransactionId(this.order.id)
        if (result.txid) this.setOrderPending(result.action)
      }
    })
  },
  methods: {
    formatDate,
    getDarkModeClass,
    openURL,
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
    checkDragslideStatus () {
      if (!this.selectedAction) {
        this.showNoticeDialog = true
      }
    },
    fetchContractBalance () {
      return new Promise((resolve, reject) => {
        if (!this.escrowContract) return 0
        this.escrowContract?.getBalance(null, true)
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
        await vm.setOrderPending(vm.selectedAction)
      }
      vm.sendingBch = false
      vm.$emit('refresh')
    },
    async setOrderPending (action) {
      const vm = this
      const url = `/ramp-p2p/appeal/${vm.appeal.id}/pending-${action}/`
      await backend.post(url, {}, { authorize: true })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    async releaseBch () {
      const vm = this
      vm.sendError = null
      if (!vm.escrowContract) return
      const arbiterMember = (vm.contract?.members).find(member => { return member.member_type === 'ARBITER' })
      const keypair = wallet.keypair(arbiterMember.address_path)
      let txid = null
      await vm.escrowContract.release(keypair.privateKey, keypair.publicKey, this.order.trade_amount)
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
            vm.showDragSlide = true
          }
        })
        .catch(error => {
          console.error(error)
          vm.sendError = error
          vm.showDragSlide = true
        })
      return txid
    },
    async refundBch () {
      const vm = this
      vm.sendError = null
      if (!vm.escrowContract) return
      const arbiterMember = (vm.contract?.members).find(member => { return member.member_type === 'ARBITER' })
      const privateKey = wallet.privkey(arbiterMember.address_path)
      let txid = null
      await vm.escrowContract.refund(privateKey, this.order.trade_amount)
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
            vm.showDragSlide = true
          }
        })
        .catch(error => {
          console.error(error)
          vm.sendError = error
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
    },
    viewPaymentAttachment (url) {
      this.showAttachmentDialog = true
      this.attachmentUrl = url
    },
    dynamicVal (field) {
      if (field.model_ref === 'order') {
        if (field.field_ref === 'id') {
          return this.order.id
        }
        if (field.field_ref === 'tracking_id') {
          return this.order.tracking_id
        }
      }
    },
    handleRequestError (error) {
      bus.emit('handle-request-error', error)
    }
  }
}
</script>
<style lang="scss" scoped>
.subtext {
  opacity: .5;
}
</style>
