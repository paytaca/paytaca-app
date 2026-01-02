<template>
  <div>
    <div class="lock-screen-container" :class="[getDarkModeClass(darkMode), themeClass]">
      <!-- Animated Background Gradient -->
      <div class="animated-background" :class="themeClass"></div>
      
      <!-- Glassmorphic Card -->
      <div class="lock-screen-card" :class="getDarkModeClass(darkMode)">
        <!-- Logo Section with Pulse Animation -->
        <div class="logo-section">
          <div class="logo-glass-circle" :class="[getDarkModeClass(darkMode), themeClass]">
            <div class="logo-glow" :class="themeClass"></div>
            <img src="~/assets/paytaca_logo.png" height="50" alt="" class="logo-image">
          </div>
          <div class="lock-title text-bow" :class="getDarkModeClass(darkMode)">
            {{ $t('YourWalletIsLocked', {}, 'Your wallet is locked') }}
          </div>
        </div>

      <!-- Unlock Button with Theme Color -->
      <div class="unlock-section">
        <!-- Unlock button - always shown, changes based on state -->
        <q-btn
          unelevated
          no-caps
          :color="themeColor"
          class="unlock-button glass-button"
          :class="getDarkModeClass(darkMode)"
          :label="getUnlockButtonLabel()"
          @click="handleUnlock"
          :loading="authenticating"
          :icon-right="getUnlockButtonIcon()"
        >
          <template v-slot:loading>
            <q-spinner-dots size="24px" />
          </template>
        </q-btn>
        
        <!-- Biometric Prompt Status -->
        <div v-if="preferredSecurity === 'biometric' && authenticating && !biometricFailed" class="biometric-status" :class="getDarkModeClass(darkMode)">
          <q-spinner-dots size="32px" :color="themeColor" />
          <p class="q-mt-md text-caption">{{ $t('WaitingForBiometric', {}, 'Waiting for biometric authentication...') }}</p>
        </div>
        
        <!-- Error Message with Glassmorphic Style -->
        <transition name="fade">
          <div v-if="errorMessage" class="error-message glass-error" :class="getDarkModeClass(darkMode)">
            <q-icon name="error_outline" size="18px" />
            <span class="q-ml-xs">{{ errorMessage }}</span>
          </div>
        </transition>
      </div>
      </div>
    </div>

    <!-- PIN Dialog - Outside the lock screen container to avoid z-index issues -->
    <pinDialog
      ref="pinDialogRef"
      :pinDialogAction="pinDialogAction"
      @update:pinDialogAction="val => { console.log('[LockScreen] PIN dialog emitted update:', val); pinDialogAction = val }"
      @nextAction="pinDialogNextAction"
      :disableClose="true"
    />
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import pinDialog from 'src/components/pin/index.vue'
import { NativeBiometric } from 'capacitor-native-biometric'

