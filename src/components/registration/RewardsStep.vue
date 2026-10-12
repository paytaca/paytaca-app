<template>
  <QrScanner v-model="showQrScanner" @decode="processReferralCode" />
  <QRUploader ref="qr-upload" @detect-upload="processReferralCode" />

  <div v-if="!isLoading" class="content-section center-viewport" :class="getDarkModeClass(darkMode)">
    <h5 class="q-ma-none text-center text-bow step-title" :class="getDarkModeClass(darkMode)">
      {{ $t('RewardsStepTitle') }}
    </h5>
    <p class="text-center text-bow step-subtitle" :class="getDarkModeClass(darkMode)">
      {{ $t('RewardsStepSubtitle') }}
    </p>

    <div v-if="!isCodeProcessed && !isSelfReferral" class="glass-panel q-mt-md" :class="getDarkModeClass(darkMode)">
      <div class="q-pa-md">
        <p class="text-body2 text-bow q-mb-md" :class="getDarkModeClass(darkMode)">
          {{ $t('RewardsStepBody') }}
        </p>
        
        <!-- Manual Code Input -->
        <q-input
          v-model="manualReferralCode"
          :dark="darkMode"
          dense
          outlined
          class="glass-textarea bg-white q-mb-md"
          :class="getDarkModeClass(darkMode)"
          :placeholder="$t('RewardsStepInputLabel')"
          @keyup.enter="processManualCode"
        >
          <template v-slot:append>
            <q-btn
              flat
              dense
              :label="$t('Submit')"
              icon-right="arrow_circle_right"
              :color="isValidManualCode ? 'positive' : 'negative'"
              :disable="!isValidManualCode"
              :class="{ 'submit-shimmer': isValidManualCode }"
              @click="processManualCode"
            />
          </template>
        </q-input>

        <!-- QR Scan/Upload Options -->
        <div class="text-center q-mb-md">
          <span class="text-caption text-bow" :class="getDarkModeClass(darkMode)">
            {{ $t('RewardsStepScanOrUpload') }}
          </span>
        </div>

        <div class="row justify-center q-gutter-md">
          <q-btn
            round
            size="md"
            class="btn-scan button text-white bg-grad"
            icon="mdi-qrcode"
            @click="showQrScanner = true"
          />
          <q-btn
            round
            size="md"
            class="btn-scan button text-white bg-grad"
            icon="upload"
            @click="$refs['qr-upload'].$refs['q-file'].pickFiles()"
          />
        </div>

        <!-- Error Display -->
        <div
          v-if="isProcessingError"
          class="text-red-5 text-center q-mt-md text-body2"
        >
          {{ errorMessage }}
        </div>
      </div>
    </div>

    <!-- Success State -->
    <div v-else-if="isCodeProcessed" class="glass-panel q-mt-md q-pa-md text-center" :class="getDarkModeClass(darkMode)">
      <q-icon name="check_circle" color="positive" size="48px" class="q-mt-md" />
      <p class="text-subtitle1 text-bow q-px-md" :class="getDarkModeClass(darkMode)">
        {{ $t('ReferredStepSuccessTitle') }}
      </p>
      <p class="text-body2 text-bow q-mt-sm q-px-md" :class="getDarkModeClass(darkMode)">
        {{ $t('RewardsStepSuccessSubtitle') }}
      </p>
    </div>

    <!-- Self-referral blocked state -->
    <div v-else class="glass-panel q-mt-md q-pa-md text-center" :class="getDarkModeClass(darkMode)">
      <q-icon name="block" color="negative" size="48px" class="q-mt-md" />
      <p class="text-subtitle1 text-bow q-px-md" :class="getDarkModeClass(darkMode)">
        {{ errorMessage }}
      </p>
    </div>

    <!-- Skip Button (prominent secondary action) -->
    <div v-if="!isCodeProcessed && !isSelfReferral && (!hasReferralCode || isProcessingError)" class="q-mt-lg text-center">
      <q-btn
        outline
        no-caps
        :label="$t('RewardsStepSkipButton')"
        class="text-bow skip-button button button-text-primary"
        :class="getDarkModeClass(darkMode)"
        :loading="isSkipButtonLoading"
        @click="onSkipButtonPressed"
      />
    </div>

    <!-- Continue Button (show after success or when a code is blocked) -->
    <q-btn
      v-if="isCodeProcessed || isSelfReferral"
      no-caps
      rounded
      :label="$t('Continue')"
      class="q-mt-lg full-width primary-cta bg-grad"
      @click="$emit('on-proceed-to-next-step')"
    />
  </div>

  <div v-else class="content-section center-viewport">
    <div class="text-center q-mt-lg">
      <span class="text-subtitle1 text-bow" :class="getDarkModeClass(darkMode)">
        {{ $t('ProcessingReferralCode') }}...
      </span>
    </div>
    <div class="row justify-center q-mt-md">
      <progress-loader />
    </div>
  </div>
</template>

