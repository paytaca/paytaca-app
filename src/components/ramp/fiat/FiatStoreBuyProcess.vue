<template>
  <div class="q-px-md full-width">
    <div>
      <q-btn
        flat
        padding="md"
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
      <!-- Step 1 -->
      <q-step
        :name="1"
        title="Create Order"
        :done="step > 1"
        prefix="1"
      >
        <div class="q-mx-lg text-h5 text-center" style="font-size: 18px;">
          Order Created
        </div>
        <div class="q-pt-md" style="font-size: 13px;">
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Crypto Amount:</span>
            <span class="text-nowrap q-ml-xs">{{ buyAmount }}</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Fiat Amount:</span>
            <span class="text-nowrap q-ml-xs">{{ fiatAmount }}</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Status:</span>
            <span class="text-nowrap q-ml-xs">{{ buyStatus }}</span>
          </div>
        </div>
        <q-separator :dark="darkMode" class="q-mt-md"/>

        <!-- Pending Confirmation -->
        <div class="q-mt-md q-px-md" v-if="!confirmed">
          <div>
            <q-icon size="sm" name="info" color="blue-6"/>
            <span class="q-pl-xs">
              Wait for the seller to confirm your order.
            </span>
          </div>
          <div class="q-pt-xs">
            <q-icon size="sm" name="info" color="blue-6"/>
            <span class="q-pl-xs">
              The crypto asset will be escrowed once the seller confirms your order. You will be notified of this event.
            </span>
          </div>
          <div class="row q-pt-md">
            <q-btn
              rounded
              no-caps
              label='Cancel'
              class="q-space text-white"
              style="background-color: #ed5f59;"
            />
          </div>
        </div>

        <!-- Pending Payment -->
        <div class="text-center q-mt-md" v-if="confirmed">
          <div class="text-h5" style="font-size: 18px;">
            The seller has confirmed your order!
          </div>
          <div class="text-center q-pt-sm text-h2" style="font-size: 50px; color: #ed5f59;">
            {{ countDown }}
          </div>
          <div class="q-pt-sm">
            Please pay within the time limit...
          </div>
          <div class="row text-center q-gutter-sm q-pt-md q-mx-lg">
            <div class="col">
              <q-btn
                rounded
                no-caps
                label='Cancel'
                class="q-space text-white full-width"
                style="background-color: #ed5f59;"
              />
            </div>
            <div class="col">
              <q-btn
                rounded
                no-caps
                label='Pay'
                class="q-space text-white full-width"
                color="blue-6"
                @click="proceedToPayment"
              />
            </div>
          </div>
        </div>
      </q-step>

      <!-- Step 2 -->
      <q-step
        :name="2"
        title="Pay the Seller"
        :done="step > 2"
        prefix="2"
      >
        <div class="q-mx-lg text-h5 text-center" style="font-size: 18px;">
          Pay the Seller
        </div>
        <div>
          <div class="text-center text-blue-6" style="font-size: 30px;">
            {{ fiatAmount }}
          </div>
        </div>
      </q-step>

      <!-- Step 2 -->
      <q-step
        :name="3"
        title="Release Crypto"
        prefix="3"
      >
        Release Crypto
      </q-step>

      <!-- <template v-slot:navigation>
        <q-stepper-navigation>
          <q-btn @click="$refs.stepper.next()" color="primary" :label="step === 3 ? 'Finish' : 'Continue'" />
          <q-btn v-if="step > 1" flat color="primary" @click="$refs.stepper.previous()" label="Back" class="q-ml-sm" />
        </q-stepper-navigation>
      </template> -->
    </q-stepper>
  </div>
</template>
<script>
import { ref } from 'vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      buy: {},
      buyStatus: 'Pending Confirmation',
      confirmed: false,
      countDown: '',
      x: null
    }
  },
  props: {
    listingData: Object,
    buyAmount: String,
    fiatAmount: String
  },
  emits: ['back'],
  methods: {
    paymentCountdown () {
      const vm = this
      const currentDate = new Date().getTime()
      const expiryDate = new Date(currentDate + 15 * 60 * 60 * 1000)

      vm.x = setInterval(function () {
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
        if (distance < 0) {
          clearInterval(vm.x)
          vm.countDown = 'Expired'
          // vm.shiftExpired = true
        }
      }, 1000)
    },
    proceedToPayment () {
      clearInterval(this.x)
      this.$refs.stepper.next()
    },
    pendingCntDwnSim () {
      const vm = this

      const expire = 5
      let now = 0

      const x = setInterval(function () {
        now++
        if (now === expire) {
          clearInterval(x)
          // vm.$refs.stepper.next()
          vm.buyStatus = 'Pending Payment'
          vm.confirmed = true
          vm.paymentCountdown()
        }
      }, 1000)
    }
  },
  setup () {
    return {
      step: ref(1)
    }
  },
  async mounted () {
    const vm = this
    console.log('Processing')

    vm.buy = vm.listingData
    vm.pendingCntDwnSim()
    // console.log(vm.buyAmount)
  }
}
</script>
<style lang="scss" scoped>
  .pp-text {
    color: #000 !important;
  }
  .subtext {
    font-size: 13px;
    opacity: .5;
  }
  .ib-text {
  display: inline-block;
}
</style>
