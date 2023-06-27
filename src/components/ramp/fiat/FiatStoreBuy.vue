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
        <div class="q-mx-lg q-pt-xs text-h5 text-center bold-text lg-font-size" style="color: rgb(60, 100, 246);" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
          BUY BY FIAT
        </div>
        <div class="q-mx-lg">
          <div class="q-pt-md subtext" style="font-size: 12px;">
            <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
              <span>Price:</span>
              <!-- {{ buy.priceType === 'FIXED' ? buy.fixedPrice : buy.floatingPrice }} {{ buy.fiatCurrency.abbrev }} -->
              <span class="text-nowrap q-ml-xs">{{ buy.priceType === 'FIXED' ? buy.fixedPrice : buy.floatingPrice }} {{ buy.fiatCurrency.abbrev }}</span>
            </div>
            <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
              <span>Limit:</span>
              <!-- {{ buy.tradeFloor }}  {{ buy.fiatCurrency.abbrev }}  - {{ buy.tradeCeiling }}  {{ buy.fiatCurrency.abbrev }} -->
              <span class="text-nowrap q-ml-xs">{{ buy.tradeFloor }} {{ buy.fiatCurrency.abbrev }} - {{ buy.tradeCeiling }} {{ buy.fiatCurrency.abbrev }}</span>
            </div>
            <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
              <span>Payment Limit:</span>
              <span class="text-nowrap q-ml-xs">{{ getPaymentTimeLimit(buy.timeDurationChoice).label}}</span>
            </div>
          </div>
        </div>
    <div class="q-pb-md" v-if="state === 'initial'">
      <div>
        <q-btn
          flat
          padding="md"
          icon="arrow_back"
          @click="$emit('back')"
        />
      </div>
      <div class="q-mx-lg q-pt-xs text-h5 text-center" style="font-size: 18px; font-weight: 500; color: rgb(60, 100, 246);" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
        BUY BY FIAT
      </div>
      <div v-if="adDetails" class="q-mx-lg">
        <div class="q-pt-md subtext" style="font-size: 12px;">
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Price:</span>
            <span class="text-nowrap q-ml-xs">{{ adDetails.price }}</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Limit:</span>
            <span class="text-nowrap q-ml-xs">{{ adDetails.trade_floor }} {{ adDetails.fiat_currency.abbrev }}</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Payment Limit:</span>
            <span class="text-nowrap q-ml-xs">24 hours</span>
          </div>
        </div>
        <div class="q-mt-md q-mx-lg">
          <q-input
            dense
            filled
            :dark="darkMode"
            v-model="amount"
          >
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
        <div class="q-pt-md" style="font-size: 13px;">
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Crypto Amount:</span>
            <span class="text-nowrap q-ml-xs subtext">{{ cryptoAmount }} BCH</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Fiat Amount:</span>
            <span class="text-nowrap q-ml-xs subtext">{{ fiatAmount }}</span>
          </div>
        </div>
        <div class="row q-mx-sm q-py-md">
          <q-btn
            :disable="!isAmountValid()"
            rounded
            no-caps
            label='Buy'
            color="brandblue"
            class="q-space"
            @click="state = 'processing'"
          />
        </div>
      </div>
    </div>
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
    <div v-if="!hideSellerInfo && adDetails != null">
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
              {{ adDetails.ad_owner_name }}
            </span>
          </div>
          <div class="q-mx-lg subtext" :class="{'pt-dark-label': darkMode}">
            <span
              class="q-pl-md q-mb-none"
              style="font-size: 12px;"
            >
              {{ adDetails.trade_count }} trades
            </span>&nbsp;
            <span
              class="q-pl-xs q-mb-none"
              style="font-size: 12px;"
            >
              {{ adDetails.completion_rate }}% completion
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
          <q-badge v-for="method in adDetails.payment_methods" :key="method.id" rounded outline color="blue" :label="method"/>
          <div class="row q-mx-sm q-py-md">
            <q-btn
              :disable="!isAmountValid()"
              rounded
              no-caps
              label='Buy'
              color="brandblue"
              class="q-space"
              @click="state = 'processing'"
            />
          </div>
        </div>
      </div>
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
      <div v-if="!hideSellerInfo">
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
                {{ buy.paymentMethods[0].account_name }}
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
            <q-badge v-for="method in adDetails.payment_methods" :key="method.id" rounded outline color="blue" :label="method"/>
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
import { string } from 'hex-my-bytes'
import FiatStoreBuyProcess from './FiatStoreBuyProcess.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      adDetails: null,
      isloaded: false,
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
        }]
    }
  },
  emits: ['back'],
  props: ['ad'],
  components: {
    FiatStoreBuyProcess
  },
  async mounted () {
    console.log('inside mounted')
    await this.fetchAdDetail()
    this.isloaded = true
  },
  methods: {
    async fetchAdDetail () {
      console.log('ad: ', this.ad)
      const vm = this
      const url = `${vm.apiURL}/ad/${this.ad}`
      console.log('url:', url)
      const response = await vm.$axios.get(url)
      vm.adDetails = response.data
      console.log('adDetails:', vm.adDetails)
    },
    isAmountValid () {
      if (this.amount === 0 || this.amount === '') {
        return false
      } else {
        return true
      }
    },
    cryptoReleased () {
      this.released = true
      this.pendingRelease = false
    },
    getPaymentTimeLimit (timeDurationChoice) {
      const vm = this

      console.log(timeDurationChoice)
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
</style>
