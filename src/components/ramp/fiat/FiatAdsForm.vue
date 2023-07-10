<template>
  <div class="q-pb-md">
    <div v-if="step < 3">
      <q-btn
        flat
        padding="md"
        icon="arrow_back"
        @click="step > 1 ? step-- : $emit('back')"
      />
    </div>
    <div v-if="step === 1">
      <div>
        <div class="text-h5 q-mx-lg text-center bold-text lg-font-size" :class="transactionType === 'BUY' ? 'buy-color' : 'sell-color'" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
          <span v-if="adsState === 'create'">POST {{ transactionType.toUpperCase() }} AD</span>
          <span v-if="adsState === 'edit'">EDIT {{ transactionType.toUpperCase() }} AD</span>
        </div>
      </div>
      <!-- Price Settings -->
      <div class="q-px-lg">
        <div class="q-mx-lg q-pb-sm q-pt-md bold-text">
          Price Setting
        </div>
        <div class="text-center q-mx-md">
          <q-btn-toggle
            dense
            v-model="adData.priceType"
            spread
            class="br-15"
            :style="transactionType === 'BUY' ? 'border: 1px solid #2196F3' : 'border: 1px solid #ed5f59'"
            no-caps
            unelevated
            :toggle-color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
            :text-color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
            :options="[
              {label: 'Fixed', value: 'FIXED'},
              {label: 'Floating', value: 'FLOATING'}
            ]"
          />
        </div>
        <div class="row q-pt-sm q-gutter-sm q-px-md sm-font-size">
          <div class="col-4">
            <div class="q-pl-sm q-pb-xs">Fiat</div>
            <q-select
              dense
              rounded
              outlined
              :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
              :dark="darkMode"
              v-model="selectedCurrency"
              :options="fiatCurrencies"
              option-label="symbol"
              @update:model-value="updateFiatCurrency()"
            >
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.name }} ({{ scope.opt.symbol }})</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>
          <div class="col">
            <!-- <q-select :dark="darkMode" rounded outlined v-model="selectedCurrency" :options="Object.keys(availableFiat)" label="Fiat Currency" /> -->
            <div class="q-pl-sm q-pb-xs">{{ adData.priceType === 'FIXED'? 'Fixed Price' : 'Floating Price Margin' }}</div>
            <q-input
              dense
              rounded
              outlined
              :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
              :dark="darkMode"
              bottom-slots
              v-model="priceValue">
              <template v-slot:prepend>
                <q-icon name="remove" @click="decPriceValue()"/>
              </template>
              <template v-slot:append>
                <q-icon v-if="adData.priceType === 'FLOATING'" size="xs" name="percent" />
                <q-icon name="add" @click="incPriceValue()" />
              </template>
            </q-input>
          </div>
        </div>
        <div class="sm-font-size">
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <div>
              <span>Your Price</span><br>
              <span class="bold-text lg-font-size">{{ priceAmount }} {{ selectedCurrency.symbol }}</span>
              <!-- <span v-else class="bold-text lg-font-size">{{ (lowestOrderPrice * (priceAmount/100)).toFixed(2) }} {{ selectedCurrency.symbol }}</span> -->
            </div>
            <div >
              <span>Current Market Price</span><br>
              <span class="xm-font-size" style="float: right;">{{ marketPrice }} {{ selectedCurrency.symbol }}</span>
            </div>
          </div>
        </div>
      </div>

      <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/>

      <!-- Total Amount -->
      <div class="q-mx-lg">
        <div class="q-mt-md q-px-md">
          <div class="q-pb-xs q-pl-sm bold-text">Total Amount</div>
            <q-input
              dense
              outlined
              rounded
              :dark="darkMode"
              :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
              v-model="adData.cryptoAmount"
            >
              <template v-slot:prepend>
                <span class="bold-text xs-font-size">
                  BCH
                </span>
              </template>
              <template v-slot:append>
                <q-icon size="xs" name="close" @click="amount = 0"/>
                <!-- <q-btn padding="none" style="font-size: 12px;" flat color="primary" label="MAX" /> -->
              </template>
            </q-input>
          </div>
        <div class="q-mt-sm q-px-md">
          <div class="q-pl-sm q-pb-xs sm-font-size">Trade Limit</div>
          <div class="row">
            <div class="col-5">
              <q-input
                dense
                outlined
                rounded=""
                :dark="darkMode"
                :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
                v-model="adData.tradeFloor"
              >
                <template v-slot:append>
                  <span class="xs-font-size">{{ selectedCurrency.symbol  }}</span>
                  <!-- <q-btn padding="none" style="font-size: 12px;" flat color="primary" label="MAX" /> -->
                </template>
              </q-input>
            </div>
            <div class="col text-center">
              <q-icon class="q-pt-sm" name="remove"/>
            </div>
            <div class="col-5">
              <q-input
                dense
                outlined
                rounded=""
                :dark="darkMode"
                :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
                v-model="adData.tradeCeiling"
              >
                <template v-slot:append>
                  <span class="xs-font-size">{{ selectedCurrency.symbol  }}</span>
                  <!-- <q-btn padding="none" style="font-size: 12px;" flat color="primary" label="MAX" /> -->
                </template>
              </q-input>
            </div>
          </div>
        </div>
      </div>
      <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/>

      <!-- Payment Time Limit -->
      <div class="q-mx-lg q-pt-md">
        <div class="q-px-lg">
          <div class="q-pt-sm bold-text">Payment Time Limit</div>
        </div>
        <div class="q-mx-md q-pt-sm">
          <div>
            <q-select
                dense
                outlined
                rounded
                :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
                :dark="darkMode"
                v-model="paymentTimeLimit"
                :options="ptlSelection"
                @update:modelValue="updatePaymentTimeLimit()"
              />
                <!-- <template v-slot:append>
                  <q-icon size="xs" name="close" @click.stop.prevent="ptl = ''"/>&nbsp;
                </template> -->
              <!-- </q-select> -->
          </div>
        </div>
      </div>

      <!-- NEXT STEP -->
      <div class="q-mx-lg">
        <div class="row q-mx-sm q-py-lg">
          <q-btn
            :disable="checkPostData()"
            rounded
            no-caps
            :label="transactionType === 'BUY' ? 'Post Ad' : 'Next'"
            color="blue-6"
            class="q-space"
            @click="checkSubmitOption()"
          />
        </div>
      </div>
    </div>
    <div v-if="step === 2">
      <div class="q-px-md">
        <AddPaymentMethods
          :confirm-label="'Post Ad'"
          :currentPaymentMethods="adData.paymentMethods"
          v-on:submit="postAd"
        />
      </div>
    </div>
    <div v-if="step === 3">
      <DisplayConfirmation
        :post-data="adData"
        :ptl="paymentTimeLimit"
        :transaction-type="transactionType"
        v-on:back="step = 1"
      />
    </div>
  </div>
