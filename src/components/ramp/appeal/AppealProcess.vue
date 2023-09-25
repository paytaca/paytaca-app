<template>
  <div v-if="isloaded">
    <div v-if="state === 'release-form'">
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

    <div v-if="state === 'completed-appeal'">
      <CompletedAppeal
        :appealInfo="appeal"
        @back="$emit('back')"
      />
    </div>
  </div>
</template>
<script>
import { loadP2PWalletInfo, formatCurrency } from 'src/wallet/ramp'
import RampContract from 'src/wallet/ramp/contract'
import { signMessage } from '../../../wallet/ramp/signature.js'
import CompletedAppeal from './CompletedAppeal.vue'
import ReleaseForm from './ReleaseForm.vue'
import VerifyTransfer from './VerifyTransfer.vue'

export default {
  data () {
    return {
      walletIndex: this.$store.getters['global/getWalletIndex'],
      isChipnet: this.$store.getters['global/isChipnet'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wsURL: process.env.RAMP_WS_URL + 'order/',
      rampContract: null,
      websocket: null,
      wallet: null,
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
    VerifyTransfer,
    CompletedAppeal
  },
  async mounted () {
    const vm = this
    vm.appeal = vm.selectedAppeal
    console.log('appeal:', vm.appeal)
    vm.updateStatus(vm.appeal.order.status)
    if (vm.initWallet) {
      vm.wallet = vm.initWallet
    } else {
      const walletInfo = vm.$store.getters['global/getWallet']('bch')
      vm.wallet = await loadP2PWalletInfo(walletInfo, vm.walletIndex)
    }
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
      // return if this.status == status
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
      console.log('Checking step:', vm.status)
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
          vm.$store.dispatch('ramp/clearOrderTxids', vm.appeal.order.id)
          break
        case 'RFN':
          vm.state = 'completed-appeal'
          vm.$store.dispatch('ramp/clearOrderTxids', vm.appeal.order.id)
          break
        default:
          vm.state = 'release-form'
          break
      }
    },
    async onSubmit (action, amount) {
      const vm = this
      vm.selectedAction = action.toUpperCase()
      const timestamp = Date.now()
      let msg = null
      let url = `${vm.apiURL}/order/${vm.appeal.order.id}/appeal/`
      switch (action) {
        case 'release':
          msg = 'APPEAL_PENDING_RELEASE'
          url = url + 'pending-release'
          break
        case 'refund':
          msg = 'APPEAL_PENDING_REFUND'
          url = url + 'pending-refund'
          break
        default:
          return
      }
      const signature = await signMessage(vm.wallet.privateKeyWif, msg, timestamp)
      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }
      vm.$axios.post(url, {}, { headers: headers })
        .then(response => {
          console.log(response)
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
        this.$store.dispatch('ramp/saveTxid', txidData)
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
      this.verifyTxn('RELEASE')
    },
    async refundBch (contract, amount) {
      this.state = 'verify-transfer'
      this.actionState = 'sending'
      this.verifyTransferKey++
      const result = await contract.refund(this.wallet.privateKeyWif, amount)
      this.saveTxid(result)
      this.actionState = 'verifying'
      this.verifyTransferKey++
      this.verifyTxn('REFUND')
    },
    async verifyTxn (action) {
      const vm = this
      vm.state = 'verifying'
      console.log('Verifying: ', vm.txid)
      let url = `${vm.apiURL}/order/${vm.appeal.order.id}/`
      let msg = ''
      if (action === 'RELEASE') {
        url = `${url}verify-release`
        msg = 'ORDER_RELEASE'
      } else {
        url = `${url}verify-refund`
        msg = 'ORDER_REFUND'
      }
      console.log('url:', url)
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, msg, timestamp)
      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }
      const body = {
        txid: this.txid
      }
      await vm.$axios.post(url, body, { headers: headers })
        .then(response => {
          console.log('response:', response)
        })
        .catch(error => {
          console.error(error.response)
          const errorMsg = error.response.data.error
          vm.errorMessages.push(errorMsg)
        })
    },
    async fetchOrderDetail (id) {
      const vm = this
      const headers = {
        'wallet-hash': vm.wallet.walletHash
      }
      vm.loading = true
      const url = vm.apiURL + '/order/' + id
      try {
        const response = await vm.$axios.get(url, { headers: headers })
        vm.contract = response.data.contract
        vm.fees = response.data.fees
        console.log('order details: ', response)
      } catch (error) {
        console.error(error.response)
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
            // if (data.txid) {
            //   this.txid = data.txid
            // }
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
