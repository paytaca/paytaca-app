<template>
  <HeaderNav :title="`P2P Exchange`" :backnavpath="'/apps/exchange/peer-to-peer/store'"/>
  <q-pull-to-refresh @refresh="loadData">
    <div v-if="state !== 'order-process'">
      <div v-if="state === 'initial'" class="q-mx-md q-mx-none text-bow" :class="getDarkModeClass(darkMode)" :style="`height: ${minHeight}px;`">
        <!-- Form Body -->
        <div v-if="isloaded">
          <div class="q-mx-lg q-py-xs text-h5 text-center text-weight-bold lg-font-size">
            {{ ad.trade_type === 'SELL' ? 'BUY BCH WITH' : 'SELL BCH FOR'}} {{ ad?.fiat_currency?.symbol }}
          </div>
          <q-btn v-if="adShareLinkEnabled !== false" :color="darkMode ? 'white' : 'grey-6'" padding="0" round flat dense size="1em" icon="share" :style="$q.platform.is.ios ? 'top: 105px' : 'top: 75px'" style="position: fixed; right: 50px;" @click="openShareDialog()"/>
          <q-scroll-area ref="scrollTargetRef" :style="`height: ${minHeight}px`" style="overflow-y:auto;">
            <div class="q-mx-lg q-px-xs q-mb-sm">
              <TradeInfoCard
                :order="order"
                :ad="ad"
                type="ad"
                @view-peer="onViewPeer"
                @view-reviews="showReviews=true"/>
            </div>
            <div class="q-mx-md">
              <!-- Ad Info -->
              <div class="q-pt-sm sm-font-size pt-label" :class="getDarkModeClass(darkMode)">
                <div class="row justify-between no-wrap q-mx-lg">
                  <span>{{ $t('PriceType') }}</span>
                  <span class="text-nowrap q-ml-xs">
                    {{ ad.price_type }}
                  </span>
                </div>
                <div class="row justify-between no-wrap q-mx-lg">
                  <span>{{ $t('MinTradeLimit') }}</span>
                  <span class="text-nowrap q-ml-xs"> {{ tradeFloor }} {{ tradeLimitsCurrency(ad) }}</span>
                </div>
                <div class="row justify-between no-wrap q-mx-lg">
                  <span>{{ $t('MaxTradeLimit') }}</span>
                  <span class="text-nowrap q-ml-xs">{{ tradeCeiling }} {{ tradeLimitsCurrency(ad) }}</span>
                </div>
                <div class="row justify-between no-wrap q-mx-lg">
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
                <div class="q-mx-lg">
                  <div class="row">Payment types</div>
                  <q-badge outline :color="ad.trade_type === 'SELL' ? 'blue' : 'red'" v-for="payment, index in ad?.payment_methods" :key="index" class="col q-mr-xs">{{ !isOwner ? payment : payment?.payment_type?.short_name }}</q-badge>
                </div>
              </div>

              <!-- Input -->
              <div class="q-mt-md q-mx-md" v-if="!isOwner">
                <!-- <div class="xs-font-size subtext q-pb-xs q-pl-sm">Amount</div> -->
                <q-input
                  class="q-pb-xs"
                  filled
                  dense
                  type="text"
                  inputmode="none"
                  :label="$t('Amount')"
                  :disable="!hasArbiters || createOrdersEnabled === false || isZeroTradeLimits()"
                  :dark="darkMode"
                  :rules="[isValidInputAmount]"
                  v-model="amount"
                  @blur="resetInput"
                  @focus="openCustomKeyboard(true)"
                  :readonly="readonlyState"
                  >
                  <template v-slot:append>
                    <span>{{ byFiat ? ad?.fiat_currency?.symbol : 'BCH' }}</span>
                  </template>
                </q-input>
                <div class="row justify-between">
                  <div v-if="amountError" class="col text-left text-weight-bold subtext sm-font-size q-pl-sm text-red">
                    {{ amountError }}
                  </div>
                  <div v-else class="col text-left text-weight-bold subtext sm-font-size q-pl-sm">
                    &asymp; {{ !byFiat ? ad?.fiat_currency?.symbol : '' }} {{ equivalentAmount }} {{ !byFiat ? '' : 'BCH' }}
                  </div>
                  <div class="justify-end q-gutter-sm q-pr-sm">
                    <q-btn
                      class="sm-font-size button button-text-primary"
                      padding="none"
                      flat
                      dense
                      :disable="!hasArbiters || createOrdersEnabled === false || isZeroTradeLimits()"
                      :class="getDarkModeClass(darkMode)"
                      :label="$t('MIN')"
                      @click="updateInput(max=false, min=true)"/>
                    <q-btn
                      class="sm-font-size button button-text-primary"
                      padding="none"
                      flat
                      :disable="!hasArbiters || createOrdersEnabled === false || isZeroTradeLimits()"
                      :class="getDarkModeClass(darkMode)"
                      :label="$t('MAX')"
                      @click="updateInput(max=true, min=false)"/>
                  </div>
                </div>
                <div class="q-pl-sm">
                  <q-btn
                    class="sm-font-size button button-text-primary"
                    padding="none"
                    flat
                    no-caps
                    :disable="!hasArbiters || createOrdersEnabled === false || isZeroTradeLimits()"
                    :class="getDarkModeClass(darkMode)"
                    @click="byFiat = !byFiat">
                    {{
                      $t(
                        'SetAmountInCurrency',
                        { currency: byFiat ? 'BCH' : ad?.fiat_currency?.symbol },
                        `Set amount in ${ byFiat ? 'BCH' : ad?.fiat_currency?.symbol }`
                      )
                    }}
                  </q-btn>
                </div>
                <div v-if="ad.trade_type === 'BUY'">
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
              <div v-if="!isOwner && hasArbiters && createOrdersEnabled !== false" class="row q-mx-lg q-py-md">
                <q-btn
                  :disabled="!isValidInputAmount(amount) || !hasArbiters || loadSubmitButton || isZeroTradeLimits()"
                  :loading="loadSubmitButton"
                  rounded
                  no-caps
                  :label="ad.trade_type === 'SELL' ? $t('BUY') : $t('SELL')"
                  :color="ad.trade_type === 'SELL' ? 'blue-6' : 'red-6'"
                  class="q-space"
                  @click="submit()">
                </q-btn>
              </div>

              <!-- Warning message for when no currency arbiter is available for ad -->
              <div v-if="!hasArbiters" class="info-box q-mx-md q-my-sm" :class="darkMode ? 'warning-box-dark' : 'warning-box-light'">
                There’s currently no arbiter assigned for transactions related to this ad in its currency ({{ this.ad.fiat_currency.symbol }}). {{ isOwner ? 'Orders cannot be placed for this ad until an arbiter is assigned.' : 'Please try again later.'}}
              </div>

              <div v-if="createOrdersEnabled === false" class="info-box q-mx-md q-my-sm" :class="darkMode ? 'info-box-dark' : 'info-box-light'">
                This feature is temporarily disabled. We appreciate your patience as we make improvements.
              </div>

              <!-- edit ad button: For ad owners only -->
              <div class="row q-mx-lg q-py-sm" v-if="isOwner">
                <q-btn
                  rounded
                  no-caps
                  :label="$t('EditAd')"
                  :color="ad.trade_type === 'SELL' ? 'blue-6' : 'red-6'"
                  class="q-space"
                  @click="onEditAd">
                </q-btn>
              </div>
            </div>
          </q-scroll-area>
        </div>
        <!-- Progress Loader -->
        <div v-else>
          <div class="row justify-center q-py-lg" style="margin-top: 50px">
            <ProgressLoader />
          </div>
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
        />
      </div>
    </div>
    <div v-else>
      <router-view :key=$route.path></router-view>
    </div>
  </q-pull-to-refresh>
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import AddPaymentMethods from 'src/components/ramp/fiat/AddPaymentMethods.vue'
import MiscDialogs from 'src/components/ramp/fiat/dialogs/MiscDialogs.vue'
import TradeInfoCard from 'src/components/ramp/fiat/TradeInfoCard.vue'
import CustomKeyboard from 'src/components/CustomKeyboard.vue'
import UserProfileDialog from 'src/components/ramp/fiat/dialogs/UserProfileDialog.vue'
import { bchToSatoshi, satoshiToBch, fiatToBch, formatCurrency, getAppealCooldown } from 'src/exchange'
import { ref } from 'vue'
import { bus } from 'src/wallet/event-bus.js'
import { createChatSession, updateChatMembers, generateChatRef } from 'src/exchange/chat'
import { backend, getBackendWsUrl } from 'src/exchange/backend'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { WebSocketManager } from 'src/exchange/websocket/manager'
import { fetchUser } from 'src/exchange/auth'
import { loadChatIdentity } from 'src/exchange/chat'
import ShareDialog from 'src/components/ramp/fiat/dialogs/ShareDialog.vue'

