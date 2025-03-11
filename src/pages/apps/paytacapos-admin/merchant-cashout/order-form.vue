<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshData"
  >
    <HeaderNav
      :title="'Merchant Cash Out'"
      class="header"
    />

    <!-- Transaction List -->
    <div>
      <div v-if="status === 'confirm-transaction'">
        <div class="text-center md-font-size text-bold">Cash Out Transactions</div>

        <div>
          <q-list class="scroll-y" @touchstart="preventPull" ref="scrollTarget" :style="`max-height: ${minHeight - 170}px`" style="overflow:auto;">
            <!-- Cashout Order -->
            <!-- <q-card flat class="q-mx-lg q-mt-sm"> -->
              <q-item v-for="(tx, index) in transactionList" :key="index" clickable @click="selectTransaction(index)">
                <q-item-section>
                  <div class="q-px-sm q-mx-lg" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                    <div class="sm-font-size text-grey-6 text-strike">
                      {{ formatCurrency(getInitialFiatAmount(tx), currency.symbol) }} {{ currency.symbol }}
                    </div>
                    <div class="row">
                      <div class="col ib-text">
                        <div class="md-font-size text-bold" :class="getFiatAmountColor(tx)">
                          {{ formatCurrency(getCurrentFiatAmount(tx), currency.symbol).replace(/[^\d.,-]/g, '') }} {{ currency.symbol }}
                          <q-icon :name="getTrendingIcon(tx)"/>
                        </div>
                        <div class="sm-font-size">
                          {{ tx.amount }} BCH
                        </div>
                      </div>
                      <div class="col ib-text text-right q-pr-sm">
                        <div class="text-bold" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                          <span>{{ tx.transaction?.txid?.substring(0,8) }}</span>
                          <q-icon color="primary" size="sm" name="o_check_box" v-if="isTxnSelected(tx)"/>
                        </div>
                        <div class="text-grey-6 sm-font-size">
                          <q-icon name="local_police" class="q-pa-xs"/>
                          <span>{{ lossProtection(tx) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </q-item-section>
              </q-item>
            <!-- </q-card> -->
          </q-list>
        </div>
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
                  <span class="q-px-md" :class="darkMode ? 'text-grey-5' : 'text-grey-8'" v-for="(item, index) in paymentMethod.values" :key="index" @click="copyToClipboard(item.value)">
                    {{ item.value }} <q-icon size="xs" name="content_copy"/> <br>
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

        <div class="q-mx-lg q-pt-xs">
          <q-card class="full-width q-px-lg br-15 q-py-sm">
            <div class="text-bold sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
              {{ transactions.length }} Transactions
            </div>
            <div class="row q-pt-sm sm-font-size q-pb-sm">
              <div class="col-8 text-bold">
                <span>Initial Total</span><br>
                <span>Market Volatility Loss/Gain</span><br>
                <span>Loss Covered</span>
              </div>
              <div class="col text-right">
                <span>{{ cashOutTotal.initialTotal }} {{ currency.symbol }}</span><br>
                <span :class="cashOutTotal.lossGain < 0 ? 'text-red' : 'text-green'">
                  {{ cashOutTotal.lossGain }} {{ currency.symbol }}
                </span><br>
                <span>{{ cashOutTotal.lossCovered }} {{ currency.symbol }}</span>
              </div>
            </div>

            <div v-if="cashOutTotal.initialTotal !== cashOutTotal.currentTotal"
              class="text-strike text-right sm-font-size"
              :class="darkMode ? 'text-white' : 'text-grey-6'">
              {{ cashOutTotal.initialTotal }} {{ currency.symbol }}
            </div>
            <div class="row q-pb-sm md-font-size text-bold">
              <div class="col">
                <span>TOTAL</span>
              </div>
              <div class="text-right" >
                <span>{{ cashOutTotal.currentTotal }} {{ currency.symbol }}</span>
              </div>
            </div>
            <q-separator class="q-mb-sm"/>
            <div class="text-right sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
              {{ cashOutTotal.totalBchAmount }} BCH
            </div>
          </q-card>
        </div>
        <div class="full-width text-center q-px-lg q-py-sm">
          <q-btn v-if="status === 'confirm-transaction'" label="Proceed" class="full-width q-mx-lg" rounded color="primary" @click="openDialog = true" :disable="!paymentMethod"/>
          <!-- <q-btn v-if="status === 'confirm-payment-method'" label="Cash Out" class="full-width q-mx-lg" rounded color="primary" @click="openDialog = true"/> -->
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
          <q-btn flat :label="$t('OK')" color="red-6" @click="$router.push({ name: 'app-pos-cashout' })" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-pull-to-refresh>
</template>
<script>
import { formatCurrency, formatNumber } from 'src/exchange'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/wallet/pos'
import CashoutTransactionBuilder from 'src/merchant-cashout'
import HeaderNav from 'src/components/header-nav.vue'
import CashoutPaymentMethodDialog from 'src/components/paytacapos/CashoutPaymentMethodDialog.vue'
import { loadLibauthHdWallet } from 'src/wallet'
import Watchtower from 'src/lib/watchtower'

export default {
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
      merchant: null
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
  emits: ['select-payment-method'],
  components: {
    HeaderNav
  },
  props: {
    data: Array
  },
  async mounted () {
    await this.loadWallet()
    this.paymentMethod = this.lastPaymentMethod
    this.transactions = JSON.parse(history.state.selectedTransactions)
    this.transactionList = this.transactions
    this.calculateCashOutTotal(this.transactions)
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
    calculateCashOutTotal (transactions) {
      let initialTotal = 0
      let currentTotal = 0
      let lossGain = 0
      let lossCovered = 0
      let totalBchAmount = 0
      transactions.forEach(tx => {
        const initMarketPrice = tx.fiat_price?.initial[this.currency.symbol]
        const initFiatAmount = tx.amount * initMarketPrice
        initialTotal += initFiatAmount

        const currMarketPrice = tx.fiat_price?.current[this.currency.symbol]
        const currFiatAmount = tx.amount * currMarketPrice
        currentTotal += currFiatAmount

        const isLossProtected = this.lossProtection(tx) !== 'Expired'
        if (currentTotal < initialTotal && isLossProtected) {
          const gap = initFiatAmount - currFiatAmount
          lossCovered += gap
        }
        totalBchAmount += tx.amount
      })
      lossGain = currentTotal - initialTotal
      currentTotal += lossCovered

      this.cashOutTotal = {
        initialTotal: formatNumber(initialTotal) || initialTotal,
        currentTotal: formatNumber(currentTotal) || currentTotal,
        lossGain: formatNumber(lossGain) || lossGain,
        lossCovered: formatNumber(lossCovered) || lossCovered,
        totalBchAmount: formatNumber(totalBchAmount) || totalBchAmount
      }
    },
    lossProtection (transaction) {
      const txTime = new Date(transaction.tx_timestamp)
      const expirationDate = new Date(txTime)
      expirationDate.setDate(txTime.getDate() + 30)

      const now = new Date()
      const timeLeft = expirationDate - now

      const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
      const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
      const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000)

      if (daysLeft > 0) {
        return `${daysLeft} days left`
      }

      if (hoursLeft > 0) {
        return `${hoursLeft} hours left`
      }

      if (minutesLeft > 0) {
        return `${minutesLeft} minutes left`
      }

      if (secondsLeft > 0) {
        return `${secondsLeft} seconds left`
      }

      return 'Expired'
    },
    async cashOutUtxos () {
      const selectedUtxos = this.transactions
      const txBuilder = new CashoutTransactionBuilder()
      const utxos = selectedUtxos.map(el => el.transaction)

      const result = await txBuilder.sendUtxos({
        sender: this.wallet,
        broadcast: true,
        utxos: utxos
      })

      const outputTxid = result.txid
      const txids = utxos.map(el => el.txid)
      const order = await this.createCashoutOrder({ payoutAddress: result.payoutAddress, txids: txids })
      await this.manualProcessTxn(outputTxid)
      await this.addCashoutAttributeTx(result.txid)
      await this.saveOutputTx({ order_id: order.id, txids: [outputTxid] })
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
    async createCashoutOrder ({ payoutAddress, txids }) {
      const url = '/paytacapos/cash-out/'
      const body = {
        payment_method_id: this.paymentMethod.id,
        merchant_id: this.merchant.id,
        currency: this.currency.symbol,
        payout_address: payoutAddress,
        txids: txids
      }

      const response = await backend.post(url, body, { authorize: true })
        .catch(error => {
          console.error(error.response || error)
        })

      this.orderStatus = 'success'
      this.openDialog = true
      return response.data
    },
    getInitialFiatAmount (transaction) {
      const marketPrice = transaction?.fiat_price?.initial[this.currency?.symbol]
      return transaction?.amount * marketPrice
    },
    getCurrentFiatAmount (transaction) {
      const marketPrice = transaction?.fiat_price?.current[this.currency?.symbol]
      return transaction?.amount * marketPrice
    },
    getFiatAmountColor (transaction) {
      const currentFiatPrice = transaction?.fiat_price?.current[this.currency?.symbol]
      const initialFiatPrice = transaction?.fiat_price?.initial[this.currency?.symbol]
      if (currentFiatPrice < initialFiatPrice) return 'text-red'
      if (currentFiatPrice > initialFiatPrice) return 'text-green'
      return 'text-blue'
    },
    getTrendingIcon (transaction) {
      const currentFiatPrice = transaction?.fiat_price?.current[this.currency?.symbol]
      const initialFiatPrice = transaction?.fiat_price?.initial[this.currency?.symbol]
      if (currentFiatPrice > initialFiatPrice) return 'trending_up'
      if (currentFiatPrice < initialFiatPrice) return 'trending_down'
      return ''
    },
    isTxnSelected (transaction) {
      return transaction.selected
    },
    async refreshData (done) {
      done()
    },
    selectTransaction (index) {
      this.transactionList[index].selected = !this.transactionList[index].selected

      if (this.transactionList[index].selected) {
        this.transactions.push(this.transactionList[index])
      } else {
        this.transactions = this.transactions.filter(tx => tx.txid !== this.transactionList[index].txid)
      }

      this.calculateCashOutTotal(this.transactions)
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
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    preventPull (e) {
      let parent = e.target
      // eslint-disable-next-line no-void
      while (parent !== void 0 && !parent.classList.contains('scroll-y')) {
        parent = parent.parentNode
      }
      // eslint-disable-next-line no-void
      if (parent !== void 0 && parent.scrollTop > 0) {
        e.stopPropagation()
      }
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
