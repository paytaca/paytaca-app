<template>
  <div>
    <q-btn
      flat
      padding="md"
      icon="arrow_back"
      @click="$emit('back')"
    />
    </div>
  <!-- Progress Loader -->
  <div v-if="!isloaded">
    <div class="row justify-center q-py-lg" style="margin-top: 50px">
      <ProgressLoader/>
    </div>
  </div>

  <!-- Order Process Pages -->
  <div v-if="isloaded">
    <!-- Ad Owner Confirm / Decline -->
    <ReceiveOrder
      v-if="state === 'order-confirm-decline'"
      :order-data="order"
      :ad-data="ad"
      @confirm="confirmingOrder"
      @cancel="cancellingOrder"
    />
    <EscrowTransferProcess
      v-if="state === 'escrow-bch'"
      :key="escrowTransferProcessKey"
      :action="state"
      :wallet="wallet"
      :order="order"
      :contract="contract"
      :amount="transferAmount"
      @back="onBack"
      @success="onEscrowSuccess"
    />
    <VerifyEscrowTx
      v-if="state === 'tx-confirmation'"
      :key="verifyEscrowTxKey"
      :wallet="wallet"
      :order-id="order.id"
      :action="verifyAction"
      :txid="txid"
      :errors="errorMessages"
      :ramp-contract="rampContract"
      @back="onBack"
      @success="onVerifyTxSuccess"
    />
    <!-- Waiting Page -->
    <div v-if="state === 'standby-view'" class="q-px-lg">
      <StandByDisplay
        :wallet="wallet"
        :order-id="order.id"
        :feedback-data="feedback"
        :key="standByDisplayKey"
        @send-feedback="sendFeedback"
        @submit-appeal="submitAppeal"
      />
    </div>

    <!-- Payment Confirmation -->
    <div v-if="state === 'payment-confirmation'">
      <PaymentConfirmation
        :wallet="wallet"
        :order-id="order.id"
        :type="confirmType"
        @confirm="handleConfirmPayment"
      />
    </div>
  </div>

  <!-- Completed transaction -->
  <div v-if="state === 'completed'">
    Completed Page
  </div>

  <!-- Dialogs -->
  <div v-if="openDialog" >
    <MiscDialogs
      :type="'genericDialog'"
      :title="title"
      :text="text"
      v-on:back="openDialog = false"
      v-on:submit="handleDialogResponse()"
    />
  </div>
</template>
<script>
import { loadP2PWalletInfo, formatCurrency } from 'src/wallet/ramp'
import { signMessage } from '../../../wallet/ramp/signature.js'
import RampContract from 'src/wallet/ramp/contract'

