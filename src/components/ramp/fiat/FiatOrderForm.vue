<template>
  <div
    v-if="state === 'initial'"
    class="q-mx-md q-mx-none text-bow"
    :class="getDarkModeClass(darkMode)"
    :style="`height: ${minHeight}px;`">
    <!-- Form Body -->
    <div v-if="isloaded">
      <div
        class="q-mx-lg q-py-xs text-h5 text-center text-weight-bold lg-font-size">
        <!-- :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'" -->
        {{ ad.trade_type === 'SELL' ? 'BUY' : 'SELL'}} BY FIAT
      </div>
      <div class="q-mx-lg q-px-xs q-mb-sm">
        <TradeInfoCard
          :order="order"
          :ad="ad"
          type="ad"
          @view-peer="onViewPeer"
          @view-reviews="showReviews=true"/>
      </div>
      <q-scroll-area :style="`height: ${minHeight - 195}px`" style="overflow-y:auto;">
        <div class="q-mx-md">
          <!-- Ad Info -->
          <div class="q-pt-sm sm-font-size pt-label" :class="getDarkModeClass(darkMode)">
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Price Type</span>
              <span class="text-nowrap q-ml-xs">
                {{ ad.price_type }}
              </span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Min Trade Limit</span>
              <span class="text-nowrap q-ml-xs">
                {{ parseFloat(ad.trade_floor) }} {{ ad?.crypto_currency?.symbol }}
              </span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Max Trade Limit</span>
              <span class="text-nowrap q-ml-xs">
                {{ parseFloat(ad.trade_amount) }} {{ ad?.crypto_currency?.symbol }}
              </span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Appealable after</span>
              <span class="text-nowrap q-ml-xs">{{ appealCooldown.label }}</span>
            </div>
          </div>

          <!-- Input -->
          <div class="q-mt-md q-mx-md" v-if="!isOwner">
            <!-- <div class="xs-font-size subtext q-pb-xs q-pl-sm">Amount</div> -->
            <q-input
              class="q-pb-xs"
              filled
              dense
              label="Amount"
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
              <div class="col text-left text-weight-bold subtext sm-font-size q-pl-sm">
                = {{ formattedCurrency(equivalentAmount) }} {{ !byFiat ? ad?.fiat_currency?.symbol : 'BCH' }}
              </div>
              <div class="justify-end q-gutter-sm q-pr-sm">
                <q-btn
                  class="sm-font-size button button-text-primary"
                  padding="none"
                  flat
                  dense
                  :class="getDarkModeClass(darkMode)"
                  label="MIN"
                  @click="updateInput(max=false, min=true)"/>
                <q-btn
                  class="sm-font-size button button-text-primary"
                  padding="none"
                  flat
                  :class="getDarkModeClass(darkMode)"
                  label="MAX"
                  @click="updateInput(max=true, min=false)"/>
              </div>
            </div>
            <div class="q-pl-sm">
              <q-btn
                class="sm-font-size button button-text-primary"
                padding="none"
                flat
                no-caps
                :class="getDarkModeClass(darkMode)"
                @click="byFiat = !byFiat">
                Set amount in {{ byFiat ? 'BCH' : ad?.fiat_currency?.symbol }}
              </q-btn>
            </div>
            <div v-if="ad.trade_type === 'BUY'">
              <q-separator :dark="darkMode" class="q-mt-sm"/>
              <div class="row justify-between no-wrap q-mx-lg text-weight-bold sm-font-size subtext q-pt-sm">
                <span>Balance</span>
                <span class="text-nowrap q-ml-xs">
                  {{ bchBalance }} BCH
                </span>
              </div>
            </div>
          </div>

          <!-- create order btn -->
          <div class="row q-mx-lg q-py-md" v-if="!isOwner">
            <q-btn
              :disabled="!isValidInputAmount(amount)"
              rounded
              no-caps
              :label="ad.trade_type === 'SELL' ? 'BUY' : 'SELL'"
              :color="ad.trade_type === 'SELL' ? 'blue-6' : 'red-6'"
              class="q-space"
              @click="submit()">
            </q-btn>
          </div>

          <!-- edit ad button: For ad owners only -->
          <div class="row q-mx-lg q-py-md" v-if="isOwner">
            <q-btn
              rounded
              no-caps
              label="Edit Ad"
              :color="ad.trade_type === 'SELL' ? 'blue-6' : 'red-6'"
              class="q-space"
              @click="() => {
                state = 'edit-ad'
                $emit('updatePageName', 'ad-form-1')
                }">
            </q-btn>
          </div>
        </div>
      </q-scroll-area>
    </div>
    <!-- Progress Loader -->
    <div v-else>
      <div class="row justify-center q-py-lg" style="margin-top: 50px">
        <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
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
      :type="'General'"
      :ad-payment-method="ad.payment_methods"
      v-on:back="state = 'initial'"
      v-on:submit="recievePaymentMethods"
    />
  </div>
  <!-- Process Order -->
  <div v-if="state === 'order-process'">
    <FiatProcessOrder :order-data="order" @back="onBack"/>
  </div>
  <!-- Edit Ad -->
  <div v-if="state === 'edit-ad'">
    <FiatAdsForm
      ref="fiatAdsForm"
      @back="onBackEditAds()"
      :adsState="'edit'"
      :transactionType="ad.trade_type"
      :selectedAdId="ad.id"
      @submit="onSubmitEditAds()"
      @update-page-name="(val) => {
        $emit('updatePageName', val)
      }"
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
</template>
<script>
import ProgressLoader from '../../ProgressLoader.vue'
import AddPaymentMethods from './AddPaymentMethods.vue'
import FiatAdsForm from './FiatAdsForm.vue'
import FiatProcessOrder from './FiatProcessOrder.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'
import TradeInfoCard from './TradeInfoCard.vue'
import CustomKeyboard from 'src/pages/transaction/dialog/CustomKeyboard.vue'
import UserProfileDialog from './dialogs/UserProfileDialog.vue'
import { formatCurrency, getAppealCooldown } from 'src/wallet/ramp'
import { bus } from 'src/wallet/event-bus.js'
import { createChatSession, addChatMembers } from 'src/wallet/ramp/chat'
import { backend } from 'src/wallet/ramp/backend'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      isloaded: false,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (90 + 120) : this.$q.screen.height - (70 + 100),
      customKeyboardState: 'dismiss',
      readonlyState: false,
      ad: null,
      state: 'initial',
      byFiat: false,
      amount: 0,
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
      }
    }
  },
  props: {
    adId: Number
  },
  components: {
    CustomKeyboard,
    ProgressLoader,
    AddPaymentMethods,
    FiatAdsForm,
    FiatProcessOrder,
    MiscDialogs,
    TradeInfoCard,
    UserProfileDialog
  },
  emits: ['back', 'orderCanceled', 'updatePageName'],
  computed: {
    appealCooldown () {
      return getAppealCooldown(this.ad?.appeal_cooldown)
    },
    equivalentAmount () {
      let amount = this.amount
      if (amount === '' || isNaN(amount)) return 0
      if (!this.byFiat) {
        amount = Number(parseFloat(amount) * parseFloat(this.ad.price))
      } else {
        amount = Number(parseFloat(amount) / parseFloat(this.ad.price))
      }
      return amount
    },
    bchBalance () {
      return this.$store.getters['assets/getAssets'][0].balance
    },
    isOwner () {
      return this.ad.is_owned
    }
  },
  watch: {
    byFiat () {
      this.updateInput()
    }
  },
  async mounted () {
    const vm = this
    await vm.fetchAd()
    if (this.ad) {
      this.amount = parseFloat(this.ad.trade_floor)
    }
    vm.isloaded = true
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    setAmount (key) {
      let receiveAmount, finalAmount, tempAmountFormatted = ''

      receiveAmount = this.amount

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
    onBackEditAds () {
      this.state = 'initial'
      bus.emit('show-menu', 'store')
    },
    onSubmitEditAds () {
      this.$emit('back')
      this.$emit('updatePageName', 'main')
      bus.emit('show-menu', 'store')
    },
    orderConfirm () {
      this.dialogType = 'confirmOrderCreate'
      this.openDialog = true
      this.title = 'Confirm Order?'
    },
    async fetchAd () {
      const vm = this
      try {
        const response = await backend.get(`/ramp-p2p/ad/${vm.adId}`, { authorize: true })
        vm.ad = response.data
        this.amount = this.ad.trade_floor
      } catch (error) {
        if (error.response) {
          console.error(error.response)
          if (error.response.status === 403) {
            bus.emit('session-expired')
          }
        } else {
          console.error(error)
        }
      }
    },
    async createOrder () {
      const vm = this
      const cryptoAmount = vm.getCryptoAmount()
      const body = {
        ad: vm.ad.id,
        crypto_amount: cryptoAmount.toFixed(8)
      }
      if (vm.ad.trade_type === 'BUY') {
        const temp = this.paymentMethods.map(p => p.id)
        body.payment_methods = temp
      }
      backend.post('/ramp-p2p/order/', body, { authorize: true })
        .then(response => {
          vm.order = response.data.order
          vm.state = 'order-process'
          vm.$emit('updatePageName', 'order-process')
          return vm.order.id
        })
        .then(orderId => {
          vm.fetchOrderMembers(orderId)
            .then(members => {
              vm.createGroupChat(vm.order.id, members, vm.order.created_at)
            })
        })
        .catch(error => {
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            console.error(error)
          }
        })
    },
    fetchOrderMembers (orderId) {
      return new Promise((resolve, reject) => {
        backend.get(`/ramp-p2p/order/${orderId}/members`, { authorize: true })
          .then(response => {
            resolve(response.data)
          })
          .catch(error => {
            if (error.response) {
              console.error(error.response)
            } else {
              console.error(error)
            }
            reject(error)
          })
      })
    },
    createGroupChat (orderId, members, createdAt) {
      const chatMembers = members.map(({ chat_identity_id }) => ({ chat_identity_id, is_admin: true }))
      createChatSession(orderId, createdAt)
        .then(chatRef => { addChatMembers(chatRef, chatMembers) })
        .catch(console.error)
    },
    formattedCurrency (value, currency = null) {
      if (currency) {
        return formatCurrency(value, currency)
      } else {
        return formatCurrency(value)
      }
    },
    isValidInputAmount (value) {
      if (this.byFiat) {
        value = this.equivalentAmount
      }
      if (value === undefined) return false
      const parsedValue = parseFloat(value)
      const tradeFloor = parseFloat(this.ad.trade_floor)
      const tradeCeiling = parseFloat(this.ad.trade_amount)
      if (isNaN(parsedValue) || parsedValue < tradeFloor || parsedValue > tradeCeiling) {
        return false
      }
      return true
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
      let amount = this.amount
      if (min) amount = parseFloat(this.ad.trade_floor)
      if (max) amount = parseFloat(this.ad.trade_amount)
      if (!this.byFiat) {
        if (!max && !min) amount = Number(parseFloat(amount) / parseFloat(this.ad.price))
      } else {
        amount = Number(amount * parseFloat(this.ad.price))
      }
      this.amount = amount
    },
    getCryptoAmount () {
      if (!this.byFiat) {
        return parseFloat(this.amount)
      } else {
        return parseFloat(this.amount) / parseFloat(this.ad.price)
      }
    },
    onBack () {
      this.$emit('back')
    },
    onOrderCanceled () {
      this.$emit('orderCanceled')
    },
    recievePaymentMethods (item) {
      this.paymentMethods = item
      this.createOrder()
    },
    recieveDialogsInfo (item) {
      this.createOrder()
      this.title = ''
    },
    submit () {
      const vm = this
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
</style>
