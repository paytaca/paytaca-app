<template>
  <div class="q-mt-md q-mx-md" v-if="isloaded">
    <div>
      <q-btn
        flat
        padding="md"
        icon="arrow_back"
        @click="$emit('back')"
      />
    </div>
    <div v-if="step === 1">
      <div v-if="order.is_ad_owner">
          <!-- CONFIRMATION PAGE -->
        <div v-if="order.is_ad_owner">
          <div class="q-mx-lg text-h5 text-center lg-font-size" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
            ORDER #{{ order.id }}
          </div>
          <div class="q-pt-md sm-font-size q-px-md  ">
            <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
              <span>Price</span>
              <span class="text-nowrap q-ml-xs">{{ formattedCurrency(order.crypto_amount) }}  {{ order.crypto_currency.symbol }}</span>
            </div>
            <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
              <span>Limit</span>
              <span class="text-nowrap q-ml-xs">{{ formattedCurrency(fiatAmount, order.fiat_currency.symbol) }} </span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg bold-text" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
              <span>Payment Time Limit</span>
              <span class="text-nowrap q-ml-xs" :class="order.status.toLowerCase().includes('released') ? 'text-green-6' : 'text-orange-6'">{{ order.status }}</span>
            </div>
          </div>

          <!-- Fiat Input -->
          <div class="q-mt-md q-mx-lg">
            <div class="xs-font-size subtext q-pb-xs q-pl-sm">Fiat Amount</div>
            <q-input class="q-pb-xs" disable filled :dark="darkMode" v-model="fiatAmount" :rules="[isValidInputAmount]">
              <template v-slot:prepend>
                <span class="sm-font-size bold-text">{{ order.fiat_currency.symbol }}</span>
              </template>
            </q-input>
            <div class="text-right bold-text subtext sm-font-size q-pr-sm"> ≈ {{ formattedCurrency(cryptoAmount) }} BCH</div>
          </div>

          <div>
            <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/>
            <div class="row justify-between no-wrap q-mx-lg sm-font-size bold-text subtext q-pt-sm q-px-lg">
              <span>Balance:</span>
              <span class="text-nowrap q-ml-xs">
                {{ bchBalance }} BCH
              </span>
            </div>
          </div>

          <div class="row q-pt-md q-mx-lg q-px-md">
            <q-btn
              rounded
              no-caps
              label='CONFIRM'
              class="q-space text-white"
              color="blue-6"
            />
          </div>
          <div class="row q-pt-sm q-mx-lg q-px-md">
            <q-btn
              rounded
              no-caps
              label='DECLINE'
              class="q-space text-white"
              color="white"
              text-color="black"
            />
          </div>
        </div>
      </div>
      <div v-else>
        <div class="q-mx-lg text-h5 text-center lg-font-size">
          Order Created
        </div>
        <div class="q-pt-md sm-font-size">
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Crypto Amount</span>
            <span class="text-nowrap q-ml-xs">{{ formattedCurrency(order.crypto_amount) }} {{ order.crypto_currency.symbol }}</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <span>Fiat Amount</span>
            <span class="text-nowrap q-ml-xs">{{ formattedCurrency(fiatAmount, order.fiat_currency.symbol) }} </span>
          </div>
          <div class="row justify-between no-wrap q-mx-lg bold-text" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
            <span>Status</span>
            <span class="text-nowrap q-ml-xs" :class="order.status.toLowerCase().includes('released') ? 'text-green-6' : 'text-orange-6'">{{ order.status }}</span>
          </div>
        </div>

        <!-- Pending Confirmation -->
        <div class="q-mt-md q-px-md">
          <div class="row">
            <q-icon class="col-auto q-pr-sm" size="sm" name="info" color="blue-6"/>
            <span class="col">
              Please wait for the seller to confirm your order.
            </span>
          </div>
          <div class="row q-pt-md">
            <q-btn
              rounded
              no-caps
              label='Cancel'
              class="q-space text-white"
              style="background-color: #ed5f59;"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-if="!isloaded">
    <div class="row justify-center q-py-lg" style="margin-top: 50px">
      <ProgressLoader/>
    </div>
  </div>
</template>
<script>
import { loadP2PWalletInfo, formatCurrency } from 'src/wallet/ramp'
import { signMessage } from '../../../wallet/ramp/signature.js'
import { thirdparty } from 'ethereumjs-wallet'

import ProgressLoader from 'src/components/ProgressLoader.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      step: 0,
      isloaded: false,

      order: null,
      wallet: null,
      contract: null
    }
  },
  props: {
    orderData: {
      type: Object,
      default: null
    }
  },
  components: {
    ProgressLoader
  },
  emits: ['back'],
  async mounted () {
    console.log('Updated Buying Process')
    const vm = this

    const walletInfo = vm.$store.getters['global/getWallet']('bch')
    vm.wallet = await loadP2PWalletInfo(walletInfo)

    await vm.fetchOrderData()

    if (!vm.order) {
      vm.order = vm.orderData
    }

    vm.stepChecker()
    this.isloaded = true
    console.log(vm.order)
  },
  computed: {
    fiatAmount () {
      return parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price)
    },
    bchBalance () {
      return this.$store.getters['assets/getAssets'][0].balance
    }
  },
  methods: {
    stepChecker () {
      switch (this.order.status) {
        case 'Submitted':
          console.log('submitted')
          this.step = 1
          break
      }
    },
    formattedCurrency (value, currency = null) {
      if (currency) {
        return formatCurrency(value, currency)
      } else {
        return formatCurrency(value)
      }
    },
    async fetchOrderData () {
      const vm = this
      // const timestamp = Date.now()
      // const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_LIST', timestamp)

      await vm.$axios.get(vm.apiURL + '/order/' + vm.orderData.id, {
        headers: {
          'wallet-hash': vm.wallet.walletHash
        }
      })
        .then(response => {
          vm.order = response.data.order
          vm.contract = response.data.contract
          console.log(vm.order)
        })
        .catch(error => {
          console.log(error)
        })
    }
  }
}
</script>
