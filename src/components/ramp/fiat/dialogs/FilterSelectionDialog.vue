<!-- Individual Filtering in Store Page -->
<template>
  <q-dialog ref="dialog" full-width position="top" transition-show="slide-down" @before-hide="customKeyboard = 'dismiss'" no-shake>
    <q-card class="br-15 pt-card-2 text-bow">
      <div class="text-right q-pr-lg q-pt-md">
        <q-icon size="sm" color="red" name="close" @click="closeDialog()"/>
      </div>
      <div class="q-px-lg q-pt-sm text-center text-bold" style="font-size: medium;">{{ filterTypeText }}</div>
      <div class="q-pt-sm q-pb-md q-px-lg">
        <div v-if="type === 'amount'">
          <q-input
            dense
            rounded
            outlined
            v-model="amount"
            placeholder="Enter Amount"
            @focus="openCustomKeyboard(true)"
            :readonly="readonlyState"
            >
            <template v-slot:append>
              <span class="text-bold" style="font-size: 15px;">{{ byFiat ? currency.symbol : 'BCH' }}</span>
            </template>
          </q-input>
          <div class="q-pl-sm q-pt-sm">
            <q-btn
              class="sm-font-size button button-text-primary"
              padding="none"
              flat
              no-caps
              :class="getDarkModeClass(darkMode)"
              @click="byFiat = !byFiat">
              {{
                $t(
                  'SetAmountInCurrency',
                  { currency: byFiat ? 'BCH' : currency?.symbol },
                  `Set amount in ${ byFiat ? 'BCH' : currency?.symbol }`
                )
              }}
            </q-btn>
          </div>
        </div>
        <div v-if="type === 'paymentTypes'">
          <div class="q-gutter-sm q-pt-sm">
            <q-badge
             class="q-pa-sm"
             rounded
             color="blue-grey-6"
             :outline="!paymentTypeAllSelected"
              @click="selectAllPaymentTypes()"
             >
             {{ $t('DefaultAll') }}
            </q-badge>
            <q-badge
              v-for="payment in paymentTypes"
              :key="payment.id"
              class="q-pa-sm"
              color="blue-grey-6"
              rounded
              :outline="!filter.payment_types?.includes(payment.id)"
              @click="setPaymentTypes(payment.id)"
              >
              {{ payment.short_name || payment.full_name }}
            </q-badge>
          </div>
        </div>
        <div class="text-center q-pt-md q-gutter-sm">
          <q-btn
            outline rounded
            class="text-center q-mt-sm"
            color="blue"
            :disable="disableUnselectBtn"
            :label="type === 'amount' ? 'clear' : 'unselect all'"
            @click="onClearClick"/>
          <q-btn :loading="loadFilterButton" :disable="loadFilterButton" rounded class="text-center q-mt-sm" color="blue" label="filter" @click="onOKClick"/>
        </div>
      </div>
    </q-card>
    <customKeyboard
      :custom-keyboard-state="customKeyboardState"
      v-on:addKey="setAmount"
      v-on:makeKeyAction="makeKeyAction"
    />
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import customKeyboard from 'src/pages/transaction/dialog/CustomKeyboard.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      paymentTypes: [],
      amount: null,
      filter: null,
      byFiat: true,
      readonlyState: false,
      customKeyboardState: 'dismiss',
      loadFilterButton: false
    }
  },
  components: {
    customKeyboard
  },
  computed: {
    disableUnselectBtn () {
      return this.loadFilterButton || (this.type === 'type' && !this.amount) || (this.type === 'paymentTypes' && this.filter.payment_types.length === 0)
    },
    filterTypeText () {
      return this.type === 'amount' ? 'Filter Ad by Order Amount' : 'Select Payment Type'
    },
    paymentTypeAllSelected () {
      return this.paymentTypes.length === this.filter.payment_types.length
    }
  },
  props: {
    type: String,
    filterData: Object,
    currency: Object
  },
  mounted () {
    this.filter = this.filterData
    this.amount = this.filter?.order_amount
    this.byFiat = this.filter?.order_amount_currency !== 'BCH'
    this.paymentTypes = this.$store.getters['ramp/paymentTypes'](this.currency.symbol || 'All')
  },
  methods: {
    getDarkModeClass,
    onClearClick () {
      if (this.type === 'amount') this.amount = null
      if (this.type === 'paymentTypes') this.unselectAllPaymentTypes()
    },
    unselectAllPaymentTypes () {
      this.filter.payment_types = []
    },
    selectAllPaymentTypes () {
      this.filter.payment_types = this.paymentTypes.map(e => e.id)
    },
    setPaymentTypes (value) {
      const tempPaymentType = this.filter.payment_types
      if (tempPaymentType?.includes(value)) {
        this.filter.payment_types = tempPaymentType.filter(e => e !== value)
      } else {
        this.filter.payment_types.push(value)
      }
    },
    onOKClick () {
      this.loadFilterButton = true
      if (this.type === 'amount') {
        this.filter.order_amount = this.amount
        this.filter.order_amount_currency = this.byFiat ? this.currency?.symbol : 'BCH'
      }

      this.$emit('ok', this.filter)
      this.customKeyboardState = 'dismiss'

      setTimeout(() => {
        this.$refs.dialog.hide()
      }, 50)
    },
    setAmount (key) {
      let receiveAmount, finalAmount, tempAmountFormatted = ''
      let proceed = false
      receiveAmount = this.amount || 0

      // see if # of decimal valid
      let temp = receiveAmount.toString()
      temp = temp.split('.')
      if (temp.length === 2) {
        if (this.byFiat) {
          if (temp[1].length < 2) {
            proceed = true
          }
        } else {
          if (temp[1].length < 8) {
            proceed = true
          }
        }
      } else {
        proceed = true
      }

      if (proceed) {
        receiveAmount = receiveAmount === null ? '' : receiveAmount
        if (key === '.' && receiveAmount === '') {
          finalAmount = '0.'
        } else {
          finalAmount = receiveAmount.toString()
          const hasPeriod = finalAmount.indexOf('.')
          if (hasPeriod < 1) {
            if (Number(finalAmount) === 0 && Number(key) > 0) {
              finalAmount = key
            } else {
              // Check amount if still zero
              if (Number(finalAmount) === 0 && Number(finalAmount) === Number(key)) {
                finalAmount = 0
              } else {
                finalAmount += key.toString()
              }
            }
          } else {
            finalAmount += key !== '.' ? key.toString() : ''
          }
        }
        this.amount = finalAmount
      }
    },
    makeKeyAction (action) {
      if (action === 'backspace') {
        // Backspace
        this.amount = String(this.amount).slice(0, -1)
      } else if (action === 'delete') {
        // Delete
        this.amount = '0'
      } else {
        this.customKeyboardState = 'dismiss'
        this.readonlyState = false
      }
    },
    openCustomKeyboard (state) {
      this.readonlyState = state

      if (state) {
        this.customKeyboardState = 'show'
      } else {
        this.customKeyboardState = 'dismiss'
      }
    },
    closeDialog () {
      this.customKeyboardState = 'dismiss'

      setTimeout(() => {
        this.$refs.dialog.hide()
      }, 50)
    }
  }
}
</script>
