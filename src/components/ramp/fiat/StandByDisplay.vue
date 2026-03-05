<template>
  <div :class="getDarkModeClass(darkMode)" class="text-bow">
    <div v-if="isloaded">
      <div class="q-px-sm q-mx-lg">
        <div v-if="isAppealed">
          <q-card class="q-mt-md pt-card" bordered flat :class="getDarkModeClass(darkMode)">
            <q-card-section>
              <div class="text-weight-bold md-font-size">{{ $t('AppealReasons') }}</div>
              <div v-if="appeal">
                <q-badge
                  v-for="reason in appeal.reasons"
                  :key="reason"
                  rounded
                  size="sm"
                  outline :color="darkMode ? 'blue-grey-4' : 'blue-grey-6'"
                  class="q-mr-xs"
                  :label="reason" />
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div v-if="displayContractInfo" class="q-mt-sm q-mx-sm">
          <div class="sm-font-size q-pb-xs q-ml-xs">{{ $t('Arbiter') }}</div>
          <q-input
            class="q-pb-xs md-font-size"
            readonly
            dense
            filled
            :dark="darkMode"
            :label="data?.arbiter?.address"
            v-model="arbiterName">
          </q-input>
          <div class="sm-font-size q-py-xs q-ml-xs">{{ $t('ContractAddress') }}</div>
          <q-input
            class="q-pb-xs md-font-size"
            readonly
            dense
            filled
            :dark="darkMode"
            :label="data.contractAddress">
            <template v-slot:append>
              <div v-if="data?.contractAddress">
                <q-icon size="sm" name='open_in_new' color="blue-grey-6" @click="openURL(explorerLink('address'))"/>
                <q-icon size="sm" name='o_content_copy' color="blue-grey-6" @click="copyToClipboard(data?.contractAddress)"/>
              </div>
            </template>
          </q-input>
          <div v-if="data?.order?.status?.value === 'RLS'">
            <div class="sm-font-size q-py-xs q-ml-xs">{{ $t('TransactionId') }}</div>
            <q-input
              class="q-pb-xs md-font-size"
              readonly
              dense
              filled
              :dark="darkMode"
              :label="txid">
              <template v-slot:append>
                <q-icon size="sm" name='open_in_new' color="blue-grey-6" @click="openURL(explorerLink())"/>
                <q-icon size="sm" name='o_content_copy' color="blue-grey-6" @click="copyToClipboard(txid)"/>
              </template>
            </q-input>
          </div>
          <div class="sm-font-size q-py-xs q-ml-xs">{{ $t('ContractBalance') }}</div>
          <q-input
            class="q-pb-xs md-font-size"
            readonly
            dense
            filled
            :dark="darkMode"
            v-model="contractBalance">
            <template v-slot:append>
              <span>BCH</span>
            </template>
          </q-input>
        </div>
        <!-- Payment methods -->
        <div v-if="showSelectedPaymentMethod" class="q-px-xs q-pt-sm">
          <div class="md-font-size q-pb-xs q-pl-sm text-center text-weight-bold">PAYMENT METHODS</div>
            <div class="text-center sm-font-size q-mx-md q-mb-sm">
            <span v-if="userType === 'buyer'">You selected the following payment methods</span>
            <span v-if="userType === 'seller'">The buyer selected the following payment methods</span>
          </div>
          <div class="full-width">
            <div v-for="(method, index) in data?.order?.payment_methods_selected" :key="index">
              <div class="q-px-sm q-py-xs">
                <q-card flat bordered :dark="darkMode">
                  <q-expansion-item
                    class="pt-card text-bow"
                    :class="getDarkModeClass(darkMode, '', 'bg-grey-2')"
                    :default-opened=true
                    :label="method.payment_type"
                    expand-separator >
                    <q-card class="row no-wrap q-py-sm q-px-md pt-card" :class="getDarkModeClass(darkMode)">
                      <div class="col">
                        <div class="row">
                          <div class="col q-pr-sm q-py-xs">
                            <div v-for="(field, index) in method.values" :key="index">
                              <div v-if="field.value">{{ field.field_reference.fieldname }}:</div>
                              <div v-if="field.value" class="q-ml-sm text-weight-bold">
                                {{ field.value }}
                                <q-icon size="1em" name='o_content_copy' color="blue-grey-6" @click="copyToClipboard(field.value)"/>
                              </div>
                            </div>
                            <div v-for="(field, index) in method.dynamic_values" :key="index">
                              {{ field.fieldname }}
                              <div class="q-ml-sm text-weight-bold">
                                {{ dynamicVal(field) }}
                                <q-icon size="1em" name='o_content_copy' color="blue-grey-6" @click="copyToClipboard(dynamicVal(field))"/>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div v-if="method.attachments?.length > 0" class="row">
                          <q-btn
                            flat dense no-caps
                            icon="image"
                            class="row button button-text-primary q-my-none q-py-none"
                            label="View Proof of Payment"
                            style="font-size: small;"
                            @click="viewPaymentAttachment(method.attachments[0].image?.url)"/>
                        </div>
                        <div v-else>
                          <span class="text-primary">
                            {{ (data?.order?.status?.value === 'PD_PN' || data?.order?.status?.value === 'PD' || data?.order?.status?.value === 'RLS')
                              ? 'Proof of payment not available yet'
                              : 'Uploading Proof of Payment'
                            }}
                            <q-icon name="refresh" color="primary" size="xs" @click="$emit('refresh')"/>
                          </span>
                        </div>
                      </div>
                    </q-card>
                  </q-expansion-item>
                </q-card>
              </div>
            </div>
          </div>
        </div>
        <!-- Instruction message -->
        <div v-if="hasLabel" class="important-alert-wrapper q-px-md q-pt-md q-pb-sm">
          <q-card 
            flat 
            bordered
            class="important-alert-card pulse-animation"
            :class="[getDarkModeClass(darkMode), getAlertColorClass]">
            <q-card-section class="row items-center q-pa-md">
              <q-icon 
                class="col-auto important-alert-icon" 
                size="32px" 
                name="mdi-alert-circle" 
                :color="getIconColor"/>
              <div class="col q-ml-md important-alert-text">
                {{ label }}
              </div>
            </q-card-section>
          </q-card>
        </div>
        <!-- Cancel order button -->
        <div v-if="!displayContractInfo" class="q-mt-sm q-px-md q-mb-sm">
          <div class="row q-pt-sm" v-if="type === 'ongoing' && hasCancel">
            <q-btn
              :loading="loadCancelButton"
              :disable="loadCancelButton"
              rounded
              no-caps
              :label="$t('CancelOrder')"
              class="q-space text-white"
              style="background-color: #ed5f59;"
              @click="$emit('cancelOrder')"
            />
          </div>
        </div>
        <!-- Appeal Button -->
        <div v-if="showAppealBtn">
          <!-- Countdown until appeal becomes available -->
          <div v-if="showAppealCountdown" class="q-pt-xs q-px-md">
            <q-card flat bordered class="pt-card appeal-countdown-card" :class="getDarkModeClass(darkMode)">
              <q-card-section class="row items-center q-pa-md">
                <q-icon name="schedule" size="22px" :color="darkMode ? 'grey-4' : 'grey-7'" />
                <div class="col q-ml-md">
                  <div class="text-weight-bold">{{ $t('AppealableInSeconds', { countdown: appealCountdownDisplay }, `Appealable in ${appealCountdownDisplay}`) }}</div>
                  <div class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                    {{ $t('AppealCountdownHelper', {}, 'If the other party is unresponsive, you can submit an appeal once the timer ends.') }}
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Prominent appeal CTA once available -->
          <div v-else class="row q-pt-xs q-px-md appeal-cta-wrapper">
            <q-btn
              :loading="loadAppealButton"
              :disable="loadAppealButton"
              unelevated
              rounded
              no-caps
              icon="gavel"
              :label="$t('SubmitAnAppeal')"
              class="q-space appeal-btn-cta"
              color="negative"
              @click="openDialog = true"
            />
          </div>
        </div>
        <!-- Feedback -->
        <div class="q-pt-none q-mx-md md-font-size text-center" v-if="hasReview">
          <q-btn no-caps flat color="primary" @click="openReviewForm = true">{{ feedback ? $t('ViewMyFeedback') : $t('SubmitFeedback') }}</q-btn>
        </div>
      </div>
    </div>
  </div>
  <!-- Dialogs -->
  <div v-if="openDialog">
    <AppealForm :userType="orderUserType" :order="data?.order" @back="openDialog = false" @loadAppeal="loadAppealButton = true"/>
      <div class="row q-pt-xs q-mb-lg q-pb-lg q-mx-md" v-if="forRelease">
        <q-btn
          rounded
          :label="$t('ReleaseCrypto')"
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
  <FeedbackForm
    v-if="isloaded && hasReview && openReviewForm"
    :order-id="data.order?.id"
    :counter-party="counterparty"
    :arbiter="data.order?.arbiter"
    @back="openReviewForm = false"
    @submit="onSubmitFeedback"/>
  <AttachmentDialog :show="showAttachmentDialog" :url="attachmentUrl" @back="showAttachmentDialog=false"/>
