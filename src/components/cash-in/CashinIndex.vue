<template>
  <q-dialog ref="dialog" full-width position="bottom" transition-show="slide-up">
    <q-card class="bottom-card br-15 pt-card-2 text-bow q-pb-lg" :class="getDarkModeClass(darkMode)">
      <div v-if="loading || loggingIn">
        <div class="q-mt-lg q-pt-md row text-center justify-center q-mx-md text-blue" style="font-size: 21px;">
          Cash In
        </div>
        <StandBy style="margin-top: 20px;" :title="title" :subtitle="subtitle" spinner/>
      </div>
      <div v-else>
        <div v-if="cashinEnabled === false || isOutdated">
          <div class="q-mt-lg q-pt-sm row text-center justify-center q-mx-md text-blue" style="font-size: 21px;">
            Cash In
          </div>
          <div v-if="cashinEnabled === false" class="row text-center q-mx-lg q-px-lg" style="opacity: .7; font-size: medium; margin-top: 15%;">
            <p>This feature is temporarily disabled. We appreciate your patience as we make improvements.</p>
            <p>Your ongoing cash in orders are accessible in Apps > P2P Exchange > Orders.</p>
          </div>
          <div v-else-if="isOutdated" class="row text-center q-mx-lg q-px-lg" style="opacity: .7; font-size: medium; margin-top: 25%;">
            <p>To continue using this feature, please update your app to the latest version. Thank you!</p>
          </div>
          <div class="text-center row q-mx-lg" style="position: fixed; bottom: 40px; left: 0; right: 0; margin: auto;">
            <div class="col" style="opacity: .55;">
              <div class="row justify-center text-bow" style="font-size: 15px;">Powered by</div>
              <div class="row justify-center text-weight-bold" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">P2P Exchange</div>
            </div>
          </div>
        </div>
        <div v-if="cashinEnabled !== false && !isOutdated">
          <!-- Title -->
          <div class="q-pt-sm">
            <q-card-section class="row items-center q-pb-none">
              <q-btn flat icon="arrow_back" color="blue-6" round dense @click="previousView()" />
              <q-space />
              <!-- Order List Icon -->
              <q-btn size="18px" padding="none none" icon="sym_o_receipt_long" color="blue-6" flat dense v-if="showOrderListButton" @click="state = 'order-list'">
                <q-badge v-if="hasCashinAlert" align-left floating rounded color="red"/>
              </q-btn>
            </q-card-section>
          </div>

          <!-- Body -->
          <div v-if="!loading && !loggingIn">
            <div v-if="state === 'pending-order'" class="q-mt-lg q-pt-lg">
              <StandBy :title="title" :subtitle="subtitle" buttonLabel="View pending order" button @btn-click="onViewPendingOrder"/>
            </div>

            <!-- Register -->
            <Register v-if="state === 'register'" @login="onSubmitOrder(orderPayload, false)" :key="registerKey"/>

            <div v-if="state === 'cashin-order'">
              <!-- Payment Type -->
              <SelectPaymentType
                v-if="step === 1"
                :key="selectPaymentTypeKey"
                :options="selectPaymentTypeOpts"
                :fiat="selectedCurrency"
                :fiat-option="fiatCurrencies"
                @select-currency="setCurrency"
                @select-payment="setPaymentType"
                @update-fiat="updateSelectedCurrency"
                />
              <!-- Select Amount -->
              <SelectAmount
                v-if="step === 2"
                :key="selectAmountKey"
                :payment-type="selectedPaymentType"
                :adOptions="adOptions"
                :currency="selectedCurrency"
                :fiat-presets="fiatPresets"
                @select-amount="onSetAmount"
                @update-presets="onUpdatePresets"
                @submit-order="onSubmitOrder"
                />
              <!-- Order Page -->
              <CashinOrder
                v-if="step === 3"
                :key="orderKey"
                :order-id="orderId"
                @confirm-payment="sendConfirmPayment"
                @new-order="refreshPage"
                @refetch-cashin-alert="checkCashinAlert"/>
            </div>

            <!-- Order List -->
            <CashinOrderList v-if="state === 'order-list'" :key="orderListKey" @open-order="openOrder"/>

            <!-- Network Error -->
            <NetworkError v-if="state === 'network-error'" @retry="refreshPage"/>
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import StandBy from './CashinStandBy.vue'
import SelectPaymentType from './SelectPaymentType.vue'
import CashinOrderList from './CashinOrderList.vue'
import CashinOrder from './CashinOrder.vue'
import SelectAmount from './SelectAmount.vue'
import Register from './CashinRegister.vue'
import NetworkError from './CashinNetworkError.vue'
import { backend, updatePubkeyAndAddress } from 'src/exchange/backend'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getAuthToken, saveAuthToken, deleteAuthToken } from 'src/exchange/auth'
import { loadChatIdentity } from 'src/exchange/chat'
import { loadRampWallet, wallet } from 'src/exchange/wallet'
import { bus } from 'src/wallet/event-bus'
import packageInfo from '../../../package.json'

