<template>
  <q-dialog
    persistent
    seamless
    ref="dialogRef"
    class="no-click-outside"
    @show="onDialogShow"
    @hide="onDialogHide"
  >
    <q-card 
      class="q-pa-md pt-card text-bow br-15" 
      :class="getDarkModeClass(darkMode)"
      style="max-width: 450px; width: 90vw; max-height: 85vh; display: flex; flex-direction: column;"
    >
      <!-- Header -->
      <div class="row justify-between items-center q-mb-sm dialog-header">
        <div class="row items-center q-gutter-sm">
          <q-icon name="card_giftcard" size="28px" color="primary" />
          <span class="text-h6 text-weight-bold">{{ $t('RedeemPoints', 'Redeem Points') }}</span>
        </div>
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <q-separator class="q-mb-md" />

      <div class="dialog-content scrollable-content">
        <!-- Loading State - Skeleton -->
        <div v-if="isLoading" class="skeleton-container q-py-md">
          <div class="text-center q-mb-lg">
            <q-skeleton type="text" width="120px" height="40px" class="q-mx-auto q-mb-sm" />
            <q-skeleton type="text" width="80px" height="20px" class="q-mx-auto" />
          </div>
          
          <q-card class="q-mb-md" flat bordered>
            <q-card-section>
              <q-skeleton type="text" width="50%" class="q-mb-sm" />
              <q-skeleton type="QInput" height="40px" class="q-mb-md" />
              <div class="row items-center justify-between">
                <q-skeleton type="QChip" class="col-2"/>
                <q-skeleton type="QChip" class="col-2"/>
                <q-skeleton type="QChip" class="col-2"/>
                <q-skeleton type="QChip" class="col-2"/>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered>
            <q-card-section>
              <q-skeleton type="text" width="50%" class="q-mb-sm" />
              <q-skeleton type="QInput" height="25px" />
            </q-card-section>
          </q-card>
        </div>

        <!-- Error State -->
        <div v-else-if="loadingError" class="text-center q-ma-sm">
          <error-card
            :is-points-card="true"
            :is-rewards-home-page="false"
            :error-text="loadingError"
            @on-retry="fetchContractPoints"
          />
        </div>

        <!-- Main Content -->
        <template v-else>
          <!-- Points Hero Section -->
          <div class="points-hero-section text-center q-mb-lg">
            <div 
              class="points-display-container q-pa-md rounded-borders"
              :class="darkMode ? 'bg-dark-3' : 'bg-grey-2'"
            >
              <div class="text-caption text-uppercase q-mb-xs" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                {{ $t('RemainingPoints', 'Remaining Points') }}
              </div>
              <div class="row flex-center">
                <span 
                  class="text-h4 text-bold text-primary animated-points"
                  :class="{ 'animate': isPointsAnimating }"
                >
                  {{ displayPoints }}
                </span>
                <span 
                  class="text-subtitle1 text-weight-bold q-ml-sm"
                  :class="darkMode ? 'text-grey-6' : 'text-grey-8'"
                >
                  points
                </span>
              </div>
              
              <!-- Promo Limit Progress Bar -->
              <div v-if="redeemablePoints" class="promo-limit-section q-mt-md">
                <div class="row justify-between items-center q-mb-xs">
                  <span class="text-caption" :class="darkMode ? 'text-grey-7' : 'text-grey-7'">
                    {{ $t('PromoLimit', 'Promo Limit') }}
                  </span>
                  <span 
                    class="text-caption text-weight-medium"
                    :class="promoLimitExceeded ? 'text-negative' : 'text-positive'"
                  >
                    {{ Math.max(0, redeemablePoints - Number(pointsToRedeem || 0)) }} points remaining
                  </span>
                </div>
                <q-linear-progress
                  :value="promoProgressValue"
                  :color="promoProgressColor"
                  size="8px"
                  rounded
                  class="promo-progress-bar"
                  :class="{ 'exceeded': promoLimitExceeded }"
                />
                <div class="text-caption q-mt-xs" :class="darkMode ? 'text-grey-7' : 'text-grey-7'">
                  {{ $t('MaxRedeemable', 'Max redeemable') }}: {{ maxRedeemable }} points
                </div>
              </div>
            </div>
          </div>

          <!-- Amount Input Section -->
          <q-card flat bordered class="amount-input-card" :class="getDarkModeClass(darkMode)">
            <q-card-section class="q-px-md q-py-sm">
              <div class="text-subtitle2 text-weight-medium q-mb-sm">
                <q-icon name="toll" size="16px" class="q-mr-sm" color="primary" />
                {{ $t('AmountToRedeem', 'Amount to Redeem') }}
              </div>
              
              <q-input
                ref="points-input"
                type="text"
                inputmode="none"
                @focus="customKeyboardState = 'show'"
                filled
                v-model="pointsToRedeem"
                :dark="darkMode"
                class="amount-input"
                input-class="text-h6 text-center"
              >
                <template v-slot:append>
                  <div class="text-weight-bold text-primary" style="font-size: 14px;">
                    points
                  </div>
                </template>
              </q-input>

              <!-- Quick Amount Buttons -->
              <div class="row q-gutter-sm q-mt-sm">
                <q-btn
                  v-for="percent in quickAmounts"
                  :key="percent"
                  :outline="activeQuickAmount !== percent"
                  :color="activeQuickAmount === percent ? 'primary' : ''"
                  dense
                  no-caps
                  size="sm"
                  class="quick-amount-btn col"
                  :class="getDarkModeClass(darkMode)"
                  :label="percent === 100 ? 'MAX' : `${percent}%`"
                  @click="setQuickAmount(percent)"
                  :disable="isCalculatingQuickAmount"
                />
              </div>
            </q-card-section>
          </q-card>

          <!-- Redeem Progress Preview -->
          <q-slide-transition :duration="300">
            <div v-if="Number(pointsToRedeem) > 0 && !hasValidationError" class="redeem-preview q-mt-md">
              <q-card 
                flat 
                bordered 
                class="preview-card"
                :class="[getDarkModeClass(darkMode), { 'pulse-animation': isRedeemReady }]"
              >
                <q-card-section class="q-pa-sm">
                  <div class="row items-center q-gutter-md">
                    <div class="preview-icon-container">
                      <q-icon name="arrow_forward" size="24px" color="white" />
                    </div>
                    <div class="col">
                      <div class="text-caption text-uppercase" :class="darkMode ? 'text-grey-6' : 'text-grey-7'">
                        {{ $t('YouWillReceive') }}
                      </div>
                      <div class="text-h6 text-weight-bold text-positive">
                        {{ pointsToRedeem }} LIFT
                      </div>
                      <div class="text-caption" :class="darkMode ? 'text-grey-7' : 'text-grey-7'">
                        {{ $t('ToYourTokenAddress', 'to your token address') }}
                      </div>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </q-slide-transition>

          <!-- Validation Error Alert -->
          <q-slide-transition :duration="300">
            <div v-if="hasValidationError" class="q-mt-md">
              <q-banner class="bg-negative text-white rounded-borders" dense>
                <template v-slot:avatar>
                  <q-icon name="error" />
                </template>
                {{ validationErrorMessage }}
              </q-banner>
            </div>
          </q-slide-transition>

          <!-- Token Address Card -->
          <q-card 
            class="token-address-card q-mt-md" 
            flat 
            bordered
            :class="getDarkModeClass(darkMode)"
          >
            <q-card-section class="q-px-md q-py-sm">
              <div class="row items-center q-gutter-sm">
                <q-icon name="account_balance_wallet" size="20px" color="primary" />
                <span class="text-caption text-weight-medium">
                  {{ $t('DestinationAddress', 'Destination Address') }}
                </span>
              </div>
              <div class="q-mt-sm q-px-sm q-py-xs rounded-borders token-address-box">
                <div class="row items-center no-wrap">
                  <q-icon name="vpn_key" size="16px" class="q-mr-sm" color="primary" />
                  <span class="text-body2 text-grey-8 ellipsis">{{ tokenAddress }}</span>
                  <q-btn
                    flat
                    dense
                    round
                    size="sm"
                    icon="content_copy"
                    class="q-ml-auto"
                    @click="copyTokenAddress"
                  >
                    <q-tooltip>{{ $t('Copy') }}</q-tooltip>
                  </q-btn>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </template>
      </div>

      <q-separator class="q-mt-md" />

      <!-- Action Buttons -->
      <div class="row full-width justify-evenly q-mt-md dialog-footer">
        <template v-if="isSending">
          <div class="text-center full-width">
            <progress-loader :isTight="true" class="q-mb-md" />
            <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-7'">
              {{ $t('ProcessingRedemption', 'Processing redemption...') }}
            </div>
          </div>
        </template>
        <template v-else>
          <q-btn
            rounded
            outline
            class="button button-text-primary action-btn"
            :class="getDarkModeClass(darkMode)"
            :label="$t('Cancel')"
            v-close-popup
          />
          <q-btn
            rounded
            class="button action-btn redeem-btn"
            :class="{ 'animate-pulse': isRedeemReady }"
            :label="$t('Redeem')"
            :disable="!isRedeemReady"
            :loading="isSending"
            @click="executeSecurityChecking"
          >
            <template v-slot:loading>
              <q-spinner-dots color="white" />
            </template>
          </q-btn>
        </template>
      </div>
    </q-card>

    <!-- Success Celebration Overlay -->
    <teleport to="body">
      <div v-if="showCelebration" class="celebration-overlay" @click="closeCelebration">
        <canvas ref="confettiCanvas" class="confetti-canvas"></canvas>
        <div class="celebration-content text-center">
          <q-icon name="celebration" size="64px" color="warning" class="celebration-icon" />
          <div class="text-h4 text-weight-bold text-white q-mt-md">
            {{ $t('RedemptionSuccessful', 'Redemption Successful!') }}
          </div>
          <div class="text-subtitle1 text-white q-mt-sm">
            {{ pointsToRedeem }} {{ $t('Redeemed', 'points redeemed') }}
          </div>
          <q-btn
            rounded
            color="white"
            text-color="primary"
            class="q-mt-lg"
            :label="$t('Awesome', 'Awesome!')"
            @click="closeCelebration"
          />
        </div>
      </div>
    </teleport>

    <!-- Custom Keyboard -->
    <custom-keyboard
      :custom-keyboard-state="customKeyboardState"
      v-on:addKey="setAmount"
      v-on:makeKeyAction="makeKeyAction"
    />

    <!-- PIN Dialog -->
    <pin-dialog
      v-model:pin-dialog-action="pinDialogAction"
      v-on:nextAction="onSecurityCheckSuccess"
    />

    <!-- Biometric Warning -->
    <biometric-warning-attempt :warning-attempts="warningAttemptsStatus" />
  </q-dialog>
