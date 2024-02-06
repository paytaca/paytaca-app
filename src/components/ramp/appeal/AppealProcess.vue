<template>
  <div v-if="isloaded">
    <div v-if="escrowContract && (state === 'release-form' || state === 'completed-appeal')">
      <AppealDetail
        :key="appealDetailKey"
        :data="appealDetailData"
        :escrowContract="escrowContract"
        :initstate="state"
        @back="$emit('back')"
        @success="onSendSuccess"
        @refresh="refreshData"
      />
    </div>

    <div v-if="escrowContract && state === 'tx-transfer'">
      <VerifyTransfer
        :key="verifyTransferKey"
        :escrowContract="escrowContract"
        :orderId="appeal?.order?.id"
        :txid="txid"
        :action="selectedAction"
        @back="$emit('back')"
      />
    </div>

    <!-- <div v-if="state === 'completed-appeal'">
      <CompletedAppeal
        :appeal="appeal"
        :order="appeal.order"
        @back="$emit('back')"
      />
    </div> -->
  </div>
</template>
<script>
import RampContract from 'src/wallet/ramp/contract'
import AppealDetail from './AppealDetail.vue'
import VerifyTransfer from './AppealTransfer.vue'
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/wallet/ramp/backend'

export default {
  data () {
    return {
      isChipnet: this.$store.getters['global/isChipnet'],
      wsURL: process.env.RAMP_WS_URL + 'order/',
      wallet: this.$store.getters['ramp/wallet'],
      websocket: null,
      state: 'release-form',
      actionState: 'verifying',
      appeal: null,
      contract: null,
      fees: null,
      status: null,
      isloaded: false,
      selectedAction: null,
      errorMessages: [],
      verifyTransferKey: 0,
      appealDetailKey: 0,

      appealDetailData: null,
      escrowContract: null,
      txid: null,
      amount: 0
    }
  },
  props: {
    selectedAppeal: Object,
    initWallet: Object
  },
  emits: ['back'],
  components: {
    AppealDetail,
    VerifyTransfer
  },
  async mounted () {
    this.loadData()
    this.setupWebsocket()
    this.isloaded = true
  },
  beforeUnmount () {
    this.closeWSConnection()
  },
  methods: {
    onSendSuccess (txid) {
      this.txid = txid
    },
    refreshData () {
      this.loadData()
    },
    loadData () {
      this.appeal = this.selectedAppeal
      this.fetchAppeal()
        .then(() => { this.generateContract() })
        .then(this.reloadChildComponents())
    },
    reloadChildComponents () {
      this.appealDetailKey++
      this.verifyTransferKey++
    },
    fetchAppeal (done) {
      const vm = this
      return new Promise((resolve, reject) => {
        backend.get(`/ramp-p2p/order/${vm.appeal?.order?.id}/appeal`, { authorize: true })
          .then(response => {
            vm.appeal = response.data.appeal
            vm.contract = response.data.contract
            vm.fees = response.data.fees
            vm.appealDetailData = response.data
            vm.updateStatus(response.data.order?.status)
            vm.loading = false
            if (done) done()
            resolve(response.data)
          })
          .catch(error => {
            console.error(error.response)
            if (error.response && error.response.status === 403) {
              bus.emit('session-expired')
            }
            this.loading = false
            if (done) done()
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
      if (this.status && status && this.status.value === status.value) return
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
          vm.state = 'release-form'
          break
        case 'RFN_PN':
          vm.state = 'tx-transfer'
          break
        case 'RLS_PN':
          vm.state = 'tx-transfer'
          break
        case 'RLS':
          vm.state = 'completed-appeal'
          vm.$store.commit('ramp/clearOrderTxids', vm.appeal.order.id)
          break
        case 'RFN':
          vm.state = 'completed-appeal'
          vm.$store.commit('ramp/clearOrderTxids', vm.appeal.order.id)
          break
        default:
          vm.state = 'release-form'
          break
      }
    },
    fetchOrder (orderId) {
      const vm = this
      return new Promise((resolve, reject) => {
        vm.loading = true
        backend.get(`/ramp-p2p/order/${orderId}`, { authorize: true })
          .then(response => {
            console.log(response.data)
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
            }
            reject(error)
          })
      })
    },
    fetchContract (orderId) {
      return new Promise((resolve, reject) => {
        const vm = this
        const url = '/ramp-p2p/order/contract'
        backend.get(url, { params: { order_id: orderId }, authorize: true })
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
            }
            reject(error)
          })
      })
    },
    setupWebsocket () {
      const wsUrl = `${this.wsURL}${this.appeal.order.id}/`
      this.websocket = new WebSocket(wsUrl)
      this.websocket.onopen = () => {
        console.log('WebSocket connection established to ' + wsUrl)
      }
      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('WebSocket data:', data)
        if (data) {
          if (data.success) {
            // if (data.status) {
            //   this.updateStatus(data.status.status)
            // }
            this.fetchAppeal().then(this.reloadChildComponents())
          } else if (data.error) {
            this.errorMessages.push(data.error)
            this.verifyTransferKey++
          } else if (data.errors) {
            this.errorMessages.push(...data.errors)
            this.verifyTransferKey++
          }
        }
      }
      this.websocket.onclose = () => {
        console.log('WebSocket connection closed.')
      }
    },
    closeWSConnection () {
      if (this.websocket) {
        this.websocket.close()
      }
    }
  }
}
</script>