<script>
import { parseDeviceId } from 'src/utils/engagementhub-utils/engagementhub-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { processReferralCode } from 'src/utils/engagementhub-utils/rewards'
import { captureDeferredReferralCode, clearDeferredReferralCode, normalizeReferralCode } from 'src/utils/deferred-referral'
import { Capacitor } from '@capacitor/core'

import QrScanner from 'src/components/qr-scanner'
import QRUploader from 'src/components/QRUploader'
import ProgressLoader from 'src/components/ProgressLoader.vue'

export default {
  name: 'RewardsStep',

  components: {
    QrScanner,
    QRUploader,
    ProgressLoader
  },

  props: {
    walletHash: { type: String, default: '' },
    darkMode: { type: Boolean, default: false },
    fromCreateWallet: { type: Boolean, default: true },
    referralCode: { type: String, default: '' }
  },

  async mounted () {
    if (this.referralCode) {
      // Route the prop through the same parse+normalize path as QR/deep links,
      // so a full landing-page URL in the query is handled too.
      await this.processReferralCode(this.referralCode)
      return
    }
    if (this.fromCreateWallet) {
      await this.applyDeferredReferralCode()
    }
  },

  emits: ['on-proceed-to-next-step'],

  data () {
    return {
      showQrScanner: false,
      isLoading: false,
      isSkipButtonLoading: false,
      isCodeProcessed: false,
      isProcessingError: false,
      isSelfReferral: false,
      manualReferralCode: '',
      errorMessage: ''
    }
  },

  computed: {
    isValidManualCode () {
      // Validate format: type-code-id (e.g., RP-ABC123-456)
      const parts = this.manualReferralCode.trim().split('-')
      return parts.length === 3 && parts[0] && parts[1] && parts[2]
    },

    hasReferralCode () {
      return this.isValidManualCode
    }
  },

  watch: {
    manualReferralCode (val) {
      const formatted = this.formatReferralCode(val)
      if (formatted !== val) {
        this.$nextTick(() => {
          this.manualReferralCode = formatted
        })
      }
    },
    referralCode (val) {
      if (val) this.processReferralCode(val)
    }
  },

  methods: {
    getDarkModeClass,

    formatReferralCode (val) {
      if (!val) return ''

      const raw = String(val).toUpperCase().replaceAll(/[^A-Z0-9]/g, '')

      let result = ''
      let pos = 0

      // Segment 1: exactly 2 letters only (digits rejected)
      while (pos < raw.length && result.length < 2) {
        if (/[A-Z]/.test(raw[pos])) result += raw[pos]
        pos++
      }

      // Auto-dash after 2 letters if more chars follow
      if (result.length === 2 && pos < raw.length) result += '-'

      // Segment 2: up to 6 alphanumeric chars
      let seg2Len = 0
      while (pos < raw.length && seg2Len < 6) {
        if (/[A-Z0-9]/.test(raw[pos])) {
          result += raw[pos]
          seg2Len++
        }
        pos++
      }

      // Auto-dash after segment 2 if more chars follow
      if (seg2Len === 6 && pos < raw.length) result += '-'

      // Segment 3: any number of digits
      while (pos < raw.length) {
        if (/\d/.test(raw[pos])) result += raw[pos]
        pos++
      }

      return result
    },
    
    async processReferralCode (content) {
      this.isLoading = true
      this.isProcessingError = false
      this.errorMessage = ''
      let referralCode = null

      try {
        if (typeof content === 'object') referralCode = content[0].rawValue
        else if (typeof content === 'string') referralCode = content
      } catch {
        referralCode = null
      }

      // if rewards url is found, parse code
      try {
        const url = new URL(referralCode)
        referralCode = url.searchParams.get('code')
      } catch { /* not a URL, use raw value */ }

      const normalized = normalizeReferralCode(referralCode)
      if (normalized) {
        this.manualReferralCode = normalized
        await this.executeReferralSubmission(normalized)
      } else {
        this.isProcessingError = true
        this.errorMessage = this.$t('InvalidCodeError')
        this.isCodeProcessed = false
        this.isLoading = false
      }
    },

    async processManualCode () {
      if (!this.isValidManualCode) return
      await this.executeReferralSubmission(this.manualReferralCode.trim())
    },

    async applyDeferredReferralCode () {
      const code = await captureDeferredReferralCode()
      if (!code) return
      this.manualReferralCode = code
      await this.executeReferralSubmission(code)
      // Only drop the stored code once the outcome is terminal, so a transient
      // failure (e.g. network) can still be retried.
      if (this.isCodeProcessed || this.isSelfReferral) clearDeferredReferralCode()
    },

    async executeReferralSubmission (code) {
      this.isLoading = true
      this.isProcessingError = false
      this.isSelfReferral = false
      this.errorMessage = ''

      const resp = await this.submitReferralCode(code)
      if (Object.keys(resp).length === 0) {
        this.isProcessingError = false
      } else {
        this.isProcessingError = true
        this.processErrorMessage(resp)
        if (resp?.code === 'self_referral') this.isSelfReferral = true
      }

      this.isCodeProcessed = !this.isProcessingError
      this.isLoading = false
    },

    async submitReferralCode (code) {
      const parts = code.split('-')
      if (parts.length !== 3) {
        // Invalid format
        return { code: 'invalid_code', message: 'Invalid code detected' }
      }

      return await processReferralCode({
        device_id: parseDeviceId(this.$pushNotifications?.deviceId),
        platform: Capacitor.getPlatform(),
        wallet_hash: this.walletHash,
        model: parts[0],
        code: parts[1],
        id: parts[2],
        has_deferred_code_entering: false,
        has_entered_code: true,
        from_wallet_creation: this.fromCreateWallet
      })
    },

    async onSkipButtonPressed () {
      this.isSkipButtonLoading = true
      if (this.fromCreateWallet) {
        await processReferralCode({
          wallet_hash: this.walletHash,
          has_deferred_code_entering: true,
          has_entered_code: false,
          from_wallet_creation: this.fromCreateWallet
        })
      }
      this.isSkipButtonLoading = false
      this.$emit('on-proceed-to-next-step')
    },

    processErrorMessage (resp) {
      if (resp?.code === 'non_mobile_referral') {
        this.errorMessage = this.$t('NonMobileReferralError')
      } else if (resp?.code === 'duplicate_device') {
        this.errorMessage = this.$t('DuplicateDeviceError')
      } else if (resp?.code === 'duplicate_referral') {
        this.errorMessage = this.$t('DuplicateReferralError')
      } else if (resp?.code === 'invalid_code') {
        console.error(resp?.message)
        this.errorMessage = this.$t('InvalidCodeError')
      } else if (resp?.code === 'self_referral') {
        this.errorMessage = this.$t('SelfReferralError')
      } else {
        this.errorMessage = this.$t('ProcessingReferralCodeError')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.content-section {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: 0 16px;
}

.center-viewport {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 24px 16px 32px;
  box-sizing: border-box;
  gap: 12px;
}

.step-title {
  font-weight: 500;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
}

.step-subtitle {
  opacity: 0.8;
  margin-top: 6px;
  margin-bottom: 14px;
  font-size: 14px;
  line-height: 1.4;
}

.glass-panel {
  border-radius: 16px;
  margin-bottom: 16px;
  width: 100%;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);

  &.dark {
    background: rgba(39, 55, 70, 0.55);
    border-color: rgba(255, 255, 255, 0.12);
  }
  &.light {
    background: rgba(255, 255, 255, 0.55);
    border-color: rgba(0, 0, 0, 0.06);
  }
}

.glass-textarea {
  border-radius: 12px;

  &.q-field--outlined :deep(.q-field__control) {
    border-radius: 12px;
    background: #ffffff !important;
  }
  
  &.q-field--outlined :deep(.q-field__control-container) {
    background: #ffffff !important;
  }
  
  &.q-field--outlined :deep(.q-field__native) {
    background: #ffffff !important;
    color: inherit;
    border-block: 1px solid rgba(0, 0, 0, 0.24);
  }
  
  &.q-field--dark.q-field--outlined :deep(.q-field__control),
  &.q-field--dark.q-field--outlined :deep(.q-field__control-container),
  &.q-field--dark.q-field--outlined :deep(.q-field__native) {
    background: #ffffff !important;
  }
  
  &.q-field--dark.q-field--outlined :deep(.q-field__native) {
    border-color: rgba(255, 255, 255, 0.6);
  }
  
  &.dark.q-field--outlined :deep(.q-field__control),
  &.dark.q-field--outlined :deep(.q-field__control-container),
  &.dark.q-field--outlined :deep(.q-field__native) {
    background: #ffffff !important;
  }
  
  &.dark.q-field--outlined :deep(.q-field__native) {
    border-color: rgba(255, 255, 255, 0.6);
  }
  
  &.light.q-field--outlined :deep(.q-field__control),
  &.light.q-field--outlined :deep(.q-field__control-container),
  &.light.q-field--outlined :deep(.q-field__native) {
    background: #ffffff !important;
  }
  
  &.light.q-field--outlined :deep(.q-field__native) {
    border-color: rgba(0, 0, 0, 0.24);
  }
}

.primary-cta {
  height: 46px;
  border-radius: 16px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: #fff !important;
}

.skip-button {
  font-weight: 500;
  
  &:hover {
    opacity: 1;
  }
}

.submit-shimmer {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(33, 186, 69, 0.12);

  :deep(.q-btn__content) {
    position: relative;
    z-index: 1;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 60%;
    z-index: 0;
    background: linear-gradient(
      100deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.65) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    transform: translateX(-160%);
    animation: submit-shimmer-sweep 1.8s ease-in-out infinite;
    pointer-events: none;
  }
}

@keyframes submit-shimmer-sweep {
  0% {
    transform: translateX(-160%);
  }
  55% {
    transform: translateX(240%);
  }
  100% {
    transform: translateX(240%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .submit-shimmer::after {
    animation: none;
    opacity: 0;
  }
}

.btn-scan {
  &.button {
    min-width: 48px;
    min-height: 48px;
  }
}
</style>
