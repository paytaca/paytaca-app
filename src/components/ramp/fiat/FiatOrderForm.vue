<template>
  <q-card
   class="br-15 q-pt-sm q-mx-md q-mx-none"
   :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
   style="min-height:78vh;">
   <!-- Form Body -->
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
        <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="q-pt-md sm-font-size">
          <div class="row justify-between no-wrap q-mx-lg">
            <span>Price Type</span>
            <span class="text-nowrap q-ml-xs">
              {{ ad.trade_type }}
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
            <span class="text-nowrap q-ml-xs">{{ ad.time_duration}}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Progress Loader -->
    <div v-else>
      <div class="row justify-center q-py-lg" style="margin-top: 50px">
        <ProgressLoader/>
      </div>
    </div>
   </q-card>
</template>
<script>
import ProgressLoader from '../../ProgressLoader.vue'

import { loadP2PWalletInfo } from 'src/wallet/ramp'
import { signMessage } from '../../../wallet/ramp/signature.js'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wallet: null,
      ad: null,
      isloaded: false
    }
  },
  props: {
    adId: Number
  },
  components: {
    ProgressLoader
  },
  emits: ['back'],
  computed: {
  },
  methods: {
    async fetchAd () {
      const vm = this

      const url = `${vm.apiURL}/ad/${vm.adId}`

      await vm.$axios.get(url)
        .then(response => {
          console.log(response.data)
          vm.ad = response.data
        })
        .catch(error => {
          console.log(error)
        })
    },
    // async fetchAd () {
    //   // console.log('fetching ad')
    //   // console.log(this.listingData)
    //   const adId = this.listingData.id
    //   const url = `${this.apiURL}/ad/${adId}`
    //   const response = await this.$axios.get(url)
    //     .then(response => {
    //       this.ad = response.data
    //       // console.log(this.ad)
    //     })
    //     .catch(error => {
    //       console.error(error)
    //       console.error(error.response)

    //       this.ad = this.listingData
    //       this.ad.fees = {
    //         arbitration_fee: 0.00001,
    //         service_fee: 0.00001
    //       }  // remove later
    //     })

    //   if (!this.ad) {  // remove later
    //     console.log('empty')
    //     this.ad = this.listingData
    //     this.ad.fees = {
    //       arbitration_fee: 0.00001,
    //       service_fee: 0.00001,
    //       hardcoded_fee: 0.00001
    //     }
    //   }
    //   // set the minimum trade amount in form
    //   this.fiatAmount = this.ad.trade_floor // remove later
    // },
    createOrder () {

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
  </style>
