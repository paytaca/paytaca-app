<template>
  <div
    class="q-pt-sm q-mx-md text-bow"
    :class="getDarkModeClass(darkMode)">
    <div class="q-mx-lg">
      <div class="sm-font-size q-pb-xs q-ml-xs">Arbiter</div>
      <q-input
        class="q-pb-xs md-font-size"
        readonly
        dense
        filled
        :dark="darkMode"
        :label="data?.arbiter?.address"
        v-model="data.arbiter.name">
      </q-input>
      <div class="sm-font-size q-py-xs q-ml-xs">Contract Address</div>
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
      <div class="sm-font-size q-pl-sm q-py-xs">Transaction ID</div>
      <q-input
        filled
        dense
        :readonly="disableTxidInput"
        :dark="darkMode"
        :loading="!transactionId"
        v-model="transactionId"
        @click="copyToClipboard(transactionId)">
        <template v-slot:append>
          <q-icon
            size="sm"
            name='edit'
            color="blue-grey-6"
            @click="disableTxidInput = false"/>
        </template>
      </q-input>
      <div v-if="errorMessage" class="q-mx-sm q-my-sm">
        <q-card flat class="col q-pa-md pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
            <q-icon name="error" left/>
            Error: {{ errorMessage }}
        </q-card>
      </div>
      <div v-if="txidLoaded && balanceLoaded && !hideBtn" class="row q-mb-sm q-pt-md">
        <q-btn
          rounded
          :loading="loading"
          :disable="disableBtn || !data?.wsConnected"
          label="Retry"
          class="col q-mx-lg button"
          @click="submitAction">
        </q-btn>
      </div>
      <div class="q-my-sm" v-if="state === 'verifying' && hideBtn">
        <q-spinner class="q-mr-sm"/>Verifying, please wait...
      </div>
    </div>
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/wallet/ramp/backend'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
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
      txidLoaded: false,
      balanceLoaded: false,
      disableTxidInput: true,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100
    }
  },
  emits: ['back', 'success'],
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
    getDarkModeClass,
    loadTransactionId () {
      if (!this.transactionId) {
        this.transactionId = this.$store.getters['ramp/getOrderTxid'](this.data?.orderId, this.data?.action)
      }
      this.fetchTransactions()
    },
    loadContract () {
      this.fetchContract().then(this.fetchContractBalance())
    },
    fetchContractBalance () {
      return new Promise((resolve, reject) => {
        if (!this.data?.escrow) return 0
        this.data?.escrow?.getBalance(this.contract.address)
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
          vm.disableBtn = false
          vm.loading = false
        })
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
          vm.disableBtn = false
          vm.loading = false
        })
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
              this.submitAction()
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
              this.submitAction()
            } else {
              // poll for balance with exponential backoff
              this.exponentialBackoff(this.fetchContractBalance, 5, 1000)
            }
            break
        }
        this.state = 'verifying'
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
.subtext {
  opacity: .5;
}
</style>
