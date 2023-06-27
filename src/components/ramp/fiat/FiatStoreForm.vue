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
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="q-pt-md" style="font-size: 14px;">
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
                  <span style="font-size: 14px; font-weight: 400;">{{ ad.fiat_currency.abbrev }}</span>
                </template>
                <template v-slot:append>
                  <!-- <q-icon size="xs" name="close" @click="amount = 0"/>&nbsp; -->
                  <q-btn padding="none" style="font-size: 12px;" flat color="primary" label="MAX" @click="fiatAmount = ad.trade_ceiling"/>
                </template>
            </q-input>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="q-pt-md" style="font-size: 14px;">
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
            <div class="row justify-between no-wrap q-mx-lg" style="font-weight: 500;">
              <span>Total</span>
              <span class="text-nowrap q-ml-xs ">{{ totalCryptoAmount }} BCH</span>
            </div>
          </div>
          <div class="row q-mx-sm q-py-md">
            <q-btn
              :disabled="!isAmountValid"
              rounded
              no-caps
              :label="transactionType === 'BUY'? 'Buy' : 'Next'"
              color="brandblue"
              class="q-space"
              @click="state = 'processing'"></q-btn>
          </div>
        </div>

        <!-- Process Transaction -->
        <div v-if="state === 'processing'">
          <FiatStoreBuyProcess
            :listingData="buy"
            :buyAmount="cryptoAmount.toString()"
            :fiatAmount="amount"
            v-on:back="state = 'initial'"
            v-on:hide-seller="hideSellerInfo = !hideSellerInfo"
            v-on:pending-release="pendingRelease = true"
            v-on:released="cryptoReleased"
          />
        </div>
        <div v-if="!hideSellerInfo" class="q-my-lg">
          <div class="q-mx-lg text-h5 text-center" style="font-size: 15px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
            SELLER INFO
          </div>
          <div class="row">
            <div class="col ib-text">
              <div class="q-mx-lg q-mt-md">
                <span
                  :class="{'pt-dark-label': darkMode}"
                  class="q-pl-md q-mb-none text-uppercase"
                  style="font-size: 15px; font-weight: 400;"
                >
                  {{ ad.owner }}
                </span>
              </div>
              <div class="q-mx-lg subtext" :class="{'pt-dark-label': darkMode}">
                <span class="q-pl-md q-mb-none" style="font-size: 12px;">
                  {{ ad.trade_count }} trades
                </span>&nbsp;
                <span class="q-pl-xs q-mb-none" style="font-size: 12px;">
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
            <div class="q-px-lg" style="font-weight: 500;">
              Seller did not release crypto?
            </div>
            <div class="q-pt-xs q-mx-lg subtext">
              If the seller still has not release the crypto after the Payment Time Limit, please submit an appeal
            </div>
          </div>
        </div>
      </div>
    </div>
 </q-card>
</template>
<script>
import FiatStoreBuyProcess from './FiatStoreBuyProcess.vue'

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
    FiatStoreBuyProcess
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
  async mounted () {
    await this.fetchAd()
    this.isloaded = true
  },
  methods: {
    async fetchAd () {
      const adId = this.listingData.id
      const url = `${this.apiURL}/ad/${adId}`
      const response = await this.$axios.get(url)
      this.ad = response.data

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
    },
    getPaymentTimeLimit (timeDurationChoice) {
      const vm = this
      return vm.ptlSelection.find(p => p.value === timeDurationChoice)
    }
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
