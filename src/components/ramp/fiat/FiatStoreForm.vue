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
        <div class="q-mx-lg q-pt-xs text-h5 text-center bold-text lg-font-size" :class="transactionType === 'SELL' ? 'buy-color' : 'sell-color'" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
          {{ transactionType === 'SELL' ? 'BUY': 'SELL' }} BY FIAT
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
          <q-separator :dark="darkMode" class="q-mt-sm q-mx-md" v-if="isOwner"/>
          <div class="q-mt-md q-mx-lg" v-if="!isOwner">
            <q-input dense filled :dark="darkMode" v-model="fiatAmount" :rules="[isValidInputAmount]">
                <template v-slot:prepend>
                  <span class="sm-font-size bold-text">{{ ad.fiat_currency.symbol }}</span>
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
              <span class="text-nowrap q-ml-xs">{{ cryptoAmount.toFixed(8) }} BCH</span>
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
          <div class="row q-mx-lg q-py-md" v-if="isOwner">
            <q-btn
              :disabled="!isAmountValid"
              rounded
              no-caps
              label="Edit Ad"
              color="blue-6"
              class="q-space"
              @click="state = 'edit-ad'"
              />
          </div>
          <div class="row q-mx-lg q-py-md" v-else>
            <q-btn
              :disabled="!isAmountValid"
              rounded
              no-caps
              label="Next"
              color="blue-6"
              class="q-space"
              @click="checkPaymentMethod()"></q-btn>
              <!-- click="state = 'addPaymentMethods'" -->
          </div>
        </div>
      </div>

      <!-- Process Transaction -->
      <div v-if="state === 'processing'">
        <!-- Double Check this -->
        <FiatStoreBuyProcess
          v-if="transactionType === 'SELL'"
          :order-data="order"
          v-on:back="state = 'initial'"
          v-on:hide-seller="hideSellerInfo = !hideSellerInfo"
          v-on:pending-release="pendingRelease = true"
          v-on:released="cryptoReleased"
        />
        <FiatStoreSellProcess
          v-if="transactionType === 'BUY'"
          :listingData="order"
          :buyAmount="cryptoAmount.toString()"
          :fiatAmount="fiatAmount"
          v-on:back="state = 'initial'"
          v-on:hide-seller="hideSellerInfo = !hideSellerInfo"
          v-on:pending-release="pendingRelease = true"
          v-on:released="cryptoReleased"
        />
      </div>
      <div v-if="state === 'addPaymentMethods'">
        <AddPaymentMethods
          :type="'General'"
          v-on:back="state = 'initial'"
          v-on:submit="updatedPaymentMethods"
        />
      </div>
      <div v-if="state === 'confirmation'">
        <DisplayConfirmation
          :type="'order'"
          :post-data="ad"
          :fiat-amount="parseFloat(fiatAmount)"
          :crypto-amount="parseFloat(cryptoAmount)"
          :transaction-type="transactionType"
          :payment-methods="filterPaymentMethod()"
          v-on:back="state = 'initial'"
          v-on:submit="postOrder"
        />
      </div>
      <div v-if="state === 'edit-ad'">
        <FiatAdsForm
          @back="state = 'initial'"
          :adsState="'edit'"
          :transactionType="transactionType"
          :selectedAdId="ad.id"
        />
      </div>

      <!-- UPDATE LATER -->
      <!-- <div v-if="!hideSellerInfo" class="q-my-lg">
        <div class="q-mx-lg text-h5 text-center md-font-size bold-text" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
          {{ transactionType === 'SELL' ? 'SELLER INFO' : 'BUYER INFO'}}
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
            <q-icon
              :class="{shake: disabled}"
              @click="warnDisabled"
              class="q-pr-lg"
              :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_chat"
            />
          </div>
          <div class="text-right q-mr-lg q-mt-md" v-if="released">
            <q-icon class="q-pr-sm" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_thumb_up"/>
            <q-icon class="q-pr-lg" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_thumb_down"/>
          </div>
        </div>
        <div class="q-mx-lg q-pt-sm">
          <div class="q-ml-xs  q-gutter-sm">
            <q-badge v-for="method in ad.payment_methods" :key="method.id" rounded outline :color="transactionType === 'SELL' ? 'blue' : 'red'" :label="method.payment_type"/>
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
      </div> -->
    </div>
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
import FiatAdsForm from './FiatAdsForm.vue'
import ProgressLoader from '../../ProgressLoader.vue'
import AddPaymentMethods from './AddPaymentMethods.vue'
import DisplayConfirmation from './DisplayConfirmation.vue'

