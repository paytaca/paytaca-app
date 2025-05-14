<template>
  <div id="app-container" class="light" :class="gradientBg ? 'gradient-bg' : ''">
    <!-- On boarding -->
    <onboarding v-if="showOnboarding" @register="showOnboarding = false"/>
    <div v-else>
      <!-- Select Language -->
      <selectCountryLanguage v-if="status === 'country-lang-select'" @done="status = 'login'" :key="currencySelectorRerender"/>
      <!-- Login/Sign up -->
      <login v-if="status === 'login'" @proceed="proceedAccountLogin"/>
      <!-- Import Seed Phrase or Use shards // Wallet Creation -->
      <div v-if="status === 'wallet-create'">   
        <div v-if="importSeedPhrase">
          <seedPhraseContainer v-if="loginType === 'seed-phrase'" @back="returnToLoginSelect()" :isImport="true" @submit="handleSeedPhraseContainer"/>
          <div v-else class="text-dark">
            Login with shards
          </div>
        </div>
        <div v-else>          
          <!-- Verify Wallet -->
          <seedPhraseContainer v-if="loginType === 'seed-phrase'" @back="returnToLoginSelect()" :isImport="false" :mnemonic="mnemonic" @submit=""/>
        </div>        
      </div>      
    </div>

    <loadingDialog v-model="openLoadingDialog"/>
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
import onboarding from 'src/components/ui-revamp/registration/onboarding.vue'
import loadingDialog from 'src/components/ui-revamp/registration/loadingDialog.vue'
import selectCountryLanguage from 'src/components/ui-revamp/registration/select-country-language.vue'
import seedPhraseContainer from 'src/components/ui-revamp/registration/seed-phrase-container.vue'
import login from 'src/components/ui-revamp/registration/login.vue'
import securityOptionDialog from '../../components/authOption'
import pinDialog from '../../components/pin'

import { supportedLangs as supportedLangsI18n } from '../../i18n'
import { Wallet, storeMnemonic, generateMnemonic } from '../../wallet'
import { NativeBiometric } from 'capacitor-native-biometric'

