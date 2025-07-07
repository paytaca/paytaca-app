<template>
  <div :class="theme" id="registration-container">
    <div class="row q-pb-sm">
      <div class="col pt-brand" :style="{ 'margin-top': $q.platform.is.ios ? '50px' : '0px'}">
        <img src="~/assets/paytaca_logo.png" height="60" alt="">
        <p class="pt-brandname">Paytaca</p>
      </div>
    </div>
    <div
      class="row pt-wallet q-mt-sm justify-center pt-card-2"
      :class="getDarkModeClass(darkMode, 'registration')"
      v-if="mnemonic.length === 0 && importSeedPhrase === false && steps === -1"
    >
      <div :class="{'logo-splash-bg' : isNotDefaultTheme(theme)}">
        <div class="q-py-lg">
          <div v-if="serverOnline" v-cloak>
            <div class="col-12 q-mt-md q-px-lg q-py-none">
              <div class="row">
                <div class="col-12 q-py-sm">
                  <q-btn id="create-new-wallet"
                    rounded
                    class="full-width bg-blue-9 text-white button"
                    @click="initCreateWallet()"
                    :label="$t('CreateNewWallet')"
                  />
                </div>
                <div class="col-12 text-center q-py-sm">
                  <p
                    style="font-size: 14px"
                    class="q-my-none q-py-none text-uppercase text-weight-bold button button-text-primary"
                    :class="getDarkModeClass(darkMode)"
                  >
                    {{ $t('or') }}
                  </p>
                </div>
                <div class="col-12 q-py-sm">
                  <q-btn
                    rounded
                    class="full-width bg-blue-9 text-white button"
                    @click="() => { importSeedPhrase = true }"
                    :label="$t('RestoreExistingWallet')"
                  />
                </div>
              </div>
            </div>
            <div class="col-12 q-mt-md">
              <q-btn
                flat
                padding="md"
                :label="$t('Back')"
                icon="arrow_back"
                class="full-width button button-text-primary"
                :class="getDarkModeClass(darkMode)"
                @click="!$router.push('/')"
                v-if="!isVaultEmpty"
              />
            </div>
          </div>
          <div class="row" v-else style="margin-top: 60px;">
            <div class="col" v-if="serverOnline === false">
              <div class="col q-mt-sm pt-internet-required pt-card" :class="getDarkModeClass(darkMode)">
                {{ $t('NoInternetConnectionNotice') }} &#128533;
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      class="col pt-wallet q-mt-sm pt-card-2 text-center"
      :class="getDarkModeClass(darkMode)"
      v-if="steps > -1 && steps < totalSteps"
    >
      <p class="dim-text q-pt-xl" style="text-align: center;" v-if="steps !== totalSteps">
        {{ importSeedPhrase ? $t('RestoringYourWallet') : $t('CreatingYourWallet') }}...
      </p>
      <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'" />
    </div>
    <div
      class="pt-wallet q-mt-sm pt-card-2"
      :class="getDarkModeClass(darkMode, 'registration')"
      v-if="importSeedPhrase && mnemonic.length === 0"
    >
      <template v-if="authenticationPhase === 'options'">
        <div>
          <AuthenticationChooser
            :importSeedPhrase="importSeedPhrase"
            @change-authentication-phase="onChangeAuthenticationPhase"
          />
        </div>
      </template>

      <template v-else-if="authenticationPhase === 'shards'">
        <ShardsImport @set-seed-phrase="onValidatedQrs" @restore-wallet="initCreateWallet" />
      </template>
      <template v-else-if="authenticationPhase === 'backup-phrase'">
        <div class="col-12 q-px-lg">
          <div :class="{'logo-splash-bg' : isNotDefaultTheme(theme)}">
            <div class="q-py-lg">
              <p class="text-center text-subtitle1 text-bow" :class="getDarkModeClass(darkMode)">
                {{ $t('RestoreWalletDescription') }}
              </p>
              <template v-if="useTextArea">
                <div class="row justify-start q-mb-sm">
                  <q-btn
                    flat
                    no-caps
                    padding="xs sm"
                    icon="arrow_back"
                    class="button button-text-primary"
                    :class="getDarkModeClass(darkMode)"
                    :label="$t('EnterOneByOne')"
                    @click="useTextArea = false, seedPhraseBackup = ''"
                  />
                </div>
                <q-input type="textarea" class="q-mt-xs bg-grey-3 q-px-md q-py-sm br-15" v-model="seedPhraseBackup" />
              </template>
              <template v-else>
                <div class="row justify-end q-mb-xs">
                  <q-btn
                    flat
                    no-caps
                    padding="xs sm"
                    icon-right="arrow_forward"
                    class="button button-text-primary"
                    :class="getDarkModeClass(darkMode)"
                    :label="$t('PasteSeedPhrase')"
                    @click="useTextArea = true, seedPhraseBackup = ''"
                  />
                </div>
                <SeedPhraseContainer :isImport="true" @on-input-enter="onInputEnter" />
              </template>
              <q-btn
                rounded
                class="full-width q-mt-md button"
                @click="initCreateWallet()"
                :disable="!validateSeedPhrase()"
                :label="$t('RestoreWallet')"
              />
            </div>
          </div>
        </div>
      </template>
    </div>

    <div class="row" v-if="mnemonic.length > 0">
      <div
        class="pt-get-started q-mt-sm pt-card-2"
        :class="getDarkModeClass(darkMode, 'registration')"
        v-if="isFinalStep"
      >
        <div :class="{'logo-splash-bg' : isNotDefaultTheme(theme)}">
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
                  <p class="dim-text" style="margin-top: 10px;">
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
                      <p class="dim-text" style="margin-top: 10px;">
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
                    <p class="dim-text" style="margin-top: 10px;">
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
import { isNotDefaultTheme, getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'
import { supportedLangs as supportedLangsI18n } from '../../i18n'

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
    SeedPhraseContainer//,
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
      totalSteps: 9,
      mnemonicVerified: false,
      pinDialogAction: '',
      pin: '',
      securityOptionDialogStatus: 'dismiss',
      walletIndex: 0,
      currencySelectorRerender: false,
      openThemeSelector: false,
      useTextArea: false,
      authenticationPhase: 'options',
      skipToBackupPhrase: false//,
      // moveToReferral: false,
    }
  },
  watch: {
    steps (val) {
      if (val === 0) {
        this.createWallets()
        if (!this.importSeedPhrase) {
          this.authenticationPhase = 'skip'
        }
      }
    },
    seedPhraseBackup (val) {
      this.seedPhraseBackup = this.cleanUpSeedPhrase(val)
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
    isFinalStep () {
      return this.steps === this.totalSteps
    }
  },
  methods: {
    isNotDefaultTheme,
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
      if (this.$store.getters['global/getWalletIndex'] !== this.walletIndex) {
        this.$store.dispatch('global/syncCurrentWalletToVault')
      }

      this.newWalletSnapshot.walletInfo.map(walletInfo => {
        this.$store.commit('global/updateWallet', walletInfo)
      })

      this.newWalletSnapshot.xpubKeysInfo.map(xPubInfo => {
        this.$store.commit('global/updateXPubKey', xPubInfo)
      })

      // saving to wallet vault
      let wallet = this.$store.getters['global/getAllWalletTypes']
      wallet = JSON.stringify(wallet)
      wallet = JSON.parse(wallet)

      let chipnet = this.$store.getters['global/getAllChipnetTypes']
      chipnet = JSON.stringify(chipnet)
      chipnet = JSON.parse(chipnet)

      const info = { wallet, chipnet }
      this.$store.commit('global/updateVault', info)
      this.$store.commit('global/updateWalletIndex', this.walletIndex)

      let asset = this.$store.getters['assets/getAllAssets']
      asset = JSON.stringify(asset)
      asset = JSON.parse(asset)

      // remove all assets in assets and chip assets except bch
      const adjustedAssets = asset.asset.filter((a) => a?.id === 'bch')
      const adjustedChipnetAssets = asset.chipnet_assets.filter((a) => a?.id === 'bch')

      asset.asset = adjustedAssets
      asset.chipnet_assets = adjustedChipnetAssets

      this.$store.commit('assets/updateVault', { index: this.walletIndex, asset: asset })
      this.$store.commit('assets/updatedCurrentAssets', this.walletIndex)

      // ramp reset
      this.$store.commit('ramp/resetUser')
      this.$store.commit('ramp/resetData')
      this.$store.commit('ramp/resetChatIdentity')
      this.$store.commit('ramp/resetPagination')
      // this.$store.commit('ramp/resetStoreFilters')
    },
    continueToDashboard () {
      const vm = this
      vm.$store.dispatch('global/saveWalletPreferences')
      vm.$store.dispatch('global/updateOnboardingStep', vm.steps).then(function () {
        return vm.promptEnablePushNotification()?.catch?.(console.error)
      }).then(function () {
        vm.saveToVault()
        vm.$router.push('/')
      })
    },
    initCreateWallet () {
      if (this.steps === -1) {
        this.steps = 0
      }
      this.$forceUpdate()
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
            this.$q.localStorage.set('preferredSecurity', 'pin')
          }
        },
        (error) => {
          this.pinDialogAction = 'SET UP'
          this.$q.localStorage.set('preferredSecurity', 'pin')
          console.log('Implementation error: ', error)
        })
    },
    verifyBiometric () {
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
          this.continueToDashboard()
        },
        (error) => {
          // Failed to authenticate
          console.log('Verification error: ', error)
          if (error.message.includes('Cancel') || error.message.includes('Authentication cancelled')) {
            console.error(error)
          } else {
            this.verifyBiometric()
          }
        }
        )
    },
    setPreferredSecurity (auth) {
      this.$q.localStorage.set('preferredSecurity', auth)
      if (auth === 'pin') {
        this.pinDialogAction = 'SET UP'
      } else {
        this.verifyBiometric()
      }
    },
    executeActionTaken (action) {
      const vm = this
      if (action === 'proceed') {
        vm.continueToDashboard()
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
    },
    onProceedToNextStep () {
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
      const response = await this.$axios.get(url)?.catch(console.error)

      if (response?.data?.country_name) {
        result.country = {
          name: response?.data?.country_name,
          code: response?.data?.country_code2
        }
      }

      if (response?.data?.currency.code) {
        result.currency = {
          symbol: response?.data?.currency.code,
          name: response?.data?.currency?.name
        }
      }

      if (typeof response?.data?.languages === 'string' && response?.data?.languages) {
        result.langs = response?.data?.languages?.toLowerCase().split(',')
      }
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
    }
  },
  async mounted () {
    if (this.recreate) {
      this.mnemonic = await getMnemonic(0) || ''
      if (this.mnemonic.split(" ").length === 12) {
        this.steps = 0
      }
      this.$store.state.global.vault = []
    }

    // get walletIndex
    this.walletIndex = this.isVaultEmpty ? 0 : this.$store.getters['global/getVault'].length

    await this.$store.dispatch('market/updateSupportedCurrencies', {})

    // auto-detect country
    const ipGeoPreferences = await this.getIPGeolocationPreferences()

    const vm = this
    setTimeout(function () {
    // set currency
      const currencyOptions = vm.$store.getters['market/currencyOptions']
      const currency = currencyOptions.find(o => o.symbol === ipGeoPreferences.currency.symbol)
      if (currency?.symbol) {
        vm.$store.commit('market/updateSelectedCurrency', currency)
      }
    }, 1000)
    this.currencySelectorRerender = true

    // set language to English by default
    const defaultLang = 'en-us'
    // const eng = ['en-us', 'en-uk', 'en-gb', 'en']
    // const supportedLangCodes = Object.getOwnPropertyNames(supportedLangsI18n) // string[]
    // const supportedIpGeoLangs = supportedLangCodes.filter(lang => ipGeoPreferences.langs?.includes?.(lang))
    //   .filter(lang => lang !== defaultLang)
    //   // previous implementation dont want en-us if there are other languages, so we filter it out
    // const ipGeoLang = supportedIpGeoLangs[0] || defaultLang

    if (this.isVaultEmpty) {
      // let finalLang = ''

      // // Adjust paytaca language according to phone's language (if supported by paytaca)
      // const deviceLang = await this.resolveDeviceLangCode()

      // if (supportedLangCodes.includes(deviceLang) && !eng.includes(deviceLang)) {
      //   finalLang = deviceLang
      // } else if (supportedLangCodes.includes(ipGeoLang) && !eng.includes(ipGeoLang)) {
      //   finalLang = ipGeoLang
      // } else {
      //   // defaults to english if device lang is unsupported by app
      //   finalLang = defaultLang
      // }

      // // if country is Philippines, set language to English
      // if (ipGeoPreferences.country.code === 'PH') {
      //   finalLang = defaultLang
      // }

      this.setLanguage(defaultLang)
    }

    // set country
    vm.$store.commit('global/setCountry', {
      country: ipGeoPreferences.country,
      denomination: this.$t('DEEM')
    })

    this.$axios.get('https://watchtower.cash/api/status/', { timeout: 30000 }).then(response => {
      if (response.status !== 200) return Promise.reject()
      if (response.data.status !== 'up') return Promise.reject()
      this.serverOnline = true
    }).catch(() => {
      this.serverOnline = false
    })
  }
}
</script>

<style lang="scss">
[v-cloak] {
  display: none;
}
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
.dim-text {
  color: #8F8CB8;
}
.pt-internet-required {
  text-align: center;
  width: 100%;
  font-size: 24px;
  padding: 30px;
  color: gray;
}
.pt-brand {
  text-align: center;
  padding: 20px 0px 0px 0px;
}
.pt-brandname {
  color: #eaeeff;
  font-size: 28px;
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
  &.dark {
    color: #e0e2e5;
  }
  &.light {
    color: #3B7BF6;
  }
}
</style>
