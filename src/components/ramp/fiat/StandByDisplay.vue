<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mt-sm text-bow"
    :class="getDarkModeClass(darkMode)"
    :style="`height: ${minHeight}px; background-color: ${darkMode ? '#212f3d' : 'white'}`">
    <div v-if="isloaded">
      <q-btn
        flat
        icon="arrow_back"
        class="button button-text-primary"
        style="position: fixed; left: 20px; top: 135px; z-index: 3;"
        :class="getDarkModeClass(darkMode)"
        @click="$emit('back')"
      />
      <q-pull-to-refresh @refresh="$emit('refresh')" class="q-mx-lg">
        <div class="q-mt-lg q-pt-md text-center text-weight-bold">
          <div class="lg-font-size">
            <span v-if="appeal">{{ appeal.type?.label.toUpperCase() }}</span> <span>{{ orderStatus }}</span>
          </div>
          <div class="text-center subtext md-font-size">ORDER #{{ data?.order?.id }}</div>
          <!-- <div v-if="data?.order?.status?.value !== 'APL' && !isCompletedOrder && $parent.isExpired" :class="statusColor">EXPIRED</div> -->
        </div>
        <q-scroll-area :style="`height: ${minHeight - 150}px`" style="overflow-y:auto;">
          <div v-if="isAppealed">
            <q-card class="br-15 q-mt-md pt-card" bordered flat :class="getDarkModeClass(darkMode)">
              <q-card-section>
                <div class="text-weight-bold md-font-size">Appeal reasons</div>
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
          </div>
          <div class="q-px-sm q-pt-sm">
            <div class="sm-font-size q-pb-xs q-ml-xs">Amount</div>
            <q-input
              class="q-pb-xs md-font-size"
              readonly
              dense
              filled
              :dark="darkMode"
              v-model="cryptoAmount">
              <template v-slot:append>
                <span>{{ data?.order?.ad?.crypto_currency?.symbol }}</span>
              </template>
            </q-input>
            <div class="col text-right sm-font-size q-pl-sm">
              = {{ fiatAmount }} {{ data?.order?.ad?.fiat_currency?.symbol }}
            </div>
          </div>
          <div v-if="displayContractInfo">
            <div class="q-mx-sm">
              <div class="sm-font-size q-pb-xs q-ml-xs">Contract Address</div>
              <q-input
                class="q-pb-xs md-font-size"
                readonly
                dense
                filled
                :dark="darkMode"
                :label="data?.contractAddress">
                <template v-slot:append>
                  <div v-if="data?.contractAddress" @click="copyToClipboard(data?.contractAddress)">
                    <q-icon size="sm" name='o_content_copy' color="blue-grey-6"/>
                  </div>
                </template>
              </q-input>
              <div class="sm-font-size q-py-xs q-ml-xs">Contract Balance</div>
              <q-input
                class="q-pb-xs md-font-size"
                readonly
                dense
                filled
                :loading="!contractBalance"
                :dark="darkMode"
                v-model="contractBalance">
                <template v-slot:append>
                  <span>BCH</span>
                </template>
              </q-input>
            </div>
            <div
              class="row q-px-md q-pt-sm text-center sm-font-size"
              style="overflow-wrap: break-word;">
              <div v-if="hasLabel" class="row">
                <q-icon class="col-auto" size="sm" name="info" color="blue-6"/>&nbsp;
                <span class="col text-left q-ml-sm">{{ label }}</span>
              </div>
            </div>
          </div>
          <!-- Countdown Timer -->
          <div v-else class="q-mt-md q-px-md q-mb-sm">
            <!-- <div
              class="row q-px-sm text-center sm-font-size"
              style="overflow-wrap: break-word;"
              v-if="!$parent.isExpired">
              <div v-if="hasLabel && !forRelease" class="row">
                <q-icon class="col-auto" size="sm" name="info" color="blue-6"/>&nbsp;
                <span class="col text-left q-ml-sm">{{ label }}</span>
              </div>
            </div> -->
              <!-- <div class="text-center" style="font-size: 32px; color: #ed5f59;" v-if="hasCountDown && !forRelease">
                {{ countDown }}
              </div> -->
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
          </div>
          <!-- Appeal Button -->
          <div v-if="showAppealBtn">
            <div class="row q-pt-xs q-px-md">
              <q-btn
                rounded
                no-caps
                :disable="!data?.wsConnected || countDown !== null"
                :label="appealBtnLabel"
                class="q-space text-white button"
                color="blue-6"
                @click="openDialog = true"
              />
            </div>
          </div>
          <!-- Feedback -->
          <div class="q-pt-md q-mx-md" v-if="hasReview">
            <div class="md-font-size text-center">
              <span v-if="!feedbackForm.is_posted">Rate your experience</span>
              <span v-else>Your Review</span>
            </div>
            <!-- <div class="lg-font-size text-weight-bold text-center">{{ nickname }}</div> -->
            <div>
              <div class="q-py-xs text-center">
                <q-rating
                  :readonly="feedbackForm.is_posted"
                  v-model="feedbackForm.rating"
                  size="2em"
                  color="yellow-9"
                  icon="star"
                />
              </div>
              <div class="q-pt-sm q-px-xs">
                <q-input
                  v-if="!feedbackForm.is_posted || (feedbackForm.is_posted && feedbackForm.comment)"
                  v-model="feedbackForm.comment"
                  :dark="darkMode"
                  :readonly="feedbackForm.is_posted"
                  placeholder="Add comment here..."
                  dense
                  outlined
                  autogrow
                  :counter="!feedbackForm.is_posted"
                  maxlength="200"
                />
              </div>
              <div class="row q-pt-xs q-px-xs">
                <q-btn
                  v-if="!feedbackForm.is_posted"
                  :disable="!feedbackForm.rating"
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
      </q-pull-to-refresh>
    </div>
    <!-- Progress Loader -->
    <div v-if="!isloaded">
      <div class="row justify-center q-py-lg" style="margin-top: 50px">
        <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
      </div>
    </div>
  </q-card>
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
      :orderID="data?.order?.id"
      :type="'order-review'"
      @back="openReviews = false"
    />
  </div>