export default {
  data () {
    return {
      darkmode: this.$store.getters['darkmode/getStatus'],
      showOnboarding: false,
      loading: false,
      loginType: '', // shards, seed-phrase
      steps: 0,
      totalStep: 9,
      createAccount: false, 
      importSeedPhrase: false,
      gradientBg: true,
      creatingWallet: false,
      seedPhraseBackup: null,
      mnemonic: '',
      mnemonicVerified: false,
      pinDialogAction: '',
      newWalletHash: '',
      currencySelectorRerender: false,
      securityOptionDialogStatus: 'show',

      walletIndex: 0,
      openLoadingDialog: false,
      status: 'country-lang-select', //  country-lang-select, login, wallet-create
    }
  },
  computed: {
    isFinalStep () {
      return this.steps === this.totalStep
    }
  },
  components: {
    onboarding,
    selectCountryLanguage,
    login,
    seedPhraseContainer,
    loadingDialog,
    securityOptionDialog,
    pinDialog
  },
  async mounted () {
    this.loading = true
    if (this.$store.getters['global/isVaultEmpty']) {
      this.showOnboarding = true
    }

    this.walletIndex = this.$store.getters['global/getVault'].length

    if (this.$store.getters['global/isVaultEmpty']) {
      this.walletIndex = 0
    }
    
    await this.$store.dispatch('market/updateSupportedCurrencies', {})

    // auto-detect country
    const ipGeoPreferences = await this.getIPGeolocationPreferences()

    console.log('ipGeoPreferences: ', ipGeoPreferences)

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

    if (this.$store.getters['global/isVaultEmpty']) {
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
    if (ipGeoPreferences) {
      vm.$store.commit('global/setCountry', {
        country: ipGeoPreferences.country,
        denomination: this.$t('DEEM')
      })
    }    

    this.$axios.get('https://watchtower.cash/api/status/', { timeout: 30000 }).then(response => {
      if (response.status !== 200) return Promise.reject()
      if (response.data.status !== 'up') return Promise.reject()
      this.serverOnline = true    
    }).catch(() => {
      this.serverOnline = false      
    })   
    this.loading = false 
  },
  methods: {
    proceedAccountLogin (info) {
      console.log('login: ', info)
      this.loginType = info.type
      this.createAccount = info.createAccount
      this.importSeedPhrase = !info.createAccount

      if (!this.importSeedPhrase) {        
        // setTimeout(() => { this.openLoadingDialog = false}, 5000)
        this.createWallets()

      } else {
        this.status = 'wallet-create'
        this.gradientBg = false
      } 
    },
    returnToLoginSelect () {
      this.gradientBg = true      
      this.status = 'login'
    },
    setPreferredSecurity (auth) {
      console.log('auth here: ', auth)
      this.$q.localStorage.set('preferredSecurity', auth)
      if (auth === 'pin') {
        this.pinDialogAction = 'SET UP'
      } else {
        this.verifyBiometric()
      }
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
    executeActionTaken (action) {
      const vm = this
      if (action === 'proceed') {
        vm.continueToDashboard()
      } else {
        vm.pinDialogAction = ''
      }
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
    saveToVault () {
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
    async promptEnablePushNotification() {
      await this.$pushNotifications.isPushNotificationEnabled().catch(console.log)
      if (!this.$pushNotifications.isEnabled) {
        await this.$pushNotifications.openPushNotificationsSettingsPrompt({
          message: 'Enable push notifications to receive updates from the app',
        }).catch(console.log)
      }
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
    setLanguage(languageCode) {
      if (!supportedLangsI18n[languageCode]) return
      this.$i18n.locale = languageCode
      this.$store.commit('global/setLanguage', languageCode)
    },
    handleSeedPhraseContainer (phrase) {
      this.seedPhraseBackup = phrase

      console.log('mnemonic: ', this.seedPhraseBackup)
      this.createWallets()
    },
    async createWallets () {
      const vm = this
      vm.openLoadingDialog = true

      // Create mnemonic seed, encrypt, and store
      if (!vm.mnemonic) {
        if (vm.importSeedPhrase) {
          vm.mnemonicVerified = true
          vm.mnemonic = await storeMnemonic(this.seedPhraseBackup, vm.walletIndex)
          console.log('mnemonic: ', vm.mnemonic)
        } else {
          vm.mnemonic = await generateMnemonic(vm.walletIndex)
          console.log('mnemonic: ', vm.mnemonic)
        }
      }
      vm.steps += 1
      console.log('steps: ', vm.steps)

      const wallet = new Wallet(vm.mnemonic)
      const bchWallets = [wallet.BCH, wallet.BCH_CHIP]
      const slpWallets = [wallet.SLP, wallet.SLP_TEST]

      for (const bchWallet of bchWallets) {
        const isChipnet = bchWallets.indexOf(bchWallet) === 1

        await bchWallet.getNewAddressSet(0).then(function (response) {
          const addresses = response?.addresses || null

          vm.$store.commit('global/updateWallet', {
            isChipnet,
            type: 'bch',
            walletHash: bchWallet.walletHash,
            derivationPath: bchWallet.derivationPath,
            lastAddress: addresses !== null ? addresses.receiving : '',
            lastChangeAddress: addresses !== null ? addresses.change : '',
            lastAddressIndex: 0,
          })
          vm.steps += 1
          console.log('steps: ', vm.steps)
          try {
            vm.$store.dispatch('global/refetchWalletPreferences')
          } catch(error) { console.error(error) }
        })

        await bchWallet.getXPubKey().then(function (xpub) {
          vm.$store.commit('global/updateXPubKey', {
            isChipnet,
            type: 'bch',
            xPubKey: xpub
          })
          vm.steps += 1
          console.log('steps: ', vm.steps)
        })
      }

      for (const slpWallet of slpWallets) {
        const isChipnet = slpWallets.indexOf(slpWallet) === 1

        await slpWallet.getNewAddressSet(0).then(function (addresses) {
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
          console.log('steps: ', vm.steps)
        })

        await slpWallet.getXPubKey().then(function (xpub) {
          vm.$store.commit('global/updateXPubKey', {
            isChipnet,
            type: 'slp',
            xPubKey: xpub
          })
          vm.steps += 1
          console.log('steps: ', vm.steps)
        })
      }

      await wallet.sBCH.subscribeWallet().then(function () {
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
      this.$pushNotifications?.subscribe?.(walletHashes, this.walletIndex, true)
      this.newWalletHash = wallet.BCH.walletHash

      console.log('new wallethash: ', this.newWalletHash)



      this.openLoadingDialog = false

      if (!vm.importSeedPhrase) {
        this.status = 'wallet-create'
        this.gradientBg = false
        // this.status = 'final-step'
      } else {
        // this.status = 'final-step'
        this.checkFingerprintAuthEnabled()
      }      
    },
  }
}
</script>
<style lang="scss" scoped>
</style>
