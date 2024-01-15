<template>
  <div v-if="isloaded">
    <div v-if="state === 'release-form' || state === 'completed-appeal'">
      <ReleaseForm
        :appealInfo="appeal"
        :ramp-contract="rampContract"
        @back="$emit('back')"
        @submit="onSubmit"
      />
    </div>

    <div v-if="state === 'verify-transfer'">
      <VerifyTransfer
        :key="verifyTransferKey"
        :order-id="appeal.order.id"
        :wallet="wallet"
        :action="selectedAction"
        :ramp-contract="rampContract"
        :init-state="actionState"
        :txid="txid"
        :errors="errorMessages"
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
import ReleaseForm from './AppealDetail.vue'
import VerifyTransfer from './VerifyTransfer.vue'
import { bus } from 'src/wallet/event-bus.js'

export default {
  data () {
    return {
      isChipnet: this.$store.getters['global/isChipnet'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wsURL: process.env.RAMP_WS_URL + 'order/',
      authHeaders: this.$store.getters['ramp/authHeaders'],
      wallet: this.$store.getters['ramp/wallet'],
      rampContract: null,
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
      txid: null
    }
  },
  props: {
    selectedAppeal: Object,
    initWallet: Object
  },
  emits: ['back'],
  components: {
    ReleaseForm,
    VerifyTransfer
  },
  async mounted () {
    const vm = this
    vm.appeal = vm.selectedAppeal
    vm.updateStatus(vm.appeal.order.status)
    await vm.fetchOrderDetail(vm.appeal.order.id)
    await vm.generateContract()
    vm.isloaded = true
    vm.setupWebsocket()
  },
  beforeUnmount () {
    this.closeWSConnection()
  },
  methods: {
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
          vm.state = 'verify-transfer'
          break
        case 'RLS_PN':
          vm.state = 'verify-transfer'
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
    async onSubmit (action, amount) {
      const vm = this
      vm.selectedAction = action.toUpperCase()
      let url = `${vm.apiURL}/order/${vm.appeal.order.id}/appeal/`
      switch (action) {
        case 'release':
          url = url + 'pending-release'
          break
        case 'refund':
          url = url + 'pending-refund'
          break
        default:
          return
      }
      vm.$axios.post(url, {}, { headers: vm.authHeaders })
        .then(response => {
          switch (action) {
            case 'release':
              vm.releaseBch(vm.rampContract, amount)
              break
            case 'refund':
              vm.refundBch(vm.rampContract, amount)
              break
          }
        })
        .catch(error => {
          console.error(error.response)
          if (error.response && error.response.status === 403) {
            bus.emit('session-expired')
          }
        })
    },
    saveTxid (result) {
      if (result.success) {
        this.txid = result.txInfo.txid
        const txidData = {
          id: this.appeal.order.id,
          txidInfo: {
            action: 'REFUND',
            txid: this.txid
          }
        }
        this.$store.commit('ramp/saveTxid', txidData)
      }
    },
    async releaseBch (contract, amount) {
      this.state = 'verify-transfer'
      this.actionState = 'sending'
      this.verifyTransferKey++
      const result = await contract.release(this.wallet.privateKeyWif, amount)
      this.saveTxid(result)
      this.actionState = 'verifying'
      this.verifyTransferKey++
      // this.verifyTxn('RELEASE')
    },
    async refundBch (contract, amount) {
      this.state = 'verify-transfer'
      this.actionState = 'sending'
      this.verifyTransferKey++
      const result = await contract.refund(this.wallet.privateKeyWif, amount)
      this.saveTxid(result)
      this.actionState = 'verifying'
      this.verifyTransferKey++
      // this.verifyTxn('REFUND')
    },
    async verifyTxn (action) {
      const vm = this
      vm.state = 'verifying'
      let url = `${vm.apiURL}/order/${vm.appeal.order.id}/`
      if (action === 'RELEASE') {
        url = `${url}verify-release`
      } else {
        url = `${url}verify-refund`
      }
      await vm.$axios.post(url, { txid: this.txid }, { headers: vm.authHeaders })
        .catch(error => {
          console.error(error.response)
          if (error.response && error.response.status === 403) {
            bus.emit('session-expired')
          }
          const errorMsg = error.response.data.error
          vm.errorMessages.push(errorMsg)
        })
    },
    async fetchOrderDetail (id) {
      const vm = this
      vm.loading = true
      const url = vm.apiURL + '/order/' + id
      try {
        const response = await vm.$axios.get(url, { headers: vm.authHeaders })
        vm.contract = response.data.contract
        vm.fees = response.data.fees
      } catch (error) {
        console.error(error.response)
        if (error.response && error.response.status === 403) {
          bus.emit('session-expired')
        }
      }
    },
    async generateContract () {
      if (!this.contract || !this.fees) return
      const publicKeys = {
        arbiter: this.contract.arbiter.public_key,
        seller: this.contract.seller.public_key,
        buyer: this.contract.buyer.public_key,
        servicer: this.contract.servicer.public_key
      }
      const addresses = {
        arbiter: this.contract.arbiter.address,
        seller: this.contract.seller.address,
        buyer: this.contract.buyer.address,
        servicer: this.contract.servicer.address
      }
      const fees = {
        arbitrationFee: this.fees.fees.arbitration_fee,
        serviceFee: this.fees.fees.service_fee,
        contractFee: this.fees.fees.hardcoded_fee
      }
      const timestamp = this.contract.timestamp
      this.rampContract = new RampContract(publicKeys, fees, addresses, timestamp, this.isChipnet)
      await this.rampContract.initialize()
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
            if (data.status) {
              this.updateStatus(data.status.status)
            }
            // if (data.contract_address) {
            //   if (this.contract) {
            //     this.contract.address = data.contract_address
            //   } else {
            //     this.contract = {
            //       address: data.contract_address
            //     }
            //   }
            //   // console.log('contract:', this.contract)
            //   this.escrowTransferProcessKey++
            // }
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
