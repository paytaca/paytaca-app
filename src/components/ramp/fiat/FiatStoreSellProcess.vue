<template>
  <div class="q-pt-md q-px-md">
    <div>
      <q-btn
        flat
        padding="xs"
        icon="arrow_back"
        @click="$emit('back')"
      />
    </div>
    <q-stepper
      v-model="step"
      ref="stepper"
      color="primary"
      active-icon="none"
      done-color="blue-4"
      active-color="blue-9"
      :contracted="$q.platform.is.mobile"
      :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
      :dark="darkMode"
      transition-duration="150"
      animated
      alternative-labels
      flat
    >
      <q-step
        :name="1"
        title="Create Order"
        prefix="1"
        :done="step > 1"
      >
        <div class="q-mx-lg text-h5 text-center" style="font-size: 18px;">
          Create Order
        </div>
        <FiatStoreSellInit
          v-if="isloaded"
          :listing-data="sell"
          :crypto-amount="cryptoAmount"
          v-on:confirmed="confirmedOrder"
        />
      </q-step>

      <q-step
        :name="2"
        title="Await Payment"
        prefix="2"
        :done="step > 2"
      >
        <div class="q-mx-lg text-h5 text-center" style="font-size: 18px;">
          Pending Payment
        </div>
        <div class="q-pt-md" style="font-size: 13px;">
          <div style="font-weight: 500;" :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Fiat Amount:</span>
            <span class="text-nowrap q-ml-xs">10000 PHP</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Price:</span>
            <span class="text-nowrap q-ml-xs">6871.41 PHP</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Crypto Amount:</span>
            <span class="text-nowrap q-ml-xs">{{ cryptoAmount }}</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Payment Time Limit:</span>
            <span class="text-nowrap q-ml-xs">24 H</span>
          </div>

          <div class="q-pt-sm">
            <div class="text-h5 text-center" style="font-size: 15px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
              CONTRACT INFO
            </div>
            <div style="font-size: 13px">
              <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row q-pt-md justify-between no-wrap q-mx-lg">
                <span>Address:</span>
                <span class="text-nowrap q-ml-xs">bitcoincash:qzvn7q***tgnvldj7l2</span>
              </div>
              <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
                <span>Balance:</span>
                <span class="text-nowrap q-ml-xs">1000 PHP</span>
              </div>
            </div>
          </div>

          <q-separator :dark="darkMode" class="q-mt-sm"/>

          <div class="text-center q-mt-sm">
            <div class="text-h5" style="font-size: 15px;">
              Expect payment within...
            </div>
            <div class="text-center" style="font-size: 40px; color: #ed5f59;">
              {{ countDown }}
            </div>
          </div>
          <!-- <div class="row text-center q-gutter-sm q-pt-sm q-mx-lg">
            <div :class="$q.platform.is.mobile? 'col-4' : 'col'">
              <q-btn
                rounded
                no-caps
                label='Appeal'
                class="q-space text-white full-width"
                style="background-color: #ed5f59;"
              />
            </div>
            <div :class="$q.platform.is.mobile? 'col-7' : 'col'">
              <q-btn
                rounded
                no-caps
                label='Confirm Payment'
                class="q-space text-white full-width"
                color="blue-6"
              />
            </div>
          </div> -->
          <div>
            <div class="text-h5 text-center" style="font-size: 15px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
              MY PAYMENT METHODS
            </div>
          </div>
          <!-- <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Status:</span>
            <span class="text-nowrap q-ml-xs">{{ buyStatus }}</span>
          </div> -->
        </div>
      </q-step>

      <q-step
        :name="3"
        title="Release Crypto"
        prefix="3"
      >
        Try out different ad text to see what brings in the most customers, and learn how to
        enhance your ads using features like ad extensions. If you run into any problems with
        your ads, find out how to tell if they're running and how to resolve approval issues.
      </q-step>

      <!-- <template v-slot:navigation>
        <q-stepper-navigation>
          <q-btn @click="$refs.stepper.next()" color="primary" :label="step === 4 ? 'Finish' : 'Continue'" />
          <q-btn v-if="step > 1" flat color="primary" @click="$refs.stepper.previous()" label="Back" class="q-ml-sm" />
        </q-stepper-navigation>
      </template> -->
    </q-stepper>
  </div>
</template>
<script>
import { ref } from 'vue'
import FiatStoreSellInit from './FiatStoreSellInit.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      sell: {},
      isloaded: false,
      countDown: '',
      timer: null
    }
  },
  props: {
    listingData: Object,
    cryptoAmount: Number
  },
  components: {
    FiatStoreSellInit
  },
  emits: ['back', 'hideBuyer'],
  methods: {
    paymentCountdown () {
      const vm = this
      const currentDate = new Date().getTime()
      const expiryDate = new Date(currentDate + 24 * 60 * 60 * 1000)

      vm.timer = setInterval(function () {
        const now = new Date().getTime()
        // find distance
        const distance = expiryDate - now

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        let seconds = Math.floor((distance % (1000 * 60)) / 1000)
        if (seconds.toString().length < 2) {
          seconds = '0' + seconds
        }

        vm.countDown = hours + ':' + minutes + ':' + seconds
        // console.log(vm.countDown)
        if (distance < 0) {
          clearInterval(vm.timer)
          vm.countDown = 'Expired'
          // vm.shiftExpired = true
        }
      }, 1000)
    },
    confirmedOrder () {
      this.paymentCountdown()
      this.$refs.stepper.next()
      this.$emit('hideBuyer')
    }
  },
  setup () {
    return {
      step: ref(1)
    }
  },
  async mounted () {
    const vm = this

    vm.sell = vm.listingData
    this.isloaded = true
  }
}
</script>
