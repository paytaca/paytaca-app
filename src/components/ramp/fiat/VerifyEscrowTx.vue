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
            :loading="!contract">
            <template v-slot:append v-if="contract.address">
              <div @click="$parent.copyToClipboard(contract.address)">
                <q-icon size="sm" name='o_content_copy' color="blue-grey-6"/>
              </div>
            </template>
          </q-input>
        <!-- </div> -->
        <!-- <div class="row q-mt-md"> -->

        <div class="sm-font-size q-pl-sm q-pb-xs">Transaction ID</div>
          <q-input
            readonly
            :dark="darkMode"
            filled
            dense
            :loading="!transactionId"
            v-model="transactionId">
            <template v-slot:append v-if="transactionId">
              <div @click="$parent.copyToClipboard(transactionId)">
                <q-icon size="sm" name='o_content_copy' color="blue-grey-6"/>
              </div>
            </template>
          </q-input>
        <!-- </div> -->
        <div class="row q-mt-sm sm-font-size" style="color: grey">
          Contract balance: {{ contract.balance ? contract.balance : 0 }} BCH
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
        <div class="row q-mb-md">
          <q-btn
            v-if="!loading && !hideBtn"
            rounded
            :disable="hideBtn"
            :label="action === 'ESCROW' ? Verify : 'Release BCH'"
            color="blue-6"
            class="col q-mx-lg q-mb-md q-py-sm"
            @click="onVerify">
          </q-btn>
          <div v-if="hideBtn" class="q-mt-md">
            <span v-if="state === 'verifying'">Verifying transaction, please wait...</span>
            <span v-if="state === 'sending'">Sending bch, please wait...</span>
            <!-- <span v-if="waitSeconds && !txExists">({{ waitSeconds }}s)</span> -->
          </div>
        </div>
      </div>
    </div>
    <!-- else progress loader -->
  </template>
<script>
import { signMessage } from '../../../wallet/ramp/signature.js'
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
      transactionId: '',
      txExists: false,
      timer: null,
      waitSeconds: null,
      hideBtn: true,
      errorMessages: [],
      state: ''
    }
  },
  emits: ['back', 'success'],
  components: {},
  props: {
    orderId: {
      type: Number,
      default: null
    },
    wallet: {
      type: Object,
      default: null
    },
    action: String,
    txid: String,
    errors: Array
  },
  watch: {
    transactionId () {
      if (!this.transactionId) {
        this.state = 'sending'
      } else {
        this.state = 'verifying'
      }
    }
  },
  computed: {},
  async mounted () {
    const vm = this
    vm.errorMessages.push(...vm.errors)
    if (vm.txid && vm.txid.length > 0) {
      vm.transactionId = vm.txid
    }
    if (!vm.transactionId) {
      vm.transactionId = this.$store.getters['ramp/getOrderTxid'](vm.orderId, vm.action)
    }
    await vm.fetchOrderDetail()
    vm.loading = false
  },
  beforeUnmount () {
    clearInterval(this.timer)
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
        console.log('contract:', response.data.contract)
        const transactions = response.data.contract.transactions
        let valid = false
        let verifying = true
        // console.log('transactions:', transactions)
        if (transactions) {
          for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i]
            // console.log('action:', vm.action)
            // console.log('tx:', tx)
            verifying = tx.verifying
            if (tx.action === vm.action) {
              vm.txExists = true
              vm.transactionId = tx.txid
              valid = tx.valid
              break
            }
          }
        }
        // console.log('txExists:', vm.txExists, 'valid:', valid, 'verifying:', verifying)
        if (vm.txExists && !valid && !verifying) {
          vm.hideBtn = false
        }
        if (!vm.txExists) {
          vm.waitSeconds = 60
          vm.timer = setInterval(function () {
            vm.waitSeconds--
            if (vm.waitSeconds === 0) {
              vm.hideBtn = false
              // vm.errorMessages.push('Server took too long to respond')
              clearInterval(vm.timer)
            }
          }, 1000)
        }
      } catch (error) {
        console.error(error.response)
      }
    },
    async verifyRelease () {
      const vm = this
      vm.state = 'verifying'
      console.log('Verifying Release: ', vm.transactionId)
      const url = `${vm.apiURL}/order/${vm.orderId}/verify-release`
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'ORDER_RELEASE', timestamp)
      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }
      const body = {
        txid: this.transactionId
      }
      await vm.$axios.post(url, body, { headers: headers })
        .then(response => {
          console.log('response:', response)
        })
        .catch(error => {
          console.error(error.response)
          const errorMsg = error.response.data.error
          vm.errorMessages.push(errorMsg)
          vm.hideBtn = false
        })

      // await this.fetchOrderData()
    },
    async verifyEscrow () {
      const vm = this
      vm.state = 'verifying'
      console.log('Verifying escrow:', vm.transactionId)
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'ORDER_ESCROW_VERIFY', timestamp)
      const headers = {
        'wallet-hash': vm.wallet.walletHash,
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
        vm.hideBtn = false
      }
    },
    onVerify () {
      const vm = this
      vm.hideBtn = true
      vm.errorMessages = []
      switch (vm.action) {
        case 'ESCROW':
          vm.verifyEscrow()
          break
        case 'RELEASE':
          vm.verifyRelease()
          break
      }
    }
  }
}
</script>
