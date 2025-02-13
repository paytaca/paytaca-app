<template>
  <div
    class="q-pt-sm q-mx-md text-bow"
    :class="getDarkModeClass(darkMode)">
    <div class="q-mx-lg">
      <div class="sm-font-size q-pb-xs q-ml-xs">{{ $t('Arbiter') }}</div>
      <q-input
        class="q-pb-xs md-font-size"
        readonly
        dense
        filled
        :dark="darkMode"
        :label="data?.arbiter?.address"
        v-model="data.arbiter.name">
      </q-input>
      <div class="sm-font-size q-py-xs q-ml-xs">{{ $t('ContractAddress') }}</div>
      <q-input class="q-pb-xs" readonly dense filled :dark="darkMode" v-model="contract.address">
        <template v-slot:append>
          <div v-if="contract.address" @click="copyToClipboard(contract.address)">
            <q-icon size="sm" name='o_content_copy' color="blue-grey-6"/>
          </div>
        </template>
      </q-input>
      <div class="sm-font-size q-py-xs q-ml-xs">{{ $t('ContractBalance') }}</div>
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
      <div class="sm-font-size q-pl-sm q-py-xs">{{ $t('TransactionId') }}</div>
      <q-input
        filled
        dense
        readonly
        :dark="darkMode"
        :loading="!txidLoaded && !transactionId"
        v-model="transactionId"
        @click="copyToClipboard(transactionId)"
        class="q-mb-md">
      </q-input>
      <div v-if="errorMessage" class="warning-box q-mx-xs q-my-sm" :class="darkMode ? 'warning-box-dark' : 'warning-box-light'">
        <q-icon name="error" size="1.2em" class="q-pr-xs"/>{{ errorMessage }}
      </div>
      <div v-if="showRetryBtn" class="row q-mb-md">
        <q-btn
          rounded
          :loading="loading"
          :disable="disableBtn"
          :label="$t('Retry')"
          class="col q-mx-lg button"
          @click="submitAction">
        </q-btn>
      </div>
      <!-- <div class="q-my-sm" v-if="verifyingTx && hideBtn">
        <q-spinner class="q-mr-sm"/>{{ $t('VerifyingPleaseWait') }}
      </div> -->
    </div>
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/exchange/backend'

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
      verifyingTx: false,
      txidLoaded: false,
      balanceLoaded: false,
      errorDialogActive: false,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100
    }
  },
  emits: ['back', 'success', 'verifying'],
  props: {
    data: Object
  },
  watch: {
    txidLoaded () {
      this.checkTransferStatus()
    },
    balanceLoaded () {
      this.checkTransferStatus()
    },
    verifyingTx (val) {
      this.$emit('verifying', val)
    }
  },
  computed: {
    showRetryBtn () {
      return this.txidLoaded && this.balanceLoaded && !this.hideBtn
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
    async loadTransactionId () {
      if (!this.transactionId) {
        this.transactionId = this.$store.getters['ramp/getOrderTxid'](this.data?.orderId, this.data?.action)
      }
      await this.fetchTransactions()
      console.log('transactionId:', this.transactionId)
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
    async fetchTransactions () {
      const utxos = await this.data?.escrow?.getUtxos()
      if (utxos.length > 0) {
        this.transactionId = utxos[0]?.txid
      }
      this.txidLoaded = true
    },
    fetchContract () {
      return new Promise((resolve, reject) => {
        const vm = this
        vm.loading = true
        backend.get(`/ramp-p2p/order/${vm.data?.orderId}/contract/`, { authorize: true })
          .then(response => {
            vm.contract = response.data
            resolve(response.data)
          })
          .catch(error => {
            this.handleRequestError(error)
            reject(error)
          })
      })
    },
    async verifyRelease () {
      const vm = this
      const body = { txid: this.transactionId }
      vm.verifyingTx = true
      await backend.post(`/ramp-p2p/order/${vm.data?.orderId}/verify-release/`, body, { authorize: true })
        .then(() => {
          this.$emit('success')
        })
        .catch(error => {
          vm.errorMessage = error.response?.data?.error
          vm.hideBtn = false
          vm.disableBtn = false
          vm.loading = false
        })
      vm.verifyingTx = false
    },
    async verifyEscrow () {
      const vm = this
      const body = { txid: vm.transactionId }
      vm.verifyingTx = true
      await backend.post(`/ramp-p2p/order/${vm.data?.orderId}/verify-escrow/`, body, { authorize: true })
        .then(() => {
          this.$emit('success')
        })
        .catch(error => {
          if (error.response?.data?.error === 'txid is required') {
            vm.errorMessage = 'Transaction ID is required for verification'
          }
          vm.hideBtn = false
          vm.disableBtn = false
          vm.loading = false
        })
      vm.verifyingTx = false
    },
    submitAction () {
      const vm = this
      vm.hideBtn = true
      vm.errorMessage = null
      vm.loading = true
      switch (vm.data?.action) {
        case 'ESCROW':
          vm.verifyEscrow()
          break
        case 'RELEASE':
          vm.verifyRelease()
          break
      }
    },
    checkTransferStatus () {
      if (this.balanceLoaded && this.txidLoaded) {
        this.verifyingTx = true
        switch (this.data?.action) {
          case 'RELEASE':
            if (this.contract.balance === 0) {
              this.submitAction()
            } else {
              this.verifyingTx = false
              // poll for balance with exponential backoff
              this.exponentialBackoff(this.fetchContractBalance, 5, 1000)
            }
            break
          case 'ESCROW':
            if (this.contract.balance > 0) {
              this.submitAction()
            } else {
              this.verifyingTx = false
              // poll for balance with exponential backoff
              this.exponentialBackoff(this.fetchContractBalance, 5, 1000)
            }
            break
          default:
            this.verifyingTx = false
        }
        this.loading = false
      }
    },
    copyToClipboard (value) {
      if (!value) return
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
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
    delay (duration) {
      return new Promise(resolve => setTimeout(resolve, duration))
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
    },
    handleRequestError (error) {
      bus.emit('handle-request-error', error)
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
.warning-box {
  padding: 10px;
  border-radius: 5px;
}
.warning-box-light {
  background-color: #ffc4c4; /* Light red background */
  border: 1px solid #fb672d; /* Border color */
}
.warning-box-dark {
  background-color: #333; /* Dark mode background color */
  color: #fff; /* Text color for dark mode */
  border: 1px solid #fb672d; /* Border color */
}
</style>
