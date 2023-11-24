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
      <q-scroll-area :style="`height: ${minHeight - 200}px`" style="overflow-y:auto;">
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
              :loading="loading"
              :disable="loading || !transactionId"
              rounded
              label="Verify"
              color="blue-6"
              class="col q-mx-lg q-mb-md q-py-sm q-my-md"
              @click="onVerify">
            </q-btn>
            <!-- <div v-if="hideBtn" class="q-mt-md">
              <span v-if="state === 'verifying'">
                Verifying transaction, please wait...
              </span>
              <span v-if="state === 'sending'">Sending bch, please wait...</span>
            </div> -->
          </div>
        </div>
      </q-scroll-area>
    </div>
    <!-- else progress loader -->
  </template>
<script>
import { bus } from 'src/wallet/event-bus.js'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wsURL: process.env.RAMP_WS_URL + 'order/',
      authHeaders: this.$store.getters['ramp/authHeaders'],
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
      state: '',
      minHeight: this.$q.screen.height - this.$q.screen.height * 0.2,
    }
  },
  emits: ['back', 'success'],
  components: {},
  props: {
    orderId: {
      type: Number,
      default: null
    },
    rampContract: Object,
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
      vm.loading = true
      const url = vm.apiURL + '/order/' + vm.orderId
      try {
        const response = await vm.$axios.get(url, { headers: vm.authHeaders })
        vm.contract.address = response.data.contract.address
        // vm.contract.balance = await getBalanceByAddress(vm.contract.address)
        if (this.rampContract) {
          vm.contract.balance = await this.rampContract.getBalance()
        }
        const transactions = response.data.contract.transactions
        let valid = false
        let verifying = true
        if (transactions) {
          for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i]
            verifying = tx.verifying
            if (tx.action === vm.action) {
              vm.txExists = true
              if (tx.txid) {
                vm.transactionId = tx.txid
              }
              valid = tx.valid
              break
            }
          }
        }
        if (vm.txExists && !valid && !verifying) {
          vm.hideBtn = false
        }
        vm.waitSeconds = 60
        vm.timer = setInterval(function () {
          vm.waitSeconds--
          if (vm.waitSeconds === 0) {
            vm.hideBtn = false
            clearInterval(vm.timer)
          }
        }, 1000)
      } catch (error) {
        console.error(error.response)
        if (error.response && error.response.status === 403) {
          bus.emit('session-expired')
        }
      }
    },
    async verifyRelease () {
      const vm = this
      vm.state = 'verifying'
      const url = `${vm.apiURL}/order/${vm.orderId}/verify-release`
      const body = {
        txid: this.transactionId
      }
      await vm.$axios.post(url, body, { headers: vm.authHeaders })
        .catch(error => {
          console.error(error.response)
          if (error.response && error.response.status === 403) {
            bus.emit('session-expired')
          }
          const errorMsg = error.response.data.error
          vm.errorMessages.push(errorMsg)
          vm.hideBtn = false
        })
    },
    async verifyEscrow () {
      const vm = this
      vm.state = 'verifying'
      const url = vm.apiURL + '/order/' + vm.orderId + '/verify-escrow'
      const body = {
        txid: vm.transactionId
      }
      try {
        await vm.$axios.post(url, body, { headers: vm.authHeaders })
      } catch (error) {
        console.error(error.response)
        if (error.response && error.response.status === 403) {
          bus.emit('session-expired')
        }
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
      vm.fetchOrderDetail()
    }
  }
}
</script>
