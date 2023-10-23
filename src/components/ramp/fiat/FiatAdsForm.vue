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
      <div v-if="loading">
        <div class="row justify-center q-py-lg" style="margin-top: 50px">
          <ProgressLoader/>
        </div>
      </div>
      <div class="q-pt-sm" v-else>
        <q-scroll-area :style="`height: ${minHeight - minHeight * 0.2}px`" style="overflow-y:auto;">
          <div class="q-px-lg">
            <div class="q-mx-lg q-pb-sm q-pt-sm bold-text">
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
                  :dark="darkMode"
                  v-model="selectedCurrency"
                  :options="fiatCurrencies"
                  option-label="symbol"
                  @update:model-value="updateFiatCurrency()"
                >
                  <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section>
                        <q-item-label :style="darkMode ? 'color: white;' : 'color: black;'">
                          {{ scope.opt.name }} ({{ scope.opt.symbol }})
                        </q-item-label>
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
                  type="number"
                  :rules="numberValidation"
                  @blur="updatePriceValue(adData.priceType)"
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
                  <span class="bold-text xm-font-size">{{ formattedCurrency(priceAmount) }}</span>
                  <!-- <span v-else class="bold-text lg-font-size">{{ (lowestOrderPrice * (priceAmount/100)).toFixed(2) }} {{ selectedCurrency.symbol }}</span> -->
                </div>
                <div >
                  <span>Current Market Price</span><br>
                  <span class="md-font-size" style="float: right;">{{ formattedCurrency(marketPrice) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/> -->

          <!-- Crypto Amount -->
          <div class="q-mx-lg q-mt-sm">
            <div class="q-mt-sm q-px-md">
              <div class="q-pb-xs q-pl-sm bold-text">Trade Amount</div>
                <q-input
                  dense
                  outlined
                  rounded
                  :dark="darkMode"
                  :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
                  type="number"
                  :rules="numberValidation"
                  v-model="adData.tradeAmount">
                  <template v-slot:prepend>
                    <span class="bold-text xs-font-size">
                      BCH
                    </span>
                  </template>
                </q-input>
              </div>
            <div class="q-px-md">
              <div class="q-pb-xs q-pl-sm bold-text">Trade Limit</div>
              <div class="row">
                <div class="col-5">
                  <div class="q-pl-sm q-pb-xs sm-font-size">Minimum</div>
                  <q-input
                    dense
                    outlined
                    rounded=""
                    :dark="darkMode"
                    :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
                    type="number"
                    :rules="tradeLimitValidation"
                    v-model="adData.tradeFloor"
                  >
                    <template v-slot:append>
                      <span class="xs-font-size">{{ adData.cryptoCurrency.symbol  }}</span>
                      <!-- <q-btn padding="none" style="font-size: 12px;" flat color="primary" label="MAX" /> -->
                    </template>
                  </q-input>
                </div>
                <div class="col text-center">
                  <q-icon class="q-pt-md q-mt-lg" name="remove"/>
                </div>
                <div class="col-5">
                  <div class="q-pl-sm q-pb-xs sm-font-size">Maximum</div>
                  <q-input
                    dense
                    outlined
                    rounded=""
                    :dark="darkMode"
                    :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
                    type="number"
                    :rules="tradeLimitValidation"
                    v-model="adData.tradeCeiling"
                  >
                    <template v-slot:append>
                      <span class="xs-font-size">{{ adData.cryptoCurrency.symbol  }}</span>
                      <!-- <q-btn padding="none" style="font-size: 12px;" flat color="primary" label="MAX" /> -->
                    </template>
                  </q-input>
                </div>
              </div>
            </div>
          </div>

          <!-- <q-separator :dark="darkMode" class="q-mx-md"/> -->

          <!-- Payment Time Limit -->
          <div class="q-mx-lg q-pt-xs">
            <div class="q-px-lg">
              <div class="q-pt-sm bold-text">Payment Time Limit</div>
            </div>
            <div class="q-mx-md q-pt-sm">
              <q-select
                  dense
                  outlined
                  rounded
                  :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
                  :dark="darkMode"
                  v-model="paymentTimeLimit"
                  :options="ptlSelection"
                  @update:modelValue="updatePaymentTimeLimit()">
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section>
                      <q-item-label :style="darkMode ? 'color: white;' : 'color: black;'">
                        {{ scope.opt.label }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
            <div class="q-mx-md q-pt-xs">
              <q-checkbox
                :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
                v-model="adData.isPublic"
                label="Public"
              />
            </div>
          </div>
          <div class="row q-mx-lg q-px-md q-mt-xs q-mb-md">
            <q-btn
              :disable="checkPostData()"
              rounded
              no-caps
              label="Next"
              :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
              class="q-space"
              @click="checkSubmitOption()"
            />
          </div>
        </q-scroll-area>
      </div>
    </div>
    <div v-if="step === 2">
      <div class="q-px-md">
        <AddPaymentMethods
          :type="'Ads'"
          :confirm-label="'Post Ad'"
          :currentPaymentMethods="adData.paymentMethods"
          v-on:submit="appendPaymentMethods"
        />
      </div>
    </div>
    <div v-if="step === 3">
      <DisplayConfirmation
        :post-data="adData"
        :ptl="paymentTimeLimit"
        :transaction-type="transactionType"
        v-on:back="step = 1"
        @submit="onSubmit()"
      />
    </div>
  </div>
</template>
<script>
import AddPaymentMethods from './AddPaymentMethods.vue'
import DisplayConfirmation from './DisplayConfirmation.vue'
import ProgressLoader from '../../ProgressLoader.vue'
import { debounce } from 'quasar'
import { formatCurrency, getPaymentTimeLimit, getCookie } from 'src/wallet/ramp'
import { bus } from 'src/wallet/event-bus.js'

export default {
  props: {
    transactionType: String,
    adsState: String,
    selectedAdId: Number
  },
  components: {
    AddPaymentMethods,
    DisplayConfirmation,
    ProgressLoader
  },
  emits: ['back', 'submit'],
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wsURL: process.env.RAMP_WS_URL + 'market-price/',
      authHeaders: this.$store.getters['ramp/authHeaders'],
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (95 + 120) : this.$q.screen.height - (70 + 100),
      loading: false,
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      websocket: null,
      marketPrice: null,
      priceValue: null,
      step: 1,
      priceAmount: 0,
      floatingPrice: 100, // default: 100%
      paymentTimeLimit: {
        label: '24 hrs',
        value: 1440
      },
      adData: {
        tradeType: this.transactionType,
        priceType: 'FLOATING',
        fiatCurrency: this.$store.getters['market/selectedCurrency'],
        cryptoCurrency: { // get crypro_currency ID
          name: 'Bitcoin Cash',
          symbol: 'BCH'
        },
        fixedPrice: 0,
        floatingPrice: 100,
        tradeFloor: 0.02,
        tradeCeiling: 100,
        tradeAmount: 100,
        timeDurationChoice: 5,
        paymentMethods: [],
        isPublic: true
      },
      ptlSelection: [
        {
          label: '5 min',
          value: 5
        },
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
          label: '24 hrs',
          value: 1440
        }],
      fiatCurrencies: [],
      numberValidation: [
        (val) => !!val || 'This field is required',
        (val) => val > 0 || 'Value must be greater than 0'
      ],
      tradeLimitValidation: [
        (val) => !!val || 'This field is required',
        (val) => val > 0 || 'Value must be greater than 0',
        (val) => this.checkTradeLimitComparison(val) || 'Min must be less than max trade limit'
      ]
    }
  },
  async mounted () {
    const vm = this
    vm.loading = true
    if (vm.selectedAdId !== null) {
      await vm.fetchAdDetail()
    }
    await vm.getInitialMarketPrice()
    vm.updatePriceValue(vm.adData.priceType)
    vm.loading = false
    vm.setupWebsocket()
    vm.adData.tradeType = vm.transactionType.toUpperCase()
    await vm.getFiatCurrencies()
  },
  beforeUnmount () {
    this.closeWSConnection()
  },
  watch: {
    marketPrice (value) {
      const vm = this
      if (vm.adData.priceType === 'FLOATING') {
        vm.priceAmount = vm.transformPrice(value)
      }
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
    },
    'adData.tradeAmount' (value) {
      if (!this.loading) { this.adData.tradeCeiling = value }
    },
    'adData.tradeCeiling' (value) {
      if (!this.loading) { this.adData.tradeAmount = value }
    }
  },
  methods: {
    async fetchAdDetail () {
      const vm = this
      // let timestamp = null
      // let signature = null
      // if (vm.wallet === null) {
      //   const walletInfo = this.$store.getters['global/getWallet']('bch')
      //   vm.wallet = await loadP2PWalletInfo(walletInfo, vm.walletIndex)
      //   timestamp = Date.now()
      //   signature = await signMessage(vm.wallet.privateKeyWif, 'AD_GET', timestamp)
      // }
      const url = vm.apiURL + '/ad/' + vm.selectedAdId
      try {
        const response = await vm.$axios.get(url, { headers: vm.authHeaders })
        const data = response.data
        console.log(data)
        vm.adData.tradeType = data.trade_type
        vm.adData.priceType = data.price_type
        vm.adData.fixedPrice = parseFloat(data.fixed_price)
        vm.adData.floatingPrice = parseFloat(data.floating_price)
        vm.adData.fiatCurrency = data.fiat_currency
        vm.adData.tradeAmount = parseFloat(data.trade_amount)
        vm.adData.tradeFloor = parseFloat(data.trade_floor)
        vm.adData.tradeCeiling = parseFloat(data.trade_ceiling)
        vm.adData.paymentMethods = data.payment_methods
        vm.adData.isPublic = data.is_public
        vm.paymentTimeLimit = getPaymentTimeLimit(data.time_duration)
        vm.selectedCurrency = data.fiat_currency
      } catch (error) {
        console.error(error.response)
        vm.swipeStatus = false
        if (error.response && error.response.status === 403) {
          bus.emit('session-expired')
        }
      }
    },
    async onSubmit () {
      const vm = this
      // if (vm.wallet === null) {
      //   const walletInfo = this.$store.getters['global/getWallet']('bch')
      //   vm.wallet = await loadP2PWalletInfo(walletInfo, vm.walletIndex)
      // }
      // const timestamp = Date.now()
      const url = vm.apiURL + '/ad/'
      const body = vm.transformPostData()
      try {
        let response = null
        switch (vm.adsState) {
          case 'create':
            response = await vm.$axios.post(url, body, { headers: vm.authHeaders })
            break
          case 'edit':
            response = await vm.$axios.put(url + vm.selectedAdId, body, { headers: vm.authHeaders })
            break
        }
        console.log('response:', response)
        vm.swipeStatus = true
        vm.$emit('submit')
      } catch (error) {
        console.error(error.response)
        if (error.response && error.response.status === 403) {
          bus.emit('session-expired')
        }
        vm.swipeStatus = false
      }
    },
    async getInitialMarketPrice () {
      const vm = this
      const url = vm.apiURL + '/utils/market-price'
      try {
        const response = await vm.$axios.get(url, { params: { currency: vm.selectedCurrency.symbol } })
        vm.marketPrice = parseFloat(response.data[0].price)
        if (vm.adsState === 'create') {
          vm.updatePriceValue(vm.adData.priceType)
        }
        console.log(response)
      } catch (error) {
        console.error(error.response)
        if (error.response && error.response.status === 403) {
          bus.emit('session-expired')
        }
      }
    },
    async getFiatCurrencies () {
      const vm = this
      const url = vm.apiURL + '/currency/fiat'
      try {
        const response = await vm.$axios.get(url, { headers: vm.authHeaders })
        vm.fiatCurrencies = response.data
        if (!vm.selectedCurrency) {
          vm.selectedCurrency = vm.fiatCurrencies[0]
        }
      } catch (error) {
        console.error(error)
        console.error(error.response)

        vm.fiatCurrencies = vm.availableFiat
        if (!vm.selectedCurrency) {
          vm.selectedCurrency = vm.fiatCurrencies[0]
        }

        if (error.response && error.response.status === 403) {
          bus.emit('session-expired')
        }
      }
    },
    async getPaymentMethods () {
      try {
        const url = this.apiURL + '/payment-method/'
        const { data } = await this.$axios.get(url, { headers: this.authHeaders })
        // console.log('getPaymentMethods: ', data)
        return data
      } catch (error) {
        console.error(error.response)
        if (error.response && error.response.status === 403) {
          bus.emit('session-expired')
        }
      }
    },
    async checkSubmitOption () {
      const vm = this
      vm.step++
    },
    async updateFiatCurrency () {
      const vm = this
      vm.priceValue = ''
      await vm.getInitialMarketPrice()
      vm.priceAmount = vm.transformPrice(vm.marketPrice)
      vm.adData.fiatCurrency = vm.selectedCurrency
      vm.closeWSConnection()
      vm.setupWebsocket()
    },
    formattedCurrency (value) {
      const currency = this.adData.fiatCurrency
      if (currency) {
        return formatCurrency(value, currency.symbol)
      }
      return formatCurrency(value)
    },
    transformPostData () {
      // finalize ad data
      const vm = this
      const defaultCrypto = 'BCH'
      const data = vm.adData
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
        trade_amount: parseFloat(data.tradeAmount),
        time_duration_choice: data.timeDurationChoice,
        payment_methods: idList,
        is_public: data.isPublic
      }
    },
    updatePriceValue (priceType) {
      const vm = this
      let override = false
      let value = null
      if (vm.priceValue === '') {
        override = true
      }
      switch (priceType) {
        case 'FIXED':
          if (vm.adsState === 'create') value = vm.priceAmount
          if (vm.adsState === 'edit') value = vm.adData.fixedPrice
          if (override) value = vm.marketPrice
          vm.priceValue = value
          break
        case 'FLOATING':
          value = vm.adData.floatingPrice
          if (override) value = 100
          vm.priceValue = value
          break
      }
    },
    transformPrice (value) {
      const vm = this
      let price = null
      switch (vm.adData.priceType) {
        case 'FLOATING':
          price = value * (vm.adData.floatingPrice / 100)
          break
        case 'FIXED': {
          const fixedPrice = Number(vm.adData.fixedPrice)
          price = fixedPrice
          if (price === 0) {
            price = vm.marketPrice
          }
          break
        }
      }
      price = Number(parseFloat(price).toFixed(2))
      return price
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
          console.log('Updated market price to :', this.marketPrice)
        }
      }
      this.websocket.onclose = () => {
        console.log('WebSocket connection closed.')
      }
    },
    appendPaymentMethods (paymentMethods) {
      const vm = this
      vm.adData.paymentMethods = paymentMethods
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
    checkPostData () {
      const vm = this
      if (!vm.isAmountValid(vm.priceAmount) || !vm.isAmountValid(vm.adData.tradeAmount) || !vm.isAmountValid(vm.adData.tradeCeiling) || !vm.isAmountValid(vm.adData.tradeFloor)) {
        return true
      } else {
        return false
      }
    },
    checkTradeLimitComparison () {
      if (!this.adData.tradeFloor || !this.adData.tradeCeiling) return true
      return Number(this.adData.tradeFloor) < Number(this.adData.tradeCeiling)
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
