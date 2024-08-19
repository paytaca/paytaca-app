<template>
 <div class="q-mx-md" v-if="!confirmCancel">
    <div class="text-center" :class="[state !== 'confirm_payment' ? 'q-mt-md q-pt-lg' : '', darkMode ? 'text-blue-6' : 'text-blue-8']" style="font-size: 20px;">
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
    <div class="row justify-center q-mx-lg q-mt-xs" v-if="state === 'await_status'">
      <q-spinner-hourglass  class="col q-pt-sm" color="blue-6" size="3em"/>
    </div>
    <div v-if="hasCancel" class="row justify-center q-pt-md">
      <q-btn rounded outline dense label="Cancel" color="primary" class="q-px-lg" @click="confirmCancel = true"/>
    </div>
  </div>
  <div v-if="confirmCancel">
    <div class="row justify-center q-mx-md q-mt-lg q-pt-lg" style="font-size: 25px;">
      Cancel this Order?
    </div>
    <div class="row q-pt-sm q-mx-lg q-px-lg">
      <q-btn outline rounded class="col q-mr-xs" label="Cancel" color="red" @click="confirmCancel = false"/>
      <q-btn outline rounded class="col q-ml-xs" label="Confirm" color="blue" @click="cancelOrder"/>
    </div>
  </div>
  <div v-if="state !== 'confirm_payment'" class="text-center row q-mx-lg" style="position: fixed; bottom: 40px; left: 0; right: 0; margin: auto;">
    <div class="col" style="opacity: .55;">
      <div class="row justify-center text-bow" style="font-size: medium;">Powered by</div>
      <div class="row justify-center text-weight-bold" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 23px;">P2P Exchange</div>
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
      confirmCancel: false,
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
    },
    hasCancel () {
      const stat = ['SBM', 'CNF', 'ESCRW_PN', 'PD_PN']
      return stat.includes(this.order?.status.value)
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
          this.statusMessage = 'We\'re unable to fulfill this transaction. Please try again.'
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
    },
    cancelOrder () {
      const vm = this
      const url = `/ramp-p2p/order/${vm.order.id}/cancel`
      backend.post(url, {}, { authorize: true })
        .then(response => {
          if (response.data && response.data.status.value === 'CNCL') {
            vm.status = response.data.status.value
            this.checkStatus()
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
