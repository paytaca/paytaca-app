<template>
  <div
    class="q-mx-md text-bow"
    :class="getDarkModeClass(darkMode)">
    <div class="q-pb-md" v-if="isLoaded">
      <div class="text-center text-weight-bold q-mt-sm" style="font-size: large;">CONFIRM AD DETAILS</div>
      <div v-if="type === 'ads'" :style="`height: ${minHeight - 170}px;`" style="overflow-y:auto;">
        <div class="md-font-size pt-label" :class="getDarkModeClass(darkMode)">
          <div class="q-pt-sm q-mx-md">
            <div class="row no-wrap q-mx-lg text-weight-bold" style="font-size: medium;">
              <span>{{ $t('PriceSetting') }}</span>
            </div>
            <div class="q-mx-sm">
              <div class="row justify-between no-wrap q-mx-lg">
                <span>{{ $t('FiatCurrency') }}</span>
                <span class="text-nowrap q-ml-xs">{{ adData.fiatCurrency.symbol }}</span>
              </div>
              <div class="row justify-between no-wrap q-mx-lg">
                <span>{{ $t('PriceType') }}</span>
                <span class="text-nowrap q-ml-xs">{{ adData.priceType === 'FIXED' ? 'Fixed' : 'Floating' }}</span>
              </div>
              <div v-if="adData.priceType === 'FLOATING'" class="row justify-between no-wrap q-mx-lg">
                <span>Floating Price</span>
                <span class="text-nowrap q-ml-xs">
                  {{ adData.floatingPrice }}%
                </span>
              </div>
              <div class="row justify-between no-wrap q-mx-lg text-weight-bold" style="font-size: medium;">
                <span>Price</span>
                <span v-if="marketPrice && adData.priceType === 'FLOATING'" class="text-nowrap q-ml-xs">
                  {{ formatCurrency(((marketPrice * adData.floatingPrice) / 100), postData.fiatCurrency.symbol) }}
                </span>
                <span v-if="adData.priceType === 'FIXED'" class="text-nowrap q-ml-xs">
                  {{ formatCurrency(adData.fixedPrice, postData.fiatCurrency.symbol) }}
                </span>
              </div>
            </div>
            <q-separator :dark="darkMode" class="q-my-md q-mx-md"/>
            <div class="row no-wrap q-mx-lg text-weight-bold" style="font-size: medium;">
              <span>Limits per Trade</span>
            </div>
            <div class="q-mx-sm">
              <div class="row justify-between no-wrap q-mx-lg">
                <span>Quantity</span>
                <span class="text-nowrap q-ml-xs">{{ parseFloat(adData.tradeAmount) }} {{ adData.isTradeLimitsFiat ? adData.fiatCurrency.symbol : adData.cryptoCurrency.symbol }}</span>
              </div>
              <!-- <div class="row justify-between no-wrap q-mx-lg">
                <q-space/>
                <span class="text-nowrap q-ml-xs">{{ parseFloat(adData.tradeAmount) * $parent.marketPrice }} BCH</span>
              </div> -->
              <div class="row justify-between no-wrap q-mx-lg">
                <span>Minimum</span>
                <span class="text-nowrap q-ml-xs">{{ formatCurrency(adData.tradeFloor, tradeLimitsCurrency(adData)) }} {{ tradeLimitsCurrency(adData) }} </span>
              </div>
              <div class="row justify-between no-wrap q-mx-lg">
                <span>Maximum</span>
                <span class="text-nowrap q-ml-xs">{{ formatCurrency(adData.tradeCeiling, tradeLimitsCurrency(adData)) }} {{ tradeLimitsCurrency(adData) }} </span>
              </div>
              <div class="row justify-between no-wrap q-mx-lg">
                <span>Appealable after</span>
                <span class="text-nowrap q-ml-xs">{{ adData?.appealCooldown?.label }} </span>
              </div>
            </div>
            <q-separator :dark="darkMode" class="q-my-md q-mx-md"/>
            <div class="row no-wrap q-mx-lg text-weight-bold" style="font-size: medium;">
              <span>Payment Methods</span>
            </div>
            <div class="q-gutter-sm q-pt-sm q-px-lg">
              <q-badge
                v-for="method in postData.paymentMethods"
                :key="method.id"
                :label="method?.payment_type?.short_name || method?.payment_type?.full_name"
                rounded
                outline
                color="red"/>
            </div>
            <div v-if="adData?.description">
              <q-separator :dark="darkMode" class="q-my-md q-mx-md"/>
              <div class="row no-wrap q-mx-lg text-weight-bold" style="font-size: medium;">
                <span>Description</span>
              </div>
              <div class="q-gutter-sm q-pt-sm q-px-lg">
                <div class="description" :class="darkMode ? 'text-white' : 'text-grey-8'">
                  {{ adData?.description }}
                </div>
              </div> 
            </div>            
          </div>
        </div>
      </div>

      <div v-if="type === 'order'">
        <div class="q-pt-lg">
          <div class="text-center lg-font-size text-weight-bold" :class="transactionType === 'SELL' ? 'buy-color' : 'sell-color'">
            <span>{{ transactionType === 'SELL' ? 'Buying': 'Selling' }} BCH {{ transactionType === 'SELL' ? 'from': 'to' }}</span><br>
            <span>
              <u>{{ adData.owner}}</u>
            </span>
          </div>
          <q-separator :dark="darkMode" class="q-mx-lg q-mt-md"/>
          <div :class="getDarkModeClass(darkMode)" class="q-px-lg q-pt-md md-font-size pt-label">
            <div class="text-weight-bold subtext">
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
            <div class="md-font-size text-weight-bold q-py-sm">Pay With</div>
            <div class="q-gutter-sm q-px-lg">
              <q-badge v-for="method in adData.payment_methods" :key="method.id" rounded outline :color="transactionType === 'SELL'? 'blue': 'red'">
                {{ method.payment_type }}
              </q-badge>
            </div>
          </div>
          <div class="text-center q-px-md">
            <div class="md-font-size text-weight-bold q-py-sm">Your Payment Methods</div>
            <q-list bordered class="q-mx-lg" :dark="darkMode">
              <div
                v-for="(method, index) in paymentMethods"
                :key="index">
                <q-expansion-item
                  group="somegroup"
                  :label="method.payment_type.name.toUpperCase()">
                  <!-- ^ higlight header-class payment method on seller/buyer list -->
                  <q-card flat class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                    <q-card-section>
                      <!-- <span>{{ method.account_name }}</span><br> -->
                      <span class="subtext">{{ method.account_identifier }}</span>
                    </q-card-section>
                  </q-card>
                </q-expansion-item>
                <q-separator :dark="darkMode" />
              </div>
            </q-list>
          </div>
        </div>
      </div>

      <RampDragSlide
        :key="dragSlideKey"
        v-if="showDragSlide"
        :style="{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1500,
        }"
        @ok="$emit('submit')"
        @cancel="showDragSlide=true; dragSlideKey++"
        :text="$t('SwipeToConfirmLower')"
      />
    </div>
  </div>
