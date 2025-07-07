<template>
  <div class="text-center" :class="[state !== 'confirm_payment' ? 'q-mt-md q-pt-lg' : '', darkMode ? 'text-blue-6' : 'text-blue-8']" style="font-size: 20px;">
    {{ order?.id ? `Order #${order?.id}` : ''}}
  </div>
  <CashinConfirmPayment ref="cashinConfirmPaymentRef" v-if="state === 'confirm_payment'"
    :key="confirmPaymentKey"
    :order="order"
    :uploading="uploading"
    @upload="uploadAttachment"
    @delete="deleteAttachment"
    @confirm-payment="$emit('confirm-payment')"
    @refetch-order="fetchOrder"
    @appeal="onConfirmAppeal"/>
  <div v-if="state === 'await_status' || state == 'completed'" class="q-mx-md text-center" style="font-size: 25px;">
    <!-- Order Info -->
    <div class="row justify-center q-mx-md" style="font-size: 25px;">
      {{ statusTitle }}
    </div>
    <div class="row justify-center q-mx-lg q-px-sm" style="font-size: medium; opacity: .7;">
      {{ statusMessage }}
    </div>
    <div v-if="txid" class="text-center">
      <a
        style="text-decoration: none; font-size: medium;"
        class="button button-text-primary"
        :class="getDarkModeClass(darkMode)"
        :href="explorerLink"
      >
        {{ $t('ViewInExplorer') }}
      </a>
    </div>
    <div v-if="hasCancel" class="row justify-center q-pt-md">
      <q-btn rounded outline dense label="Cancel" color="primary" class="q-px-lg" @click="onConfirmCancel"/>
    </div>
    <div class="row justify-center" v-if="hasAppeal">
      <q-btn
        flat
        no-caps
        :disable="countDown !== ''"
        :label="appealBtnLabel"
        color="blue-6"
        @click="state = 'appeal_order'"
      />
    </div>
  </div>
  <div v-if="state === 'cancel_order'">
      <div class="row justify-center q-mx-md q-mt-sm" style="font-size: 25px;">
        Cancel this Order?
      </div>
      <div class="row q-pt-sm q-mx-lg q-px-lg">
        <q-btn v-if="confirmCancel || confirmAppeal" :disable="loadConfirmCancel || loadConfirmAppeal" outline rounded class="col q-mr-xs" label="Cancel" color="red" @click="onDismissCancel"/>
        <q-btn :loading="loadConfirmCancel" :disable="loadConfirmCancel" v-if="confirmCancel" outline rounded class="col q-ml-xs" label="Confirm" color="blue" @click="cancelOrder"/>
        <q-btn :loading="loadConfirmAppeal" :disable="loadConfirmAppeal" v-if="confirmAppeal" outline rounded class="col q-ml-xs" label="Confirm" color="blue" @click="appealOrder()"/>
      </div>
    <!-- </div> -->
  </div>
  <div v-if="state === 'appeal_order'">
    <div class="row justify-center q-mx-md q-mt-xs" style="font-size: 20px;">
      Appeal Order
    </div>
    <div :class="darkMode ? 'text-grey-5' : 'text-grey-8'" class="row justify-center q-mx-md q-mt-xs" style="font-size: 16px;">
      Select Reason for Appeal
    </div>
    <div class="row justify-center q-gutter-sm q-pt-sm q-px-lg">
      <q-badge
        class="q-pa-sm"
        rounded
        :color="darkMode ? 'blue-grey-5' : 'blue-grey-6'"
        :outline="!(selectedReasons.includes(reason))"
        @click="updateAppealReasons(reason)"
        v-for="reason in reasonOpts" :key="reason" >
          {{ reason }}
      </q-badge>
    </div>
    <div class="row justify-center q-pt-md">
      <q-btn
        :disable="loadAppeal"
        flat
        label="Cancel"
        :color="darkMode ? 'grey-5' : 'grey-6'"
        size="md"
        @click="state = 'await_status'"
      />
      <q-btn
        :loading="loadAppeal"
        flat
        label="Continue"
        color="red-6"
        size="md"
        :disable="selectedReasons.length === 0 || loadAppeal"
        @click="appealOrder('RLS')"
      />
    </div>
  </div>
  <div @click="$emit('new-order')" class="text-center q-pt-sm text-weight-medium text-underline" :class=" darkMode ? 'text-blue-6' : 'text-blue-8'" v-if="newOrder" style="font-size: medium;">
    Create Order
  </div>
  <div class="row justify-center q-mx-lg q-mt-xs" v-if="state === 'await_status'">
    <q-spinner-hourglass  class="col q-pt-sm" color="blue-6" size="3em"/>
  </div>
  <div v-if="state !== 'confirm_payment'" class="text-center row q-mx-lg" style="position: fixed; bottom: 40px; left: 0; right: 0; margin: auto;">
    <div class="col" style="opacity: .55;">
      <div class="row justify-center text-bow" style="font-size: 15px;">Powered by</div>
      <div class="row justify-center text-weight-bold" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">P2P Exchange</div>
    </div>
  </div>
