<template>
  <q-dialog ref="dialog" full-width position="bottom" transition-show="slide-up">
    <q-card class="cashin-card br-15 pt-card-2 text-bow q-pb-lg" :class="getDarkModeClass(darkMode)">
      <!-- Title -->
      <div class="q-pt-sm">
        <q-card-section class="row items-center q-pb-none">
          <q-btn flat icon="arrow_back" color="blue-6" round dense @click="previousView" />
          <q-space />
          <q-btn size="18px" flat icon="sym_o_receipt_long" color="blue-6" round dense v-if="showOrderListButton" @click="state = 'order-list'"/>
        </q-card-section>
      </div>

      <!-- Body -->
      <div v-if="loading" class="text-center" style="margin-top: 50px; font-size: 25px;">
        <div class="row justify-center q-mx-md">
          Processing transaction<br>Please wait
        </div>
        <q-spinner-dots class="q-pt-sm" color="blue-6" size="3em"/>
      </div>
      <div v-else>
        <!-- Register -->
        <Register v-if="state === 'register'" @login="onSubmitOrder(orderPayload, false)" />

        <div v-if="state === 'cashin-order'">
          <!-- Payment Type -->
          <SelectPaymentType
            v-if="step === 1"
            :options="paymentTypeOpts" :fiat="fiatCurrencies"
            @select-currency="setCurrency"
            @select-payment="setPaymentType" @update-fiat="updateSelectedCurrency"/>
          <!-- Select Amount -->
          <SelectAmount
            v-if="step === 2"
            :payment-type="selectedPaymentType"
            :amount-ad-count="amountAdCount"
            :currency="selectedCurrency"
            :ads="cashinAds"
            @select-amount="onSetAmount"
            @submit-order="onSubmitOrder"/>
          <!-- Order Page -->
          <Order :order-id="order.id" v-if="step === 3" @confirm-payment="sendConfirmPayment"/>
        </div>

        <!-- Order List -->
        <order-list v-if="state === 'order-list'" :wallet-hash="wallet.walletHash" @open-order="openOrder"/>

        <!-- Network Error -->
        <NetworkError v-if="state === 'network-error'"/>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import SelectPaymentType from './SelectPaymentType.vue'
import orderList from './order-list.vue'
import SelectAmount from './SelectAmount.vue'
import Register from './register-user.vue'
import Order from './order.vue'
import NetworkError from './network-error.vue'
import { backend, updatePubkeyAndAddress } from 'src/exchange/backend'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getAuthToken, saveAuthToken, deleteAuthToken } from 'src/exchange/auth'
import { loadChatIdentity } from 'src/exchange/chat/objects'
import { loadRampWallet } from 'src/exchange/wallet'

