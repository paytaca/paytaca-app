<template>
 <!-- <div class="q-mx-md" v-if="!confirmCancel"> -->
    <div class="text-center" :class="[state !== 'confirm_payment' ? 'q-mt-md q-pt-lg' : '', darkMode ? 'text-blue-6' : 'text-blue-8']" style="font-size: 20px;">
      {{ order?.id ? `Order #${order?.id}` : ''}}
    </div>
    <payment-confirmation v-if="state === 'confirm_payment'"
      :key="paymentConfirmationKey"
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
    </div>
    <div v-if="state === 'cancel_order'">
      <!-- <div v-if="confirmCancel || confirmAppeal"> -->
        <div class="row justify-center q-mx-md q-mt-sm" style="font-size: 25px;">
          Cancel this Order?
        </div>
        <div class="row q-pt-sm q-mx-lg q-px-lg">
          <q-btn v-if="confirmCancel || confirmAppeal" outline rounded class="col q-mr-xs" label="Cancel" color="red" @click="state = 'await_status'"/>
          <q-btn v-if="confirmCancel" outline rounded class="col q-ml-xs" label="Confirm" color="blue" @click="cancelOrder"/>
          <q-btn v-if="confirmAppeal" outline rounded class="col q-ml-xs" label="Confirm" color="blue" @click="appealOrder"/>
        </div>
      <!-- </div> -->
    </div>
    <div @click="$emit('new-order')" class="text-center q-pt-sm text-weight-medium text-underline" :class=" darkMode ? 'text-blue-6' : 'text-blue-8'" v-if="newOrder" style="font-size: medium;">
      Create Order
    </div>
    <div class="row justify-center q-mx-lg q-mt-xs" v-if="state === 'await_status'">
      <q-spinner-hourglass  class="col q-pt-sm" color="blue-6" size="3em"/>
    </div>
  <!-- </div> -->
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
import PaymentConfirmation from './payment-confirmation.vue'

export default {
  data () {
    return {
      state: 'await_status',
      statusTitle: 'Processing transaction',
      statusMessage: 'Please wait a moment',
      websocket: null,
      status: null,
      paymentConfirmationKey: 0,
      order: null,
      newOrder: false,
      confirmCancel: false,
      confirmAppeal: false,
      uploading: false,
      txid: null,
      appealReasons: ['Cash-in buyer change of mind'],
      appeal: null
    }
  },
  emits: ['confirm-payment', 'new-order'],
  props: {
    orderId: Number
  },
  watch: {
    status (val) {
      this.checkStatus(val)
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    hasCancel () {
      const stat = ['SBM', 'CNF', 'ESCRW_PN', 'PD_PN']
      return stat.includes(this.status)
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
  components: {
    PaymentConfirmation
  },
  async mounted () {
    await this.loadData()
    // this.getContract()
  },
  beforeUnmount () {
    this.websocketManager.closeConnection()
  },
  methods: {
    getDarkModeClass,
    async loadData () {
      await this.fetchOrder()
      const url = `${getBackendWsUrl()}order/${this.orderId}/`
      this.websocketManager = new WebSocketManager()
      this.websocketManager.setWebSocketUrl(url)
      this.websocketManager.subscribeToMessages((message) => {
        if (message.status) {
          this.status = message?.status?.status?.value
        }
      })
    },
    async fetchOrder () {
      const vm = this
      await backend.get(`/ramp-p2p/order/${vm.orderId}`, { authorize: true })
        .then(response => {
          vm.order = response.data
          vm.status = vm.order?.status?.value
        })
        .catch(error => {
          console.error(error.response)
          if (error.response) {
            if (error.response.status === 403) {
              // bus.emit('session-expired')
            }
          } else {
            bus.emit('network-error')
          }
        })
    },
    async checkStatus (status) {
      if (status === 'ESCRW') {
        this.paymentConfirmationKey++
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
          const amount = Number(Number(this.order?.crypto_amount).toFixed(8))
          this.statusMessage = `${amount} BCH has been sent to you`
          this.order?.transactions?.forEach((tx) => {
            if (tx.action === 'RELEASE') {
              this.txid = tx.txid
            }
          })
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
    async deleteAttachment (attachmentId) {
      await backend.post(
        '/ramp-p2p/order/payment/attachment/delete', { attachment_id: attachmentId }, { authorize: true })
        .then(response => {
          this.fetchOrder()
        })
        .catch(error => {
          console.error(error.response || error)
        })
    },
    async uploadAttachment (data) {
      this.uploading = true
      await backend.post(
        '/ramp-p2p/order/payment/attachment/upload',
        data, { headers: { 'Content-Type': 'multipart/form-data' }, authorize: true })
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
    async fetchAppeal () {
      const vm = this
      const url = `/ramp-p2p/order/${vm.order.id}/appeal`
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
    appealOrder () {
      const vm = this
      const url = `/ramp-p2p/order/${vm.order.id}/appeal`
      const data = {
        type: 'RFN',
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
      const url = `/ramp-p2p/order/${vm.order.id}/cancel`
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
    }
  }
}
</script>
