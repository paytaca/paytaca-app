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
        :readonly="disableTxidInput"
        :dark="darkMode"
        :loading="!txidLoaded"
        v-model="transactionId">
          <template v-slot:append v-if="transactionId && disableTxidInput">
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
        <div v-if="hideBtn && !errorMessage">
          <span v-if="state === 'verifying'">
            <q-spinner class="q-mr-sm"/>
            <span v-if="waitSeconds">
              {{
                $t(
                  'VerifyingWithSeconds',
                  { seconds: waitSeconds },
                  `Verifying, please wait. (${ waitSeconds }s)`
                )
              }}
            </span>
            <span v-else>{{ $t('VerifyingPleaseWait2') }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/wallet/ramp/backend'
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
      disableTxidInput: true
    }
  },
  emits: ['back', 'updatePageName'],
  props: {
    escrowContract: Object,
    orderId: Number,
    txid: String,
    action: String
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
    vm.$emit('updatePageName', 'appeal-transfer')
    vm.loadTransactionId()
    vm.loadContract()
    vm.loading = false
  },
  methods: {
    getDarkModeClass,
    loadTransactionId () {
      if (this.txid) {
        this.transactionId = this.txid
      }
      if (!this.transactionId) {
        this.transactionId = this.$store.getters['ramp/getOrderTxid'](this.orderId, this.action)
      }
    },
    loadContract () {
      this.fetchContractBalance()
      this.fetchContract()
    },
    fetchContractBalance () {
      if (!this.escrowContract) return 0
      this.escrowContract.getBalance()
        .then(balance => {
          this.contract.balance = balance
          this.balanceLoaded = true
        })
    },
    fetchContract () {
      const vm = this
      vm.loading = true
      backend.get('/ramp-p2p/order/contract', { params: { order_id: vm.orderId }, authorize: true })
        .then(response => {
          console.log(response.data)
          vm.contract = response.data
          if (!vm.transactionId) {
            const transactions = response.data.transactions
            const tx = transactions.filter(transaction => transaction.action === vm.action)
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
            bus.emit('network-error')
          }
        })
    },
    async verify () {
      const vm = this
      let url = `/ramp-p2p/order/${vm.orderId}/`
      url = vm.action === 'RELEASE' ? `${url}verify-release` : `${url}verify-refund`
      vm.state = 'verifying'
      const body = {
        txid: this.transactionId
      }
      setTimeout(function () {
        backend.post(url, body, { authorize: true })
          .then(response => {
            console.log(response.data)
          })
          .catch(error => {
            if (error.response) {
              console.error(error.response)
              if (error.response.status === 403) {
                bus.emit('session-expired')
              }
              vm.errorMessage = error.response?.data?.error
            } else {
              console.error(error)
              bus.emit('network-error')
            }
            vm.hideBtn = false
          })
      }, 5000)
    },
    submitAction () {
      const vm = this
      vm.hideBtn = true
      vm.errorMessage = null
      vm.verify()
    },
    checkTransferStatus () {
      if (this.balanceLoaded && this.txidLoaded) {
        if (this.transactionId) {
          if (this.contract.balance === 0) {
            this.submitAction()
          }
        }
        if (!this.transactionId || this.contract.balance > 0) {
          this.disableTxidInput = false
          this.hideBtn = false
        }
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
    }
  }
}
</script>
<style scoped>
.md-font-size {
  font-size: medium;
}

</style>