</template>
<script>
import RampDragSlide from './dialogs/RampDragSlide.vue'
import { formatCurrency } from 'src/exchange'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'
import { bus } from 'src/wallet/event-bus'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      adData: null,
      isLoaded: false,
      wallet: null,
      showDragSlide: true,
      dragSlideKey: 0,
      marketPrice: null,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100
    }
  },
  emits: ['back', 'submit'],
  components: {
    RampDragSlide
  },
  props: {
    type: {
      type: String,
      default: 'ads'
    },
    transactionType: String,
    postData: Object,
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
    
    vm.fetchMarketPrice()
    vm.isLoaded = true
  },
  methods: {
    getDarkModeClass,
    formatCurrency,
    tradeLimitsCurrency (ad) {
      return (ad.isTradeLimitsFiat ? ad.fiatCurrency.symbol : ad.cryptoCurrency.symbol)
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
    },
    async fetchMarketPrice () {
      const vm = this
      try {
        const response = await backend.get('/ramp-p2p/utils/market-price/', { params: { currency: vm.adData?.fiatCurrency?.symbol } })
        vm.marketPrice = parseFloat(response.data.price)
        console.log(response)
      } catch (error) {
        this.handleRequestError(error)
      }
    },
    handleRequestError (error) {
      bus.emit('handle-request-error', error)
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
.description {
  text-align: justify;
  text-align-last: left;
  white-space:pre-wrap;
  font-size: 15px;
}
</style>