export default {
  setup () {
    const scrollTargetRef = ref(null)
    return {
      scrollTargetRef,
      scrollDown () {
        const x = setTimeout(() => {
          const scrollElement = scrollTargetRef.value.$el
          scrollTargetRef.value.setScrollPosition('vertical', scrollElement.scrollHeight)
        }, 50)
      }
    }
  },
  components: {
    CustomKeyboard,
    ProgressLoader,
    AddPaymentMethods,
    MiscDialogs,
    TradeInfoCard,
    UserProfileDialog,
    HeaderNav
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      websocket: null,
      isloaded: false,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (90 + 120) : this.$q.screen.height - (70 + 100),
      customKeyboardState: 'dismiss',
      readonlyState: false,
      ad: null,
      state: 'initial',
      byFiat: false,
      amount: 0,
      fees: null,
      amountError: null,
      order: null,
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
      arbitersAvailable: [],
      previousRoute: null,
      networkError: false,
      loadSubmitButton: false,
      websockets: {
        ad: null,
        marketPrice: null
      },
      errorDialogActive: false
    }
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.previousRoute = from.path || '/apps/exchange/peer-to-peer/store'
    })
  },
  emits: ['back', 'orderCanceled', 'updatePageName'],
  computed: {
    tradeFloor () {
      let floor = this.ad?.trade_floor
      const ceiling = this.ad?.trade_ceiling
      if (floor > ceiling) {
        floor = ceiling
      }
      return Number(floor)
    },
    tradeCeiling () {
      return Number(this.minTradeAmount(this.ad))
    },
    adShareLinkEnabled () {
      return this.$store.getters['ramp/featureToggles']?.AdShareLinks
    },
    createOrdersEnabled () {
      return this.$store.getters['ramp/featureToggles']?.CreateOrders
    },
    hasArbiters () {
      return this.arbitersAvailable?.length > 0
    },
    appealCooldown () {
      return getAppealCooldown(this.ad?.appeal_cooldown)
    },
    equivalentAmount () {
      let amount = this.amount
      if (amount === '' || isNaN(amount)) return 0
      if (!this.byFiat) {
        amount = Number((amount) * parseFloat(this.ad.price)).toFixed(2)
      } else {
        amount = Number(parseFloat(amount) / parseFloat(this.ad.price)).toFixed(8)
      }
      return Number(amount)
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
    byFiat () {
      this.updateInput()
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
      if (this.ad.trade_type === 'BUY') {
        this.fetchFees()
      }
    }
  },
  async created () {
    bus.on('relogged', this.loadData)
  },
  async mounted () {
    bus.emit('hide-menu')
    await this.loadData()
  },
  beforeUnmount () {
    this.closeWebSocketConnection()
  },
  methods: {
    getDarkModeClass,
    formatCurrency,
    satoshiToBch,
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
      await vm.fetchAd()
      await vm.fetchArbiters()
      vm.setupWebSocket()
      vm.$store.dispatch('ramp/fetchFeatureToggles')
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
        this.amount = finalAmount
      }
    },
    makeKeyAction (action) {
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
    async fetchAd () {
      await backend.get(`/ramp-p2p/ad/${this.$route.params.ad}/`, { authorize: true })
        .then(response => {
          this.ad = response.data
          if (!this.isloaded) {
            this.amount = Number(this.ad.trade_floor)
            if (this.ad.trade_ceiling < this.ad.trade_floor) {
              this.amount = this.ad.trade_ceiling
            }
            this.byFiat = this.ad.trade_limits_in_fiat
            if (this.byFiat) {
              this.amount = Number(Number(this.amount).toFixed(2))
            }
          }
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    async createOrder () {
      const vm = this
      const body = {
        ad: vm.ad.id,
        trade_amount: vm.getTradeAmount()
      }
      if (vm.ad.trade_type === 'BUY') {
        const temp = this.paymentMethods.map(p => p.id)
        body.payment_methods = temp
      }
      try {
        await backend.post('/ramp-p2p/order/', body, { authorize: true })
          .then(async (response) => {
            vm.order = response.data.order

            vm.state = 'order-process'
            vm.$emit('updatePageName', 'order-process')

            // Create chat identity first, if it does not exist
            const user = await fetchUser()
            await loadChatIdentity ('peer', { name: user?.name, chat_identity_id: user.chat_identity_id })

            vm.fetchOrderMembers(vm.order.id)
              .then(members => {
                vm.createGroupChat(vm.order.id, members, vm.order.created_at)
              })
            vm.$router.push({ name: 'p2p-order', params: { order: vm.order.id } })
          })
      } catch (error) {
        this.handleRequestError(error)
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
    fetchOrderMembers (orderId) {
      return new Promise((resolve, reject) => {
        backend.get(`/ramp-p2p/order/${orderId}/members/`, { authorize: true })
          .then(response => {
            resolve(response.data)
          })
          .catch(error => {
            this.handleRequestError(error)
            reject(error)
          })
      })
    },
    async fetchArbiters () {
      const vm = this
      await backend.get('ramp-p2p/arbiter/', { params: { currency: vm.ad.fiat_currency.symbol }, authorize: true })
        .then(response => {
          vm.arbitersAvailable = response.data
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    async fetchFees () {
      const url = `ramp-p2p/utils/calculate-fees/?sats_trade_amount=${this.getTradeAmount()}`
      await backend.get(url)
        .then(response => {
          const tempFee = response.data
          this.fees = Object.values(tempFee).reduce((a, b) => a + b, 0)
        })
        .catch(error => {
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            console.error(error)
            bus.emit('network-error')
          }
        })
    },
    createGroupChat (orderId, members, createdAt) {
      console.log('createGroupChat', orderId, members, createdAt)
      const vm = this
      const chatMembers = members.map(({ chat_identity_id }) => ({ chat_identity_id, is_admin: true }))
      const _members = [vm.order?.members.buyer.public_key, vm.order?.members.seller.public_key].join('')
      const chatRef = generateChatRef(vm.order.id, vm.order.created_at, _members)
      createChatSession(orderId, chatRef)
        .then(chatRef => { updateChatMembers(chatRef, chatMembers) })
        .catch(console.error)
    },
    isValidInputAmount (value = this.amount) {
      let valid = true
      let tradeFloor = this.formatDecimals('bch', this.ad.trade_floor)
      let tradeCeiling = this.formatDecimals('bch', this.minTradeAmount(this.ad))

      let amount = value
      const price = this.ad.price

      if (tradeFloor > tradeCeiling) {
        tradeFloor = tradeCeiling
      }

      if (this.ad.trade_limits_in_fiat) {
        tradeFloor = this.formatDecimals('fiat', tradeFloor)
        tradeCeiling = this.formatDecimals('bch', tradeCeiling)
        if (!this.byFiat) {
          amount = this.bchToFiat(amount, price)
        } else {
          amount = this.formatDecimals('fiat', amount)
        }
      } else {
        if (this.byFiat) {
          amount = this.formatDecimals('bch', this.fiatToBch(amount, price))
        }
      }

      if (amount < tradeFloor) {
        valid = false
        this.amountError = this.$t('FiatOrderAmountErrMsg1')
      }
      if (amount > tradeCeiling) {
        valid = false
        this.amountError = this.$t('FiatOrderAmountErrMsg2')
      }
      if (value === undefined || isNaN(value)) {
        valid = false
        this.amountError = 'Amount cannot be none or undefined'
      }
      if (this.ad.trade_type === 'BUY') {
        if (this.balanceExceeded) {
          valid = false
          this.amountError = this.$t('FiatOrderAmountErrMsg3')
        }
      }
      if (valid) {
        this.amountError = null
      }
      this.isZeroTradeLimits()
      return valid
    },
    fiatToBch(amount, price) {
      return Number((amount / price).toFixed(8))
    },
    bchToFiat(amount, price) {
      return Number((amount * price).toFixed(2))
    },
    formatDecimals(type = 'fiat', value) {
      if (type === 'fiat') return Number(Number(value).toFixed(2))
      if (type === 'bch') return Number(Number(value).toFixed(8))
    },
    isZeroTradeLimits () {
      return this.tradeFloor === 0 || this.tradeCeiling === 0
    },
    resetInput () {
      if (this.amount !== '' && !isNaN(this.amount)) return
      if (this.byFiat) {
        this.amount = parseFloat(this.ad.trade_floor)
      } else {
        this.amount = parseFloat(this.ad.trade_floor) / parseFloat(this.ad.price)
      }
    },
    updateInput (max = false, min = false) {
      if (!this.isloaded) return
      let amount = this.amount

      let tradeFloor = Number(this.ad.trade_floor)
      const tradeCeiling = this.minTradeAmount(this.ad)
      const tradeLimitsInFiat = this.ad.trade_limits_in_fiat

      if (tradeFloor > tradeCeiling) {
        tradeFloor = tradeCeiling
      }

      if (min) {
        if (this.byFiat) {
          if (tradeLimitsInFiat) {
            amount = tradeFloor
          } else {
            amount = tradeFloor * this.ad.price
          }
        } else {
          if (tradeLimitsInFiat) {
            amount = tradeFloor / this.ad.price
          } else {
            amount = tradeFloor
          }
        }
      }
      if (max) {
        if (this.byFiat) {
          if (tradeLimitsInFiat) {
            amount = tradeCeiling
          } else {
            amount = tradeCeiling * this.ad.price
          }
        } else {
          if (tradeLimitsInFiat) {
            amount = tradeCeiling / this.ad.price
          } else {
            amount = tradeCeiling
          }
        }
      }
      if (!min && !max) {
        const price = parseFloat(this.ad.price)
        if (this.byFiat) {
          amount = amount * price
        } else {
          amount = amount / price
        }
      }

      amount = this.byFiat ? this.roundOffToFloor(amount, 100) : amount.toFixed(8)

      const amountInFiat = this.byFiat ? amount : Number((amount * this.ad?.price).toFixed(2))
      const amountInBch = this.byFiat ? Number((amount / this.ad?.price).toFixed(8)) : amount
      let amountLessThanMin = false
      let amountGreaterThanMax = false
      if (tradeLimitsInFiat) {
        amountLessThanMin = amountInFiat < tradeFloor
        amountGreaterThanMax = amountInFiat > tradeCeiling
      } else {
        amountLessThanMin = amountInBch < tradeFloor
        amountGreaterThanMax = amountInBch > tradeCeiling
      }

      const tradeFloorInFiat = tradeLimitsInFiat ? tradeFloor : Number((tradeFloor * this.ad.price).toFixed(2))
      const tradeFloorInBch = !tradeLimitsInFiat ? tradeFloor : Number((tradeFloor / this.ad.price).toFixed(8))
      const tradeCeilInFiat = tradeLimitsInFiat ? tradeCeiling : Number((tradeCeiling * this.ad.price).toFixed(2))
      const tradeCeilInBch = !tradeLimitsInFiat ? tradeCeiling : Number((tradeCeiling / this.ad.price).toFixed(8))

      if (amountLessThanMin) {
        amount = this.byFiat ? tradeFloorInFiat : tradeFloorInBch
      } else if (amountGreaterThanMax) {
        amount = this.byFiat ? tradeCeilInFiat : tradeCeilInBch
      }
      this.amount = Number(amount)
    },
    roundOffToFloor (amount, decimals) {
      return Math.floor(amount * decimals) / decimals
    },
    tradeLimitsCurrency (ad) {
      return (ad.trade_limits_in_fiat ? ad.fiat_currency.symbol : ad.crypto_currency.symbol)
    },
    minTradeAmount (ad) {
      let tradeAmount = parseFloat(ad.trade_amount)
      let tradeCeiling = parseFloat(ad.trade_ceiling)
      if (ad.trade_limits_in_fiat) {
        // if trade_limits in fiat and trade_amount in BCH
        // convert trade_amount to fiat
        if (!ad.trade_amount_in_fiat) {
          tradeAmount = tradeAmount * ad.price
        }
        tradeCeiling = Math.min.apply(null, [tradeCeiling, tradeAmount])
      } else {
        // If trade_limits in BCH and trade_amount in fiat:
        // convert trade amount to BCH
        if (ad.trade_amount_in_fiat) {
          tradeAmount = tradeAmount / ad.price
        }
        tradeCeiling = Math.min.apply(null, [tradeCeiling, tradeAmount])
      }
      return Math.min.apply(null, [tradeAmount, tradeCeiling])
    },
    getTradeAmount () {
      if (!this.byFiat) {
        // convert bch to satoshi
        return bchToSatoshi(parseFloat(this.amount))
      } else {
        // convert fiat to bch then satoshi
        return bchToSatoshi(fiatToBch(this.amount, this.ad.price))
      }
    },
    onBack () {
      this.$emit('back')
    },
    onOrderCanceled () {
      this.$emit('orderCanceled')
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
    setupWebSocket () {
      // Subscribe to market price updates
      this.closeWebSocketConnection()
      this.websockets.marketPrice = new WebSocketManager()
      this.websockets.marketPrice.setWebSocketUrl(`${getBackendWsUrl()}market-price/${this.ad.fiat_currency.symbol}/`)
      this.websockets.marketPrice.subscribeToMessages((message) => {
        const price = parseFloat(message.price)
        if (price) {
          this.marketPrice = price.toFixed(2)
          this.fetchAd()
        }
      })
      // Subscribe to ad updates
      this.websockets.ad = new WebSocketManager()
      this.websockets.ad.setWebSocketUrl(
        `${getBackendWsUrl()}ad/${this.ad.id}/`
      )
      this.websockets.ad.subscribeToMessages((message) => {
        // Refresh the ad data
        if (message === 'AD_UPDATED') this.fetchAd()
      })
    },
    handleRequestError (error) {
      console.error(error?.response || error)
      if (error.code === 'ECONNABORTED') {
        // Request timeout
        this.showErrorDialog('Request timed out. Please try again later.')
      } else if (!error.response) {
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
            console.log(`Error: ${error.response.status}. ${error.response.statusText}`)
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
  .sm-font-size {
    font-size: small;
  }
  .md-font-size {
    font-size: medium;
  }
  .lg-font-size {
    font-size: large;
  }
  .buy-color {
    color: rgb(60, 100, 246);
  }
  .sell-color {
    color: #ed5f59;
  }
  .subtext {
    opacity: .5;
  }
  .info-box {
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
  .info-box-light {
    background-color: #c4ffff; /* Light yellow background */
    border: 1px solid #2dd5fb; /* Border color */
  }
  .info-box-dark {
    background-color: #333; /* Dark mode background color */
    color: #fff; /* Text color for dark mode */
    border: 1px solid #2dd5fb; /* Border color */
  }
</style>
