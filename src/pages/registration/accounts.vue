<template>
  <!-- <onboarding v-if="isOnboarding" @register="isOnboarding=false"/>  
  <div v-else :class="theme" id="registration-container"> --> 
  <div class="text-bow" :class="[theme, getDarkModeClass(darkMode)]" id="registration-container">
    <!-- Minimal Glassmorphic Layout -->
    <div 
      class="minimal-wallet-container"
      :style="{ 'margin-top': $q.platform.is.ios ? '50px' : '0px'}"
      v-if="mnemonic.length === 0 && importSeedPhrase === false && steps === -1"
    >
      <div v-if="serverOnline === true" v-cloak>
        <!-- Logo Section with Animation -->
        <transition appear @enter="onLogoEnter">
          <div class="logo-section">
            <div class="logo-glass-circle" :class="getDarkModeClass(darkMode)">
              <img src="~/assets/paytaca_logo.png" height="50" alt="" class="logo-image">
            </div>
          </div>
        </transition>

        <!-- Content Section -->
        <div class="content-section">
          <!-- Minimal Welcome Text with Animation -->
          <transition appear @enter="onWelcomeEnter">
            <div class="welcome-text text-bow" :class="getDarkModeClass(darkMode)">
              <h4 class="text-h6 q-mb-sm">{{ $t('GetStartedWithPaytaca') || 'Get Started' }}</h4>
              <p class="text-subtitle2 q-mt-xs">{{ $t('WalletCreationDescription') || 'Create or restore your wallet' }}</p>
            </div>
          </transition>

          <!-- Action Buttons - Minimal Glassmorphic with Staggered Animation -->
          <div class="actions-container">
            <transition appear @enter="onButtonEnter" :style="{ '--delay': '0.4s' }">
              <div 
                id="create-new-wallet"
                class="action-glass-card pt-card bg-grad cursor-pointer text-bow"
                :class="getDarkModeClass(darkMode)"
                @click="initCreateWallet()"
              >
                <div class="action-icon-wrapper">
                  <div class="row justify-center">
                    <q-icon name="mdi-wallet-plus-outline" class="col-12" :color="darkMode ? 'primary' : 'black'" size="29px"></q-icon>
                  </div>
                </div>
                <div class="action-content">
                  <div class="text-subtitle1 q-mb-xs">{{ $t('CreateNewWallet') }}</div>
                  <div class="text-body2 q-mt-xs">{{ $t('CreateWalletDescription') || 'Start fresh' }}</div>
                </div>
              </div>
            </transition>

            <transition appear @enter="onButtonEnter" :style="{ '--delay': '0.5s' }">
              <div 
                class="action-glass-card pt-card bg-grad cursor-pointer text-bow"
                :class="getDarkModeClass(darkMode)"
                @click="initRestoreWallet()"
              >
                <div class="action-icon-wrapper">
                  <div class="row justify-center">
                    <q-icon name="mdi-key-variant" class="col-12" :color="darkMode ? 'primary' : 'black'" size="29px"></q-icon>
                  </div>
                </div>
                <div class="action-content">
                  <div class="text-subtitle1 q-mb-xs">{{ $t('RestoreExistingWallet') }}</div>
                  <div class="text-body2 q-mt-xs">{{ $t('RestoreWalletDescriptionShort') || 'Restore from backup' }}</div>
                </div>
              </div>
            </transition>
          </div>

          <!-- Back Button with Animation -->
          <transition appear @enter="onBackButtonEnter">
            <div class="back-button-container" v-if="!isVaultEmpty">
              <q-btn
                flat
                no-caps
                :label="$t('Back')"
                icon="arrow_back"
                class="back-button text-bow"
                :class="getDarkModeClass(darkMode)"
                @click="!$router.push('/')"
              />
            </div>
          </transition>
        </div>
      </div>
      <div v-else-if="serverOnline === false" class="error-section">
        <div class="error-glass-card" :class="getDarkModeClass(darkMode)">
          {{ $t('NoInternetConnectionNotice') }} &#128533;
        </div>
      </div>
    </div>
    <!-- Step 1: Seed Phrase Generation with Animation -->
    <div
      class="wallet-creation-view"
      :class="getDarkModeClass(darkMode)"
      v-if="currentStep === 1"
    >
      <transition name="fade" mode="out-in">
        <!-- Paytaca Logo with Circle Container Animation -->
        <div
          v-if="!walletCreationError"
          key="creating"
          class="wallet-animation-container"
        >
          <div class="logo-glass-circle creating" :class="getDarkModeClass(darkMode)">
            <img src="~/assets/paytaca_logo.png" height="50" alt="" class="logo-image">
          </div>
        </div>
        
        <!-- Error State -->
        <div
          v-else
          key="error"
          class="wallet-animation-container"
        >
          <div class="logo-glass-circle" :class="getDarkModeClass(darkMode)">
            <img src="~/assets/paytaca_logo.png" height="50" alt="" class="logo-image">
          </div>
          <div class="q-mt-md text-center">
            <p class="text-bow" :class="getDarkModeClass(darkMode)">{{ walletCreationError }}</p>
            <q-btn flat no-caps color="primary" :label="$t('Retry') || 'Retry'" @click="generateSeedPhrase" />
          </div>
        </div>
      </transition>
    </div>

    <!-- Step 2: Language and Currency Selection -->
    <div v-if="(currentStep === 2 && !importSeedPhrase) || restoreStep === 3" class="content-section center-viewport step-2-container" :class="{'ios-safe-area': $q.platform.is.ios, 'mobile-safe-area': isMobile}">
      <h5 class="q-ma-none text-center text-bow step-title" :class="getDarkModeClass(darkMode)">{{ $t('OnBoardSettingHeader') }}</h5>
      <p class="text-center text-bow step-subtitle" :class="getDarkModeClass(darkMode)">{{ $t('OnBoardSettingDescription') }}</p>
      <div class="glass-panel q-mt-md" :class="getDarkModeClass(darkMode)">
        <q-list class="flat-list">
          <q-item class="glass-item" :class="getDarkModeClass(darkMode)">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">{{ $t('Country') }}</q-item-label>
            </q-item-section>
            <q-item-section side id="country-selector">
              <CountrySelector :darkMode="darkMode" />
            </q-item-section>
          </q-item>
          <q-separator spaced class="thin-separator" />
          <q-item class="glass-item" :class="getDarkModeClass(darkMode)">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">{{ $t('Language') }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <LanguageSelector :darkMode="darkMode" />
            </q-item-section>
          </q-item>
          <q-separator spaced class="thin-separator" />
          <q-item class="glass-item" :class="getDarkModeClass(darkMode)">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">{{ $t('Currency') }}</q-item-label>
            </q-item-section>
            <q-item-section side id="currency">
              <CurrencySelector :darkMode="darkMode" :key="currencySelectorRerender" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
      <q-btn
        no-caps
        rounded
        :label="$t('Continue')"
        class="q-mt-lg full-width primary-cta bg-grad"
        @click="goToStep3"
        id="Continue"
      />
    </div>

    <!-- Step 3: Theme Selection -->
    <div v-if="(currentStep === 3 && !importSeedPhrase) || restoreStep === 4" class="content-section center-viewport step-3-container" :class="{'ios-safe-area': $q.platform.is.ios, 'mobile-safe-area': isMobile}">
      <ThemeSelectorPreview :choosePreferedSecurity="goToStep4" />
    </div>

    <!-- Step 4: Security Authentication Setup -->
    <div v-if="(currentStep === 4 && !importSeedPhrase) || restoreStep === 5" class="content-section center-viewport step-4-container" :class="{'ios-safe-area': $q.platform.is.ios, 'mobile-safe-area': isMobile}">
      <h5 class="q-ma-none text-center text-bow step-title" :class="getDarkModeClass(darkMode)">{{ $t('SecurityAuthentication') }}</h5>
      <p class="text-center text-bow step-subtitle" :class="getDarkModeClass(darkMode)">{{ $t('ChoosePreferredSecAuth') }}</p>
      <div class="glass-panel q-mt-md" :class="getDarkModeClass(darkMode)">
        <q-list class="flat-list">
          <q-item class="glass-item" :class="getDarkModeClass(darkMode)" clickable @click="setupSecurity('pin')">
            <q-item-section>
              <q-item-label class="pt-setting-menu text-bow" :class="getDarkModeClass(darkMode)">{{ $t('SetupPin') || 'Setup PIN' }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="lock" size="24px" />
            </q-item-section>
          </q-item>
          <q-separator v-if="isMobile" spaced class="thin-separator" />
          <q-item v-if="isMobile" class="glass-item" :class="getDarkModeClass(darkMode)" clickable @click="setupSecurity('biometric')">
            <q-item-section>
              <q-item-label class="pt-setting-menu text-bow" :class="getDarkModeClass(darkMode)">{{ $t('SetupBiometric') || 'Setup Biometric' }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="fingerprint" size="24px" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>
    <!-- Restore Step 1: Authentication Method Selection -->
    <div v-if="restoreStep === 1 && authenticationPhase === 'options' && mnemonic.length === 0" class="minimal-wallet-container restore-step-1" :class="{'ios-safe-area': $q.platform.is.ios, 'mobile-safe-area': isMobile}">
      <div v-if="serverOnline === true" v-cloak>
        <!-- Content Section -->
        <div class="content-section">
          <!-- Welcome Text with Animation -->
          <transition appear @enter="onWelcomeEnter">
            <div class="welcome-text text-bow" :class="getDarkModeClass(darkMode)">
              <h4 class="text-h6 q-mb-sm">{{ $t('ChooseBackupPhase') || 'Choose Restore Method' }}</h4>
              <p class="text-subtitle2 q-mt-xs">{{ $t('ChooseBackupPhaseDescription') || 'Select how you want to restore your wallet' }}</p>
            </div>
          </transition>

          <!-- Action Buttons - Glassmorphic with Icons -->
          <div class="actions-container">
            <transition appear @enter="onButtonEnter" :style="{ '--delay': '0.4s' }">
              <div 
                class="action-glass-card pt-card bg-grad cursor-pointer text-bow"
                :class="getDarkModeClass(darkMode)"
                @click="onChangeAuthenticationPhase(false)"
              >
                <div class="action-icon-wrapper">
                  <div class="row justify-center">
                    <q-icon name="mdi-key-variant" class="col-12" :color="darkMode ? 'primary' : 'black'" size="29px"></q-icon>
                  </div>
                </div>
                <div class="action-content">
                  <div class="text-subtitle1 q-mb-xs">{{ $t('ProceedWithSeedPhrase') || 'Restore with Seed Phrase' }}</div>
                  <div class="text-body2 q-mt-xs">{{ $t('ImportSeedPhraseDescription') || 'Enter your 12-word backup phrase' }}</div>
                </div>
              </div>
            </transition>

            <transition appear @enter="onButtonEnter" :style="{ '--delay': '0.5s' }">
              <div 
                class="action-glass-card pt-card bg-grad cursor-pointer text-bow"
                :class="getDarkModeClass(darkMode)"
                @click="onChangeAuthenticationPhase(true)"
              >
                <div class="action-icon-wrapper">
                  <div class="row justify-center">
                    <q-icon name="mdi-qrcode-scan" class="col-12" :color="darkMode ? 'primary' : 'black'" size="29px"></q-icon>
                  </div>
                </div>
                <div class="action-content">
                  <div class="text-subtitle1 q-mb-xs">{{ $t('ProceedWithShards') || 'Restore with Shards' }}</div>
                  <div class="text-body2 q-mt-xs">{{ $t('ImportShardsDescription') || 'Use QR code images of shards' }}</div>
                </div>
              </div>
            </transition>
          </div>

          <!-- Back Button with Animation -->
          <transition appear @enter="onBackButtonEnter">
            <div class="back-button-container">
              <q-btn
                flat
                no-caps
                :label="$t('Back')"
                icon="arrow_back"
                class="back-button text-bow"
                :class="getDarkModeClass(darkMode)"
                @click="$router.push('/accounts')"
              />
            </div>
          </transition>
        </div>
      </div>
      <div v-else-if="serverOnline === false" class="error-section">
        <div class="error-glass-card" :class="getDarkModeClass(darkMode)">
          {{ $t('NoInternetConnectionNotice') }} &#128533;
        </div>
      </div>
    </div>

    <!-- Restore Step 2: Seed Phrase Entry -->
    <div v-if="restoreStep === 2 && mnemonic.length === 0" class="content-section center-viewport step-2-container restore-step-2" :class="{'ios-safe-area': $q.platform.is.ios, 'mobile-safe-area': isMobile}">
      <template v-if="authenticationPhase === 'shards'">
        <ShardsImport @set-seed-phrase="onValidatedQrs" @restore-wallet="initCreateWallet" />
      </template>
      <template v-else-if="authenticationPhase === 'backup-phrase'">
        <h5 class="q-ma-none text-center text-bow step-title" :class="getDarkModeClass(darkMode)">{{ $t('RestoreExistingWallet') }}</h5>
        <p class="text-center text-bow step-subtitle" :class="getDarkModeClass(darkMode)">{{ $t('RestoreWalletDescription') }}</p>
        
        <div class="glass-panel q-mt-md" :class="getDarkModeClass(darkMode)">
              <template v-if="useTextArea">
            <div class="q-pa-md">
                <div class="row justify-start q-mb-sm">
                  <q-btn
                    flat
                    no-caps
                    padding="xs sm"
                    icon="arrow_back"
                  class="glass-button-text"
                    :class="getDarkModeClass(darkMode)"
                    :label="$t('EnterOneByOne')"
                    @click="useTextArea = false, seedPhraseBackup = ''"
                  />
                </div>
              <q-input 
                type="textarea" 
                v-model="seedPhraseBackup" 
                :placeholder="$t('PasteSeedPhrase')"
                class="q-mt-xs glass-textarea"
                :class="getDarkModeClass(darkMode)"
                outlined
                rows="4"
              />
            </div>
              </template>
              <template v-else>
            <div class="q-pa-md">
                <div class="row justify-end q-mb-xs">
                  <q-btn
                    flat
                    no-caps
                    padding="xs sm"
                    icon-right="arrow_forward"
                  class="glass-button-text"
                    :class="getDarkModeClass(darkMode)"
                    :label="$t('PasteSeedPhrase')"
                    @click="useTextArea = true, seedPhraseBackup = ''"
                  />
                </div>
                <SeedPhraseContainer :isImport="true" @on-input-enter="onInputEnter" />
            </div>
              </template>
        </div>
        
              <q-btn
                rounded
          :label="$t('RestoreWallet')"
          class="q-mt-lg full-width primary-cta bg-grad"
                @click="initCreateWallet()"
                :disable="!validateSeedPhrase()"
              />
      </template>
    </div>

    <div class="row" v-if="mnemonic.length > 0 && !$route.path.startsWith('/accounts/create/step-') && !$route.path.startsWith('/accounts/restore/step-')">
      <div
        class="pt-get-started q-mt-sm pt-card-2"
        :class="getDarkModeClass(darkMode, 'registration')"
        v-if="isFinalStep"
      >
        <div >
          <div class="q-pa-lg" style="padding-top: 28px;">
            <!-- <div
              v-if="moveToReferral && !openSettings"
            >
              <rewards-step
                :walletHash="this.newWalletHash"
                @on-proceed-to-next-step="onProceedToNextStep"
              />
            </div> -->

            <!-- <div class="row" v-else-if="!moveToReferral && openSettings"> -->
            <div class="row" v-if="openSettings">
              <div class="col">
                <div class="row justify-center text-center">
                  <h5 class="q-ma-none text-bow" :class="getDarkModeClass(darkMode)">{{ $t('OnBoardSettingHeader') }}</h5><br />
                </div>
                <div class="row justify-center text-center">
                  <p style="margin-top: 10px;">
                    {{ $t('OnBoardSettingDescription') }}
                  </p>
                </div>
                <div class="row justify-center q-mt-md">
                  <q-list
                    bordered
                    separator
                    style="border-radius: 14px;"
                    class="pt-card registration-card"
                    :class="getDarkModeClass(darkMode)"
                  >
                    <q-item :class="{'divider' : theme}">
                      <q-item-section>
                        <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">{{ $t('Country') }}</q-item-label>
                      </q-item-section>
                      <q-item-section side id="country-selector">
                        <CountrySelector :darkMode="darkMode" />
                      </q-item-section>
                    </q-item>

                    <q-item :class="{'divider' : theme}">
                      <q-item-section>
                        <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">{{ $t('Language') }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <LanguageSelector :darkMode="darkMode" />
                      </q-item-section>
                    </q-item>

                    <q-item>
                      <q-item-section>
                        <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">{{ $t('Currency') }}</q-item-label>
                      </q-item-section>
                      <q-item-section side id="currency">
                        <CurrencySelector :darkMode="darkMode" 
                        :key="currencySelectorRerender" />
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>
                <div class="row justify-center">
                  <q-btn rounded :label="$t('Continue')" class="q-mt-lg full-width button" @click="setOpenThemeSelector" id="Continue"/> 
                </div>
                <div class="row justify-center">
                  <transition appear enter-active-class="animated fadeIn">
                    <div v-if="theme === 'payhero'" class="q-mt-lg q-pt-sm text-center">
                      <p style="font-size: 16px;">in partnership with</p>
                      <img src="~/assets/themes/payhero/payhero_logo.png" width="130" alt="">
                    </div>
                  </transition>
                </div>
              </div>
            </div>

            <div v-else-if="openThemeSelector">
              <ThemeSelectorPreview
                :choosePreferedSecurity="choosePreferedSecurity"
              />
            </div>

            <div v-else>
              <template v-if="isFinalStep">
                <template v-if="authenticationPhase === 'shards'">
                  <template v-if="seedPhraseBackup">
                    <div class="text-bow" :class="getDarkModeClass(darkMode)">
                      <p style="margin-top: 10px;">
                        {{ $t('WalletRestoredDescription') }}
                      </p>
                    </div>
                    <q-btn id="Continue"
                      rounded
                      :label="$t('Continue')"
                      class="q-mt-lg full-width button"
                      @click="onProceedToNextStep"
                    />
                  </template>
                  <template v-else>
                    <ShardsProcess
                      :mnemonic="mnemonic"
                      :walletHash="newWalletHash"
                      @proceed-to-next-step="onProceedToNextStep()"
                    />
                  </template>
                </template>

                <template v-else-if="importSeedPhrase && authenticationPhase === 'backup-phrase'">
                  <div class="text-bow" :class="getDarkModeClass(darkMode)">
                    <p style="margin-top: 10px;">
                      {{ $t('WalletRestoredDescription') }}
                    </p>
                  </div>
                  <q-btn
                    rounded
                    :label="$t('Continue')"
                    class="q-mt-lg full-width button"
                    @click="onProceedToNextStep"
                  />
                </template>

                <template v-else-if="authenticationPhase === 'skip'">
                  <MnemonicProcessContainer
                    :importSeedPhrase="importSeedPhrase"
                    :isFinalStep="isFinalStep"
                    :mnemonic="mnemonic"
                    :mnemonicVerified="mnemonicVerified"
                    @mnemonic-verified="onMnemonicVerified"
                    @open-settings="onOpenSettings"
                    @confirm-skip-verification="confirmSkipVerification"
                    @change-authentication-phase="onChangeAuthenticationPhase"
                  />
                </template>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <securityOptionDialog
      :security-option-dialog-status="securityOptionDialogStatus"
      v-on:preferredSecurity="setPreferredSecurity"
    />
    <pinDialog
      v-model:pin-dialog-action="pinDialogAction"
      v-on:nextAction="executeActionTaken"
      :new-wallet-mnemonic="mnemonic"
    />

  </div>
</template>

<script>
import { Wallet, storeMnemonic, generateMnemonic } from '../../wallet'
import { getMnemonic } from '../../wallet'
import { utils } from 'ethers'
import { Device } from '@capacitor/device'
import { NativeBiometric } from 'capacitor-native-biometric'
import { getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'
import { supportedLangs as supportedLangsI18n } from '../../i18n'
import { getAllAssets } from 'src/store/assets/getters'
import initialAssetState from 'src/store/assets/state'

import ProgressLoader from '../../components/ProgressLoader'
import pinDialog from '../../components/pin'
import securityOptionDialog from '../../components/authOption'
import LanguageSelector from '../../components/settings/LanguageSelector'
import CountrySelector from '../../components/settings/CountrySelector'
import CurrencySelector from '../../components/settings/CurrencySelector'
import ThemeSelectorPreview from 'src/components/registration/ThemeSelectorPreview'
import ShardsProcess from 'src/components/registration/ShardsProcess'
import AuthenticationChooser from 'src/components/registration/AuthenticationChooser'
import ShardsImport from 'src/components/registration/ShardsImport'
import MnemonicProcessContainer from 'src/components/registration/MnemonicProcessContainer'
import SeedPhraseContainer from 'src/components/SeedPhraseContainer'
import Onboarding from 'src/components/registration/Onboarding.vue'
import Login from 'src/components/registration/Login.vue'
// import RewardsStep from 'src/components/registration/RewardsStep.vue'

function countWords(str) {
  if (str) {
    return str.trim().split(/\s+/).length
  } else {
    return 0
  }
}

export default {
  name: 'registration-accounts',
  props: {
    recreate: {
      type: Boolean,
      default: false
    }
  },
  components: {
    ProgressLoader,
    pinDialog,
    securityOptionDialog,
    LanguageSelector,
    CountrySelector,
    CurrencySelector,
    ThemeSelectorPreview,
    ShardsProcess,
    AuthenticationChooser,
    ShardsImport,
    MnemonicProcessContainer,
    SeedPhraseContainer,
    Onboarding,
    Login
    // RewardsStep
  },
  data () {
    return {
      openSettings: false,
      serverOnline: null,
      importSeedPhrase: false,
      seedPhraseBackup: null,
      mnemonic: '',
      newWalletHash: '',
      newWalletSnapshot: {
        walletInfo: [].map(() => {
          return {
            isChipnet: false,
            type: 'bch', // or slp
            walletHash: '',
            derivationPath: '',
            lastAddress: '',
            lastChangeAddress: '',
            lastAddressIndex: -1,
          }
        }),
        xpubKeysInfo: [].map(() => {
          return {
            isChipnet: false,
            type: 'bch', // or slp
            xPubKey: '',
          }
        }),
      },
      steps: -1,
      totalSteps: 4,
      walletCreationInProgress: false,
      walletCreationComplete: false,
      mnemonicVerified: false,
      pinDialogAction: '',
      pin: '',
      securityOptionDialogStatus: 'dismiss',
      walletIndex: 0,
      currencySelectorRerender: false,
      openThemeSelector: false,
      useTextArea: false,
      authenticationPhase: 'options',
      skipToBackupPhrase: false,
      isOnboarding: false, // this.isVaultEmpty
      pageLoaded: false,
      walletCreationError: '',
      isRedirecting: false,
      step2Initialized: false
      // moveToReferral: false,
    }
  },
  watch: {
    currentStep (val, oldVal) {
      // Reset step2Initialized when leaving step 2
      if (oldVal === 2 && val !== 2) {
        this.step2Initialized = false
      }
      
      // Handle step-specific initialization
      if (val === 1 && !this.mnemonic && !this.importSeedPhrase) {
        // Step 1: Generate seed phrase
        this.generateSeedPhrase()
      } else if (val === 2 && !this.importSeedPhrase) {
        // Step 2: Auto-detect language and currency (geoip call happens here)
        this.$nextTick(() => {
          this.initializeStep2()
        })
      } else if (val === 4 && !this.importSeedPhrase) {
        // Step 4: Force theme update when entering step 4 to ensure theme changes from step 3 apply immediately
        this.$nextTick(() => {
          this.$forceUpdate()
        })
      }
    },
    seedPhraseBackup (val) {
      this.seedPhraseBackup = this.cleanUpSeedPhrase(val)
    },
    $route (to) {
      // Reset restore flow state when navigating back to /accounts
      if (to.path === '/accounts' || to.path === '/accounts/') {
        this.importSeedPhrase = false
        this.authenticationPhase = 'options'
        this.seedPhraseBackup = null
        this.useTextArea = false
      }
      
      // Handle route changes for create flow
      if (to.path.startsWith('/accounts/create/step-')) {
        const stepMatch = to.path.match(/step-(\d+)/)
        if (stepMatch) {
          const routeStep = parseInt(stepMatch[1], 10)
          // Initialize step 1 if needed
          if (routeStep === 1 && !this.mnemonic && !this.importSeedPhrase) {
            // Will be handled by currentStep watcher
          }
          // Initialize step 2 when navigating to it (geoip call happens here)
          if (routeStep === 2 && !this.importSeedPhrase) {
            this.initializeStep2()
          }
        }
      }
      // Handle route changes for restore flow
      if (to.path.startsWith('/accounts/restore/step-')) {
        const stepMatch = to.path.match(/step-(\d+)/)
        if (stepMatch) {
          const routeStep = parseInt(stepMatch[1], 10)
          // Initialize step 1: set importSeedPhrase and authenticationPhase
          if (routeStep === 1) {
            this.importSeedPhrase = true
            this.authenticationPhase = 'options'
          }
          // Initialize step 2: ensure importSeedPhrase is set
          if (routeStep === 2) {
            this.importSeedPhrase = true
            // Preserve authenticationPhase if already set, otherwise default to 'backup-phrase'
            if (!this.authenticationPhase || this.authenticationPhase === 'options') {
              this.authenticationPhase = 'backup-phrase'
            }
          }
          // Initialize step 3 (settings) when navigating to it (geoip call happens here)
          if (routeStep === 3) {
            // Reset step2Initialized to allow initializeStep2 to run for restore flow
            this.step2Initialized = false
            this.$nextTick(() => {
              this.initializeStep2()
            })
          }
        }
      }
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    currentCountry () {
      return this.$store.getters['global/country'].code
    },
    isVaultEmpty() {
      return this.$store.getters['global/isVaultEmpty']
    },
    currentStep () {
      // Extract step number from route path
      if (this.$route.path.startsWith('/accounts/create/step-')) {
        const match = this.$route.path.match(/step-(\d+)/)
        if (match) {
          return parseInt(match[1], 10)
        }
      }
      return 0
    },
    restoreStep () {
      // Extract step number from restore route path
      if (this.$route.path.startsWith('/accounts/restore/step-')) {
        const match = this.$route.path.match(/step-(\d+)/)
        if (match) {
          return parseInt(match[1], 10)
        }
      }
      return 0
    },
    isFinalStep () {
      return this.currentStep === 4
    },
    isMobile () {
      return this.$q.platform.is.mobile || this.$q.platform.is.android || this.$q.platform.is.ios
    },
    // isOnboarding () {
    //   return this.isVaultEmpty
    // }
  },
  methods: {
    getDarkModeClass,
    isHongKong,
    validateSeedPhrase () {
      if (countWords(this.seedPhraseBackup) === 12) {
        return utils.isValidMnemonic(this.seedPhraseBackup)
      } else {
        return false
      }
    },
    cleanUpSeedPhrase (seedPhrase) {
      return seedPhrase.toLowerCase().trim()
        .replace(/\s{2,}/g, ' ') // Remove extra internal whitespaces
        .replace(/[^\x00-\x7F]/g, '') // Remove non-ascii characters
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '') // Remove punctuations
        .replace(/(\r\n|\n|\r)/gm, ' ') // Remove newlines
    },
    confirmSkipVerification () {
      const vm = this
      this.$q.dialog({
        title: this.$t('SkipVerification'),
        message: this.$t('SkipVerificationMessage'),
        ok: true,
        cancel: true,
        seamless: true,
        class: 'text-white br-15 pt-card dark'
      }).onOk(() => {
        vm.openSettings = true
        // vm.moveToReferral = true
      })
    },
    saveToVault () {
      // Get current wallet index (should already be set from initializeVaultEntry)
      const currentWalletIndex = this.$store.getters['global/getWalletIndex']
      
      // saving to wallet vault - update existing entry or create new one
      let wallet = this.$store.getters['global/getAllWalletTypes']
      wallet = JSON.stringify(wallet)
      wallet = JSON.parse(wallet)

      let chipnet = this.$store.getters['global/getAllChipnetTypes']
      chipnet = JSON.stringify(chipnet)
      chipnet = JSON.parse(chipnet)

      const info = { wallet, chipnet, name: '' }
      this.$store.commit('global/updateVault', info)
      
      // Get the actual index of the wallet (may be updated if it was a new entry)
      const walletIndex = this.$store.getters['global/getVault'].findIndex(v => {
        return v.wallet?.bch?.walletHash === wallet?.bch?.walletHash
      })
      const finalWalletIndex = walletIndex !== -1 ? walletIndex : this.$store.getters['global/getVault'].length - 1
      
      // Settings should already be saved during steps 2-4 since vault entry exists
      // But ensure they're up to date with current state
      const currentSettings = {
        language: this.$store.getters['global/language'],
        theme: this.$store.getters['global/theme'],
        country: this.$store.getters['global/country'],
        denomination: this.$store.getters['global/denomination'],
        preferredSecurity: this.$store.getters['global/preferredSecurity'],
        isChipnet: this.$store.getters['global/isChipnet'],
        autoGenerateAddress: this.$store.getters['global/autoGenerateAddress'],
        enableStablhedge: this.$store.getters['global/enableStablhedge'],
        enableSmartBCH: this.$store.getters['global/enableSmartBCH'],
        enableSLP: this.$store.getters['global/enableSLP'],
        // Get darkMode from darkmode module
        darkMode: this.$store.getters['darkmode/getStatus'],
        // Get currency from market module
        currency: this.$store.getters['market/selectedCurrency']
      }
      // Use mutation to update settings (prevents Vuex mutation error)
      this.$store.commit('global/updateWalletSettings', {
        index: finalWalletIndex,
        settings: currentSettings
      })
      
      // Update wallet index to the wallet to make it active
      this.$store.commit('global/updateWalletIndex', finalWalletIndex)
      
      // Update current wallet to switch to the wallet
      this.$store.commit('global/updateCurrentWallet', finalWalletIndex)
      // Sync settings to darkmode and market modules
      this.$store.dispatch('global/syncSettingsToModules')

      // If vault was not empty before creating this wallet, sync the previous wallet first
      // Check if vault existed before we created this new entry
      const vaultBeforeCreate = finalWalletIndex > 0
      if (vaultBeforeCreate) {
        const vault = this.$store.getters['global/getVault']
        const previousWalletIndex = finalWalletIndex - 1
        
        // Save wallet data from snapshot for new wallet first
        this.newWalletSnapshot.walletInfo.map(walletInfo => {
          this.$store.commit('global/updateWallet', walletInfo)
        })

        this.newWalletSnapshot.xpubKeysInfo.map(xPubInfo => {
          this.$store.commit('global/updateXPubKey', xPubInfo)
        })
        
        // Only sync if previous wallet entry exists and has a name property
        if (vault && Array.isArray(vault) && vault[previousWalletIndex] && 
            vault[previousWalletIndex] !== null && 
            typeof vault[previousWalletIndex] === 'object' &&
            'name' in vault[previousWalletIndex]) {
          // Temporarily set wallet index to previous wallet to sync it
          this.$store.commit('global/updateWalletIndex', previousWalletIndex)
          try {
            this.$store.dispatch('global/syncCurrentWalletToVault')
          } catch (error) {
            console.error('Error syncing previous wallet to vault:', error)
          }
          // Restore to new wallet index
          this.$store.commit('global/updateWalletIndex', finalWalletIndex)
          this.$store.commit('global/updateCurrentWallet', finalWalletIndex)
          // Sync settings to darkmode and market modules
          this.$store.dispatch('global/syncSettingsToModules')
        }
      }

      let asset = this.$store.getters['assets/getAllAssets']
      asset = JSON.stringify(asset)
      asset = JSON.parse(asset)

      // remove all assets in assets and chip assets except bch
      const adjustedAssets = asset.asset.filter((a) => a?.id === 'bch')
      const adjustedChipnetAssets = asset.chipnet_assets.filter((a) => a?.id === 'bch')

      asset.asset = adjustedAssets
      asset.chipnet_assets = adjustedChipnetAssets

      this.$store.commit('assets/updateVault', { index: finalWalletIndex, asset: asset })
      this.$store.commit('assets/updatedCurrentAssets', finalWalletIndex)

      // ramp reset
      this.$store.commit('ramp/resetUser')
      this.$store.commit('ramp/resetData')
      this.$store.commit('ramp/resetChatIdentity')
      this.$store.commit('ramp/resetPagination')
      // this.$store.commit('ramp/resetStoreFilters')
    },
    continueToDashboard () {
      const vm = this
      // Ensure wallet creation is complete before saving
      if (!vm.walletCreationComplete && vm.walletCreationInProgress) {
        // Wait for wallet creation to complete
        const checkComplete = setInterval(() => {
          if (vm.walletCreationComplete) {
            clearInterval(checkComplete)
            vm.saveAndRedirect()
          }
        }, 500)
      } else {
        vm.saveAndRedirect()
      }
    },
    saveAndRedirect () {
      const vm = this
      // Prevent multiple calls
      if (vm.isRedirecting) return
      vm.isRedirecting = true
      
      vm.$store.dispatch('global/saveWalletPreferences')
      vm.$store.dispatch('global/updateOnboardingStep', vm.steps).then(function () {
        return vm.promptEnablePushNotification()?.catch?.(console.error)
      }).then(async function () {
        vm.saveToVault()
        // Ensure mnemonic is readable before navigating to '/' (router guard depends on it)
        try {
          await vm.ensureMnemonicReady()
        } catch (e) { 
          console.warn('mnemonic readiness wait timeout', e)
          vm.isRedirecting = false
        }
        vm.$router.push('/').catch(() => {
          vm.isRedirecting = false
        })
      }).catch((error) => {
        console.error('Error during saveAndRedirect:', error)
        vm.isRedirecting = false
      })
    },
    async ensureMnemonicReady () {
      const retries = 40
      const delayMs = 150
      for (let i = 0; i < retries; i++) {
        try {
          const currentIndex = this.$store.getters['global/getWalletIndex']
          const m = await getMnemonic(currentIndex)
          if (m && typeof m === 'string' && m.split(' ').length === 12) return true
        } catch (e) {}
        await new Promise(r => setTimeout(r, delayMs))
      }
      throw new Error('mnemonic not ready')
    },
    async initCreateWallet () {
      // Handle restore flow
      if (this.importSeedPhrase && this.restoreStep === 2) {
        // Validate seed phrase before proceeding
        if (!this.validateSeedPhrase() && this.authenticationPhase === 'backup-phrase') {
          return
        }
        // Create wallet from seed phrase and navigate to step-3
        await this.createWallets()
        // Navigate to settings step (step-3)
        this.$router.push('/accounts/restore/step-3')
        return
      }
      
      // Handle create flow
      if (this.steps === -1) {
        // Navigate to step-1 route and start wallet creation
        this.$router.push('/accounts/create/step-1').then(() => {
          this.steps = 0
        })
      }
      this.$forceUpdate()
    },
    initRestoreWallet () {
      // Set importSeedPhrase flag and navigate to restore step-1
      this.importSeedPhrase = true
      this.$router.push('/accounts/restore/step-1').then(() => {
        this.authenticationPhase = 'options'
      })
    },
    async createWallets () {
      const vm = this

      // Create mnemonic seed, encrypt, and store
      if (!vm.mnemonic) {
        if (vm.importSeedPhrase) {
          vm.mnemonicVerified = true
          vm.mnemonic = await storeMnemonic(this.cleanUpSeedPhrase(this.seedPhraseBackup), vm.walletIndex)
        } else {
          vm.mnemonic = await generateMnemonic(vm.walletIndex)
        }
      }
      vm.steps += 1

      const wallet = new Wallet(vm.mnemonic)
      const bchWallets = [wallet.BCH, wallet.BCH_CHIP]
      const slpWallets = [wallet.SLP, wallet.SLP_TEST]

      vm.newWalletSnapshot.walletInfo = []
      vm.newWalletSnapshot.xpubKeysInfo = []

      for (const bchWallet of bchWallets) {
        const isChipnet = bchWallets.indexOf(bchWallet) === 1

        await bchWallet.getNewAddressSet(0).then(function (response) {
          const addresses = response?.addresses || null
          const walletTypeInfo = {
            isChipnet,
            type: 'bch',
            walletHash: bchWallet.walletHash,
            derivationPath: bchWallet.derivationPath,
            lastAddress: addresses !== null ? addresses.receiving : '',
            lastChangeAddress: addresses !== null ? addresses.change : '',
            lastAddressIndex: 0,
          }

          if (vm.isVaultEmpty) vm.$store.commit('global/updateWallet', walletTypeInfo)
          else vm.newWalletSnapshot.walletInfo.push(walletTypeInfo)
          vm.steps += 1
          try {
            vm.$store.dispatch('global/refetchWalletPreferences')
          } catch(error) { console.error(error) }
        })

        await bchWallet.getXPubKey().then(function (xpub) {
          const xPubInfo = {
            isChipnet,
            type: 'bch',
            xPubKey: xpub
          }

          if (vm.isVaultEmpty) vm.$store.commit('global/updateXPubKey', xPubInfo)
          else vm.newWalletSnapshot.xpubKeysInfo.push(xPubInfo)
          vm.steps += 1
        })
      }

      for (const slpWallet of slpWallets) {
        const isChipnet = slpWallets.indexOf(slpWallet) === 1

        await slpWallet.getNewAddressSet(0).then(function (addresses) {
          const walletTypeInfo = {
            isChipnet,
            type: 'slp',
            walletHash: slpWallet.walletHash,
            derivationPath: slpWallet.derivationPath,
            lastAddress: addresses !== null ? addresses.receiving : '',
            lastChangeAddress: addresses !== null ? addresses.change : '',
            lastAddressIndex: 0
          }

          if (vm.isVaultEmpty) vm.$store.commit('global/updateWallet', walletTypeInfo)
          else vm.newWalletSnapshot.walletInfo.push(walletTypeInfo)
          vm.steps += 1
        })

        await slpWallet.getXPubKey().then(function (xpub) {
          const xPubInfo = {
            isChipnet,
            type: 'slp',
            xPubKey: xpub
          }

          if (vm.isVaultEmpty) vm.$store.commit('global/updateXPubKey', xPubInfo)
          else vm.newWalletSnapshot.xpubKeysInfo.push(xPubInfo)
          vm.steps += 1
        })
      }

      await wallet.sBCH.subscribeWallet().then(function () {
        const walletTypeInfo = {
          type: 'sbch',
          derivationPath: wallet.sBCH.derivationPath,
          walletHash: wallet.sBCH.walletHash,
          lastAddress: wallet.sBCH._wallet ? wallet.sBCH._wallet.address : ''
        }

        if (vm.isVaultEmpty) vm.$store.commit('global/updateWallet', walletTypeInfo)
        else vm.newWalletSnapshot.walletInfo.push(walletTypeInfo)
      })

      const walletHashes = [
        wallet.BCH.walletHash,
        wallet.BCH_CHIP.walletHash,
        wallet.SLP.walletHash,
        wallet.SLP_TEST.walletHash,
        wallet.sBCH.walletHash,
      ]
      this.$pushNotifications?.subscribe?.(walletHashes, this.walletIndex, true)
      this.newWalletHash = wallet.BCH.walletHash
    },
    choosePreferedSecurity () {
      this.checkFingerprintAuthEnabled()
    },
    checkFingerprintAuthEnabled () {
      NativeBiometric.isAvailable()
        .then(result => {
          if (result.isAvailable !== false) {
            this.securityOptionDialogStatus = 'show'
          } else {
            this.pinDialogAction = 'SET UP'
            this.$store.commit('global/setPreferredSecurity', 'pin')
          }
        },
        (error) => {
          this.pinDialogAction = 'SET UP'
          this.$store.commit('global/setPreferredSecurity', 'pin')
          console.log('Implementation error: ', error)
        })
    },
    verifyBiometric () {
      // Prevent multiple calls
      if (this.isRedirecting) return
      
      // Authenticate using biometrics before logging the user in
      NativeBiometric.verifyIdentity({
        reason: this.$t('NativeBiometricReason1'),
        title: this.$t('SecurityAuthentication'),
        subtitle: this.$t('NativeBiometricSubtitle'),
        description: ''
      })
        .then(() => {
          // Authentication successful
          console.log('Successful fingerprint credential')
          // Redirect immediately; wallet creation continues in background
          this.saveAndRedirect()
        },
        (error) => {
          // Failed to authenticate
          console.log('Verification error: ', error)
          if (error.message.includes('Cancel') || error.message.includes('Authentication cancelled')) {
            console.error(error)
            // Reset flag on cancellation to allow retry
            this.isRedirecting = false
          } else {
            // Only retry if not already redirecting
            if (!this.isRedirecting) {
              this.verifyBiometric()
            }
          }
        }
        )
    },
    setPreferredSecurity (auth) {
        this.$store.commit('global/setPreferredSecurity', auth)
      if (auth === 'pin') {
        this.pinDialogAction = 'SET UP'
      } else {
        this.verifyBiometric()
      }
    },
    executeActionTaken (action) {
      const vm = this
      // Prevent multiple calls
      if (vm.isRedirecting) return
      
      if (action === 'proceed') {
        // Redirect immediately after PIN setup; wallet creation continues in background
        vm.saveAndRedirect()
      } else {
        vm.pinDialogAction = ''
      }
    },
    setOpenThemeSelector () {
      if (this.isHongKong(this.currentCountry)) {
        this.choosePreferedSecurity()
      } else {
        this.openSettings = false
        this.openThemeSelector = true
      }
    },
    async goToStep3 () {
      // Save preferences before navigating to step 3
      // This ensures country, language, and currency settings from step 2 are persisted
      await this.$store.dispatch('global/saveWalletPreferences').catch(() => {
        // Silently fail if wallet hash doesn't exist yet
      })
      // Handle restore flow navigation
      if (this.importSeedPhrase && this.restoreStep === 3) {
        this.$router.push('/accounts/restore/step-4')
      } else {
      this.$router.push('/accounts/create/step-3')
      }
    },
    goToStep4 () {
      // Handle restore flow navigation
      if (this.importSeedPhrase && this.restoreStep === 4) {
        this.$router.push('/accounts/restore/step-5')
      } else {
      this.$router.push('/accounts/create/step-4')
      }
    },
    setupSecurity (authType) {
      // Prevent multiple calls
      if (this.isRedirecting) return
      
      if (authType === 'pin') {
        this.pinDialogAction = 'SET UP'
        this.$store.commit('global/setPreferredSecurity', 'pin')
      } else if (authType === 'biometric' && this.isMobile) {
        this.$store.commit('global/setPreferredSecurity', 'biometric')
        this.verifyBiometric()
      }
    },
    async initializeStep2 () {
      // Prevent duplicate calls
      if (this.step2Initialized) {
        console.log('[Step 2] Already initialized, skipping geoip call')
        return
      }
      this.step2Initialized = true
      console.log('[Step 2] Initializing step 2 - making geoip call...')
      
      try {
        // Auto-detect language and currency for step 2
        await this.$store.dispatch('market/updateSupportedCurrencies', {})

        const ipGeoPreferences = await this.getIPGeolocationPreferences()
        console.log('[Step 2] Geoip preferences received:', ipGeoPreferences)

        // set currency immediately (no timeout) and persist
        // Currency options have 'symbol' which is the currency code (e.g., "PHP", "USD")
        const currencyOptions = this.$store.getters['market/currencyOptions']
        console.log('[Step 2] Available currency options:', currencyOptions.map(c => ({ symbol: c.symbol, name: c.name })))
        console.log('[Step 2] Looking for currency code:', ipGeoPreferences.currency.symbol)
        // Match by symbol (which is the currency code like "PHP")
        let currency = currencyOptions.find(o => o.symbol === ipGeoPreferences.currency.symbol)
        console.log('[Step 2] Selected currency:', currency)
        
        // If currency not found in options, create it from geoip data
        if (!currency && ipGeoPreferences.currency.symbol && ipGeoPreferences.currency.name) {
          const newCurrency = {
            symbol: ipGeoPreferences.currency.symbol,
            name: ipGeoPreferences.currency.name
          }
          // Add to currency options if not already there
          const updatedOptions = [...currencyOptions]
          if (!updatedOptions.some(c => c.symbol === newCurrency.symbol)) {
            updatedOptions.push(newCurrency)
            this.$store.commit('market/updateCurrencyOptions', updatedOptions)
            console.log('[Step 2] Added currency to options:', newCurrency)
          }
          // Get the currency reference from the store after updating (must be same reference for indexOf to work)
          const updatedCurrencyOptions = this.$store.getters['market/currencyOptions']
          currency = updatedCurrencyOptions.find(c => c.symbol === newCurrency.symbol)
        }
        
        if (currency?.symbol) {
          // Get the exact reference from state.currencyOptions (required for indexOf to work)
          // The mutation uses indexOf which compares by reference, not value
          const stateCurrencyOptions = this.$store.state.market.currencyOptions
          const currencyFromState = stateCurrencyOptions.find(c => c.symbol === currency.symbol)
          
          if (currencyFromState) {
            // Update currency in market store (must be exact reference from state array)
            this.$store.commit('market/updateSelectedCurrency', currencyFromState)
            // Also save to vault settings for wallet-specific storage
            this.$store.commit('global/saveWalletSetting', { key: 'currency', value: currencyFromState })
            console.log('[Step 2] Currency set to:', currencyFromState.symbol, currencyFromState.name)
          } else {
            // Fallback: set directly in state if mutation fails
            console.warn('[Step 2] Currency not in state options array, setting directly')
            this.$store.state.market.selectedCurrency = currency
            this.$store.commit('global/saveWalletSetting', { key: 'currency', value: currency })
            console.log('[Step 2] Currency set directly to:', currency.symbol, currency.name)
          }
        } else {
          console.warn('[Step 2] Currency not found and could not be created for:', ipGeoPreferences.currency.symbol)
          console.warn('[Step 2] Available symbols:', currencyOptions.map(c => c.symbol))
        }
        this.currencySelectorRerender = true
        
        // set language from geoip preferences
        const languageCodes = ipGeoPreferences.langs || ['en-us']
        
        // Sort language codes (prefer codes with dashes, e.g., 'en-us' over 'en')
        languageCodes.sort((a, b) => {
          const aHasDash = a.includes('-') ? 0 : 1
          const bHasDash = b.includes('-') ? 0 : 1
          return aHasDash - bHasDash
        })
        
        // Find first matching supported language
        let selectedLangCode = 'en-us' // default fallback
        const supportedLanguageCodes = Object.keys(supportedLangsI18n)
        console.log('[Step 2] Language codes from geoip:', languageCodes)
        console.log('[Step 2] Supported language codes:', supportedLanguageCodes)
        for (let languageCode of languageCodes) {
          // Try exact match first
          if (supportedLanguageCodes.includes(languageCode)) {
            selectedLangCode = languageCode
            console.log('[Step 2] Exact language match found:', languageCode)
            break
          }
          // Try matching general language code (e.g., 'en' from 'en-ph')
          const generalLanguageCode = languageCode.replace(/-.*$/, '')
          const languageMatched = supportedLanguageCodes.find(langOption => {
            // Check if supported language starts with the general code (e.g., 'en-us' starts with 'en')
            return langOption.startsWith(generalLanguageCode + '-') || langOption === generalLanguageCode
          })
          if (languageMatched) {
            selectedLangCode = languageMatched
            console.log('[Step 2] General language match found:', languageCode, '->', languageMatched)
            break
          }
        }
        console.log('[Step 2] Selected language code:', selectedLangCode)
        
        // Always set language during registration (step 2), regardless of vault state
        // The vault entry exists but settings should be updated
        if (selectedLangCode && supportedLangsI18n[selectedLangCode]) {
          this.setLanguage(selectedLangCode)
          // Also save to vault settings explicitly
          this.$store.commit('global/saveWalletSetting', { key: 'language', value: selectedLangCode })
          console.log('[Step 2] Language set to:', selectedLangCode)
        } else {
          console.warn('[Step 2] Invalid language code or not supported:', selectedLangCode)
        }
        
        // set country
        console.log('[Step 2] Setting country:', ipGeoPreferences.country)
        this.$store.commit('global/setCountry', {
          country: ipGeoPreferences.country,
          denomination: 'BCH' // Default denomination, can be changed by user later
        })
        console.log('[Step 2] Country set to:', ipGeoPreferences.country)

        // persist preferences to avoid later overrides (e.g., refetchWalletPreferences)
        await this.$store.dispatch('global/saveWalletPreferences').catch(() => {})
      } catch (error) {
        console.error('[Step 2] Error initializing step 2:', error)
        // Reset flag so it can be retried
        this.step2Initialized = false
      }
    },
    async generateSeedPhrase () {
      if (this.mnemonic || this.walletCreationInProgress) return
      
      this.walletCreationInProgress = true
      this.walletCreationComplete = false
      this.walletCreationError = ''
      
      try {
        // Generate mnemonic
        const timeoutMs = 15000
        const result = await Promise.race([
          generateMnemonic(this.walletIndex),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
        ])
        this.mnemonic = result
        
        // Create minimal vault entry immediately so settings can be saved during steps 2-4
        this.initializeVaultEntry()
        
        // Show shine effect briefly
        this.walletCreationComplete = true
        // Wait 3 seconds after mnemonic creation before proceeding
        setTimeout(() => {
          // Start wallet creation in background
          this.createWalletsInBackground()
          // Navigate to step 2
          this.$router.push('/accounts/create/step-2')
        }, 3000)
      } catch (error) {
        console.error('Error generating seed phrase:', error)
    this.walletCreationInProgress = false
    this.walletCreationError = this.$t('ErrorGeneratingSeedPhrase') || 'Failed to generate seed phrase. Please retry.'
      }
    },
    initializeVaultEntry () {
      // Create a minimal vault entry right after mnemonic generation
      // This allows settings to be saved during steps 2-4
      const wallet = new Wallet(this.mnemonic)
      const walletHash = wallet.BCH.walletHash
      
      // Create minimal wallet structure with all wallet types (BCH, SLP, sBCH)
      const minimalWallet = {
        bch: {
          walletHash: wallet.BCH.walletHash,
          derivationPath: wallet.BCH.derivationPath,
          xPubKey: '',
          lastAddress: '',
          lastChangeAddress: '',
          lastAddressIndex: -1
        },
        slp: {
          walletHash: wallet.SLP.walletHash,
          derivationPath: wallet.SLP.derivationPath,
          xPubKey: '',
          lastAddress: '',
          lastChangeAddress: '',
          lastAddressIndex: -1
        },
        sbch: {
          walletHash: wallet.sBCH.walletHash,
          derivationPath: wallet.sBCH.derivationPath,
          lastAddress: '',
          subscribed: false
        }
      }
      
      const minimalChipnet = {
        bch: {
          walletHash: wallet.BCH_CHIP.walletHash,
          derivationPath: wallet.BCH_CHIP.derivationPath,
          xPubKey: '',
          lastAddress: '',
          lastChangeAddress: '',
          lastAddressIndex: -1
        },
        slp: {
          walletHash: wallet.SLP_TEST.walletHash,
          derivationPath: wallet.SLP_TEST.derivationPath,
          xPubKey: '',
          lastAddress: '',
          lastChangeAddress: '',
          lastAddressIndex: -1
        }
      }
      
      // Create vault entry with minimal wallet data
      // Settings will be initialized by updateVault mutation
      const vaultEntry = {
        wallet: minimalWallet,
        chipnet: minimalChipnet,
        name: ''
        // Don't set settings here - let updateVault initialize it with defaults
      }
      
      // Add to vault (this will initialize settings with defaults)
      this.$store.commit('global/updateVault', vaultEntry)
      
      // Get the index of the newly created wallet
      const newWalletIndex = this.$store.getters['global/getVault'].length - 1
      
      // Initialize assets vault entry for this wallet index to prevent errors
      // This ensures getRemovedAssetIds getter doesn't fail
      const assetsVault = this.$store.getters['assets/getRemovedAssetIds']
      if (!assetsVault[newWalletIndex]) {
        // Initialize with empty assets list
        const emptyAssets = getAllAssets(initialAssetState())
        // Add removedAssetIds property to match expected structure
        emptyAssets.removedAssetIds = []
        this.$store.commit('assets/updateVault', {
          index: newWalletIndex,
          asset: emptyAssets
        })
        this.$store.commit('assets/updatedCurrentAssets', newWalletIndex)
      }
      
      // Update wallet index to the newly created wallet
      this.$store.commit('global/updateWalletIndex', newWalletIndex)
      
      // Update current wallet to load settings structure
      this.$store.commit('global/updateCurrentWallet', newWalletIndex)
      
      // Update walletIndex in component
      this.walletIndex = newWalletIndex
    },
    async createWalletsInBackground () {
      // This runs in background - no UI updates needed
      const vm = this
      const wallet = new Wallet(vm.mnemonic)
      const bchWallets = [wallet.BCH, wallet.BCH_CHIP]
      const slpWallets = [wallet.SLP, wallet.SLP_TEST]

      vm.newWalletSnapshot.walletInfo = []
      vm.newWalletSnapshot.xpubKeysInfo = []

      for (const bchWallet of bchWallets) {
        const isChipnet = bchWallets.indexOf(bchWallet) === 1

        await bchWallet.getNewAddressSet(0).then(function (response) {
          const addresses = response?.addresses || null
          const walletTypeInfo = {
            isChipnet,
            type: 'bch',
            walletHash: bchWallet.walletHash,
            derivationPath: bchWallet.derivationPath,
            lastAddress: addresses !== null ? addresses.receiving : '',
            lastChangeAddress: addresses !== null ? addresses.change : '',
            lastAddressIndex: 0,
          }

          if (vm.isVaultEmpty) vm.$store.commit('global/updateWallet', walletTypeInfo)
          else vm.newWalletSnapshot.walletInfo.push(walletTypeInfo)
        })

        await bchWallet.getXPubKey().then(function (xpub) {
          const xPubInfo = {
            isChipnet,
            type: 'bch',
            xPubKey: xpub
          }

          if (vm.isVaultEmpty) vm.$store.commit('global/updateXPubKey', xPubInfo)
          else vm.newWalletSnapshot.xpubKeysInfo.push(xPubInfo)
        })
      }

      for (const slpWallet of slpWallets) {
        const isChipnet = slpWallets.indexOf(slpWallet) === 1

        await slpWallet.getNewAddressSet(0).then(function (addresses) {
          const walletTypeInfo = {
            isChipnet,
            type: 'slp',
            walletHash: slpWallet.walletHash,
            derivationPath: slpWallet.derivationPath,
            lastAddress: addresses !== null ? addresses.receiving : '',
            lastChangeAddress: addresses !== null ? addresses.change : '',
            lastAddressIndex: 0
          }

          if (vm.isVaultEmpty) vm.$store.commit('global/updateWallet', walletTypeInfo)
          else vm.newWalletSnapshot.walletInfo.push(walletTypeInfo)
        })

        await slpWallet.getXPubKey().then(function (xpub) {
          const xPubInfo = {
            isChipnet,
            type: 'slp',
            xPubKey: xpub
          }

          if (vm.isVaultEmpty) vm.$store.commit('global/updateXPubKey', xPubInfo)
          else vm.newWalletSnapshot.xpubKeysInfo.push(xPubInfo)
        })
      }

      await wallet.sBCH.subscribeWallet().then(function () {
        const walletTypeInfo = {
          type: 'sbch',
          derivationPath: wallet.sBCH.derivationPath,
          walletHash: wallet.sBCH.walletHash,
          lastAddress: wallet.sBCH._wallet ? wallet.sBCH._wallet.address : ''
        }

        if (vm.isVaultEmpty) vm.$store.commit('global/updateWallet', walletTypeInfo)
        else vm.newWalletSnapshot.walletInfo.push(walletTypeInfo)
      })

      const walletHashes = [
        wallet.BCH.walletHash,
        wallet.BCH_CHIP.walletHash,
        wallet.SLP.walletHash,
        wallet.SLP_TEST.walletHash,
        wallet.sBCH.walletHash,
      ]
      this.$pushNotifications?.subscribe?.(walletHashes, this.walletIndex, true)
      this.newWalletHash = wallet.BCH.walletHash
      
      // Mark wallet creation as complete
      this.walletCreationComplete = true
    },
    onInputEnter (inputArray) {
      if (inputArray.indexOf('') === -1) {
        this.seedPhraseBackup = inputArray.join(' ')
      }
    },
    async promptEnablePushNotification() {
      await this.$pushNotifications.isPushNotificationEnabled().catch(console.log)
      if (!this.$pushNotifications.isEnabled) {
        await this.$pushNotifications.openPushNotificationsSettingsPrompt({
          message: 'Enable push notifications to receive updates from the app',
        }).catch(console.log)
      }
    },
    onChangeAuthenticationPhase (isShard) {
      this.authenticationPhase = isShard ? 'shards' : 'backup-phrase'
      // Navigate to step-2 for seed phrase entry
      if (this.restoreStep === 1) {
        this.$router.push('/accounts/restore/step-2')
      }
    },
    onProceedToNextStep () {
      // Handle restore flow navigation
      if (this.importSeedPhrase && this.restoreStep > 0) {
        // Navigate to settings step (step-3)
        this.$router.push('/accounts/restore/step-3')
        return
      }
      
      this.steps = this.totalSteps
      this.authenticationPhase = 'options'

      // if (!this.importSeedPhrase) {
      //   if (!this.moveToReferral) this.moveToReferral = true
      //   else {
      //     this.moveToReferral = false
      //     this.openSettings = true
      //   }
      // } else this.openSettings = true
      this.openSettings = true
    },
    onValidatedQrs (seedPhrase) {
      this.seedPhraseBackup = seedPhrase
    },
    async getIPGeolocationPreferences() {
      const result = {
        country: {
          name: 'United States',
          code: 'US'
        },
        currency: {
          symbol: 'USD',
          name: 'United States Dollar'
        },
        langs: ['en-us'],
      }

      const apiKey = process.env.IPGEO_API_KEY
      const url = `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}`
      let response
      try {
        response = await this.$axios.get(url)
        console.log('[GeoIP] Raw API response:', response?.data)
      } catch (error) {
        console.error('[GeoIP] Error fetching geoip data:', error)
        // Return default values if API call fails
        return result
      }

      if (response?.data?.country_name) {
        result.country = {
          name: response.data.country_name,
          code: response.data.country_code2
        }
        console.log('[GeoIP] Country parsed:', result.country)
      } else {
        console.warn('[GeoIP] No country_name in response')
      }

      if (response?.data?.currency?.code) {
        result.currency = {
          symbol: response.data.currency.code, // Store code as symbol (e.g., "PHP")
          name: response.data.currency.name
        }
        console.log('[GeoIP] Currency parsed:', result.currency)
      } else {
        console.warn('[GeoIP] No currency.code in response:', response?.data?.currency)
      }

      if (typeof response?.data?.languages === 'string' && response?.data?.languages) {
        // Split languages and normalize
        let langs = response.data.languages.toLowerCase().split(',').map(lang => lang.trim())
        
        // Map language codes to supported codes
        // "fil" (Filipino) maps to "tl" (Tagalog) in the app
        langs = langs.map(lang => {
          if (lang === 'fil') return 'tl'
          return lang
        })
        
        result.langs = langs
        console.log('[GeoIP] Languages parsed:', result.langs)
      } else {
        console.warn('[GeoIP] No languages in response:', response?.data?.languages)
      }
      
      console.log('[GeoIP] Final result:', result)
      return result
    },
    resolveDeviceLangCode() {
      // Getting language code from device seems to be crashing in iOS 17.x
      // we just default to english for iOS for now
      if (this.$q.platform.is.ios) return 'en-us'
      return Device.getLanguageCode()
        .then(result => {
          const code = result.value.toLowerCase()

          /**
          *  https://capacitorjs.com/docs/apis/device#getlanguagecoderesult
          *  Since Device.getLanguageCode() returns a two-char language code,
          *  we set chinese default to "zh-cn" (Chinese - Simplified)
          */
          if (code === 'zh') return `zh-cn`
 
          return code
        })
        .catch(error => {
          console.error(error)
          return 'en-us'
        })
    },
    setLanguage(languageCode) {
      if (!supportedLangsI18n[languageCode]) return
      this.$i18n.locale = languageCode
      this.$store.commit('global/setLanguage', languageCode)
    },
    onMnemonicVerified (value) {
      this.mnemonicVerified = value
    },
    onOpenSettings (value) {
      this.openSettings = value
      // this.moveToReferral = value
    },
    // Animation methods
    onLogoEnter (el, done) {
      // Start with empty page - logo appears first with bounce effect
      el.style.opacity = '0'
      el.style.transform = 'scale(0.8) translateY(-20px)'
      
      setTimeout(() => {
        el.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
        
        requestAnimationFrame(() => {
          el.style.opacity = '1'
          el.style.transform = 'scale(1) translateY(0)'
        })
        
        setTimeout(done, 600)
      }, 100)
    },
    onWelcomeEnter (el, done) {
      const delay = 300
      setTimeout(() => {
        el.style.opacity = '0'
        el.style.transform = 'translateY(20px)'
        el.style.transition = 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        
        requestAnimationFrame(() => {
          el.style.opacity = '1'
          el.style.transform = 'translateY(0)'
        })
        
        setTimeout(done, 500)
      }, delay)
    },
    onButtonEnter (el, done) {
      const delayValue = el.style.getPropertyValue('--delay') || '0.4s'
      const delay = parseFloat(delayValue.replace('s', '')) * 1000
      setTimeout(() => {
        el.style.opacity = '0'
        el.style.transform = 'translateY(30px) scale(0.95)'
        el.style.transition = 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        
        // Ensure icons inside are visible
        const icons = el.querySelectorAll('.q-icon')
        icons.forEach(icon => {
          icon.style.opacity = '1'
          icon.style.visibility = 'visible'
          icon.style.display = 'block'
        })
        
        requestAnimationFrame(() => {
          el.style.opacity = '1'
          el.style.transform = 'translateY(0) scale(1)'
        })
        
        setTimeout(done, 500)
      }, delay)
    },
    onBackButtonEnter (el, done) {
      const delay = 700
      setTimeout(() => {
        el.style.opacity = '0'
        el.style.transition = 'opacity 0.4s ease'
        
        requestAnimationFrame(() => {
          el.style.opacity = '1'
        })
        
        setTimeout(done, 400)
      }, delay)
    }
  },
  async mounted () {
    this.isOnboarding = this.isVaultEmpty

    // Check if we're on a step route and initialize wallet creation if needed
    if (this.$route.path.startsWith('/accounts/create/step-') && this.steps === -1 && !this.importSeedPhrase) {
      this.steps = 0
    }
    
    // Check if we're on a restore route and initialize restore flow if needed
    if (this.$route.path.startsWith('/accounts/restore/step-')) {
      this.importSeedPhrase = true
      if (this.restoreStep === 1) {
        this.authenticationPhase = 'options'
      } else if (this.restoreStep === 2) {
        // Preserve authenticationPhase if already set, otherwise default to 'backup-phrase'
        if (!this.authenticationPhase || this.authenticationPhase === 'options') {
          this.authenticationPhase = 'backup-phrase'
        }
      }
    }

    if (this.recreate) {
      this.mnemonic = await getMnemonic(0) || ''
      if (this.mnemonic.split(" ").length === 12) {
        this.steps = 0
      }
      this.$store.state.global.vault = []
    }

    // get walletIndex
    this.walletIndex = this.isVaultEmpty ? 0 : this.$store.getters['global/getVault'].length

    // Note: Auto-detection moved to step 2 initialization (initializeStep2 method)
    
    // Check server status
    this.$axios.get('https://watchtower.cash/api/status/', { timeout: 30000 }).then(response => {
      if (response.status !== 200) return Promise.reject()
      if (response.data.status !== 'up') return Promise.reject()
      this.serverOnline = true
    }).catch(() => {
      this.serverOnline = false
    })

    // If user lands directly on step-1, ensure generation starts
    if (this.currentStep === 1 && !this.mnemonic && !this.importSeedPhrase) {
      this.$nextTick(() => this.generateSeedPhrase())
    }
    
    // If user lands directly on step-2, ensure geoip call happens
    if (this.currentStep === 2 && !this.importSeedPhrase) {
      this.$nextTick(() => this.initializeStep2())
    }
    
    // If user lands directly on restore step-3, ensure geoip call happens
    if (this.restoreStep === 3) {
      this.step2Initialized = false
      this.$nextTick(() => this.initializeStep2())
    }
  }
}
</script>

<style lang="scss">
[v-cloak] {
  display: none;
}
/* Use the same main background as wallet home page */
.pt-wallet {
  width: 100%;
  min-height: calc(100vh - 152px);
  border-top-left-radius: 22px;
  border-top-right-radius: 22px;
  background-color: #F9F8FF;
  padding-top: 28px !important;
}
.font-lg {
  font-size: 20px;
}
.pt-internet-required {
  text-align: center;
  width: 100%;
  font-size: 24px;
  padding: 30px;
  color: gray;
}
// Minimal Glassmorphic Styles
.minimal-wallet-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 120px);
  padding: 40px 20px;
  max-width: 480px;
  margin: 0 auto;
  position: relative;
  
  @media (max-width: 768px) {
    padding-top: 40px;
  }
}

.logo-section {
  margin-bottom: 48px;
  text-align: center;
  opacity: 0;
  transform: scale(0.8) translateY(-20px);
}

.logo-glass-circle {
  width: 90px;
  height: 90px;
  margin: 0 auto;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 20px;
  transition: all 0.3s ease;
  
  &.dark {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }
  
  &.light {
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  }
}

.logo-image {
  width: 100%;
  height: auto;
  object-fit: contain;
}

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

/* Step 2, 3, and 4 containers with mobile-safe padding */
.step-2-container,
.step-3-container,
.step-4-container {
  padding-top: 24px;
  
  @media (max-width: 768px) {
    padding-top: 60px;
  }
  
  &.ios-safe-area {
    padding-top: max(env(safe-area-inset-top, 44px), 80px) !important;
  }
  
  &.mobile-safe-area {
    @media (max-width: 768px) {
      padding-top: max(60px, calc(env(safe-area-inset-top, 0px) + 40px)) !important;
    }
  }
}

/* Restore step 1 container with mobile-safe padding */
.restore-step-1 {
  @media (max-width: 768px) {
    padding-top: max(60px, calc(env(safe-area-inset-top, 0px) + 40px)) !important;
  }
  
  &.ios-safe-area {
    padding-top: max(env(safe-area-inset-top, 44px), 80px) !important;
  }
  
  &.mobile-safe-area {
    @media (max-width: 768px) {
      padding-top: max(60px, calc(env(safe-area-inset-top, 0px) + 40px)) !important;
    }
  }
}

/* Restore step 2 container with additional mobile-safe padding */
.restore-step-2 {
  @media (max-width: 768px) {
    padding-top: max(60px, calc(env(safe-area-inset-top, 0px) + 40px)) !important;
  }
  
  &.ios-safe-area {
    padding-top: max(env(safe-area-inset-top, 44px), 80px) !important;
  }
}

/* Glassmorphic panel for step-2 */
.glass-panel {
  border-radius: 16px;
  padding: 0; /* align with button width */
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

/* Glassmorphic textarea styling */
.glass-textarea {
  :deep(.q-field__control) {
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 12px;
    
    &.dark {
      background: rgba(255, 255, 255, 0.05) !important;
      border-color: rgba(255, 255, 255, 0.15) !important;
    }
    
    &.light {
      background: rgba(255, 255, 255, 0.3) !important;
      border-color: rgba(0, 0, 0, 0.1) !important;
    }
  }
  
  :deep(.q-field__native) {
    color: inherit;
  }
}

/* Glassmorphic text button styling */
.glass-button-text {
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
  
  :deep(.q-btn__content) {
    padding: 4px 8px;
  }
  
  &.dark {
    color: rgba(255, 255, 255, 0.9) !important;
    background: rgba(255, 255, 255, 0.05);
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 1) !important;
    }
    
    &:active {
      background: rgba(255, 255, 255, 0.15);
    }
  }
  
  &.light {
    color: rgba(0, 0, 0, 0.8) !important;
    background: rgba(255, 255, 255, 0.3);
    
    &:hover {
      background: rgba(255, 255, 255, 0.5);
      color: rgba(0, 0, 0, 1) !important;
    }
    
    &:active {
      background: rgba(255, 255, 255, 0.6);
    }
  }
}

