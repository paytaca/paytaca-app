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

        <q-pull-to-refresh @refresh="refreshData">
          <q-list class="scroll-y" @touchstart="preventPull" ref="scrollTarget" :style="`max-height: ${minHeight - 100}px`" style="overflow:auto;">
            <!-- Cashout Order -->
            <!-- <q-card flat class="q-mx-lg q-mt-sm"> -->
              <q-item v-for="(transaction, index) in transactions" :key="index" clickable @click="''">
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
              </q-item>
            <!-- </q-card> -->
          </q-list>
        </q-pull-to-refresh>
      </div>

      <!-- Payment Method -->
      <div v-if="status === 'confirm-payment-method'">
        <div class="text-center md-font-size text-grey-9 text-bold">Setup Payment Method</div>

        <q-card class="q-my-md q-mx-lg br-15">
          <q-scroll-area
          :style="`height: ${minHeight-110}px; max-width: 100%;`"
          >
            <div class="q-py-md q-px-lg">
              <div class="q-pb-sm">
                <div class="q-pb-xs">Payment Type</div>
                <q-select
                  dense
                  outlined
                  flat
                  v-model="paymentMethod.payment_type"
                  option-label="full_name"
                  :options="paymentTypesOpt"
                  :dark="darkMode"
                />
              </div>
              <div v-for="(field, index) in paymentMethod.payment_type.fields" :key="index">
                <div class="q-pb-xs">{{ field.fieldname }}</div>
                <q-input
                  dense
                  outlined
                  flat
                  hide-bottom-space
                  class="q-py-xs"
                  :dark="darkMode"
                  v-model="paymentMethod.fields[field.id].value"
                  :rules="[
                      val => isValidIdentifier(val, field.fieldname, field.required)
                    ]"
                />
              </div>
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
                <span>{{ formatCurrency(cashOutTotal.initialTotal, currency.symbol).replace(/[^\d.,-]/g, '') }} {{ currency.symbol }}</span><br>
                <span :class="cashOutTotal.lossGain < 0 ? 'text-red' : 'text-green'">{{ formatCurrency(cashOutTotal.lossGain, currency.symbol).replace(/[^\d.,-]/g, '') }} {{ currency.symbol }}</span><br>
                <span>{{ formatCurrency(cashOutTotal.lossCovered, currency.symbol).replace(/[^\d.,-]/g, '') }} {{ currency.symbol }}</span>
              </div>
            </div>

            <div class="text-strike text-grey-6 text-right sm-font-size">
              {{ formatCurrency(cashOutTotal.initialTotal, currency.symbol) }} {{ currency.symbol }}
            </div>
            <div class="row q-pb-sm">
              <div class="col md-font-size text-bold">
                <span>TOTAL</span>
              </div>
              <div class="text-right">
                <span>{{ formatCurrency(cashOutTotal.currentTotal, currency.symbol).replace(/[^\d.,-]/g, '') }} {{ currency.symbol }}</span>
              </div>
            </div>
            <q-separator class="q-mb-sm"/>
            <div class="text-right text-grey-8 sm-font-size">
              {{ cashOutTotal.totalBchAmount?.toFixed(8) }} BCH
            </div>
          </q-card>
        </div>
        <div class="full-width text-center q-px-lg q-py-sm">
          <q-btn v-if="status === 'confirm-transaction'" label="Proceed" class="full-width q-mx-lg" rounded color="primary" @click="status = 'confirm-payment-method'"/>
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
  </q-pull-to-refresh>
</template>
<script>
import { formatCurrency } from 'src/exchange'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { backend } from 'src/exchange/backend'
import HeaderNav from 'src/components/header-nav.vue';

