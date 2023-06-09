<template>
  <q-card
   class="br-15 q-pt-sm q-mx-md q-mx-none"
   :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
   style="min-height:78vh;"
  >
    <div v-if="steps === 1">
      <div>
        <q-btn
          flat
          padding="md"
          icon="arrow_back"
          @click="$emit('back')"
        />
      </div>
      <div class="q-mx-lg q-pt-xs text-h5 text-center" style="font-size: 18px; font-weight: 500; color: #ed5f59;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
        SELL BY FIAT
      </div>
      <div class="q-mx-lg">
        <div class="q-pt-md subtext" style="font-size: 12px;">
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Price:</span>
            <span class="text-nowrap q-ml-xs">{{ sell.price }}</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Limit:</span>
            <span class="text-nowrap q-ml-xs">{{ sell.limit }}</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Payment Limit:</span>
            <span class="text-nowrap q-ml-xs">24 hours</span>
          </div>
        </div>
        <div class="q-mt-md q-mx-lg">
          <q-input
            dense
            filled
            :dark="darkMode"
            v-model="amount"
          >
            <template v-slot:prepend>
              <span style="font-size: 12px; font-weight: 400;">
                PHP
              </span>
            </template>
            <template v-slot:append>
              <q-icon size="xs" name="close" @click="amount = 0"/>&nbsp;
              <q-btn padding="none" style="font-size: 12px;" flat color="primary" label="MAX" />
            </template>
          </q-input>
        </div>
        <div class="q-pt-md" style="font-size: 13px;">
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Crypto Amount:</span>
            <span class="text-nowrap q-ml-xs subtext">{{ cryptoAmount }} BCH</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Arbitration Fee:</span>
            <span class="text-nowrap q-ml-xs subtext">{{ arbitrationFee }} BCH</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Service Fee:</span>
            <span class="text-nowrap q-ml-xs subtext">{{ serviceFee }} BCH</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg" style="font-weight: 500;">
            <span>Total:</span>
            <span class="text-nowrap q-ml-xs subtext">{{ totalAmount() }} BCH</span>
          </div>
        </div>
        <div class="row q-py-lg q-mx-lg">
          <q-btn
            :disable="!isAmountValid()"
            rounded
            no-caps
            label='Next'
            class="q-space text-white"
            color="blue-6"
            @click="nextStep"
          />
        </div>
      </div>
    </div>
    <!-- <FiatStoreSellProcess
      v-if="steps === 2"
    /> -->
    <FiatStoreSellInit
      v-if="steps === 2"
      :listing-data="sell"
      :crypto-amount="cryptoAmount"
      v-on:back="steps = 1"
    />
    <div v-if="steps !== 2">
      <div class="q-mx-lg text-h5 text-center" style="font-size: 15px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
        BUYER INFO
      </div>
      <div class="row">
        <div class="col ib-text">
          <div class="q-mx-lg q-mt-md">
            <span
              :class="{'pt-dark-label': darkMode}"
              class="q-pl-md q-mb-none text-uppercase"
              style="font-size: 15px; font-weight: 400;"
            >
              {{ sell.name }}
            </span>
          </div>
          <div class="q-mx-lg subtext" :class="{'pt-dark-label': darkMode}">
            <span
              class="q-pl-md q-mb-none"
              style="font-size: 12px;"
            >
              {{ sell.trades }} trades
            </span>&nbsp;
            <span
              class="q-pl-xs q-mb-none"
              style="font-size: 12px;"
            >
              {{ sell.completion }}% completion
            </span>
          </div>
        </div>
        <!-- <div class="text-right q-mr-lg q-mt-md" v-if="!released">
          <q-icon class="q-pr-lg" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_chat"/>
        </div> -->
        <!-- <div class="text-right q-mr-lg q-mt-md" v-if="released">
          <q-icon class="q-pr-sm" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_thumb_up"/>
          <q-icon class="q-pr-lg" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_thumb_down"/>
        </div> -->
      </div>
      <div class="q-mx-lg q-pt-sm">
        <div class="q-ml-xs  q-gutter-sm">
          <q-badge v-for="method in sell.paymentMethods" rounded outline color="red" :label="method"/>
        </div>
      </div>
      <!-- <div class="q-mx-lg q-mt-md" v-if="pendingRelease">
        <div class="q-px-lg" style="font-weight: 500;">
          Seller did not release crypto?
        </div>
        <div class="q-pt-xs q-mx-lg subtext">
          If the seller still has not release the crypto after the Payment Time Limit, please submit an appeal
        </div>
      </div> -->
    </div>
  </q-card>
</template>
<script>
import FiatStoreSellInit from './FiatStoreSellInit.vue'
import FiatStoreSellProcess from './FiatStoreSellProcess.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      sell: {},
      amount: 0,
      cryptoAmount: 1.43,
      fiatAmount: '1000 PHP',
      arbitrationFee: 0.00001,
      serviceFee: 0.00001,
      steps: 1
    }
  },
  emits: ['back'],
  props: {
    listingData: Object
  },
  components: {
    FiatStoreSellInit,
    FiatStoreSellProcess
  },
  methods: {
    totalAmount () {
      const vm = this
      return vm.cryptoAmount + vm.arbitrationFee + vm.serviceFee
    },
    nextStep () {
      this.steps++
    },
    isAmountValid () {
      if (this.amount === 0 || this.amount === '') {
        return false
      } else {
        return true
      }
    }
  },
  async mounted () {
    const vm = this
    console.log('Selling')
    vm.sell = vm.listingData
    console.log(vm.listingData)
  }
}
</script>
<style lang="scss" scoped>
.subtext {
  font-size: 13px;
  opacity: .5;
}
</style>