import { loadP2PWalletInfo } from 'src/wallet/ramp'
import { signMessage } from '../../../wallet/ramp/signature.js'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      paymentMethods: [],
      disabled: false,
      isloaded: false,
      ad: null,
      order: null,
      wallet: null,
      fiatAmount: 0,
      state: 'initial', // confirmation
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
    FiatAdsForm,
    ProgressLoader,
    AddPaymentMethods,
    DisplayConfirmation
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
    },
    isOwner () {
      return this.ad.owner === this.$store.getters['ramp/getUser'].nickname
    }
  },
  // async mounted () {
  //   await this.fetchAd()
  //   this.isloaded = true
  // },
  methods: {
    warnDisabled () {
      this.disabled = true
      setTimeout(() => {
        this.disabled = false
      }, 1500)
    },
    filterPaymentMethod () {
      // console.log(this.paymentMethods)

      const adMethod = this.ad.payment_methods
      const adPaymentTypes = adMethod.map(p => p.payment_type)

      const match = this.paymentMethods.filter(function (method) {
        return adPaymentTypes.includes(method.payment_type.name)
      })
      console.log('matched:', match)
      return match
    },
    async fetchPaymentMethods () {
      const vm = this

      const url = `${vm.apiURL}/payment-method`
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_LIST', timestamp)

      await vm.$axios.get(url, {
        headers: {
          'wallet-hash': vm.wallet.walletHash,
          signature: signature,
          timestamp: timestamp
        }
      })
        .then(response => {
          console.log(response.data)
          this.paymentMethods = response.data
          // this.filterPaymentMethod()
        })
        .catch(error => {
          console.log(error)
        })
    },
    async fetchAd () {
      // console.log('fetching ad')
      // console.log(this.listingData)
      const adId = this.listingData.id
      const url = `${this.apiURL}/ad/${adId}`
      const response = await this.$axios.get(url)
        .then(response => {
          this.ad = response.data
          // console.log(this.ad)
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

      if (!this.ad) {  // remove later
        console.log('empty')
        this.ad = this.listingData
        this.ad.fees = {
          arbitration_fee: 0.00001,
          service_fee: 0.00001,
          hardcoded_fee: 0.00001
        }
      }
      // set the minimum trade amount in form
      this.fiatAmount = this.ad.trade_floor // remove later
    },
    async checkPaymentMethod () {
      await this.fetchPaymentMethods()

      if (this.filterPaymentMethod().length === 0) {
        console.log('empty')
        this.state = 'addPaymentMethods'
      } else {
        console.log(this.filterPaymentMethod().length, 'items')
        this.state = 'confirmation'
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
    getTotalCryptoAmount () {
      const totalCrypto = this.cryptoAmount + this.ad.arbitration_fee + this.ad.service_fee
      return totalCrypto
    },
    cryptoReleased () {
      this.released = true
      this.pendingRelease = false
    },
    updatedPaymentMethods (data) {
      // console.log(data)
      this.paymentMethods = data
      // this.state = 'processing'
      this.state = 'confirmation'
    },
    async createOrder () {
      const vm = this

      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_LIST', timestamp)

      const pmId = vm.filterPaymentMethod().map(p => p.id)
      console.log(pmId)
      // const lockedPrice = this.ad.price_type === 'FIXED' ?  this.ad.price : 1000 * () //CHECK LATER

      console.log(this.ad)
      await vm.$axios.post(vm.apiURL + '/order/', {
        ad: this.ad.id,
        crypto_amount: parseFloat(vm.cryptoAmount).toFixed(8),
        locked_price: this.ad.price, // fixed: normal price, float: price = marketprice * (floating_price/100)
        arbiter: 1,
        payment_methods: pmId
      },
      {
        headers: {
          'wallet-hash': vm.wallet.walletHash,
          signature: signature,
          timestamp: timestamp
        }
      })
        .then(response => {
          vm.order = response.data.data.order
        })
        .catch(error =>{
          console.log(error)
        })
    },
    async postOrder () {
      await this.createOrder()
      console.log(this.order)
      console.log('created Order')
      this.state = 'processing'
    }
  },
  async mounted () {
    const vm = this
    // vm.buy = vm.listingData
    const walletInfo = vm.$store.getters['global/getWallet']('bch')
    vm.wallet = await loadP2PWalletInfo(walletInfo)
    await vm.fetchAd()
    // console.log(vm.isOwner)
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
.shake {
  animation: shake 0.82s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  transform: translate3d(0, 0, 0);
}

@keyframes shake {
  10%,
  90% {
    transform: translate3d(-1px, 0, 0);
  }

  20%,
  80% {
    transform: translate3d(2px, 0, 0);
  }

  30%,
  50%,
  70% {
    transform: translate3d(-4px, 0, 0);
  }

  40%,
  60% {
    transform: translate3d(4px, 0, 0);
  }
}
</style>
