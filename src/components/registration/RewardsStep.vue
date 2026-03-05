<template>
  <QrScanner v-model="showQrScanner" @decode="processReferralCode" />
  <QRUploader ref="qr-upload" @detect-upload="processReferralCode" />

  <div v-if="!isLoading" class="content-section center-viewport" :class="getDarkModeClass(darkMode)">
    <h5 class="q-ma-none text-center text-bow step-title" :class="getDarkModeClass(darkMode)">
      {{ $t('RewardsStepTitle', 'Referral Code') }}
    </h5>
    <p class="text-center text-bow step-subtitle" :class="getDarkModeClass(darkMode)">
      <!-- Were you referred by a friend or a cashier of one of our partner merchants? -->
      {{ $t('RewardsStepSubtitle', 'Were you referred by a friend?') }}
    </p>

    <div v-if="!isCodeProcessed" class="glass-panel q-mt-md" :class="getDarkModeClass(darkMode)">
      <div class="q-pa-md">
        <p class="text-body2 text-bow q-mb-md" :class="getDarkModeClass(darkMode)">
          {{ $t('ReferredStepDescription2', 'Enter their referral code so you can both receive points!') }}
        </p>
        
        <!-- Manual Code Input -->
        <q-input
          v-model="manualReferralCode"
          :dark="darkMode"
          dense
          outlined
          class="glass-textarea bg-white q-mb-md"
          :class="getDarkModeClass(darkMode)"
          :placeholder="$t('RewardsStepManualInputLabel', 'Enter referral code')"
          @keyup.enter="processManualCode"
        >
          <template v-slot:append>
            <q-btn
              flat
              dense
              label="Enter"
              icon-right="arrow_circle_right"
              :color="isValidManualCode ? 'positive' : 'negative'"
              :disable="!isValidManualCode"
              @click="processManualCode"
            />
          </template>
        </q-input>

        <!-- QR Scan/Upload Options -->
        <div class="text-center q-mb-md">
          <span class="text-caption text-bow" :class="getDarkModeClass(darkMode)">
            {{ $t('RewardsStepScanOrUpload', 'Or scan/upload their QR code') }}
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
          {{ $t('ReferredStepError', 'An error occurred while processing the referral code. Please try again.') }}
        </div>
      </div>
    </div>

    <!-- Success State -->
    <div v-else class="glass-panel q-mt-md q-pa-md text-center" :class="getDarkModeClass(darkMode)">
      <q-icon name="check_circle" color="positive" size="48px" class="q-mt-md" />
      <p class="text-subtitle1 text-bow q-px-md" :class="getDarkModeClass(darkMode)">
        {{ $t('ReferredStepSuccess1', 'Referral code successfully processed!') }}
      </p>
      <p class="text-body2 text-bow q-mt-sm q-px-md" :class="getDarkModeClass(darkMode)">
        {{ $t('RewardsStepSuccessDescription', 'You and your referrer will both receive rewards.') }}
      </p>
    </div>

    <!-- Skip Button (prominent secondary action) -->
    <div v-if="!isCodeProcessed" class="q-mt-lg text-center">
      <q-btn
        outline
        no-caps
        :label="$t('RewardsStepSkipButton', 'I was not referred')"
        class="text-bow skip-button button button-text-primary"
        :class="getDarkModeClass(darkMode)"
        @click="$emit('on-proceed-to-next-step')"
      />
    </div>

    <!-- Continue Button (only show after success) -->
    <q-btn
      v-if="isCodeProcessed"
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
        {{ $t('ProcessingReferralCode', 'Processing referral code') }} ...
      </span>
    </div>
    <div class="row justify-center q-mt-md">
      <progress-loader />
    </div>
  </div>
</template>

<script>
import { processReferralCode } from 'src/utils/engagementhub-utils/rewards'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

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
    darkMode: { type: Boolean, default: false }
  },

  emits: ['on-proceed-to-next-step'],

  data () {
    return {
      showQrScanner: false,
      isLoading: false,
      isCodeProcessed: false,
      isProcessingError: false,
      manualReferralCode: ''
    }
  },

  computed: {
    isValidManualCode () {
      // Validate format: type-code-id (e.g., RP-ABC123-456)
      const parts = this.manualReferralCode.trim().split('-')
      return parts.length === 3 && parts[0] && parts[1] && parts[2]
    }
  },

  methods: {
    getDarkModeClass,
    
    async processReferralCode (content) {
      this.isLoading = true
      this.isProcessingError = false
      let referralCode = null

      if (typeof content === 'object') referralCode = content[0].rawValue
      else if (typeof content === 'string') referralCode = content

      if (referralCode) {
        this.isProcessingError = await this.submitReferralCode(referralCode)
      } else {
        this.isProcessingError = true
      }

      this.isCodeProcessed = !this.isProcessingError
      this.isLoading = false
    },

    async processManualCode () {
      if (!this.isValidManualCode) return
      
      this.isLoading = true
      this.isProcessingError = false
      
      this.isProcessingError = await this.submitReferralCode(this.manualReferralCode.trim())
      
      this.isCodeProcessed = !this.isProcessingError
      this.isLoading = false
    },

    async submitReferralCode (code) {
      const parts = code.split('-')
      if (parts.length !== 3) return true // Invalid format

      return await processReferralCode({
        wallet_hash: this.walletHash,
        model: parts[0],
        code: parts[1],
        id: parts[2]
      })
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
  }
  
  &.q-field--dark.q-field--outlined :deep(.q-field__control),
  &.q-field--dark.q-field--outlined :deep(.q-field__control-container),
  &.q-field--dark.q-field--outlined :deep(.q-field__native) {
    background: #ffffff !important;
  }
  
  &.dark.q-field--outlined :deep(.q-field__control),
  &.dark.q-field--outlined :deep(.q-field__control-container),
  &.dark.q-field--outlined :deep(.q-field__native) {
    background: #ffffff !important;
  }
  
  &.light.q-field--outlined :deep(.q-field__control),
  &.light.q-field--outlined :deep(.q-field__control-container),
  &.light.q-field--outlined :deep(.q-field__native) {
    background: #ffffff !important;
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

.btn-scan {
  &.button {
    min-width: 48px;
    min-height: 48px;
  }
}
</style>
