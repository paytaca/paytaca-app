<template>
    <div class="q-pb-md">
      <!-- <div>
        <q-btn
          flat
          padding="md"
          icon="close"
          @click="$emit('back')"
        />
      </div> -->
      <div class="text-center lg-font-size bold-text">VERIFYING TRANSFER</div>
      <q-separator :dark="darkMode" class="q-mx-lg"/>
      <div class="q-mx-lg q-px-md q-pt-md">
        <!-- <div class="row q-mt-md"> -->
        <div class="sm-font-size q-pl-sm q-pb-xs">Contract Address</div>
          <q-input
            class="q-pb-sm"
            readonly
            :dark="darkMode"
            filled
            dense
            v-model="contract.address"
            :loading="!contract || contract.address === ' '">
          </q-input>
        <!-- </div> -->
        <!-- <div class="row q-mt-md"> -->

        <div class="sm-font-size q-pl-sm q-pb-xs">Transaction ID</div>
          <q-input
            readonly
            :dark="darkMode"
            filled
            dense
            v-model="transactionId">
            <template v-slot:append>
              <div @click="$parent.copyToClipboard(transactionId)">
                <q-icon  class="q-pr-sm" size="sm" name='o_content_copy' color="blue-grey-6"/>
              </div>
            </template>
          </q-input>
        <!-- </div> -->
        <div v-if="contract.balance !== null" class="row q-mt-sm sm-font-size" style="color: grey">
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
            v-if="!loading && !hideVerifyBtn"
            rounded
            no-caps
            :disable="hideVerifyBtn"
            label="Verify"
            color="blue-6"
            class="col q-mx-lg q-my-md q-py-sm"
            @click="onVerify">
          </q-btn>
          <div v-if="hideVerifyBtn" class="q-mt-md">Verifying transaction, please wait...</div>
        </div>
      </div>
    </div>
    <!-- else progress loader -->
  </template>
<script>
import { loadP2PWalletInfo } from 'src/wallet/ramp'
import { signMessage } from 'src/wallet/ramp/signature'
import { getBalanceByAddress } from 'src/wallet/bch'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wsURL: process.env.RAMP_WS_URL + 'order/',
      loading: true,
      contract: {
        balance: null,
        address: ' '
      },
      transactionId: '', // dummy txid
      errorMessages: [],
      hideVerifyBtn: true
    }
  },
  emits: ['back', 'success'],
  components: {},
  props: {
    orderId: {
      type: Number,
      default: null
    },
    txid: String,
    wallet: {
      type: Object,
      default: null
    }
  },
  watch: {},
  computed: {},
  async mounted () {
    const vm = this
    if (vm.txid && vm.txid.length > 0) {
      vm.transactionId = vm.txid
    }
    await vm.fetchOrderDetail()
    vm.loading = false
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
        vm.contract.address = response.data.contract.address
        vm.contract.balance = await getBalanceByAddress(vm.contract.address)
        console.log('contract: ', response)
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
        vm.hideVerifyBtn = false
      }
    },
    onVerify () {
      const vm = this
      vm.hideVerifyBtn = true
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
        if (data.success && data.success === true) {
          this.$emit('success', data.status.status)
        } else {
          this.hideVerifyBtn = false
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
