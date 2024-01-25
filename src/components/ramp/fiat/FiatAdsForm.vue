<template>
  <div class="q-pb-md">
    <div v-if="step < 3">
      <q-btn
        flat
        padding="md md 0 md"
        icon="arrow_back"
        class="button button-text-primary"
        :class="getDarkModeClass(darkMode)"
        @click="step > 1 ? step-- : $emit('back')"
      />
    </div>
    <div v-if="step === 1">
      <div>
        <div
          class="text-h5 q-mx-lg q-py-xs text-center text-weight-bold lg-font-size"
          :class="transactionType === 'BUY' ? 'buy-color' : 'sell-color'"
          :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'"
        >
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
        <q-scroll-area :style="`height: ${minHeight - 135}px`" style="overflow-y:auto;">
          <div class="q-px-lg">
            <div class="q-mx-lg q-pb-sm q-pt-sm text-weight-bold">
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
            <div class="q-mx-lg sm-font-size pt-label" :class="getDarkModeClass(darkMode)">
              <div class="row justify-between">
                <span class="col text-left">Your Price</span>
                <span class="col text-right">Current Market Price</span>
              </div>
              <div class="row justify-between">
                <span class="col text-left text-weight-bold md-font-size">{{ formattedCurrency(priceAmount) }}</span>
                <span class="col text-right md-font-size" style="float: right;">{{ formattedCurrency(marketPrice) }}</span>
              </div>
            </div>
          </div>

          <!-- Trade Amount -->
          <div class="q-mx-lg q-mt-md">
            <div class="q-mt-sm q-px-md">
              <div class="q-pb-xs q-pl-sm text-weight-bold">Trade Amount</div>
                <q-input
                  ref="tradeAmountRef"
                  dense
                  outlined
                  rounded
                  :dark="darkMode"
                  :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
                  type="number"
                  :rules="tradeAmountValidation"
                  v-model="adData.tradeAmount"
                  @blur="$refs.tradeFloorRef.validate(); $refs.tradeCeilingRef.validate()">
                  <template v-slot:prepend>
                    <span class="text-weight-bold sm-font-size">
                      BCH
                    </span>
                  </template>
                </q-input>
              </div>
            <div class="q-px-md q-mt-sm">
              <div class="q-pb-xs q-pl-sm text-weight-bold">Trade Limit</div>
              <div class="row">
                <div class="col">
                  <div class="q-pl-sm q-pb-xs sm-font-size">Minimum</div>
                  <q-input
                    ref="tradeFloorRef"
                    dense
                    outlined
                    rounded=""
                    type="number"
                    :dark="darkMode"
                    :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
                    :rules="tradeLimitValidation"
                    v-model="adData.tradeFloor"
                    @blur="$refs.tradeCeilingRef.validate(); $refs.tradeAmountRef.validate()">
                    <template v-slot:append>
                      <span class="sm-font-size">{{ adData.cryptoCurrency.symbol  }}</span>
                    </template>
                  </q-input>
                </div>
                <div class="col-1 text-center">
                  <q-icon class="q-pt-md q-mt-lg" name="remove"/>
                </div>
                <div class="col">
                  <div class="q-pl-sm q-pb-xs sm-font-size">Maximum</div>
                  <q-input
                    ref="tradeCeilingRef"
                    dense
                    outlined
                    rounded=""
                    :dark="darkMode"
                    :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
                    type="number"
                    :rules="tradeLimitValidation"
                    lazy-rules
                    v-model="adData.tradeCeiling"
                    @blur="$refs.tradeFloorRef.validate(); $refs.tradeAmountRef.validate()"
                  >
                    <template v-slot:append>
                      <span class="sm-font-size">{{ adData.cryptoCurrency.symbol }}</span>
                    </template>
                  </q-input>
                </div>
              </div>
            </div>
          </div>

          <!-- Payment Time Limit -->
          <div class="q-mx-lg q-pt-sm">
            <div class="q-px-lg">
              <div class="q-pt-sm text-weight-bold">Payment Time Limit</div>
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
    <div v-if="step > 3">
      <div class="row justify-center q-py-lg" style="margin-top: 50px">
        <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
      </div>
    </div>
  </div>
</template>
<script>
import AddPaymentMethods from './AddPaymentMethods.vue'
import DisplayConfirmation from './DisplayConfirmation.vue'
import ProgressLoader from '../../ProgressLoader.vue'
import { debounce } from 'quasar'
import { formatCurrency, getPaymentTimeLimit } from 'src/wallet/ramp'
import { bus } from 'src/wallet/event-bus.js'
import { ref } from 'vue'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/wallet/ramp/backend'

