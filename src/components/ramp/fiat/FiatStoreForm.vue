<template>
  <q-card
   class="br-15 q-pt-sm q-mx-md q-mx-none"
   :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
   style="min-height:78vh;"
 >
   <div v-if="isloaded">
     <div class="q-pb-md" v-if="state === 'initial'">
       <div>
         <q-btn
           flat
           padding="md"
           icon="arrow_back"
           @click="$emit('back')"
         />
       </div>
       <div class="q-mx-lg q-pt-xs text-h5 text-center bold-text lg-font-size" :class="transactionType === 'BUY' ? 'buy-color' : 'sell-color'" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
         {{ transactionType === 'BUY' ? 'BUY': 'SELL' }} BY FIAT
       </div>
       <div class="q-mx-lg">
         <div class="q-pt-md subtext" style="font-size: 12px;">
           <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
              <span>Price:</span>
              <span class="text-nowrap q-ml-xs">
               {{ ad.price }} {{ ad.fiat_currency.abbrev }}
              </span>
           </div>
           <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
             <span>Limit:</span>
             <span class="text-nowrap q-ml-xs">
              {{ ad.tradeFloor }} {{ ad.fiat_currency.abbrev }} - {{ ad.trade_ceiling }} {{ ad.fiat_currency.abbrev }}
            </span>
           </div>
           <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
             <span>Payment Limit:</span>
             <span class="text-nowrap q-ml-xs">{{ getPaymentTimeLimit(ad.time_duration)}}</span>
           </div>
         </div>
         <div class="q-mt-md q-mx-lg">
           <q-input dense filled :dark="darkMode" v-model="amount">
              <template v-slot:prepend>
                <span style="font-size: 12px; font-weight: 400;">
                  PHP
                </span>
              </template>
              <template v-slot:append>
                <q-icon size="xs" name="close" @click="amount = 0"/>&nbsp;
                <q-btn padding="none" style="font-size: 12px;" flat color="primary" label="MAX" />
              </template>
           </q-input>
         </div>
         <div class="q-pt-md" style="font-size: 13px;" v-if="transactionType === 'SELL'">
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Crypto Amount:</span>
            <span class="text-nowrap q-ml-xs subtext">{{ buy.cryptoAmount }} BCH</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Arbitration Fee:</span>
            <span class="text-nowrap q-ml-xs subtext">[ arbitrationFee ] BCH</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Service Fee:</span>
            <span class="text-nowrap q-ml-xs subtext">[ serviceFee ] BCH</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg" style="font-weight: 500;">
            <span>Total:</span>
            <span class="text-nowrap q-ml-xs subtext">[ totalAmount ] BCH</span>
          </div>
        </div>
         <div class="q-pt-md" style="font-size: 13px;" v-if="transactionType === 'buy'">
           <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
             <span>Crypto Amount:</span>
             <span class="text-nowrap q-ml-xs subtext">{{ buy.cryptoAmount }} BCH</span>
           </div>
           <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
             <span>Fiat Amount:</span>
             <!-- <span class="text-nowrap q-ml-xs subtext">{{ isAmountValid(amount) || amount === 0 || amount === '' ||  amount === '0' ? amount : 'Invalid Amount' }} {{ buy.fiatCurrency.abbrev }}</span> -->
             <span class="text-nowrap q-ml-xs subtext">{{ amount }} {{ ad.fiat_currency.abbrev }}</span>
           </div>
         </div>
         <div class="row q-mx-sm q-py-md">
           <q-btn
             :disable="!isAmountValid(amount)"
             rounded
             no-caps
             :label="transactionType === 'buy'? 'Buy' : 'Next'"
             color="brandblue"
             class="q-space"
             @click="state = 'processing'"
           />
         </div>
       </div>
     </div>

     <!-- Process Transaction -->
     <div v-if="state === 'processing'">
      <FiatStoreBuyProcess
        v-if="transactionType === 'buy'"
        :listingData="buy"
        :buyAmount="cryptoAmount.toString()"
        :fiatAmount="amount"
        v-on:back="state = 'initial'"
        v-on:hide-seller="hideSellerInfo = !hideSellerInfo"
        v-on:pending-release="pendingRelease = true"
        v-on:released="cryptoReleased"
      />
      <FiatStoreSellProcess
        v-if="transactionType === 'sell'"
        v-on:back="state === 'initial'"
      />
     </div>
     <div v-if="!hideSellerInfo">
       <div class="q-mx-lg text-h5 text-center" style="font-size: 15px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
         {{ transactionType === 'buy' ? 'SELLER INFO' : 'BUYER INFO'}}
       </div>
       <div class="row">
         <div class="col ib-text">
           <div class="q-mx-lg q-mt-md">
             <span
               :class="{'pt-dark-label': darkMode}"
               class="q-pl-md q-mb-none text-uppercase"
               style="font-size: 15px; font-weight: 400;"
             >
               <!-- {{ buy.paymentMethods[0].account_name }} -->
             </span>
           </div>
           <div class="q-mx-lg subtext" :class="{'pt-dark-label': darkMode}">
             <span
               class="q-pl-md q-mb-none"
               style="font-size: 12px;"
             >
               1000 trades
             </span>&nbsp;
             <span
               class="q-pl-xs q-mb-none"
               style="font-size: 12px;"
             >
               100% completion
             </span>
           </div>
         </div>
         <div class="text-right q-mr-lg q-mt-md" v-if="!released">
           <q-icon class="q-pr-lg" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_chat"/>
         </div>
         <div class="text-right q-mr-lg q-mt-md" v-if="released">
           <q-icon class="q-pr-sm" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_thumb_up"/>
           <q-icon class="q-pr-lg" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_thumb_down"/>
         </div>
       </div>
       <div class="q-mx-lg q-pt-sm">
         <div class="q-ml-xs  q-gutter-sm">
           <q-badge v-for="method in buy.paymentMethods" :key="method.id" rounded outline :color="transactionType === 'buy' ? 'blue' : 'red'" :label="method.name"/>
         </div>
       </div>
       <div class="q-mx-lg q-mt-md" v-if="pendingRelease">
         <div class="q-px-lg" style="font-weight: 500;">
           Seller did not release crypto?
         </div>
         <div class="q-pt-xs q-mx-lg subtext">
           If the seller still has not release the crypto after the Payment Time Limit, please submit an appeal
         </div>
       </div>
     </div>
   </div>
 </q-card>
