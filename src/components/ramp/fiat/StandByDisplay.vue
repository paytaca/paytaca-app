<template>
  <div v-if="isloaded" class="q-mb-sm q-pb-sm">
    <div class="q-mx-lg text-center bold-text">
      <div class="lg-font-size">
        <span v-if="appeal">{{ appeal.type.label.toUpperCase() }}</span> <span>{{ orderStatus }}</span>
      </div>
      <div class="text-center subtext xs-font-size bold-text">ORDER #{{ order.id }}</div>
      <div v-if="order.status.value !== 'APL' && !isCompletedOrder && $parent.isExpired" :class="statusColor">EXPIRED</div>
    </div>
    <q-scroll-area :style="`height: ${minHeight - 200}px`" style="overflow-y:auto;">
      <div class="q-px-sm q-pt-sm">
        <div class="sm-font-size q-pb-xs text-italic">Amount</div>
        <q-input
          class="q-pb-xs md-font-size"
          readonly
          dense
          filled
          :dark="darkMode"
          v-model="cryptoAmount">
          <template v-slot:append>
            <span class="md-font-size bold-text">{{ order.crypto_currency.symbol }}</span>
          </template>
        </q-input>
        <div class="col text-right sm-font-size q-pl-sm">
          = {{ formattedCurrency($parent.fiatAmount) }} {{ order.fiat_currency.symbol }}
        </div>
      </div>
      <div v-if="order.status.value !== 'SBM' && order.status.value !== 'CNCL'">
        <div class="q-mx-sm">
          <div class="sm-font-size q-pb-xs text-italic">Contract Address</div>
          <q-input class="q-pb-xs" readonly dense filled :dark="darkMode" v-model="contract.address">
          </q-input>
          <div class="sm-font-size q-py-xs text-italic">Balance</div>
          <q-input class="q-pb-xs" readonly dense filled :dark="darkMode" v-model="contract.balance">
            <template v-slot:append>
              <span class="sm-font-size bold-text">BCH</span>
            </template>
          </q-input>
        </div>
      </div>
      <!-- Countdown Timer -->
      <div v-if="order.status.value !== 'APL'" class="q-mt-md q-px-md q-mb-sm">
        <div
          class="row q-px-sm text-center sm-font-size"
          style="overflow-wrap: break-word;"
          v-if="!$parent.isExpired">
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
          <div v-if="order.status.value !== 'APL' && !isCompletedOrder && $parent.isExpired">
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
          </div>
      </div>
      <div v-else>
        <q-card class="br-15 q-mt-md" bordered flat :class="[ darkMode ? 'pt-dark-card' : '',]">
          <q-card-section>
            <div class="bold-text md-font-size">Appeal reasons</div>
            <div v-if="appeal">
              <q-badge
                v-for="reason in appeal.reasons"
                :key="reason"
                rounded
                size="sm"
                outline :color="darkMode ? 'blue-grey-4' : 'blue-grey-6'"
                :label="reason" />
            </div>
          </q-card-section>
        </q-card>
        <!-- <div class="row q-pt-md q-mx-lg">
          <q-btn
            rounded
            no-caps
            label='Chat'
            class="q-space text-white"
            color="blue-6"
            @click="onChat"
          />
        </div> -->
      </div>
      <!-- Feedback -->
      <div class="q-pt-xs q-mx-md" v-if="order.status.value === 'RLS'">
        <div class="md-font-size text-center">
          <span v-if="!feedback.is_posted">Rate your experience</span>
          <span v-else>Your Review</span>
        </div>
        <!-- <div class="lg-font-size bold-text text-center">{{ nickname }}</div> -->
        <div>
          <div class="q-py-xs text-center">
            <q-rating
              :readonly="feedback.is_posted"
              v-model="feedback.rating"
              size="2em"
              color="yellow-9"
              icon="star"
            />
          </div>
          <div class="q-pt-sm q-px-xs">
            <q-input
              v-if="!feedback.is_posted || (feedback.is_posted && feedback.comment)"
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
          <div class="row q-pt-xs q-px-xs">
            <q-btn
              v-if="!feedback.is_posted"
              :disable="!feedback.rating"
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
          <div class="text-center text-blue md-font-size q-mt-md" @click="openReviews = true">See all reviews</div>
        </div>
      </div>
    </q-scroll-area>
  </div>

  <!-- Dialogs -->
  <div v-if="openDialog">
    <MiscDialogs
      :type="'appeal'"
      @back="openDialog = false"
      @submit="onSubmitAppeal"
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

  <!-- Feedback Dialog -->
  <div v-if="openReviews">
    <FeedbackDialog
      :openReviews="openReviews"
      :orderID="order.id"
      :type="'order-review'"
      @back="openReviews = false"
    />
  </div>
