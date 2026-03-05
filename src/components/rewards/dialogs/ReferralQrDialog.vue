<template>
  <q-dialog persistent ref="dialogRef" seamless class="no-click-outside">
    <q-card class="q-pa-md pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row justify-between items-center q-mb-sm">
        <span class="text-h6">{{ $t(`${referralType}ReferralQR`) }}</span>
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <div class="text-subtitle1 q-mb-sm">
        {{ $t('ReferralQRDescription', 'Have new users scan this QR code or use the referral code during wallet creation.') }}
      </div>

      <div class="row justify-center q-mb-md">
        <qr-code
          name="rfp-qr"
          border-width="3px"
          border-color="var(--q-primary)"
          :qr-id="0"
          :text="referralCodeFull"
          :size="200"
        />
      </div>

      <!-- Referral Code Display -->
      <div 
        class="referral-code-container q-mb-md"
        :class="{ 
          'copy-success': copySuccess, 
          'copy-failed': copyFailed,
          [getDarkModeClass(darkMode)]: true 
        }"
      >
        <div class="text-subtitle1 text-bow q-mb-xs" :class="getDarkModeClass(darkMode)">
          {{ $t('ReferralCode', 'Referral Code') }}
        </div>
        <div class="row justify-center items-center q-gutter-sm">
          <code class="referral-code-text" :class="getDarkModeClass(darkMode)">
            {{ referralCodeFull }}
          </code>
          <q-btn
            flat
            dense
            round
            size="sm"
            :icon="copyButtonIcon"
            :color="copyButtonColor"
            class="copy-btn"
            :class="{ 'copy-success-icon': copySuccess, 'copy-failed-icon': copyFailed }"
            @click="copyReferralCode"
          >
            <q-tooltip>{{ copyTooltip }}</q-tooltip>
          </q-btn>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'ReferralQrDialog',

  props: {
    code: { type: String, default: '' },
    promoId: { type: Number, default: -1 },
    promoType: { type: String, default: '' },
    referralType: { type: String, default: '' }
  },

  data () {
    return {
      copyTooltip: 'Copy',
      copySuccess: false,
      copyFailed: false
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    referralCodeFull () {
      return `${this.promoType}-${this.code}-${this.promoId}`
    },
    copyButtonIcon () {
      if (this.copySuccess) return 'check'
      if (this.copyFailed) return 'close'
      return 'content_copy'
    },
    copyButtonColor () {
      if (this.copySuccess) return 'positive'
      if (this.copyFailed) return 'negative'
      return undefined
    }
  },

  methods: {
    getDarkModeClass,
    
    copyReferralCode () {
      if (!this.referralCodeFull) return
      
      // Reset states first
      this.copySuccess = false
      this.copyFailed = false
      
      navigator.clipboard.writeText(this.referralCodeFull).then(() => {
        // Success state
        this.copySuccess = true
        this.copyTooltip = 'Copied!'
        
        setTimeout(() => {
          this.copySuccess = false
          this.copyTooltip = 'Copy'
        }, 2000)
      }).catch(() => {
        // Failed state
        this.copyFailed = true
        this.copyTooltip = 'Failed to copy'
        
        setTimeout(() => {
          this.copyFailed = false
          this.copyTooltip = 'Copy'
        }, 2000)
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.referral-code-container {
  text-align: center;
  padding: 12px;
  border-radius: 8px;
  background: rgba(128, 128, 128, 0.1);
  transition: all 0.3s ease;
  
  &.copy-success {
    background: rgba(76, 175, 80, 0.2) !important;
    box-shadow: 0 0 12px rgba(76, 175, 80, 0.4);
    animation: successPulse 0.5s ease;
  }
  
  &.copy-failed {
    background: rgba(244, 67, 54, 0.2) !important;
    box-shadow: 0 0 12px rgba(244, 67, 54, 0.4);
    animation: failShake 0.5s ease;
  }
}

@keyframes successPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes failShake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}

.referral-code-text {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.15);
  transition: all 0.3s ease;
  
  &.dark {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }
  
  &.light {
    color: #000;
    background: rgba(0, 0, 0, 0.05);
  }
}

.copy-btn {
  opacity: 0.7;
  transition: all 0.3s ease;
  
  &:hover {
    opacity: 1;
  }
  
  &.copy-success-icon {
    opacity: 1;
    animation: iconPop 0.3s ease;
  }
  
  &.copy-failed-icon {
    opacity: 1;
    animation: iconPop 0.3s ease;
  }
}

@keyframes iconPop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
}
</style>