</template>
<script>
import FiatStoreBuyProcess from './FiatStoreBuyProcess.vue'
import FiatStoreSellProcess from './FiatStoreSellProcess.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      isloaded: false,
      ad: null,
      buy: {},
      amount: 0,
      cryptoAmount: 1.43,
      fiatAmount: '1000 PHP',
      state: 'initial',
      hideSellerInfo: false,
      pendingRelease: false,
      released: false,
      paymentTimeLimit: null,
      ptlSelection: [
        {
          label: '15 min',
          value: 15
        }, {
          label: '30 min',
          value: 30
        }, {
          label: '1 hr',
          value: 60
        }, {
          label: '5 hrs',
          value: 300
        }, {
          label: '12 hrs',
          value: 720
        }, {
          label: '1 day',
          value: 1440
        }
      ]
    }
  },
  emits: ['back'],
  props: {
    listingData: Object,
    transactionType: String
  },
  components: {
    FiatStoreBuyProcess,
    FiatStoreSellProcess
  },
  methods: {
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
    async fetchAd () {
      const adId = this.listingData.id
      const url = `${this.apiURL}/ad/${adId}`
      const response = await this.$axios.get(url)
      this.ad = response.data
    },
    // isAmountValid () {
    //   if (this.amount === 0 || this.amount === '') {
    //     return false
    //   } else {
    //     return true
    //   }
    // },
    cryptoReleased () {
      this.released = true
      this.pendingRelease = false
    },
    getPaymentTimeLimit (timeDurationChoice) {
      const vm = this
      return vm.ptlSelection.find(p => p.value === timeDurationChoice)
    }
  },
  async mounted () {
    const vm = this
    vm.buy = vm.listingData

    await vm.fetchAd()
    vm.isloaded = true
  }
}
</script>
<style lang="scss" scoped>
 .pp-text {
   color: #000 !important;
 }
 .subtext {
   font-size: 13px;
   opacity: .5;
 }
 .buy-color {
  color: rgb(60, 100, 246);
}
.sell-color {
  color: #ed5f59;
}
</style>
