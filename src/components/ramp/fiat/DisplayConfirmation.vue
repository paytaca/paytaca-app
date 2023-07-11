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

    <div class="text-center md-font-size bold-text">Please check to confirm...</div>
    <q-separator :dark="darkMode" class="q-mt-lg q-mx-lg"/>
    <div class="md-font-size" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
      <div class="q-pt-lg q-mx-lg ">
        <div class="row subtext justify-between no-wrap q-mx-lg">
          <span>Fiat Currency</span>
          <span class="text-nowrap q-ml-xs">{{ adData.fiatCurrency.name }} ({{ adData.fiatCurrency.symbol }})</span>
        </div>
        <!-- <div class="row subtext justify-between no-wrap q-mx-lg">
          <span>Price Type</span>
          <span class="text-nowrap q-ml-xs">{{ adData.priceType === 'FIXED' ? 'Fixed' : 'Floating' }}</span>
        </div> -->
        <div class="row subtext justify-between no-wrap q-mx-lg">
          <span>Trade Limit</span>
          <span class="text-nowrap q-ml-xs">{{ formattedCurrencyNumber(adData.tradeFloor) }} - {{ formattedCurrencyNumber(adData.tradeCeiling) }} </span>
        </div>
        <div class="row subtext justify-between no-wrap q-mx-lg">
          <span>Crypto Amount</span>
          <span class="text-nowrap q-ml-xs">{{ adData.cryptoAmount }} BCH</span>
        </div>
        <div class="row subtext justify-between no-wrap q-mx-lg">
          <span>Payment Time Limit</span>
          <span class="text-nowrap q-ml-xs">{{ paymentTimeLimit.label }}</span>
        </div>
        <div class="row justify-between no-wrap q-mx-lg bold-text">
          <span>{{ adData.priceType === 'FIXED' ? 'Fixed Price' : 'Floating Price Margin' }}</span>
          <!-- <span>Price:</span> -->
          <span class="text-nowrap q-ml-xs">
            {{ adData.priceType === 'FIXED' ? formattedCurrencyNumber(adData.fixedPrice) : adData.floatingPrice }} {{ adData.priceType === 'FLOATING' ? '%' : '' }}
          </span>
        </div>
      </div>

      <!-- <q-separator :dark="darkMode" class="q-mt-lg q-mx-md"/> -->

      <div class="q-pt-lg q-mx-lg">
      </div>
      <div class="q-pt-lg q-mx-lg" >
      </div>
    </div>
    <div v-if="transactionType === 'sell'">
      <q-separator :dark="darkMode" class="q-mt-lg q-mx-md"/>

      <div class="q-mx-lg q-pt-lg">
        <div class="q-px-lg bold-text">
          Payment Methods
        </div>
        <div class="q-gutter-sm q-pt-sm q-px-lg">
          <q-badge v-for="method in adData.paymentMethods" rounded outline color="red" :label="method.paymentType.name" />
        </div>
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
      @swiped="onSwiped()"
      text="Swipe To Confirm"
    />
  </div>
  <!-- else progress loader -->
</template>
<script>
import DragSlide from '../../drag-slide.vue'
import { signMessage } from '../../../wallet/ramp/signature.js'
import { loadP2PWalletInfo } from 'src/wallet/ramp'
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      adData: null,
      isLoaded: false,
      paymentTimeLimit: null,
      wallet: null
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
    const walletInfo = this.$store.getters['global/getWallet']('bch')
    this.wallet = await loadP2PWalletInfo(walletInfo)
    console.log('wallet:', this.wallet)
  },
  methods: {
    onSwiped () {
      console.log('swiped')
      // temporary payment methods
      console.log('ad:', this.adData)
    },
    // getPaymentMethods () {

    // }
    formattedCurrencyNumber (value) {
      const formattedNumber = parseFloat(value).toLocaleString(undefined, {
        style: 'currency',
        currency: this.adData.fiatCurrency.symbol
      })
      return formattedNumber
    }
  }
}
</script>
<style lang="scss" scoped>
.subtext {
  opacity: .5;
}
</style>