</template>
<script>
import { debounce } from 'quasar'
import AddPaymentMethods from './AddPaymentMethods.vue'
import DisplayConfirmation from './DisplayConfirmation.vue'

export default {
  props: {
    transactionType: String,
    adsState: String
  },
  components: {
    AddPaymentMethods,
    DisplayConfirmation
  },
  emits: ['back'],
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wsURL: process.env.RAMP_WS_URL + 'market-price/',
      marketPrice: null,
      step: 1,
      priceValue: null,
      priceAmount: 0,
      floatingPrice: 100, // default: 100%
      paymentTimeLimit: {
        label: '1 day',
        value: 1440
      },
      selectedCurrency: null,
      adData: {
        tradeType: this.transactionType,
        priceType: 'FIXED',
        fiatCurrency: this.$store.getters['market/selectedCurrency'],
        cryptoCurrency: { // get crypro_currency ID
          name: 'Bitcoin Cash',
          symbol: 'BCH'
        },
        fixedPrice: null,
        floatingPrice: 100,
        tradeFloor: null,
        tradeCeiling: null,
        cryptoAmount: null,
        timeDurationChoice: 1440,
        paymentMethods: []
      },

      // SELECTION OPTIONS
      availableFiat: [ // api/ramp-p2p/currency/fiat/
        {
          name: 'Philippine Peso',
          abbrev: 'PHP'
        },
        {
          name: 'United States Dollar',
          abbrev: 'USD'
        },
        {
          name: 'Canadian Dollar',
          abbrev: 'CAD'
        },
        {
          name: 'Japanese Yen',
          abbrev: 'JPY'
        },
        {
          name: 'Russian Ruble',
          abbrev: 'RUB'
        }
      ],
      ptlSelection: [
        {
          label: '15 min',
          value: 15
        }, {
          label: '30 min',
          value: 30
        }, {
          label: '1 hr',
          value: 60
        }, {
          label: '5 hrs',
          value: 300
        }, {
          label: '12 hrs',
          value: 720
        }, {
          label: '1 day',
          value: 1440
        }],
      fiatCurrencies: [],
      websocket: null
    }
  },
  watch: {
    marketPrice (value) {
      const vm = this
      vm.priceAmount = vm.transformPrice(value)
    },
    'adData.priceType' (value) {
      const vm = this
      vm.priceAmount = vm.transformPrice(vm.marketPrice)
      vm.updatePriceValue(value)
    },
    'priceValue' (value) {
      const vm = this
      switch (vm.adData.priceType) {
        case 'FIXED':
          vm.adData.fixedPrice = value
          break
        case 'FLOATING':
          vm.adData.floatingPrice = value
      }
      vm.priceAmount = vm.transformPrice(vm.marketPrice)
    }
  },
  async created () {
    const vm = this
    vm.selectedCurrency = vm.$store.getters['market/selectedCurrency']
    await vm.getInitialMarketPrice()
    vm.setupWebsocket()
    console.log('adData:', vm.adData)
  },
  async mounted () {
    const vm = this
    await vm.getFiatCurrencies()
    // vm.priceAmount = vm.lowestOrderPrice
    vm.adData.tradeType = vm.transactionType.toUpperCase()
    vm.updatePriceValue(vm.adData.priceType)
    // this.updateConvertionRate()
  },
  beforeUnmount () {
    this.closeWSConnection()
  },
  methods: {
    updatePriceValue (priceType) {
      const vm = this
      switch (priceType) {
        case 'FIXED':
          vm.priceValue = vm.priceAmount
          break
        case 'FLOATING':
          vm.priceValue = vm.adData.floatingPrice
          break
      }
      // console.log('priceType:', priceType)
      // console.log('priceValue:', vm.priceValue)
    },
    transformPrice (value) {
      // console.log('transforming price')
      const vm = this
      if (vm.adData.priceType === 'FLOATING') {
        return value * (vm.adData.floatingPrice / 100)
      }
      return vm.adData.fixedPrice
    },
    closeWSConnection () {
      if (this.websocket) {
        this.websocket.close()
      }
    },
    setupWebsocket () {
      const wsUrl = this.wsURL + this.selectedCurrency.symbol + '/'
      this.websocket = new WebSocket(wsUrl)
      this.websocket.onopen = () => {
        console.log('WebSocket connection established to ' + wsUrl)
      }
      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        const price = parseFloat(data.price)
        if (price) {
          this.marketPrice = price.toFixed(2)
        }
      }
      this.websocket.onclose = () => {
        console.log('WebSocket connection closed.')
      }
    },
    async getInitialMarketPrice () {
      const vm = this
      const url = vm.apiURL + '/utils/market-price'
      vm.$axios.get(url, { params: { currency: vm.selectedCurrency.symbol } })
        .then(response => {
          vm.marketPrice = parseFloat(response.data[0].price)
          vm.adData.fixedPrice = vm.marketPrice
          vm.priceValue = vm.adData.fixedPrice
        })
        .catch(error => {
          console.error(error.response)
        })
    },
    async getFiatCurrencies () {
      const vm = this
      vm.$axios.get(vm.apiURL + '/currency/fiat')
        .then(response => {
          vm.fiatCurrencies = response.data
          if (!vm.selectedCurrency) {
            vm.selectedCurrency = vm.fiatCurrencies[0]
          }
          // console.log('fiatCurrencies:', this.fiatCurrencies)
        })
        .catch(error => {
          console.error(error)
          console.error(error.response)

          vm.fiatCurrencies = vm.availableFiat
          if (!vm.selectedCurrency) {
            vm.selectedCurrency = vm.fiatCurrencies[0]
          }
        })
      // console.log(vm.fiatCurrencies)
    },
    checkSubmitOption () {
      const vm = this
      console.log('data:', this.adData)
      const ad = this.adData
      const defaultCrypto = 1
      const body = {
        trade_type: ad.tradeType,
        price_type: ad.priceType,
        fiat_currency: ad.fiatCurrency,
        crypto_currency: defaultCrypto,
        fixed_price: 1000,
        trade_floor: 100,
        trade_ceiling: 1000,
        crypto_amount: 1,
        time_duration_choice: 5,
        payment_methods: [1, 2]
      }
      switch (vm.transactionType) {
        case 'BUY':
          vm.step = 3
          break
        case 'SELL':
          vm.step++
          break
      }
    },
    postAd (methods) {
      const vm = this
      // Finalize Data
      // console.log(methods)

      vm.adData.paymentMethods = methods
      // console.log(vm.adData)
      vm.step++
    },
    decPriceValue () {
      this.priceValue--
    },
    incPriceValue () {
      this.priceValue++
    },
    updatePaymentTimeLimit () {
      const vm = this
      vm.adData.timeDurationChoice = vm.paymentTimeLimit.value
    },
    async updateFiatCurrency () {
      const vm = this
      console.log('selectedCurrency:', vm.selectedCurrency)
      vm.adData.fiatCurrency = vm.selectedCurrency
      // update market price subscription
      vm.marketPrice = null
      await vm.getInitialMarketPrice()
      vm.closeWSConnection()
      vm.setupWebsocket()
    },
    checkPostData () {
      const vm = this
      // return false
      // check if valid amount
      if (!vm.isAmountValid(vm.priceAmount) || !vm.isAmountValid(vm.adData.cryptoAmount) || !vm.isAmountValid(vm.adData.tradeCeiling) || !vm.isAmountValid(vm.adData.tradeFloor)) {
        return true
      } else {
        return false
      }
    },
    isAmountValid (value) {
      // amount with comma and decimal regex
      const regex = /^(\d*[.]\d+)$|^(\d+)$|^((\d{1,3}[,]\d{3})+(\.\d+)?)$/
      value = String(value)

      if (regex.test(value) && value !== '0') {
        return true
      } else {
        return false
      }
    },
    initialPriceAmount () {
      const vm = this
      switch (vm.adData.priceType) {
        case 'FIXED':
          vm.priceAmount = vm.lowestOrderPrice
          break
        case 'FLOATING':
          vm.priceAmount = 100
          break
      }
    },

    updateConvertionRate: debounce(async function () {
      const vm = this
      console.log('updating price')
      console.log('priceAmount:', vm.priceAmount)
      switch (vm.adData.priceType) {
        case 'FIXED':
          vm.adData.fixedPrice = vm.priceAmount
          vm.adData.floatingPrice = null
          break
        case 'FLOATING':
          vm.adData.floatingPrice = (vm.lowestOrderPrice * (vm.priceAmount / 100)).toFixed(2) // adjust later
          vm.adData.fixedPrice = null
          break
      }
      console.log('fixedPrice:', vm.adData.fixedPrice)
    }, 500)
  }
}
</script>
<style lang="scss" scoped>
.my-custom-toggle {
  border: 1px solid #ed5f59
}
.buy-color {
  color: rgb(60, 100, 246);
}
.sell-color {
  color: #ed5f59;
}
</style>
