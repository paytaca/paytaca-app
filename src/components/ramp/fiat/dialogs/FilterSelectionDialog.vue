<!-- Individual Filtering in Store Page -->
<template>
  <q-dialog ref="dialog" full-width position="top" transition-show="slide-down">
    <q-card class="br-15 pt-card-2 text-bow">
      <div class="q-px-lg q-pt-lg text-center text-bold" style="font-size: medium;">{{ filterTypeText }}</div>
      <div class="q-pt-sm q-pb-md q-px-lg">
        <div v-if="type === 'amount'">
          <q-input dense rounded outlined v-model="amount" placeholder="Enter Amount">
          </q-input>
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
        <div class="text-center">
          <q-btn rounded class="text-center q-mt-sm" color="blue" label="filter" @click="onOKClick"/>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      paymentTypes: [],
      amount: null,
      // selectedPaymentTypes: [],
      filter: null
    }
  },
  computed: {
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
    this.paymentTypes = this.$store.getters['ramp/paymentTypes'](this.currency.symbol || 'All')
    // this.selectedPaymentTypes = this.filter.payment_types
  },
  methods: {
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
      this.$emit('ok', this.filter)
      this.$refs.dialog.hide()
    }
  }
}
</script>
