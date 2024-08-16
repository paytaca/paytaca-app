<template>
 <div class="q-mx-md">
    <div class="text-center" :class="[state !== 'confirm_payment' ? 'q-mt-lg q-pt-lg' : '', darkMode ? 'text-blue-6' : 'text-blue-8']" style="font-size: 20px;">
      {{ order?.id ? `Order #${order?.id}` : ''}}
    </div>
    <payment-confirmation
      v-if="state === 'confirm_payment'"
      :key="paymentConfirmationKey"
      :order="order"
      :uploading="uploading"
      @upload="uploadAttachment"
      @delete="deleteAttachment"
      @confirm-payment="$emit('confirm-payment')"
      @refetch-order="fetchOrder"/>
    <div v-else class="text-center" style="font-size: 25px;">
      <!-- Order Info -->
      <!-- <div v-if="state === 'await_status'"> -->
        <div class="row justify-center q-mx-md" style="font-size: 25px;">
          {{ statusTitle }}
        </div>
        <div class="row justify-center q-mx-lg" style="font-size: medium; opacity: .7;">
          {{ statusMessage }}
        </div>
      <!-- </div> -->
    </div>
    <div @click="$emit('new-order')" class="text-center q-pt-sm text-weight-medium text-underline" :class=" darkMode ? 'text-blue-6' : 'text-blue-8'" v-if="newOrder" style="font-size: medium;">
      Create Order
    </div>
    <div class="row justify-center q-mx-lg q-mt-md" v-if="state === 'await_status'">
      <q-spinner-hourglass  class="col q-pt-sm" color="blue-6" size="3em"/>
    </div>
  </div>
</template>
<script>
import { WebSocketManager } from 'src/exchange/websocket/manager'
import { getBackendWsUrl, backend } from 'src/exchange/backend'
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
      uploading: false
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
    }
  },
  components: {
    PaymentConfirmation
  },
  async mounted () {
    await this.loadData()
  },
  beforeUnmount () {
    this.websocketManager.closeConnection()
  },
  methods: {
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
          console.log('orders: ', vm.order)
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
    checkStatus (status) {
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
        case 'APL':
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
          break
        }
        case 'CNCL':
        case 'RFN':
        case 'RFN_PN':
          this.state = 'completed'
          this.statusTitle = 'Transaction Failed'
          this.statusMessage = 'We\'re unable to fulfill this transaction \n Please try again with a new order'
          this.newOrder = true
      }
    },
    async deleteAttachment (attachmentId) {
      console.log('onDeleteAttachment')
      await backend.post(
        '/ramp-p2p/order/payment/attachment/delete', { attachment_id: attachmentId }, { authorize: true })
        .then(response => {
          console.log(response)
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
          console.log(response)
          this.fetchOrder()
          // refetch order
          // this.attachment.url = response.data.image?.url
        })
        .catch(error => {
          console.error(error.response || error)
        })
      this.uploading = false
    }
  }
}
</script>
