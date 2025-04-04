<template>
  <div
    id="app-container"
    :class="[getDarkModeClass(darkMode), darkMode ? 'text-grey-2' : 'text-grey-10']">
    <HeaderNav :title="'Merchant Cash Out'" class="header"/>
    <div>
      <div v-if="status === 'confirm-transaction'"
        class="q-mx-sm"
        :style="`max-height: ${minHeight - 170}px; overflow:auto;`">
        <SelectedTransactionsList 
          :transactions="transactions" 
          :currency="currency.symbol" 
          @select="selectTransaction" 
          @unselect="unselectTransaction" />
      </div>

      <!-- Footer order summary card -->
      <div class="footer-card-btn">
        <!-- Selected Payment Method -->
        <div class="q-px-lg">
          <q-card class="full-width br-15">
            <div class="md-font-size text-blue q-px-md q-py-xs text-bold text-center">
              Payment Method
            </div>
            <q-separator class="q-mx-md"/>
            <div v-if="paymentMethod">
              <div class="row">
                <div class=" col-8 q-px-lg q-py-sm">
                  <span class="text-bold q-pl-sm">{{ paymentMethod.payment_type.full_name }}</span><br>
                  <span class="q-px-md" :class="darkMode ? 'text-grey-5' : 'text-grey-8'" v-for="(item, index) in paymentMethod.values" :key="index">
                    {{ item.value }} <br>
                  </span>
                </div>
                <div class="col-4 q-py-sm">
                  <span><q-btn round size="sm" color="primary" icon="edit" @click="openPaymentMethodDialog()"/></span>&nbsp;
                  <span><q-btn round size="sm" outline color="primary" icon="close" @click="paymentMethod = null"/></span>
                </div>
              </div>
            </div>
            <div v-else>
              <div class="text-center text-grey-6 q-py-xs">
                No Payment Method Selected...
              </div>
              <div class="q-mx-lg q-pb-sm">
                <q-btn rounded outline color="primary" class="full-width" label="Add Payment Method" @click="openPaymentMethodDialog()"/>
              </div>
            </div>
          </q-card>
        </div>
        <OrderPayoutCard :key="orderPayoutCardKey" :transactions="transactions" :currency="currency?.symbol"/>
        <div class="full-width text-center q-px-lg q-py-sm">
          <q-btn v-if="status === 'confirm-transaction'"
            rounded
            label="Proceed"
            color="primary" 
            class="full-width q-mx-lg"
            :disable="!paymentMethod || transactions.length === 0"
            @click="openDialog = true"/>
        </div>
      </div>
    </div>
    <q-dialog v-model="openDialog">
      <q-card class="br-15 pt-card-2 text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
        <q-card-section>
          <div class="text-h6 text-center">{{ dialogTitle }}</div>
        </q-card-section>

        <q-card-section class="text-center q-pt-none">
          {{ dialogText }}
        </q-card-section>

        <q-card-actions class="text-center" align="center" v-if="orderStatus === 'pending'">
          <q-btn flat :label="$t('Cancel')" color="red-6" @click="$emit('back')" v-close-popup />
          <q-btn
            flat
            :label="$t('OK')"
            :class="getDarkModeClass(darkMode) + ' button button-text-primary'"
            v-close-popup
            @click="cashOutUtxos()"
          />
        </q-card-actions>

        <q-card-actions class="text-center" align="center" v-if="orderStatus === 'success'">
          <q-btn flat :label="$t('OK')" color="red-6" @click="$router.back()" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>
<script>
import { formatCurrency, formatNumber } from 'src/exchange'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/wallet/pos'
import { loadLibauthHdWallet } from 'src/wallet'
import CashoutTransactionBuilder from 'src/merchant-cashout'
import HeaderNav from 'src/components/header-nav.vue'
import CashoutPaymentMethodDialog from 'src/components/paytacapos/merchant-cash-out/CashoutPaymentMethodDialog.vue'
import OrderPayoutCard from 'src/components/paytacapos/merchant-cash-out/OrderPayoutCard.vue'
import SelectedTransactionsList from 'src/components/paytacapos/merchant-cash-out/SelectedTransactionsList.vue'
import Watchtower from 'src/lib/watchtower'

