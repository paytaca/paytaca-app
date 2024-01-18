<template>
  <q-card class="br-15 q-pt-sm q-mx-md q-mx-none q-my-lg" bordered flat
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]">
    <div>
      <q-btn
        flat
        padding="md"
        icon="close"
        @click="$emit('back')"
      />
    </div>
    <div class="text-center lg-font-size bold-text text-uppercase q-py-sm">Verifying Transfer</div>

    <q-separator class="q-my-sm q-mx-lg" :dark="darkMode"/>
    <div class="q-py-md q-mx-lg q-px-sm">
      <div class="sm-font-size q-pb-xs">Contract Address</div>
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
      <!-- <div class="sm-font-size q-pb-xs">Contract</div>
      <q-input class="q-pb-xs q-pb-lg" disable dense filled :dark="darkMode" v-model="contract">
      </q-input> -->
      <div>
        <div class="q-pb-xs">Contract Balance</div>
        <div @click="copyToClipboard(contract.balance)">
          <q-input
            class="q-pb-xs md-font-size"
            readonly
            dense
            filled
            :dark="darkMode"
            :loading="!balanceLoaded"
            v-model="contract.balance">
              <template v-slot:append>BCH</template>
          </q-input>
        </div>
      </div>

      <div class="sm-font-size q-pb-xs">Transaction ID</div>
      <q-input
        class="q-pb-xs"
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
        <q-card flat class="col q-pa-md" :class="[ darkMode ? 'text-white pt-dark-card-1' : 'text-black',]">
            <q-icon name="error" left/>
            {{ errorMessage }}
        </q-card>
      </div>
      <div class="row q-mb-md">
        <q-btn
          v-if="!loading && !hideBtn"
          rounded
          :disable="hideBtn"
          :label=btnLabel
          color="blue-6"
          class="col q-mx-lg q-mb-md q-my-sm"
          @click="submitAction">
        </q-btn>
        <div v-if="hideBtn && !errorMessage" class="q-mt-md">
          <span v-if="state === 'verifying'">
            <q-spinner class="q-mr-sm"/>Verifying, please wait. <span v-if="waitSeconds">({{ waitSeconds }}s)</span>
          </span>
          <span v-if="state === 'sending'">
            <q-spinner class="q-mr-sm"/>Sending bch, please wait.
          </span>
        </div>
      </div>
    </div>
  </q-card>
</template>
<script>
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/wallet/ramp/backend'
import { rampWallet } from 'src/wallet/ramp/wallet'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
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
      state: '',
      errorMessage: null,

      btnLabel: '',
      txidLoaded: false,
      balanceLoaded: false,
      disableTxidInput: true
    }
  },
  emits: ['back'],
  props: {
    orderId: {
      type: Number,
      default: null
    },
    amount: String,
    rampContract: Object,
    action: String,
    initState: String,
    txid: String,
    errors: Array
  },
  watch: {
    txidLoaded () {
      this.checkTransferStatus()
    },
    balanceLoaded (value) {
      this.checkTransferStatus()
    }
  },
  async mounted () {
    const vm = this
    vm.loadTransactionId()
    vm.loadContract()
    vm.loading = false
  },
  methods: {
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
      if (!this.rampContract) return 0
      this.rampContract.getBalance()
        .then(balance => {
          this.contract.balance = balance
          this.balanceLoaded = true
        })
    },
    fetchContract () {
      const vm = this
      vm.loading = true
      backend.get('/ramp-p2p/order/contract', {
        params: {
          order_id: vm.orderId
        },
        authorize: true
      })
        .then(response => {
          console.log(response.data)
          const data = response.data
          vm.contract.address = data.contract.address

          if (!vm.transactionId) {
            const transactions = data.transactions
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
          }
        })
    },
    async verify () {
      const vm = this
      let url = `/ramp-p2p/order/${vm.orderId}/`
      url = vm.action === 'RELEASE' ? `${url}verify-release` : `${url}verify-refund`
      vm.state = 'verifying'
      backend.post(url, { txid: this.transactionId }, { authorize: true })
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
          }
          this.btnLabel = 'VERIFY TRANSFER'
          vm.hideBtn = false
        })
    },
    async release () {
      const privateKeyWif = await rampWallet.privkey()
      this.state = 'sending'
      await this.rampContract.release(privateKeyWif, this.amount)
        .then(result => {
          if (result.success) {
            this.saveTxid(result)
            this.verify()
          } else {
            this.errorMessage = result.reason
            this.btnLabel = this.action
            this.hideBtn = false
          }
        })
    },
    async refund () {
      const privateKeyWif = await rampWallet.privkey()
      this.state = 'sending'
      await this.rampContract.refund(privateKeyWif, this.amount)
        .then(result => {
          if (result.success) {
            this.saveTxid(result)
            this.verify()
          } else {
            this.errorMessage = result.reason
            this.btnLabel = this.action
            this.hideBtn = false
          }
        })
    },
    saveTxid (result) {
      this.transactionId = result.txInfo?.txid
      const txidData = {
        id: this.orderId,
        txidInfo: {
          action: this.action,
          txid: this.transactionId
        }
      }
      this.$store.commit('ramp/saveTxid', txidData)
    },
    submitAction () {
      const vm = this
      vm.hideBtn = true
      vm.errorMessage = null
      switch (vm.action) {
        case 'REFUND':
          this.refund()
          break
        case 'RELEASE':
          this.release()
          break
        default:
          vm.verify()
          break
      }
    },
    checkTransferStatus () {
      if (this.balanceLoaded && this.txidLoaded) {
        if (this.contract.balance === 0) {
          if (!this.transactionId) {
            this.disableTxidInput = false
          }
          this.state = 'verifying'
          this.btnLabel = 'VERIFY TRANSFER'
          this.hideBtn = false
        } else if (!this.transactionId) {
          this.errorMessage = 'Failed to retrieve transaction id'
          this.submitAction()
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
