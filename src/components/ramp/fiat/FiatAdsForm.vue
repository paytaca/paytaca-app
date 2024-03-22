<template>
  <div
    v-if="step === 1"
    class="text-bow"
    :class="getDarkModeClass(darkMode)">
    <div v-if="step === 1">
      <div
        class="text-h5 q-mx-lg q-py-xs text-center text-weight-bold lg-font-size"
        :class="transactionType === 'BUY' ? 'buy-color' : 'sell-color'"
        :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
        <span v-if="adsState === 'create'">POST {{ transactionType.toUpperCase() }} AD</span>
        <span v-if="adsState === 'edit'">EDIT {{ transactionType.toUpperCase() }} AD</span>
      </div>
      <!-- Price Settings -->
      <div v-if="loading">
        <div class="row justify-center q-py-lg" style="margin-top: 50px">
          <ProgressLoader/>
        </div>
      </div>
      <div class="q-pt-sm" v-else>
        <q-scroll-area :style="`height: ${minHeight}px`" style="overflow-y:auto;">
          <div class="q-px-lg">
            <div class="q-mx-lg q-pb-sm q-pt-sm text-weight-bold">
              <span>Price Setting</span>&nbsp;
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
                ]">
              </q-btn-toggle>
            </div>
            <div class="row q-py-sm q-gutter-sm q-px-md sm-font-size">
              <div class="col-4">
                <div class="q-pl-sm q-pb-xs">Fiat Currency</div>
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
                <div class="q-pl-sm q-pb-xs">{{ adData.priceType === 'FIXED'? 'Fixed Price' : 'Floating Price' }}</div>
                <q-input
                  dense
                  rounded
                  outlined
                  hide-bottom-space
                  :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
                  :dark="darkMode"
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
                  <template v-slot:hint>
                    <div class="text-right">{{ hints.priceValue }}</div>
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

          <!-- Trade Quantity -->
          <div class="q-mx-lg q-mt-md">
            <div class="q-mt-sm q-px-md">
              <div class="q-pb-xs q-pl-sm">
                <span class="text-weight-bold">Trade Quantity</span>&nbsp;
              </div>
              <q-input
                ref="tradeAmountRef"
                dense
                outlined
                rounded
                hide-bottom-space
                :hint="hints.tradeAmount"
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
              <div class="q-pb-xs q-pl-sm text-weight-bold">
                <span>Trade Limit</span>&nbsp;
              </div>
              <div class="row">
                <div class="col">
                  <div class="q-pl-sm q-pb-xs sm-font-size">Minimum</div>
                  <q-input
                    ref="tradeFloorRef"
                    dense
                    outlined
                    rounded=""
                    type="number"
                    hide-bottom-space
                    :hint="hints.minAmount"
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
                    rounded
                    hide-bottom-space
                    type="number"
                    :dark="darkMode"
                    :hint="hints.maxAmount"
                    :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
                    :rules="tradeLimitValidation"
                    v-model="adData.tradeCeiling"
                    @blur="$refs.tradeFloorRef.validate(); $refs.tradeAmountRef.validate()">
                    <template v-slot:append>
                      <span class="sm-font-size">{{ adData.cryptoCurrency.symbol }}</span>
                    </template>
                  </q-input>
                </div>
              </div>
            </div>
          </div>

          <!-- Appeal Cooldown -->
          <div class="q-mx-lg">
            <div class="q-px-lg">
              <div class="q-pt-md">Set orders appealable after</div>
            </div>
            <div class="q-mx-md q-pt-sm">
              <q-select
                  dense
                  outlined
                  rounded
                  hide-bottom-space
                  :hint="hints.appealCooldown"
                  :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
                  :dark="darkMode"
                  v-model="appealCooldown"
                  :options="cdSelection"
                  @update:modelValue="updateAppealCooldown()">
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
            <div class="q-mx-md">
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
    <div v-if="step > 3">
      <div class="row justify-center q-py-lg" style="margin-top: 50px">
        <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
      </div>
    </div>
  </div>
  <div v-if="step === 2">
    <AddPaymentMethods
      :type="'Ads'"
      :confirm-label="'Next'"
      :currentPaymentMethods="adData.paymentMethods"
      v-on:submit="appendPaymentMethods"
      @back="step--"
    />
  </div>
  <div v-if="step === 3">
    <DisplayConfirmation
      :post-data="adData"
      :ptl="appealCooldown"
      :transaction-type="transactionType"
      v-on:back="step--"
      @submit="onSubmit()"
    />
  </div>
  <div v-if="openDialog" >
    <MiscDialogs
      :type="'instructionDialog'"
      :title=title
      :text=text
      v-on:back="openDialog = false"
    />
  </div>