export default {
  data () {
    return {
      transactions: [],
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 320 : this.$q.screen.height - 290,
      currency: { name: 'PHP', symbol: 'PHP' },
      status: 'confirm-transaction',
      openDialog: false,
      text: '',
      paymentMethod: {
        id: null,
        payment_type: null,
        account_name: null,
        account_identifier: null,
        identifier_format: null,
        fields: {}
      },
      paymentTypesOpt: [
        {
          id: 1,
          full_name: 'Maya',
          short_name: 'Maya',
          notes: null,
          is_disabled: false,
          fields: [
            {
              id: 1,
              fieldname: 'Mobile Number',
              format: null,
              description: null,
              payment_type: 1,
              required: true
            },
            {
              id: 2,
              fieldname: 'Account Name',
              format: null,
              description: null,
              payment_type: 1,
              required: false
            }
          ]
        },
        {
          id: 2,
          full_name: 'Gcash',
          short_name: 'Gcash',
          notes: null,
          is_disabled: false,
          fields: [
            {
              id: 1,
              fieldname: 'Mobile Number',
              format: null,
              description: null,
              payment_type: 2,
              required: true
            },
            {
              id: 2,
              fieldname: 'Account Name',
              format: null,
              description: null,
              payment_type: 2,
              required: false
            }
          ]

        }
      ],
      orderInfo: {
        market_price: 14587.50,
        market_loss_gain: -4319.7,
        loss_protection_coverage: 3979.7
      },
      cashOutTotal: {}
      // paymentTypesOpt: null,
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
  emits: ['select-payment-method'],
  components: {
    HeaderNav
  },
  props: {
    data: Array
  },
  mounted () {
    this.transactions = JSON.parse(this.$route.query.selectedTransactions)
    this.calculateCashOutTotal(this.transactions)
    this.paymentMethod.payment_type = this.paymentTypesOpt[0]
    this.onUpdatePaymentType(this.paymentMethod.payment_type)
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
    onUpdatePaymentType (data) {
      const paymentFields = {}
      data.fields.forEach(field => {
        paymentFields[field.id] = {
          fieldname: field.fieldname,
          required: field.required,
          value: null
        }
      })
      this.paymentMethod.fields = paymentFields
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
    async fetchPaymentMethod () {
      const vm = this
      const url = '/paytacapos/payment-methods/'

      await backend.get(url, { authorize: true })
        .then(response => {
          console.log(response)
          vm.paymentMethod = response.data
          // vm.merchantTransactions = response.data
        })
        .catch(error => {
          console.log(error)
        })
    },
    calculateCashOutTotal (transactions) {
      let initialTotal = 0
      let currentTotal = 0
      let lossGain = 0
      let lossCovered = 0
      let totalBchAmount = 0
      transactions.forEach(tx => {
        const initMarketPrice = tx.fiat_price?.init[this.currency.symbol]
        initialTotal += tx.amount * initMarketPrice

        const currMarketPrice = tx.fiat_price?.curr[this.currency.symbol]
        currentTotal += tx.amount * currMarketPrice

        const isLossProtected = this.lossProtection(tx) !== 'Expired'
        if (currentTotal < initialTotal && isLossProtected) {
          const gap = initialTotal - currentTotal
          lossCovered += gap
        }

        totalBchAmount += tx.amount
      })
      lossGain = currentTotal - initialTotal
      this.cashOutTotal = {
        initialTotal: initialTotal,
        currentTotal: currentTotal,
        lossGain: lossGain,
        lossCovered: lossCovered,
        totalBchAmount: totalBchAmount
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
    getInitialFiatAmount (transaction) {
      console.log('transaction:', transaction)
      const marketPrice = transaction?.fiat_price?.init[this.currency?.symbol]
      return transaction.amount * marketPrice
    },
    getCurrentFiatAmount (transaction) {
      const marketPrice = transaction?.fiat_price?.curr[this.currency?.symbol]
      return transaction.amount * marketPrice
    },
    getFiatAmountColor (transaction) {
      const currentFiatPrice = transaction?.fiat_price?.curr[this.currency?.symbol]
      const initialFiatPrice = transaction?.fiat_price?.init[this.currency?.symbol]
      if (currentFiatPrice < initialFiatPrice) return 'text-red'
      if (currentFiatPrice > initialFiatPrice) return 'text-green'
      return 'text-blue'
    },
    getTrendingIcon (transaction) {
      const currentFiatPrice = transaction?.fiat_price?.curr[this.currency?.symbol]
      const initialFiatPrice = transaction?.fiat_price?.init[this.currency?.symbol]
      if (currentFiatPrice > initialFiatPrice) return 'trending_up'
      if (currentFiatPrice < initialFiatPrice) return 'trending_down'
      return ''
    },
    isTxnSelected (transaction) {
      return this.transactions.some(txn => txn.txid === transaction.txid)
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
