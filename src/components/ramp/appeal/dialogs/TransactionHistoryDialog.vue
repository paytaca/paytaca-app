<template>
  <q-dialog v-model="showDialog" full-width @before-hide="$emit('back')">
    <q-card class="br-15 q-pa-md q-ma-sm text-bow" bordered flat :class="[darkMode ? 'pt-card-2 dark' : 'light']">
      <div class="q-mt-sm q-mx-md" style="overflow: auto">
        <div class="row justify-center q-mb-md text-center" style="font-size: medium;">Transaction History</div>
        <div v-for="(el, index) in transactions" :key=index>
          <div class="row no-wrap sm-font-size q-my-sm" :class="darkMode ? '' : 'text-grey-7'">
            <div class="col">
              <q-input hide-bottom-space readonly filled dense class="q-pa-none" :label="el.txn?.action" :hint="formatDate(el.txn?.created_at, false)" v-model="el.txn.txid">
                <template v-slot:append>
                  <q-icon flat dense class="col-auto" :color="el.txn?.valid ? 'green' : 'warning'" :name="el.txn?.valid ? 'check_circle' : 'pending'"/>
                  <q-icon size="sm" name='open_in_new' color="blue-grey-6" @click="openURL(explorerLink(el.txn?.txid))"/>
                </template>
              </q-input>
            </div>
          </div>
        </div>
        <div v-if="showTransactionForm">
          <q-select class="row col q-pa-none q-my-xs" behavior="menu" label="Action" dense filled :options="actionOpts" v-model="newTx.action"/>
          <q-input :rules="[val => isValidBchTxid(val) || 'Invalid transaction id' ]" hide-bottom-space class="row col q-pa-none" filled dense label="Transaction ID" v-model="newTx.txid"/>
        </div>
        <div class="row">
          <q-btn v-if="!showTransactionForm && transactions?.length < 2" class="col q-ma-sm" @click="showTransactionForm=true">Add transaction</q-btn>
        </div>
        <div v-if="showTransactionForm">
          <div class="row">
            <q-btn :disable="verifyingTx" class="col q-ma-sm" @click="showTransactionForm=false">Cancel</q-btn>
            <q-btn :disable="!isValidBchTxid(this.newTx?.txid) || !this.newTx.action" :loading="verifyingTx" class="col q-ma-sm" @click="onSubmitTransaction">Submit</q-btn>
          </div>
          <div class="row justify-center">
            <span class="q-mx-sm" style="color: red; overflow: auto;">{{ errorMessage }}</span>
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { formatOrderStatus, formatDate } from 'src/exchange'
import { openURL } from 'quasar'
import { backend } from 'src/exchange/backend'
import { bus } from 'src/wallet/event-bus'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      showDialog: true,
      showTransactionForm: false,
      actionOptsDefault: ['ESCROW', 'REFUND', 'RELEASE'],
      newTx: {
        action: null,
        txid: null
      },
      verifyingTx: false,
      errorMessage: null,
      transactions: [],
      appeal: null
    }
  },
  emits: ['back'],
  props: {
    data: Object
  },
  created () {
    bus.on('verify-tx', this.onVerifyTxUpdate)
  },
  mounted () {
    this.appeal = this.data?.appeal
    this.transactions = this.data?.transactions
  },
  computed: {
    actionOpts () {
      const excludedActions = this.transactions.map(el => el.txn.action)
      return this.actionOptsDefault.filter(el => !excludedActions.includes(el))
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    }
  },
  methods: {
    openURL,
    formatOrderStatus,
    formatDate,
    async onVerifyTxUpdate (data) {
      if (data?.success) {
        this.showTransactionForm = false 
        await this.fetchTransactions()
      } else {
        this.errorMessage = `Unable to verify that this transaction is valid as ${this.newTx.action}`
      }
      this.verifyingTx = false
    },
    async onSubmitTransaction () {
      bus.emit('manual-add-tx')
      this.verifyingTx = true
      this.errorMessage = null
      if (this.isValidBchTxid(this.newTx.txid)) {
        await this.setOrderPending(this.newTx?.action, this.appeal?.id)
        await this.verifyTransaction(this.newTx, this.appeal?.order?.id)
      } else {
        this.errorMessage = 'invalid txid'
      }
    },
    async setOrderPending (action, appealId) {
      const url = `/ramp-p2p/appeal/${appealId}/pending-${action.toLowerCase()}/`
      await backend.post(url, {}, { authorize: true })
        .catch(error => { 
          console.error(error)
        })
    },
    async verifyTransaction (tx, orderId) {
      let action = tx.action.toLowerCase()
      let url = `/ramp-p2p/order/${orderId}/verify-${action}/`
      const body = { txid: tx?.txid }
      console.log('url', url)
      console.log('body', body)
      await backend.post(url, body, { authorize: true })
        .catch(error => {
          console.error(error.response || error)
          if (error.response) {
            this.errorMessage = error.response?.data?.error
          }
          throw new Error(error)
        })
    },
    async fetchTransactions () {
      const orderId = this.appeal?.order?.id
      await backend.get(`/ramp-p2p/order/${orderId}/contract/transactions/`, { authorize: true })
        .then(response => {
          this.transactions = response.data
        })
        .catch(error => {
          console.error(error.response || error)
        })
    },
    isValidBchTxid (txid) {
      return typeof txid === 'string' && /^[a-fA-F0-9]{64}$/.test(txid)
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        color: 'blue-9',
        message: this.$t('CopiedToClipboard'),
        icon: 'mdi-clipboard-check',
        timeout: 200
      })
    },
    explorerLink (txid) {
      let url = 'https://blockchair.com/bitcoin-cash/transaction/'

      if (this.isChipnet) {
        url = 'https://chipnet.imaginary.cash/tx/'
      }
      return `${url}${txid}`
    }
  }
}
</script>