</template>
<script>
import MiscDialogs from './dialogs/MiscDialogs.vue'
import FeedbackDialog from './dialogs/FeedbackDialog.vue'
import { bus } from 'src/wallet/event-bus.js'
import { formatCurrency } from 'src/wallet/ramp'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      authHeaders: this.$store.getters['ramp/authHeaders'],
      nickname: this.$store.getters['ramp/getUser'].name,
      order: null,
      appeal: null,
      contract: {
        address: null,
        balance: null
      },
      isloaded: false,
      countDown: '',
      timer: null,
      type: 'ongoing',
      openDialog: false,
      openReviews: false,
      feedback: {
        rating: 0,
        comment: '',
        is_posted: false
      },
      minHeight: this.$q.screen.height - this.$q.screen.height * 0.25
      // minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (95 + 120) : this.$q.screen.height - (70 + 100)
    }
  },
  props: {
    orderId: Number,
    feedbackData: Object,
    rampContract: Object
  },
  emits: ['sendFeedback', 'submitAppeal'],
  components: {
    MiscDialogs,
    FeedbackDialog
  },
  computed: {
    isCompletedOrder () {
      return (this.order.status.value === 'RLS' || this.order.status.value === 'RFN')
    },
    orderStatus () {
      return this.order.status.label.toUpperCase()
    },
    forRelease () {
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
        RLS_PN: 'Please wait for the fund release.'
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
    getContractBalance () {
      const vm = this
      if (this.rampContract) {
        vm.rampContract.getBalance()
          .then(balance => {
            vm.contract.balance = balance
          })
          .catch(error => {
            console.error(error)
          })
      }
    },
    async fetchOrderDetail () {
      const vm = this
      const url = vm.apiURL + '/order/' + vm.orderId
      try {
        const response = await vm.$axios.get(url, { headers: vm.authHeaders })
        vm.order = response.data.order
        vm.contract.address = response.data.contract.address
        vm.appeal = response.data.appeal
        if (vm.contract.address && vm.contract.balance === null) {
          vm.getContractBalance()
        }
      } catch (error) {
        console.error(error.response)
        if (error.response && error.response.status === 403) {
          bus.emit('session-expired')
        }
      }
    },
    checkStatus () {
      const completedStatus = ['RLS', 'RFN', 'CNCL']
      if (completedStatus.includes(this.order.status.value)) {
        this.type = 'completed'
      }
    },
    postingFeedback () {
      this.$emit('sendFeedback', this.feedback)
    },
    async onSubmitAppeal (data) {
      this.openDialog = false
      this.$emit('submitAppeal', data)
    },
    onChat () {
      console.log('chat clicked')
    },
    paymentCountdown () {
      const vm = this

      if (vm.order.expiration_date) {
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
    },
    formattedCurrency (value, currency = null) {
      if (currency) {
        return formatCurrency(value, currency)
      } else {
        return formatCurrency(value)
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.sm-font-size {
  font-size: small;
}
.md-font-size {
  font-size: medium;
}

.lg-font-size {
  font-size: large;
}

.bold-text {
  font-weight: bold;
}
.subtext {
  opacity: .5;
}
.button-color {
  background: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
  color: white
}
</style>
