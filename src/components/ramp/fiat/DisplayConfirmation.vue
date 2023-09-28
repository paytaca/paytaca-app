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

    <div v-if="type === 'ads'">
      <div class="md-font-size" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
        <div class="q-pt-lg q-mx-lg ">
          <div class="row justify-between no-wrap q-mx-lg">
            <span>Fiat Currency</span>
            <span class="text-nowrap q-ml-xs">{{ adData.fiatCurrency.symbol }}</span>
          </div>
          <div class="row justify-between no-wrap q-mx-lg">
            <span>Price Type</span>
            <span class="text-nowrap q-ml-xs">{{ adData.priceType === 'FIXED' ? 'Fixed' : 'Floating' }}</span>
          </div>
          <div class="row justify-between no-wrap q-mx-lg bold-text">
            <span>{{ adData.priceType === 'FIXED' ? 'Fixed Price' : 'Floating Price Margin' }}</span>
            <!-- <span>Price:</span> -->
            <span class="text-nowrap q-ml-xs">
              {{ adData.priceType === 'FIXED' ? formattedCurrency(adData.fixedPrice) : adData.floatingPrice }} {{ adData.priceType === 'FLOATING' ? '%' : '' }}
            </span>
          </div>
        </div>

        <q-separator :dark="darkMode" class="q-mt-lg q-mx-md"/>

        <div class="q-pt-lg q-mx-lg">
          <div class="row justify-between no-wrap q-mx-lg">
            <span>Trade Limit</span>
            <span class="text-nowrap q-ml-xs">{{ formattedCurrency(adData.tradeFloor) }} - {{ formattedCurrency(adData.tradeCeiling) }} </span>
          </div>
          <div class="row justify-between no-wrap q-mx-lg bold-text">
            <span>Trade Amount</span>
            <span class="text-nowrap q-ml-xs">{{ formattedCurrency(adData.tradeAmount) }} BCH</span>
          </div>
        </div>
        <q-separator :dark="darkMode" class="q-mt-lg q-mx-md"/>

        <div class="q-pt-lg q-mx-lg" >
          <div class="row justify-between no-wrap q-mx-lg bold-text">
            <span>Payment Time Limit</span>
            <!-- <span class="text-nowrap q-ml-xs">{{ adData.time_duration }}</span> -->
            <span class="text-nowrap q-ml-xs">{{ paymentTimeLimit.label }}</span>
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
    </div>

    <div v-if="type === 'order'">
      <div class="q-pt-lg">
        <div class="text-center lg-font-size bold-text" :class="transactionType === 'SELL' ? 'buy-color' : 'sell-color'">
          <span>{{ transactionType === 'SELL' ? 'Buying': 'Selling' }} BCH {{ transactionType === 'SELL' ? 'from': 'to' }}</span><br>
          <span>
            <u>{{ adData.owner}}</u>
          </span>
        </div>
        <q-separator :dark="darkMode" class="q-mx-lg q-mt-md"/>
        <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="q-px-lg q-pt-md md-font-size">
          <div class="bold-text subtext">
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Fiat Amount</span>
              <span class="text-nowrap q-ml-xs">{{ fiatAmount }} {{ adData.fiat_currency.symbol }}</span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Crypto Amount</span>
              <span class="text-nowrap q-ml-xs">{{ cryptoAmount.toFixed(8) }} BCH</span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Payment Time Duration</span>
              <span class="text-nowrap q-ml-xs">{{ adData.time_duration/60 }} hours</span>
            </div>
          </div>
        </div>
        <q-separator :dark="darkMode" class="q-mx-lg q-mt-lg"/>
        <div class="text-center q-px-md">
          <div class="md-font-size bold-text q-py-sm">Pay With</div>
          <div class="q-gutter-sm q-px-lg">
            <q-badge v-for="method in adData.payment_methods" :key="method.id" rounded outline :color="transactionType === 'SELL'? 'blue': 'red'">
              {{ method.payment_type }}
            </q-badge>
          </div>
        </div>
        <div class="text-center q-px-md">
          <div class="md-font-size bold-text q-py-sm">Your Payment Methods</div>
          <q-list bordered class="q-mx-lg" :dark="darkMode">
            <div
              v-for="(method, index) in paymentMethods"
              :key="index"
            >
              <q-expansion-item
                group="somegroup"
                :label="method.payment_type.name.toUpperCase()"
              >
                <!-- ^ higlight header-class payment method on seller/buyer list -->
                <q-card flat  :class="[ darkMode ? 'text-white pt-dark-card' : 'text-black',]">
                  <q-card-section>
                    <!-- <span>{{ method.account_name }}</span><br> -->
                    <span class="subtext">{{ method.account_number }}</span>
                  </q-card-section>
                </q-card>
              </q-expansion-item>
              <q-separator :dark="darkMode" />
            </div>
          </q-list>
        </div>
      </div>
    </div>

    <DragSlide
      v-if="!swipeStatus"
      :style="{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1500,
      }"
      @swiped="$emit('submit')"
      text="Swipe To Confirm"
    />
  </div>
  <!-- else progress loader -->
</template>
<script>
import DragSlide from '../../drag-slide.vue'
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
  emits: ['back', 'submit'],
  components: {
    DragSlide
  },
  props: {
    type: {
      type: String,
      default: 'ads'
    },
    transactionType: String,
    postData: Object,
    ptl: {
      type: Object,
      default: null
    },
    fiatAmount: {
      type: Number,
      default: null
    },
    cryptoAmount: {
      type: Number,
      default: null
    },
    paymentMethods: {
      type: Object,
      default: null
    }
  },
  async mounted () {
    const vm = this
    vm.adData = vm.postData
    vm.paymentTimeLimit = vm.ptl
    vm.isLoaded = true
  },
  methods: {
    formattedCurrency (value) {
      const parsedValue = parseFloat(value)
      const formattedNumber = parsedValue.toLocaleString(undefined, {
        style: 'currency',
        currency: this.postData.fiatCurrency.symbol,
        minimumFractionDigits: 0,
        maximumFractionDigits: parsedValue % 1 === 0 ? 0 : 2
      })
      return formattedNumber
    },
    checkMatchingPaymentMethod (userPM, adMethodList) {
      adMethodList = adMethodList.map(p => p.payment_type)
      return adMethodList.includes(userPM)
    },
    matchPaymentMethod () {
      const adMethod = this.adData.payment_methods

      if (adMethod) {
        const matched = adMethod.map(p => p.payment_type)
        console.log('matched:', matched)
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.subtext {
  opacity: .5;
}
.buy-color {
  color: rgb(60, 100, 246);
}
.sell-color {
  color: #ed5f59;
}
</style>