</template>
<script>
import AddPaymentMethods from './AddPaymentMethods.vue'
import DisplayConfirmation from './DisplayConfirmation.vue'
import ProgressLoader from '../../ProgressLoader.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'
import { debounce } from 'quasar'
import { formatCurrency, getAppealCooldown } from 'src/wallet/ramp'
import { bus } from 'src/wallet/event-bus.js'
import { ref } from 'vue'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { backend, getBackendWsUrl } from 'src/wallet/ramp/backend'

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
    ProgressLoader,
    MiscDialogs
  },
  emits: ['back', 'submit', 'updatePageName'],
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      loading: false,
      openDialog: false,
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      websocket: null,
      marketPrice: null,
      priceValue: null,
      step: 1,
      priceAmount: 0,
      floatingPrice: 100, // default: 100%
      appealCooldown: {
        label: '60 minutes',
        value: 60
      },
      adData: {
        tradeType: this.transactionType,
        priceType: 'FLOATING',
        fiatCurrency: this.$store.getters['market/selectedCurrency'],
        cryptoCurrency: {
          name: 'Bitcoin Cash',
          symbol: 'BCH'
        },
        fixedPrice: 0,
        floatingPrice: 100,
        tradeFloor: 0.02,
        tradeCeiling: 1,
        tradeAmount: 1,
        paymentMethods: [],
        isPublic: true,
        appealCooldown: {
          label: '60 minutes',
          value: 60
        }
      },
      cdSelection: [
        {
          label: '15 minutes',
          value: 15
        },
        {
          label: '30 minutes',
          value: 30
        },
        {
          label: '45 minutes',
          value: 45
        },
        {
          label: '1 hour',
          value: 60
        }],
      fiatCurrencies: [],
      numberValidation: [
        (val) => !!val || 'This is required',
        (val) => val > 0 || 'Cannot be zero'
      ],
      tradeLimitValidation: [
        (val) => !!val || 'This is required',
        (val) => val > 0 || 'Cannot be zero',
        (val) => Number(val) <= Number(this.adData.tradeAmount) || 'Cannot exceed trade quantity',
        () => Number(this.adData.tradeFloor) <= Number(this.adData.tradeCeiling) || 'Invalid range'
      ],
      tradeAmountValidation: [
        (val) => !!val || 'This is required',
        (val) => val > 0 || 'Cannot be zero',
        (val) => Number(this.adData.tradeFloor) <= Number(val) || 'Cannot be less than min trade limit'
      ],
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (80 + 120) : this.$q.screen.height - (50 + 100),
      instruction: { // temp
        'price-setting': {
          title: 'Price Setting',
          text: 'Price settings instruction here'
        },
        'trade-quantity': {
          title: 'Trade Quantity',
          text: 'Trade quantity instruction here'
        },
        'trade-limit': {
          title: 'Trade limit instruction here',
          text: null
        }
      },
      title: '',
      text: ''
    }
  },
  props: {
    transactionType: String,
    adsState: String,
    selectedAdId: Number
  },
  created () {
    bus.emit('hide-menu')
  },
  computed: {
    hints () {
      return {
        priceValue: this.adData.priceType === 'FLOATING' ? `Price is ${this.priceValue}% of market price` : 'Fixed prices do not change',
        tradeAmount: `The total amount of BCH you want to ${this.transactionType.toLocaleLowerCase()}`,
        minAmount: 'The min amount per transaction',
        maxAmount: 'The max amount per transaction',
        appealCooldown: 'The waiting period before counterparties can submit dispute appeals'
      }
    }
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
    step (value) {
      this.$emit('updatePageName', `ad-form-${value}`)
    },
    marketPrice (value) {
      const vm = this
      if (vm.adData.priceType === 'FLOATING') {
        vm.priceAmount = vm.transformPrice(value)
      }
    },
    'adData.fiatCurrency' (value) {
      this.getInitialMarketPrice()
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
          break
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
    openInstructionDialog (type) {
      const temp = this.instruction[type]
      this.title = temp.title
      this.text = temp.text

      this.openDialog = true
    },
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
          vm.appealCooldown = getAppealCooldown(data.appeal_cooldown)
          vm.adData.appealCooldown = vm.appealCooldown
          vm.selectedCurrency = data.fiat_currency

          // price
          if (vm.adData.priceType === 'FLOATING') {
            vm.priceValue = vm.adData.floatingPrice
          }

          // check tradeCeiling & tradeAmount
          if (vm.adData.tradeCeiling > vm.adData.tradeAmount) {
            vm.adData.tradeCeiling = vm.adData.tradeAmount
          }
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
        // console.log('createAd:', body)
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
      try {
        const response = await backend.get('/ramp-p2p/utils/market-price', { params: { currency: vm.selectedCurrency.symbol } })
        vm.marketPrice = parseFloat(response.data?.price)
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
      // vm.priceValue = ''
      await vm.getInitialMarketPrice()

      if (vm.adData.priceType === 'FLOATING') {
        vm.priceValue = 100
      } else {
        vm.priceValue = vm.marketPrice
      }

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
        appeal_cooldown_choice: data.appealCooldown.value,
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
          if (vm.adsState === 'edit') value = vm.transformPrice(vm.priceAmount) //value = vm.adData.fixedPrice
          if (value === 0 || override) value = vm.marketPrice
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
      const wsUrl = `${getBackendWsUrl()}market-price/${this.selectedCurrency.symbol}/`
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
      this.priceValue = Number((this.priceValue - 0.1).toFixed(2))
    },
    incPriceValue () {
      this.priceValue = Number((this.priceValue + 0.1).toFixed(2))
    },
    updateAppealCooldown () {
      this.adData.appealCooldown = this.appealCooldown
    },
    checkPostData () {
      const vm = this
      if (!vm.isAmountValid(vm.priceAmount) ||
          !vm.isAmountValid(vm.adData.tradeAmount) ||
          !vm.isAmountValid(vm.adData.tradeCeiling) ||
          !vm.isAmountValid(vm.adData.tradeFloor) ||
          !vm.tradeLimitsValid()) {
        return true
      } else {
        return false
      }
    },
    tradeLimitsValid () {
      const vm = this
      const floor = vm.adData?.tradeFloor
      const ceiling = vm.adData?.tradeCeiling
      const quantity = vm.adData?.tradeAmount
      return floor > 0 && floor <= ceiling && ceiling <= quantity
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
