<template>
  <div class="q-mt-lg q-mx-md">
    <div class="text-center" style="font-size: 20px;">
      Enter Amount
    </div>

    <!-- Amount Input -->
    <div class="text-center q-pt-lg q-mt-lg q-px-lg">
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
        <div class="col q-py-xs" v-for="option in amountOption" :key="option">
          <q-btn rounded outline color="blue-grey-8" class="full-width q-py-sm" :label="option" @click="amount = option"></q-btn>
        </div>
      </div>
    </div>

    <!-- Proceed -->
     <div class="row justify-center q-mt-lg">
        <q-btn :disable="amount === 0" rounded color="blue-6" label="proceed" @click="createOrder"/>
     </div>
  </div>
</template>
<script>

export default {
  data () {
    return {
      amount: 0,
      amountOption: [0.001, 0.02, 0.5, 1]
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  mounted () {
    console.log('method: ', this.$route.query)
  },
  methods: {
    createOrder () {
      console.log('creating order')
      const orderId = 1
      this.$router?.push({ name: 'cashin-order', params: { id: orderId }})
    }
  }
}
</script>
