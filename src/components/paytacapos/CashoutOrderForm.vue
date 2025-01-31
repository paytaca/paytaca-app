<template>
  <!-- Transaction List -->
  <div>
    <div v-if="status === 'confirm-transaction'">
      <div class="text-center md-font-size text-bold">Cash Out Transactions</div>

      <q-pull-to-refresh @refresh="refreshData">
        <!-- <q-list class="scroll-y" @touchstart="preventPull" ref="scrollTarget" :style="`max-height: ${minHeight - 100}px`" style="overflow:auto;"> -->
          <!-- Cashout Order -->
          <!-- <q-card flat class="q-mx-lg q-mt-sm"> -->
            <!-- <q-item v-for="(transaction, index) in transactions" :key="index" clickable @click="''">
              <q-item-section>
                <div class="q-px-sm q-mx-lg" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                  <div class="sm-font-size text-grey-6 text-strike">
                    {{ formatCurrency(getInitialFiatAmount(transaction), currency.symbol) }} {{ currency.symbol }}
                  </div>
                  <div class="row">
                    <div class="col ib-text">
                      <div class="md-font-size text-bold" :class="getFiatAmountColor(transaction)">
                        {{ formatCurrency(getCurrentFiatAmount(transaction), currency.symbol).replace(/[^\d.,-]/g, '') }} {{ currency.symbol }}
                        <q-icon :name="getTrendingIcon(transaction)"/>
                      </div>
                      <div class="sm-font-size">
                        {{ transaction.amount }} BCH
                      </div>
                    </div>
                    <div class="col ib-text text-right q-pr-sm">
                      <div class="text-grey-8 text-bold">
                        <span>{{ transaction.txid.substring(0,8) }}</span>
                        <q-icon color="primary" size="sm" name="o_check_box" v-if="isTxnSelected(transaction)"/>
                      </div>
                      <div class="text-grey-6 sm-font-size">
                        <q-icon name="local_police" class="q-pa-xs"/>
                        <span>{{ lossProtection(transaction) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </q-item-section>
            </q-item> -->
          <!-- </q-card> -->
        <!-- </q-list> -->
        <UnspentTransactionList :transactions="transactions" :currency="currency.symbol" @select="() => {}"/>
      </q-pull-to-refresh>
    </div>

    <!-- Payment Method -->
    <div v-if="status === 'confirm-payment-method'">
      <div class="text-center md-font-size text-grey-9 text-bold">Setup Payment Method</div>

      <q-card v-if="!paymentLoading" class="q-my-md q-mx-lg br-15">
        <q-scroll-area :style="`height: ${minHeight-110}px; max-width: 100%;`">
          <div class="q-py-md q-px-lg">
            <div class="q-pb-sm">
              <div class="q-pb-xs">Payment Type</div>
              <q-select
                dense
                outlined
                flat
                v-model="selectedPaymentType"
                option-label="full_name"
                :options="paymentTypeOpts"
                :dark="darkMode"
              />
            </div>
            <div v-for="(fieldVal, index) in selectedPaymentMethod.values" :key="index">
              <div class="q-pb-xs">{{ fieldVal.field_reference?.fieldname }}</div>
              <q-input
                dense
                outlined
                flat
                hide-bottom-space
                class="q-py-xs"
                :dark="darkMode"
                v-model="fieldVal.value"
                :rules="[
                    val => isValidIdentifier(val, fieldVal.field_reference?.fieldname, fieldVal.payment_type?.required)
                  ]"
              />
            </div>
          </div>
          <div class="row">
            <q-btn :loading="savingPaymentMethod" class="col" label="save" @click="onSavePaymentMethod"/>
          </div>
        </q-scroll-area>
      </q-card>

    </div>

    <div class="footer-card-btn">
      <div class="q-mx-lg q-pt-md">
        <q-card class="full-width q-px-lg br-15 q-py-md">
          <div class="md-font-size text-grey-8">
            {{ transactions.length }} Transactions
          </div>
          <div class="row q-pt-sm sm-font-size q-pb-md">
            <div class="col-8 text-bold">
              <span>Initial Total</span><br>
              <span>Market Volatility Loss/Gain</span><br>
              <span>Loss Covered</span>
            </div>
            <div class="col text-right">
              <span>
                {{ formatCurrency(cashOutTotal.initialTotal?.toFixed(2), currency.symbol) }} {{ currency.symbol }}
              </span><br>
              <span :class="cashOutTotal.lossGain < 0 ? 'text-red' : 'text-green'">
                {{ formatCurrency(cashOutTotal.lossGain?.toFixed(2), currency.symbol) }} {{ currency.symbol }}
              </span><br>
              <span>{{ formatCurrency(cashOutTotal.lossCovered?.toFixed(2), currency.symbol) }} {{ currency.symbol }}</span>
            </div>
          </div>

          <div class="text-strike text-grey-6 text-right sm-font-size">
            {{ formatCurrency(cashOutTotal.totalBeforeLossProtection?.toFixed(2), currency.symbol) }} {{ currency.symbol }}
          </div>
          <div class="row q-pb-sm">
            <div class="col md-font-size text-bold">
              <span>TOTAL</span>
            </div>
            <div class="text-right">
              <span>{{ formatCurrency(cashOutTotal.currentTotal?.toFixed(2), currency.symbol).replace(/[^\d.,-]/g, '') }} {{ currency.symbol }}</span>
            </div>
          </div>
          <q-separator class="q-mb-sm"/>
          <div class="text-right text-grey-8 sm-font-size">
            {{ Number(cashOutTotal.totalBchAmount?.toFixed(8)) }} BCH
          </div>
        </q-card>
      </div>
      <div class="full-width text-center q-px-lg q-py-sm">
        <q-btn v-if="status === 'confirm-transaction'" label="Proceed" class="full-width q-mx-lg" rounded color="primary" @click="onSetupPayment"/>
        <q-btn v-if="status === 'confirm-payment-method'" label="Cash Out" class="full-width q-mx-lg" rounded color="primary" @click="openDialog = true"/>
      </div>
    </div>
  </div>
  <q-dialog v-model="openDialog">
    <q-card class="br-15 pt-card-2 text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="text-h6 text-center">Sucess!</div>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        {{ dialogText }}
      </q-card-section>

      <q-card-actions class="text-center" align="center">
        <q-btn flat :label="$t('Cancel')" color="red-6" @click="$emit('back')" v-close-popup />
        <q-btn
          flat
          :label="$t('OK')"
          :class="getDarkModeClass(darkMode) + ' button button-text-primary'"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script>
import { formatCurrency } from 'src/exchange'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { backend as posBackend } from 'src/wallet/pos'
import UnspentTransactionList from './UnspentTransactionList.vue'

export default {
  components: {
    UnspentTransactionList
  },
  data () {
    return {
      transactions: [],
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 320 : this.$q.screen.height - 290,
      currency: { name: 'PHP', symbol: 'PHP' },
      status: 'confirm-transaction',
      openDialog: false,
      text: '',
      paymentTypeOpts: [],
      paymentMethodOpts: [],
      selectedPaymentType: {},
      selectedPaymentMethod: {},
      cashOutTotal: {},
      paymentLoading: false,
      savingPaymentMethod: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    dialogText () {
      return 'This amount of BCH has been sent, please wait for your cash out order to be processed. You will receive payment shortly.'
    }
  },
  watch: {
    selectedPaymentType (val) {
      this.updatePaymentType(val)
    }
  },
  emits: ['select-payment-method'],
  props: {
    data: Array
  },
  mounted () {
    this.transactions = this.data
    this.calculateCashOutTotal(this.transactions)
    this.updatePaymentMethod()
  },
  methods: {
    formatCurrency,
    getDarkModeClass,
    async refreshData (done) {
      done()
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
    },
    totalCashout (isFiat = true) {
      if (!isFiat) return 0.57

      let sum = 0

      for (const key in this.orderInfo) {
        sum += this.orderInfo[key]
      }

      return sum
    },
    isValidIdentifier (val, format, required = false) {
      if (required && !val) return this.$t('FieldRequired')
      switch (format) {
        case 'Email Address':
          if (/^[\w\\.~!$%^&*=+}{'?-]+@([\w-]+\.)+[\w-]{2,4}$/.test(val)) {
            return true
          } else {
            return this.$t('InvalidEmailAddress')
          }
        case 'Mobile Number':
          if (/^(\d{9,15})$/.test(val)) {
            return true
          } else {
            return this.$t('InvalidPhoneNumber')
          }
        case 'Bank Account Number':
          if (/^(\d{9,35})$/.test(val)) {
            return true
          } else {
            return this.$t('InvalidAccountNumber')
          }
        default:
          return true
      }
    },
    equivalentAmount () {
      let amount = this.totalCashout()
      if (amount === '' || isNaN(amount)) return 0

      // if (!this.byFiat) {
      //   amount = Number((amount) * parseFloat(this.ad.price)).toFixed(2)
      // } else {
      //   amount = Number(parseFloat(amount) / parseFloat(this.ad.price)).toFixed(8)
      // }
      return Number(amount)
    },
    async fetchPaymentMethods () {
      const vm = this
      const url = '/paytacapos/payment-method/'
      await posBackend.get(url, {
        params: { currency: this.currency?.symbol }
      })
        .then(response => {
          console.log(response)
          vm.paymentMethodOpts = response.data
        })
        .catch(error => {
          console.log(error)
        })
    },
    async fetchPaymentTypes () {
      await posBackend.get('/ramp-p2p/payment-type/', {
        params: { currency: this.currency?.symbol },
        authorize: true
      })
        .then(response => {
          this.paymentTypeOpts = response.data
        })
        .catch(error => {
          console.error(error.response || error)
        })
    },
    async onSavePaymentMethod () {
      this.savingPaymentMethod = true
      await this.savePaymentMethod()
      await this.fetchPaymentMethods()
      this.savingPaymentMethod = false
    },
    async savePaymentMethod () {
      const fieldValues = []
      this.selectedPaymentMethod.values.forEach(field => {
        fieldValues.push({
          field_reference: field.field_reference.id,
          value: field.value
        })
      })
      const payload = {
        payment_type_id: this.selectedPaymentMethod.payment_type.id,
        values: fieldValues
      }
      await posBackend.post('/paytacapos/payment-method/', payload, { authorize: true })
        .then(response => {
          console.log(response.data)
          this.selectedPaymentMethod = response.data
        })
        .catch(error => {
          console.error(error.response || error)
        })
    },
    async onSetupPayment () {
      this.paymentLoading = true
      this.status = 'confirm-payment-method'
      await this.fetchPaymentMethods()
      await this.fetchPaymentTypes()
      let paymentMethod = this.$store.getters['paytacapos/paymentMethod']
      console.log('paymentMethod:', !paymentMethod)
      if (!paymentMethod) {
        if (this.paymentMethodOpts.length > 0) {
          paymentMethod = this.paymentMethodOpts[0]
          this.selectedPaymentType = paymentMethod.payment_type
          this.updatePaymentMethod(paymentMethod)
        } else {
          this.updatePaymentType()
        }
      }
      this.paymentLoading = false
    },
    updatePaymentType (paymentType = null) {
      if (!paymentType) {
        this.selectedPaymentType = this.paymentTypeOpts[0]
      }

      let selectedPaymentMethod = null
      if (this.paymentMethodOpts.length > 0) {
        // find the payment method matching selected payment type
        selectedPaymentMethod = this.paymentMethodOpts.find(el => el.payment_type?.id === paymentType.id)
      }
      if (!selectedPaymentMethod) {
        const paymentMethod = {
          payment_type: paymentType,
          values: []
        }
        paymentType.fields.forEach(field => {
          paymentMethod.values.push({
            field_reference: field,
            value: null
          })
        })
        selectedPaymentMethod = paymentMethod
      }
      this.updatePaymentMethod(selectedPaymentMethod)
    },
    updatePaymentMethod (paymentMethod = null) {
      this.selectedPaymentMethod = paymentMethod
      if (!this.selectedPaymentMethod) {
        this.selectedPaymentMethod = this.$store.getters['paytacapos/paymentMethod']
      }
      this.$store.commit('paytacapos/updatePaymentMethod', this.selectedPaymentMethod)
      console.log('selected__:', this.selectedPaymentMethod)
    },
    calculateCashOutTotal (transactions) {
      let initialTotal = 0
      let currentTotal = 0
      let lossGain = 0
      let lossCovered = 0
      let totalBchAmount = 0
      transactions.forEach(tx => {
        const initMarketPrice = this.getMarketPrice('initial', tx, this.currency.symbol)
        initialTotal += tx.amount * initMarketPrice

        const currMarketPrice = this.getMarketPrice('current', tx, this.currency.symbol)
        currentTotal += tx.amount * currMarketPrice

        const isLossProtected = this.calcLossProtectionTimeLeft(tx) !== 'Expired'
        if (currentTotal < initialTotal && isLossProtected) {
          const gap = initialTotal - currentTotal
          lossCovered += gap
        }
        totalBchAmount += tx.amount
      })
      lossGain = currentTotal - initialTotal
      currentTotal += lossCovered
      this.cashOutTotal = {
        initialTotal: initialTotal,
        totalBeforeLossProtection: initialTotal - lossCovered,
        currentTotal: currentTotal,
        lossGain: lossGain,
        lossCovered: lossCovered,
        totalBchAmount: totalBchAmount
      }
    },
    getMarketPrice (type, transaction, currency) {
      if (type === 'initial') return transaction?.fiat_price?.initial[currency]
      if (type === 'current') return transaction?.fiat_price?.current[currency]
      return null
    },
    calcLossProtectionTimeLeft (transaction) {
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
    bottom: 0;
    width: 100%;
  }
</style>
