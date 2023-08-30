<template>
  <div v-if="isloaded" class="q-mb-sm q-pb-sm">
    <div class="q-mx-lg text-h5 text-center lg-font-size bold-text" :class="statusColor">
      <span v-if="$parent.isExpired">EXPIRED</span>
      <span v-else>{{ orderStatus }}</span>
    </div>
    <div class="text-center subtext xs-font-size bold-text">( Order #{{ order.id }} )</div>
    <div class="q-px-sm q-pt-sm">
      <div class="sm-font-size q-pb-xs">Fiat Amount</div>
      <q-input class="q-pb-xs" disable dense filled :dark="darkMode" v-model="$parent.fiatAmount">
        <template v-slot:prepend>
          <span class="sm-font-size bold-text">{{ order.fiat_currency.symbol }}</span>
        </template>
      </q-input>

      <div class="text-center q-py-xs">
        <q-icon size="md" name="mdi-swap-vertical" />
      </div>

      <div class="sm-font-size q-pb-xs">Crypto Amount</div>
      <q-input class="q-pb-xs" disable dense filled :dark="darkMode" v-model="cryptoAmount">
        <template v-slot:prepend>
          <span class="sm-font-size bold-text">{{ order.crypto_currency.symbol }}</span>
        </template>
      </q-input>
    </div>

    <!-- <q-separator :dark="darkMode" class="q-mt-md q-mx-md"/> -->

    <!-- Countdown Timer -->
    <div class="q-mt-md q-px-md q-mb-lg">
      <div class="row q-px-sm text-center sm-font-size" style="overflow-wrap: break-word;" v-if="!$parent.isExpired">
        <div v-if="hasLabel && !forRelease" class="row">
          <q-icon class="col-auto" size="sm" name="info" color="blue-6"/>&nbsp;
          <span class="col text-left q-ml-sm">{{ label }}</span>
        </div>
      </div>

      <div class="text-center" style="font-size: 32px; color: #ed5f59;" v-if="hasCountDown && !forRelease">
        {{ countDown }}
      </div>

      <!-- Cancel Button -->
      <div class="row q-pt-md" v-if="type === 'ongoing' && hasCancel">
        <q-btn
          rounded
          no-caps
          label='Cancel Order'
          class="q-space text-white"
          style="background-color: #ed5f59;"
          @click="$parent.cancellingOrder()"
        />
      </div>

      <!-- Appeal Button -->
      <div v-if="$parent.isExpired">
        <div class="row q-pt-md">
          <q-btn
            rounded
            no-caps
            label='Appeal'
            class="q-space text-white"
            color="blue-6"
            @click="openDialog = true"
          />
        </div>
        <div class="q-pt-md sm-font-size q-px-md">
          <div class="bold-text">
            Seller did not release the crypto?
          </div>
          <div class="subtext q-px-sm">
            If the seller still has not release the crypto after the Payment Time Limit, please submit an appeal.
          </div>
        </div>
      </div>

      <!-- Feedback -->
      <div class="q-pt-md" v-if="order.status.value === 'RLS'">
        <div class="text-center bold-text md-font-size subtext">
          <span v-if="!feedback.is_posted">Rate your Experience</span>
          <span v-else>Your Review</span>
        </div>
        <div class="lg-font-size bold-text text-center">{{ nickname }}</div>
        <div class="text-center">
          <div class="q-py-xs">
            <q-rating
              :readonly="feedback.is_posted"
              v-model="feedback.rating"
              size="2.5em"
              color="yellow-9"
              icon="star"
            />
          </div>
          <div class="q-pt-sm q-px-xs">
            <q-input
              v-model="feedback.comment"
              :dark="darkMode"
              :readonly="feedback.is_posted"
              placeholder="Add comment here..."
              dense
              outlined
              autogrow
              :counter="!feedback.is_posted"
              maxlength="200"
            />
          </div>
          <div class="row q-pt-xs q-px-xs q-py-sm">
            <q-btn
              v-if="!feedback.is_posted"
              :disable="!feedback.comment || !feedback.rating"
              rounded
              label='Post Review'
              class="q-space text-white"
              color="blue-8"
              @click="postingFeedback"
            />
            <!-- <q-btn
              v-else
              rounded
              label='Edit Review'
              class="q-space text-white"
              color="blue-8"
            /> -->
          </div>
          <div class="text-center text-blue-5 md-font-size">View all Reviews</div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="openDialog">
    <MiscDialogs
      :type="'appeal'"
      @back="openDialog = false"
    />
      <div class="row q-pt-xs q-mb-lg q-pb-lg q-mx-md" v-if="forRelease">
        <q-btn
          rounded
          label='Release Crypto'
          class="q-space text-white"
          color="blue-6"
          @click="$parent.releasingCrypto()"
        />
      </div>
  </div>
</template>
<script>
import MiscDialogs from './dialogs/MiscDialogs.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      nickname: this.$store.getters['ramp/getUser'].nickname,
      order: null,
      isloaded: false,
      countDown: '',
      timer: null,
      type: 'ongoing',
      openDialog: false,
      feedback: {
        rating: 0,
        comment: '',
        is_posted: false
      },
      minHeight: this.$q.screen.height - 195
    }
  },
  props: {
    orderId: Number,
    wallet: Object,
    feedbackData: Object
  },
  emits: ['sendFeedback'],
  components: {
    MiscDialogs
  },
  computed: {
    orderStatus () {
      return this.order.status.label.toUpperCase()
    },
    forRelease () {
      // console.log('order:', this.order)
      let release = false
      if (this.order.status.value === 'PD' &&
        (this.order.trade_type === 'BUY' && this.order.is_ad_owner)) {
        release = true
      }
      return release
    },
    hasCountDown () {
      const stat = ['ESCRW', 'PD_PN', 'PD', 'RLS_PN']

      return stat.includes(this.order.status.value) && !this.$parent.isExpired
    },
    hasCancel () {
      const stat = ['SBM', 'CNF', 'ESCRW_PN']
      return stat.includes(this.order.status.value)
    },
    cryptoAmount () {
      return this.$parent.formattedCurrency(this.order.crypto_amount)
    },
    statusColor () {
      const stat = this.order.status.value

      if (stat === 'RLS') {
        return 'text-green-6'
      } else if (stat === 'CNCL' || this.$parent.isExpired) {
        return 'text-red-6'
      } else {
        return ''
      }
    },
    hasLabel () {
      const stat = ['SBM', 'CNF', 'ESCRW_PN', 'ESCRW', 'PD_PN', 'PD', 'RLS_PN']
      return stat.includes(this.order.status.value)
    },
    label () {
      const labels = {
        SBM: 'Please wait for the Ad Owner  to confirm your order.',
        CNF: 'Please wait for the Seller to Escrow the funds.',
        ESCRW_PN: 'Please wait for the seller to Escrow the funds.',
        ESCRW: 'Please wait for the buyer to confirm their fiat payment.',
        PD_PN: 'Please wait for the seller to confirm your fiat payment.',
        PD: 'Please wait for the fund release.',
        RLS_PN: 'Please wait for the fund release.',
      }
      return labels[this.order.status.value]
    }
  },
  async mounted () {
    if (this.feedbackData) {
      this.feedback = this.feedbackData
    }
    await this.fetchOrderDetail()
    this.paymentCountdown()
    this.checkStatus()
    this.isloaded = true
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
        // console.log('response: ', response)
        vm.order = response.data.order
      } catch (error) {
        console.error(error.response)
      }
    },
    checkStatus () {
      const completedStatus = ['RLS', 'RFN', 'CNCL']
      if (completedStatus.includes(this.order.status.value)) {
        this.type = 'completed'
      }
    },
    async postingFeedback () {
      // console.log('feedback: ', this.feedback)
      await this.$emit('sendFeedback', this.feedback)
    },
    paymentCountdown () {
      const vm = this
      const expiryDate = new Date(vm.order.expiration_date)

      vm.timer = setInterval(function () {
        const now = new Date().getTime()
        const distance = expiryDate - now

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
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
.button-color {
  background: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
  color: white
}
</style>
