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
                {{ ad.price }} {{ ad.fiat_currency.symbol }}
              </span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Limit</span>
              <span class="text-nowrap q-ml-xs">
                {{ ad.trade_floor }} {{ ad.fiat_currency.symbol }} - {{ ad.trade_ceiling }} {{ ad.fiat_currency.symbol }}
              </span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Payment Time Limit</span>
              <span class="text-nowrap q-ml-xs">{{ ptlFormat }}</span>
            </div>
          </div>

          <!-- Fiat Input -->
          <div class="q-mt-md q-mx-lg">
            <div class="xs-font-size subtext q-pb-sm q-pl-sm">Fiat Amount</div>
            <q-input dense filled :dark="darkMode" v-model="fiatAmount" :rules="[isValidInputAmount]">
              <template v-slot:prepend>
                <span class="sm-font-size bold-text">{{ ad.fiat_currency.symbol }}</span>
              </template>
              <template v-slot:append>
                <!-- <q-icon size="xs" name="close" @click="amount = 0"/>&nbsp; -->
                <q-btn class="xs-font-size" padding="none" flat color="primary" label="MAX" @click="fiatAmount = ad.trade_ceiling"/>
              </template>
            </q-input>

            <div class="text-right bold-text subtext sm-font-size q-pr-sm">
              ≈ {{ cryptoAmount }} BCH
            </div>

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
          <div class="row q-mx-lg q-py-md">
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
   </q-card>
</template>
<script>
import ProgressLoader from '../../ProgressLoader.vue'
import AddPaymentMethods from './AddPaymentMethods.vue'

import { loadP2PWalletInfo } from 'src/wallet/ramp'
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

      fiatAmount: 0
    }
  },
  props: {
    adId: Number
  },
  components: {
    ProgressLoader,
    AddPaymentMethods
  },
  emits: ['back'],
  computed: {
    ptlFormat () {
      const ptl = {
        15: '15 min',
        30: '30 min',
        60: '1 hour',
        300: '5 hours',
        720: '12 hours',
        1440: '24 hours'
      }
      return ptl[this.ad.time_duration]
    },
    cryptoAmount () {
      return (this.fiatAmount / this.ad.price).toFixed(8)
    },
    bchBalance () {
      return this.$store.getters['assets/getAssets'][0].balance
    }
  },
  methods: {
    async fetchAd () {
      const vm = this

      const url = `${vm.apiURL}/ad/${vm.adId}`

      await vm.$axios.get(url)
        .then(response => {
          vm.ad = response.data
          // set the minimum trade amount in form
          this.fiatAmount = this.ad.trade_floor // remove later
        })
        .catch(error => {
          console.log(error)
        })
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
      const vm = this

      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_LIST', timestamp)

      await vm.$axios.post(vm.apiURL + '/order/', {},
        {
          headers: {
            'wallet-hash': vm.wallet.walltHash,
            signature: signature,
            timestamp: timestamp
          }
        })
    },
    // async createOrder () {
    //   const vm = this

    //   const timestamp = Date.now()
    //   const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_LIST', timestamp)

    //   const pmId = vm.filterPaymentMethod().map(p => p.id)
    //   console.log(pmId)
    //   // const lockedPrice = this.ad.price_type === 'FIXED' ?  this.ad.price : 1000 * () //CHECK LATER

    //   console.log(this.ad)
    //   await vm.$axios.post(vm.apiURL + '/order/', {
    //     ad: this.ad.id,
    //     crypto_amount: parseFloat(vm.cryptoAmount).toFixed(8),
    //     locked_price: this.ad.price, // fixed: normal price, float: price = marketprice * (floating_price/100)
    //     arbiter: 1,
    //     payment_methods: pmId
    //   },
    //   {
    //     headers: {
    //       'wallet-hash': vm.wallet.walletHash,
    //       signature: signature,
    //       timestamp: timestamp
    //     }
    //   })
    //     .then(response => {
    //       vm.order = response.data.data.order
    //     })
    //     .catch(error =>{
    //       console.log(error)
    //     })
    // },
    recievePaymentMethods (item) {
      console.log(item)
    },
    submit () {
      switch (this.ad.trade_type) {
        case 'SELL':
          console.log('create buy order')
          break
        case 'BUY':
          console.log('create sell order')
          this.state = 'add-payment-method'
          break
      }
    }
  },
  async mounted () {
    const vm = this
    console.log('creating order', this.adId)
    const walletInfo = vm.$store.getters['global/getWallet']('bch')
    vm.wallet = await loadP2PWalletInfo(walletInfo)

    await vm.fetchAd()
    vm.isloaded = true
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

<!-- TODO: AD bch balance checker later to prevent insufficient balance order -->
