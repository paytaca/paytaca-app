<template>
  <HeaderNav :title="`P2P Exchange`" :backnavpath="previousRoute"/>
  <div v-if="step === 1"
    class="text-bow"
    :class="getDarkModeClass(darkMode)">
    <div v-if="step === 1">
      <div
        class="text-h5 q-mx-lg q-py-xs text-center text-weight-bold lg-font-size"
        :class="transactionType === 'BUY' ? 'buy-color' : 'sell-color'"
        :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
        <span v-if="adsState === 'create'">
          {{
            $t(
              'PostAd',
              { type: transactionType?.toUpperCase() },
              `POST ${ transactionType?.toUpperCase() } AD`
            )
          }}
        </span>
        <span v-if="adsState === 'edit'">
          {{
            $t(
              'EditAd',
              { type: transactionType.toUpperCase() },
              `EDIT ${ transactionType.toUpperCase() } AD`
            )
          }}
        </span>
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
              <span>{{ $t('PriceSetting') }}</span>&nbsp;
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
                  {label: $t('Fixed'), value: 'FIXED'},
                  {label: $t('Floating'), value: 'FLOATING'}
                ]">
              </q-btn-toggle>
            </div>
            <div class="row q-py-sm q-gutter-sm q-px-md sm-font-size">
              <div class="col-4">
                <div class="q-pl-sm q-pb-xs">{{ $t('FiatCurrency') }}</div>
                <q-input
                  dense
                  rounded
                  :disable="readOnlyState || adsState === 'edit'"
                  outlined
                  :dark="darkMode"
                  v-model="selectedCurrency.symbol"
                  @click="showCurrencySelect"
                >
                  <template v-slot:append>
                    <q-icon size="sm" name='mdi-menu-down' @click="showCurrencySelect"/>
                  </template>
                </q-input>
              </div>
              <div class="col">
                <div class="q-pl-sm q-pb-xs">{{ adData.priceType === 'FIXED'? $t('FixedPrice') : $t('FloatingPrice') }}</div>
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
                <span class="col text-left">{{ $t('YourPrice') }}</span>
                <span class="col text-right">{{ $t('CurrentMarketPrice') }}</span>
              </div>
              <div class="row justify-between">
                <span class="col text-left text-weight-bold md-font-size">{{ adData.fiatCurrency?.symbol }} {{ formattedCurrency(priceAmount).replace(/[^\d.,-]/g, '') }}</span>
                <span :class="isBlinking ? 'blink': ''" class="col text-right md-font-size" style="float: right;">{{ adData.fiatCurrency?.symbol }} {{ formattedCurrency(marketPrice).replace(/[^\d.,-]/g, '') }}</span>
              </div>
            </div>
          </div>

          <!-- Trade Quantity -->
          <div class="q-mx-lg q-mt-md">
            <div class="q-mt-sm q-px-md">
              <div class="q-pb-xs q-pl-sm">
                <span class="text-weight-bold">{{ $t('TradeQuantity') }}</span>&nbsp;
              </div>
              <q-input
                ref="tradeAmountRef"
                dense
                outlined
                rounded
                hide-bottom-space
                type="number"
                :hint="hints.tradeAmount"
                :dark="darkMode"
                :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
                :rules="[tradeAmountValidation]"
                v-model="adData.tradeAmount"
                @blur="$refs.tradeFloorRef.validate(); $refs.tradeCeilingRef.validate()">
                <template v-slot:prepend>
                  <span class="text-weight-bold sm-font-size">
                    {{ setTradeLimitsInFiat?  selectedCurrency.symbol : 'BCH'}}
                  </span>
                </template>
              </q-input>
            </div>
            <!-- <q-checkbox size="sm" v-model="setTradeQuantityInFiat" class="q-mx-md sm-font-size" color="blue-8">Set quantity in fiat </q-checkbox> -->
            <div class="q-px-md q-mt-sm">
              <div class="q-pb-xs q-pl-sm text-weight-bold">
                <span>{{ $t('TradeLimit') }}</span>&nbsp;
              </div>
              <div class="row">
                <div class="col">
                  <div class="q-pl-sm q-pb-xs sm-font-size">{{ $t('Minimum') }}</div>
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
                    :rules="[tradeLimitValidation]"
                    v-model="adData.tradeFloor"
                    @blur="$refs.tradeCeilingRef.validate(); $refs.tradeAmountRef.validate()">
                    <template v-slot:append>
                      <span class="sm-font-size">{{ setTradeLimitsInFiat?  selectedCurrency.symbol : 'BCH'}}</span>
                    </template>
                  </q-input>
                </div>
                <div class="col-1 text-center">
                  <q-icon class="q-pt-md q-mt-lg" name="remove"/>
                </div>
                <div class="col">
                  <div class="q-pl-sm q-pb-xs sm-font-size">{{ $t('Maximum') }}</div>
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
                    :rules="[tradeLimitValidation]"
                    v-model="adData.tradeCeiling"
                    @blur="$refs.tradeFloorRef.validate(); $refs.tradeAmountRef.validate()">
                    <template v-slot:append>
                      <span class="sm-font-size">{{ setTradeLimitsInFiat?  selectedCurrency.symbol : 'BCH'}}</span>
                    </template>
                  </q-input>
                </div>
              </div>
            </div>
            <q-checkbox size="sm" v-model="setTradeLimitsInFiat" class="q-mx-md sm-font-size" color="blue-8"> Set trade limits in fiat </q-checkbox>
          </div>

          <!-- Appeal Cooldown -->
          <div class="q-mx-lg">
            <div class="q-px-lg">
              <div class="q-pt-md">{{ $t('SetOrderAppealsAfter') }}</div>
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
                :label="$t('Public')"
              />
            </div>
            <!-- Warning message for when no currency arbiter is available for ad -->
            <div v-if="!hasArbiters" class="warning-box q-mx-lg q-mb-md q-mt-sm" :class="darkMode ? 'warning-box-dark' : 'warning-box-light'">
              There’s currently no arbiter assigned for the currency ({{ this.adData.fiatCurrency?.symbol }}). Orders cannot be placed for this ad until an arbiter is assigned.
            </div>
          </div>
          <div class="row q-mx-lg q-px-md q-mt-xs q-mb-md">
            <q-btn
              :disable="checkPostData()"
              rounded
              no-caps
              :label="$t('Next')"
              :color="transactionType === 'BUY' ? 'blue-6': 'red-6'"
              class="q-space"
              @click="nextStep()"
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
      :confirm-label="$t('Next')"
      :currency="adData.fiatCurrency.symbol"
      :currentPaymentMethods="adData.paymentMethods"
      @submit="nextStep"
      @back="step--"
    />
  </div>
  <div v-if="step === 3">
    <DisplayConfirmation
      :post-data="confirmationData"
      :ptl="appealCooldown"
      :transaction-type="transactionType"
      v-on:back="step--"
      @submit="nextStep"
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
import { ref } from 'vue'
import { debounce } from 'quasar'
import { bus } from 'src/wallet/event-bus.js'
import { backend, getBackendWsUrl } from 'src/exchange/backend'
import { bchToSatoshi, formatCurrency, getAppealCooldown } from 'src/exchange'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import AddPaymentMethods from 'src/components/ramp/fiat/AddPaymentMethods.vue'
import DisplayConfirmation from 'src/components/ramp/fiat/DisplayConfirmation.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import MiscDialogs from 'src/components/ramp/fiat/dialogs/MiscDialogs.vue'
import CurrencyFilterDialog from 'src/components/ramp/fiat/dialogs/CurrencyFilterDialog.vue'
import { WebSocketManager } from 'src/exchange/websocket/manager'

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
    MiscDialogs,
    HeaderNav
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
          label: this.$t('SixtyMinutes'),
          value: 60
        }
      },
      cdSelection: [
        {
          label: this.$t('FifteenMinutes'),
          value: 15
        },
        {
          label: this.$t('ThirtyMinutes'),
          value: 30
        },
        {
          label: this.$t('FortyFiveMinutes'),
          value: 45
        },
        {
          label: this.$t('OneHour'),
          value: 60
        }],
      fiatCurrencies: [],
      numberValidation: [
        (val) => !!val || this.$t('ThisIsRequired'),
        (val) => val > 0 || this.$t('CannotBeZero')
      ],
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (80 + 120) : this.$q.screen.height - (50 + 100),
      instruction: { // temp
        'price-setting': {
          title: this.$t('PriceSetting'),
          text: this.$t('FiatAdFormInstruction1')
        },
        'trade-quantity': {
          title: this.$t('TradeQuantity'),
          text: this.$t('FiatAdFormInstruction2')
        },
        'trade-limit': {
          title: this.$t('FiatAdFormInstruction3'),
          text: null
        }
      },
      title: '',
      text: '',
      readOnlyState: false,
      // setTradeQuantityInFiat: false,
      setTradeLimitsInFiat: false,
      arbiterOptions: [],
      transactionType: null,
      previousRoute: null,
      adsState: null,
      isBlinking: false
    }
  },
  created () {
    bus.emit('hide-menu')
    bus.on('relogged', this.loadFormData)
  },
  watch: {
    setTradeLimitsInFiat (value) {
      if (this.loading) return
      if (value) {
        let floor = this.adData.tradeFloor * this.marketPrice
        let ceiling = this.adData.tradeCeiling * this.marketPrice
        if (floor % 1 !== 0) {
          floor = floor.toFixed(2)
        }
        if (ceiling % 1 !== 0) {
          ceiling = ceiling.toFixed(2)
        }
        this.adData.tradeFloor = floor
        this.adData.tradeCeiling = ceiling

        let amount = this.adData.tradeAmount * this.marketPrice
        if (amount % 1 !== 0) {
          amount = amount.toFixed(2)
        }
        this.adData.tradeAmount = amount
      } else {
        let floor = this.adData.tradeFloor / this.marketPrice
        let ceiling = this.adData.tradeCeiling / this.marketPrice
        if (floor % 1 !== 0) {
          floor = floor.toFixed(8)
        }
        if (ceiling % 1 !== 0) {
          ceiling = ceiling.toFixed(8)
        }
        this.adData.tradeFloor = floor
        this.adData.tradeCeiling = ceiling

        let amount = this.adData.tradeAmount / this.marketPrice
        if (amount % 1 !== 0) {
          amount = amount.toFixed(8)
        }
        this.adData.tradeAmount = amount
      }
    },
    step (value) {
      this.$emit('updatePageName', `ad-form-${value}`)
    },
    marketPrice (value) {
      const vm = this
      if (vm.adData.priceType === 'FLOATING') {
        vm.priceAmount = vm.transformPrice(value)
      }
    },
    'adData.fiatCurrency' () {
      this.adData.fixedPrice = 0
      this.getInitialMarketPrice()
      this.fetchArbiters()
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
  computed: {
    hasArbiters () {
      return this.arbiterOptions.length > 0
    },
    hints () {
      return {
        priceValue: (
          this.adData.priceType === 'FLOATING'
            ? this.$t(
              'FiatAdFormHint1',
              { priceValue: this.priceValue },
            `Price is ${this.priceValue}% of market price`
            )
            : this.$t('PriceValueHint')
        ),
        tradeAmount: this.$t(
          'FiatAdFormHint2',
          { type: this.transactionType?.toLocaleLowerCase() },
          `The total amount of BCH you want to ${this.transactionType?.toLocaleLowerCase()}`
        ),
        minAmount: this.$t('MinAmountHint'),
        maxAmount: this.$t('MaxAmountHint'),
        appealCooldown: this.$t('AppealCooldownHint')
      }
    },
    confirmationData () {
      const vm = this
      const data = { ...vm.adData }
      // data.isTradeAmountFiat = this.setTradeQuantityInFiat
      data.isTradeLimitsFiat = this.setTradeLimitsInFiat
      return data
    }
  },
  async mounted () {
    this.step = Number(this.$route.query?.step) || 1
    this.loadFormData()
  },
  beforeUnmount () {
    this.closeWSConnection()
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.previousRoute = from.path
    })
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    async loadFormData () {
      this.loading = true
      this.getInitialMarketPrice()
      // determine if form is edit or create
      if (this.$route.name === 'p2p-ads-edit-form') {
        await this.fetchAd()
        this.transactionType = this.adData?.tradeType?.toUpperCase()
        this.adsState = 'edit'
      }
      if (this.$route.name === 'p2p-ads-create-form') {
        this.transactionType = this.$route.query?.type
        this.adData.tradeType = this.transactionType?.toUpperCase()
        this.adsState = 'create'
      }

      await this.fetchArbiters()
      await this.getFiatCurrencies()
      this.updatePriceValue(this.adData.priceType)
      this.setupWebsocket()
      this.loading = false
    },
    tradeAmountValidation (val) {
      if (!val) return 'This is required'
      if (val <= 0) return 'Cannot be zero'
      let tradeFloor = Number(this.adData.tradeFloor)
      if (this.setTradeLimitsInFiat) tradeFloor = (tradeFloor / this.marketPrice).toFixed(8)
      let tradeAmount = Number(val)
      if (this.setTradeLimitsInFiat) tradeAmount = (tradeAmount / this.marketPrice).toFixed(8)
      if (tradeFloor > tradeAmount) return 'Cannot be less than min trade limit'
    },
    tradeLimitValidation (val) {
      if (!val) return 'This is required'
      if (val <= 0) return 'Cannot be zero'
      if (Number(this.adData.tradeFloor) > Number(this.adData.tradeCeiling)) return 'Invalid range'

      let tradeAmount = Number(this.adData.tradeAmount)
      if (this.setTradeLimitsInFiat) tradeAmount = (tradeAmount / this.marketPrice).toFixed(8)
      let tradeLimit = Number(val)
      if (this.setTradeLimitsInFiat) tradeLimit = (tradeLimit / this.marketPrice).toFixed(8)
      if (tradeLimit > tradeAmount) return 'Cannot exceed trade quantity'

      return true
    },
    showCurrencySelect () {
      this.readOnlyState = true
      this.$q.dialog({
        component: CurrencyFilterDialog,
        componentProps: {
          fiatList: this.fiatCurrencies
        }
      })
        .onOk(currency => {
          // const index = this.fiatCurrencies.indexOf(currency)
          this.selectedCurrency = currency
          this.updateFiatCurrency()
          this.readOnlyState = false
        })
        .onDismiss(() => {
          this.readOnlyState = false
        })
    },
    openInstructionDialog (type) {
      const temp = this.instruction[type]
      this.title = temp.title
      this.text = temp.text

      this.openDialog = true
    },
    async fetchAd () {
      const vm = this
      await backend.get(`/ramp-p2p/ad/${vm.$route.params?.ad}/`, { authorize: true })
        .then(response => {
          const data = response.data
          vm.adData.tradeType = data.trade_type
          vm.adData.priceType = data.price_type
          vm.adData.fixedPrice = parseFloat(data.fixed_price)
          vm.adData.floatingPrice = parseFloat(data.floating_price)
          vm.adData.fiatCurrency = data.fiat_currency

          let tradeAmount = parseFloat(data.trade_amount)
          if (data.trade_amount_in_fiat) tradeAmount = tradeAmount.toFixed(2)
          vm.adData.tradeAmount = tradeAmount

          let tradeFloor = parseFloat(data.trade_floor)
          let tradeCeiling = parseFloat(data.trade_ceiling)
          if (data.trade_limits_in_fiat) {
            tradeFloor = tradeFloor.toFixed(2)
            tradeCeiling = tradeCeiling.toFixed(2)
          }
          vm.adData.tradeFloor = tradeFloor
          vm.adData.tradeCeiling = tradeCeiling
          vm.adData.paymentMethods = data.payment_methods
          vm.adData.isPublic = data.is_public
          vm.appealCooldown = getAppealCooldown(data.appeal_cooldown)
          vm.adData.appealCooldown = vm.appealCooldown
          vm.selectedCurrency = data.fiat_currency
          vm.setTradeLimitsInFiat = data.trade_limits_in_fiat
          // vm.setTradeQuantityInFiat = data.trade_amount_in_fiat

          // price
          if (vm.adData.priceType === 'FLOATING') {
            vm.priceValue = vm.adData.floatingPrice
          } else if (vm.adData.priceType === 'FIXED') {
            vm.priceValue = vm.adData.fixedPrice
          }

          // check tradeCeiling & tradeAmount
          // if (vm.adData.tradeCeiling > vm.adData.tradeAmount) {
          //   vm.adData.tradeCeiling = vm.adData.tradeAmount
          // }
        })
        .catch(error => {
          vm.swipeStatus = false
          vm.handleRequestError(error)
        })
    },
    async createAd () {
      const vm = this
      const body = vm.transformPostData()
      await backend.post('/ramp-p2p/ad/', body, { authorize: true })
        .then(() => {
          vm.swipeStatus = true
        })
        .catch(error => {
          vm.handleRequestError(error)
          vm.swipeStatus = false
        })
    },
    async updateAd () {
      const vm = this
      const body = vm.transformPostData(false)
      await backend.put(`/ramp-p2p/ad/${vm.$route.params?.ad}/`, body, { authorize: true })
        .then(() => {
          vm.swipeStatus = true
        })
        .catch(error => {
          vm.handleRequestError(error)
          vm.swipeStatus = false
        })
    },
    fetchArbiters () {
      return new Promise((resolve, reject) => {
        const vm = this
        backend.get('ramp-p2p/arbiter/', { params: { currency: vm.adData.fiatCurrency.symbol }, authorize: true })
          .then(response => {
            vm.arbiterOptions = response.data
            resolve(response.data)
          })
          .catch(error => {
            if (error.response) {
              console.error(error.response)
              if (error.response.status === 403) {
                bus.emit('session-expired')
              }
            } else {
              bus.emit('network-error')
            }
            reject(error)
          })
      })
    },
    async getInitialMarketPrice () {
      const vm = this
      try {
        const response = await backend.get('/ramp-p2p/utils/market-price/', { params: { currency: vm.selectedCurrency.symbol } })
        vm.marketPrice = parseFloat(response.data?.price)
        if (vm.adsState === 'create') {
          vm.updatePriceValue(vm.adData.priceType)
        }
      } catch (error) {
        if (error.response) {
          console.error(error.response)
          if (error.response.status === 403) {
            bus.emit('session-expired')
          }
        } else {
          bus.emit('network-error')
        }
      }
    },
    async getFiatCurrencies () {
      const vm = this
      try {
        const response = await backend.get('/ramp-p2p/ad/currency/', { params: { trade_type: vm.transactionType }, authorize: true })
        vm.fiatCurrencies = response.data
        const selectedCurrencyUnused = vm.adsState === 'create' && !vm.fiatCurrencies.map(e => e.id)?.includes(vm.selectedCurrency.id)
        if (!vm.selectedCurrency || selectedCurrencyUnused) {
          vm.selectedCurrency = vm.fiatCurrencies[0]
          vm.adData.fiatCurrency = vm.selectedCurrency
        }
      } catch (error) {
        console.error(error)
        console.error(error.response)

        vm.fiatCurrencies = vm.availableFiat
        if (!vm.selectedCurrency) {
          vm.selectedCurrency = vm.fiatCurrencies[0]
        }

        if (error.response) {
          if (error.response.status === 403) {
            bus.emit('session-expired')
          }
        } else {
          bus.emit('network-error')
        }
      }
    },
    async getPaymentMethods () {
      try {
        const { data } = await backend.get('/ramp-p2p/payment-method/', { authorize: true })
        return data
      } catch (error) {
        if (error.response) {
          console.error(error.response)
          if (error.response.status === 403) {
            bus.emit('session-expired')
          }
        } else {
          bus.emit('network-error')
        }
      }
    },
    async nextStep (data) {
      const currentStep = this.step
      if (currentStep === 2) {
        this.adData.paymentMethods = data
      }
      if (currentStep === 3) {
        this.onSubmit()
        await this.$router.push(this.previousRoute)
        // await this.$router.push({ name: 'p2p-ads' })
      }
      if (currentStep < 3) {
        this.step++
        await this.$router.replace({ query: { ...this.$route.query, step: this.step } })
      }
    },
    async onSubmit () {
      const vm = this
      switch (vm.adsState) {
        case 'create':
          await vm.createAd()
          break
        case 'edit':
          await vm.updateAd()
          break
      }
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
    transformPostData (create = true) {
      // finalize ad data
      const vm = this
      const defaultCrypto = 'BCH'
      const data = vm.adData
      const idList = data.paymentMethods.map(obj => obj.id)

      const payload = {
        trade_type: data.tradeType,
        price_type: data.priceType,
        fiat_currency: create ? data.fiatCurrency.symbol : data.fiatCurrency.id,
        crypto_currency: defaultCrypto,
        fixed_price: parseFloat(data.fixedPrice),
        floating_price: parseFloat(data.floatingPrice),
        trade_limits_in_fiat: this.setTradeLimitsInFiat,
        // trade_amount_in_fiat: this.setTradeQuantityInFiat,
        appeal_cooldown_choice: data.appealCooldown.value,
        payment_methods: idList,
        is_public: data.isPublic
      }

      if (this.setTradeLimitsInFiat) {
        payload.trade_floor_fiat = data.tradeFloor
        payload.trade_ceiling_fiat = data.tradeCeiling
      } else {
        payload.trade_floor_sats = bchToSatoshi(data.tradeFloor)
        payload.trade_ceiling_sats = bchToSatoshi(data.tradeCeiling)
      }

      if (this.setTradeLimitsInFiat) {
        payload.trade_amount_fiat = data.tradeAmount
      } else {
        payload.trade_amount_sats = bchToSatoshi(data.tradeAmount)
      }
      console.log('payload:', payload)
      return payload
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
          if (vm.adsState === 'edit') value = vm.adData.fixedPrice // value = vm.transformPrice(vm.priceAmount)
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
      this.websocket?.closeConnection()
    },
    setupWebsocket () {
      this.closeWSConnection()
      const wsUrl = `${getBackendWsUrl()}market-price/${this.selectedCurrency.symbol}/`
      this.websocket = new WebSocketManager()
      this.websocket.setWebSocketUrl(wsUrl)
      this.websocket.subscribeToMessages((message) => {
        if (message?.price) {
          const price = parseFloat(message?.price)?.toFixed(2)
          if (price && this.marketPrice !== price) {
            this.marketPrice = price
            console.log('Updated market price to :', this.marketPrice)
            this.startBlinking()
          }
        }
      })
    },
    startBlinking () {
      this.isBlinking = true
      setTimeout(() => { this.isBlinking = false }, 5000)
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
      let floor = vm.adData?.tradeFloor
      let ceiling = vm.adData?.tradeCeiling
      if (vm.setTradeLimitsInFiat) {
        floor = (floor / vm.marketPrice).toFixed(8)
        ceiling = (ceiling / vm.marketPrice).toFixed(8)
      }
      let quantity = vm.adData?.tradeAmount
      if (vm.setTradeLimitsInFiat) quantity = (quantity / vm.marketPrice).toFixed(8)
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
        bus.emit('network-error')
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

.warning-box {
  padding: 10px;
  border-radius: 5px;
}
.warning-box-light {
  background-color: #fff9c4; /* Light yellow background */
  border: 1px solid #fbc02d; /* Border color */
}
.warning-box-dark {
  background-color: #333; /* Dark mode background color */
  color: #fff; /* Text color for dark mode */
  border: 1px solid #fbc02d; /* Border color */
}

@keyframes blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.blink { animation: blink 1.5s 5; }
</style>
