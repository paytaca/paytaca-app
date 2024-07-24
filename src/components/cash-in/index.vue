<template>
  <q-dialog persistent="" full-width position="bottom">
    <q-card class="cashin-card">

      <!-- Title -->
      <div class="q-pt-sm">
        <q-card-section class="row items-center q-pb-none">
          <q-btn size="18px" flat icon="sym_o_receipt_long" color="blue-6" round dense v-close-popup />
          <q-space />
          <q-btn flat icon="close" color="red" round dense v-close-popup />
        </q-card-section>
      </div>

      <!-- Body -->
      <div>
        <payment-method-select :options="paymentTypeOpts" v-if="step === 1" @select="setPaymentType"/>
        <select-amount v-else-if="step === 2" @select-amount="setAmount"/>
        <order v-else/>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import paymentMethodSelect from './PaymentMethodSelect.vue'
import SelectAmount from './SelectAmount.vue'
import Order from './order.vue'
import { backend } from 'src/exchange/backend'

export default {
  data () {
    return {
      step: 1,
      dialog: false,
      paymentTypeOpts: [],
      selectedPaymentType: null,
      minAmount: null,
      maxAmount: null,
      amount: null,
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      cashinAdsParams: {
        currency: null,
        payment_type: null
      }
    }
  },
  components: {
    paymentMethodSelect,
    SelectAmount,
    Order
  },
  mounted () {
    this.cashinAdsParams.currency = this.selectedCurrency?.symbol
    this.fetchCashinAds()
  },
  methods: {
    setPaymentType (paymentType) {
      this.selectedPaymentType = paymentType
      this.cashinAdsParams.payment_type = this.selectedPaymentType?.id
      this.fetchCashinAds()
      this.step++
    },
    setAmount (amount) {
      this.amount = amount
      this.step++
    },
    fetchCashinAds () {
      backend.get('/ramp-p2p/cashin/ad', { params: this.cashinAdsParams, authorize: true })
        .then(response => {
          console.log('fetchCashinAds:', response.data)
          const paymentTypes = []
          let minAmount = 0.00001
          let maxAmount = 0.00001
          this.paymentTypeOpts = response.data?.forEach((e) => {
            // Get payment types
            e.payment_methods.forEach(method => {
              const dupe = paymentTypes.map(e => { return e.id }).includes(method.payment_type?.id)
              if (!dupe) {
                paymentTypes.push(method.payment_type)
              }
            })

            // Get min and max amount
            let tradeFloor = Number(e.trade_floor)
            let tradeCeiling = Number(e.trade_ceiling)
            let tradeAmount = Number(e.trade_amount)
            if (e.trade_limits_in_fiat) {
              tradeFloor = tradeFloor / Number(e.price)
              tradeCeiling = tradeCeiling / Number(e.price)
            }
            if (e.trade_amount_in_fiat) {
              tradeAmount = tradeAmount / Number(e.price)
            }
            if (tradeAmount < tradeCeiling) {
              tradeCeiling = tradeAmount
            }
            tradeFloor = Number(tradeFloor.toFixed(8))
            tradeCeiling = Number(tradeCeiling.toFixed(8))
            if (minAmount > 0.00001 && tradeFloor < minAmount) {
              minAmount = tradeFloor
            }
            if (tradeCeiling > maxAmount) {
              maxAmount = tradeCeiling
            }
          })
          this.minAmount = minAmount
          this.maxAmount = maxAmount
          this.paymentTypeOpts = paymentTypes
        })
        .catch(error => {
          console.error(error.response || error)
          // if (error.response) {
          //   console.error(error.response)
          //   if (error.response.status === 403) {
          //     bus.emit('session-expired')
          //   }
          // } else {
          //   bus.emit('network-error')
          // }
        })
    },
  }
}
</script>
<style lang="scss" scoped>
.cashin-card {
  height: 500px;
}
#exchange-logo {
  height: 30px;
  width: 30px;
  border-radius: 50%;
  position: absolute;
  top: 18px;
  left: 20px;
  z-index: 1;
  background-color: #0AC18E;
  padding: 5px;
  }
#label {
  position: absolute;
  left: 35px;
  z-index: 1;
  margin-top: 15px;
  font-size: 18px;
}
.body {
  margin-top: 50px;
}
</style>