export default {
  name: 'LockScreen',
  components: {
    pinDialog
  },
  data() {
    return {
      pinDialogAction: '',
      authenticating: false,
      errorMessage: '',
      biometricFailed: false,
      biometricAttempts: 0
    }
  },
  computed: {
    darkMode() {
      return this.$store?.state?.darkmode?.darkmode
    },
    preferredSecurity() {
      return this.$store.getters['global/preferredSecurity']
    },
    theme() {
      return this.$store.getters['global/theme']
    },
    themeClass() {
      return `theme-${this.theme}`
    },
    themeColor() {
      // Map themes to Quasar color names or custom colors
      const themeColorMap = {
        'glassmorphic-blue': 'primary',
        'glassmorphic-gold': 'warning',
        'glassmorphic-green': 'positive',
        'glassmorphic-red': 'negative',
        'payhero': 'warning'
      }
      return themeColorMap[this.theme] || 'primary'
    }
  },
  watch: {
    pinDialogAction(newVal, oldVal) {
      console.log('[LockScreen] pinDialogAction changed from', oldVal, 'to', newVal)
    }
  },
  methods: {
    getDarkModeClass,
    
    getUnlockButtonLabel() {
      if (this.preferredSecurity === 'biometric') {
        if (this.biometricFailed) {
          return this.$t('TryAgain') || 'Try Again'
        }
        return this.$t('Unlock') || 'Unlock'
      }
      return this.$t('Unlock') || 'Unlock'
    },
    
    getUnlockButtonIcon() {
      if (this.preferredSecurity === 'biometric') {
        return 'fingerprint'
      }
      return 'lock_open'
    },
    
    handleUnlock() {
      console.log('[LockScreen] Unlock button clicked')
      console.log('[LockScreen] Preferred security:', this.preferredSecurity)
      
      this.errorMessage = ''
      this.biometricFailed = false
      this.authenticating = true

      if (this.preferredSecurity === 'pin') {
        console.log('[LockScreen] Using PIN authentication')
        this.authenticating = false
        
        console.log('[LockScreen] Current pinDialogAction:', this.pinDialogAction)
        console.log('[LockScreen] Setting pinDialogAction to VERIFY')
        this.pinDialogAction = 'VERIFY'
        console.log('[LockScreen] pinDialogAction after set:', this.pinDialogAction)
        
        // Check PIN dialog state after a delay
        setTimeout(() => {
          console.log('[LockScreen] After timeout, pinDialogAction:', this.pinDialogAction)
          if (this.$refs.pinDialogRef) {
            console.log('[LockScreen] PIN dialog ref exists')
            console.log('[LockScreen] PIN dialog pinDialogAction prop:', this.$refs.pinDialogRef.pinDialogAction)
            console.log('[LockScreen] PIN dialog dialog state:', this.$refs.pinDialogRef.dialog)
            console.log('[LockScreen] PIN dialog actionCaption:', this.$refs.pinDialogRef.actionCaption)
            
            // Try to manually trigger the dialog
            if (!this.$refs.pinDialogRef.dialog) {
              console.warn('[LockScreen] PIN dialog.dialog is false! Trying to set it to true')
              this.$refs.pinDialogRef.dialog = true
            }
          } else {
            console.error('[LockScreen] PIN dialog ref is not available!')
          }
        }, 100)
      } else {
        console.log('[LockScreen] Using biometric authentication')
        this.verifyBiometric()
      }
    },

    verifyBiometric() {
      const vm = this
      
      // Check if NativeBiometric is available
      if (!NativeBiometric || typeof NativeBiometric.verifyIdentity !== 'function') {
        console.error('[LockScreen] NativeBiometric not available')
        vm.authenticating = false
        vm.biometricFailed = true
        vm.errorMessage = vm.$t('BiometricNotAvailable', {}, 'Biometric authentication not available. Please use PIN instead.')
        return
      }
      
      console.log('[LockScreen] Calling NativeBiometric.verifyIdentity')
      vm.errorMessage = ''
      vm.biometricFailed = false
      
      NativeBiometric.verifyIdentity({
        reason: vm.$t('NativeBiometricReason2') || 'Unlock your wallet',
        title: vm.$t('SecurityAuthentication') || 'Security Authentication',
        subtitle: vm.$t('NativeBiometricSubtitle') || 'Verify your identity to unlock your wallet',
        description: ''
      })
        .then(() => {
          // Authentication successful
          console.log('[LockScreen] Biometric authentication successful')
          vm.authenticating = false
          vm.biometricFailed = false
          vm.biometricAttempts = 0
          vm.errorMessage = ''
          vm.onUnlockSuccess()
        })
        .catch((error) => {
          // Failed to authenticate
          vm.authenticating = false
          vm.biometricFailed = true
          vm.biometricAttempts++
          console.error('[LockScreen] Biometric verification error:', error)
          
          if (error.message.includes('Cancel') || 
              error.message.includes('Authentication cancelled') || 
              error.message.includes('Fingerprint operation cancelled') ||
              error.message.includes('User cancelled')) {
            // User cancelled - don't show error, just allow retry
            vm.errorMessage = ''
            console.log('[LockScreen] User cancelled biometric authentication')
          } else if (error.message.includes('Too many attempts') || 
                     error.message.includes('too many attempts')) {
            vm.errorMessage = vm.$t('TooManyAttempts', {}, 'Too many attempts. Please try again later.')
            // Disable retry for a moment
            setTimeout(() => {
              vm.biometricFailed = false
              vm.errorMessage = ''
            }, 2000)
          } else if (error.code === 'UNIMPLEMENTED') {
            vm.errorMessage = vm.$t('BiometricNotSupported', {}, 'Biometric authentication is not supported on this device.')
          } else if (error.message.includes('not enrolled') || 
                     error.message.includes('No biometric credentials')) {
            vm.errorMessage = vm.$t('BiometricNotEnrolled', {}, 'No biometric credentials found. Please set up biometrics in your device settings.')
          } else {
            // Authentication failed (wrong fingerprint/face)
            vm.errorMessage = vm.$t('BiometricFailed', {}, 'Authentication failed. Please try again.')
            console.log('[LockScreen] Biometric authentication failed - wrong biometric')
          }
        })
    },

    pinDialogNextAction(action) {
      console.log('[LockScreen] PIN dialog action received:', action)
      
      if (action === 'proceed') {
        console.log('[LockScreen] PIN verification successful')
        this.pinDialogAction = ''
        this.errorMessage = ''
        this.onUnlockSuccess()
      } else if (action === 'cancel') {
        console.log('[LockScreen] PIN verification cancelled by user')
        this.pinDialogAction = ''
        this.errorMessage = ''
        // Don't show error on cancel - user can try again
      } else {
        // Action is undefined or empty - this happens during dialog reset
        // Only show error if we were actually in verification mode and it wasn't successful
        console.log('[LockScreen] PIN dialog action is empty/undefined - likely dialog reset')
        // Don't set error message here - wait for explicit failure
      }
    },

    onUnlockSuccess() {
      console.log('[LockScreen] Unlock successful, navigating...')
      
      // Set unlock state in store FIRST, before navigation
      // Use a more explicit approach to ensure state is set
      this.$store.commit('global/setIsUnlocked', true)
      
      // Force a synchronous state update by accessing the state directly
      // This ensures the state is immediately available for the router guard
      const state = this.$store.state.global
      if (state) {
        state.isUnlocked = true
      }
      
      // Verify it was set correctly
      const verifyUnlocked = this.$store.getters['global/isUnlocked']
      console.log('[LockScreen] Unlock state set to true, verified:', verifyUnlocked)
      
      if (!verifyUnlocked) {
        console.error('[LockScreen] ERROR: Unlock state was not set correctly!')
        // Try again with direct state access
        this.$store.commit('global/setIsUnlocked', true)
        if (this.$store.state.global) {
          this.$store.state.global.isUnlocked = true
        }
      }
      
      // Emit unlock event for parent components
      this.$emit('unlocked')
      
      // If there's a redirect path stored, navigate to it
      const redirectPath = this.$route.query.redirect || '/'
      console.log('[LockScreen] Redirecting to:', redirectPath)
      
      // Use nextTick to ensure state is committed before navigation
      // Add a small delay on mobile to ensure state propagation
      const delay = this.$q.platform.is.mobile ? 50 : 0
      setTimeout(() => {
        this.$nextTick(() => {
          // Double-check state before navigation
          const finalCheck = this.$store.getters['global/isUnlocked']
          console.log('[LockScreen] Final unlock state check before navigation:', finalCheck)
          
          if (!finalCheck) {
            console.error('[LockScreen] State lost before navigation, setting again')
            this.$store.commit('global/setIsUnlocked', true)
          }
          
          this.$router.replace(redirectPath).catch(err => {
            console.error('[LockScreen] Navigation error:', err)
            // Fallback to home if redirect fails
            this.$router.replace('/')
          })
        })
      }, delay)
    }
  },
  mounted() {
    console.log('[LockScreen] Component mounted')
    console.log('[LockScreen] Preferred security:', this.preferredSecurity)
    console.log('[LockScreen] Theme:', this.theme)
    console.log('[LockScreen] Dark mode:', this.darkMode)
    console.log('[LockScreen] PIN dialog ref:', this.$refs.pinDialogRef)
    
    // Check if PIN dialog is mounted
    this.$nextTick(() => {
      console.log('[LockScreen] After nextTick, PIN dialog ref:', this.$refs.pinDialogRef)
    })
  }
}
</script>