export default {
  components: {
    HeaderNav,
    OrderPayoutCard,
    SelectedTransactionsList
  },
  data () {
    return {
      transactions: [],
      transactionList: [],
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 320 : this.$q.screen.height - 290,
      currency: { name: 'PHP', symbol: 'PHP' },
      status: 'confirm-transaction',
      openDialog: false,
      text: '',
      paymentMethod: null,
      cashOutTotal: {},
      openPaymentMethod: false,
      orderStatus: 'pending',
      wallet: null,
      merchant: null,
      orderPayoutCardKey: 0
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    lastPaymentMethod () {
      return this.$store.getters['paytacapos/lastPaymentMethod']
    },
    dialogText () {
      if (this.orderStatus === 'success') {
        return 'This amount of BCH has been sent, please wait for your cash out order to be processed. You will receive payment shortly.'
      } else {
        return ''
      }
    },
    dialogTitle () {
      if (this.orderStatus === 'success') {
        return 'Success!'
      } else {
        return 'Confirm Order'
      }
    },
    merchantName () {
      return history.state.merchantName
    }
  },
  watch: {
    transactions () {
      this.orderPayoutCardKey++
    }
  },
  emits: ['select-payment-method'],
  props: {
    data: Array
  },
  async mounted () {
    await this.loadWallet()
    this.paymentMethod = this.lastPaymentMethod
    this.transactions = JSON.parse(history.state.selectedTransactions)
    this.transactionList = this.transactions
    this.merchant = this.$store.getters['paytacapos/cashoutMerchant']
  },
  methods: {
    formatCurrency,
    formatNumber,
    getDarkModeClass,
    async loadWallet () {
      const isChipnet = this.$store.getters['global/isChipnet']
      const walletIndex = this.$store.getters['global/getWalletIndex']
      const wallet = await loadLibauthHdWallet(walletIndex, isChipnet)
      this.wallet = wallet
    },
    async cashOutUtxos () {
      const selectedUtxos = this.transactions
      const utxos = selectedUtxos.map(el => el.transaction)
      const txids = utxos.map(el => el.txid)
      try {
        this.showLoading()
        const order = await this.createCashoutOrder(txids)
        const txBuilder = new CashoutTransactionBuilder()
        const result = await txBuilder.sendUtxos({
          sender: this.wallet,
          payoutAddress: order.payout_address,
          broadcast: true,
          utxos: utxos
        })

        if (result.success) {
          const outputTxid = result.txid
          if (outputTxid) {
            await this.manualProcessTxn(outputTxid)
            await this.addCashoutAttributeTx(result.txid)
            await this.saveOutputTx({ order_id: order.id, txid: outputTxid })
          }
        }
        this.hideLoading()
        this.orderStatus = 'success'
        this.openDialog = true
      } catch (error) {
        console.error(error.response || error)
      }

    },
    async saveOutputTx (payload) {
      await backend.post('/paytacapos/cash-out/save_output_tx/', payload, { authorize: true })
        .catch(error => { console.error(error.response || error) })
    },
    async manualProcessTxn (txid) {
      await backend.get('/stablehedge/test-utils/process_tx/', { params: { txid: txid } })
        .then(response => { console.log(response.data) })
        .catch(error => { console.error(error.response || error) })
    },
    async addCashoutAttributeTx (txid) {
      /** Adds attribute to mark a transaction as a tx made for merchant_cashout
       * Better to add this in backend.
       */
      const payload = {
        txid: txid,
        key: 'merchant_cashout',
        value: this.merchant.name
      }

      const watchtower = new Watchtower()
      await watchtower.BCH._api.post('/transactions/attributes/', payload)
        .catch(error => { console.error(error.response || error) })
    },
    async createCashoutOrder (txids) {
      const url = '/paytacapos/cash-out/'
      const body = {
        payment_method_id: this.paymentMethod.id,
        merchant_id: this.merchant.id,
        currency: this.currency.symbol,
        txids: txids
      }

      const response = await backend.post(url, body, { authorize: true })
        .catch(error => {
          console.error(error.response || error)
        })

      return response.data
    },
    selectTransaction (tx) {
      this.transactions.push(tx)
    },
    unselectTransaction (tx) {
      this.transactions = this.transactions.filter(el => 
        el.transaction?.txid !== tx.transaction?.txid
      )
    },
    openPaymentMethodDialog () {
      // this.openPaymentMethod = true
      this.$q.dialog({
        component: CashoutPaymentMethodDialog,
        componentProps: {
          currency: this.currency.symbol,
          selectedPM: this.paymentMethod
        }
      })
        .onOk(method => {
          this.paymentMethod = method
          this.$store.commit('paytacapos/updateLastPaymentMethod', method)
        })
    },
    showLoading () {
      this.$q.loading.show({
        message: 'Sending BCH...',
        boxClass: this.darkMode ? 'bg-grey-9 text-grey-2' : 'bg-grey-2 text-grey-9',
        spinnerColor: this.darkMode ? 'white' : 'primary'
      })
    },
    hideLoading () {
      this.$q.loading.hide()
    }
  }
}
</script>
<style lang="scss" scoped>
  .sm-font-size {
    font-size: small;
  }
  .md-font-size {
    font-size: medium;
  }
  .lg-font-size {
    font-size: large;
  }
  .footer-card-btn {
    position: fixed;
    bottom: 10px;
    width: 100%;
  }
</style>
