<template>
  <q-card
   class="br-15 q-pt-sm q-mx-md q-mx-none"
   :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
   style="min-height:78vh;">
   <!-- Form Body -->
    <div v-if="state === 'initial'">
      <div v-if="isloaded">
        <div>
          <q-btn
            flat
            padding="md"
            icon="arrow_back"
            @click="$emit('back')"
          />
        </div>
        <div class="q-mx-lg q-pt-xs text-h5 text-center bold-text lg-font-size" :class="ad.trade_type === 'SELL' ? 'buy-color' : 'sell-color'" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
          {{ ad.trade_type === 'SELL' ? 'BUY' : 'SELL'}} BY FIAT
        </div>
        <div class="q-px-lg">
          <!-- Ad Info -->
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="q-pt-md q-px-sm  sm-font-size">
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Price Type</span>
              <span class="text-nowrap q-ml-xs">
                {{ ad.price_type }}
              </span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Price</span>
              <span class="text-nowrap q-ml-xs">
                {{ formattedCurrency(ad.price, ad.fiat_currency.symbol) }}
              </span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Limit</span>
              <span class="text-nowrap q-ml-xs">
                {{ formattedCurrency(ad.trade_floor, ad.fiat_currency.symbol) }} - {{ formattedCurrency(ad.trade_ceiling, ad.fiat_currency.symbol) }}
              </span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Payment Time Limit</span>
              <span class="text-nowrap q-ml-xs">{{ paymentTimeLimit.label }}</span>
            </div>
          </div>

          <!-- Fiat Input -->
          <div class="q-mt-md q-mx-lg" v-if="!isOwner">
            <div class="xs-font-size subtext q-pb-xs q-pl-sm">Fiat Amount</div>
            <q-input class="q-pb-xs" filled :dark="darkMode" v-model="fiatAmount" :rules="[isValidInputAmount]">
              <template v-slot:prepend>
                <span class="sm-font-size bold-text">{{ ad.fiat_currency.symbol }}</span>
              </template>
              <template v-slot:append>
                <!-- <q-icon size="xs" name="close" @click="amount = 0"/>&nbsp; -->
                <q-btn class="xs-font-size" padding="none" flat color="primary" label="MAX" @click="fiatAmount = ad.trade_ceiling"/>
              </template>
            </q-input>
            <div class="text-right bold-text subtext sm-font-size q-pr-sm"> ≈ {{ formattedCurrency(cryptoAmount) }} BCH</div>

            <div v-if="ad.trade_type === 'BUY'">
              <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/>
              <div class="row justify-between no-wrap q-mx-lg sm-font-size bold-text subtext q-pt-sm">
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
              :disabled="!isValidInputAmount(fiatAmount)"
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
        </div>
      </div>

      <!-- Progress Loader -->
      <div v-else>
        <div class="row justify-center q-py-lg" style="margin-top: 50px">
          <ProgressLoader/>
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
        :type="dialogType"
        v-on:back="openDialog = false"
        v-on:submit="recieveDialogsInfo"
      />
    </div>
    <!-- Edit Ad -->
    <div v-if="state === 'edit-ad'">
      <FiatAdsForm
        @back="state = 'initial'"
        :adsState="'edit'"
        :transactionType="ad.trade_type"
        :selectedAdId="ad.id"
      />
    </div>
    <!-- Buy Process -->
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
// import FiatStoreBuyProcess from './FiatStoreBuyProcess.vue'
import FiatProcessOrder from './FiatProcessOrder.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'

import { loadP2PWalletInfo, formatCurrency, getPaymentTimeLimit } from 'src/wallet/ramp'
import { signMessage } from '../../../wallet/ramp/signature.js'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wallet: null,
      ad: null,
      isloaded: false,
      state: 'initial',
      fiatAmount: 0,
      order: null,
      openDialog: false,
      dialogType: '',
      paymentMethods: null
    }
  },
  props: {
    adId: Number
  },
  components: {
    ProgressLoader,
    AddPaymentMethods,
    FiatAdsForm,
    // FiatStoreBuyProcess,
    FiatProcessOrder,
    MiscDialogs
  },
  emits: ['back', 'orderCanceled'],
  computed: {
    paymentTimeLimit () {
      return getPaymentTimeLimit(this.ad.time_duration)
    },
    cryptoAmount () {
      return (this.fiatAmount / this.ad.price).toFixed(8)
    },
    bchBalance () {
      return this.$store.getters['assets/getAssets'][0].balance
    },
    isOwner () {
      console.log(this.ad.is_owned)
      return this.ad.is_owned
    }
  },
  async mounted () {
    const vm = this
    const walletInfo = vm.$store.getters['global/getWallet']('bch')
    vm.wallet = await loadP2PWalletInfo(walletInfo)

    await vm.fetchAd()
    vm.isloaded = true
  },
  methods: {
    orderConfirm () {
      this.dialogType = 'confirmOrderCreate'
      this.openDialog = true
    },
    async fetchAd () {
      const vm = this
      const url = `${vm.apiURL}/ad/${vm.adId}`
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_GET', timestamp)
      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }
      try {
        const response = await vm.$axios.get(url, { headers: headers })
        vm.ad = response.data
        console.log('ad:', vm.ad)
        // set the minimum trade amount in form
        this.fiatAmount = this.ad.trade_floor // remove later
      } catch (error) {
        console.log(error.response)
      }
    },
    formattedCurrency (value, currency = null) {
      if (currency) {
        return formatCurrency(value, currency)
      } else {
        return formatCurrency(value)
      }
    },
    isValidInputAmount (value) {
      if (value === undefined) return false
      const parsedValue = parseFloat(value)
      const tradeFloor = parseFloat(this.ad.trade_floor)
      const tradeCeiling = parseFloat(this.ad.trade_ceiling)
      if (isNaN(parsedValue) || parsedValue < tradeFloor || parsedValue > tradeCeiling) {
        return false
      }
      return true
    },
    async createOrder () {
      console.log('creating order')
      const vm = this
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'ORDER_CREATE', timestamp)
      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }
      let body = {
        ad: vm.ad.id,
        crypto_amount: vm.cryptoAmount
      }
      if (vm.ad.trade_type === 'BUY') {
        const temp = this.paymentMethods.map(p => p.id)
        console.log(temp)
        body.payment_methods = temp
      }
      // console.log('headers:', headers)
      // console.log('body:', body)
      try {
        const response = await vm.$axios.post(vm.apiURL + '/order/', body, { headers: headers })
        vm.order = response.data.order
        vm.state = 'order-process'
      } catch (error) {
        console.error(error.response)
      }
    },
    onBack () {
      this.$emit('back')
    },
    onOrderCanceled () {
      console.log('onOrderCanceled')
      this.$emit('orderCanceled')
    },
    recievePaymentMethods (item) {
      console.log('recieving data')

      this.paymentMethods = item
      console.log(this.paymentMethods)
      this.createOrder()
    },
    recieveDialogsInfo (item) {
      this.createOrder()
    },
    submit () {
      const vm = this
      switch (vm.ad.trade_type) {
        case 'SELL':
          console.log('create buy order')
          vm.orderConfirm()
          break
        case 'BUY':
          console.log('create sell order')
          vm.state = 'add-payment-method'
          break
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
.subtext {
    opacity: .5;
  }
  </style>