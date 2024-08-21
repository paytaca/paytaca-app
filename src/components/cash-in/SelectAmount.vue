<template>
  <div class="q-mx-md">
    <div class="text-center" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">
      Enter Amount
    </div>

    <!-- Amount Input -->
    <div class="text-center q-mt-md q-px-lg">
      <q-input
        type="text"
        inputmode="none"
        filled
        v-model="amount"
        readonly
        :dark="darkMode"
        style="font-size: large;">
        <template v-slot:append>
          <div class="q-pr-sm">
            BCH
          </div>
        </template>
      </q-input>
      <div class="row justify-end text-right subtext q-pr-sm q-pt-xs" style="font-size: 14px">
        You will pay {{ currency?.symbol }} {{ equivalentAmount ? equivalentAmount?.toLocaleString() : 0 }}
      </div>
    </div>

    <!-- Selection -->
    <div class="row q-gutter-x-md q-gutter-y-sm text-center q-mt-xs q-mx-md">
      <div class="col-5" v-for="(option, index) in amountOption" :key="option">
        <q-btn
          rounded
          :outline="index !== selectedOption"
          :disable="amountAdCount[option] === 0"
          :color="getButtonColor(index)"
          :label="option"
          class="full-width q-py-sm"
          @click="selectOption(option, index)"/>
      </div>
    </div>

    <div v-if="unavailableDenoms" class="row justify-center q-pt-md" style="font-size: small; opacity: .5">
      <div class="col-shrink text-center" style="font-style: italic">Some denominations are currently not available</div>
    </div>
    <!-- Proceed -->
    <div class="row justify-center q-mt-sm">
      <q-btn class="col q-mx-lg" :disable="disableProceedBtn" rounded color="blue-6" label="proceed" @click="submitOrder"/>
    </div>
  </div>
</template>
<script>

export default {
  data () {
    return {
      amount: 0,
      amountOption: [0.02, 0.04, 0.1, 0.25, 0.5, 1],
      selectedOption: null
    }
  },
  computed: {
    unavailableDenoms () {
      let hasUnavailables = false
      if (this.amountAdCount) {
        for (let i = 0; i < this.amountOption.length; i++) {
          if (this.amountAdCount[this.amountOption[i]] === 0) {
            hasUnavailables = true
            break
          }
        }
      }
      return hasUnavailables
    },
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    equivalentAmount () {
      let amount = this.amount
      if (amount === '' || isNaN(amount)) return 0
      amount = Number((amount) * parseFloat(this.ad?.price)).toFixed(2)
      return Number(amount)
    },
    ad () {
      if (this.ads?.length > 0) return this.ads[0]
      return null
    },
    disableProceedBtn () {
      return this.amount === 0 || !this.ad
    },
    selectedPaymentMethod () {
      const paymentMethod = this.ad.payment_methods.filter(e => e.payment_type.id === this.paymentType.id)
      if (paymentMethod?.length === 0) return null
      return paymentMethod[0]
    }
  },
  emits: ['select-amount', 'submit-order'],
  props: {
    paymentType: Object,
    amountAdCount: Object,
    currency: Object,
    ads: Object
  },
  methods: {
    submitOrder () {
      const payload = {
        ad: this.ad?.id,
        crypto_amount: Number(this.amount)?.toFixed(8),
        payment_methods: [this.selectedPaymentMethod?.id],
        is_cash_in: true
      }
      this.$emit('submit-order', payload)
    },
    selectOption (option, index) {
      this.amount = option
      this.selectedOption = index
    },
    getButtonColor (index) {
      if (index === this.selectedOption) {
        return 'blue-6'
      } else {
        return this.darkMode ? 'blue-grey-2' : 'blue-grey-8'
      }
    }
    // computePresetAmount () {
    //   this.amountOption[0] = this.minAmount
    //   this.amountOption[this.presetCount - 1] = this.maxAmount

    //   const gap = (this.maxAmount - this.minAmount) / this.presetCount

    //   // set mid presets
    //   for (let index = 0; index < this.presetCount - 2; index++) {
    //     console.log(index)
    //     this.amountOption[index + 1] = this.minAmount + ((index + 1) * gap)
    //   }

    //   console.log('amountOption: ', this.amountOption)
    // }
    // selectAmount () {
    //   this.$emit('select-amount', this.amount)
    //   // this.$router?.push({ name: 'cashin-order', params: { id: orderId }})
    // }
  }
}
</script>
<style scoped>
.sm-font-size {
  font-size: small;
}
</style>
