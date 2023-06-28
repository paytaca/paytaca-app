<template>
  <q-card
   class="br-15 q-pt-sm q-mx-md q-mx-none"
   :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
   style="min-height:78vh;">
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
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="q-pt-md sm-font-size">
            <div class="row justify-between no-wrap q-mx-lg">
                <span>Price Type</span>
                <span class="text-nowrap q-ml-xs">
                {{ ad.price_type }}
                </span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
                <span>Price</span>
                <span class="text-nowrap q-ml-xs">
                {{ ad.price }} {{ ad.fiat_currency.abbrev }}
                </span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Limit</span>
              <span class="text-nowrap q-ml-xs">
                {{ ad.trade_floor }} {{ ad.fiat_currency.abbrev }} - {{ ad.trade_ceiling }} {{ ad.fiat_currency.abbrev }}
              </span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Payment Time Limit</span>
              <span class="text-nowrap q-ml-xs">{{ ad.time_duration}}</span>
            </div>
          </div>
          <div class="q-mt-md q-mx-lg">
            <q-input dense filled :dark="darkMode" v-model="fiatAmount" :rules="[isValidInputAmount]">
                <template v-slot:prepend>
                  <span class="sm-font-size bold-text">{{ ad.fiat_currency.abbrev }}</span>
                </template>
                <template v-slot:append>
                  <!-- <q-icon size="xs" name="close" @click="amount = 0"/>&nbsp; -->
                  <q-btn class="xs-font-size" padding="none" flat color="primary" label="MAX" @click="fiatAmount = ad.trade_ceiling"/>
                </template>
            </q-input>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="q-pt-md sm-font-size">
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Crypto Amount</span>
              <span class="text-nowrap q-ml-xs">{{ cryptoAmount }} BCH</span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Arbitration Fee</span>
              <span class="text-nowrap q-ml-xs">{{ ad.fees.arbitration_fee }} BCH</span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Contract Fee</span>
              <span class="text-nowrap q-ml-xs">{{ ad.fees.hardcoded_fee }} BCH</span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Service Fee</span>
              <span class="text-nowrap q-ml-xs">{{ ad.fees.service_fee }}  BCH</span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg bold-text">
              <span>Total</span>
              <span class="text-nowrap q-ml-xs ">{{ totalCryptoAmount.toFixed(8) }} BCH</span>
            </div>
          </div>
          <div class="row q-mx-lg q-py-md">
            <q-btn
              :disabled="!isAmountValid"
              rounded
              no-caps
              :label="transactionType === 'BUY'? 'Buy' : 'Next'"
              color="blue-6"
              class="q-space"
              @click="state = 'processing'"></q-btn>
          </div>
        </div>
         <!-- <div class="q-pt-md" style="font-size: 13px;" v-if="transactionType === 'buy'">
           <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
             <span>Crypto Amount:</span>
             <span class="text-nowrap q-ml-xs subtext">{{ buy.cryptoAmount }} BCH</span>
           </div>
           <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
             <span>Fiat Amount:</span> -->
             <!-- <span class="text-nowrap q-ml-xs subtext">{{ isAmountValid(amount) || amount === 0 || amount === '' ||  amount === '0' ? amount : 'Invalid Amount' }} {{ buy.fiatCurrency.abbrev }}</span> -->
             <!-- <span class="text-nowrap q-ml-xs subtext">{{ amount }} {{ ad.fiat_currency.abbrev }}</span>
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
     </div>-->

     <!-- Process Transaction -->
     <!-- <div v-if="state === 'processing'">
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
               <!- {{ buy.paymentMethods[0].account_name }} -->
             <!-- </span>
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
     </div> -->
   </div>

        <!-- Process Transaction -->
        <div v-if="state === 'processing'">
          <FiatStoreBuyProcess
            v-if="transactionType === 'BUY'"
            :listingData="ad"
            :buyAmount="cryptoAmount.toString()"
            :fiatAmount="fiatAmount"
            v-on:back="state = 'initial'"
            v-on:hide-seller="hideSellerInfo = !hideSellerInfo"
            v-on:pending-release="pendingRelease = true"
            v-on:released="cryptoReleased"
          />
          <FiatStoreSellProcess
            v-if="transactionType === 'SELL'"
            :listingData="ad"
            :buyAmount="cryptoAmount.toString()"
            :fiatAmount="fiatAmount"
            v-on:back="state = 'initial'"
            v-on:hide-seller="hideSellerInfo = !hideSellerInfo"
            v-on:pending-release="pendingRelease = true"
            v-on:released="cryptoReleased"
          />
        </div>
        <div v-if="!hideSellerInfo" class="q-my-lg">
          <div class="q-mx-lg text-h5 text-center md-font-size bold-text" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
            {{ transactionType === 'BUY' ? 'SELLER INFO' : 'BUYER INFO'}}
          </div>
          <div class="row">
            <div class="col ib-text">
              <div class="q-mx-lg q-mt-md">
                <span
                  :class="{'pt-dark-label': darkMode}"
                  class="q-pl-md q-mb-none text-uppercase md-font-size bold-text"
                >
                  {{ ad.owner }}
                </span>
              </div>
              <div class="q-mx-lg subtext" :class="{'pt-dark-label': darkMode}">
                <span class="q-pl-md q-mb-none xs-font-size">
                  {{ ad.trade_count }} trades
                </span>&nbsp;
                <span class="q-pl-xs q-mb-none xs-font-size">
                  {{ ad.completion_rate }}% completion
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
              <q-badge v-for="method in ad.payment_methods" :key="method.id" rounded outline :color="transactionType === 'BUY' ? 'blue' : 'red'" :label="method.payment_type"/>
            </div>
          </div>
          <div class="q-mx-lg q-mt-md" v-if="pendingRelease">
            <div class="q-px-lg bold-text">
              Seller did not release crypto?
            </div>
            <div class="q-pt-xs q-mx-lg subtext">
              If the seller still has not release the crypto after the Payment Time Limit, please submit an appeal
            </div>
          </div>
        </div>
      </div>
    <!-- </div> -->
    <div v-if="!isloaded">
      <div class="row justify-center q-py-lg" style="margin-top: 50px">
        <ProgressLoader/>
      </div>
    </div>
 </q-card>
