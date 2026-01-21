<template>
  <div
    v-if="isloaded"
    class="payment-confirmation-container text-bow"
    :class="getDarkModeClass(darkMode)">
    
    <!-- Contract Information Section -->
    <div class="section-wrapper">
      <p class="section-title text-subtitle1 q-px-sm q-my-sm" :class="getDarkModeClass(darkMode)">
        {{ $t('ContractInformation', {}, 'Contract Information') }}
      </p>
      <q-list class="pt-card payment-info-list" :class="getDarkModeClass(darkMode)">
        <q-item>
          <q-item-section>
            <q-item-label caption class="text-caption">{{ $t('Arbiter') }}</q-item-label>
            <q-item-label class="payment-detail-text">{{ data.arbiter.name }}</q-item-label>
            <q-item-label caption class="text-caption q-mt-xs text-grey">{{ data?.arbiter?.address }}</q-item-label>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label caption class="text-caption">{{ $t('ContractAddress') }}</q-item-label>
            <q-item-label class="payment-detail-text ellipsis">{{ data?.contract.address }}</q-item-label>
          </q-item-section>
          <q-item-section side v-if="data?.contract.address">
            <div class="row q-gutter-xs">
              <q-btn flat dense round size="sm" icon="open_in_new" color="blue-grey-6" @click="openURL(explorerLink)"/>
              <q-btn flat dense round size="sm" icon="content_copy" color="blue-grey-6" @click="copyToClipboard(data?.contract.address)"/>
            </div>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label caption class="text-caption">{{ $t('ContractBalance') }}</q-item-label>
            <q-item-label class="payment-detail-text">
              <span v-if="contractBalance">{{ contractBalance }} BCH</span>
              <q-skeleton v-else type="text" width="100px" height="20px" />
            </q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="copyToClipboard(fiatAmount)">
          <q-item-section>
            <q-item-label caption class="text-caption">
              {{ data?.type === 'buyer' ? $t('PayTheSeller') : $t('ExpectFiatPaymentOf') }}
            </q-item-label>
            <q-item-label class="payment-detail-text text-weight-bold text-primary">
              {{ fiatAmount }} {{ order?.ad?.fiat_currency?.symbol }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-icon name="content_copy" size="sm" color="blue-grey-6"/>
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <!-- Payment Methods Section -->
    <div class="section-wrapper">
      <p class="section-title text-subtitle1 q-px-sm q-my-sm" :class="getDarkModeClass(darkMode)">
        {{ $t('PAYMENTMETHODS') }}
      </p>
      <div class="text-center q-px-md q-mb-md instruction-text" :class="getDarkModeClass(darkMode)">
        <span v-if="data?.type === 'buyer'">{{ order.is_cash_in ? 'You selected this payment method' : 'Upload your proof of payment for the method you used' }}</span>
        <span v-if="data?.type === 'seller'">The buyer selected the following payment methods.</span>
      </div>

      <div class="payment-methods-list">
        <div v-for="(method, index) in paymentMethods" :key="index" class="payment-method-item">
          <q-card 
            flat 
            :dark="darkMode"
            :class="{'payment-method-selected': method.selected && data?.type !== 'seller'}"
            class="pt-card payment-method-card">
            <q-expansion-item
              class="text-bow"
              :class="getDarkModeClass(darkMode)"
              :model-value="expandedPaymentMethodId === method.id"
              @update:modelValue="onTogglePaymentMethodExpand(method.id, $event)"
              :label="method.payment_type"
              header-class="payment-method-header"
              expand-separator >
              <q-list class="payment-details-list" :class="getDarkModeClass(darkMode)">
                <template v-for="(field, fieldIndex) in (method.values || [])" :key="fieldIndex">
                  <q-item v-if="field && field.value" dense>
                    <q-item-section>
                      <q-item-label caption class="text-caption">{{ field.field_reference?.fieldname }}</q-item-label>
                      <q-item-label class="payment-field-value">{{ field.value }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-btn flat dense round size="sm" icon="content_copy" color="blue-grey-6" @click.stop="copyToClipboard(field.value)"/>
                    </q-item-section>
                  </q-item>
                </template>

                <template v-for="(field, fieldIndex) in (method.dynamic_values || [])" :key="'dynamic-' + fieldIndex">
                  <q-item v-if="field" dense>
                    <q-item-section>
                      <q-item-label caption class="text-caption">{{ field?.fieldname }}</q-item-label>
                      <q-item-label class="payment-field-value">{{ dynamicVal(field) }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-btn flat dense round size="sm" icon="content_copy" color="blue-grey-6" @click.stop="copyToClipboard(dynamicVal(field))"/>
                    </q-item-section>
                  </q-item>
                </template>
              </q-list>

              <!-- Upload Section -->
              <div class="upload-section q-pa-md" :class="getDarkModeClass(darkMode)">
                <!-- Upload Button for Buyer -->
                <q-btn
                  v-if="data?.type !== 'seller' && !method.attachment && (!method.attachments || method.attachments.length === 0)"
                  unelevated
                  no-caps
                  color="primary"
                  class="full-width upload-proof-btn"
                  icon="cloud_upload"
                  label="Upload Proof of Payment"
                  @click="selectAndUpload(method, index)"
                />
                
                <!-- Attachment Display (pending upload) -->
                <q-chip
                  v-if="data?.type !== 'seller' && method.attachment"
                  removable
                  color="primary"
                  text-color="white"
                  icon="attach_file"
                  @remove="cancelAttachment(method)"
                  class="full-width q-pa-md"
                >
                  <span class="ellipsis" style="max-width: 200px;">
                    {{ method.attachment?.name }}
                  </span>
                </q-chip>

                <!-- Waiting for swipe (indeterminate progress) -->
                <div
                  v-if="data?.type !== 'seller' && method.attachment && (!method.attachments || method.attachments.length === 0) && !uploadingProofByMethodId?.[method.id]"
                  class="q-px-md q-pb-sm"
                >
                  <q-linear-progress
                    rounded
                    indeterminate
                    color="primary"
                  />
                  <div class="text-caption text-grey-7 text-center q-mt-xs" :class="getDarkModeClass(darkMode)">
                    {{ $t('SwipeButtonToProceed', {}, 'Swipe the button to proceed') }}
                  </div>
                </div>
                
                <!-- View uploaded proof -->
                <q-btn
                  v-if="method.attachments?.length > 0"
                  outline
                  no-caps
                  color="positive"
                  icon="image"
                  label="View Uploaded Proof of Payment"
                  class="full-width"
                  @click.stop="viewPaymentAttachment(method.attachments[0].image?.url)"
                />
                
                <!-- Uploading message -->
                <div v-if="hasUploadingMsg && !method.attachment && (!method.attachments || method.attachments.length === 0)" class="text-center q-py-sm">
                  <span class="text-primary">
                    Uploading Proof of Payment 
                    <q-icon name="refresh" color="primary" size="xs" @click.stop="$emit('refresh')"/>
                  </span>
                </div>

                <!-- Upload progress -->
                <div
                  v-if="uploadingProofByMethodId?.[method.id] && (!method.attachments || method.attachments.length === 0)"
                  class="q-px-md q-pb-sm"
                >
                  <q-linear-progress
                    rounded
                    stripe
                    color="primary"
                    :value="(Number(uploadProofProgressByMethodId?.[method.id]) || 0) / 100"
                  />
                  <div class="text-caption text-grey-7 text-center q-mt-xs" :class="getDarkModeClass(darkMode)">
                    {{ Math.min(100, Math.max(0, Number(uploadProofProgressByMethodId?.[method.id]) || 0)) }}%
                  </div>
                </div>

                <!-- Upload error message -->
                <div
                  v-if="uploadProofErrorByMethodId?.[method.id] && !uploadingProofByMethodId?.[method.id] && (!method.attachments || method.attachments.length === 0)"
                  class="text-center q-py-sm"
                >
                  <span class="text-negative">
                    {{ uploadProofErrorByMethodId[method.id] }}
                  </span>
                </div>

                <!-- Hidden file input -->
                <q-file
                  v-if="data?.type !== 'seller'"
                  ref="filePickerRef"
                  :max-file-size="maxFileSize"
                  clearable
                  accept="image/jpg, image/png, image/jpeg"
                  dense
                  color="blue-12"
                  label="Upload Proof of Payment"
                  style="display: none"
                  v-model="method.attachment"
                  @update:model-value="onSelectAttachment(index, method.id)"
                  @rejected="onRejectedFilePick">
                  <template v-slot:prepend>
                    <q-icon name="upload" />
                  </template>
                </q-file>
              </div>
            </q-expansion-item>
          </q-card>
        </div>
      </div>
    </div>

    <!-- Seller Instructions -->
    <div v-if="data?.type === 'seller' && !sendingBch" class="section-wrapper">
      <q-banner class="instruction-banner q-mx-md" :class="getDarkModeClass(darkMode)">
        <template v-slot:avatar>
          <q-icon name="info" color="blue-6" />
        </template>
        <span class="text-body2">Please release the funds if you have received fiat payment.</span>
      </q-banner>
    </div>

    <!-- Errors Section -->
    <div v-if="data?.type === 'seller' && sendErrors.length > 0" class="section-wrapper">
      <q-banner class="error-banner q-mx-md bg-negative text-white" rounded>
        <template v-slot:avatar>
          <q-icon name="error" color="white" />
        </template>
        <ul class="q-ma-none q-pl-md">
          <li v-for="(error, index) in sendErrors" :key="index">{{ error }}</li>
        </ul>
      </q-banner>
    </div>

    <!-- Appeal Countdown / Appeal CTA -->
    <div v-if="showAppealCountdown || showAppealBtn" class="section-wrapper text-center q-pb-lg">
      <q-card
        v-if="showAppealCountdown"
        flat
        bordered
        class="pt-card q-mx-md appeal-countdown-card"
        :class="getDarkModeClass(darkMode)"
      >
        <q-card-section class="row items-center q-pa-md text-left">
          <q-icon name="schedule" size="22px" :color="darkMode ? 'grey-4' : 'grey-7'" />
          <div class="col q-ml-md">
            <div class="text-weight-bold">
              {{ $t('AppealableInSeconds', { countdown: appealCountdownDisplay }, `Appealable in ${appealCountdownDisplay}`) }}
            </div>
            <div class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
              {{ $t('AppealCountdownHelper', {}, 'If the other party is unresponsive, you can submit an appeal once the timer ends.') }}
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-btn
        v-else-if="showAppealBtn && !sendingBch"
        :loading="loadAppealButton"
        :disable="loadAppealButton"
        unelevated
        rounded
        no-caps
        icon="gavel"
        :label="$t('SubmitAnAppeal')"
        color="negative"
        padding="12px 32px"
        class="appeal-btn-cta"
        @click="onOpenAppealForm"
      />
    </div>
  </div>
  <div v-if="!isloaded" class="payment-confirmation-container text-bow" :class="getDarkModeClass(darkMode)">
    <!-- Skeleton for Contract Information Section -->
    <div class="section-wrapper">
      <q-skeleton type="text" width="40%" height="20px" class="q-px-sm q-my-sm" />
      <q-card flat bordered class="pt-card" :class="getDarkModeClass(darkMode)">
        <q-list class="payment-info-list">
          <q-item v-for="n in 4" :key="n">
            <q-item-section>
              <q-skeleton type="text" width="30%" height="12px" class="q-mb-xs" />
              <q-skeleton type="text" width="60%" height="18px" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </div>
    
    <!-- Skeleton for Payment Methods Section -->
    <div class="section-wrapper">
      <q-skeleton type="text" width="45%" height="20px" class="q-px-sm q-my-sm" />
      <q-skeleton type="text" width="70%" height="14px" class="q-mx-md q-mb-md" />
      <q-card flat bordered class="pt-card q-mb-md" :class="getDarkModeClass(darkMode)">
        <div class="q-pa-md">
          <q-skeleton type="text" width="40%" height="16px" class="q-mb-sm" />
          <q-skeleton type="text" width="100%" height="14px" class="q-mb-xs" />
          <q-skeleton type="text" width="90%" height="14px" class="q-mb-md" />
          <q-skeleton type="rect" width="100%" height="48px" style="border-radius: 8px;" />
        </div>
      </q-card>
    </div>
  </div>
  <RampDragSlide
  v-touch-swipe.mouse="checkDragslideStatus"
  v-if="showDragSlide"
  :key="dragSlideKey"
  :text="dragSlideTitle"
  :locked="lockDragSlide"
  :nudge="shouldNudgeSwipe"
  @click="checkDragslideStatus()"
  @ok="onSecurityOk"
  @cancel="onSecurityCancel"/>
  <AppealForm v-if="showAppealForm" :userType="this.data?.type" :order="order" @back="onCloseAppealForm" @loadAppeal="onAppealSubmit"/>
  <AttachmentDialog :show="showAttachmentDialog" :url="attachmentUrl" @back="showAttachmentDialog=false"/>
  <NoticeBoardDialog v-if="showNoticeDialog" :type="'info'" action="'orders'" :message="noticeMessage" @hide="showNoticeDialog = false"/>
</template>
<script>
import { ref } from 'vue'
import { bus } from 'src/wallet/event-bus.js'
import { openURL } from 'quasar'
import { wallet } from 'src/exchange/wallet'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'
import { bchToFiat, formatCurrency, satoshiToBch } from 'src/exchange'
import RampDragSlide from './dialogs/RampDragSlide.vue'
import AppealForm from './dialogs/AppealForm.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import AttachmentDialog from 'src/components/ramp/fiat/dialogs/AttachmentDialog.vue'
import NoticeBoardDialog from './dialogs/NoticeBoardDialog.vue'

export default {
  setup () {
    const filePickerRef = ref(null)
    return {
      filePickerRef
    }
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      contractBalance: null,
      order: null,
      txid: null,
      isloaded: false,
      appealCountdownSeconds: null,
      timer: null,
      paymentMethods: [],
      selectedPaymentMethods: [],
      expandedPaymentMethodId: null,
      // Proof-of-payment upload state (client-side)
      uploadingProof: false,
      uploadingProofByMethodId: {}, // { [paymentMethodId]: true }
      uploadProofErrorByMethodId: {}, // { [paymentMethodId]: string }
      uploadProofProgressByMethodId: {}, // { [paymentMethodId]: number (0-100) }
      showDragSlide: true,
      showAppealForm: false,
      dragSlideKey: 0,
      sendingBch: false,
      sendErrors: [],
      showAdSnapshot: false,
      showPeerProfile: false,
      openChat: false,
      peerInfo: {},
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100,
      showAttachmentDialog: false,
      attachmentUrl: null,
      loadAppealButton: false,
      errorDialogActive: false,
      showNoticeDialog: false,
      appealSubmitted: false
    }
  },
  components: {
    RampDragSlide,
    AppealForm,
    ProgressLoader,
    AttachmentDialog,
    NoticeBoardDialog
  },
  emits: ['back', 'verify-release', 'sending', 'refresh'],
  props: {
    data: Object
  },
  watch: {
    sendingBch (val) {
      this.$emit('sending', val)
    }
  },
  computed: {
    showAppealBtn () {
      let showBtn = false
      const status = this.order?.status.value      
      const userType = this.data?.type
      if (userType === 'seller') {
        // Seller can appeal at ESCRW (if buyer doesn't pay) or PD_PN (if seller didn't receive payment)
        showBtn = status === 'ESCRW' || status === 'PD_PN'
      }

      if (userType === 'buyer') {
        showBtn = status === 'PD_PN'
      }
      // Show the CTA only once the countdown has ended (0 seconds remaining).
      // IMPORTANT: `appealCountdownSeconds` starts as null; `Number(null) === 0` is true.
      // Require an `appealable_at` timestamp and a non-null countdown value.
      if (!this.order?.appealable_at) return false
      if (this.appealCountdownSeconds === null || this.appealCountdownSeconds === undefined) return false
      return showBtn && Number(this.appealCountdownSeconds) === 0
    },
    maxFileSize () {
      return 5 * 1024 * 1024
    },
    hasUploadingMsg () {
      return this.uploadingProof
    },
    proofMissingOnServer () {
      const methods = this.order?.payment_methods_selected
      if (!Array.isArray(methods) || methods.length === 0) return false
      return methods.some(m => !Array.isArray(m?.attachments) || m.attachments.length === 0)
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
    showAppealCountdown () {
      return !!this.order?.appealable_at && Number(this.appealCountdownSeconds) > 0
    },
    dragSlideTitle () {
      return this.data?.type === 'seller' ? this.$t('ReleaseCrypto') : this.$t('ConfirmPayment')
    },
    lockDragSlide () {
      const vm = this
      let lock = false
      if (vm.data?.type === 'buyer') {
        lock = vm.selectedPaymentMethods.length === 0
        if (!lock) {
          for (let i = 0; i < vm.selectedPaymentMethods.length; i++) {
            const selected = vm.selectedPaymentMethods[i]
            const method = vm.paymentMethods?.find?.(m => m?.id === selected?.id)
            const hasLocalAttachment = !!selected?.attachment
            const hasServerAttachment = Array.isArray(method?.attachments) && method.attachments.length > 0
            const isUploading = !!vm.uploadingProofByMethodId?.[selected?.id]
            // Lock if no proof is present yet for any selected method
            if (!hasLocalAttachment && !hasServerAttachment && !isUploading) {
              lock = true
              break
            }
          }
        }
        // Also lock while any upload is in progress
        if (vm.uploadingProof) lock = true
      }
      // Seller-side: when buyer is "Paid Pending", do not allow release/confirm
      // until proof-of-payment attachments are present on the server.
      if (vm.data?.type === 'seller' && vm.order?.status?.value === 'PD_PN') {
        lock = vm.proofMissingOnServer || vm.uploadingProof
      }
      return lock
    },
    shouldNudgeSwipe () {
      const vm = this
      if (vm.data?.type !== 'buyer') return false
      if (vm.uploadingProof) return false
      // Nudge when user has selected proof(s) and is ready to swipe (pre-upload)
      const anyPending = (vm.selectedPaymentMethods || []).some(sel => {
        const method = vm.paymentMethods?.find?.(m => m?.id === sel?.id)
        const hasLocal = !!sel?.attachment
        const hasServer = Array.isArray(method?.attachments) && method.attachments.length > 0
        const isUploading = !!vm.uploadingProofByMethodId?.[sel?.id]
        return hasLocal && !hasServer && !isUploading
      })
      return anyPending && !vm.lockDragSlide
    },
    fiatAmount () {
      const amount = bchToFiat(satoshiToBch(this.order?.trade_amount), this.order?.price)
      return this.formatCurrency(amount, this.data.order?.ad?.fiat_currency?.symbol).replace(/[^\d.,-]/g, '')
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    explorerLink () {
      let url = ''

      if (this.isChipnet) {
        url = `${process.env.TESTNET_EXPLORER_URL}/address/`
      } else {
        url = 'https://explorer.paytaca.com/address/'
      }
      return `${url}${this.data?.contract.address}`
    },
    noticeMessage () {
      if (this.data?.type === 'seller' && this.order?.status?.value === 'PD_PN' && this.proofMissingOnServer) {
        return 'Waiting for buyer to finish uploading proof of payment. Please refresh in a moment.'
      }
      return 'Please select Payment Method and upload your Proof of Payment first to proceed with the transaction'
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
    async loadData () {
      const vm = this
      await vm.fetchOrderDetail()
      vm.appealCountdown()
      vm.isloaded = true
      vm.fetchContractBalance()
    },
    checkDragslideStatus () {
      if (this.lockDragSlide) {
        this.showNoticeDialog = true
      }
    },
    cancelAttachment (method) {
      method.attachment = null
      const index = this.selectedPaymentMethods.map(e => e.id).indexOf(method.id)
      if (index > -1) {
        this.selectedPaymentMethods[index].attachment = null
      }
    },
    onClickUpload (index) {
      this.$refs.filePickerRef[index].pickFiles()
    },
    onRejectedFilePick (rejectedEntries) {
      let message = 'File did not pass validation constraints'
      if (rejectedEntries.length > 0 && rejectedEntries[0]?.failedPropValidation === 'max-file-size') {
        message = 'File size should not exceed 5MB'
      }
      this.$q.notify({
        type: 'negative',
        message: message
      })
    },
    onSelectAttachment (methodIndex, methodId) {
      const attachment = this.paymentMethods?.[methodIndex]?.attachment
      const index = this.selectedPaymentMethods.map(e => e.id).indexOf(methodId)
      if (index > -1) {
        this.selectedPaymentMethods[index].attachment = attachment
      } else {
        // Defensive: ensure selectedPaymentMethods has an entry for this method
        this.selectedPaymentMethods.push({ id: methodId, attachment })
      }
    },
    sleep (ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    },
    shouldRetryUpload (error) {
      // Retry on transient network/server issues
      const status = error?.response?.status
      if (!status) return true // network error / timeout
      if (status === 408) return true
      if (status === 429) return true
      if (status >= 500) return true
      return false
    },
    async uploadAttachments (orderPaymentMethods) {
      const vm = this
      if (!Array.isArray(orderPaymentMethods)) throw new Error('Missing order payment methods response')

      // Map payment_method -> orderPaymentMethodId for attachment upload endpoint
      const methodToOrderPaymentId = new Map(
        orderPaymentMethods
          .filter(opm => opm && (opm.id || opm.id === 0) && opm.payment_method)
          .map(opm => [opm.payment_method, opm.id])
      )

      // Defensive: ensure all selected methods have a local attachment before uploading
      for (const pm of vm.selectedPaymentMethods) {
        if (!pm?.id) throw new Error('Invalid selected payment method')
        if (!pm?.attachment) throw new Error('Missing proof of payment attachment')
        if (!methodToOrderPaymentId.has(pm.id)) {
          throw new Error('Selected payment method could not be prepared for upload')
        }
      }

      vm.uploadingProof = true
      vm.uploadProofErrorByMethodId = {}
      vm.uploadProofProgressByMethodId = {}

      try {
        // Upload sequentially for better reliability on mobile networks
        for (const pm of vm.selectedPaymentMethods) {
          const orderPaymentId = methodToOrderPaymentId.get(pm.id)
          const file = pm.attachment
          vm.uploadingProofByMethodId = { ...vm.uploadingProofByMethodId, [pm.id]: true }
          vm.uploadProofErrorByMethodId = { ...vm.uploadProofErrorByMethodId, [pm.id]: '' }
          vm.uploadProofProgressByMethodId = { ...vm.uploadProofProgressByMethodId, [pm.id]: 0 }

          const formData = new FormData()
          formData.append('image', file)
          await vm.uploadAttachmentWithRetry(formData, orderPaymentId, { paymentMethodId: pm.id })
          vm.uploadingProofByMethodId = { ...vm.uploadingProofByMethodId, [pm.id]: false }
          vm.uploadProofProgressByMethodId = { ...vm.uploadProofProgressByMethodId, [pm.id]: 100 }
        }

        // Refresh order details to get the uploaded attachments from server
        await vm.fetchOrderDetail()

        // Verify proof is actually present (best-effort; backend may be eventually consistent)
        if (vm.data?.type === 'buyer') {
          const maxVerifyAttempts = 4
          for (let attempt = 0; attempt < maxVerifyAttempts; attempt++) {
            const missing = vm.proofMissingOnServer
            if (!missing) break
            await vm.sleep(800 * (attempt + 1))
            await vm.fetchOrderDetail()
          }
          if (vm.proofMissingOnServer) {
            throw new Error('Proof upload did not finish successfully. Please retry.')
          }
        }

        // Clear local attachments after successful upload
        vm.selectedPaymentMethods.forEach(paymentMethod => {
          const methodIndex = vm.paymentMethods.findIndex(m => m.id === paymentMethod.id)
          if (methodIndex > -1) vm.paymentMethods[methodIndex].attachment = null
        })
      } finally {
        vm.uploadingProof = false
        // Clear flags
        const nextFlags = { ...vm.uploadingProofByMethodId }
        Object.keys(nextFlags).forEach(k => { nextFlags[k] = false })
        vm.uploadingProofByMethodId = nextFlags
      }
    },
    async uploadAttachmentWithRetry (formdata, orderPaymentId, opts = {}) {
      const vm = this
      const paymentMethodId = opts?.paymentMethodId
      // "Up to 3 retries" => 1 initial attempt + 3 retry attempts
      const maxRetries = 3
      const maxAttempts = 1 + maxRetries
      let lastErr = null

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // Reset progress at start of each attempt
          if (paymentMethodId) {
            vm.uploadProofProgressByMethodId = { ...vm.uploadProofProgressByMethodId, [paymentMethodId]: 0 }
          }
          const resp = await backend.post(
            `/ramp-p2p/order/payment/${orderPaymentId}/attachment/`,
            formdata,
            {
              headers: { 'Content-Type': 'multipart/form-data' },
              authorize: true,
              timeout: 60_000,
              // Best-effort progress tracking (works in browser/XHR environments)
              onUploadProgress: (evt) => {
                if (!paymentMethodId) return
                const total = Number(evt?.total)
                const loaded = Number(evt?.loaded)
                if (!Number.isFinite(total) || total <= 0) return
                if (!Number.isFinite(loaded) || loaded < 0) return
                const pct = Math.round((loaded / total) * 100)
                vm.uploadProofProgressByMethodId = {
                  ...vm.uploadProofProgressByMethodId,
                  [paymentMethodId]: Math.min(100, Math.max(0, pct))
                }
              }
            }
          )
          return resp?.data
        } catch (error) {
          lastErr = error
          const retryable = vm.shouldRetryUpload(error)
          const msg = error?.response?.data?.detail || error?.message || 'Upload failed'
          if (paymentMethodId) {
            vm.uploadProofErrorByMethodId = { ...vm.uploadProofErrorByMethodId, [paymentMethodId]: msg }
          }
          if (!retryable || attempt === maxAttempts) break
          // Exponential backoff with small cap
          const delay = Math.min(4000, 600 * (2 ** (attempt - 1)))
          await vm.sleep(delay)
        }
      }
      throw lastErr || new Error('Upload failed')
    },
    dynamicVal (field) {
      if (field.model_ref === 'order') {
        if (field.field_ref === 'id') {
          return this.order.id
        }
        if (field.field_ref === 'tracking_id') {
          return this.order.tracking_id
        }
      }
    },
    viewPaymentAttachment (url) {
      this.showAttachmentDialog = true
      this.attachmentUrl = url
    },
    fetchContractBalance () {
      const vm = this
      if (vm.data?.escrow) {
        vm.data?.escrow.getBalance(vm.data?.contract.address, true)
          .then(balance => {
            vm.contractBalance = balance
          })
          .catch(error => {
            console.error(error)
          })
      }
    },
    async completePayment () {
      const vm = this
      const status = vm.order.status.value
      vm.sendErrors = []
      try {
        switch (status) {
          case 'ESCRW': {
            const resp = await vm.sendConfirmPayment(vm.data?.type)
            await vm.uploadAttachments(resp.order_payment_methods)
            break
          }
          case 'PD_PN': {
            // Seller confirm + release should be blocked until proof exists.
            if (vm.data?.type === 'seller' && vm.proofMissingOnServer) {
              vm.sendErrors.push('Proof of payment is still missing. Please wait and refresh before releasing.')
              await vm.fetchOrderDetail()
              return
            }
            const resp = await vm.sendConfirmPayment(vm.data?.type)
            if (resp?.status?.value === 'PD') {
              vm.releaseBch()
            }
            break
          }
          case 'PD':
            vm.releaseBch()
            break
        }
      } catch (error) {
        console.error(error)
        vm.sendErrors.push(error?.message || String(error))
      }
    },
    async sendConfirmPayment (type) {
      const vm = this
      const selectedPaymentMethodIds = vm.selectedPaymentMethods.map(e => e.id)
      const body = {
        payment_methods: selectedPaymentMethodIds
      }
      const response = await backend.post(`/ramp-p2p/order/${vm.order.id}/confirm-payment/${type}/`, body, { authorize: true })
        .catch(error => {
          this.showErrorDialog(error)
        })
      return response.data
    },
    async releaseBch () {
      const vm = this
      vm.sendErrors = []
      vm.sendingBch = true
      const feContractAddr = vm.data?.escrow.getAddress()
      const beContractAddr = vm.data?.contract.address
      if (feContractAddr !== beContractAddr) {
        vm.sendErrors.push('contract addresses mismatched')
      }
      const sellerMember = (vm.data?.contract?.members).find(member => { return member.member_type === 'SELLER' })
      const keypair = wallet.keypair(sellerMember.address_path)
      await vm.data?.escrow.release(keypair.privateKey, keypair.publicKey, vm.order.trade_amount)
        .then(result => {
          console.log(result)
          if (result.success) {
            const txid = result.txInfo.txid
            const txidData = {
              id: vm.order.id,
              txidInfo: {
                action: 'RELEASE',
                txid: txid
              }
            }
            vm.$store.commit('ramp/saveTxid', txidData)
            vm.$emit('verify-release', txid)
          } else {
            let errorMessage = result.reason
            if (vm.contractBalance > 0 && result?.reason?.toLowerCase()?.includes('insufficient funds: available (0)')) {
              errorMessage = 'Possible pending contract UTXO, please try again later.'
            }
            vm.sendErrors = [errorMessage]
            vm.showDragSlide = true
          }
        })
        .catch(error => {
          console.error(error)
        })
      vm.sendingBch = false
    },
    async fetchOrderDetail () {
      const vm = this
      await backend.get(`/ramp-p2p/order/${vm.data.order.id}/`, { authorize: true })
        .then(response => {
          vm.order = response.data
          vm.txid = vm.$store.getters['ramp/getOrderTxid'](vm.order.id, 'RELEASE')
          // Find the payment methods of seller
          let orderPaymentTypes = []
          if (vm.order?.payment_methods_selected?.length > 0) {
            orderPaymentTypes = vm.order.payment_methods_selected.map(method => {
              const selected = vm.order.ad.payment_methods.map(admethod => { return admethod.id }).includes(method.id)
              return { ...method, selected: selected }
            })
          } else {
            orderPaymentTypes = vm.order.payment_method_opts.map(method => {
              const selected = vm.order.ad.payment_methods.map(admethod => { return admethod.id }).includes(method.id)
              return { ...method, selected: selected }
            })
          }
          const adPaymentTypes = vm.order.ad.payment_methods.map(method => {
            return { ...method, selected: false }
          })

          if (vm.data.type === 'buyer') {
            if (vm.data?.order?.is_ad_owner) {
              vm.paymentMethods = orderPaymentTypes
            } else {
              vm.paymentMethods = adPaymentTypes
            }

            if (vm.data?.order?.is_cash_in) {
              vm.paymentMethods = orderPaymentTypes
              vm.selectedPaymentMethods = orderPaymentTypes
            }
          } else {
            vm.paymentMethods = orderPaymentTypes
          }
        })
        .catch(error => {
          this.showErrorDialog(error)
        })
    },
    selectPaymentMethod (method, methodIndex) {
      if (method.selected) {
        this.selectedPaymentMethods.push({ id: method.id })
      } else {
        const index = this.selectedPaymentMethods.map(e => e.id).indexOf(method.id)
        if (index > -1) {
          this.selectedPaymentMethods.splice(index, 1)
          this.paymentMethods[methodIndex].attachment = null
        }
      }
    },
    selectAndUpload (method, methodIndex) {
      // Collapse other payment methods when upload button is clicked
      this.expandedPaymentMethodId = method?.id
      // If already selected, just open file picker
      if (method.selected) {
        this.onClickUpload(methodIndex)
        return
      }
      
      // Otherwise, select the method first then open file picker
      method.selected = true
      this.selectPaymentMethod(method, methodIndex)
      
      // Use nextTick to ensure DOM is updated before opening file picker
      this.$nextTick(() => {
        this.onClickUpload(methodIndex)
      })
    },
    onTogglePaymentMethodExpand (methodId, isExpanded) {
      if (isExpanded) {
        this.expandedPaymentMethodId = methodId
      } else if (this.expandedPaymentMethodId === methodId) {
        this.expandedPaymentMethodId = null
      }
    },
    onSecurityOk () {
      this.showDragSlide = false
      this.dragSlideKey++
      this.completePayment()
    },
    onSecurityCancel () {
      this.showDragSlide = true
      this.dragSlideKey++
    },
    onOpenAppealForm () {
      this.showAppealForm = true
      this.showDragSlide = false
      this.appealSubmitted = false
    },
    onAppealSubmit () {
      // Appeal submission has started - keep drag slide hidden and track that appeal was submitted
      this.appealSubmitted = true
      this.loadAppealButton = true
      this.showDragSlide = false
    },
    onCloseAppealForm () {
      this.showAppealForm = false
      // Only show drag slide button again if the appeal was NOT submitted (user just cancelled)
      if (!this.appealSubmitted) {
        this.showDragSlide = true
      }
      // If appeal was submitted, keep drag slide hidden
    },
    appealCountdown () {
      const vm = this
      if (vm.order?.appealable_at) {
        const appealableDate = new Date(vm.order?.appealable_at)
        const updateCountdown = () => {
          const now = Date.now()
          const distance = appealableDate.getTime() - now
          const secondsRemaining = Math.max(0, Math.ceil(distance / 1000))
          vm.appealCountdownSeconds = secondsRemaining
          if (distance <= 0) {
            clearInterval(vm.timer)
            vm.timer = null
            vm.appealCountdownSeconds = 0
          }
        }

        // Compute immediately so we don't briefly show the CTA state
        updateCountdown()
        if (!vm.timer) {
          vm.timer = setInterval(updateCountdown, 1000)
        }
      }
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    handleRequestError (error) {
      bus.emit('handle-request-error', error)
    },
    showErrorDialog (error) {
      console.error(error)
      const message = 'An unexpected error has occured'
      if (!this.errorDialogActive) {
        this.errorDialogActive = false
        this.$q.notify({
          type: 'warning',
          message: message,
          position: 'bottom',
          timeout: 5000,
          onDismiss: () => {
            this.errorDialogActive = false
          }
        })
      }
    }
  }
}
</script>
<style lang="scss" scoped>
// Container
.payment-confirmation-container {
  padding-bottom: 160px;
  
  // iOS specific - add more padding for safe area and drag slide button
  @supports (-webkit-touch-callout: none) {
    padding-bottom: calc(180px + env(safe-area-inset-bottom, 0px));
  }
}

// Section Wrapper
.section-wrapper {
  margin-bottom: 32px;
  padding: 0 16px;
  
  // Add extra spacing for the last section on iOS
  &:last-of-type {
    margin-bottom: 40px;
    
    @supports (-webkit-touch-callout: none) {
      margin-bottom: 48px;
    }
  }
}

// Section Title (matching settings page)
.section-title {
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 0.5px;
  opacity: 0.85;
  
  &.dark {
    color: #e0e2e5;
  }
  &.light {
    color: rgba(0, 0, 0, 0.87);
  }
}

// Instruction Text
.instruction-text {
  font-size: 14px;
  opacity: 0.75;
  line-height: 1.5;
}

// Card Styling (matching settings page)
.pt-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

// Payment Info List
.payment-info-list {
  .q-item {
    padding: 16px 20px;
    min-height: 60px;
    
    &:not(:last-child) {
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }
  }
  
  &.dark .q-item:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
}

.payment-detail-text {
  font-size: 15px;
  font-weight: 500;
  margin-top: 4px;
}

// Payment Methods List
.payment-methods-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.payment-method-item {
  margin-bottom: 0;
}

.payment-method-card {
  transition: all 0.3s ease;
  
  &.payment-method-selected {
    border: 2px solid #21ba45 !important;
    box-shadow: 0 4px 12px rgba(33, 186, 69, 0.2);
  }
}

.payment-method-header {
  padding: 16px 20px;
  font-weight: 500;
  font-size: 15px;
}

.payment-details-list {
  .q-item {
    padding: 12px 20px;
    
    &:not(:last-child) {
      border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    }
  }
  
  &.dark .q-item:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
}

.payment-field-value {
  font-size: 14px;
  font-weight: 500;
  margin-top: 2px;
  word-break: break-all;
}

// Upload Section
.upload-section {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  
  &.dark {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
}

.upload-proof-btn {
  font-weight: 500;
  padding: 12px 16px;
  font-size: 15px;
  height: 48px;
  
  :deep(.q-btn__content) {
    .q-icon {
      font-size: 22px;
    }
  }
}

// Banners
.instruction-banner {
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.error-banner {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

// Legacy styles (kept for compatibility)
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

.appeal-countdown-card {
  border-radius: 16px;
}

.appeal-btn-cta {
  font-weight: 600;
  letter-spacing: 0.2px;
  box-shadow: 0 6px 18px rgba(237, 95, 89, 0.35);
  animation: appealPulse 1.8s ease-in-out infinite;
}

@keyframes appealPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}
</style>