</template>
<script>
import AppealForm from './dialogs/AppealForm.vue'
import FeedbackDialog from './dialogs/FeedbackDialog.vue'
import FeedbackForm from './dialogs/FeedbackForm.vue'
import { openURL } from 'quasar'
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/exchange/backend'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getExplorerLink, getExplorerAddressLink } from 'src/utils/send-page-utils'
import { formatCurrency } from 'src/exchange'
import AttachmentDialog from 'src/components/ramp/fiat/dialogs/AttachmentDialog.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      nickname: this.$store.getters['ramp/getUser']?.name,
      appeal: null,
      isloaded: false,
      appealCountdownSeconds: null, // number | null
      appealCountdownLoading: true,
      timer: null,
      type: 'ongoing',
      openDialog: false,
      openReviews: false,
      openReviewForm: !this.data?.feedback || false,
      feedback: {},
      contractBalance: null,
      lockedPrice: '',
      byFiat: false,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100,
      showAttachmentDialog: false,
      attachmentUrl: null,
      loadCancelButton: false,
      loadAppealButton: false
    }
  },
  props: {
    data: Object
  },
  emits: ['back', 'sendFeedback', 'refresh', 'cancelOrder'],
  components: {
    FeedbackDialog,
    AppealForm,
    FeedbackForm,
    AttachmentDialog
  },
  computed: {
    showSelectedPaymentMethod () {
      if (this.data?.order?.payment_methods_selected?.length === 0) return false

      const status = this.data?.order?.status?.value
      return status === 'PD_PN' || status === 'PD' || status === 'RFN' || status === 'RLS'
    },
    arbiterName () {
      return this.data?.arbiter?.name
    },
    orderUserType () {
      const vm = this
      let userType = null
      if (vm.data?.ad?.trade_type === 'SELL') {
        userType = vm.data?.order.is_ad_owner ? 'seller' : 'buyer'
      } else if (vm.data?.ad?.trade_type === 'BUY') {
        userType = vm.data?.order.is_ad_owner ? 'buyer' : 'seller'
      }
      return userType
    },
    appealCountdownDisplay () {
      const seconds = Number(this.appealCountdownSeconds)
      if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
      const hrs = Math.floor(seconds / 3600)
      const mins = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      const pad2 = (n) => String(n).padStart(2, '0')
      if (hrs > 0) return `${pad2(hrs)}:${pad2(mins)}:${pad2(secs)}`
      return `${pad2(mins)}:${pad2(secs)}`
    },
    isAppealTimeLocked () {
      const appealableAt = this.data?.order?.appealable_at
      if (!appealableAt) return false
      const appealableDate = new Date(appealableAt)
      const now = Date.now()
      return Number.isFinite(appealableDate?.getTime?.()) && appealableDate.getTime() > now
    },
    showAppealCountdown () {
      // Only show countdown if backend provided an appealable_at and we're still waiting
      return !!this.data?.order?.appealable_at &&
        !this.appealCountdownLoading &&
        Number(this.appealCountdownSeconds) > 0
    },
    showAppealBtn () {
      const stat = ['ESCRW', 'PD_PN', 'PD', 'CNCL']
      const statusAppealable = stat.includes(this.data?.order?.status.value)
      const hasFundedContract = !!this.data?.contractAddress && this.contractBalance > 0
      // If backend provided appealable_at and it's still in the future, never show the CTA (show countdown instead).
      if (statusAppealable && this.isAppealTimeLocked) return true
      // Otherwise, show appeal section only when either contract is funded or backend tells us appealability is known.
      return statusAppealable && (hasFundedContract || (!!this.data?.order?.appealable_at && !this.appealCountdownLoading))
    },
    displayContractInfo () {
      const status = this.data?.order?.status?.value
      return (this.data?.contractAddress && status !== 'SBM' && status !== 'CNF')
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
      const status = this.data?.order?.status?.value

      // When appeal CTA is available, clarify that the user can submit an appeal.
      // (Only applied to the ESCRW seller-waiting state to match the requested copy.)
      // IMPORTANT: `appealCountdownSeconds` starts as null; `Number(null) === 0` is true.
      // Require a non-null countdown value to avoid showing the "with appeal" label
      // when the countdown was never started / appeal wasn't initialized.
      const hasAppealCountdownValue = this.appealCountdownSeconds !== null && this.appealCountdownSeconds !== undefined
      const appealCtaVisible = this.showAppealBtn &&
        !this.showAppealCountdown &&
        !this.isAppealTimeLocked &&
        hasAppealCountdownValue &&
        Number(this.appealCountdownSeconds) === 0
      if (status === 'ESCRW' && appealCtaVisible) {
        return this.$t(
          'StandByDisplayLabelEscrwWithAppeal',
          {},
          'Please wait for the buyer to send and confirm their fiat payment or submit an appeal to release your BCH from the escrow contract.'
        )
      }
      if (status === 'PD_PN' && appealCtaVisible) {
        return this.$t(
          'StandByDisplayLabelPdPnWithAppeal',
          {},
          'Please wait for the seller to release the funds. If the seller is unresponsive, you may submit an appeal.'
        )
      }

      const labels = {
        SBM: this.$t('StandByDisplayLabelSbm'),
        CNF: this.$t('StandByDisplayLabelCnf'),
        ESCRW_PN: this.$t('StandByDisplayLabelEscrwPn'),
        ESCRW: this.$t('StandByDisplayLabelEscrw'),
        PD_PN: this.$t('StandByDisplayLabelPdPn'),
        PD: this.$t('StandByDisplayLabelPd'),
        RLS_PN: this.$t('StandByDisplayLabelRlsPn')
      }
      return labels[status]
    },
    getAlertColorClass () {
      const status = this.data?.order?.status.value
      // CNF and ESCRW_PN are critical statuses that need more attention
      if (status === 'CNF' || status === 'ESCRW_PN') {
        return 'alert-critical'
      }
      return 'alert-normal'
    },
    getIconColor () {
      const status = this.data?.order?.status.value
      // CNF and ESCRW_PN use warning color for emphasis
      if (status === 'CNF' || status === 'ESCRW_PN') {
        return 'orange-7'
      }
      return 'blue-6'
    },
    counterparty () {
      const tradeType = this.data.order?.trade_type
      let adOwner = null
      let orderOwner = null

      switch (tradeType) {
        case 'SELL':
          adOwner = { name: this.data.order?.members?.seller?.name, label: 'Seller' }
          orderOwner = { name: this.data.order?.members?.buyer?.name, label: 'Buyer' }
          break
        case 'BUY':
          adOwner = { name: this.data.order?.members?.buyer?.name, label: 'Buyer' }
          orderOwner = { name: this.data.order?.members?.seller?.name, label: 'Seller' }
          break
      }

      return this.data.order?.is_ad_owner ? adOwner : orderOwner
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    txid () {
      let txId = null
      this.data?.order?.transactions?.forEach((tx) => {
        if (tx.action === 'RELEASE') {
          txId = tx.txid
        }
      })
      return txId
    },
    userType () {
      const orderTradeType = this.data?.order?.trade_type
      const userIsAdOwner = this.data?.order?.is_ad_owner

      if (orderTradeType === 'BUY') return userIsAdOwner ? 'seller' : 'buyer'
      if (orderTradeType === 'SELLER') return userIsAdOwner ? 'buyer' : 'seller'
      return null
    }
  },
  async mounted () {
    this.loadData()
  },
  beforeUnmount () {
    clearInterval(this.timer)
    this.timer = null
  },
  methods: {
    formatCurrency,
    getDarkModeClass,
    openURL,
    explorerLink (linkType = 'txid') {
      if (linkType === 'txid') {
        return getExplorerLink(this.txid || '')
      }
      return getExplorerAddressLink(this.data?.contractAddress || '')
    },
    async loadData () {
      if (this.isAppealed) {
        await this.fetchAppeal()
      }
      this.startAppealCountdown()
      this.checkStatus()
      await this.fetchContractBalance()
      this.lockedPrice = this.formatCurrency(this.data.order?.locked_price, this.data.order?.ad?.fiat_currency?.symbol)
      this.feedback = this.data.feedback
      this.isloaded = true
    },
    dynamicVal (field) {
      if (field.model_ref === 'order') {
        if (field.field_ref === 'id') {
          return this.data?.order?.id
        }
        if (field.field_ref === 'tracking_id') {
          return this.data?.order?.tracking_id
        }
      }
    },
    viewPaymentAttachment (url) {
      this.showAttachmentDialog = true
      this.attachmentUrl = url
    },
    async fetchAppeal () {
      const vm = this
      // Peer-side endpoint; force peer token (URL-based heuristic may pick arbiter).
      await backend.get(`/ramp-p2p/order/${vm.data?.order?.id}/appeal/`, { authorize: 'peer' })
        .then(response => {
          vm.appeal = response.data?.appeal
          console.log('appeal:', vm.appeal)
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    async fetchContractBalance () {
      const vm = this
      if (this.data?.escrow) {
        await vm.data?.escrow?.getBalance(vm.data?.contractAddress, true)
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
      backend.get(`/ramp-p2p/ad/snapshot/${id}/`, { authorize: true })
        .then(response => {
          this.adSnapshot = response.data
          this.showAdSnapshot = true
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    onSubmitFeedback (feedback) {
      this.feedback = feedback
    },
    startAppealCountdown () {
      const vm = this
      if (vm.data?.order?.appealable_at) {
        const appealableDate = new Date(vm.data?.order?.appealable_at)
        const updateCountdown = () => {
          const now = Date.now()
          const distance = appealableDate.getTime() - now
          const secondsRemaining = Math.max(0, Math.ceil(distance / 1000))
          vm.appealCountdownSeconds = secondsRemaining
          vm.appealCountdownLoading = false
          if (distance <= 0) {
            clearInterval(vm.timer)
            vm.timer = null
            vm.appealCountdownSeconds = 0
          }
        }

        // Compute immediately to avoid UI flicker on first render
        updateCountdown()
        if (!vm.timer) {
          vm.timer = setInterval(updateCountdown, 1000)
        }
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
    handleRequestError (error) {
      bus.emit('handle-request-error', error)
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

// Appeal countdown card and CTA styling
.appeal-countdown-card {
  border-radius: 16px;
}

.appeal-btn-cta {
  font-weight: 600;
  letter-spacing: 0.2px;
  box-shadow: 0 6px 18px rgba(237, 95, 89, 0.35);
  animation: appealPulse 1.8s ease-in-out infinite;
}

.appeal-cta-wrapper {
  padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
}

@keyframes appealPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

// Important alert styles
.important-alert-wrapper {
  .important-alert-card {
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    
    // Sparkle effect overlay
    &::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        45deg,
        transparent 30%,
        rgba(255, 255, 255, 0.1) 40%,
        rgba(255, 255, 255, 0.3) 50%,
        rgba(255, 255, 255, 0.1) 60%,
        transparent 70%
      );
      animation: sparkle 3s linear infinite;
      pointer-events: none;
      z-index: 1;
    }
    
    &.alert-critical {
      background: linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 193, 7, 0.1) 100%);
      border: 2px solid rgba(255, 152, 0, 0.4);
      
      &::before {
        background: linear-gradient(
          45deg,
          transparent 30%,
          rgba(255, 255, 255, 0.2) 40%,
          rgba(255, 255, 255, 0.5) 50%,
          rgba(255, 255, 255, 0.2) 60%,
          transparent 70%
        );
      }
      
      &.dark {
        background: linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 193, 7, 0.15) 100%);
        border: 2px solid rgba(255, 152, 0, 0.5);
        
        &::before {
          background: linear-gradient(
            45deg,
            transparent 30%,
            rgba(255, 255, 255, 0.15) 40%,
            rgba(255, 255, 255, 0.35) 50%,
            rgba(255, 255, 255, 0.15) 60%,
            transparent 70%
          );
        }
      }
    }
    
    &.alert-normal {
      background: rgba(33, 150, 243, 0.08);
      border: 1px solid rgba(33, 150, 243, 0.3);
      
      &.dark {
        background: rgba(33, 150, 243, 0.12);
        border: 1px solid rgba(33, 150, 243, 0.4);
      }
    }
    
    // Ensure content is above the sparkle overlay
    ::v-deep(.q-card__section) {
      position: relative;
      z-index: 2;
    }
  }
  
  .important-alert-text {
    font-size: 15px;
    font-weight: 500;
    line-height: 1.5;
    color: inherit;
  }
  
  .important-alert-icon {
    flex-shrink: 0;
  }
}

// Sparkle animation - shimmer effect that sweeps across
@keyframes sparkle {
  0% {
    transform: translateX(-100%) translateY(-100%) rotate(45deg);
  }
  100% {
    transform: translateX(100%) translateY(100%) rotate(45deg);
  }
}

// Pulse animation - continuous grow and shrink
@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 6px 20px rgba(255, 152, 0, 0.3);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

.pulse-animation {
  animation: pulse 2s ease-in-out infinite;
  
  // Only apply pulse animation to critical alerts
  &:not(.alert-critical) {
    animation: none;
  }
}

// Dark mode adjustments
.dark {
  @keyframes pulse {
    0% {
      transform: scale(1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    50% {
      transform: scale(1.02);
      box-shadow: 0 6px 20px rgba(255, 152, 0, 0.4);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
  }
}
</style>