export default {
  setup () {
    const tradeAmountRef = ref(null)
    const tradeFloorRef = ref(null)
    const tradeCeilingRef = ref(null)
    return {
      tradeAmountRef,
      tradeFloorRef,
      tradeCeilingRef
    }
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
      theme: this.$store.getters['global/theme'],
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
        timeDurationChoice: 1440,
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
        (val) => Number(val) <= Number(this.adData.tradeAmount) || 'Value exceeds trade amount',
        () => Number(this.adData.tradeFloor) <= Number(this.adData.tradeCeiling) || 'Min exceeds max'
      ],
      tradeAmountValidation: [
        (val) => !!val || 'This field is required',
        (val) => val > 0 || 'Value must be greater than 0',
        (val) => Number(this.adData.tradeFloor) <= Number(val) || 'Value less than minimum trade limit'
      ]
    }
  },
  props: {
    transactionType: String,
    adsState: String,
    selectedAdId: Number
  },
  async mounted () {
    const vm = this
    vm.loading = true
    vm.fetchAd()
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
    'priceValue' (value, oldValue) {
      const vm = this
      switch (vm.adData.priceType) {
        case 'FIXED':
          vm.adData.fixedPrice = value
          break
        case 'FLOATING':
          vm.adData.floatingPrice = value
      }
      vm.priceAmount = vm.transformPrice(vm.marketPrice)
      const numDigits = '00000000'.length
      const isMaxDigits = (String(value)).length > numDigits
      if (isMaxDigits) {
        vm.priceValue = oldValue
      }
    }
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    fetchAd () {
      const vm = this
      if (!vm.selectedAdId) return
      backend.get(`/ramp-p2p/ad/${vm.selectedAdId}`, { authorize: true })
        .then(response => {
          const data = response.data
          vm.adData.tradeType = data.trade_type
          vm.adData.priceType = data.price_type
          vm.adData.fixedPrice = parseFloat(data.fixed_price)
          vm.adData.floatingPrice = parseFloat(data.floating_price)
          vm.adData.fiatCurrency = data.fiat_currency
          vm.adData.tradeAmount = parseFloat(data.trade_amount)
          vm.adData.tradeFloor = parseFloat(data.trade_floor)
          vm.adData.tradeCeiling = parseFloat(data.trade_ceiling) ? parseFloat(data.trade_ceiling) : parseFloat(data.trade_amount)
          vm.adData.paymentMethods = data.payment_methods
          vm.adData.isPublic = data.is_public
          vm.paymentTimeLimit = getPaymentTimeLimit(data.time_duration)
          vm.selectedCurrency = data.fiat_currency
        })
        .catch(error => {
          vm.swipeStatus = false
          vm.handleRequestError(error)
        })
    },
    createAd () {
      const vm = this
      return new Promise((resolve, reject) => {
        const body = vm.transformPostData()
        backend.post('/ramp-p2p/ad/', body, { authorize: true })
          .then(response => {
            console.log(response)
            vm.swipeStatus = true
            vm.$emit('submit')
            resolve(response.data)
          })
          .catch(error => {
            vm.handleRequestError(error)
            vm.swipeStatus = false
            reject(error)
          })
      })
    },
    updateAd () {
      const vm = this
      return new Promise((resolve, reject) => {
        const body = vm.transformPostData()
        backend.put(`/ramp-p2p/ad/${vm.selectedAdId}`, body, { authorize: true })
          .then(response => {
            console.log(response)
            vm.swipeStatus = true
            vm.$emit('submit')
            resolve(response.data)
          })
          .catch(error => {
            vm.handleRequestError(error)
            vm.swipeStatus = false
            reject(error)
          })
      })
    },
    async onSubmit () {
      const vm = this
      vm.step++
      switch (vm.adsState) {
        case 'create':
          vm.createAd()
          break
        case 'edit':
          vm.updateAd()
          break
      }
    },
    async getInitialMarketPrice () {
      const vm = this
      const url = vm.apiURL + '/utils/market-price'
      try {
        const response = await backend.get(url, { params: { currency: vm.selectedCurrency.symbol } })
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
      try {
        const response = await backend.get('/ramp-p2p/currency/fiat', { authorize: true })
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
        const { data } = await backend.get('/ramp-p2p/payment-method/', { authorize: true })
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
    }, 500),
    handleRequestError (error) {
      if (error.response) {
        console.error(error.response)
        if (error.response.status === 403) {
          bus.emit('session-expired')
        }
      } else {
        console.error(error)
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.buy-color {
  color: rgb(60, 100, 246);
}
.sell-color {
  color: #ed5f59;
}

.sm-font-size {
  font-size: small;
}

.md-font-size {
  font-size: medium;
}
</style>
