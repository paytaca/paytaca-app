<template>
  <div class="ad-form-container" :class="getDarkModeClass(darkMode)">
    <HeaderNav :title="`P2P Ramp`" :backnavpath="previousRoute" class="header-nav" />
    <div v-if="currentStep === 1"
      class="text-bow"
      :class="getDarkModeClass(darkMode)">
    <div v-if="currentStep === 1">
      <div
        class="text-h5 q-mx-lg q-py-md text-center text-weight-bold lg-font-size text-grad">
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
          <div class="q-px-md q-pb-md">
            <!-- Price Settings Section -->
            <div class="pt-card q-pa-md q-mb-md br-15" :class="darkMode ? 'dark' : 'light'">
              <div class="q-pb-sm text-weight-bold text-h6">
                <q-icon name="sell" size="sm" class="q-mr-sm"/>
                <span>{{ $t('PriceSetting') }}</span>
              </div>
              <div class="text-center q-mb-sm">
                <q-btn-toggle
                  dense
                  v-model="adData.priceType"
                  spread
                  class="glass-toggle br-15"
                  no-caps
                  unelevated
                  :toggle-color="themeColor"
                  :text-color="themeColor"
                  :options="[
                    {label: $t('Fixed'), value: 'FIXED'},
                    {label: $t('Floating'), value: 'FLOATING'}
                  ]">
                </q-btn-toggle>
              </div>
              <div class="row q-py-sm q-gutter-sm sm-font-size">
                <div class="col-4">
                  <div class="q-pl-xs q-pb-xs text-weight-medium">{{ $t('FiatCurrency') }}</div>
                  <q-input
                    dense
                    rounded
                    :disable="readOnlyState || adsState === 'edit'"
                    outlined
                    :dark="darkMode"
                    v-model="selectedCurrency.symbol"
                    @click="showCurrencySelect"
                    class="glass-input"
                  >
                    <template v-slot:append>
                      <q-icon size="sm" name='mdi-menu-down' @click="showCurrencySelect"/>
                    </template>
                  </q-input>
                </div>
                <div class="col">
                  <div class="q-pl-xs q-pb-xs text-weight-medium">{{ adData.priceType === 'FIXED'? $t('FixedPrice') : $t('FloatingPrice') }}</div>
                  <q-input
                    dense
                    rounded
                    outlined
                    hide-bottom-space
                    :color="themeColor"
                    :dark="darkMode"
                    type="number"
                    :rules="numberValidation"
                    @blur="updatePriceValue(adData.priceType)"
                    v-model="priceValue"
                    class="glass-input">
                    <template v-slot:prepend>
                      <q-btn flat dense round size="sm" icon="remove" @click="decPriceValue()" 
                        :color="themeColor"/>
                    </template>
                    <template v-slot:append>
                      <q-icon v-if="adData.priceType === 'FLOATING'" size="xs" name="percent" />
                      <q-btn flat dense round size="sm" icon="add" @click="incPriceValue()" 
                        :color="themeColor"/>
                    </template>
                    <template v-slot:hint>
                      <div class="text-right">{{ hints.priceValue }}</div>
                    </template>
                  </q-input>
                </div>
              </div>
              <div class="q-mt-md q-px-xs sm-font-size pt-label" :class="getDarkModeClass(darkMode)">
                <div class="row justify-between q-mb-xs">
                  <span class="col text-left text-weight-medium">{{ $t('YourPrice') }}</span>
                  <span class="col text-right text-weight-medium">{{ $t('CurrentMarketPrice') }}</span>
                </div>
                <div class="row justify-between">
                  <span class="col text-left text-weight-bold text-h6">{{ adData.fiatCurrency?.symbol }} {{ formattedCurrency(priceAmount).replace(/[^\d.,-]/g, '') }}</span>
                  <span :class="isBlinking ? 'blink market-price': 'market-price'" class="col text-right text-h6 text-weight-bold">{{ adData.fiatCurrency?.symbol }} {{ formattedCurrency(marketPrice).replace(/[^\d.,-]/g, '') }}</span>
                </div>
                <q-banner
                  v-if="showPriceDeviationWarning"
                  class="q-mt-sm price-deviation-warning"
                  :class="darkMode ? 'dark' : 'light'"
                  rounded
                >
                  <template v-slot:avatar>
                    <q-icon name="warning" color="orange" />
                  </template>
                  <div class="text-weight-medium">
                    {{
                      $t(
                        'PriceDeviationWarningTitle',
                        { pct: absPriceDeviationPct, direction: priceDeviationDirectionLabel },
                        `Your price is ${absPriceDeviationPct}% ${priceDeviationDirectionLabel} the market price.`
                      )
                    }}
                  </div>
                  <div class="text-caption">
                    {{
                      $t(
                        'PriceDeviationWarningBody',
                        {},
                        'Correct the pricing, or ignore this warning if you know what you are doing.'
                      )
                    }}
                  </div>
                </q-banner>
              </div>
            </div>

            <!-- Trade Quantity Section -->
            <div class="pt-card q-pa-md q-mb-md br-15" :class="darkMode ? 'dark' : 'light'">
              <div class="q-pb-sm text-weight-bold text-h6">
                <q-icon name="swap_horiz" size="sm" class="q-mr-sm"/>
                <span>{{ $t('TradeQuantity') }}</span>
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
                :color="themeColor"
                :rules="[tradeAmountValidation]"
                v-model="adData.tradeAmount"
                @blur="$refs.tradeFloorRef.validate(); $refs.tradeCeilingRef.validate()"
                class="glass-input">
                <template v-slot:prepend>
                  <span class="text-weight-bold sm-font-size">
                    {{ setTradeLimitsInFiat?  selectedCurrency.symbol : 'BCH'}}
                  </span>
                </template>
              </q-input>
              <!-- <q-checkbox size="sm" v-model="setTradeQuantityInFiat" class="q-mx-md sm-font-size" color="blue-8">Set quantity in fiat </q-checkbox> -->
              <div class="q-mt-md">
                <div class="q-pb-sm text-weight-medium">
                  <span>{{ $t('TradeLimit') }}</span>
                </div>
                <div class="row q-col-gutter-sm">
                  <div class="col">
                    <div class="q-pb-xs sm-font-size text-weight-medium">{{ $t('Minimum') }}</div>
                    <q-input
                      ref="tradeFloorRef"
                      dense
                      outlined
                      rounded
                      type="number"
                      hide-bottom-space
                      :hint="hints.minAmount"
                      :dark="darkMode"
                      :color="themeColor"
                      :rules="[tradeLimitValidation]"
                      v-model="adData.tradeFloor"
                      @blur="$refs.tradeCeilingRef.validate(); $refs.tradeAmountRef.validate()"
                      class="glass-input">
                      <template v-slot:append>
                        <span class="sm-font-size text-weight-medium">{{ setTradeLimitsInFiat?  selectedCurrency.symbol : 'BCH'}}</span>
                      </template>
                    </q-input>
                  </div>
                  <div class="col-auto self-center">
                    <q-icon class="q-mt-md" name="remove" size="sm"/>
                  </div>
                  <div class="col">
                    <div class="q-pb-xs sm-font-size text-weight-medium">{{ $t('Maximum') }}</div>
                    <q-input
                      ref="tradeCeilingRef"
                      dense
                      outlined
                      rounded
                      hide-bottom-space
                      type="number"
                      :dark="darkMode"
                      :hint="hints.maxAmount"
                      :color="themeColor"
                      :rules="[tradeLimitValidation]"
                      v-model="adData.tradeCeiling"
                      @blur="$refs.tradeFloorRef.validate(); $refs.tradeAmountRef.validate()"
                      class="glass-input">
                      <template v-slot:append>
                        <span class="sm-font-size text-weight-medium">{{ setTradeLimitsInFiat?  selectedCurrency.symbol : 'BCH'}}</span>
                      </template>
                    </q-input>
                  </div>
                </div>
              </div>
              <q-checkbox size="sm" v-model="setTradeLimitsInFiat" class="q-mt-sm sm-font-size" 
                :color="themeColor">
                {{ $t('SetTradeLimitsFiat') }}
              </q-checkbox>
            </div>

            <!-- Appeal Cooldown Section -->
            <div class="pt-card q-pa-md q-mb-md br-15" :class="darkMode ? 'dark' : 'light'">
              <div class="q-pb-sm text-weight-bold text-h6">
                <q-icon name="schedule" size="sm" class="q-mr-sm"/>
                <span>{{ $t('SetOrderAppealsAfter') }}</span>
              </div>
              <q-select
                dense
                outlined
                rounded
                hide-bottom-space
                :hint="hints.appealCooldown"
                :color="themeColor"
                :dark="darkMode"
                v-model="appealCooldown"
                :options="cdSelection"
                @update:modelValue="updateAppealCooldown()"
                class="glass-input">
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
            <!-- Description Section -->
            <div class="pt-card q-pa-md q-mb-md br-15" :class="darkMode ? 'dark' : 'light'">
              <div class="row justify-between items-center q-pb-sm">
                <div class="text-weight-bold text-h6">
                  <q-icon name="description" size="sm" class="q-mr-sm"/>
                  <span>{{ $t('Description') }}</span>
                </div>
                <q-btn 
                  v-if="!editDescription" 
                  flat                 
                  :color="themeColor" 
                  padding="none" round icon="edit" size="sm" 
                  @click="editDescription = true"
                />
              </div>
              <div v-if="!editDescription">        
                <div v-if="description" class="description q-pa-sm br-15" 
                  :class="darkMode ? 'text-white description-bg-dark' : 'text-grey-8 description-bg-light'">
                  {{ description }}
                </div>
                <div v-else class="text-center text-italic q-py-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                  No description added...
                </div>
              </div>
              <div v-else>
                <q-input
                  v-model="description"
                  outlined
                  rounded
                  type="textarea"
                  rows="4"
                  :dark="darkMode"
                  class="glass-input">
                  <template v-slot:append>
                    <div class="column q-gutter-xs">
                      <q-btn flat dense round size="xs" icon="save_as" 
                        :color="themeColor"
                        @click="() => { 
                          editDescription = false
                          adData.description = description
                        }"/>
                      <q-btn flat dense round size="xs" icon="close" 
                        color="red"
                        @click="() => { 
                          editDescription = false 
                          description = adData.description
                        }"/>
                    </div>
                  </template>
                </q-input>                 
              </div>
              <q-checkbox
                class="q-mt-sm"
                :color="themeColor"
                v-model="adData.isPublic"
                :label="$t('Public')"
              />
            </div>

            <!-- Warning message for when no currency arbiter is available for ad -->
            <div v-if="!hasArbiters" class="pt-card q-pa-md q-mb-md br-15 warning-card" 
              :class="darkMode ? 'dark' : 'light'">
              <div class="row items-center">
                <q-icon name="warning" color="orange" size="md" class="q-mr-md"/>
                <div class="text-weight-medium">
                  There's currently no arbiter assigned for the currency ({{ this.adData.fiatCurrency?.symbol }}). Orders cannot be placed for this ad until an arbiter is assigned.
                </div>
              </div>
            </div>

            <!-- Action Button -->
            <q-btn
              :disable="checkPostData()"
              rounded
              unelevated
              no-caps
              size="lg"
              :label="$t('Next')"
              class="full-width q-py-sm text-weight-bold bg-grad button"
              @click="nextStep()"
            />
          </div>
        </q-scroll-area>
      </div>
    </div>
    <div v-if="currentStep > 3">
      <div class="row justify-center q-py-lg" style="margin-top: 50px">
        <ProgressLoader />
      </div>
    </div>
  </div>
  <div v-if="currentStep === 2">
    <AddPaymentMethods
      :type="'Ads'"
      :confirm-label="$t('Next')"
      :currency="adData.fiatCurrency.symbol"
      :currentPaymentMethods="adData.paymentMethods"
      @submit="nextStep"
      @back="currentStep--"
    />
  </div>
  <div v-if="currentStep === 3">
    <DisplayConfirmation
      :post-data="confirmationData"
      :ptl="appealCooldown"
      :transaction-type="transactionType"
      v-on:back="currentStep--"
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
  </div>
