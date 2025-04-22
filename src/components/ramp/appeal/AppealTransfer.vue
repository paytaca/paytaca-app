<template>
  <div
    class="q-mx-md q-pt-sm text-bow"
    :class="getDarkModeClass(darkMode)">
    <div class="q-py-md q-px-sm">
      <div class="sm-font-size q-pb-xs text-italic">{{ $t('ContractAddress') }}</div>
      <q-input
        class="q-pb-sm"
        readonly
        :dark="darkMode"
        filled
        dense
        v-model="contract.address"
        :loading="!contract.address">
        <template v-slot:append>
          <div v-if="contract.address" @click="copyToClipboard(contract.address)">
            <q-icon size="sm" name='o_content_copy' color="blue-grey-6"/>
          </div>
        </template>
      </q-input>
      <div class="q-pb-xs text-italic">{{ $t('ContractBalance') }}</div>
      <div @click="copyToClipboard(contract.balance)">
        <q-input
          class="q-pb-sm md-font-size"
          readonly
          dense
          filled
          :dark="darkMode"
          :loading="!balanceLoaded"
          v-model="contract.balance">
            <template v-slot:append>BCH</template>
        </q-input>
      </div>
      <div class="sm-font-size q-pb-xs text-italic">{{ $t('TransactionId') }}</div>
      <q-input
        class="q-pb-sm"
        dense
        filled
        readonly
        :dark="darkMode"
        :loading="!txidLoaded"
        v-model="transactionId">
          <template v-slot:append v-if="transactionId">
            <q-icon size="sm" name="content_copy" @click="copyToClipboard(transactionId)"/>
          </template>
      </q-input>
      <div v-if="errorMessage" class="q-mx-sm q-my-sm">
        <q-card flat class="col q-pa-md pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
            <q-icon name="error" left/>
            {{ errorMessage }}
        </q-card>
      </div>
      <div class="row">
        <q-btn
          v-if="!loading && !hideBtn"
          rounded
          :disable="hideBtn"
          label="Retry"
          class="col q-mx-lg q-mb-md q-my-sm button"
          @click="submitAction">
        </q-btn>
      </div>
    </div>
  </div>
</template>
<script>
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/exchange/backend'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

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
      txExists: false,
      timer: null,
      waitSeconds: null,
      hideBtn: true,
      state: '',
      errorMessage: null,

      btnLabel: '',
      txidLoaded: false,
      balanceLoaded: false,
      disableTxidInput: true,
      verifyingTx: false
    }
  },
  emits: ['back', 'updatePageName', 'verifying-tx'],
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
    verifyingTx (value) {
      this.$emit('verifying-tx', value)
    }
  },
  async mounted () {
    const vm = this
    vm.$emit('updatePageName', 'appeal-transfer')
    vm.loadTransactionId()
    vm.loadContract()
    vm.loading = false
  },
  methods: {
    getDarkModeClass,
    async loadTransactionId () {
      if (this.data?.txid) {
        this.transactionId = this.data?.txid
      }
      if (!this.transactionId) {
        this.transactionId = this.$store.getters['ramp/getOrderTxid'](this.data?.orderId, this.data?.action)
      }
      if (this.transactionId) this.txidLoaded = true
    },
    loadContract () {
      this.fetchContract().then(this.fetchContractBalance())
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
    async fetchContract () {
      const vm = this
      await backend.get(`/ramp-p2p/order/${vm.data?.orderId}/contract/`, { authorize: true })
        .then(response => {
          vm.contract = response.data
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    async verify () {
      const vm = this
      let url = `/ramp-p2p/order/${vm.data?.orderId}/`
      url = vm.data?.action === 'RELEASE' ? `${url}verify-release/` : `${url}verify-refund/`
      vm.verifyingTx = true
      const body = { txid: this.transactionId }
      await backend.post(url, body, { authorize: true })
        .catch(error => {
          if (error.response) {
            vm.errorMessage = error.response?.data?.error
          }
          vm.hideBtn = false
        })
        .finally(() => { vm.verifyingTx = false })
    },
    submitAction () {
      const vm = this
      vm.hideBtn = true
      vm.errorMessage = null
      vm.verify()
    },
    checkTransferStatus () {
      if (this.balanceLoaded && this.txidLoaded) {
        this.verifyingTx = true
        if (this.contract.balance === 0) {
          this.submitAction()
        } else {
          this.verifyingTx = false
          // poll for balance with exponential backoff
          this.exponentialBackoff(this.fetchContractBalance, 5, 1000)
        }
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
    exponentialBackoff (fn, retries, delayDuration) {
      return fn()
        .then(balance => {
          if (balance > 0 && retries > 0) {
            console.log(`Attempt failed. Retrying in ${delayDuration / 1000} seconds...`)
            return this.delay(delayDuration)
              .then(() => this.exponentialBackoff(fn, retries - 1, delayDuration * 2))
          } else {
            this.disableBtn = false
          }
        })
        .catch(error => console.error(error))
    },
    handleRequestError (error) {
      if (error?.response?.data?.error === 'duplicate status') {
        console.error('Transaction already verified')
        return
      }
      bus.emit('handle-request-error', error)
    }
  }
}
</script>
<style scoped>
.md-font-size {
  font-size: medium;
}

</style>
