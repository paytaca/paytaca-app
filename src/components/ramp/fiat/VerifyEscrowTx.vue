<template>
  <div class="q-pb-md">
    <q-pull-to-refresh @refresh="$emit('refresh')">
      <div class="q-mx-lg text-h5 text-center lg-font-size bold-text">
        <span>VERIFYING TRANSFER</span>
      </div>
      <div class="subtext text-center q-pb-sm md-font-size">ORDER #{{ orderId }}</div>
      <q-separator :dark="darkMode" class="q-mx-lg"/>
      <q-scroll-area :style="`height: ${minHeight - 200}px`" style="overflow-y:auto;">
        <div class="q-mx-md q-px-md q-pt-md">
          <div>
            <div class="sm-font-size q-pb-xs q-ml-xs">Contract Address</div>
            <q-input class="q-pb-xs" readonly dense filled :dark="darkMode" v-model="contract.address">
              <template v-slot:append>
                <div v-if="contract.address" @click="copyToClipboard(contract.address)">
                  <q-icon size="sm" name='o_content_copy' color="blue-grey-6"/>
                </div>
              </template>
            </q-input>
            <div class="sm-font-size q-py-xs q-ml-xs">Contract Balance</div>
            <q-input class="q-pb-xs md-font-size" readonly dense filled :dark="darkMode" v-model="contract.balance">
              <template v-slot:append>
                <span class="sm-font-size bold-text md-font-size">BCH</span>
              </template>
            </q-input>
          </div>
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
              v-if="!hideBtn"
              :loading="loading"
              :disable="loading || !transactionId"
              rounded
              label="Verify"
              color="blue-6"
              class="col q-mx-lg q-mb-md q-py-sm q-my-md"
              @click="onVerify">
            </q-btn>
          </div>
        </div>
      </q-scroll-area>
    </q-pull-to-refresh>
  </div>
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
      // txExists: false,
      // timer: null,
      // waitSeconds: null,
      hideBtn: true,
      errorMessages: [],
      state: '',
      minHeight: this.$q.screen.height - this.$q.screen.height * 0.2
    }
  },
  emits: ['back', 'success', 'refresh'],
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
    vm.fetchOrderDetail()
    vm.loading = false
  },
  beforeUnmount () {
    clearInterval(this.timer)
  },
  methods: {
    async getContractBalance () {
      this.contract.balance = await this.rampContract.getBalance()
    },
    fetchOrderDetail () {
      const vm = this
      vm.loading = true
      const url = vm.apiURL + '/order/' + vm.orderId
      vm.$axios.get(url, { headers: vm.authHeaders })
        .then(response => {
          if (vm.rampContract) vm.getContractBalance()
          vm.contract.address = response.data.contract.address
          const transactions = response.data.contract.transactions

          let pendingTxExists = false
          if (transactions) {
            for (let i = 0; i < transactions.length; i++) {
              const tx = transactions[i]
              if (tx.action === vm.action) {
                if (!tx.txid) {
                  pendingTxExists = true
                }
                break
              }
            }
          }
          if (pendingTxExists) {
            vm.onVerify()
          }
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        })
    },
    verifyRelease () {
      const vm = this
      vm.state = 'verifying'
      const url = `${vm.apiURL}/order/${vm.orderId}/verify-release`
      const body = { txid: this.transactionId }
      vm.$axios.post(url, body, { headers: vm.authHeaders })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            vm.errorMessages.push(error.response.data.error)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
          vm.hideBtn = false
        })
    },
    verifyEscrow () {
      const vm = this
      vm.state = 'verifying'
      const url = vm.apiURL + '/order/' + vm.orderId + '/verify-escrow'
      const body = { txid: vm.transactionId }
      vm.$axios.post(url, body, { headers: vm.authHeaders })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            vm.errorMessages.push(error.response.data.error)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
          vm.hideBtn = false
        })
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
<style lang="scss" scoped>
.xs-font-size {
  font-size: x-small;
}
.sm-font-size {
  font-size: small;
}
.md-font-size {
  font-size: medium;
}

.lg-font-size {
  font-size: large;
}

.bold-text {
  font-weight: bold;
}
.subtext {
  opacity: .5;
}
</style>