</template>
<script>
import { WebSocketManager } from 'src/exchange/websocket/manager'
import { getBackendWsUrl, backend } from 'src/exchange/backend'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus'
import CashinConfirmPayment from './CashinConfirmPayment.vue'
import { satoshiToBch } from 'src/exchange'
import { processCashinPoints } from 'src/utils/engagementhub-utils/rewards'

export default {
  components: {
    CashinConfirmPayment
  },
  data () {
    return {
      websocketManager: null,
      state: 'await_status',
      statusTitle: 'Processing',
      statusMessage: 'Please wait a moment',
      websocket: null,
      status: null,
      confirmPaymentKey: 0,
      order: null,
      newOrder: false,
      confirmCancel: false,
      confirmAppeal: false,
      uploading: false,
      txid: null,
      appealReasons: ['Cash-in buyer change of mind'],
      appeal: null,
      appealForm: false,
      countDown: null,
      selectedReasons: [],
      reasonOpts: [
        this.$t('AppealFormReasonOpt1Seller'),
        this.$t('AppealFormReasonOpt2')
      ],
      loadConfirmAppeal: false,
      loadConfirmCancel: false,
      loadAppeal: false
    }
  },
  emits: ['confirm-payment', 'new-order', 'refetch-cashin-alert'],
  props: {
    orderId: Number
  },
  watch: {
    status (val) {
      this.appealCountdown()
      this.checkStatus(val)
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    hasCancel () {
      const stat = ['SBM', 'CNF', 'ESCRW_PN']
      return stat.includes(this.status)
    },
    hasAppeal () {
      const stat = ['PD_PN']
      return this.countDown !== null && stat.includes(this.status)
    },
    appealBtnLabel () {
      if (this.countDown) return this.$t('AppealableInSeconds', { countdown: this.countDown }, `Appealable in ${this.countDown}`)
      return this.$t('SubmitAnAppeal')
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    explorerLink () {
      let url = 'https://blockchair.com/bitcoin-cash/transaction/'

      // if (this.transaction.asset.id.split('/')[0] === 'ct') {
      //   url = 'https://explorer.bitcoinunlimited.info/tx/'
      // }

      if (this.isChipnet) {
        url = 'https://chipnet.imaginary.cash/tx/'
      }
      return `${url}${this.txid}`
    }
  },
  async mounted () {
    await this.loadData()
  },
  beforeUnmount () {
    this.websocketManager?.closeConnection()
  },
  methods: {
    getDarkModeClass,
    async readOrderStatus () {
      if (!this.orderId) return
      await backend.patch(`/ramp-p2p/order/${this.orderId}/status/`, null, { authorize: true })
        .then(response => {
          this.$emit('refetch-cashin-alert')
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    appealCountdown () {
      const vm = this
      if (vm.order?.appealable_at) {
        const appealableDate = new Date(vm.order?.appealable_at)
        vm.timer = setInterval(function () {
          const now = new Date().getTime()
          const distance = appealableDate - now

          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((distance % (1000 * 60)) / 1000)

          if (hours > 0) vm.countDown = `${hours} hour(s)`
          else if (minutes > 0) vm.countDown = `${minutes} minute(s)`
          else if (seconds > 0) vm.countDown = `${seconds} second(s)`

          if (distance < 0) {
            clearInterval(vm.timer)
            vm.countDown = ''
          }
        }, 1000)
      }
    },
    updateAppealReasons (reason) {
      if (this.selectedReasons.includes(reason)) {
        const index = this.selectedReasons.indexOf(reason)
        if (index > -1) {
          this.selectedReasons.splice(index, 1)
        }
      } else {
        this.selectedReasons.push(reason)
      }
    },
    async loadData () {
      await this.fetchOrder()
      this.readOrderStatus()
      this.appealCountdown()
      this.setupWebSocket()
    },
    setupWebSocket () {
      this.websocketManager?.closeConnection()
      const url = `${getBackendWsUrl()}order/${this.orderId}/`
      this.websocketManager = new WebSocketManager()
      this.websocketManager.setWebSocketUrl(url)
      this.websocketManager.subscribeToMessages((message) => {
        if (message.status) {
          this.status = message?.status?.status?.value
          if (this.status === 'RLS') {
            this.txid = message?.txdata?.txid
          }
          this.readOrderStatus()
        }
      })
    },
    async fetchOrder () {
      const vm = this
      await backend.get(`/ramp-p2p/order/${vm.orderId}/`, { authorize: true })
        .then(response => {
          vm.order = response.data
          vm.status = vm.order?.status?.value
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
    },
    async checkStatus (status) {
      if (status === 'ESCRW') {
        this.confirmPaymentKey++
      }
      switch (status) {
        case 'SBM':
        case 'CNF':
        case 'ESCRW_PN':
          this.state = 'await_status'
          this.statusTitle = 'Escrowing Funds'
          break
        case 'PD_PN':
        case 'PD':
        case 'RLS_PN':
          this.state = 'await_status'
          this.statusTitle = 'Releasing Funds'
          break
        case 'ESCRW':
          this.state = 'confirm_payment'
          break
        case 'RLS': {
          this.state = 'completed'
          this.statusTitle = 'Funds Released!'
          const amount = satoshiToBch(this.order?.trade_amount)
          this.statusMessage = `${amount} BCH has been sent to you`
          this.order?.transactions?.forEach((tx) => {
            if (tx.action === 'RELEASE') {
              this.txid = tx.txid
            }
          })

          // call API from engagement hub to compute user points
          // for cash-in transaction (for 1st time transaction only)
          try {
            const bchAddress = this.order?.members?.buyer?.address
            await processCashinPoints({ bch_address: bchAddress })
          } catch (_error) {
            console.log('Unable to process user points')
          }
          break
        }
        case 'APL':
          await this.fetchAppeal()
          if (this.appeal?.type?.value === 'RLS') {
            this.state = 'await_status'
            this.statusTitle = 'Processing Release Appeal'
            this.statusMessage = 'This may take a few moments'
          } else if (this.appeal?.type?.value === 'RFN') {
            this.state = 'completed'
            this.statusTitle = 'Order Canceled'
            this.statusMessage = 'The escrowed BCH will be refunded to the seller'
          }
          break
        case 'CNCL':
          this.state = 'completed'
          this.statusTitle = 'Order Canceled'
          this.statusMessage = ''
          this.newOrder = true
          break
        case 'RFN':
          this.state = 'completed'
          this.statusTitle = 'Order Canceled'
          this.statusMessage = 'Escrowed BCH was refunded to the seller'
          break
        case 'RFN_PN':
          this.state = 'completed'
          this.statusTitle = 'Order Canceled'
          this.statusMessage = 'The escrowed BCH will be refunded to the seller'
          this.newOrder = true
      }
    },
    async deleteAttachment (orderPaymentId) {
      await backend.delete(
        `/ramp-p2p/order/payment/${orderPaymentId}/attachment/`, { authorize: true })
        .then(response => {
          this.fetchOrder()
        })
        .catch(error => {
          console.error(error.response || error)
        })
    },
    async uploadAttachment (formdata, orderPaymentId) {
      this.uploading = true
      await backend.post(
        `/ramp-p2p/order/payment/${orderPaymentId}/attachment/`,
        formdata, { headers: { 'Content-Type': 'multipart/form-data' }, authorize: true })
        .then(response => {
          this.fetchOrder()
        })
        .catch(error => {
          console.error(error.response || error)
        })
      this.uploading = false
    },
    onConfirmAppeal () {
      this.state = 'cancel_order'
      this.confirmAppeal = true
    },
    onConfirmCancel () {
      this.state = 'cancel_order'
      this.confirmCancel = true
    },
    onDismissCancel () {
      if (this.confirmAppeal) {
        this.state = 'confirm_payment'
      } else {
        this.state = 'await_status'
      }
      this.confirmAppeal = false
      this.confirmCancel = false
    },
    async fetchAppeal () {
      const vm = this
      const url = `/ramp-p2p/order/${vm.order.id}/appeal/`
      await backend.get(url, { authorize: true })
        .then(response => {
          this.appeal = response.data.appeal
        })
        .catch(error => {
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              // bus.emit('session-expired')
            }
          } else {
            console.error(error)
            bus.emit('network-error')
          }
        })
    },
    appealOrder (type = 'RFN') {
      if (type === 'RFN') {
        this.loadConfirmAppeal = true
      }

      if (type === 'RLS') {
        this.appealReasons = this.selectedReasons
        this.loadAppeal = true
      }
      const vm = this
      const url = '/ramp-p2p/appeal/'
      const data = {
        order_id: vm.order.id,
        type: type,
        reasons: this.appealReasons
      }
      backend.post(url, data, { authorize: true })
        .then(response => {
          vm.status = response.data.status.value
          this.checkStatus()
        })
        .catch(error => {
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              // bus.emit('session-expired')
            }
          } else {
            console.error(error)
            bus.emit('network-error')
          }
        })
        .finally(() => {
          this.confirmAppeal = false
        })
    },
    cancelOrder () {
      const vm = this
      vm.loadConfirmCancel = true
      const url = `/ramp-p2p/order/${vm.order.id}/cancel/`
      backend.post(url, {}, { authorize: true })
        .then(response => {
          if (response.data.status?.value === 'CNCL') {
            vm.status = response.data.status?.value
            this.confirmCancel = false
          }
        })
        .catch(error => {
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              // bus.emit('session-expired')
            }
          } else {
            console.error(error)
            bus.emit('network-error')
          }
        })
    },
    handleError (error) {
      console.error(error.response || error)
      if (error.response) {
        if (error.response.status === 403) {
          bus.emit('session-expired')
        }
      } else {
        bus.emit('network-error')
      }
    }
  }
}
</script>
