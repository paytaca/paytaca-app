<template>
  <div class="q-mx-md">
    <div class="text-center" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">
      Enter Amount
    </div>

    <!-- Amount Input -->
    <div class="text-center q-mt-lg q-px-lg">
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
    <div class="row q-gutter-md text-center q-mt-xs q-mx-md">
      <div class="col-5" v-for="option in amountOption" :key="option">
        <q-btn :disable="amountAdCount[option] === 0" rounded outline :color="darkMode ? 'blue-grey-2': 'blue-grey-8'" class="full-width q-py-sm" :label="option" @click="selectAmount(option)"></q-btn>
      </div>
    </div>

    <div v-if="unavailableDenoms" class="row justify-center q-pt-md" style="font-size: small; color: red;">
      <div class="col-shrink text-center" style="font-style: italic">Some denominations are currently not available</div>
    </div>
    <!-- Proceed -->
    <div class="row justify-center q-mt-md">
      <q-btn class="col q-mx-lg" :disable="disableProceedBtn" rounded color="blue-6" label="proceed" @click="selectAmount"/>
    </div>
  </div>
</template>
<script>

export default {
  data () {
    return {
      amount: 0,
      amountOption: [0.02, 0.25, 0.5, 1]
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
    }
  },
  emits: ['select-amount'],
  props: {
    amountAdCount: Object,
    currency: Object,
    ads: Object
  },
  methods: {
    selectAmount (option) {
      console.log('selectAmount:', option)
      this.amount = option
      this.$emit('select-amount', this.amount)
    }
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
