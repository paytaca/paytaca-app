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
        <div class="row justify-between no-wrap q-mx-lg">
          <span>Fiat Currency</span>
          <span class="text-nowrap q-ml-xs">{{ postData.fiatCurrency.name }} ({{ postData.fiatCurrency.symbol }})</span>
        </div>
        <!-- <div class="row subtext justify-between no-wrap q-mx-lg">
          <span>Price Type</span>
          <span class="text-nowrap q-ml-xs">{{ adData.priceType === 'FIXED' ? 'Fixed' : 'Floating' }}</span>
        </div> -->
        <div class="row justify-between no-wrap q-mx-lg">
          <span>Trade Limit</span>
          <span class="text-nowrap q-ml-xs">{{ formattedCurrencyNumber(postData.tradeFloor) }} to {{ formattedCurrencyNumber(postData.tradeCeiling) }} </span>
        </div>
        <div class="row justify-between no-wrap q-mx-lg">
          <span>Crypto Amount</span>
          <span class="text-nowrap q-ml-xs">{{ postData.cryptoAmount }} BCH</span>
        </div>
        <div class="row justify-between no-wrap q-mx-lg">
          <span>Payment Time Limit</span>
          <span class="text-nowrap q-ml-xs">{{ paymentTimeLimit.label }}</span>
        </div>
        <div class="row justify-between no-wrap q-mx-lg bold-text">
          <span>{{ postData.priceType === 'FIXED' ? 'Fixed Price' : 'Floating Price Margin' }}</span>
          <!-- <span>Price:</span> -->
          <span class="text-nowrap q-ml-xs">
            {{ postData.priceType === 'FIXED' ? formattedCurrencyNumber(postData.fixedPrice) : postData.floatingPrice }} {{ postData.priceType === 'FLOATING' ? '%' : '' }}
          </span>
        </div>
      </div>
    </div>
    <div v-if="transactionType === 'sell'">
      <q-separator :dark="darkMode" class="q-mt-lg q-mx-md"/>

      <div class="q-mx-lg q-pt-lg">
        <div class="q-px-lg bold-text">
          Payment Methods
        </div>
        <div class="q-gutter-sm q-pt-sm q-px-lg">
          <q-badge v-for="method in postData.paymentMethods" :key="method.id" rounded outline color="red" :label="method.paymentType.name" />
        </div>
      </div>
    </div>

    <RampDragSlide
      v-if="!swipeStatus"
      :style="{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1500,
      }"
      :swiped="swipedStatus"
      @swiped="onSwiped()"
      text="Swipe To Confirm"
    />
  </div>
  <!-- else progress loader -->
</template>
<script>
// import RampDragSlide from '../../drag-slide.vue'
import RampDragSlide from './RampDragSlide.vue'
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
      wallet: null,
      swipeStatus: false
    }
  },
  emits: ['back', 'success'],
  components: {
    RampDragSlide
  },
  props: {
    postData: Object,
    ptl: Object,
    transactionType: String
  },
  async mounted () {
    const vm = this
    // vm.adData = vm.postData
    vm.paymentTimeLimit = vm.ptl
    vm.isLoaded = true

    // init wallet
    const walletInfo = this.$store.getters['global/getWallet']('bch')
    this.wallet = await loadP2PWalletInfo(walletInfo)
  },
  methods: {
    async onSwiped () {
      const vm = this
      const url = vm.apiURL + '/ad/'
      const timestamp = Date.now()
      const signature = await signMessage(this.wallet.privateKeyWif, 'AD_CREATE', timestamp)
      const headers = {
        'wallet-hash': this.wallet.walletHash,
        timestamp: timestamp,
        signature: signature
      }
      const body = vm.transformPostData()
      vm.$axios.post(url, body, { headers: headers })
        .then(response => {
          console.log('response:', response.data)
          vm.swipeStatus = true
          vm.$emit('success')
        })
        .catch(error => {
          console.error(error.response)
          vm.swipeStatus = false
        })
    },
    transformPostData () {
      // finalize ad data
      const vm = this
      const defaultCrypto = 'BCH'
      const data = vm.postData
      const idList = data.paymentMethods.map(obj => obj.id)
      return {
        trade_type: data.tradeType,
        price_type: data.priceType,
        fiat_currency: data.fiatCurrency.symbol,
        crypto_currency: defaultCrypto,
        fixed_price: parseFloat(data.fixedPrice),
        floating_price: parseFloat(data.floatingPrice),
        trade_floor: parseFloat(data.tradeFloor),
        trade_ceiling: parseFloat(data.tradeCeiling),
        crypto_amount: parseFloat(data.cryptoAmount),
        time_duration_choice: data.timeDurationChoice,
        payment_methods: idList
      }
    },
    formattedCurrencyNumber (value) {
      const parsedValue = parseFloat(value)
      const formattedNumber = parsedValue.toLocaleString(undefined, {
        style: 'currency',
        currency: this.postData.fiatCurrency.symbol,
        minimumFractionDigits: 0,
        maximumFractionDigits: parsedValue % 1 === 0 ? 0 : 2
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
