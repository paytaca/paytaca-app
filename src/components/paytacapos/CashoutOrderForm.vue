<template>
  <!-- Transaction List -->
  <div>
    <div v-if="status === 'confirm-transaction'">
      <div class="text-center md-font-size text-grey-9 text-bold">Cash Out Transactions</div>

      <q-pull-to-refresh @refresh="refreshData">
        <q-list class="scroll-y" @touchstart="preventPull" ref="scrollTarget" :style="`max-height: ${minHeight - 100}px`" style="overflow:auto;">
          <!-- Cashout Order -->
          <!-- <q-card flat class="q-mx-lg q-mt-sm"> -->
            <q-item v-for="(transaction, index) in transactions" :key="index" clickable @click="''">
              <q-item-section>
                <div class="q-px-sm q-mx-lg" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                  <div class="sm-font-size text-grey-6 text-strike">{{ transaction.initAmount }}</div>
                  <div class="row">
                    <div class="col ib-text">
                      <div class="md-font-size text-bold">
                        {{ formatCurrency(transaction.fiatAmount, currency.symbol).replace(/[^\d.,-]/g, '') }} {{ currency.symbol }}
                      </div>
                      <div class="sm-font-size">
                        {{ transaction.amount }} BCH
                      </div>
                    </div>
                    <div class="col ib-text text-right q-pr-sm">
                      <div class="text-grey-8 text-bold">
                        <span>{{ transaction.txid }}</span> <q-icon color="primary" size="sm" name="o_check_box" v-if="transaction.selected"/>
                      </div>
                      <div class="text-grey-6 sm-font-size">{{ transaction.lossProtection }}</div>
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
              <span>Total on Market Price</span><br>
              <span>Market Volatility Loss/Gain</span><br>
              <span>Loss Protection Coverage</span>
            </div>
            <div class="col text-right">
              <span>14,587.50 PHP</span><br>
              <span class="text-red">-4,319.7 PHP</span><br>
              <span>3,979.7 PHP</span>
            </div>
          </div>

          <div class="text-strike text-grey-6 text-right sm-font-size">
            14,587.50
          </div>
          <div class="row q-pb-sm">
            <div class="col-8 md-font-size">
              <span class="text-grey-8">TOTAL</span>
            </div>
            <div>
              <span>14,247.50 PHP</span>
            </div>
          </div>
          <q-separator class="q-mb-sm"/>
          <div class="text-right text-grey-8 sm-font-size">
            0.57 BCH
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
        This amount of BCH has been sent, please wait for your cash out order to be processed. You will receive payment shortly.
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { formatCurrency } from 'src/exchange'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';

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
      ]
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  emits: ['select-payment-method'],
  props: {
    data: Array
  },
  mounted () {
    this.transactions = this.data
    this.paymentMethod.payment_type = this.paymentTypesOpt[0]
    this.onUpdatePaymentType(this.paymentMethod.payment_type)
    console.log('transactions: ', this.data)
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
