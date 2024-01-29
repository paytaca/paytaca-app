<template>
  <q-card
   class="br-15 q-pt-sm q-mx-md q-mx-none pt-card text-bow"
   :class="getDarkModeClass(darkMode)"
   :style="`height: ${minHeight}px;`">
   <!-- Form Body -->
    <div v-if="state === 'initial'">
      <div v-if="isloaded">
        <div>
          <q-btn
            flat
            padding="md md 0 md"
            icon="arrow_back"
            class="button button-text-primary"
            :class="getDarkModeClass(darkMode)"
            @click="$emit('back')"
          />
        </div>
        <div
          class="q-mx-lg q-py-xs text-h5 text-center text-weight-bold lg-font-size"
          :class="ad.trade_type === 'SELL' ? 'buy-color' : 'sell-color'"
          :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'"
        >
          {{ ad.trade_type === 'SELL' ? 'BUY' : 'SELL'}} BY FIAT
        </div>
        <q-scroll-area :style="`height: ${minHeight - 130}px`" style="overflow-y:auto;">
          <div class="q-mx-md">
            <!-- Ad Info -->
            <div class="q-pt-md sm-font-size pt-label" :class="getDarkModeClass(darkMode)">
              <div class="row justify-between no-wrap q-mx-lg">
                <span>Price Type</span>
                <span class="text-nowrap q-ml-xs">
                  {{ ad.price_type }}
                </span>
              </div>
              <div class="row justify-between no-wrap q-mx-lg">
                <span>Fiat Price</span>
                <span class="text-nowrap q-ml-xs">
                  {{ formattedCurrency(ad.price, ad.fiat_currency.symbol) }}
                </span>
              </div>
              <div class="row justify-between no-wrap q-mx-lg">
                <span>Min Trade Limit</span>
                <span class="text-nowrap q-ml-xs">
                  {{ parseFloat(ad.trade_floor) }} {{ ad.crypto_currency.symbol }}
                </span>
              </div>
              <div class="row justify-between no-wrap q-mx-lg">
                <span>Max Trade Limit</span>
                <span class="text-nowrap q-ml-xs">
                  {{ parseFloat(ad.trade_amount) }} {{ ad.crypto_currency.symbol }}
                </span>
              </div>
              <div class="row justify-between no-wrap q-mx-lg">
                <span>Time Limit</span>
                <span class="text-nowrap q-ml-xs">{{ paymentTimeLimit.label }}</span>
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
                @blur="resetInput">
                <template v-slot:append>
                  <span class="text-weight-bold sm-font-size">{{ byFiat ? ad.fiat_currency.symbol : 'BCH' }}</span>
                </template>
              </q-input>
              <div class="row justify-between">
                <div class="col text-left text-weight-bold subtext sm-font-size q-pl-sm">
                  = {{ formattedCurrency(equivalentAmount) }} {{ !byFiat ? ad.fiat_currency.symbol : 'BCH' }}
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
                  Set amount in {{ byFiat ? 'BCH' : ad.fiat_currency.symbol }}
                </q-btn>
              </div>
              <div v-if="ad.trade_type === 'BUY'">
                <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/>
                <div class="row justify-between no-wrap q-mx-lg text-weight-bold sm-font-size subtext q-pt-sm">
                  <span>Balance:</span>
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
                @click="state = 'edit-ad'">
              </q-btn>
            </div>

            <div class="text-center q-pt-sm">
              <!-- <div class="text-weight-bold" style="font-size: medium;">Average Rating</div>
              <div class="row justify-center q-py-xs q-pb-sm">
                <q-rating
                  readonly
                  :model-value="feedback.rating"
                  :v-model="feedback.rating"
                  size="1.5em"
                  color="yellow-9"
                  icon="star"
                />
                <span class="q-mx-sm" style="font-size: medium;">({{ ad.owner.rating }})</span>
              </div> -->
              <div
                class="text-center button button-text-primary md-font-size"
                :class="getDarkModeClass(darkMode)"
                @click="openReviews = true">
                <u>See all Reviews</u>
              </div>
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
    <!-- Dialogs -->
    <div v-if="openDialog">
      <MiscDialogs
        :type="'genericDialog'"
        :title="title"
        v-on:back="openDialog = false"
        v-on:submit="recieveDialogsInfo"
      />
    </div>
    <div v-if="openReviews">
      <FeedbackDialog
        :openReviews="openReviews"
        :adID="ad.id"
        @back="openReviews = false"
      />
    </div>
    <!-- Edit Ad -->
    <div v-if="state === 'edit-ad'">
      <FiatAdsForm
        @back="state = 'initial'"
        :adsState="'edit'"
        :transactionType="ad.trade_type"
        :selectedAdId="ad.id"
        @submit="$emit('back')"
      />
    </div>
    <!-- Process Order -->
    <div v-if="state === 'order-process'">
      <FiatProcessOrder
        :order-data="order"
        @back="onBack"
      />
      <!-- <FiatStoreBuyProcess
        :order-data="order"
        @back="onBack"
        @canceled="onOrderCanceled"
      /> -->
    </div>
   </q-card>
