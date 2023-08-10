<template>
  <div v-if="isloaded">
    <div class="q-mx-lg text-h5 text-center lg-font-size" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
      PAY BY FIAT
    </div>

    <!-- Fiat Input -->
    <div class="q-mt-md q-mx-lg q-px-md">
      <div v-if="type === 'buyer'" class="sm-font-size subtext q-pb-xs q-pl-sm">Please pay the seller</div>
      <div v-else class="sm-font-size subtext q-pb-xs q-pl-sm">You will recieve</div>
      <div @click="$parent.copyToClipboard($parent.fiatAmount)">
        <q-input class="q-pb-xs" disable filled :dark="darkMode" v-model="$parent.fiatAmount" :rules="[$parent.isValidInputAmount]">
          <template v-slot:prepend>
            <span class="sm-font-size bold-text">{{ order.fiat_currency.symbol }}</span>
          </template>
          <template v-slot:append>
            <q-icon  class="q-pr-sm" size="sm" name='o_content_copy' color="blue-grey-6"/>
          </template>
        </q-input>
      </div>
      <!-- <div class="text-right bold-text subtext sm-font-size q-pr-sm"> ≈ {{ $parent.formattedCurrency($parent.cryptoAmount) }} BCH</div> -->
    </div>
    <div class="q-pt-sm text-center">
      <span class="sm-font-size subtext">within</span>
      <div style="font-size: 40px; color: #ed5f59;"> {{ countDown }}</div>
    </div>

    <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/>

    <div class="q-mx-lg q-px-md q-pt-md">

      <!-- Buyer -->
      <div v-if="type === 'buyer'">
        <div class="xm-font-size q-pb-xs q-pl-sm text-center bold-text">Payment Methods</div>
        <div class="full-width">
          <q-scroll-area style="height:33vh;overflow-y:auto;">
            <div
              v-for="(method, index) in order.payment_methods"
              :key="index">
              <div class="q-px-md">
                <q-card flat bordered>
                  <q-item style="background-color: rgb(242,242,242);">
                    <q-item-section class="bold-text subtext">
                      {{ method.payment_type }}
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section class="text-center">
                      {{ method.account_number }}
                    </q-item-section>
                  </q-item>
                </q-card>
              </div>
            </div>
          </q-scroll-area>
        </div>
      </div>

      <!-- Seller -->
      <div  class="text-center" v-if="type === 'seller'" style="overflow-y:auto;">
        <q-icon size="xs" name='o_info' color="blue-6"/> Please click "Confirm" if you recieved the fiat payment
      </div>

      <!-- Confirm  -->
      <div class="row q-pt-lg q-mx-lg q-px-md">
        <q-btn
          rounded
          no-caps
          label='CONFIRM PAYMENT'
          class="q-space text-white"
          color="blue-6"
          @click="$emit('confirm')"
        />
      </div>
    </div>
  </div>
</template>
<script>

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      order: null,
      isloaded: false,
      countDown: '',
      timer: null
    }
  },
  props: {
    orderData: Object,
    type: String
  },
  emits: ['confirm'],
  async mounted () {
    const vm = this

    vm.order = vm.orderData
    await vm.paymentCountdown()

    vm.isloaded = true
  },
  beforeUnmount () {
    clearInterval(this.timer)
    this.timer = null
  },
  methods: {
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