<style lang="scss" scoped>
@keyframes gradientShift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.lock-screen-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  
  &.light {
    background: linear-gradient(-45deg, #f5f7fa, #e8eef5, #f0f4f8, #e3e9f0);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
  }
  
  &.dark {
    background: linear-gradient(-45deg, #1a1d23, #252930, #1e2229, #2a2f38);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
  }
  
  // Theme-specific gradient overlays
  &.theme-glassmorphic-blue {
    &.light::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(66, 165, 245, 0.15), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(21, 101, 192, 0.1), transparent 50%);
      pointer-events: none;
    }
    &.dark::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(66, 165, 245, 0.08), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(21, 101, 192, 0.05), transparent 50%);
      pointer-events: none;
    }
  }
  
  &.theme-glassmorphic-gold {
    &.light::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(255, 167, 38, 0.15), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(230, 81, 0, 0.1), transparent 50%);
      pointer-events: none;
    }
    &.dark::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(255, 167, 38, 0.08), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(230, 81, 0, 0.05), transparent 50%);
      pointer-events: none;
    }
  }
  
  &.theme-glassmorphic-green {
    &.light::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(76, 175, 80, 0.15), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(46, 125, 50, 0.1), transparent 50%);
      pointer-events: none;
    }
    &.dark::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(76, 175, 80, 0.08), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(46, 125, 50, 0.05), transparent 50%);
      pointer-events: none;
    }
  }
  
  &.theme-glassmorphic-red {
    &.light::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(245, 66, 112, 0.15), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(192, 21, 67, 0.1), transparent 50%);
      pointer-events: none;
    }
    &.dark::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(245, 66, 112, 0.08), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(192, 21, 67, 0.05), transparent 50%);
      pointer-events: none;
    }
  }
}

