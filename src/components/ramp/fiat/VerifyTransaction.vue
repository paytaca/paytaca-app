<template>
  <div class="q-pb-md">
    <q-pull-to-refresh @refresh="$emit('refresh')">
      <div class="q-mx-lg text-h5 text-center lg-font-size bold-text">
        <span>VERIFYING TRANSFER</span>
      </div>
      <div class="subtext text-center q-pb-sm md-font-size">ORDER #{{ data?.orderId }}</div>
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
            <q-input
              class="q-pb-xs md-font-size"
              readonly
              dense
              filled
              :loading="!balanceLoaded || retryBalance(contract.balance)"
              :dark="darkMode"
              v-model="contract.balance">
              <template v-slot:append>
                <span>BCH</span>
              </template>
            </q-input>
          </div>
          <div class="sm-font-size q-pl-sm q-pb-xs">Transaction ID</div>
          <q-input
            filled
            dense
            :readonly="disableTxidInput"
            :dark="darkMode"
            :loading="!transactionId"
            v-model="transactionId">
            <template v-slot:append v-if="transactionId && disableTxidInput">
              <q-icon
                size="sm"
                name='o_content_copy'
                color="blue-grey-6"
                @click="copyToClipboard(transactionId)"/>
            </template>
          </q-input>
          <div v-if="errorMessage" class="q-mx-sm q-my-sm">
            <q-card flat class="col q-pa-md" :class="[ darkMode ? 'text-white pt-dark-card-1' : 'text-black',]">
                <q-icon name="error" left/>
                {{ errorMessage }}
            </q-card>
          </div>
          <div v-if="txidLoaded && balanceLoaded && !hideBtn" class="row q-mb-md">
            <q-btn
              rounded
              :loading="loading"
              :disable="disableBtn || !data?.wsConnected"
              :label=btnLabel
              color="blue-6"
              class="col q-mx-lg q-mb-md q-py-sm q-my-md"
              @click="submitAction">
            </q-btn>
          </div>
          <div v-if="loading && !errorMessage" class="q-mt-md">
            <span v-if="state === 'verifying'">
              <q-spinner class="q-mr-sm"/>Verifying, please wait...
            </span>
          </div>
        </div>
      </q-scroll-area>
    </q-pull-to-refresh>
  </div>
</template>
<script>
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/wallet/ramp/backend'

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
      disableBtn: true,
      hideBtn: false,
      errorMessage: null,
      state: null,
      minHeight: this.$q.screen.height - this.$q.screen.height * 0.2,

      btnLabel: '',
      txidLoaded: false,
      balanceLoaded: false,
      disableTxidInput: true
    }
  },
  emits: ['back', 'success', 'refresh'],
  components: {},
  props: {
    data: Object
  },
  watch: {
    txidLoaded () {
      this.checkTransferStatus()
    },
    balanceLoaded () {
      this.checkTransferStatus()
    }
  },
  async mounted () {
    const vm = this
    vm.loadTransactionId()
    vm.loadContract()
  },
  beforeUnmount () {
    clearInterval(this.timer)
  },
  methods: {
    loadTransactionId () {
      if (!this.transactionId) {
        this.transactionId = this.$store.getters['ramp/getOrderTxid'](this.data?.orderId, this.data?.action)
      }
      this.fetchTransactions()
    },
    loadContract () {
      this.fetchContractBalance()
      this.fetchContract()
    },
    fetchContractBalance () {
      return new Promise((resolve, reject) => {
        if (!this.data?.escrow) return 0
        this.data?.escrow?.getBalance()
          .then(balance => {
            this.contract.balance = balance
            this.balanceLoaded = true
            resolve(balance)
          })
          .catch(error => reject(error))
      })
    },
    fetchTransactions () {
      const vm = this
      vm.loading = true
      backend.get('/ramp-p2p/order/contract/transactions', {
        params: {
          order_id: vm.data?.orderId
        },
        authorize: true
      })
        .then(response => {
          if (!vm.transactionId) {
            const transactions = response.data
            const tx = transactions.filter(transaction => transaction.action === vm.data?.action)
            console.log('tx:', tx)
          }
          vm.txidLoaded = true
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
        })
    },
    fetchContract () {
      return new Promise((resolve, reject) => {
        const vm = this
        vm.loading = true
        backend.get('/ramp-p2p/order/contract', {
          params: {
            order_id: vm.data?.orderId
          },
          authorize: true
        })
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
    verifyRelease () {
      const vm = this
      const body = { txid: this.transactionId }
      backend.post(`/ramp-p2p/order/${vm.data?.orderId}/verify-release`, body, { authorize: true })
        .then(response => console.log(response.data))
        .catch(error => {
          if (error.response) {
            console.error(error.response)
            vm.errorMessage = error.response.data.error
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            console.error(error)
          }
          vm.hideBtn = false
        })
        .finally(vm.loading = false)
    },
    verifyEscrow () {
      const vm = this
      const body = { txid: vm.transactionId }
      backend.post(`/ramp-p2p/order/${vm.data?.orderId}/verify-escrow`, body, { authorize: true })
        .then(response => console.log(response.data))
        .catch(error => {
          if (error.response) {
            console.error(error.response)
            vm.errorMessage = error.response.data.error
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            console.error(error)
          }
          vm.hideBtn = false
        })
        .finally(vm.loading = false)
    },
    submitAction () {
      const vm = this
      vm.hideBtn = true
      vm.errorMessage = null
      vm.loading = true
      vm.state = 'verifying'
      setTimeout(function () {
        switch (vm.data?.action) {
          case 'ESCROW':
            vm.verifyEscrow()
            break
          case 'RELEASE':
            vm.verifyRelease()
            break
        }
      }, 3000)
    },
    checkTransferStatus () {
      if (this.balanceLoaded && this.txidLoaded) {
        switch (this.data?.action) {
          case 'RELEASE':
            if (this.contract.balance === 0) {
              if (!this.transactionId) {
                this.disableTxidInput = false
              }
              this.disableBtn = false
            } else {
              // poll for balance with exponential backoff
              this.exponentialBackoff(this.fetchContractBalance, 5, 1000)
            }
            break
          case 'ESCROW':
            if (this.contract.balance > 0) {
              if (!this.transactionId) {
                this.disableTxidInput = false
              }
              this.disableBtn = false
            } else {
              // poll for balance with exponential backoff
              this.exponentialBackoff(this.fetchContractBalance, 5, 1000)
            }
            break
        }
        this.state = 'verifying'
        this.btnLabel = 'VERIFY TRANSFER'
        this.loading = false
      }
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
    delay (duration) {
      return new Promise(resolve => setTimeout(resolve, duration))
    },
    retryBalance (balance) {
      switch (this.data?.action) {
        case 'RELEASE':
          if (balance > 0) return true
          break
        case 'ESCROW':
          if (balance <= 0) return true
          break
        default:
          return false
      }
    },
    exponentialBackoff (fn, retries, delayDuration) {
      return fn()
        .then(balance => {
          if (this.retryBalance(balance)) {
            if (retries > 0) {
              console.log(`Attempt failed. Retrying in ${delayDuration / 1000} seconds...`)
              return this.delay(delayDuration)
                .then(() => this.exponentialBackoff(fn, retries - 1, delayDuration * 2))
            }
          } else {
            this.disableBtn = false
          }
        })
        .catch(error => console.error(error))
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