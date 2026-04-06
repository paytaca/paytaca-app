<template>
  <div
    class="q-pt-sm q-mx-md text-bow"
    :class="getDarkModeClass(darkMode)">
    <div class="q-mx-lg">
      
      <!-- Contract Information Section -->
      <div class="section-wrapper">
        <div class="section-header" @click="toggleContractInfo">
          <p class="section-title text-subtitle1 q-px-sm q-my-sm" :class="getDarkModeClass(darkMode)">
            {{ $t('ContractInformation', {}, 'Contract Information') }}
          </p>
          <q-icon 
            :name="showContractInfo ? 'expand_less' : 'expand_more'" 
            size="sm" 
            color="blue-grey-6"
            class="q-mr-sm" />
        </div>
        <q-list v-show="showContractInfo" class="pt-card payment-info-list" :class="getDarkModeClass(darkMode)">
          <!-- Arbiter -->
          <q-item>
            <q-item-section>
              <q-item-label caption class="text-caption">{{ $t('Arbiter') }}</q-item-label>
              <q-item-label class="payment-detail-text">{{ data?.arbiter?.name }}</q-item-label>
              <q-item-label caption class="text-caption q-mt-xs text-grey">{{ data?.arbiter?.address }}</q-item-label>
            </q-item-section>
          </q-item>

          <!-- Contract Address -->
          <q-item>
            <q-item-section>
              <q-item-label caption class="text-caption">{{ $t('ContractAddress') }}</q-item-label>
              <q-item-label class="payment-detail-text ellipsis">{{ contract?.address }}</q-item-label>
            </q-item-section>
            <q-item-section side v-if="contract?.address">
              <div class="row q-gutter-xs">
                <q-btn flat dense round size="sm" icon="content_copy" color="blue-grey-6" @click="copyToClipboard(contract?.address)"/>
              </div>
            </q-item-section>
          </q-item>

          <!-- Contract Balance -->
          <q-item>
            <q-item-section>
              <q-item-label caption class="text-caption">{{ $t('ContractBalance') }}</q-item-label>
              <q-item-label class="payment-detail-text">
                <span v-if="balanceLoaded">{{ contract?.balance }} BCH</span>
                <q-skeleton v-else type="text" width="100px" height="20px" />
              </q-item-label>
            </q-item-section>
          </q-item>

          <!-- Transaction ID -->
          <q-item>
            <q-item-section>
              <q-item-label caption class="text-caption">{{ $t('TransactionId') }}</q-item-label>
              <q-item-label class="payment-detail-text ellipsis">
                <span v-if="txidLoaded && transactionId">{{ transactionId }}</span>
                <q-skeleton v-else type="text" width="200px" height="20px" />
              </q-item-label>
            </q-item-section>
            <q-item-section side v-if="transactionId">
              <q-btn flat dense round size="sm" icon="content_copy" color="blue-grey-6" @click="copyToClipboard(transactionId)"/>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <div v-if="autoRetrying" class="info-box q-mx-xs q-my-sm" :class="darkMode ? 'info-box-dark' : 'info-box-light'">
        <q-spinner size="1.2em" class="q-pr-xs"/>
        <span class="q-ml-xs text-italic">{{ $t('RetryingXofY', { current: autoRetryCount, total: maxAutoRetries }, `Retrying ${autoRetryCount}/${maxAutoRetries}...`) }}</span>
      </div>
      <div v-if="errorMessage && !autoRetrying" class="warning-box q-mx-xs q-my-sm" :class="darkMode ? 'warning-box-dark' : 'warning-box-light'">
        <q-icon name="error" size="1.2em" class="q-pr-xs"/>{{ errorMessage }}
      </div>
      <div v-if="showRetryBtn" class="row q-mb-md">
        <q-btn
          rounded
          :loading="loading"
          :disable="disableBtn || autoRetrying"
          :label="$t('Retry')"
          class="col q-mx-lg button"
          @click="submitAction">
        </q-btn>
      </div>
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
        address: ''
      },
      transactionId: '',
      disableBtn: true,
      hideBtn: false,
      errorMessage: null,
      verifyingTx: false,
      txidLoaded: false,
      balanceLoaded: false,
      errorDialogActive: false,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100,
      autoRetryCount: 0,
      maxAutoRetries: 3,
      autoRetryDelay: 2000,
      autoRetrying: false,
      showContractInfo: false
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
      return this.txidLoaded &&
             this.balanceLoaded &&
             !this.hideBtn &&
             !this.autoRetrying &&
             this.autoRetryCount >= this.maxAutoRetries
    },
    autoRetryMessage () {
      if (this.autoRetrying && this.autoRetryCount <= this.maxAutoRetries) {
        return this.$t('RetryingXofY', { current: this.autoRetryCount, total: this.maxAutoRetries }, `Retrying ${this.autoRetryCount}/${this.maxAutoRetries}...`)
      }
      return null
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
    toggleContractInfo () {
      this.showContractInfo = !this.showContractInfo
    },
    async loadTransactionId () {
      if (!this.transactionId) {
        this.transactionId = this.$store.getters['ramp/getOrderTxid'](this.data?.orderId, this.data?.action)
      }
      if (!this.transactionId) {
        await this.fetchTransactions(this.data?.action)
      }
      console.log('transactionId:', this.transactionId)
      this.txidLoaded = true
    },
    loadContract () {
      this.fetchContract().then(() => {
        // Only fetch balance after contract address is loaded
        if (this.contract?.address) {
          this.fetchContractBalance()
        }
      })
    },
    fetchContractBalance () {
      return new Promise((resolve, reject) => {
        if (!this.data?.escrow) return 0
        // Use the escrow contract's own address by not passing any parameter
        // The RampContract will use its internally generated address
        this.data?.escrow?.getBalance()
          .then(balance => {
            this.contract.balance = balance
            this.balanceLoaded = true
            resolve(balance)
          })
          .catch(error => reject(error))
      })
    },
    async fetchTransactions (action) {
      const utxos = await this.data?.escrow?.getUtxos()
      if (utxos.length > 0) {
        let index = 1
        if (action === 'ESCROW') index = 0
        this.transactionId = utxos[index]?.tx_hash
      }
    },
    fetchContract () {
      return new Promise((resolve, reject) => {
        const vm = this
        vm.loading = true
        backend.get(`/ramp-p2p/order/${vm.data?.orderId}/contract/`, { authorize: true })
          .then(response => {
            vm.contract = response.data
            // If API doesn't return address, use the escrow contract's address
            if (!vm.contract?.address && vm.data?.escrow) {
              vm.contract.address = vm.data.escrow.getAddress()
            }
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

      try {
        await backend.post(`/ramp-p2p/order/${vm.data?.orderId}/verify-release/`, body, { authorize: true })
        // Success - emit success event
        vm.$emit('success')
      } catch (error) {
        vm.verifyingTx = false
        vm.errorMessage = error.response?.data?.error || 'Verification failed'

        // Attempt auto-retry
        await vm.attemptAutoRetry(vm.verifyRelease)
      }
    },
    async verifyEscrow () {
      const vm = this
      const body = { txid: vm.transactionId }
      vm.verifyingTx = true

      try {
        await backend.post(`/ramp-p2p/order/${vm.data?.orderId}/verify-escrow/`, body, { authorize: true })
        // Success - emit success event
        vm.$emit('success')
      } catch (error) {
        vm.verifyingTx = false

        if (error.response?.data?.error === 'txid is required') {
          vm.errorMessage = 'Transaction ID is required for verification'
          vm.autoRetrying = false
          vm.hideBtn = false
          vm.disableBtn = false
          vm.loading = false
        } else {
          // Other errors - attempt auto-retry
          vm.errorMessage = error.response?.data?.error || 'Verification failed'
          await vm.attemptAutoRetry(vm.verifyEscrow)
        }
      }
    },
    async attemptAutoRetry (verifyFunction) {
      const vm = this

      // Check if we can still auto-retry
      if (vm.autoRetryCount < vm.maxAutoRetries) {
        vm.autoRetryCount++
        vm.autoRetrying = true
        vm.errorMessage = vm.autoRetryMessage || vm.$t('RetryingVerification', {}, 'Retrying verification...')

        // Wait for the fixed delay
        await vm.delay(vm.autoRetryDelay)

        // Attempt verification again
        await verifyFunction.call(vm)
      } else {
        // Exhausted all auto-retries, show manual retry button
        vm.autoRetrying = false
        vm.hideBtn = false
        vm.disableBtn = false
        vm.errorMessage = vm.$t('VerificationFailedRetries', {}, 'Verification failed after multiple attempts. Please try again.')
      }
    },
    submitAction () {
      const vm = this

      // Reset auto-retry counter when manually clicking retry
      vm.autoRetryCount = 0
      vm.autoRetrying = false
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
.info-box {
  padding: 10px;
  border-radius: 5px;
}
.info-box-light {
  background-color: #e3f2fd; /* Light blue background */
  border: 1px solid #2196f3; /* Blue border */
  color: #1976d2; /* Blue text */
}
.info-box-dark {
  background-color: #1e3a5f; /* Dark blue background */
  border: 1px solid #64b5f6; /* Light blue border */
  color: #bbdefb; /* Light blue text */
}

// Section Title (matching PaymentConfirmation.vue)
.section-title {
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 0.5px;
  opacity: 0.85;
  
  &.dark {
    color: #e0e2e5;
  }
  &.light {
    color: rgba(0, 0, 0, 0.87);
  }
}

// Section Header (clickable to toggle contract info)
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  padding: 0 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
  
  &.dark:hover {
    background-color: rgba(255, 255, 255, 0.08);
  }
}

// Card Styling (matching PaymentConfirmation.vue)
.pt-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

// Payment Info List
.payment-info-list {
  .q-item {
    padding: 16px 20px;
    min-height: 60px;
    
    &:not(:last-child) {
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }
  }
  
  &.dark .q-item:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
}

.payment-detail-text {
  font-size: 15px;
  font-weight: 500;
  margin-top: 4px;
}
</style>
