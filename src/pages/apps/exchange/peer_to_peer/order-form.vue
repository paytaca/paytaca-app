<template>
  <HeaderNav :title="`P2P Ramp`" :backnavpath="'/apps/exchange/peer-to-peer/store'" class="header-nav">
    <template #top-right-menu>
      <q-btn
        v-if="adShareLinkEnabled !== false && ad?.id"
        :color="darkMode ? 'white' : 'grey-6'"
        class="q-mr-sm"
        padding="0"
        round
        flat
        dense
        size="1em"
        icon="share"
        aria-label="Share ad"
        @click="openShareDialog()"
      />
    </template>
  </HeaderNav>
  <q-pull-to-refresh @refresh="loadData">
    <div v-if="state !== 'order-process'">
      <div v-if="state === 'initial'" class="q-mx-md q-mx-none text-bow" :class="getDarkModeClass(darkMode)" :style="`height: ${minHeight}px;`">
        <!-- Skeleton Loader -->
        <div v-if="!isloaded" class="skeleton-form-container q-pa-md">
          <!-- Title Skeleton -->
          <div class="text-center q-py-md">
            <q-skeleton type="text" width="200px" height="28px" style="margin: 0 auto;" />
          </div>
          
          <!-- Trade Info Card Skeleton -->
          <div class="q-mx-md q-mb-sm">
            <q-skeleton type="rect" height="140px" style="border-radius: 15px;" />
          </div>

          <!-- Ad Info Card Skeleton -->
          <div class="q-mx-md q-mt-md q-mb-md">
            <q-skeleton type="rect" height="200px" style="border-radius: 15px;" />
          </div>

          <!-- Input Card Skeleton -->
          <div class="q-mx-md q-mb-md">
            <q-skeleton type="rect" height="140px" style="border-radius: 15px;" />
          </div>

          <!-- Action Button Skeleton -->
          <div class="q-mx-md q-py-md">
            <q-skeleton type="rect" height="50px" style="border-radius: 25px;" />
          </div>

          <!-- Warning Card Skeleton (if applicable) -->
          <div class="q-mx-md">
            <q-skeleton type="rect" height="80px" style="border-radius: 15px;" />
          </div>
        </div>
        
        <!-- Form Body -->
        <div v-if="isloaded">
          <div class="q-mx-lg q-py-md text-h5 text-center text-weight-bold lg-font-size text-grad">
            {{ $t(ad?.trade_type === 'SELL' ? 'BuyBCHWith' : 'SellBCHFor', {}, ad?.trade_type === 'SELL' ? 'Buy BCH With' : 'Sell BCH For') }} {{ ad?.fiat_currency?.symbol }}
          </div>
          <q-scroll-area ref="scrollTargetRef" :style="`height: ${minHeight}px`" class="scroll-y" @touchstart.native="preventPull">
            <div class="q-mx-md q-mb-sm">
              <TradeInfoCard
                :order="order"
                :ad="ad"
                :counterparty-peer-data="adOwnerPeerData"
                :market-price="marketPrice"
                :market-price-loading="marketPriceLoading"
                type="ad"
                @view-peer="onViewPeer"
                @view-reviews="showReviews=true"/>
            </div>
            <div class="q-mx-md q-mt-md">
              <!-- Ad Info Card -->
              <div class="pt-card q-pa-md q-mb-md br-15" :class="darkMode ? 'dark' : 'light'">
                <div class="sm-font-size pt-label" :class="getDarkModeClass(darkMode)">
                  <div class="row justify-between no-wrap q-mb-sm">
                    <span>{{ $t('PriceType') }}</span>
                    <span class="text-nowrap q-ml-xs">
                      {{ ad?.price_type }}
                    </span>
                  </div>
                  <div class="row justify-between no-wrap q-mb-sm">
                    <span>{{ $t('MinTradeLimit') }}</span>
                    <span class="text-nowrap q-ml-xs"> {{ tradeFloor }} {{ tradeLimitsCurrency(ad) }}</span>
                  </div>
                  <div class="row justify-between no-wrap q-mb-sm">
                    <span>{{ $t('MaxTradeLimit') }}</span>
                    <span class="text-nowrap q-ml-xs">{{ tradeCeiling }} {{ tradeLimitsCurrency(ad) }}</span>
                  </div>
                  <div class="row justify-between no-wrap q-mb-sm">
                    <span>
                      {{
                        $t(
                          'AppealableAfterCooldown',
                          { cooldown: appealCooldown.label },
                          `Appealable after ${ appealCooldown.label }`
                        )
                      }}
                    </span>
                  </div>
                  <div class="q-mb-sm">
                    <div class="row q-mb-xs">{{ $t('PaymentMethods', {}, 'Payment types') }}</div>
                    <div class="row q-gutter-xs items-center">
                      <q-badge outline :color="themeColor" v-for="payment, index in ad?.payment_methods" :key="index">{{ !isOwner ? payment : payment?.payment_type?.short_name }}</q-badge>
                    </div>
                  </div>
                  <!-- Display Description on Order Form -->
                  <div v-if="ad?.description" class="q-mt-md q-mb-sm">
                    <q-separator class="q-my-sm"/>
                    <div class="row q-mb-xs">{{ $t('Description') }}</div>
                    <div class="description sm-font-size" :class="darkMode ? 'text-white' : 'text-grey-8'">
                      {{ ad?.description }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Input Card -->
              <div class="pt-card q-pa-md q-mb-md br-15" :class="darkMode ? 'dark' : 'light'" v-if="!isOwner" style="position: relative;">
                <!-- <div class="xs-font-size subtext q-pb-xs q-pl-sm">Amount</div> -->
                <q-input
                  class="q-pb-xs"
                  filled
                  dense
                  type="text"
                  inputmode="none"
                  :label="$t('Amount')"
                  :disable="!hasArbiters || createOrdersEnabled === false || loadSubmitButton || creatingOrder || isZeroTradeLimits()"
                  :dark="darkMode"
                  :rules="[isValidInputAmount]"
                  v-model="amount"
                  @blur="resetInput"
                  @focus="openCustomKeyboard(true)"
                  @keydown="onKeyboardInput"
                  :readonly="readonlyState"
                  >
                  <template v-slot:append>
                    <span>{{ byFiat ? ad?.fiat_currency?.symbol : 'BCH' }}</span>
                  </template>
                </q-input>
                <KeyboardTooltip v-if="showTooltip" :dark-mode="darkMode" :key="'tip-' + tipCounter" />
                <div class="row justify-between">
                  <div v-if="amountError" class="col text-left text-weight-bold subtext sm-font-size q-pl-sm text-red">
                    {{ amountError }}
                  </div>
                  <div v-else class="col text-left text-weight-bold subtext sm-font-size q-pl-sm">
                    &asymp; {{ equivalentAmountDisplay }}
                  </div>
                  <div class="justify-end q-gutter-sm q-pr-sm">
                    <q-btn
                      class="sm-font-size button button-text-primary"
                      padding="none"
                      flat
                      dense
                      :disable="!hasArbiters || createOrdersEnabled === false || loadSubmitButton || creatingOrder || isZeroTradeLimits()"
                      :class="getDarkModeClass(darkMode)"
                      :label="$t('Min', {}, 'Min')"
                      @click="updateInput(false, true)"/>
                    <q-btn
                      class="sm-font-size button button-text-primary"
                      padding="none"
                      flat
                      :disable="!hasArbiters || createOrdersEnabled === false || loadSubmitButton || creatingOrder || isZeroTradeLimits()"
                      :class="getDarkModeClass(darkMode)"
                      :label="$t('Max', {}, 'Max')"
                      @click="updateInput(true, false)"/>
                  </div>
                </div>
                <div class="q-pl-sm">
                  <q-btn
                    class="sm-font-size button button-text-primary"
                    padding="none"
                    flat
                    no-caps
                    :disable="!hasArbiters || createOrdersEnabled === false || loadSubmitButton || creatingOrder || isZeroTradeLimits()"
                    :class="getDarkModeClass(darkMode)"
                    @click="toggleAmountCurrency()">
                    {{
                      $t(
                        'SetAmountInCurrency',
                        { currency: byFiat ? 'BCH' : ad?.fiat_currency?.symbol },
                        `Set amount in ${ byFiat ? 'BCH' : ad?.fiat_currency?.symbol }`
                      )
                    }}
                  </q-btn>
                </div>
                <div v-if="ad?.trade_type === 'BUY'">
                  <q-separator :dark="darkMode" class="q-mt-sm"/>
                  <div :style="balanceExceeded ? 'color: red': ''" class="row justify-between no-wrap q-mx-lg sm-font-size q-pt-sm">
                      <span>{{ $t('Fee') }}</span>
                      <span class="text-nowrap q-ml-xs">
                        {{ satoshiToBch(fees) }} BCH
                      </span>
                    </div>
                    <div :style="balanceExceeded ? 'color: red': ''" class="row justify-between no-wrap q-mx-lg sm-font-size">
                    <span>{{ $t('Balance') }}</span>
                    <span class="text-nowrap q-ml-xs">
                      {{ balance }} BCH
                    </span>
                  </div>
                </div>
              </div>

              <!-- create order btn -->
              <div v-if="!isOwner && hasArbiters && createOrdersEnabled !== false" class="row q-py-md">
                <q-btn
                  :disabled="!isValidInputAmount(amount) || !hasArbiters || loadSubmitButton || creatingOrder || isZeroTradeLimits()"
                  :loading="loadSubmitButton"
                  rounded
                  unelevated
                  no-caps
                  size="lg"
                  :label="ad?.trade_type === 'SELL' ? $t('Buy', {}, 'Buy') : $t('Sell', {}, 'Sell')"
                  class="full-width q-py-sm text-weight-bold bg-grad button"
                  @click="submit()">
                </q-btn>
              </div>

              <!-- Warning message for when no currency arbiter is available for ad -->
              <div v-if="!hasArbiters && !arbiterAuthRequired" class="pt-card q-pa-md q-mb-md br-15 warning-card" :class="darkMode ? 'dark' : 'light'">
                <div class="row items-center">
                  <q-icon name="warning" color="orange" size="md" class="q-mr-md"/>
                  <div class="text-weight-medium">
                    {{ $t('NoArbiterWarning', { symbol: ad?.fiat_currency?.symbol || '—' }, "There's currently no arbiter assigned for transactions related to this ad in its currency ({symbol}).") }}
                    {{ isOwner ? $t('NoArbiterOwnerNote', {}, 'Orders cannot be placed for this ad until an arbiter is assigned.') : $t('TryAgainLater', {}, 'Please try again later.') }}
                  </div>
                </div>
              </div>

              <div v-if="createOrdersEnabled === false" class="pt-card q-pa-md q-mb-md br-15 p2p-feature-notice" :class="darkMode ? 'dark' : 'light'">
                <div class="row no-wrap items-start">
                  <q-icon name="info" color="blue" size="md" class="col-auto q-mr-md q-mt-xs"/>
                  <div class="col text-weight-medium">
                    {{ $t('FeatureTemporarilyDisabled', {}, 'This feature is temporarily disabled. We appreciate your patience as we make improvements.') }}
                    {{ $t('RefreshToCheckAgain', {}, 'Refresh the page to check again.') }}
                  </div>
                </div>
              </div>

              <!-- edit ad button: For ad owners only -->
              <div class="row q-py-sm" v-if="isOwner">
                <q-btn
                  rounded
                  unelevated
                  no-caps
                  size="lg"
                  :label="$t('EditAd')"
                  class="full-width q-py-sm text-weight-bold bg-grad button"
                  @click="onEditAd">
                </q-btn>
              </div>
            </div>
          </q-scroll-area>
        </div>
        <!-- Dialogs -->
        <div v-if="openDialog">
          <MiscDialogs
            :type="'genericDialog'"
            :title="title"
            v-on:back="openDialog = false"
            v-on:submit="recieveDialogsInfo"
          />
        </div>
      </div>
      <!-- Add payment method -->
      <div v-if="state === 'add-payment-method'">
        <AddPaymentMethods
          ref="addPaymentMethodsRef"
          :type="'General'"
          :ad-payment-methods="ad?.payment_methods"
          :currency="ad?.fiat_currency?.symbol"
          v-on:back="state = 'initial'"
          v-on:submit="recievePaymentMethods"
        />
      </div>
      <UserProfileDialog v-if="showPeerProfile" :user-info="peerInfo" @back="showPeerProfile=false"/>
      <div style="position: fixed; z-index: 10;">
        <customKeyboard
          :custom-keyboard-state="customKeyboardState"
          v-on:addKey="setAmount"
          v-on:makeKeyAction="makeKeyAction"
          @backPressed="customKeyboardState = 'dismiss'"
        />
      </div>
    </div>
    <div v-else>
      <router-view :key=$route.path></router-view>
    </div>
  </q-pull-to-refresh>
  <q-dialog v-model="showPaymentDetailsReminder" persistent>
    <q-card class="q-pa-sm text-bow br-15" :class="getDarkModeClass(darkMode)" style="width: 400px; max-width: 90vw;">
      <q-card-section class="text-h6">
        {{ $t('CheckYourPaymentDetails', {}, 'Check your payment details') }}
      </q-card-section>
      <q-card-section>
        {{ $t('OrderCreationPaymentDetailsReminder', {}, 'Before creating this order, please confirm that your payment methods have the correct account name, account number, and other payment details. If anything is incorrect, update your payment methods before proceeding.') }}
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-checkbox v-model="suppressPaymentDetailsReminder" :label="$t('PaymentDetailsReminderDoNotShowAgain', {}, 'Do not show this again')" />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat no-caps :label="$t('ReviewPaymentMethods', {}, 'Review payment methods')" @click="continueAfterPaymentDetailsReminder(true)" />
        <q-btn flat no-caps :label="$t('Continue', {}, 'Continue')" @click="continueAfterPaymentDetailsReminder()" />
      </q-card-actions>
    </q-card>
  </q-dialog>
  <q-dialog v-model="showPaymentMethodsReview" maximized>
    <q-card class="text-bow" :class="getDarkModeClass(darkMode)">
      <q-toolbar>
        <q-btn flat round icon="arrow_back" :aria-label="$t('Back', {}, 'Back')" v-close-popup />
        <q-toolbar-title>{{ $t('YourPaymentMethods') }}</q-toolbar-title>
      </q-toolbar>
      <AddPaymentMethods type="Profile" embedded />
    </q-card>
  </q-dialog>
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import AddPaymentMethods from 'src/components/ramp/fiat/AddPaymentMethods.vue'
import MiscDialogs from 'src/components/ramp/fiat/dialogs/MiscDialogs.vue'
import TradeInfoCard from 'src/components/ramp/fiat/TradeInfoCard.vue'
import CustomKeyboard from 'src/components/CustomKeyboard.vue'
import UserProfileDialog from 'src/components/ramp/fiat/dialogs/UserProfileDialog.vue'
import { satoshiToBch, formatCurrency, getAppealCooldown, getP2PAmountBounds, p2pAmountToSatoshis, p2pSatoshisToAmount, p2pQuoteKey } from 'src/exchange'
import { ref } from 'vue'
import { bus } from 'src/wallet/event-bus.js'
import { backend, getBackendWsUrl, p2pErrorMessage } from 'src/exchange/backend'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { WebSocketManager } from 'src/exchange/websocket/manager'
import ShareDialog from 'src/components/ramp/fiat/dialogs/ShareDialog.vue'
import { getFiatCurrencyFractionDigits, parseFiatCurrency } from 'src/utils/denomination-utils'
import KeyboardTooltip from 'src/components/KeyboardTooltip.vue'
import { useKeyboardTooltip } from 'src/composables/useKeyboardTooltip'

export default {
  setup () {
    const scrollTargetRef = ref(null)
    const { showTooltip, tipCounter, showKeyboardTooltip, hideKeyboardTooltip } = useKeyboardTooltip()
    return {
      scrollTargetRef,
      showTooltip,
      tipCounter,
      showKeyboardTooltip,
      hideKeyboardTooltip,
      scrollDown () {
        const x = setTimeout(() => {
          const scrollElement = scrollTargetRef.value.$el
          scrollTargetRef.value.setScrollPosition('vertical', scrollElement.scrollHeight)
        }, 50)
      }
    }
  },
  components: {
    KeyboardTooltip,
    CustomKeyboard,
    AddPaymentMethods,
    MiscDialogs,
    TradeInfoCard,
    UserProfileDialog,
    HeaderNav
  },
  data () {
    return {
      creatingOrder: false,
      showPaymentDetailsReminder: false,
      showPaymentMethodsReview: false,
      suppressPaymentDetailsReminder: false,
      paymentDetailsReminderAcknowledgedScope: null,
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      websocket: null,
      isloaded: false,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (90 + 120) : this.$q.screen.height - (70 + 100),
      customKeyboardState: 'dismiss',
      readonlyState: false,
      ad: null,
      adFetchSequence: 0,
      state: 'initial',
      byFiat: false,
      amount: 0,
      reviewedQuote: null,
      fees: null,
      amountError: null,
      order: null,
      adOwnerPeerData: null,
      openDialog: false,
      openReviews: false,
      dialogType: '',
      paymentMethods: null,

      title: '',
      showPeerProfile: false,
      peerInfo: {},
      feedback: {
        rating: 3,
        comment: '',
        is_posted: false
      },
      marketPrice: 0,
      marketPriceLoading: true,
      arbitersAvailable: [],
      arbiterAuthRequired: false,
      previousRoute: null,
      networkError: false,
      loadSubmitButton: false,
      websockets: {
        ad: null,
      adFetchSequence: 0,
        marketPrice: null
      },
      errorDialogActive: false
    }
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.previousRoute = from.path
    })
  },
  emits: ['back', 'orderCancelled', 'updatePageName'],
  computed: {
    paymentDetailsReminderScope () {
      return JSON.stringify([
        this.$store.getters['global/getWallet']('bch')?.walletHash,
        this.$store.getters['ramp/getUser']?.id,
        this.ad?.id
      ])
    },
    paymentDetailsReminderRequired () {
      const userId = this.$store.getters['ramp/getUser']?.id
      if (userId == null || !this.$store.getters['global/getWallet']('bch')?.walletHash) return false
      if (!this.ad?.id || this.ad.trade_type !== 'BUY' || this.ad.is_owned) return false
      const createdAt = Date.parse(this.ad.ad_created_at)
      if (!Number.isFinite(createdAt) || createdAt >= Date.parse('2026-11-23T16:00:00Z')) return false
      const preference = this.$store.getters['ramp/paymentDetailsReminder'](userId)
      return !preference.suppressed && this.paymentDetailsReminderAcknowledgedScope !== this.paymentDetailsReminderScope
    },
    themeColor () {
      const themeMap = {
        'glassmorphic-blue': 'blue-6',
        'glassmorphic-green': 'green-6',
        'glassmorphic-gold': 'orange-6',
        'glassmorphic-red': 'pink-6'
      }
      return themeMap[this.theme] || 'blue-6'
    },
    tradeFloor () {
      return Number(this.ad?.trade_floor)
    },
    tradeCeiling () {
      return Number(this.minTradeAmount(this.ad))
    },
    adShareLinkEnabled () {
      return this.$store.getters['ramp/featureToggles']?.AD_SHARE_LINKS === true
    },
    createOrdersEnabled () {
      return this.$store.getters['ramp/featureToggles']?.ORDER_CREATE === true
    },
    hasArbiters () {
      return this.arbitersAvailable?.length > 0
    },
    appealCooldown () {
      return getAppealCooldown(this.ad?.appeal_cooldown)
    },
    equivalentAmount () {
      try {
        return p2pSatoshisToAmount(this.getTradeAmount(), this.byFiat === false, this.ad)
      } catch {
        return 0
      }
    },
    equivalentAmountDisplay () {
      if (this.byFiat) {
        const bch = Number(this.equivalentAmount)
        const bchDisplay = Number.isFinite(bch) ? bch.toFixed(8) : '—'
        return `${bchDisplay} BCH`
      }
      return parseFiatCurrency(this.equivalentAmount, this.ad?.fiat_currency?.symbol)
    },
    balance () {
      return this.$store.getters['assets/getAssets'][0].balance
    },
    balanceExceeded () {
      let value = 0
      if (this.byFiat) {
        value = this.equivalentAmount
      } else {
        value = this.amount
      }

      if (this.ad.trade_type === 'BUY') {
        const transferAmount = parseFloat(value) + satoshiToBch(this.fees)
        return this.balance < transferAmount
      } else {
        return this.balance < parseFloat(value)
      }
    },
    isOwner () {
      return this.ad.is_owned
    }
  },
  watch: {
    paymentDetailsReminderScope () {
      this.showPaymentDetailsReminder = false
      this.showPaymentMethodsReview = false
      this.suppressPaymentDetailsReminder = false
      this.paymentDetailsReminderAcknowledgedScope = null
    },
    customKeyboardState (val) {
      if (val === 'show') {
        this.minHeight -= 250
        this.scrollDown()
      } else {
        this.minHeight += 250
      }
    },
    marketPrice (val) {
      // polling ad info whenever market price update

    },
    amount (val) {
      if (this.ad?.trade_type === 'BUY') {
        this.fetchFees()
      }
    }
  },
  async created () {
    bus.on('relogged', this.onRelogged)
  },
  async mounted () {
    bus.emit('hide-menu')
    await this.loadData()
  },
  beforeUnmount () {
    this.closeWebSocketConnection()
  },
  methods: {
    continueAfterPaymentDetailsReminder (review = false) {
      this.paymentDetailsReminderAcknowledgedScope = this.paymentDetailsReminderScope
      if (this.suppressPaymentDetailsReminder) {
        this.$store.commit('ramp/dismissPaymentDetailsReminder', {
          walletHash: this.$store.getters['global/getWallet']('bch')?.walletHash,
          accountId: this.$store.getters['ramp/getUser']?.id,
          suppress: true
        })
      }
      this.showPaymentDetailsReminder = false
      if (review) {
        this.showPaymentMethodsReview = true
      } else {
        this.submit()
      }
    },
    getDarkModeClass,
    formatCurrency,
    satoshiToBch,
    fiatFractionDigits () {
      return getFiatCurrencyFractionDigits(this.ad?.fiat_currency?.symbol)
    },
    onRelogged () {
      // Reset auth-related guards after a successful login
      this.arbiterAuthRequired = false
      this.loadData()
    },
    preventPull (e) {
      // Only allow pull-to-refresh when the inner scroll area is already at the
      // very top. The scrolling element is QScrollArea's inner container, so the
      // root's scrollTop is always 0 — read the ref's scroll percentage instead.
      const scrollArea = this.scrollTargetRef
      if (scrollArea && scrollArea.getScrollPercentage && scrollArea.getScrollPercentage().top > 0) {
        e.stopPropagation()
      }
    },
    closeWebSocketConnection () {
      this.websockets?.ad?.closeConnection()
      this.websockets?.marketPrice?.closeConnection()
    },
    openShareDialog () {
      this.$q.dialog({
        component: ShareDialog,
        componentProps: {
          adShareUrl: `https://p2p.paytaca.com/ad/share/?id=${this.ad.id}`
        }
      })
    },
    onEditAd () {
      this.$router.push({ name: 'p2p-ads-edit-form', params: { ad: this.ad.id }, query: { step: 1 } })
    },
    async loadData (done) {
      const vm = this
      vm.isloaded = false
      await Promise.all([
        vm.fetchAd(),
        vm.$store.dispatch('ramp/fetchFeatureToggles')
      ])
      await vm.fetchAdOwnerPeerData()
      // Only fetch arbiters if ad was successfully loaded with fiat_currency
      if (vm.ad && vm.ad.fiat_currency) {
        await vm.fetchArbiters()
      }
      // Seed the market price over REST: the market-price socket only pushes on
      // price ticks, so waiting for it leaves the price percentage pending for
      // minutes, or forever while the price is unchanged.
      vm.marketPriceLoading = !vm.marketPrice
      await vm.fetchMarketPrice()
      // Websocket subscriptions require fiat currency symbol
      vm.setupWebSocket()
      vm.isloaded = true
      if (done) done()
    },
    setAmount (key) {
      let receiveAmount, finalAmount, tempAmountFormatted = ''
      let proceed = false
      receiveAmount = this.amount

      // see if # of decimal valid
      let temp = receiveAmount.toString()
      temp = temp.split('.')
      if (temp.length === 2) {
        if (this.byFiat) {
          if (temp[1].length < 2) {
            proceed = true
          }
        } else {
          if (temp[1].length < 8) {
            proceed = true
          }
        }
      } else {
        proceed = true
      }

      if (proceed) {
        receiveAmount = receiveAmount === null ? '' : receiveAmount
        if (key === '.' && receiveAmount === '') {
          finalAmount = '0.'
        } else {
          finalAmount = receiveAmount.toString()
          const hasPeriod = finalAmount.indexOf('.')
          if (hasPeriod < 1) {
            if (Number(finalAmount) === 0 && Number(key) > 0) {
              finalAmount = key
            } else {
              // Check amount if still zero
              if (Number(finalAmount) === 0 && Number(finalAmount) === Number(key)) {
                finalAmount = 0
              } else {
                finalAmount += key.toString()
              }
            }
          } else {
            finalAmount += key !== '.' ? key.toString() : ''
          }
        }
      }
      if (!proceed) return
      this.shiftAmount = 0
      this.amount = finalAmount
    },
    makeKeyAction (action) {
      this.hideKeyboardTooltip()
      if (action === 'backspace') {
        // Backspace
        this.amount = String(this.amount).slice(0, -1)
      } else if (action === 'delete') {
        // Delete
        this.amount = '0'
      } else {
        this.customKeyboardState = 'dismiss'
        this.readonlyState = false
      }
    },
    onKeyboardInput (e) {
      e.preventDefault()
      this.showKeyboardTooltip()
    },
    openCustomKeyboard (state) {
      this.readonlyState = state

      if (state) {
        this.customKeyboardState = 'show'
      } else {
        this.customKeyboardState = 'dismiss'
      }
    },
    maxAmount (tradeAmount, tradeCeiling) {
      if (parseFloat(tradeAmount) < parseFloat(tradeCeiling)) {
        return parseFloat(tradeAmount)
      } else {
        return parseFloat(tradeCeiling)
      }
    },
    customBackEditAds () {
      this.$refs.fiatAdsForm.step--
    },
    orderConfirm () {
      this.dialogType = 'confirmOrderCreate'
      this.openDialog = true
      this.title = this.$t('ConfirmOrder')
    },
    async fetchAd (strict = false) {
      const adId = this.$route?.params?.ad
      if (!adId) {
        if (strict) throw new Error('Ad ID is missing.')
        return
      }
      const sequence = this.adFetchSequence = (this.adFetchSequence || 0) + 1
      try {
        const response = await backend.get(`/ramp-p2p/ad/${adId}/`, { authorize: true, cache: false, params: { _fresh: Date.now() } })
        if (response.cached === true) throw new Error('Unable to refresh the ad quote. Please try again.')
        if (sequence !== this.adFetchSequence) {
          if (strict) throw new Error('The ad quote changed while refreshing. Please review it and try again.')
          return this.ad
        }
        const initial = !this.ad
        this.ad = response.data
        if (initial) this.updateInput(false, true)
        this.isValidInputAmount()
        return this.ad
      } catch (error) {
        if (strict) throw error
        this.handleRequestError(error)
      }
    },
    async fetchAdOwnerPeerData () {
      if (this.adOwnerPeerData) return
      const ownerId = this.ad?.owner?.id
      if (!ownerId) return
      try {
        const response = await backend.get(`/ramp-p2p/peer/${ownerId}/`, { authorize: true })
        if (response.data) {
          this.adOwnerPeerData = { ...response.data }
        }
      } catch (error) {
        this.handleRequestError(error)
      }
    },
    async createOrder () {
      const vm = this
      if (vm.creatingOrder) return
      if (vm.paymentDetailsReminderRequired) {
        vm.showPaymentDetailsReminder = true
        vm.loadSubmitButton = false
        if (vm.$refs.addPaymentMethodsRef) vm.$refs.addPaymentMethodsRef.loadSubmitButton = false
        return
      }
      const reminderDismissal = vm.paymentDetailsReminderAcknowledgedScope &&
        vm.paymentDetailsReminderAcknowledgedScope === vm.paymentDetailsReminderScope
        ? {
            walletHash: vm.$store.getters['global/getWallet']('bch')?.walletHash,
            accountId: vm.$store.getters['ramp/getUser']?.id,
            suppress: vm.suppressPaymentDetailsReminder
          }
        : null
      vm.creatingOrder = true
      try {
        const quote = vm.reviewedQuote || p2pQuoteKey(vm.ad)
        const amount = vm.amount
        const byFiat = vm.byFiat
        const refreshedAd = await vm.fetchAd(true)
        if (p2pQuoteKey(refreshedAd) !== p2pQuoteKey(vm.ad) || quote !== p2pQuoteKey(vm.ad) || amount !== vm.amount || byFiat !== vm.byFiat) {
          vm.returnToQuote('The ad price or limits changed. Review the refreshed quote and amount before submitting again.')
          return
        }
        if (!vm.isValidInputAmount()) {
          vm.returnToQuote(vm.amountError)
          return
        }
        const body = { ad: vm.ad.id, trade_amount: vm.getTradeAmount() }
        if (vm.ad.trade_type === 'BUY') body.payment_methods = vm.paymentMethods.map(p => p.id)
        const response = await backend.post('/ramp-p2p/order/', body, { authorize: true })
        vm.order = response.data.order
        if (reminderDismissal) {
          vm.$store.commit('ramp/dismissPaymentDetailsReminder', { ...reminderDismissal, orderId: vm.order.id })
        }
        vm.state = 'order-process'
        vm.$emit('updatePageName', 'order-process')
        await vm.$router.push({ name: 'p2p-order', params: { order: vm.order.id } })
      } catch (error) {
        vm.returnToQuote(p2pErrorMessage(error, 'Unable to create the order. Please refresh and try again.'))
        await vm.fetchAd()
      } finally {
        vm.creatingOrder = false
        vm.loadSubmitButton = false
        if (vm.$refs.addPaymentMethodsRef) vm.$refs.addPaymentMethodsRef.loadSubmitButton = false
      }
    },
    async confirmOrder () {
      return new Promise((resolve, reject) => {
        const vm = this
        const url = `/ramp-p2p/order/${vm.order.id}/confirm/`
        backend.post(url, {}, { authorize: true })
          .then(response => {
            resolve(response)
          })
          .catch(error => {
            this.handleRequestError(error)
            reject(error)
          })
      })
    },
    async fetchArbiters () {
      const vm = this
      // Check if ad and fiat_currency are available before making the request
      if (!vm.ad || !vm.ad.fiat_currency || !vm.ad.fiat_currency.symbol) {
        console.warn('Cannot fetch arbiters: ad or fiat_currency is not available')
        vm.arbitersAvailable = []
        return
      }
      if (vm.arbiterAuthRequired) return
      await backend.get('/ramp-p2p/arbiter/', { params: { currency: vm.ad.fiat_currency.symbol }, authorize: true })
        .then(response => {
          vm.arbitersAvailable = response.data
        })
        .catch(error => {
          const status = error?.response?.status
          const detail = String(error?.response?.data?.detail || '')
          // If the user isn't authenticated yet, avoid showing "no arbiter" message
          // and avoid triggering refresh loops. Login flow will handle retry.
          if ((status === 401 || status === 403) && /no auth credentials/i.test(detail)) {
            vm.arbitersAvailable = []
            vm.arbiterAuthRequired = true
            return
          }
          this.handleRequestError(error)
        })
    },
    async fetchFees () {
      let sats
      try { sats = this.getTradeAmount() } catch { return }
      const url = `/ramp-p2p/utils/calculate-fees/?sats_trade_amount=${sats}`
      await backend.get(url, { authorize: 'peer' })
        .then(response => {
          const tempFee = response.data
          this.fees = Object.values(tempFee).reduce((a, b) => a + b, 0)
        })
        .catch(error => {
          if (error.response) {
            console.error(error?.response?.status || error?.code || 'Request failed')
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            console.error(error?.response?.status || error?.code || 'Request failed')
            bus.emit('network-error')
          }
        })
    },
    isValidInputAmount (value = this.amount) {
      try {
        p2pAmountToSatoshis(value, this.byFiat, this.ad)
        if (this.ad.trade_type === 'BUY' && this.balanceExceeded) {
          throw new Error(this.$t('FiatOrderAmountErrMsg3'))
        }
        this.amountError = null
        return true
      } catch (error) {
        this.amountError = error.message
        return false
      }
    },
    isZeroTradeLimits () {
      try {
        getP2PAmountBounds(this.ad)
        return false
      } catch {
        return true
      }
    },
    resetInput () {
      this.isValidInputAmount()
    },
    updateInput (max = false, min = false) {
      try {
        const bounds = getP2PAmountBounds(this.ad)
        const sats = min ? bounds.min : max ? bounds.max : bounds.min
        this.byFiat = false
        this.amount = p2pSatoshisToAmount(sats, false, this.ad)
        this.isValidInputAmount()
      } catch (error) {
        this.amountError = error.message
      }
    },
    toggleAmountCurrency () {
      try {
        const sats = this.getTradeAmount()
        const byFiat = !this.byFiat
        this.amount = p2pSatoshisToAmount(sats, byFiat, this.ad)
        this.byFiat = byFiat
      } catch (error) {
        this.amountError = error.message
      }
    },
    returnToQuote (message) {
      this.state = 'initial'
      this.openDialog = false
      this.reviewedQuote = null
      this.$q.notify({ type: 'error', message, timeout: 5000 })
    },
    tradeLimitsCurrency (ad) {
      return (ad?.trade_limits_in_fiat ? ad?.fiat_currency?.symbol : ad?.crypto_currency?.symbol) || ''
    },
    minTradeAmount (ad) {
      try {
        const { max } = getP2PAmountBounds(ad)
        return p2pSatoshisToAmount(max, ad.trade_limits_in_fiat, ad)
      } catch {
        return 0
      }
    },
    getTradeAmount () {
      return p2pAmountToSatoshis(this.amount, this.byFiat, this.ad)
    },
    onBack () {
      this.$emit('back')
    },
    onOrderCancelled () {
      this.$emit('orderCancelled')
    },
    recievePaymentMethods (item) {
      this.$refs.addPaymentMethodsRef.loadSubmitButton = true
      this.paymentMethods = item
      this.createOrder()
    },
    recieveDialogsInfo (item) {
      this.loadSubmitButton = true
      this.createOrder()
      this.title = ''
    },
    submit () {
      const vm = this

      // reset custom keyboard
      vm.customKeyboardState = 'dismiss'
      vm.readonlyState = false

      if (vm.paymentDetailsReminderRequired) {
        vm.showPaymentDetailsReminder = true
        return
      }

      vm.reviewedQuote = p2pQuoteKey(vm.ad)
      switch (vm.ad.trade_type) {
        case 'SELL':
          vm.orderConfirm()
          break
        case 'BUY':
          vm.state = 'add-payment-method'
          break
      }
    },
    countDecimals (value) {
      if (Math.floor(value) === value) return 0
      return value.toString().split('.')[1].length || 0
    },
    onViewPeer (data) {
      this.peerInfo = data
      this.showPeerProfile = true
    },
    async fetchMarketPrice () {
      try {
        const currency = this.ad?.fiat_currency?.symbol
        if (!currency) return
        const response = await backend.get('/ramp-p2p/utils/market-price/', { authorize: 'peer', params: { currency } })
        const price = parseFloat(response.data?.price)
        if (Number.isFinite(price) && price > 0) this.marketPrice = price
      } catch (error) {
        console.error('Failed to fetch market price:', error?.response?.status || error?.code || 'Request failed')
      } finally {
        this.marketPriceLoading = false
      }
    },
    setupWebSocket () {
      // Guard: ad may still be loading or missing fiat_currency
      const fiatSymbol = this.ad?.fiat_currency?.symbol
      const adId = this.ad?.id
      if (!fiatSymbol || !adId) return

      // Subscribe to market price updates
      this.closeWebSocketConnection()
      this.websockets.marketPrice = new WebSocketManager()
      this.websockets.marketPrice.setWebSocketUrl(`${getBackendWsUrl()}market-price/${fiatSymbol}/`)
      this.websockets.marketPrice.subscribeToMessages((message) => {
        const price = parseFloat(message.price)
        if (price) {
          this.marketPrice = price
          this.marketPriceLoading = false
          this.fetchAd()
        }
      })
      // Subscribe to ad updates
      this.websockets.ad = new WebSocketManager()
      this.websockets.ad.setWebSocketUrl(
        `${getBackendWsUrl()}ad/${adId}/`
      )
      this.websockets.ad.subscribeToMessages((message) => {
        // Refresh the ad data
        if (message === 'AD_UPDATED') this.fetchAd()
      })
    },
    handleRequestError (error) {
      if (['p2p_identity_mismatch', 'p2p_account_type_mismatch'].includes(error?.code)) {
        this.$q.notify({ type: 'error', message: error.message, timeout: 5000 })
        return
      }
      if (error.code === 'ECONNABORTED') return
      console.error(error?.response?.status || error?.code || 'Request failed')
      if (!error.response) {
        // Network error
        bus.emit('network-error')
      } else {
        // HTTP status code error
        switch (error.response.status) {
          case 403:
            bus.emit('session-expired')
            break
          case 400:
            this.showErrorDialog('Bad Request. Please check the request parameters.')
            break
          case 500:
            this.showErrorDialog('Internal Server Error. Please try again later.')
            break
          default:
            this.showErrorDialog(`Unexpected error: ${error.response.statusText}. Please try again later.`)
            console.error(`Error: ${error.response.status}. ${error.response.statusText}`)
        }
      }
    },
    showErrorDialog (message) {
      if (!this.errorDialogActive) {
        this.errorDialogActive = true
        this.$q.notify({
          type: 'warning',
          message: message,
          position: 'bottom',
          timeout: 5000,
          onDismiss: () => {
            this.errorDialogActive = false
          }
        })
      }
    }
  }
}
</script>
  <style lang="scss" scoped>
  /* ==================== FONT SIZES ==================== */
  .sm-font-size {
    font-size: small;
  }
  .md-font-size {
    font-size: medium;
  }
  .lg-font-size {
    font-size: large;
  }

  /* ==================== UTILITIES ==================== */
  .subtext {
    opacity: .5;
  }

  /* Keep the page scrollable but hide the scrollbar visuals. */
  :deep(.q-scrollarea__bar),
  :deep(.q-scrollarea__thumb) {
    display: none !important;
  }

  .description {
    text-align: left;
    white-space: pre-wrap;
    font-size: 15px;
    line-height: 1.6;
  }

  .br-15 {
    border-radius: 15px;
  }

  /* ==================== GLASSMORPHIC ENHANCEMENTS ==================== */
  .pt-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: slideInUp 0.4s ease-out;
    
    &:hover {
      transform: translateY(-2px);
    }
  }

  .bg-grad.button {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    &:hover:not(:disabled) {
      transform: translateY(-3px);
    }
    
    &:active:not(:disabled) {
      transform: translateY(-1px);
    }
  }

  .warning-card {
    border-left: 4px solid #ff9800 !important;
    position: relative;
    overflow: hidden;
    animation: pulse-warning 2s ease-in-out infinite;
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
      animation: sparkle-card 3s linear infinite;
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


  /* ==================== ANIMATIONS ==================== */
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

  @keyframes sparkle-card {
    0% {
      transform: translateX(-100%) translateY(-100%) rotate(45deg);
    }
    100% {
      transform: translateX(100%) translateY(100%) rotate(45deg);
    }
  }

  @keyframes pulse-warning {
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


  /* ==================== RESPONSIVE ADJUSTMENTS ==================== */
  @media (max-width: 599px) {
    .pt-card {
      &:hover {
        transform: none;
      }
    }
  }

  /* ==================== SKELETON LOADER STYLES ==================== */
  .skeleton-form-container {
    animation: fadeIn 0.3s ease-out;
    
    .q-skeleton {
      animation: shimmer 1.5s infinite;
    }
  }

  @keyframes shimmer {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
    100% {
      opacity: 1;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