import ProgressLoader from 'src/components/ProgressLoader.vue'
import ReceiveOrder from './ReceiveOrder.vue'
import EscrowTransferProcess from './EscrowTransferProcess.vue'
import VerifyEscrowTx from './VerifyEscrowTx.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'
import StandByDisplay from './StandByDisplay.vue'
import PaymentConfirmation from './PaymentConfirmation.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      isChipnet: this.$store.getters['global/isChipnet'],
      walletIndex: this.$store.getters['global/getWalletIndex'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wsURL: process.env.RAMP_WS_URL + 'order/',
      websocket: null,
      state: '',
      isloaded: false,
      confirmType: '',

      dialogType: '',
      openDialog: false,

      ad: null,
      order: null,
      feedback: null,
      rampContract: null,
      contract: {
        address: null
      },
      fees: null,
      wallet: null,
      txid: null,
      status: null,
      title: '',
      text: '',
      verifyAction: null,
      standByDisplayKey: 0,
      escrowTransferProcessKey: 0,
      verifyEscrowTxKey: 0,
      errorMessages: []
    }
  },
  components: {
    ReceiveOrder,
    StandByDisplay,
    ProgressLoader,
    MiscDialogs,
    EscrowTransferProcess,
    VerifyEscrowTx,
    PaymentConfirmation
  },
  props: {
    initWallet: {
      type: Object,
      default: null
    },
    orderData: {
      type: Object,
      default: null
    }
  },
  computed: {
    transferAmount () {
      return Number(this.order.crypto_amount)
    },
    getAdLimit () {
      return formatCurrency(this.ad.trade_floor, this.order.fiat_currency.symbol) + ' - ' + formatCurrency(this.ad.trade_ceiling, this.order.fiat_currency.symbol)
    },
    fiatAmount () {
      return (parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price)).toFixed(2)
    },
    cryptoAmount () {
      return (this.fiatAmount / this.order.locked_price).toFixed(8)
    },
    bchBalance () {
      // console.log(this.$store.getters['assets/getAssets'][0].balance)
      return this.$store.getters['assets/getAssets'][0].balance
    },
    isExpired () {
      const vm = this

      const now = new Date().getTime()
      const expiryDate = new Date(vm.order.expiration_date)

      const exception = ['Released', 'Canceled']

      if (expiryDate < now && vm.order.expiration_date && !exception.includes(vm.order.status.label)) {
        return true
      } else {
        return false
      }
    }
  },
  emits: ['back'],
  async mounted () {
    const vm = this
    if (vm.initWallet) {
      vm.wallet = vm.initWallet
    } else {
      const walletInfo = vm.$store.getters['global/getWallet']('bch')
      vm.wallet = await loadP2PWalletInfo(walletInfo, vm.walletIndex)
    }
    await vm.fetchOrderData()
    if (!vm.order) {
      vm.order = vm.orderData
    }
    await vm.fetchAdData()
    vm.updateStatus(vm.order.status)

    if (vm.order.status.value === 'RLS') {
      await vm.getOrderFeedback()
    }
    vm.isloaded = true
    vm.setupWebsocket()
    // const orderTxids = vm.$store.getters['ramp/getOrderTxid'](vm.order.id)
    // console.log('orderTxids:', orderTxids)
  },
  beforeUnmount () {
    this.closeWSConnection()
  },
  methods: {
    // STEP CHECKER
    updateStatus (status) {
      if (this.status && status && this.status.value === status.value) return
      this.status = status
      this.order.status = this.status
      this.checkStep()
    },
    checkStep () {
      const vm = this
      vm.openDialog = false
      console.log('Checking step:', vm.status)
      switch (vm.status.value) {
        case 'SBM': // Submitted
          if (this.order.is_ad_owner) {
            vm.state = 'order-confirm-decline'
          } else {
            vm.state = 'standby-view'
          }
          break
        case 'CNF': // Confirmed
          if (!this.rampContract) {
            vm.generateContract()
          }
          if (this.order.trade_type === 'BUY') {
            vm.state = vm.order.is_ad_owner ? 'escrow-bch' : 'standby-view'
          } else if (this.order.trade_type === 'SELL') {
            vm.state = vm.order.is_ad_owner ? 'standby-view' : 'escrow-bch'
          }
          break
        case 'ESCRW_PN': // Escrow Pending
          vm.verifyAction = 'ESCROW'
          vm.state = 'standby-view'
          if (this.order.trade_type === 'BUY') {
            vm.state = vm.order.is_ad_owner ? 'tx-confirmation' : 'standby-view'
          } else if (this.order.trade_type === 'SELL') {
            vm.state = vm.order.is_ad_owner ? 'standby-view' : 'tx-confirmation'
          }
          if (!this.rampContract) {
            vm.generateContract()
          }
          break
        case 'ESCRW': // Escrowed
          if (this.order.trade_type === 'BUY') {
            vm.state = vm.order.is_ad_owner ? 'standby-view' : 'payment-confirmation'
          } else if (this.order.trade_type === 'SELL') {
            vm.state = vm.order.is_ad_owner ? 'payment-confirmation' : 'standby-view'
          }
          vm.confirmType = 'buyer'
          break
        case 'PD_PN': // Paid Pending
          if (this.order.trade_type === 'BUY') {
            vm.state = vm.order.is_ad_owner ? 'payment-confirmation' : 'standby-view'
            vm.confirmType = vm.order.is_ad_owner ? 'seller' : 'buyer'
          } else if (this.order.trade_type === 'SELL') {
            vm.state = vm.order.is_ad_owner ? 'standby-view' : 'payment-confirmation'
            vm.confirmType = vm.order.is_ad_owner ? 'buyer' : 'seller'
          }
          break
        case 'PD': // Paid
          vm.state = 'standby-view'
          vm.verifyAction = 'RELEASE'
          if (this.order.trade_type === 'BUY') {
            vm.state = vm.order.is_ad_owner ? 'tx-confirmation' : 'standby-view'
          } else if (this.order.trade_type === 'SELL') {
            vm.state = vm.order.is_ad_owner ? 'standby-view' : 'tx-confirmation'
          }
          this.txid = null
          if (!this.rampContract) {
            vm.generateContract()
          }
          break
        case 'RFN': // Refunded
          this.status = 'refund'
          vm.$store.dispatch('ramp/clearOrderTxids', vm.order.id)
          break
        case 'RLS': // Released
          vm.state = 'standby-view'
          vm.standByDisplayKey++
          vm.$store.dispatch('ramp/clearOrderTxids', vm.order.id)
          break
        default:
          // includes status = CNCL, APL, RFN_PN, RLS_PN
          this.state = 'standby-view'
          vm.standByDisplayKey++
          break
      }
      if (this.isExpired) {
        vm.state = 'standby-view'
      }
    },

    // API CALLS
    async fetchOrderData () {
      const vm = this
      const url = `${vm.apiURL}/order/${vm.orderData.id}`
      await vm.$axios.get(url, {
        headers: {
          'wallet-hash': vm.wallet.walletHash
        }
      })
        .then(response => {
          // console.log('fetchOrderData:', response.data)
          vm.order = response.data.order
          vm.contract = response.data.contract
          vm.fees = response.data.fees
          console.log('contract:', vm.contract)
          vm.updateStatus(vm.order.status)
        })
        .catch(error => {
          console.log(error)
        })
    },
    async fetchAdData () {
      const vm = this

      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_GET', timestamp)

      const adId = vm.order.ad.id
      const url = `${vm.apiURL}/ad/${adId}`

      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }

      await vm.$axios.get(url, { headers: headers })
        .then(response => {
          vm.ad = response.data
          // console.log('ad', vm.ad)
        })
        .catch(error => {
          console.error(error)
          console.error(error.response)
        })
    },
    async confirmOrder () {
      const vm = this
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'ORDER_CONFIRM', timestamp)
      const orderID = vm.order.id
      const url = `${vm.apiURL}/order/${orderID}/confirm`
      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }
      await vm.$axios.post(url, {}, { headers: headers })
        .then(response => {
          if (response.data && response.data.status.value === 'CNF') {
            vm.updateStatus(response.data.status)
          }
        })
        .catch(error => {
          console.log(error)
        })
    },
    async cancelOrder () {
      const vm = this

      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'ORDER_CANCEL', timestamp)

      const orderID = vm.order.id
      const url = `${vm.apiURL}/order/${orderID}/cancel`

      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }

      await vm.$axios.post(url, {}, { headers: headers })
        .then(response => {
          // console.log(response)
          if (response.data && response.data.status.value === 'CNCL') {
            vm.updateStatus(response.data.status)
          }
        })
        .catch(error => {
          console.log(error)
        })
    },
    async sendConfirmPayment (type) {
      const vm = this
      vm.isloaded = false

      const url = `${this.apiURL}/order/${vm.order.id}/confirm-payment/${type}`
      const timestamp = Date.now()
      let action = 'ORDER_BUYER_CONF_PAYMENT'
      if (type === 'seller') {
        action = 'ORDER_SELLER_CONF_PAYMENT'
      }
      const signature = await signMessage(vm.wallet.privateKeyWif, action, timestamp) // update later

      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }
      await vm.$axios.post(url, {}, { headers: headers })
        .then(response => {
          // console.log('sendConfirmPayment:', response.data)
          // if (response.data && response.data.status.value === 'PD_PN') {
          vm.updateStatus(response.data.status)
          // }
        })
        .catch(error => {
          console.log(error)
        })

      // await this.fetchOrderData()
      // this.checkStep()
      vm.isloaded = true
    },
    async releaseCrypto () {
      this.txid = null
      if (!this.rampContract) {
        await this.generateContract()
      }
      const feContractAddr = await this.rampContract.getAddress()
      const beContractAddr = this.contract.address
      if (feContractAddr !== beContractAddr) {
        this.errorMessages.push('contract addresses mismatched')
      }
      await this.rampContract.release(this.wallet.privateKeyWif, this.order.crypto_amount)
        .then(result => {
          this.txid = result.txInfo.txid
          this.verifyEscrowTxKey++

          const txidData = {
            id: this.order.id,
            txidInfo: {
              action: 'RELEASE',
              txid: this.txid
            }
          }
          this.$store.dispatch('ramp/saveTxid', txidData)
          console.log('rampContract:', this.rampContract)
        })
        .catch(error => {
          console.error('release error:', error.response)
        })
    },
    async verifyRelease () {
      const vm = this
      const url = `${vm.apiURL}/order/${vm.order.id}/verify-release`
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'ORDER_RELEASE', timestamp) // update later
      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }
      const body = {
        txid: this.txid
      }
      // console.log('body:', body)
      await vm.$axios.post(url, body, { headers: headers })
        .then(response => {
          // console.log('response:', response)
          vm.updateStatus(response.data.status)
        })
        .catch(error => {
          console.error(error.response)
        })

      // await this.fetchOrderData()
    },
    async verifyEscrow () {
      const vm = this
      console.log('Verifying escrow:', vm.txid)
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'ORDER_ESCROW_VERIFY', timestamp)
      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        timestamp: timestamp,
        signature: signature
      }
      const url = vm.apiURL + '/order/' + vm.order.id + '/escrow-verify'
      const body = {
        txid: vm.txid
      }
      try {
        const response = await vm.$axios.post(url, body, { headers: headers })
        console.log('verifyEscrow response:', response)
      } catch (error) {
        console.error(error.response)
        const errorMsg = error.response.data.error
        vm.errorMessages.push(errorMsg)
        vm.verifyEscrowTxKey++
      }
    },
    async generateContract () {
      await this.fetchOrderData()
      if (!this.contract) return
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
      // const rampContract_ = new RampContract(publicKeys, fees, addresses, timestamp, !this.isChipnet)
      this.rampContract = new RampContract(publicKeys, fees, addresses, timestamp, this.isChipnet)
      await this.rampContract.initialize()
      // console.log('address_:', await rampContract_.getAddress())
      console.log('address:', await this.rampContract.getAddress())
      // console.log('contract balance:', await this.rampContract.getBalance())
      // this.contract.address = this.rampContract.getAddress()
      // console.log('rampContract address:', this.rampContract.getAddress())
    },

    async submitAppeal (data) {
      console.log('onSubmitAppeal:', data)
      const vm = this
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'APPEAL_REQUEST', timestamp)
      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }
      const url = `${vm.apiURL}/order/${vm.order.id}/appeal`
      vm.$axios.post(url, data, { headers: headers })
        .then(response => {
          console.log('response: ', response)
          this.updateStatus(response.data.status)
        })
        .catch(error => {
          console.error(error.response)
        })
    },
    async sendFeedback (feedback) {
      const vm = this
      vm.isloaded = false
      const url = `${vm.apiURL}/order/feedback/peer`
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'FEEDBACK_PEER_CREATE', timestamp)
      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }
      const body = {
        order_id: vm.order.id,
        rating: feedback.rating,
        comment: feedback.comment

      }
      // console.log(body)
      await vm.$axios.post(url, body, { headers: headers })
        .then(response => {
          // console.log(response)
          const data = response.data
          vm.feedback = {
            rating: data.rating,
            comment: data.comment,
            is_posted: true
          }
        })
        .catch(error => {
          console.log(error)
        })

      vm.isloaded = true
    },
    async getOrderFeedback () {
      const vm = this
      console.log('Get Feedback')

      const url = `${vm.apiURL}/order/feedback/peer`

      await vm.$axios.get(url, {
        params: {
          from_peer: vm.$store.getters['ramp/getUser'].id,
          order_id: vm.order.id
        }
      })
        .then(response => {
          if (response.data) {
            const data = response.data[0]
            vm.feedback = {
              rating: data.rating,
              comment: data.comment,
              is_posted: true
            }
          }
        })
        .catch(error => {
          console.log(error)
        })
    },

    // Recieve Dialogs
    async handleDialogResponse () {
      const vm = this
      vm.isloaded = false
      switch (vm.dialogType) {
        case 'confirmReleaseCrypto':
          await this.releaseCrypto()
          await vm.verifyRelease()
          break
        case 'confirmCancelOrder':
          await vm.cancelOrder()
          vm.$emit('back')
          break
        case 'confirmOrder':
          await this.confirmOrder()
          await this.fetchOrderData()
          this.checkStep()
          break
        case 'confirmPayment':
          await this.sendConfirmPayment(this.confirmType)
          if (this.confirmType === 'buyer') {
            await this.fetchOrderData()
          }
          if (this.confirmType === 'seller') {
            await this.releaseCrypto() // this will generate the txid
            await this.verifyRelease() // this needs the txid
          }
          break
      }
      vm.title = ''
      vm.text = ''
      vm.isloaded = true
    },

    // Opening Dialog
    confirmingOrder () {
      // console.log('confirming order')
      // this.dialogType = 'genericDialog'
      this.dialogType = 'confirmOrder'
      this.title = 'Confirm Order?'
      this.openDialog = true
    },
    cancellingOrder () {
      // console.log('cancelling order')
      this.dialogType = 'confirmCancelOrder'
      // this.dialogType = 'genericDialog'
      this.openDialog = true
      this.title = 'Cancel this order?'
    },
    releasingCrypto () {
      // console.log('releasing crypto')
      this.dialogType = 'confirmReleaseCrypto'
      this.openDialog = true
      this.title = 'Release crypto?'
    },
    handleConfirmPayment () {
      this.dialogType = 'confirmPayment'
      this.title = this.confirmType === 'buyer' ? 'Confirm Payment?' : 'Release Crypto?'

      this.text = this.confirmType === 'buyer' ? 'This will inform the seller that you already sent the fiat fee to one of their selected payment methods.' : 'This will release the crypto held by the escrow account to the buyer.'
      this.openDialog = true
    },

    // Others
    formattedCurrency (value, currency = null) {
      if (currency) {
        return formatCurrency(value, currency)
      } else {
        return formatCurrency(value)
      }
    },
    isValidInputAmount (value) {
      if (value === undefined) return false
      const parsedValue = parseFloat(value)
      const tradeFloor = parseFloat(this.ad.trade_floor)
      const tradeCeiling = parseFloat(this.ad.trade_ceiling)
      if (isNaN(parsedValue) || parsedValue < tradeFloor || parsedValue > tradeCeiling) {
        return false
      }
      return true
    },
    onVerifyTxSuccess (status) {
      this.updateStatus(status)
    },
    onBack () {
      this.state = 'order-list'
    },
    onEscrowSuccess (data) {
      console.log('onEscrowSuccess:', data)
      this.txid = data.txid
      this.updateStatus(data.status.status)
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },

    setupWebsocket () {
      const wsUrl = `${this.wsURL}${this.order.id}/`
      this.websocket = new WebSocket(wsUrl)
      this.websocket.onopen = () => {
        console.log('WebSocket connection established to ' + wsUrl)
      }
      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('WebSocket data:', data)
        if (data) {
          if (data.success) {
            if (data.txid) {
              this.txid = data.txid
            }
            if (data.status) {
              this.updateStatus(data.status.status)
            }
            if (data.contract_address) {
              if (this.contract) {
                this.contract.address = data.contract_address
              } else {
                this.contract = {
                  address: data.contract_address
                }
              }
              // console.log('contract:', this.contract)
              this.escrowTransferProcessKey++
            }
          } else if (data.error) {
            this.errorMessages.push(data.error)
            this.verifyEscrowTxKey++
          } else if (data.errors) {
            this.errorMessages.push(...data.errors)
            this.verifyEscrowTxKey++
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