</template>
<script>
import { ref } from 'vue'
import { debounce } from 'quasar'
import { bus } from 'src/wallet/event-bus.js'
import { backend, getBackendWsUrl } from 'src/exchange/backend'
import { bchToSatoshi, fiatToBch, formatCurrency, getAppealCooldown } from 'src/exchange'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
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
  props: {
    type: {
      type: String,
      default: null
    },
    step: {
      type: [String, Number],
      default: 1
    },
    ad_id: {
      type: String,
      default: null
    }
  },
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
      currentStep: 1,
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
      isBlinking: false,
      description: '',
      editDescription: false
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
    currentStep (value) {
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
    themeColor () {
      const themeMap = {
        'glassmorphic-blue': 'blue-6',
        'glassmorphic-green': 'green-6',
        'glassmorphic-gold': 'orange-6',
        'glassmorphic-red': 'pink-6'
      }
      return themeMap[this.theme] || 'blue-6'
    },
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
        appealCooldown: this.$t('AppealCooldownHint'),
        description: 'Description or instruction for ads'
      }
    },
    confirmationData () {
      const vm = this
      const data = { ...vm.adData }
      // data.isTradeAmountFiat = this.setTradeQuantityInFiat
      data.isTradeLimitsFiat = this.setTradeLimitsInFiat
      return data
    },
    priceDeviationPct () {
      const market = Number(this.marketPrice)
      const yourPrice = Number(this.priceAmount)
      if (!Number.isFinite(market) || market <= 0) return null
      if (!Number.isFinite(yourPrice) || yourPrice <= 0) return null
      return ((yourPrice - market) / market) * 100
    },
    absPriceDeviationPct () {
      if (!Number.isFinite(this.priceDeviationPct)) return null
      return Number(Math.abs(this.priceDeviationPct).toFixed(1))
    },
    priceDeviationDirectionLabel () {
      if (!Number.isFinite(this.priceDeviationPct)) return ''
      if (this.priceDeviationPct > 0) return this.$t('Above', {}, 'above')
      if (this.priceDeviationPct < 0) return this.$t('Below', {}, 'below')
      return this.$t('EqualTo', {}, 'equal to')
    },
    showPriceDeviationWarning () {
      // Only warn on create flow, not edit.
      if (this.adsState !== 'create') return false
      if (!Number.isFinite(this.absPriceDeviationPct)) return false
      return this.absPriceDeviationPct >= 5
    }
  },
    async mounted () {
    this.currentStep = Number(this.step) || 1
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
      if (this.setTradeLimitsInFiat) {
        tradeFloor = (tradeFloor / this.marketPrice).toFixed(8)
      }
      
      let tradeAmount = Number(val)
      if (this.setTradeLimitsInFiat) {
        tradeAmount = Number(fiatToBch(tradeAmount, this.marketPrice))
      }
      if (tradeAmount < 0.00001) return 'Cannot be less than dust limit'
      if (tradeFloor > tradeAmount) return 'Cannot be less than min trade limit'
    },
    tradeLimitValidation (val) {
      if (!val) return 'This is required'
      if (val <= 0) return 'Cannot be zero'
      if (Number(this.adData.tradeFloor) > Number(this.adData.tradeCeiling)) return 'Invalid range'

      let tradeAmount = Number(this.adData.tradeAmount)
      let tradeLimit = Number(val)
      if (this.setTradeLimitsInFiat) {
        tradeAmount = Number(fiatToBch(tradeAmount, this.marketPrice))
        tradeLimit = Number(fiatToBch(tradeLimit, this.marketPrice))
      }
      
      if (tradeLimit < 0.00001) return 'Cannot be less than dust limit'
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
      const adId = vm.$route?.params?.ad
      if (!adId) {
        console.warn('Ad ID is missing, skipping fetchAd')
        return
      }
      await backend.get(`/ramp-p2p/ad/${adId}/`, { authorize: true })
        .then(response => {
          const data = response.data
          vm.adData.tradeType = data.trade_type
          vm.adData.priceType = data.price_type
          vm.adData.fixedPrice = parseFloat(data.fixed_price)
          vm.adData.floatingPrice = parseFloat(data.floating_price)
          vm.adData.fiatCurrency = data.fiat_currency
          vm.adData.description = data.description

          vm.description = vm.adData.description

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
      const adId = vm.$route?.params?.ad
      if (!adId) {
        console.warn('Ad ID is missing, skipping updateAd')
        return
      }
      await backend.put(`/ramp-p2p/ad/${adId}/`, body, { authorize: true })
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
        backend.get('/ramp-p2p/arbiter/', { params: { currency: vm.adData.fiatCurrency.symbol }, authorize: true })
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
        const selectedCurrencyUnused = vm.adsState === 'create' && !vm.fiatCurrencies.map(e => e.symbol)?.includes(vm.selectedCurrency.symbol)
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
      const currentStep = this.currentStep
      if (currentStep === 2) {
        this.adData.paymentMethods = data
      }
      if (currentStep === 3) {
        this.onSubmit()
        await this.$router.push(this.previousRoute)
        // await this.$router.push({ name: 'p2p-ads' })
      }
      if (currentStep < 3) {
        this.currentStep++
        await this.$router.replace({ query: { ...this.$route.query, step: this.currentStep } })
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
        is_public: data.isPublic,
        description: data.description
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
          !vm.tradeLimitsValid() ||
          vm.editDescription) {
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
        floor = Number(fiatToBch(floor, vm.marketPrice))
        ceiling = Number(fiatToBch(ceiling, vm.marketPrice))
      }
      let tradeAmount = vm.adData?.tradeAmount
      if (vm.setTradeLimitsInFiat) tradeAmount = Number(fiatToBch(tradeAmount, vm.marketPrice))
      return floor >= 0.00001 && floor <= ceiling && ceiling <= tradeAmount
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
/* ==================== COLORS ==================== */
.buy-color {
  color: rgb(60, 100, 246);
}
.sell-color {
  color: #ed5f59;
}

/* ==================== FONT SIZES ==================== */
.sm-font-size {
  font-size: small;
}

.md-font-size {
  font-size: medium;
}

/* ==================== GLASSMORPHIC ENHANCEMENTS ==================== */
.ad-form-container {
  min-height: 100vh;
}

/* Enhanced pt-card with animations and hover effects */
.pt-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideInUp 0.4s ease-out;
  
  &:hover {
    transform: translateY(-2px);
  }
}

.glass-input {
  ::v-deep .q-field__control {
    transition: all 0.3s ease;
  }
  
  ::v-deep .q-field__native {
    font-weight: 500;
  }
  
  &:hover ::v-deep .q-field__control {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
}

.glass-toggle {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  
  ::v-deep .q-btn {
    transition: all 0.3s ease;
    font-weight: 500;
  }
  
  ::v-deep .q-btn.q-btn--active {
    font-weight: 600;
  }
  
  &:hover {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  }
}

/* Enhanced bg-grad button */
.bg-grad.button {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover:not(:disabled) {
    transform: translateY(-3px);
  }
  
  &:active:not(:disabled) {
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.market-price {
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: -8px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #4caf50;
    transform: translateY(-50%);
  }
}

.warning-card {
  border-left: 4px solid #ff9800 !important;
  position: relative;
  overflow: hidden;
  animation: pulse-warning-ad 2s ease-in-out infinite;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  
  // Sparkle effect overlay
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 30%,
      rgba(255, 255, 255, 0.2) 40%,
      rgba(255, 255, 255, 0.5) 50%,
      rgba(255, 255, 255, 0.2) 60%,
      transparent 70%
    );
    animation: sparkle-card-ad 3s linear infinite;
    pointer-events: none;
    z-index: 1;
  }
  
  // Ensure content is above sparkle
  .row, q-icon, div {
    position: relative;
    z-index: 2;
  }
  
  &.dark {
    background: linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 193, 7, 0.15) 100%) !important;
    
    &::before {
      background: linear-gradient(
        45deg,
        transparent 30%,
        rgba(255, 255, 255, 0.15) 40%,
        rgba(255, 255, 255, 0.35) 50%,
        rgba(255, 255, 255, 0.15) 60%,
        transparent 70%
      );
    }
  }
  
  &.light {
    background: linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 193, 7, 0.1) 100%) !important;
  }
}