.animated-background {
  position: absolute;
  inset: 0;
  opacity: 0.3;
  pointer-events: none;
}

.lock-screen-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
  max-width: 420px;
  width: 90%;
  border-radius: 24px;
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15),
              0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  animation: fadeIn 0.6s ease-out;
  
  &.dark {
    background: rgba(30, 35, 45, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  
  &.light {
    background: rgba(255, 255, 255, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.5);
  }
}

.logo-section {
  margin-bottom: 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.logo-glass-circle {
  position: relative;
  width: 110px;
  height: 110px;
  margin: 0 auto;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 25px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: pulse 3s ease-in-out infinite;
  
  &.dark {
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3),
                0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  }
  
  &.light {
    background: rgba(255, 255, 255, 0.5);
    border: 2px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12),
                0 0 0 1px rgba(255, 255, 255, 0.3) inset;
  }
  
  // Theme-specific glow effects
  &.theme-glassmorphic-blue {
    box-shadow: 0 12px 40px rgba(66, 165, 245, 0.25),
                0 0 0 1px rgba(66, 165, 245, 0.2) inset;
  }
  
  &.theme-glassmorphic-gold {
    box-shadow: 0 12px 40px rgba(255, 167, 38, 0.25),
                0 0 0 1px rgba(255, 167, 38, 0.2) inset;
  }
  
  &.theme-glassmorphic-green {
    box-shadow: 0 12px 40px rgba(76, 175, 80, 0.25),
                0 0 0 1px rgba(76, 175, 80, 0.2) inset;
  }
  
  &.theme-glassmorphic-red {
    box-shadow: 0 12px 40px rgba(245, 66, 112, 0.25),
                0 0 0 1px rgba(245, 66, 112, 0.2) inset;
  }
}

.logo-glow {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  opacity: 0.3;
  filter: blur(20px);
  pointer-events: none;
  
  &.theme-glassmorphic-blue {
    background: radial-gradient(circle, rgba(66, 165, 245, 0.4), transparent 70%);
  }
  
  &.theme-glassmorphic-gold {
    background: radial-gradient(circle, rgba(255, 167, 38, 0.4), transparent 70%);
  }
  
  &.theme-glassmorphic-green {
    background: radial-gradient(circle, rgba(76, 175, 80, 0.4), transparent 70%);
  }
  
  &.theme-glassmorphic-red {
    background: radial-gradient(circle, rgba(245, 66, 112, 0.4), transparent 70%);
  }
}

.logo-image {
  position: relative;
  z-index: 1;
  width: 100%;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
}

.lock-title {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  opacity: 0.9;
  
  &.dark {
    color: rgba(255, 255, 255, 0.95);
  }
  
  &.light {
    color: rgba(0, 0, 0, 0.85);
  }
}

.unlock-section {
  width: 100%;
  max-width: 320px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.unlock-button {
  width: 100%;
  padding: 14px 32px;
  font-size: 17px;
  font-weight: 600;
  border-radius: 16px;
  letter-spacing: 0.3px;
  min-height: 54px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }
  
  &:active {
    transform: translateY(0);
  }
}

.glass-button {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  
  &.dark {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  &.light {
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
}

.glass-error {
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  animation: fadeIn 0.3s ease-out;
  
  &.dark {
    background: rgba(193, 0, 21, 0.15);
    border: 1px solid rgba(193, 0, 21, 0.3);
    color: #ff6b6b;
  }
  
  &.light {
    background: rgba(193, 0, 21, 0.08);
    border: 1px solid rgba(193, 0, 21, 0.2);
    color: #c10015;
  }
}

.biometric-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  
  p {
    margin: 0;
    opacity: 0.8;
    
    &.dark {
      color: rgba(255, 255, 255, 0.7);
    }
    
    &.light {
      color: rgba(0, 0, 0, 0.7);
    }
  }
}

// Fade transition
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