</template>

<script>
import { loadWallet } from 'src/wallet'
import { raiseNotifyError } from 'src/utils/notify-utils'
import { parseKey } from 'src/utils/custom-keyboard-utils'
import { NativeBiometric } from 'capacitor-native-biometric'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getAddress0_0PublicKey } from 'src/utils/memo-key-utils'
import {
  getWalletTokenAddress,
  recordPointsRedemption
} from 'src/utils/engagementhub-utils/rewards'

import PinDialog from 'src/components/pin/index.vue'
import CustomKeyboard from 'src/components/CustomKeyboard.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import ErrorCard from 'src/components/rewards/cards/ErrorCard.vue'
import BiometricWarningAttempt from 'src/components/authOption/biometric-warning-attempt.vue'

import PromoContract from 'src/utils/rewards-utils/contracts/PromoContract'
import confetti from 'canvas-confetti'

export default {
  name: 'RedeemPointsDialog',

  props: {
    promoId: { type: Number, default: -1 },
    promoType: { type: String, default: '' },
    promoBytes: { type: String, default: '' },
    redeemedPoints: { type: Number, default: null },
    maxRedeemable: { type: Number, default: null }
  },

  components: {
    PinDialog,
    CustomKeyboard,
    ProgressLoader,
    ErrorCard,
    BiometricWarningAttempt,
  },

  data () {
    return {
      // UI State
      pointsToRedeem: '0',
      customKeyboardState: 'dismiss',
      isLoading: true,
      loadingError: null,
      isSending: false,
      isPointsAnimating: false,
      displayPoints: 0,
      showCelebration: false,
      isCalculatingQuickAmount: false,
      activeQuickAmount: null,
      
      // Security
      isSecurityCheckSuccess: false,
      warningAttemptsStatus: 'dismiss',
      pinDialogAction: '',
      
      // Data
      contract: null,
      contractPoints: 0,
      originalPoints: 0,
      tokenAddress: '',
      quickAmounts: [25, 50, 75, 100]
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    animatedPoints () {
      // Computed property showing remaining points after entered amount
      return Math.max(0, this.contractPoints - Number(this.pointsToRedeem || 0))
    },
    redeemablePoints () {
      if (this.redeemedPoints !== null && this.maxRedeemable !== null)
        return this.maxRedeemable - this.redeemedPoints
      return null
    },
    hasValidationError () {
      const amount = Number(this.pointsToRedeem || 0)
      if (amount <= 0) return false
      if (amount > this.contractPoints) return true
      if (this.redeemablePoints && amount > this.redeemablePoints) return true
      return false
    },
    validationErrorMessage () {
      const amount = Number(this.pointsToRedeem || 0)
      if (amount > this.contractPoints) {
        return this.$t('BalanceExceeded', 'Amount exceeds available balance')
      }
      if (this.redeemablePoints && amount > this.redeemablePoints) {
        return this.$t('PromoLimitExceeded', 'Amount exceeds promo limit')
      }
      return ''
    },
    promoProgressValue () {
      if (!this.redeemablePoints) return 0
      const redeemed = Number(this.pointsToRedeem || 0)
      return Math.min(redeemed / this.redeemablePoints, 1)
    },
    promoProgressColor () {
      if (this.promoLimitExceeded) return 'negative'
      if (this.promoProgressValue > 0.8) return 'warning'
      return 'positive'
    },
    promoLimitExceeded () {
      if (!this.redeemablePoints) return false
      return Number(this.pointsToRedeem || 0) > this.redeemablePoints
    },
    isRedeemReady () {
      const amount = Number(this.pointsToRedeem || 0)
      return amount > 0 && !this.hasValidationError && !this.isSending
    }
  },

  watch: {
    // Watch computed animatedPoints and animate displayPoints toward it
    animatedPoints (newVal, oldVal) {
      if (newVal !== oldVal) {
        this.animateDisplayPoints(oldVal, newVal)
      }
    }
  },

  async mounted () {
    await this.initializeData()
  },

  methods: {
    getDarkModeClass,
    
    // Initialization
    async initializeData () {
      this.isLoading = true
      this.loadingError = null
      
      await this.fetchContractPoints()
      
      // Store original total for display
      this.originalPoints = this.contractPoints
      // Get token address
      this.tokenAddress = await getWalletTokenAddress(true)
      // Set initial display points (no animation on first load)
      this.displayPoints = this.contractPoints

      this.isLoading = false
    },
    
    async fetchContractPoints () {
      try {
        const walletIndex = this.$store.getters['global/getWalletIndex']
        const userPubkey = await getAddress0_0PublicKey(walletIndex)
        this.contract = new PromoContract(userPubkey, this.promoBytes)
        this.contractPoints = await this.contract.getTokenBalance()
      } catch (error) {
        console.error('Error initializing redeem dialog:', error)
        this.loadingError = this.$t('FailedToLoadPoints', 'Failed to load points data. Please try again later.')
      }
    },
    
    // Animation Methods
    animateDisplayPoints (start, end, duration = 300) {
      this.isPointsAnimating = true
      const startTime = performance.now()
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeOut = 1 - Math.pow(1 - progress, 3)
        
        this.displayPoints = Math.floor(start + (end - start) * easeOut)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          this.isPointsAnimating = false
        }
      }
      
      requestAnimationFrame(animate)
    },
    
    // Amount Input Methods
    setAmount (key) {
      // Clear active quick amount button on manual input
      this.activeQuickAmount = null
      
      const currentPoints = this.pointsToRedeem
      const currentCaret = this.$refs['points-input']?.nativeEl?.selectionStart || 0

      this.$refs['points-input']?.nativeEl?.focus({ focusVisible: true })
      this.pointsToRedeem = parseKey(key, currentPoints, currentCaret, null)
    },
    
    makeKeyAction (action) {
      if (action === 'backspace') {
        this.$refs['points-input']?.nativeEl?.focus({ focusVisible: true })
        try {
          this.pointsToRedeem = this.pointsToRedeem.slice(0, -1)
        } catch {
          this.pointsToRedeem = '0'
        }
        if (this.pointsToRedeem.length === 0) {
          this.pointsToRedeem = '0'
          this.activeQuickAmount = null
        }
      } else if (action === 'delete') {
        this.activeQuickAmount = null
        this.$refs['points-input']?.nativeEl?.focus({ focusVisible: true })
        this.pointsToRedeem = '0'
      } else {
        this.customKeyboardState = 'dismiss'
      }
    },
    
    setQuickAmount (percent) {
      this.isCalculatingQuickAmount = true
      
      setTimeout(() => {
        const maxAmount = this.redeemablePoints 
          ? Math.min(this.contractPoints, this.redeemablePoints)
          : this.contractPoints
        
        const amount = Math.floor(maxAmount * (percent / 100))
        this.pointsToRedeem = String(amount)
        this.activeQuickAmount = percent
        this.isCalculatingQuickAmount = false
      }, 150)
    },
    
    copyTokenAddress () {
      if (navigator.clipboard && this.tokenAddress) {
        navigator.clipboard.writeText(this.tokenAddress)
        this.$q.notify({
          type: 'positive',
          message: this.$t('AddressCopied', 'Address copied to clipboard'),
          timeout: 1500,
          position: 'bottom'
        })
      }
    },
    
    // Security Methods
    executeSecurityChecking () {
      if (this.isSecurityCheckSuccess) {
        this.redeemPoints()
      } else {
        setTimeout(() => {
          if (this.$store.getters['global/preferredSecurity'] === 'pin') {
            this.pinDialogAction = 'VERIFY'
          } else {
            this.verifyBiometric()
          }
        }, 300)
      }
    },
    
    verifyBiometric () {
      NativeBiometric.verifyIdentity({
        reason: this.$t('NativeBiometricReason2'),
        title: this.$t('SecurityAuthentication'),
        subtitle: this.$t('NativeBiometricSubtitle'),
        description: ''
      })
        .then(() => {
          this.customKeyboardState = 'dismiss'
          setTimeout(() => {
            this.onSecurityCheckSuccess('proceed')
          }, 500)
        })
        .catch((error) => {
          this.warningAttemptsStatus = 'dismiss'
          if (error.message.includes(this.$t('MaxAttempts'))) {
            this.warningAttemptsStatus = 'show'
          } else if (error.message.includes(this.$t('AuthenticationFailed'))) {
            this.verifyBiometric()
          } else {
            this.isSecurityCheckSuccess = false
          }
        })
    },
    
    onSecurityCheckSuccess (action) {
      this.pinDialogAction = ''
      if (action === 'proceed') this.redeemPoints()
    },
    
    // Redemption Process
    async redeemPoints () {
      this.isSending = true
      this.customKeyboardState = 'dismiss'

      try {
        const walletIndex = this.$store.getters['global/getWalletIndex']
        const wallet = await loadWallet('BCH', walletIndex)
        if (!wallet?.BCH) {
          throw new Error('Failed to load BCH wallet.')
        }
        const wif = await wallet.BCH.getPrivateKey('0/0')
        
        const redeemTxid = await this.contract.redeemPoints(
          wif, this.tokenAddress, BigInt(this.pointsToRedeem)
        )

        const recordResp = await recordPointsRedemption({
            promo_type: this.promoType,
            promo_id: this.promoId,
            redeemed_points: this.pointsToRedeem,
            lift_received: this.pointsToRedeem, // TODO replace with conversion calculation
            tx_id: redeemTxid,
            month_max: this.maxRedeemable
        })

        if (recordResp?.error === '') {
          this.showSuccessCelebration()
          
          // Update contract points and animate to new remaining balance
          const redeemedAmount = Number(this.pointsToRedeem)
          this.contractPoints = this.contractPoints - redeemedAmount
          this.animateDisplayPoints(this.displayPoints, this.contractPoints, 500)
        } else {
          throw new Error (recordResp?.error)
        }
      } catch (error) {
        console.error('Redemption error:', error)
        raiseNotifyError('Failed to redeem points. Please try again later.')
      } finally {
        this.isSending = false
      }
    },
    
    // Celebration
    showSuccessCelebration () {
      this.showCelebration = true
      
      this.$nextTick(() => {
        const canvas = this.$refs.confettiCanvas
        if (canvas) {
          const myConfetti = confetti.create(canvas, { resize: true, useWorker: false })
          
          // Launch multiple bursts
          const duration = 3000
          const animationEnd = Date.now() + duration
          const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 }

          const randomInRange = (min, max) => Math.random() * (max - min) + min

          const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now()

            if (timeLeft <= 0) {
              return clearInterval(interval)
            }

            const particleCount = 50 * (timeLeft / duration)
            
            myConfetti({
              ...defaults,
              particleCount,
              origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            })
            myConfetti({
              ...defaults,
              particleCount,
              origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            })
          }, 250)
        }
      })
    },
    
    closeCelebration () {
      this.showCelebration = false
      this.$emit('hide')
    },
    
    // Dialog Lifecycle
    onDialogShow () {
      this.resetForm()
      this.initializeData()
    },
    
    onDialogHide () {
      this.customKeyboardState = 'dismiss'
      this.showCelebration = false
    },
    
    resetForm () {
      this.pointsToRedeem = '0'
      this.isSecurityCheckSuccess = false
      this.isSending = false
      this.showCelebration = false
    }
  }
}
</script>

