<template>
  <div class="q-mt-xs" style="font-size: 20px;">
    <div class="text-center">BCH Escrowed</div>
  </div>
  <div class="text-center q-mt-md q-px-lg">
    <div style="font-size: 15px;">Please pay</div>
    <q-input
      dense
      type="text"
      inputmode="none"
      filled
      v-model="amount"
      readonly
      :dark="darkMode"
      style="font-size: medium;">
      <template v-slot:append>
        <div class="q-pr-sm" style="font-size: large;">
          {{ order?.ad?.fiat_currency?.symbol }}
        </div>
      </template>
    </q-input>
  </div>

  <div class="text-center q-my-sm">to this payment method</div>

  <div class="q-mx-lg">
    <q-card flat bordered :dark="darkMode" v-for="(paymentMethod, index) in order?.payment_methods_selected" :key="index">
      <q-expansion-item
        class="pt-card text-bow"
        :class="getDarkModeClass(darkMode, '', 'bg-grey-2')"
        :default-opened=true
        :label="paymentMethod.payment_type"
        disable
        expand-separator >
          <q-card class="row q-py-sm q-px-md pt-card" :class="getDarkModeClass(darkMode)">
            <div v-for="(field, index) in paymentMethod.values" :key="index" class="row q-pr-sm">
              {{ field.value }}
            </div>
          </q-card>
      </q-expansion-item>
    </q-card>

    <!-- <q-file clearable class="q-pt-md" filled dense outlined color="blue-12" v-model="attachment" label="Upload Receipt">
      <template v-slot:prepend>
        <q-icon name="attach_file" />
      </template>
    </q-file> -->

    <div class="row justify-center q-mt-sm">
      <q-btn class="col q-mx-lg" rounded color="blue-6" label="I have Paid" @click="onPaid"/>
    </div>
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      attachment: null
    }
  },
  emits: ['confirm-payment'],
  props: {
    order: Object
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    amount () {
      return Number((Number(this.order?.crypto_amount) * Number(this.order?.locked_price)).toFixed(2)).toLocaleString()
    }
  },
  mounted () {
    console.log('order:', this.order)
  },
  methods: {
    getDarkModeClass,
    onPaid () {
      this.$emit('confirm-payment')
    }
  }
}
</script>
