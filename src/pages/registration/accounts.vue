<template>
  <div :class="theme" id="registration-container">
    <div class="row q-pb-sm">
      <div class="col pt-brand" :style="{ 'margin-top': $q.platform.is.ios ? '50px' : '0px'}">
        <img src="~/assets/paytaca_logo.png" height="60">
        <p class="pt-brandname">Paytaca</p>
      </div>
    </div>
    <div class="row pt-wallet q-mt-sm justify-center" :class="{'pt-dark info-banner': darkMode}" v-if="mnemonic.length === 0 && importSeedPhrase === false && steps === -1">
      <div v-if="serverOnline" v-cloak>
        <div class="col-12 q-mt-md q-px-lg q-py-none">
          <div class="row">
            <div class="col-12 q-py-sm">
              <q-btn class="full-width bg-blue-9 text-white" @click="initCreateWallet()" :label="$t('CreateNewWallet')" rounded />
            </div>
            <div class="col-12 text-center q-py-sm">
              <p class="q-my-none q-py-none text-uppercase" style="font-size: 14px; color: #2E73D2;">{{ $t('or') }}</p>
            </div>
            <div class="col-12 q-py-sm">
              <q-btn class="full-width bg-blue-9 text-white" @click="() => { importSeedPhrase = true }" :label="$t('RestoreFromSeedPhrase')" rounded />
            </div>
          </div>
        </div>
        <div class="col-12 q-mt-md">
          <q-btn
            flat
            padding="md"
            :label="$t('Back')"
            icon="arrow_back"
            class="full-width"
            color="blue-9"
            @click="!$router.push('/')"
            v-if="!$store.getters['global/isVaultEmpty']"
          />
        </div>
      </div>
      <div class="row" v-else style="margin-top: 60px;">
        <div class="col" v-if="serverOnline === false">
          <div class="col q-mt-sm pt-internet-required" :class="{'pt-dark': darkMode}">
            {{ $t('NoInternetConnectionNotice') }} &#128533;
          </div>
        </div>
      </div>
    </div>
    <div class="col pt-wallet q-mt-sm" :class="{'pt-dark': darkMode}" v-if="steps > -1 && steps < totalSteps" style="text-align: center;">
      <ProgressLoader :color="isDefaultTheme(theme) ? theme : 'pink'"/>
    </div>
    <div class="row pt-wallet q-mt-sm" :class="{'pt-dark': darkMode}" v-if="importSeedPhrase && mnemonic.length === 0">
      <div class="col-12 q-px-lg">
        <p
          style="text-align: center; font-size: 16px; color: #000;"
          :class="{'pt-dark-label': darkMode}"
        >
          {{ $t('RestoreWalletDescription') }}
        </p>
        <q-input type="textarea" class="q-mt-xs bg-grey-3 q-px-md q-py-sm br-15" v-model="seedPhraseBackup" />
        <q-btn class="full-width bg-blue-9 text-white q-mt-md" @click="initCreateWallet()" :disable="!validateSeedPhrase()" :label="$t('RestoreWallet')" rounded />
      </div>
    </div>

    <div class="row" v-if="mnemonic.length > 0">
      <div class="pt-get-started q-mt-sm" :class="{ 'pt-dark': darkMode, 'registration' : theme }">
        <div :class="{'logo-splash-bg' : isDefaultTheme(theme)}">
          <div class="q-pa-lg" style="padding-top: 28px;">
            <div class="row" v-if="openSettings">
              <div class="col">
                <div class="row justify-center">
                  <h5 class="q-ma-none get-started-text text-black" :class="{ 'pt-dark-label': darkMode }">{{ $t('OnBoardSettingHeader') }}</h5><br />
                </div>
                <div class="row justify-center">
                  <p class="dim-text" style="margin-top: 10px;">
                    {{ $t('OnBoardSettingDescription') }}
                  </p>
                </div>
                <div class="row justify-center q-mt-md">
                  <q-list bordered separator style="border-radius: 14px;" :class="{'pt-dark-card': darkMode, 'registration-card' : theme}">
                    <q-item :class="{'divider' : theme}">
                      <q-item-section>
                        <q-item-label class="pt-setting-menu" :class="{'pt-dark-label': darkMode}">{{ $t('Country') }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <CountrySelector :darkMode="darkMode" />
                      </q-item-section>
                    </q-item>

                    <q-item :class="{'divider' : theme}">
                      <q-item-section>
                        <q-item-label class="pt-setting-menu" :class="{'pt-dark-label': darkMode}">{{ $t('Language') }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <LanguageSelector :darkMode="darkMode" />
                      </q-item-section>
                    </q-item>

                    <q-item>
                      <q-item-section>
                        <q-item-label class="pt-setting-menu" :class="{'pt-dark-label': darkMode}">{{ $t('Currency') }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <CurrencySelector :darkMode="darkMode" :key="currencySelectorRerender" />
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>
                <div class="row justify-center">
                  <q-btn rounded :label="$t('Continue')" class="q-mt-lg full-width bg-blue-9 text-white" @click="choosePreferedSecurity"/>
                </div>
                <div class="row justify-center">
                  <transition appear enter-active-class="animated fadeIn">
                    <div v-if="theme === 'payhero'" class="q-mt-lg q-pt-sm text-center">
                      <p style="font-size: 16px;">in partnership with</p>
                      <img src="~/assets/themes/payhero/payhero_logo.png" width="130">
                    </div>
                  </transition>
                </div>
              </div>
            </div>

            <div v-else>
              <template v-if="steps === totalSteps">
                <h5 class="q-ma-none get-started-text text-black" :class="{ 'pt-dark-label': darkMode }">{{ $t('MnemonicBackupPhrase') }}</h5>
                <p v-if="importSeedPhrase" class="dim-text" style="margin-top: 10px;">
                  {{ $t('MnemonicBackupPhraseDescription1') }}
                </p>
                <p v-else class="dim-text" style="margin-top: 10px;">
                  {{ $t('MnemonicBackupPhraseDescription2') }}
                </p>
              </template>
              <p class="dim-text" style="text-align: center;" v-else>{{ importSeedPhrase ? $t('RestoringYourWallet') : $t('CreatingYourWallet') }}...</p>

              <div class="row" id="mnemonic">
                <template v-if="steps === totalSteps">
                  <div v-if="mnemonicVerified || !showMnemonicTest" class="col q-mb-sm text-caption">
                    <ul>
                      <li v-for="(word, index) in mnemonic.split(' ')" :key="'word-' + index">
                        <pre class="q-mr-sm">{{ index + 1 }}</pre><span>{{ word }}</span>
                      </li>
                    </ul>
                  </div>
                  <div v-else>
                    <div>
                      <q-btn
                        flat
                        no-caps
                        padding="xs sm"
                        icon="arrow_back"
                        color="black"
                        class="text-blue"
                        :label="$t('MnemonicBackupPhrase')"
                        @click="showMnemonicTest = false"
                      />
                    </div>
                    <MnemonicTest
                      :mnemonic="mnemonic"
                      @matched="mnemonicVerified = true"
                      class="q-mb-md"
                    />
                  </div>
                </template>
              </div>
              <div class="row q=mt-md" v-if="steps === totalSteps">
                <q-btn v-if="mnemonicVerified" class="full-width bg-blue-9 text-white" @click="openSettings = true" :label="$t('Continue')" rounded />
                <template v-else>
                  <q-btn v-if="showMnemonicTest" class="full-width q-mt-md" @click="confirmSkipVerification" no-caps rounded>
                    {{ $t('SkipVerification') }}
                  </q-btn>
                  <q-btn v-else rounded :label="$t('Continue')" class="full-width bg-blue-9 text-white" @click="showMnemonicTest = true"/>
                </template>
              </div>
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
    />

  </div>
</template>

<script>
import { Wallet, storeMnemonic, generateMnemonic } from '../../wallet'
import ProgressLoader from '../../components/ProgressLoader'
import pinDialog from '../../components/pin'
import MnemonicTest from 'src/components/MnemonicTest.vue'
import securityOptionDialog from '../../components/authOption'
import { NativeBiometric } from 'capacitor-native-biometric'
import { getMnemonic } from '../../wallet'
import { utils } from 'ethers'
import { Device } from '@capacitor/device'
import LanguageSelector from '../../components/settings/LanguageSelector'
import CountrySelector from '../../components/settings/CountrySelector'
import CurrencySelector from '../../components/settings/CurrencySelector'
import { isDefaultTheme } from 'src/utils/theme-darkmode-utils'

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
    MnemonicTest,
    LanguageSelector,
    CountrySelector,
    CurrencySelector,
  },
  data () {
    return {
      openSettings: false,
      serverOnline: null,
      importSeedPhrase: false,
      seedPhraseBackup: null,
      mnemonic: '',
      steps: -1,
      totalSteps: 9,
      mnemonicVerified: false,
      showMnemonicTest: false,
      pinDialogAction: '',
      pin: '',
      securityOptionDialogStatus: 'dismiss',
      walletIndex: 0,
      currencySelectorRerender: false
    }
  },
  watch: {
    steps (val) {
      if (val === 0) {
        this.createWallets()
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
    }
  },
  methods: {
    isDefaultTheme,
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
        class: 'text-white br-15 pt-dark-card'
      }).onOk(() => { vm.openSettings = true })
    },
    saveToVault () {
      // saving to wallet vault
      let wallet = this.$store.getters['global/getAllWalletTypes']
      wallet = JSON.stringify(wallet)
      wallet = JSON.parse(wallet)

      let chipnet = this.$store.getters['global/getAllChipnetTypes']
      chipnet = JSON.stringify(chipnet)
      chipnet = JSON.parse(chipnet)

      const info = {
        wallet: wallet,
        chipnet: chipnet
      }

      this.$store.commit('global/updateVault', info)
      this.$store.commit('global/updateWalletIndex', this.walletIndex)

      let asset = this.$store.getters['assets/getAllAssets']
      asset = JSON.stringify(asset)
      asset = JSON.parse(asset)

      this.$store.commit('assets/updateVault', { index: this.walletIndex, asset: asset })
    },
    continueToDashboard () {
      const vm = this
      this.$store.dispatch('global/updateOnboardingStep', this.steps).then(function () {
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

      for (const bchWallet of bchWallets) {
        const isChipnet = bchWallets.indexOf(bchWallet) === 1

        await bchWallet.getNewAddressSet(0).then(function (response) {
          const addresses = response?.addresses || null
          const pgpIdentity = response?.pgpIdentity || null
          const purelypeerVaultSigner = response?.purelypeerVaultSigner || null

          vm.$store.commit('global/updateWallet', {
            isChipnet,
            type: 'bch',
            walletHash: bchWallet.walletHash,
            derivationPath: bchWallet.derivationPath,
            lastAddress: addresses !== null ? addresses.receiving : '',
            lastChangeAddress: addresses !== null ? addresses.change : '',
            lastAddressIndex: 0,
            purelypeerVaultSigner
          })
          vm.$store.dispatch('chat/addIdentity', pgpIdentity)
          vm.steps += 1
          try {
            vm.$store.dispatch('global/refetchWalletPreferences')
          } catch(error) { console.error(error) }
        })

        bchWallet.getXPubKey().then(function (xpub) {
          vm.$store.commit('global/updateXPubKey', {
            isChipnet,
            type: 'bch',
            xPubKey: xpub
          })
          vm.steps += 1
        })
      }

      for (const slpWallet of slpWallets) {
        const isChipnet = slpWallets.indexOf(slpWallet) === 1

        slpWallet.getNewAddressSet(0).then(function (addresses) {
          vm.$store.commit('global/updateWallet', {
            isChipnet,
            type: 'slp',
            walletHash: slpWallet.walletHash,
            derivationPath: slpWallet.derivationPath,
            lastAddress: addresses !== null ? addresses.receiving : '',
            lastChangeAddress: addresses !== null ? addresses.change : '',
            lastAddressIndex: 0
          })
          vm.steps += 1
        })

        slpWallet.getXPubKey().then(function (xpub) {
          vm.$store.commit('global/updateXPubKey', {
            isChipnet,
            type: 'slp',
            xPubKey: xpub
          })
          vm.steps += 1
        })
      }

      wallet.sBCH.subscribeWallet().then(function () {
        vm.$store.commit('global/updateWallet', {
          type: 'sbch',
          derivationPath: wallet.sBCH.derivationPath,
          walletHash: wallet.sBCH.walletHash,
          lastAddress: wallet.sBCH._wallet ? wallet.sBCH._wallet.address : ''
        })
      })

      const walletHashes = [
        wallet.BCH.walletHash,
        wallet.BCH_CHIP.walletHash,
        wallet.SLP.walletHash,
        wallet.SLP_TEST.walletHash,
        wallet.sBCH.walletHash,
      ]
      this.$pushNotifications?.subscribe?.(walletHashes)
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
    this.walletIndex = this.$store.getters['global/getVault'].length

    if (this.$store.getters['global/isVaultEmpty']) {
      this.walletIndex = 0
    }

    // auto-detect country
    const apiKey = process.env.IPGEO_API_KEY
    const [countryFromIP, currencyFromIP] = await this.$axios.get(`https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}`)
      .then(response => {
        console.log(response.data)
        return [
          {
            name: response.data?.country_name,
            code: response.data?.country_code2
          },
          {
            symbol: response.data?.currency.code,
            name: response.data?.currency?.name
          }
        ]
      }).catch((error) => console.error(error))
    // console.log('currencyFromIP', currencyFromIP)
    this.$store.commit('global/setCountry', countryFromIP)
    // this.$store.commit('market/updateSelectedCurrency', currencyFromIP)
    // this.$store.dispatch('global/saveWalletPreferences')

    const currencyOptions = this.$store.getters['market/currencyOptions']
    let currency = currencyOptions.filter(o => o.symbol === currencyFromIP.symbol)
    console.log('currencyOptions', currencyOptions)
    console.log('currency', currency)

    if (currency.length !== 0) {
      console.log('entered hereeee')
      currency = currency[0]
      await this.$store.commit('market/updateSelectedCurrency', currency)
      await this.$store.dispatch('global/saveWalletPreferences')
    }

    console.log('now currency', this.$store.getters['market/selectedCurrency'])
    this.currencySelectorRerender = true

    const vm = this
    vm.$axios.get('https://watchtower.cash', { timeout: 30000 }).then(response => {
      if (response.status !== 200) return Promise.reject()
      vm.serverOnline = true
    }).catch(function () {
      vm.serverOnline = false
    })

    if (!this.$store.getters['global/isVaultEmpty']) {
      return
    }

    const eng = ['en-us', 'en-uk', 'en-gb', 'en']
    const supportedLangs = [
      { value: 'en-us', label: this.$t('English') },
      { value: 'zh-cn', label: this.$t('ChineseSimplified') },
      { value: 'zh-tw', label: this.$t('ChineseTraditional') },
      { value: 'de', label: this.$t('German') },
      { value: 'es', label: this.$t('Spanish') },
    ]
    let finalLang = ''

    // Adjust paytaca language according to phone's language (if supported by paytaca)
    let deviceLang = null
    if (this.$q.platform.is.ios) {
      // Getting language code from device seems to be crashing in iOS 17.x
      // we just default to english for iOS for now
      deviceLang = supportedLangs[0]
    } else {
      try {
        deviceLang = await Device.getLanguageCode()
        deviceLang = deviceLang.value.toLowerCase()

        /**
        *  https://capacitorjs.com/docs/apis/device#getlanguagecoderesult
        *  Since Device.getLanguageCode() returns a two-char language code,
        *  we set chinese default to "zh-cn" (Chinese - Simplified)
        */
        if (deviceLang === 'zh') {
          deviceLang = 'zh-cn'
        }
      } catch (error) {
        deviceLang = supportedLangs[0]
        console.error(error)
      }
    }

    // defaults to english if device lang is unsupported by app
    if (eng.includes(deviceLang) || !this.$i18n.availableLocales.includes(deviceLang)) {
      finalLang = supportedLangs[0]
    } else {
      finalLang = supportedLangs.filter(o => {
        return {
          value: o.value,
          label: this.$t(o.label)
        }
      })
    }

    this.$i18n.locale = finalLang.value
    this.$store.commit('global/setLanguage', this.$t(finalLang.label))
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
ul {
  list-style: none;
  display: block;
  margin-left: -40px;
  text-align: justify;
}
ul li {
  display: inline-block;
  font-size: 18px;
  padding: 10px;
}
li span {
  background:#AAB2E9;
  padding: 5px 15px;
  border-radius: 20px;
  color: #fff;
}
li pre {
  display: inline;
  color: #D36EE1;
  padding-right: 5px;
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
</style>
