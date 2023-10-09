<template>
  <div v-if="isloaded">
    <div class="q-mx-lg text-h5 text-center lg-font-size bold-text">
      <span v-if="type === 'buyer'">PAY BY FIAT</span>
      <span v-else>RECEIVE FIAT</span>
    </div>
    <div style="opacity: .5;" class="text-center q-pb-sm xs-font-size bold-text">( Order #{{ order.id }} )</div>
    <q-separator :dark="darkMode" class="q-mx-lg"/>
    <q-scroll-area :style="`height: ${minHeight - minHeight * 0.2}px`" style="overflow-y:auto;">
      <div class="q-mt-md q-mx-lg q-px-md">
        <div v-if="type === 'buyer'" class="sm-font-size q-pb-xs">Please pay the seller</div>
        <div v-else class="sm-font-size q-pb-xs">Expect fiat payment of</div>
        <div @click="$parent.copyToClipboard($parent.fiatAmount)">
          <q-input class="q-pb-xs" dense disable filled :dark="darkMode" v-model="$parent.fiatAmount" :rules="[$parent.isValidInputAmount]">
            <template v-slot:prepend>
              <span class="sm-font-size bold-text">{{ order.fiat_currency.symbol }}</span>
            </template>
            <template v-slot:append v-if="type === 'buyer'">
              <q-icon  class="q-pr-sm" size="sm" name='o_content_copy' color="blue-grey-6"/>
            </template>
          </q-input>
        </div>
        <!-- <div class="text-right bold-text subtext sm-font-size q-pr-sm"> ≈ {{ $parent.formattedCurrency($parent.cryptoAmount) }} BCH</div> -->
      </div>
      <div class="q-pt-sm text-center">
        <span class="sm-font-size">within</span>
        <div style="font-size: 36px; color: #ed5f59;"> {{ countDown }}</div>
      </div>

      <div class="q-mx-md q-px-md q-pt-sm">
        <!-- Buyer -->
        <div v-if="type === 'buyer'" class="q-pb-xs">
          <div class="xm-font-size q-pb-xs q-pl-sm text-left bold-text">Payment Methods</div>
          <div class="full-width">
              <div v-for="(method, index) in paymentMethods" :key="index">
                <div class="q-px-sm">
                  <q-card flat bordered>
                    <q-expansion-item
                      class="bg-grey-2"
                      :default-opened=true
                      :label="method.payment_type"
                      expand-separator>
                      <q-card>
                        <q-card-section class="text-left">
                          <div class="row">
                            <div class="col">
                              <div>{{ method.account_name }}</div>
                              <div>{{ method.account_number }}</div>
                            </div>
                            <div>
                              <q-checkbox v-model="method.selected" @click="selectPaymentMethod(method)"/>
                            </div>
                          </div>
                        </q-card-section>
                      </q-card>
                    </q-expansion-item>
                  </q-card>
                </div>
              </div>
          </div>
        </div>

        <!-- Seller -->
        <!-- <div  class="text-center" v-if="type === 'seller'" style="overflow-y:auto;">
          <q-icon size="xs" name='o_info' color="blue-6"/> Please click "Confirm" if you recieved the fiat payment
        </div> -->

      </div>
      <!-- Checkbox -->
      <div class="q-mb-lg q-pb-lg">
        <div class="q-mx-lg q-px-md">
          <div v-if="type === 'seller'">
            <q-checkbox size="sm" v-model="confirmRelease"/>
            <span class="xs-font-size text-center">I confirm that I have received payment.</span>
          </div>

          <div v-if="type === 'buyer'">
            <q-checkbox size="sm" v-model="confirmPayment"/>
            <span class="xs-font-size text-center"> I confirm that I already sent my payment</span>
          </div>
        </div>

        <!-- Confirm  -->
        <div class="row q-pt-sm q-mx-lg q-px-md">
          <q-btn
            v-if="type === 'seller'"
            :disable="!confirmRelease"
            rounded
            label='Release Crypto'
            class="q-space text-white"
            color="blue-6"
            @click="onConfirm"
          />
          <q-btn
            v-else
            :disable="!confirmPayment || selectedPaymentMethods.length === 0"
            rounded
            label='Confirm Payment'
            class="q-space text-white"
            color="blue-6"
            @click="onConfirm"
          />
        </div>
      </div>
    </q-scroll-area>
  </div>
</template>
<script>

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      order: null,
      isloaded: false,
      countDown: '',
      timer: null,
      confirmPayment: false,
      confirmRelease: false,
      paymentMethods: [],
      selectedPaymentMethods: [],
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (95 + 120) : this.$q.screen.height - (70 + 100)
    }
  },
  props: {
    wallet: {
      type: Object,
      default: null
    },
    orderId: Number,
    type: String
  },
  emits: ['confirm'],
  async mounted () {
    const vm = this
    await vm.fetchOrderDetail()
    vm.paymentCountdown()

    if (vm.type === 'buyer') {
      this.confirmRelease = true
    } else {
      this.confirmPayment = true
    }

    vm.isloaded = true
  },
  beforeUnmount () {
    clearInterval(this.timer)
    this.timer = null
  },
  methods: {
    async fetchOrderDetail () {
      const vm = this
      const headers = {
        'wallet-hash': vm.wallet.walletHash
      }
      const url = vm.apiURL + '/order/' + vm.orderId

      try {
        const response = await vm.$axios.get(url, { headers: headers })
        vm.order = response.data.order
        vm.paymentMethods = response.data.order.ad.payment_methods.map(method => {
          return { ...method, selected: false }
        })
      } catch (error) {
        console.error(error.response)
      }
    },
    selectPaymentMethod (method) {
      if (method.selected) {
        this.selectedPaymentMethods.push(method.id)
      } else {
        const index = this.selectedPaymentMethods.indexOf(method.id)
        if (index > -1) {
          this.selectedPaymentMethods.splice(index, 1)
        }
      }
    },
    onConfirm () {
      this.$emit('confirm', this.selectedPaymentMethods)
    },
    paymentCountdown () {
      const vm = this

      const expiryDate = new Date(vm.order.expiration_date)

      vm.timer = setInterval(function () {
        const now = new Date().getTime()
        const distance = expiryDate - now

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        let seconds = Math.floor((distance % (1000 * 60)) / 1000)
        if (seconds.toString().length < 2) {
          seconds = '0' + seconds
        }
        if (minutes.toString().length < 2) {
          minutes = '0' + minutes
        }

        vm.countDown = `${hours}:${minutes}:${seconds}`

        if (distance < 0) {
          clearInterval(vm.timer)
          vm.countDown = 'Expired'
          // vm.order.status = 'Expired'
          // vm.shiftExpired = true
        }
      }, 1000)
    }
  }
}
</script>
<style lang="scss" scoped>
.subtext {
  opacity: .5;
}
</style>