export default {
  components: {
    SelectPaymentType,
    SelectAmount,
    Order,
    Register,
    orderList,
    NetworkError
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      step: 0,
      state: 'cashin-order', // order-list, register
      dialog: false,
      paymentTypeOpts: [],
      selectedPaymentType: null,
      minLimit: null,
      maxLimit: null,
      amount: null,
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      cashinAdsParams: {
        currency: null,
        payment_type: null
      },
      cashinAds: [],
      amountAdCount: {},
      register: false,
      openorderList: false,
      loading: true,
      fiatCurrencies: null,
      order: null,
      orderPayload: null
    }
  },
  computed: {
    showOrderListButton () {
      return !this.loading && this.state !== 'order-list'
    }
  },
  mounted () {
    this.loaddata()
  },
  methods: {
    getDarkModeClass,
    async loaddata () {
      this.loading = true
      this.wallet = loadRampWallet()
      this.cashinAdsParams.currency = this.selectedCurrency?.symbol
      this.cashinAdsParams.wallet_hash = this.wallet.walletHash
      await this.fetchCashinAds()
      this.step++
      this.loading = false
    },
    async fetchUser () {
      const vm = this
      try {
        const { data: user } = await backend.get('/auth/')
        console.log('user: ', user)
        this.user = user
        const payload = {
          user_type: user.is_arbiter ? 'arbiter' : 'peer',
          chat_identity_id: user.chat_identity_id,
          name: user.name
        }
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
        }

        const chatIdentity = await loadChatIdentity(payload)
        console.log('chatIdentity:', chatIdentity)
        const resp = await updatePubkeyAndAddress(user)
        console.log('updatePubkeyAndAddress:', resp)
      } catch (error) {
        vm.loading = false
        console.error(error.response || error)
        console.log(error.response?.status)
        if (error.response?.status === 404) {
          vm.state = 'register'
        } else {
          this.state = 'network-error'
        }
        console.log('state:', vm.state)
      }
    },
    async login () {
      const vm = this
      // vm.hintMessage = null
      // vm.errorMessage = null
      try {
        vm.loggingIn = true
        const { data: { otp } } = await backend(`/auth/otp/${vm.user.is_arbiter ? 'arbiter' : 'peer'}`)
        const keypair = await vm.wallet.keypair()
        const signature = await vm.wallet.signMessage(keypair.privateKey, otp)
        const body = {
          wallet_hash: vm.wallet.walletHash,
          signature: signature,
          public_key: keypair.publicKey
        }
        const loginResponse = await backend.post(`/auth/login/${vm.user.is_arbiter ? 'arbiter' : 'peer'}`, body)
        console.log('loginResponse:', loginResponse)
        if (vm.user) {
          saveAuthToken(loginResponse.data.token)
          // const success = await vm.loadChatIdentity()
          // if (!success) return
          // vm.$emit('loggedIn', vm.user.is_arbiter ? 'arbiter' : 'peer')
          vm.$store.commit('ramp/updateUser', vm.user)
        }
      } catch (error) {
        console.error(error.response || error)
        this.state = 'network-error' // !error.response
      }
      vm.loggingIn = false
    },
    setCurrency (currency) {
      this.selectedCurrency = currency
      this.cashinAdsParams.currency = this.selectedCurrency.symbol
      console.log('cashinAdsParams:', this.cashinAdsParams)
      this.fetchCashinAds()
    },
    setPaymentType (paymentType) {
      this.selectedPaymentType = paymentType
      this.cashinAdsParams.payment_type = this.selectedPaymentType?.id
      const presets = [0.02, 0.25, 0.5, 1]
      let url = '/ramp-p2p/cashin/ad'
      if (presets?.length > 0) {
        const amounts = presets.join('&amounts=')
        url = `${url}?amounts=${amounts}`
      }
      this.fetchCashinAds(url)
      this.step++
    },
    onSetAmount (amount) {
      console.log('onSetAmount:', amount)
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
    fetchFiatCurrencies () {
      console.log('fetching currency')
      const vm = this
      backend.get('/ramp-p2p/currency/fiat', { authorize: true })
        .then(response => {
          vm.fiatCurrencies = response.data
          console.log('currency: ', vm.fiatCurrencies)
        })
        .catch(error => {
          console.error(error)
          this.state = 'network-error'
        })
    },
    updateSelectedCurrency (currency) {
      this.selectedCurrency = currency
      this.fetchCashinAds()
    },
    async fetchCashinAds (url) {
      const apiUrl = url || '/ramp-p2p/cashin/ad'
      await backend.get(apiUrl, { params: this.cashinAdsParams })
        .then(response => {
          console.log('fetchCashinAds:', response.data)
          this.cashinAds = response.data.ads
          this.paymentTypeOpts = response.data.payment_types
          this.amountAdCount = response.data.amount_ad_count
          console.log('cashinAds:', this.cashinAds)
          console.log('paymentTypeOpts:', this.paymentTypeOpts)
        })
        .catch(error => {
          console.error(error.response || error)
          if (error.response) {
            if (error.response?.status === 403) {
              // bus.emit('session-expired')
            }
          } else {
            // bus.emit('network-error')
          }
        })
    },
    async createOrder () {
      if (!this.orderPayload) return
      const vm = this
      try {
        const response = await backend.post('/ramp-p2p/order/', this.orderPayload, { authorize: true })
        vm.order = response.data.order
      } catch (error) {
        console.error(error.response || error)
        if (error.response) {
          if (error.response.status === 403) {
            // bus.emit('session-expired')
          }
        } else {
          console.error(error)
          // bus.emit('network-error')
        }
      }
    },
    async sendConfirmPayment () {
      console.log('sendConfirmPayment')
      const vm = this
      await backend.post(`/ramp-p2p/order/${vm.order?.id}/confirm-payment/buyer`, null, { authorize: true })
        .then(response => {
          console.log('sendConfirmPayment:', response.data)
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              // bus.emit('session-expired')
            }
          } else {
            // bus.emit('network-error')
          }
        })
    },
    previousView () {
      const vm = this

      switch (vm.state) {
        case 'register':
        case 'order-list':
          vm.state = 'cashin-order'
          break
        case 'cashin-order':
          if (this.step === 1) {
            vm.$refs.dialog.hide()
          } else {
            this.step--
          }
          break
        default:
          vm.$refs.dialog.hide()
          break
      }
    },
    openOrder (orderId) {
      console.log('order-id', orderId)
      this.order = { id: orderId }
      this.state = 'cashin-order'
      this.step = 3
    }
  }
}
</script>
<style lang="scss" scoped>
.cashin-card {
  height: 450px;
}
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
