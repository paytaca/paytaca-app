<template>
  <div id="app-container" class="seed-phrase-view-container sticky-header-container text-bow" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('SeedPhrase', {}, 'Seed Phrase')" backnavpath="/apps/wallet-backup" class="header-nav apps-header" />

    <div class="content-wrapper" :style="{ 'margin-top': $q.platform.is.ios ? '0px' : '-30px'}">
      <!-- Loading State -->
      <div v-if="!authenticated" class="text-center q-py-xl">
        <q-spinner-dots size="50px" color="primary" />
        <div class="q-mt-md">{{ $t('Authenticating', {}, 'Authenticating') }}...</div>
      </div>

      <!-- Content (shown after authentication) -->
      <template v-else>
        <!-- Warning Banner -->
        <div class="warning-banner q-mx-lg q-mt-xl q-mb-lg">
          <div class="warning-content pt-card-2" :class="getDarkModeClass(darkMode)">
            <div class="row items-start">
              <q-icon name="visibility_off" size="32px" class="warning-icon text-warning" />
              <div class="col q-ml-md">
                <div class="warning-title text-weight-bold">{{ $t('KeepThisPrivate', {}, 'Keep This Private') }}</div>
                <div class="warning-text">
                  {{ $t('MakeSureNoOneIsWatching', {}, 'Make sure no one is watching your screen. Anyone with your seed phrase can access your funds.') }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Seed Phrase Display -->
        <div class="seed-phrase-section q-px-lg q-mb-lg">
          <div class="section-label q-mb-md">
            <div class="label-text">{{ $t('Your12WordRecoveryPhrase', {}, 'Your 12-Word Recovery Phrase') }}</div>
          </div>
          <SeedPhraseContainer :mnemonic="mnemonic" />
        </div>

        <!-- Instructions -->
        <div class="instructions-section q-px-lg q-mb-xl">
        <div class="instructions-card pt-card" :class="getDarkModeClass(darkMode)">
          <div class="instruction-title q-mb-md">
            <q-icon name="info" size="24px" class="q-mr-sm" />
            {{ $t('ImportantInstructions', {}, 'Important Instructions') }}
          </div>
          <div class="instruction-list">
            <div class="instruction-item">
              <div class="item-number">1</div>
              <div class="item-text">{{ $t('WriteDownWordsInOrder', {}, 'Write down all 12 words in the correct order') }}</div>
            </div>
            <div class="instruction-item">
              <div class="item-number">2</div>
              <div class="item-text">{{ $t('StoreInSecureLocation', {}, 'Store in a secure physical location') }}</div>
            </div>
            <div class="instruction-item">
              <div class="item-number">3</div>
              <div class="item-text">{{ $t('NeverShareWithAnyone', {}, 'Never share with anyone or store digitally') }}</div>
            </div>
            <div class="instruction-item">
              <div class="item-number">4</div>
              <div class="item-text">{{ $t('KeepMultipleBackups', {}, 'Keep multiple backups in different secure locations') }}</div>
            </div>
          </div>
        </div>
      </div>
      </template>
    </div>

    <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="onPinVerified" />
    <biometricWarningAttempts :warning-attempts="warningAttemptsStatus" />
  </div>
</template>

<script>
import HeaderNav from 'src/components/header-nav'
import SeedPhraseContainer from 'src/components/SeedPhraseContainer'
import { getMnemonic } from 'src/wallet'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import pinDialog from 'src/components/pin'
import biometricWarningAttempts from 'src/components/authOption/biometric-warning-attempt.vue'
import { NativeBiometric } from 'capacitor-native-biometric'

export default {
  name: 'view-seed-phrase',

  components: {
    HeaderNav,
    SeedPhraseContainer,
    pinDialog,
    biometricWarningAttempts
  },

  data () {
    return {
      mnemonic: '',
      pinDialogAction: '',
      warningAttemptsStatus: 'dismiss',
      authenticated: false
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass,
    
    executeSecurityChecking () {
      const vm = this
      setTimeout(() => {
        if (vm.$store.getters['global/preferredSecurity'] === 'pin') {
          vm.pinDialogAction = 'VERIFY'
        } else {
          vm.verifyBiometric()
        }
      }, 300)
    },
    
    verifyBiometric () {
      const vm = this
      NativeBiometric.verifyIdentity({
        reason: this.$t('NativeBiometricReason2', {}, 'For security verification'),
        title: this.$t('SecurityAuthentication', {}, 'Security Authentication'),
        subtitle: this.$t('NativeBiometricSubtitle', {}, 'Verify your identity'),
        description: ''
      })
        .then(() => {
          setTimeout(() => {
            vm.onAuthenticationSuccess()
          }, 300)
        })
        .catch((error) => {
          vm.warningAttemptsStatus = 'dismiss'
          if (error.message.includes('Too many attempts') || error.message.includes(vm.$t('MaxAttempts'))) {
            vm.warningAttemptsStatus = 'show'
          } else if (error.message.includes('Authentication') || error.message.includes('Failed')) {
            vm.verifyBiometric()
          } else {
            // User cancelled or other error
            vm.$router.push('/apps/wallet-backup')
          }
        })
    },
    
    onPinVerified (action) {
      const vm = this
      console.log('PIN verified with action:', action)
      
      if (action === 'proceed') {
        console.log('Authentication successful, loading mnemonic...')
        vm.pinDialogAction = ''
        vm.onAuthenticationSuccess()
      } else if (action === 'cancel') {
        // User explicitly cancelled
        console.log('Authentication cancelled, redirecting back')
        vm.pinDialogAction = ''
        vm.$router.push('/apps/wallet-backup')
      }
      // Ignore undefined/empty actions (from resetAll)
    },
    
    onAuthenticationSuccess () {
      const vm = this
      vm.authenticated = true
      getMnemonic(vm.$store.getters['global/getWalletIndex']).then(function (mnemonic) {
        vm.mnemonic = mnemonic
      }).catch(error => {
        console.error('Error loading mnemonic:', error)
        vm.$q.notify({
          message: vm.$t('ErrorLoadingWalletData', {}, 'Error loading wallet data'),
          color: 'negative',
          icon: 'error',
          position: 'top',
          timeout: 3000
        })
        vm.$router.push('/apps/wallet-backup')
      })
    }
  },

  mounted () {
    this.executeSecurityChecking()
  }
}
</script>

<style lang="scss" scoped>
  .seed-phrase-view-container {
    min-height: 100vh;
    padding-bottom: 40px;
  }

  .content-wrapper {
    max-width: 800px;
    margin: 0 auto;
  }

  // Warning Banner
  .warning-banner {
    .warning-content {
      padding: 20px 24px;
      border-radius: 16px;
      border-left: 4px solid var(--q-warning);
    }

    .warning-icon {
      flex-shrink: 0;
    }

    .warning-title {
      font-size: 18px;
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .warning-text {
      font-size: 14px;
      opacity: 0.85;
      line-height: 1.6;
    }
  }

  // Seed Phrase Section
  .seed-phrase-section {
    .section-label {
      text-align: center;

      .label-text {
        font-size: 16px;
        font-weight: 600;
        opacity: 0.9;
      }
    }
  }

  // Instructions Section
  .instructions-section {
    .instructions-card {
      padding: 24px;
      border-radius: 16px;

      .instruction-title {
        font-size: 16px;
        font-weight: 600;
        display: flex;
        align-items: center;
      }

      .instruction-list {
        .instruction-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 12px 0;

          &:not(:last-child) {
            border-bottom: 1px solid rgba(128, 128, 128, 0.15);
          }

          .item-number {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: var(--q-primary);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 14px;
            flex-shrink: 0;
          }

          .item-text {
            flex: 1;
            font-size: 14px;
            line-height: 1.6;
            padding-top: 6px;
          }
        }
      }
    }
  }

  // Responsive Design
  @media (max-width: 600px) {
    .warning-banner {
      .warning-content {
        padding: 16px 20px;
      }

      .warning-icon {
        font-size: 28px !important;
      }

      .warning-title {
        font-size: 16px;
      }

      .warning-text {
        font-size: 13px;
      }
    }

    .instructions-section {
      .instructions-card {
        padding: 20px;

        .instruction-title {
          font-size: 15px;
        }

        .instruction-list .instruction-item {
          gap: 12px;

          .item-number {
            width: 28px;
            height: 28px;
            font-size: 13px;
          }

          .item-text {
            font-size: 13px;
          }
        }
      }
    }
  }
</style>

