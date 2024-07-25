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
      >
        <template v-slot:append>
          <div class="q-pr-sm text-weight-bold" style="font-size: 15px;">
            BCH
          </div>
        </template>
      </q-input>
    </div>

    <!-- Selection -->
    <div class="text-center q-mt-lg q-px-lg">
      <div class="column">
        <div class="col q-py-xs" v-for="(option, index) in amountOption" :key="option">
          <q-btn rounded :outline="index !== selectedOption" :color="getButtonColor(index)" class="full-width q-py-sm" :label="option" @click="selectOption(option, index)"></q-btn>
        </div>
      </div>
    </div>

    <!-- Proceed -->
    <div class="row justify-center q-mt-lg">
      <q-btn :disable="amount === 0" rounded color="blue-6" label="proceed" @click="selectAmount"/>
    </div>
  </div>
</template>
<script>

export default {
  data () {
    return {
      amount: 0,
      amountOption: [0.00001, 0.001, 0.5, 1],
      presetCount: 4,
      selectedOption: null
    }
  },
  props: {
    minAmount: Number,
    maxAmount: Number
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  emits: ['select-amount'],
  mounted () {
    // this.computePresetAmount()
    // console.log('method: ', this.$route.query)
  },
  methods: {
    selectAmount () {
      this.$emit('select-amount', this.amount)
      // this.$router?.push({ name: 'cashin-order', params: { id: orderId }})
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
  }
}
</script>