</template>
<script>
import FiatStoreBuyProcess from './FiatStoreBuyProcess.vue'
import FiatStoreSellProcess from './FiatStoreSellProcess.vue'
import ProgressLoader from '../../ProgressLoader.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      isloaded: false,
      ad: null,
      fiatAmount: 0,
      state: 'initial',
      hideSellerInfo: false,
      pendingRelease: false,
      released: false,
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
    FiatStoreSellProcess,
    ProgressLoader
  },
  computed: {
    isAmountValid () {
      const amount = this.fiatAmount
      const parsedValue = parseFloat(amount)
      const tradeFloor = parseFloat(this.ad.trade_floor)
      const tradeCeiling = parseFloat(this.ad.trade_ceiling)
      if (isNaN(parsedValue) || parsedValue < tradeFloor || parsedValue > tradeCeiling) {
        return false
      }
      return true
    },
    cryptoAmount () {
      return this.fiatAmount / this.ad.price
    },
    totalCryptoAmount () {
      const fees = this.ad.fees
      return this.cryptoAmount + fees.hardcoded_fee + fees.arbitration_fee + fees.service_fee
    }
  },
  // async mounted () {
  //   await this.fetchAd()
  //   this.isloaded = true
  // },
  methods: {
    // isAmountValid (value) {
    //   // amount with comma and decimal regex
    //   const regex = /^(\d*[.]\d+)$|^(\d+)$|^((\d{1,3}[,]\d{3})+(\.\d+)?)$/
    //   value = String(value)

    //   if (regex.test(value) && value !== '0') {
    //     return true
    //   } else {
    //     return false
    //   }
    // },
    async fetchAd () {
      const adId = this.listingData.id
      const url = `${this.apiURL}/ad/${adId}`
      const response = await this.$axios.get(url)
        .then(response => {
          this.ad = response.data
        })
        .catch(error => {
          console.error(error)
          console.error(error.response)

          this.ad = this.listingData
          this.ad.fees = {
            arbitration_fee: 0.00001,
            service_fee: 0.00001
          }  // remove later
        })

      if (!response) {  // remove later
        console.log('empty')
        this.ad = this.listingData
        this.ad.fees = {
          arbitration_fee: 0.00001,
          service_fee: 0.00001,
          hardcoded_fee: 0.00001
        }
      }
      // set the minimum trade amount in form
      this.fiatAmount = this.ad.trade_floor
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
    getTotalCryptoAmount () {
      const totalCrypto = this.cryptoAmount + this.ad.arbitration_fee + this.ad.service_fee
      return totalCrypto
    },
    cryptoReleased () {
      this.released = true
      this.pendingRelease = false
    }
  },
  async mounted () {
    console.log('fiat form')
    const vm = this
    // vm.buy = vm.listingData
    await vm.fetchAd()
    vm.isloaded = true
    console.log('done')
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
