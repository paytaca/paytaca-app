<template>
  <div :class="getDarkModeClass(darkMode)" class="text-bow">
    <div v-if="isloaded">
      <q-pull-to-refresh @refresh="$emit('refresh')" class="q-mx-lg">
        <div class="q-pt-md text-center text-weight-bold">
          <div class="lg-font-size">
            <span v-if="appeal">{{ appeal.type?.label.toUpperCase() }}</span> <span>{{ orderStatus }}</span>
          </div>
          <div class="text-center subtext md-font-size q-mb-sm">ORDER #{{ data?.order?.id }}</div>
        </div>
        <q-scroll-area :style="`height: ${minHeight - 100}px`" style="overflow-y:auto;">
          <div class="q-px-sm">
            <div v-if="isAppealed">
              <q-card class="q-mt-md pt-card" bordered flat :class="getDarkModeClass(darkMode)">
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
            <!-- Trade Info Card -->
            <TradeInfoCard
              :order="data.order"
              :ad="data.ad"
              @view-ad="showAdSnapshot=true"
              @view-peer="onViewPeer"
              @view-reviews="showReviews=true"
              @view-chat="openChat=true"/>
            <div v-if="displayContractInfo" class="q-mt-md q-mx-sm">
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
              <div
                class="row q-px-md q-pt-sm text-center sm-font-size"
                style="overflow-wrap: break-word;">
                <div v-if="hasLabel" class="row">
                  <q-icon class="col-auto" size="sm" name="mdi-information-outline" color="blue-6"/>&nbsp;
                  <span class="col text-left q-ml-sm">{{ label }}</span>
                </div>
              </div>
            </div>
            <div v-else class="q-mt-md q-px-md q-mb-sm">
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
                  flat
                  no-caps
                  :disable="!data?.wsConnected || countDown !== null"
                  :label="appealBtnLabel"
                  class="q-space text-white"
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
  </div>
  <!-- Dialogs -->
  <div v-if="openDialog">
    <AppealForm
      :order="data?.order"
      @back="openDialog = false"
      />
    <!-- <MiscDialogs
      :type="'appeal'"
      @back="openDialog = false"
      @submit="onSubmitAppeal"
    /> -->
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
  <AdSnapshotDialog v-if="showAdSnapshot" :snapshot-id="data.order?.ad?.id" @back="showAdSnapshot=false"/>
  <UserProfileDialog v-if="showPeerProfile" :user-info="peerInfo" @back="showPeerProfile=false"/>
  <ChatDialog v-if="openChat" :data="data.order" @close="openChat=false"/>
</template>
<script>
import AppealForm from './dialogs/AppealForm.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'
import FeedbackDialog from './dialogs/FeedbackDialog.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import UserProfileDialog from './dialogs/UserProfileDialog.vue'
import AdSnapshotDialog from './dialogs/AdSnapshotDialog.vue'
import TradeInfoCard from './TradeInfoCard.vue'
import ChatDialog from './dialogs/ChatDialog.vue'
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/wallet/ramp/backend'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
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
      lockedPrice: '',
      byFiat: false,
      showAdSnapshot: false,
      showPeerProfile: false,
      openChat: false,
      peerInfo: {},
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100
    }
  },
  props: {
    data: Object
  },
  emits: ['back', 'sendFeedback', 'submitAppeal', 'refresh'],
  components: {
    MiscDialogs,
    FeedbackDialog,
    ProgressLoader,
    UserProfileDialog,
    AdSnapshotDialog,
    TradeInfoCard,
    ChatDialog,
    AppealForm
  },
  computed: {
    appealBtnLabel () {
      if (this.countDown) return `Appealable in ${this.countDown}`
      return 'Submit an appeal'
    },
    showAppealBtn () {
      const stat = ['ESCRW', 'PD_PN', 'PD']
      return stat.includes(this.data?.order?.status.value) && this.data?.order?.appealable_at && !this.countDownLoading
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
    hasReview () {
      const stat = ['RLS', 'RFN']
      return stat.includes(this.data?.order?.status.value)
    },
    hasCancel () {
      const stat = ['SBM', 'CNF', 'ESCRW_PN']
      return stat.includes(this.data?.order?.status.value)
    },
    cryptoAmount () {
      let amount = 0
      if (this.byFiat) {
        amount = this.$parent.formattedCurrency(parseFloat(this.data.order?.crypto_amount) * parseFloat(this.data.order?.locked_price), this.data.order?.ad?.fiat_currency?.symbol)
      } else {
        amount = this.$parent.formattedCurrency(parseFloat(this.data.order?.crypto_amount))
      }
      return amount
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
    setTimeout(() => {
      this.isloaded = true
      // bus.emit('show-chat')
    }, 500)
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
      this.lockedPrice = this.$parent.formattedCurrency(this.data.order?.locked_price, this.data.order?.ad?.fiat_currency?.symbol)
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
    viewUserProfile (user) {
      this.profileInfo = {
        id: user.id,
        self: false
      }
      this.showUserProfile = true
    },
    onViewAd (id) {
      backend.get('/ramp-p2p/ad-snapshot',
        { authorize: true, params: { ad_snapshot_id: id } }
      )
        .then(response => {
          this.adSnapshot = response.data
          this.showAdSnapshot = true
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        })
    },
    onSubmitAppeal (data) {
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

          if (hours > 0) vm.countDown = `${hours} hour(s)`
          else if (minutes > 0) vm.countDown = `${minutes} minute(s)`
          else if (seconds > 0) vm.countDown = `${seconds} second(s)`

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
    },
    onViewPeer (data) {
      this.peerInfo = data
      this.showPeerProfile = true
    }
  }
}
</script>
<style lang="scss" scoped>

.xs-font-size {
  font-size: smaller;
}
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