<style lang="scss" scoped>
.points-hero-section {
  .points-display-container {
    border-radius: 12px;
    border: 2px solid transparent;
    transition: all 0.3s ease;
    
    &.bg-dark-3 {
      background: rgba(255, 255, 255, 0.05);
    }
    
    .animated-points {
      transition: all 0.3s ease;
      
      &.animate {
        transform: scale(1.1);
        text-shadow: 0 0 20px rgba(59, 123, 246, 0.5);
      }
    }
  }
}

.promo-limit-section {
  .promo-progress-bar {
    transition: all 0.5s ease;
    
    &.exceeded {
      animation: pulse-red 1s ease-in-out infinite;
    }
  }
}

@keyframes pulse-red {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.token-address-card {
  border-radius: 12px;
  
  .token-address-box {
    background: rgba(0, 0, 0, 0.03);
    border-radius: 8px;
    
    &.dark {
      background: rgba(255, 255, 255, 0.05);
    }
  }
}

.amount-input-card {
  border-radius: 12px;
  
  .amount-input {
    :deep(.q-field__control) {
      border-radius: 12px;
    }
  }
}

.quick-amount-btn {
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.redeem-preview {
  .preview-card {
    border-radius: 12px;
    transition: all 0.3s ease;
    
    &.pulse-animation {
      animation: gentle-pulse 2s ease-in-out infinite;
      border-color: var(--q-positive);
    }
  }
  
  .preview-icon-container {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4caf50, #8bc34a);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

@keyframes gentle-pulse {
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
  }
  50% { 
    box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
  }
}

.action-btn {
  min-width: 120px;
  transition: all 0.2s ease;
}

.redeem-btn {
  &.animate-pulse {
    animation: btn-pulse 1.5s ease-in-out infinite;
  }
}

@keyframes btn-pulse {
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(59, 123, 246, 0.4);
  }
  50% { 
    box-shadow: 0 0 0 8px rgba(59, 123, 246, 0);
  }
}

// Celebration Overlay
.celebration-overlay {
  position: fixed;
  width: 100vw;
  height: 100vh;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .confetti-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  
  .celebration-content {
    position: relative;
    z-index: 10001;
    animation: celebration-pop 0.5s ease-out;
    
    .celebration-icon {
      animation: icon-bounce 1s ease-in-out infinite;
    }
  }
}

@keyframes celebration-pop {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes icon-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

// Skeleton styles
.skeleton-container {
  :deep(.q-skeleton) {
    background: rgba(0, 0, 0, 0.1);
    
    &.dark {
      background: rgba(255, 255, 255, 0.1);
    }
  }
}

// Dark mode specific adjustments
.dark {
  .token-address-box {
    background: rgba(255, 255, 255, 0.05);
  }
}

// Sticky header and scrollable content styles
.dialog-header {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: transparent;
  padding-bottom: 8px;
}

.scrollable-content {
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
  padding-right: 4px;
  margin-right: -4px;
  
  // Custom scrollbar styling
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }
}

// Sticky footer styles
.dialog-footer {
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  z-index: 10;
  background: transparent;
  padding-top: 8px;
}

// Dark mode scrollbar
.dark .scrollable-content {
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
}
</style>
