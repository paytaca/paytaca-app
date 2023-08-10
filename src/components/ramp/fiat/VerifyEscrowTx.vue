<template>
    <div class="q-pb-md">
      <div>
        <q-btn
          flat
          padding="md"
          icon="close"
          @click="$emit('back')"
        />
      </div>
      <div class="text-center lg-font-size bold-text">VERIFYING TRANSFER</div>
      <q-separator :dark="darkMode" class="q-mx-lg"/>
      <div class="q-mx-lg">
        <div class="row q-mt-md">
            <q-input
                readonly
                class="col"
                :dark="darkMode"
                filled
                v-model="contract.address"
                label="Contract Address"
                style="width: 250px;"
                :loading="!contract || contract.address === ' '">
            </q-input>
        </div>
        <div class="row q-mt-md">
            <q-input
                class="col"
                :dark="darkMode"
                filled
                v-model="transactionId"
                label="Transaction ID"
                style="width: 250px;">
            </q-input>
        </div>
        <div v-if="contract.balance" class="row q-mt-sm md-font-size" style="color: grey">
          Contract balance: {{ contract.balance }} BCH
        </div>
        <div class="row" v-if="errorMessages.length > 0">
          <div class="col">
            <ul style="margin-left: -40px; list-style: none;">
              <li v-for="(error, index) in errorMessages" :key="index" class="bg-red-1 text-red q-pa-lg pp-text">
                <q-icon name="error" left/>
                {{ error }}
              </li>
            </ul>
          </div>
        </div>
        <div class="row" v-else>
          <q-btn
              rounded
              no-caps
              :disable="disableVerifyBtn"
              label="Verify"
              color="blue-6"
              class="col q-mx-lg q-my-md q-py-sm"
              @click="onVerify">
            </q-btn>
        </div>
      </div>
    </div>
    <!-- else progress loader -->
  </template>
<script>
import { loadP2PWalletInfo } from 'src/wallet/ramp'
import { signMessage } from 'src/wallet/ramp/signature'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wsURL: process.env.RAMP_WS_URL + 'order/',
      loading: false,
      contract: {
        balance: null,
        address: ' '
      },
      transactionId: '04091977eb623861ca9138f12c2da841337a4c5d4b0d7452ca18c0107862cxxx', // dummy txid
      errorMessages: [],
      disableVerifyBtn: false
    }
  },
  emits: ['back', 'success'],
  components: {},
  props: {
    orderId: {
      type: Number,
      default: null
    },
    txId: {
      type: String,
      default: ' '
    },
    wallet: {
      type: Object,
      default: null
    }
  },
  watch: {},
  computed: {},
  async mounted () {
    const vm = this
    vm.loading = true
    if (vm.txId.length > 0) {
      vm.transactionId = vm.txId
    }
    vm.setupWebsocket()
    await vm.fetchOrderDetail()
  },
  beforeUnmount () {
    this.closeWSConnection()
  },
  methods: {
    async fetchOrderDetail () {
      const vm = this
      const headers = {
        'wallet-hash': vm.wallet.walletHash
      }
      vm.loading = true
      const url = vm.apiURL + '/order/' + vm.orderId
      try {
        const response = await vm.$axios.get(url, { headers: headers })
        vm.contract.address = response.data.contract.contract_address
      } catch (error) {
        console.error(error.response)
      }
    },
    async verifyTxid () {
      const vm = this
      const walletInfo = vm.$store.getters['global/getWallet']('bch')
      const wallet = await loadP2PWalletInfo(walletInfo)
      const timestamp = Date.now()
      const signature = await signMessage(wallet.privateKeyWif, 'ORDER_ESCROW_VERIFY', timestamp)
      const headers = {
        'wallet-hash': wallet.walletHash,
        timestamp: timestamp,
        signature: signature
      }
      vm.loading = true
      const url = vm.apiURL + '/order/' + vm.orderId + '/escrow-verify'
      const body = {
        txid: vm.transactionId
      }
      try {
        const response = await vm.$axios.post(url, body, { headers: headers })
        console.log('response:', response)
      } catch (error) {
        console.error(error.response)
        const errorMsg = error.response.data.error
        vm.errorMessages.push(errorMsg)
        this.disableVerifyBtn = false
      }
    },
    onVerify () {
      const vm = this
      vm.disableVerifyBtn = true
      vm.verifyTxid()
    },
    setupWebsocket () {
      const wsUrl = this.wsURL + this.orderId + '/'
      this.websocket = new WebSocket(wsUrl)
      this.websocket.onopen = () => {
        console.log('WebSocket connection established to ' + wsUrl)
      }
      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('WebSocket message:', data)
        if (data.success) {
          if (data.success === true) {
            this.$emit('success', data.status.status)
          }
          this.disableVerifyBtn = false
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