</template>
<script>
import MiscDialogs from './dialogs/MiscDialogs.vue'
import FeedbackDialog from './dialogs/FeedbackDialog.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { backend } from 'src/wallet/ramp/backend'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      authHeaders: this.$store.getters['ramp/authHeaders'],
      nickname: this.$store.getters['ramp/getUser'].name,
      appeal: null,
      isloaded: false,
      countDown: null,
      countDownLoading: true,
      timer: null,
      type: 'ongoing',
      openDialog: false,
      openReviews: false,
      feedbackForm: {
        rating: 0,
        comment: '',
        is_posted: false
      },
      contractBalance: null,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 125 : this.$q.screen.height - 95
    }
  },
  props: {
    data: Object
  },
  emits: ['back', 'sendFeedback', 'submitAppeal', 'refresh'],
  components: {
    MiscDialogs,
    FeedbackDialog,
    ProgressLoader
  },
  computed: {
    appealBtnLabel () {
      if (this.countDown) return `Appealable in ${this.countDown}`
      return 'Appeal'
    },
    showAppealBtn () {
      const stat = ['ESCRW', 'PD_PN', 'PD']
      return stat.includes(this.data?.order?.status.value)
    },
    displayContractInfo () {
      const status = this.data?.order?.status?.value
      return status !== 'SBM' && status !== 'CNF' && status !== 'CNCL'
    },
    isAppealed () {
      return this.data?.order?.status?.value === 'APL'
    },
    isCompletedOrder () {
      return (this.data?.order?.status.value === 'RLS' || this.data?.order?.status.value === 'RFN')
    },
    orderStatus () {
      return this.data?.order?.status?.label?.toUpperCase()
    },
    forRelease () {
      let release = false
      if (this.data?.order?.status.value === 'PD' &&
        (this.data?.order?.trade_type === 'BUY' && this.data?.order?.is_ad_owner)) {
        release = true
      }
      return release
    },
    // hasCountDown () {
    //   const stat = ['ESCRW', 'PD_PN', 'PD', 'RLS_PN']

    //   return stat.includes(this.data?.order?.status.value) && !this.$parent.isExpired
    // },
    hasReview () {
      const stat = ['RLS', 'RFN']
      return stat.includes(this.data?.order?.status.value)
    },
    hasCancel () {
      const stat = ['SBM', 'CNF', 'ESCRW_PN']
      return stat.includes(this.data?.order?.status.value)
    },
    cryptoAmount () {
      return this.$parent.formattedCurrency(this.data?.order?.crypto_amount)
    },
    fiatAmount () {
      let amount = Number(parseFloat(this.data?.order?.crypto_amount) * parseFloat(this.data?.order?.locked_price))
      if (amount > 1) amount = amount.toFixed(2)
      return this.$parent.formattedCurrency(amount)
    },
    statusColor () {
      const stat = this.data?.order?.status.value

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
      return stat.includes(this.data?.order?.status.value)
    },
    label () {
      const labels = {
        SBM: 'Please wait for the Ad Owner  to confirm your order.',
        CNF: 'Please wait for the Seller to Escrow the funds.',
        ESCRW_PN: 'Please wait for the seller to Escrow the funds.',
        ESCRW: 'Please wait for the buyer to send and confirm their fiat payment.',
        PD_PN: 'Please wait for the seller to release the funds.',
        PD: 'Please wait for the fund release.',
        RLS_PN: 'Please wait for the fund release.'
      }
      return labels[this.data?.order?.status.value]
    }
  },
  async mounted () {
    if (this.data?.feedback) {
      this.feedbackForm = this.data?.feedback
    }
    this.loadData()
    setTimeout(() => { this.isloaded = true }, 500)
  },
  beforeUnmount () {
    clearInterval(this.timer)
    this.timer = null
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    loadData () {
      if (this.isAppealed) {
        this.fetchAppeal()
      }
      this.appealCountdown()
      this.checkStatus()
      this.fetchContractBalance()
    },
    fetchAppeal () {
      const vm = this
      backend.get(`/ramp-p2p/order/${vm.data?.order?.id}/appeal`, { authorize: true })
        .then(response => {
          vm.appeal = response.data?.appeal
        })
    },
    fetchContractBalance () {
      const vm = this
      if (this.data?.escrow) {
        vm.data?.escrow?.getBalance(vm.data?.contractAddress)
          .then(balance => {
            vm.contractBalance = balance.toString()
          })
          .catch(error => {
            console.error(error)
          })
      }
    },
    checkStatus () {
      const completedStatus = ['RLS', 'RFN', 'CNCL']
      if (completedStatus.includes(this.data?.order?.status.value)) {
        this.type = 'completed'
      }
    },
    postingFeedback () {
      this.$emit('sendFeedback', this.feedbackForm)
    },
    async onSubmitAppeal (data) {
      this.openDialog = false
      this.$emit('submitAppeal', data)
    },
    appealCountdown () {
      const vm = this
      if (vm.data?.order?.appealable_at) {
        const appealableDate = new Date(vm.data?.order?.appealable_at)
        vm.timer = setInterval(function () {
          const now = new Date().getTime()
          const distance = appealableDate - now

          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((distance % (1000 * 60)) / 1000)

          if (hours > 0) vm.countDown = `${hours}h`
          else if (minutes > 0) vm.countDown = `${minutes}m`
          else if (seconds > 0) vm.countDown = `${seconds}s`

          if (distance < 0) {
            clearInterval(vm.timer)
            vm.countDown = null
          }
          vm.countDownLoading = false
        }, 1000)
      }
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        color: 'blue-9',
        message: this.$t('CopiedToClipboard'),
        icon: 'mdi-clipboard-check',
        timeout: 200
      })
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
.subtext {
  opacity: .5;
}
</style>