.price-deviation-warning {
  border-left: 4px solid #ff9800;
  border-radius: 12px;
  padding: 10px 12px;
  line-height: 1.3;

  &.dark {
    background: rgba(255, 152, 0, 0.14);
    border: 1px solid rgba(255, 193, 7, 0.18);
  }

  &.light {
    background: rgba(255, 152, 0, 0.10);
    border: 1px solid rgba(255, 193, 7, 0.22);
  }
}

.description {
  text-align: justify;
  text-align-last: left;
  white-space: pre-wrap;
  line-height: 1.6;
}

.description-bg-dark {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.description-bg-light {
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

/* ==================== ANIMATIONS ==================== */
@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.blink {
  animation: blink 1.5s ease-in-out 5;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes sparkle-card-ad {
  0% {
    transform: translateX(-100%) translateY(-100%) rotate(45deg);
  }
  100% {
    transform: translateX(100%) translateY(100%) rotate(45deg);
  }
}

@keyframes pulse-warning-ad {
  0% {
    transform: scale(1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 6px 20px rgba(255, 152, 0, 0.3);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

/* Staggered animations for cards */
.pt-card {
  &:nth-child(1) { animation-delay: 0.05s; }
  &:nth-child(2) { animation-delay: 0.1s; }
  &:nth-child(3) { animation-delay: 0.15s; }
  &:nth-child(4) { animation-delay: 0.2s; }
  &:nth-child(5) { animation-delay: 0.25s; }
  &:nth-child(6) { animation-delay: 0.3s; }
}

/* ==================== UTILITIES ==================== */
.br-15 {
  border-radius: 15px;
}

/* ==================== RESPONSIVE ADJUSTMENTS ==================== */
@media (max-width: 599px) {
  .pt-card {
    &:hover {
      transform: none;
    }
  }
  
  .text-h6 {
    font-size: 1rem;
  }
}
</style>