export default {
  components: {
    StandBy,
    SelectPaymentType,
    SelectAmount,
    CashinOrder,
    Register,
    CashinOrderList,
    NetworkError
  },
  props: {
    fiatCurrencies: Array
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      step: 0,
      state: 'cashin-order', // order-list, register
      dialog: false,

      cashinAds: [],
      selectPaymentTypeOpts: [],
      adOptions: {},

      selectedPaymentType: null,
      amount: null,
      amountPresets: [0.02, 0.04, 0.1, 0.25, 0.5, 1],
      fiatPresets: [],
      selectedCurrency: null,
      cashinAdsParams: {
        currency: null,
        payment_type: null,
        by_fiat: true
      },
      register: false,
      openorderList: false,
      loading: true,
      loggingIn: false,
      orderId: null,
      orderPayload: null,
      openOrderPage: false,
      registerKey: 0,
      selectPaymentTypeKey: 0,
      selectAmountKey: 0,
      orderKey: 0,
      orderListKey: 0,
      hasCashinAlert: false,
      pendingOrders: [],
      isOutdated: false
    }
  },
  watch: {
    state (value) {
      this.checkCashinAlert()
    }
  },
  computed: {
    cashinEnabled () {
      return this.$store.getters['ramp/featureToggles']?.CashIn
    },
    title () {
      let text = this.loggingIn ? 'Authenticating' : 'Processing'
      if (this.state === 'pending-order') text = 'Pending Order'
      return text
    },
    subtitle () {
      let text = 'Please wait a moment'
      if (this.state === 'pending-order') text = 'Please wait for pending cash-in orders to be escrowed before creating a new order'
      return text
    },
    showOrderListButton () {
      return !this.loading && this.state !== 'order-list'
    }
  },
  created () {
    bus.on('network-error', this.dislayNetworkError)
    bus.on('session-expired', this.handleSessionEvent)
    bus.on('cashin-alert', this.onCashinAlert)
  },
  async mounted () {
    await loadRampWallet()
    this.loaddata()
  },
  methods: {
    getDarkModeClass,
    async checkVersion () {
      const appVer = packageInfo.version
      let platform = null
      let outdated = false

      if (this.$q.platform.is.mobile) platform = 'android'
      if (this.$q.platform.is.ios) platform = 'ios'
      if (this.$q.platform.is.bex) platform = 'web'

      if (platform) {
        // fetching p2p exchange version check
        await backend.get(`ramp-p2p/version/check/${platform}/`)
          .then(response => {
            if (!('error' in response.data)) {
              const latestVer = response.data?.latest_version
              const minReqVer = response.data?.min_required_version

              if (appVer !== latestVer) {
                outdated = this.checkOutdatedVersion(appVer, minReqVer)
              }
            }
          })
      }
      return outdated
    },
    checkOutdatedVersion (appVer, minReqVer) {
      let isOutdated = false
      const appV = appVer.split('.').map(Number)
      const minV = minReqVer.split('.').map(Number)

      for (let i = 0; i < Math.max(appV.length, minV.length); i++) {
        const v1 = appV[i] || 0
        const v2 = minV[i] || 0

        if (v1 < v2) {
          isOutdated = true
          break
        } else if (v1 > v2) {
          isOutdated = false
          break
        } else {
          isOutdated = false
        }
      }
      return isOutdated
    },
    onViewPendingOrder () {
      this.openOrder(this.pendingOrders[0])
    },
    onCashinAlert (val) {
      this.hasCashinAlert = val
    },
    setFiatCurrency () {
      const temp = this.$store.getters['market/selectedCurrency']
      this.selectedCurrency = this.fiatCurrencies.filter(currency => {
        return temp.symbol === currency.symbol
      })[0]
    },
    async loaddata () {
      this.loading = true
      this.setFiatCurrency()
      this.cashinAdsParams.currency = this.selectedCurrency?.symbol
      this.cashinAdsParams.wallet_hash = wallet.walletHash
      await this.fetchCashinPayments()
      await this.checkCashinAlert()
      await this.fetchPresets()
      await this.fetchFeatureToggles()
      this.isOutdated = await this.checkVersion()
      this.step++
      this.loading = false
    },
    async fetchFeatureToggles () {
      await this.$store.dispatch('ramp/fetchFeatureToggles')
    },
    async checkCashinAlert () {
      backend.get('/ramp-p2p/order/cash-in/alerts/', { params: { wallet_hash: wallet.walletHash } })
        .then(response => {
          this.hasCashinAlert = response.data?.has_cashin_alerts
          bus.emit('cashin-alert', this.hasCashinAlert)
        })
        .catch(error => {
          console.error(error.response || error)
        })
    },
    async fetchUser () {
      const vm = this
      try {
        const { data: user } = await backend.get('/auth/')
        this.user = user
        let login = false
        if (vm.user.is_authenticated) {
          const token = await getAuthToken()
          if (token) {
            vm.$emit('loggedIn', vm.user.is_arbiter ? 'arbiter' : 'peer')
            vm.$store.commit('ramp/updateUser', user)
          } else {
            login = true
          }
        } else {
          deleteAuthToken()
          login = true
        }

        if (login) {
          await vm.login()
          const usertype = user.is_arbiter ? 'arbiter' : 'peer'
          const params = {
            name: user.name,
            chat_identity_id: user.chat_identity_id
          }
          await loadChatIdentity(usertype, params)
          await updatePubkeyAndAddress(user)
        }
      } catch (error) {
        vm.loading = false
        console.error(error.response || error)
        if (error.response?.status === 404) {
          vm.state = 'register'
          vm.register = true
        } else {
          this.dislayNetworkError()
        }
      }
    },
    async login () {
      const vm = this
      try {
        console.log('Logging in to P2P Exchange')
        vm.loggingIn = true
        const { data: { otp } } = await backend(`/auth/otp/${vm.user.is_arbiter ? 'arbiter' : 'peer'}`)
        const keypair = wallet.keypair()
        const signature = wallet.signMessage(keypair.privateKey, otp)
        const body = {
          wallet_hash: wallet.walletHash,
          signature: signature,
          public_key: keypair.publicKey
        }
        const loginResponse = await backend.post(`/auth/login/${vm.user.is_arbiter ? 'arbiter' : 'peer'}`, body)
        if (vm.user) {
          saveAuthToken(loginResponse.data.token)
          vm.$store.commit('ramp/updateUser', vm.user)
        }
      } catch (error) {
        console.error(error.response || error)
        // this.state = 'network-error' // !error.response
        this.dislayNetworkError()
      }
      vm.loggingIn = false
    },
    async setCurrency (currency) {
      this.selectedCurrency = currency
      this.cashinAdsParams.currency = this.selectedCurrency.symbol

      // reset data
      this.adOptions = {}
      this.cashinAds = []
      this.selectPaymentTypeOpts = []
      await this.fetchCashinPayments()
      await this.fetchPresets()
    },
    setPaymentType (paymentType) {
      this.selectedPaymentType = paymentType
      this.cashinAdsParams.payment_type = this.selectedPaymentType?.id
      this.fetchPresets()
      if (this.fiatPresets.length === 0) {
        this.cashinAdsParams.by_fiat = false
      } else {
        this.cashinAdsParams.by_fiat = true
      }
      this.fetchCashinAds()
      this.step++
    },
    onSetAmount (amount) {
      this.amount = amount
    },
    async onSubmitOrder (payload, nextStep = true) {
      // 1. login user (register if peer profile not existing)
      this.loading = true
      this.orderPayload = payload
      this.state = 'cashin-order'
      await this.fetchUser()
      // 2. create order
      await this.createOrder()
      this.loading = false
      if (nextStep) this.step++
    },
    updateSelectedCurrency (currency) {
      this.selectedCurrency = currency
      this.fetchCashinPayments()
    },
    onUpdatePresets (byFiat) {
      this.fetchPresets()
      this.cashinAdsParams.by_fiat = byFiat
      this.fetchCashinAds()
    },
    async fetchPresets () {
      await backend('ramp-p2p/cash-in/presets/', { params: { currency: this.selectedCurrency.symbol } })
        .then(response => {
          this.fiatPresets = response.data
        })
        .catch(error => {
          console.error(error.response || error)
          if (error.response) {
            if (error.response?.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            this.dislayNetworkError()
          }
        })
    },
    async fetchCashinAds () {
      const apiUrl = '/ramp-p2p/cash-in/ad/'
      await backend.get(apiUrl, { params: this.cashinAdsParams })
        .then(response => {
          this.adOptions = response.data
        })
        .catch(error => {
          console.error(error.response || error)
          if (error.response) {
            if (error.response?.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            this.dislayNetworkError()
          }
        })
    },
    async fetchCashinPayments (url) {
      const apiUrl = url || '/ramp-p2p/cash-in/ad/payment-types/'
      await backend.get(apiUrl, { params: this.cashinAdsParams })
        .then(response => {
          this.selectPaymentTypeOpts = response.data
        })
        .catch(error => {
          console.error(error.response || error)
          if (error.response) {
            if (error.response?.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            this.dislayNetworkError()
          }
        })
    },
    async createOrder () {
      if (!this.orderPayload) return
      const vm = this
      try {
        const response = await backend.post('/ramp-p2p/order/', this.orderPayload, { authorize: true })
        vm.orderId = response.data.order?.id
      } catch (error) {
        console.error(error.response || error)
        if (error.response) {
          if (error.response.status === 403) {
            bus.emit('session-expired')
          }
          if (error.response.status === 400) {
            vm.pendingOrders = error.response.data?.error?.pending_orders
            if (vm.pendingOrders > 0) {
              vm.state = 'pending-order'
            }
          }
        } else {
          console.error(error)
          this.dislayNetworkError()
        }
      }
    },
    async sendConfirmPayment (retries = 1) {
      const vm = this
      await backend.post(`/ramp-p2p/order/${vm.orderId}/confirm-payment/buyer/`, null, { authorize: true })
        .catch(async (error) => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403 && retries > 0) {
              this.loading = true
              await this.fetchUser()
              this.sendConfirmPayment(retries - 1)
              this.loading = false
            }
          } else {
            this.dislayNetworkError()
          }
        })
    },
    previousView () {
      const vm = this

      switch (vm.state) {
        case 'register':
          vm.step = 2
          vm.state = 'cashin-order'
          vm.register = false
          break
        case 'order-list':
          if (vm.register) {
            vm.state = 'register'
          } else {
            vm.state = 'cashin-order'
          }
          break
        case 'cashin-order':
          if (this.step === 1) {
            vm.$refs.dialog.hide()
          } else if (this.step === 3 && this.openOrderPage) {
            this.handleSessionEvent()
            this.state = 'order-list'
            this.openOrderPage = false
            this.step = 1
          } else {
            if (this.step === 2) {
              this.cashinAdsParams.payment_type = null
              this.fetchCashinAds()
            }
            this.step--
          }
          break
        default:
          vm.$refs.dialog.hide()
          break
      }
    },
    async openOrder (orderId) {
      this.loading = true
      await this.fetchUser()
      this.loading = false
      this.orderId = orderId
      this.state = 'cashin-order'
      this.step = 3
      this.openOrderPage = true
    },
    dislayNetworkError () {
      this.state = 'network-error'
    },
    async refreshPage () {
      this.resetData()
      await this.loaddata()
      this.reloadChildComponents()
    },
    reloadChildComponents () {
      this.registerKey++
      this.selectPaymentTypeKey++
      this.selectAmountKey++
      this.orderKey++
      this.orderListKey++
    },
    resetData () {
      this.step = 0
      this.state = 'cashin-order'
      this.selectedCurrency = this.$store.getters['market/selectedCurrency']
      this.cashinAdsParams.payment_type = null
      this.cashinAdsParams.currency = null
    },
    handleSessionEvent () {
      this.fetchUser()
    }
  }
}
</script>
<style lang="scss" scoped>
#exchange-logo {
  height: 30px;
  width: 30px;
  border-radius: 50%;
  position: absolute;
  top: 18px;
  left: 20px;
  z-index: 1;
  background-color: #0AC18E;
  padding: 5px;
  }
#label {
  position: absolute;
  left: 35px;
  z-index: 1;
  margin-top: 15px;
  font-size: 18px;
}
.body {
  margin-top: 50px;
}
</style>