.flat-list {
  padding: 0; /* align content width to container */
}

.glass-item {
  min-height: 56px;
}

.thin-separator {
  opacity: 0.2;
}

/* Primary CTA button aligned with theme */
.primary-cta {
  height: 46px;
  border-radius: 16px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: #fff !important;
}

.welcome-text {
  text-align: center;
  margin-bottom: 40px;
  opacity: 0;
  transform: translateY(20px);
  
  h4 {
    font-weight: 500;
    letter-spacing: -0.02em;
  }
  
  p {
    opacity: 0.75;
    font-weight: 400;
  }
}

.actions-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}

.action-glass-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 16px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  box-shadow: 0 6px 24px rgba(0,0,0,0.12);
  opacity: 0;
  transform: translateY(30px) scale(0.95);
  
  &.dark {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
    }
  }
  
  &.light {
    background: rgba(255, 255, 255, 0.35);
    border-color: rgba(255, 255, 255, 0.4);
    
    &:hover {
      background: rgba(255, 255, 255, 0.5);
      border-color: rgba(255, 255, 255, 0.6);
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
    }
  }
  
  &:active {
    transform: translateY(0);
  }
}

.action-icon-wrapper {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.action-glass-card.dark .action-icon-wrapper {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.action-glass-card.light .action-icon-wrapper {
  background: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.action-glass-card:hover .action-icon-wrapper {
  transform: scale(1.05);
}

.action-content {
  flex: 1;
  min-width: 0;
  
  .text-subtitle1 {
    font-weight: 500;
    letter-spacing: -0.01em;
  }
  
  .text-body2 {
    opacity: 0.85;
    line-height: 1.4;
    font-weight: 400;
  }
}

/* Make action cards adopt themed gradient while keeping text legible */
.action-glass-card.bg-grad .text-subtitle1,
.action-glass-card.bg-grad .text-body2 {
  opacity: 0.95;
}

.back-button-container {
  text-align: center;
  margin-top: 24px;
  opacity: 0;
}

.back-button {
  opacity: 0.7;
  transition: opacity 0.2s ease;
  
  &:hover {
    opacity: 1;
  }
}

.error-section {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: 40px 20px;
}

.error-glass-card {
  padding: 24px;
  border-radius: 16px;
  text-align: center;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  
  &.dark {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }
  
  &.light {
    background: rgba(255, 255, 255, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.4);
    color: rgba(0, 0, 0, 0.8);
  }
}

// Responsive adjustments
@media (max-width: 600px) {
  .minimal-wallet-container {
    padding: 32px 16px;
    min-height: calc(100vh - 100px);
  }
  
  .logo-glass-circle {
    width: 80px;
    height: 80px;
    padding: 16px;
  }
  
  .action-glass-card {
    padding: 16px 20px;
    gap: 12px;
  }
  
  .action-icon-wrapper {
    width: 44px;
    height: 44px;
  }
}

// Wallet Creation Animation View
.wallet-creation-view {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: transparent !important; /* inherit theme background from container */
}

.wallet-animation-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 100vh;
  width: 100%;
  padding: 40px;
}

.wallet-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

// Larger circle container for step 1 wallet creation
.wallet-animation-container .logo-glass-circle {
  width: 150px;
  height: 150px;
  padding: 35px;
  
  .logo-image {
    height: 80px;
  }
}

// Slow pulsing animation for circle container during wallet creation
.logo-glass-circle.creating {
  animation: circlePulse 3s ease-in-out infinite;
}

@keyframes circlePulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

.creation-text {
  font-size: 18px;
  font-weight: 500;
  margin-top: 24px;
  opacity: 0.9;
}

// Fade transition
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.pt-get-started {
  width: 100%;
  min-height: calc(100vh - 152px);
  border-top-left-radius: 22px;
  border-top-right-radius: 22px;
  background-color: #f9f8ff;
}
.pt-setting-menu {
  font-weight: 400;
}

</style>
