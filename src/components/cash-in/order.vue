<template>
 <div class="q-mx-md">
    <div class="text-center" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">
      {{ order?.id ? `Order #${order?.id}` : ''}}
    </div>
    <payment-confirmation :key="paymentConfirmationKey" v-if="state === 'confirm_payment'" :order="order" @confirm-payment="$emit('confirm-payment')"/>
    <div v-else class="text-center" style="margin-top: 60px; font-size: 25px;">
      <div class="row justify-center q-mx-md">
        {{ statusTitle }}
      </div>
      <div class="row justify-center q-mx-lg">
        {{ statusMessage }}
      </div>
    </div>
    <q-spinner-dots v-if="state === 'await_status'" class="q-pt-sm" color="blue-6" size="3em"/>
  </div>
</template>
<script>
import { WebSocketManager } from 'src/exchange/websocket/manager'
import { getBackendWsUrl, backend } from 'src/exchange/backend'
import PaymentConfirmation from './payment-confirmation.vue'

export default {
  data () {
    return {
      state: 'await_status',
      statusTitle: 'Processing transaction',
      statusMessage: 'Please wait',
      websocket: null,
      status: null,
      paymentConfirmationKey: 0,
      order: null
    }
  },
  emits: ['confirm-payment'],
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
        })
        .catch(error => {
          console.error(error.response)
          if (error.response) {
            if (error.response.status === 403) {
              // bus.emit('session-expired')
            }
          } else {
            // bus.emit('network-error')
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
          this.state = 'await_status'
          this.statusTitle = 'Releasing Funds'
          break
        case 'ESCRW':
          this.state = 'confirm_payment'
          break
        case 'RLS': {
          this.state = 'released'
          this.statusTitle = 'Funds Released!'
          const amount = Number(Number(this.order?.crypto_amount).toFixed(8))
          this.statusMessage = `${amount} BCH has been sent to you`
          break
        }
      }
    }
  }
}
</script>