</template>
<script>
import ProgressLoader from '../../ProgressLoader.vue'
import AddPaymentMethods from './AddPaymentMethods.vue'
import FiatAdsForm from './FiatAdsForm.vue'
import FeedbackDialog from './dialogs/FeedbackDialog.vue'
import FiatProcessOrder from './FiatProcessOrder.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'
import { formatCurrency, getPaymentTimeLimit } from 'src/wallet/ramp'
import { bus } from 'src/wallet/event-bus.js'
import { createChatSession, addChatMembers } from 'src/wallet/ramp/chat'
import { backend } from 'src/wallet/ramp/backend'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      authHeaders: this.$store.getters['ramp/authHeaders'],
      isloaded: false,
      // minHeight: this.$q.screen.height - this.$q.screen.height * 0.2,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (95 + 120) : this.$q.screen.height - (70 + 100),

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
    ProgressLoader,
    AddPaymentMethods,
    FiatAdsForm,
    FeedbackDialog,
    FiatProcessOrder,
    MiscDialogs
  },
  emits: ['back', 'orderCanceled'],
  computed: {
    paymentTimeLimit () {
      return getPaymentTimeLimit(this.ad.time_duration)
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
    maxAmount (tradeAmount, tradeCeiling) {
      if (parseFloat(tradeAmount) < parseFloat(tradeCeiling)) {
        return parseFloat(tradeAmount)
      } else {
        return parseFloat(tradeCeiling)
      }
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
          return vm.order.id
        })
        .then(orderId => {
          vm.fetchOrderMembers(orderId)
            .then(members => {
              vm.createGroupChat(vm.order.id, members)
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
    createGroupChat (orderId, members) {
      const chatMembers = members.map(({ chat_identity_id }) => ({ chat_identity_id, is_admin: true }))
      createChatSession(orderId)
        .then(chatRef => addChatMembers(chatRef, chatMembers))
        .catch(console.error)
    },
    // WIP
    // exponentialBackoff (fn, retries, delayDuration, ...info) {
    //   const vm = this
    //   const payload = info[0]

    //   return fn(payload)
    //     .then((data) => {
    //       if (data.data) {
    //         const chatIdentity = data.data
    //         vm.$store.commit('ramp/updateChatIdentity', chatIdentity)
    //         vm.retry = false
    //       }

    //       if (vm.retry) {
    //         console.log('retrying')
    //         if (retries > 0) {
    //           return vm.delay(delayDuration)
    //             .then(() => vm.exponentialBackoff(fn, retries - 1, delayDuration * 2, payload))
    //         } else {
    //           vm.retry = false
    //         }
    //       }
    //     })
    //     .catch(error => {
    //       console.log(error)
    //       if (retries > 0) {
    //         return vm.delay(delayDuration)
    //           .then(() => vm.exponentialBackoff(fn, retries - 1, delayDuration * 2, payload))
    //       } else {
    //         vm.retry = false
    //       }
    //     })
    // },
    // delay (duration) {
    //   return new Promise(resolve => setTimeout(resolve, duration))
    // },
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
