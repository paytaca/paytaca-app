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
        <payment-method-select v-if="step === 1" @select-method="setPaymentMethod"/>
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

export default {
  data () {
    return {
      step: 1,
      dialog: false,
      paymentMethod: null,
      amount: null
    }
  },
  components: {
    paymentMethodSelect,
    SelectAmount,
    Order
  },
  methods: {
    setPaymentMethod (method) {
      this.paymentMethod = method
      console.log('method: ', this.paymentMethod)
      this.step++
    },
    setAmount (amount) {
      this.amount = amount
      this.step++
    }
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
