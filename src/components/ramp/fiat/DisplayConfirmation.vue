<template>
  <div class="q-pb-md" v-if="isLoaded">
    <div>
      <q-btn
        flat
        padding="md"
        icon="close"
        @click="$emit('back')"
      />
    </div>

    <div class="text-center md-font-size">Please check to confirm...</div>

    <div class="md-font-size" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
      <div class="q-pt-lg q-mx-lg ">
        <div class="row subtext justify-between no-wrap q-mx-lg">
          <span>Price Type:</span>
          <span class="text-nowrap q-ml-xs">{{ adData.priceType === 'FIXED' ? 'Fixed' : 'Floating' }}</span>
        </div>
        <div class="row subtext justify-between no-wrap q-mx-lg">
          <span>Fiat Currency:</span>
          <span class="text-nowrap q-ml-xs">{{ adData.fiatCurrency.name }} ({{ adData.fiatCurrency.abbrev }})</span>
        </div>
        <div class="row justify-between no-wrap q-mx-lg bold-text">
          <span>{{ adData.priceType === 'FIXED' ? 'Fixed Price' : 'Floating Price' }}:</span>
          <span class="text-nowrap q-ml-xs">{{ adData.priceType === 'FIXED' ? adData.fixedPrice : adData.floatingPrice }} {{ adData.fiatCurrency.abbrev }}</span>
        </div>
      </div>

      <q-separator :dark="darkMode" class="q-mt-lg q-mx-md"/>

      <div class="q-pt-lg q-mx-lg">
        <div class="row justify-between no-wrap q-mx-lg bold-text">
          <span>Total Crypto Amount:</span>
          <span class="text-nowrap q-ml-xs">{{ adData.cryptoAmount }} BCH</span>
        </div>
        <div class="row subtext justify-between no-wrap q-mx-lg">
          <span>Trade Limit:</span>
          <span class="text-nowrap q-ml-xs">{{ adData.tradeFloor }}  {{ adData.fiatCurrency.abbrev }}  - {{ adData.tradeCeiling }}  {{ adData.fiatCurrency.abbrev }}</span>
        </div>
      </div>
      <q-separator :dark="darkMode" class="q-mt-lg q-mx-md"/>

      <div class="q-pt-lg q-mx-lg" >
        <div class="row justify-between no-wrap q-mx-lg bold-text">
          <span>Payment Time Limit:</span>
          <span class="text-nowrap q-ml-xs">{{ paymentTimeLimit.label }}</span>
        </div>
      </div>
    </div>
    <div v-if="transactionType === 'sell'">
      <div>
        Payment Methods
      </div>
    </div>

    <DragSlide
      :style="{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1500,
      }"
      @swiped="true"
      text="Swipe To Confirm"
    />
  </div>
  <!-- else progress loader -->
</template>
<script>
import { add } from 'date-fns'
import DragSlide from '../../drag-slide.vue'
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      adData: null,
      isLoaded: false,
      paymentTimeLimit: null
    }
  },
  emits: ['back'],
  components: {
    DragSlide
  },
  props: {
    transactionType: String,
    postData: Object,
    ptl: Object
  },
  async mounted () {
    const vm = this

    vm.adData = vm.postData
    vm.paymentTimeLimit = vm.ptl
    vm.isLoaded = true
  }
}
</script>
<style lang="scss" scoped>
.subtext {
  opacity: .5;
}
</style>
