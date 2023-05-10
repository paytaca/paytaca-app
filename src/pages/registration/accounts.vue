<template>
  <div id="registration-container">
    <div class="row q-pb-sm">
      <div class="col pt-brand" :style="{ 'margin-top': $q.platform.is.ios ? '50px' : '0px'}">
        <img src="~/assets/paytaca_logo.png" height="60">
        <p class="pt-brandname">Paytaca</p>
      </div>
    </div>
    <div class="row pt-wallet q-mt-sm" :class="{'pt-dark': $store.getters['darkmode/getStatus']}" v-if="mnemonic.length === 0 && importSeedPhrase === false && steps === -1">
      <div v-if="serverOnline" v-cloak>
        <div class="col-12 q-mt-md q-px-lg q-py-none">
          <q-btn
            flat
            padding="md"
            icon="arrow_back"
            color="blue"
            @click="!$router.push('/')"
            v-if="!$store.getters['global/isVaultEmpty']"
          />
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
      </div>
      <div class="row" v-else style="margin-top: 60px;">
        <div class="col" v-if="serverOnline === false">
          <div class="col q-mt-sm pt-internet-required" :class="{'pt-dark': $store.getters['darkmode/getStatus']}">
            {{ $t('NoInternetConnectionNotice') }} &#128533;
          </div>
        </div>
      </div>
    </div>
    <div class="col pt-wallet q-mt-sm" v-if="steps > -1 && steps < totalSteps" style="text-align: center;">
      <ProgressLoader/>
    </div>
    <div class="row pt-wallet q-mt-sm" :class="{'pt-dark': $store.getters['darkmode/getStatus']}" v-if="importSeedPhrase && mnemonic.length === 0">
      <div class="col-12 q-px-lg">
        <p
          style="text-align: center; font-size: 16px; color: #000;"
          :class="{'pt-dark-label': $store.getters['darkmode/getStatus']}"
        >
          {{ $t('RestoreWalletDescription') }}
        </p>
        <q-input type="textarea" class="q-mt-xs bg-grey-3 q-px-md q-py-sm br-15" v-model="seedPhraseBackup" />
        <q-btn class="full-width bg-blue-9 text-white q-mt-md" @click="initCreateWallet()" :disable="!validateSeedPhrase()" :label="$t('RestoreWallet')" rounded />
      </div>
    </div>

    <div class="row" v-if="mnemonic.length > 0">
      <div class="pt-get-started q-mt-sm q-pa-lg">
        <template v-if="steps === totalSteps">
          <h5 class="q-ma-none get-started-text text-black">{{ $t('MnemonicBackupPhrase') }}</h5>
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
                  :label="$t('MnemonicBackupPhrase')"
                  @click="showMnemonicTest = false"
                />
              </div>
              <MnemonicTest :mnemonic="mnemonic" class="q-mb-md" @matched="mnemonicVerified = true" />
            </div>
          </template>
        </div>
        <div class="row" v-if="steps === totalSteps">
          <q-btn v-if="mnemonicVerified" class="full-width bg-blue-9 text-white" @click="choosePreferedSecurity" :label="$t('Continue')" rounded />
          <q-btn v-else rounded :label="$t('Continue')" class="full-width bg-blue-9 text-white" @click="showMnemonicTest = true"/>
        </div>
      </div>
    </div>

    <securityOptionDialog :security-option-dialog-status="securityOptionDialogStatus" v-on:preferredSecurity="setPreferredSecurity" />
    <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="executeActionTaken" />

  </div>
</template>

<script>
import { Wallet, storeMnemonic, generateMnemonic } from '../../wallet'
import ProgressLoader from '../../components/ProgressLoader'
import pinDialog from '../../components/pin'
import MnemonicTest from 'src/components/MnemonicTest.vue'
import securityOptionDialog from '../../components/authOption'
import { NativeBiometric } from 'capacitor-native-biometric'
import { utils } from 'ethers'
import { Device } from '@capacitor/device'

export default {
  name: 'registration-accounts',
  components: { ProgressLoader, pinDialog, securityOptionDialog, MnemonicTest },
  data () {
    return {
      serverOnline: null,
      importSeedPhrase: false,
      seedPhraseBackup: null,
      mnemonic: '',
      steps: -1,
      totalSteps: 5,
      mnemonicVerified: false,
      showMnemonicTest: false,
      pinDialogAction: '',
      pin: '',
      securityOptionDialogStatus: 'dismiss',
      walletIndex: 0
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
  methods: {
    validateSeedPhrase () {
      return utils.isValidMnemonic(this.seedPhraseBackup)
    },
    cleanUpSeedPhrase (seedPhrase) {
      return seedPhrase.toLowerCase().trim()
        .replace(/\s{2,}/g, ' ') // Remove extra internal whitespaces
        .replace(/[^\x00-\x7F]/g, '') // Remove non-ascii characters
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '') // Remove punctuations
        .replace(/(\r\n|\n|\r)/gm, ' ') // Remove newlines
    },
    saveToVault () {
      console.log('saving to vault: ')
      console.log(this.$store.getters['global/getVault'])
      const allWalletType = this.$store.getters['global/getAllWalletTypes']
      console.log(allWalletType)

      const info = {
        index: this.walletIndex,
        wallet: allWalletType
      }
      this.$store.commit('global/updateVault', info)
      this.$store.commit('global/updateWalletIndex', this.walletIndex)
      // console.log(this.$store.getters['global/getVault'])
    },
    continueToDashboard () {
      const vm = this

      this.$store.dispatch('global/updateOnboardingStep', 1).then(function () {
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
      if (vm.importSeedPhrase) {
        vm.mnemonicVerified = true
        vm.mnemonic = await storeMnemonic(this.cleanUpSeedPhrase(this.seedPhraseBackup), vm.walletIndex)
      } else {
        vm.mnemonic = await generateMnemonic(vm.walletIndex)
      }
      vm.steps += 1

      console.log('mnemonic generated')
      const wallet = new Wallet(this.mnemonic)
      console.log(this.$store.getters['global/getVault'])

      wallet.BCH.getNewAddressSet(0).then(function ({ addresses, pgpIdentity }) {
        vm.$store.commit('global/updateWallet', {
          type: 'bch',
          walletHash: wallet.BCH.walletHash,
          derivationPath: wallet.BCH.derivationPath,
          lastAddress: addresses !== null ? addresses.receiving : '',
          lastChangeAddress: addresses !== null ? addresses.change : '',
          lastAddressIndex: 0
        })
        vm.$store.dispatch('chat/addIdentity', pgpIdentity)
        vm.steps += 1
        try {
          vm.$store.dispatch('global/refetchWalletPreferences')
        } catch(error) { console.error(error) }
      })

      wallet.BCH.getXPubKey().then(function (xpub) {
        vm.$store.commit('global/updateXPubKey', {
          type: 'bch',
          xPubKey: xpub
        })
        vm.steps += 1
      })

      wallet.SLP.getNewAddressSet(0).then(function (addresses) {
        vm.$store.commit('global/updateWallet', {
          type: 'slp',
          walletHash: wallet.SLP.walletHash,
          derivationPath: wallet.SLP.derivationPath,
          lastAddress: addresses !== null ? addresses.receiving : '',
          lastChangeAddress: addresses !== null ? addresses.change : '',
          lastAddressIndex: 0
        })
        vm.steps += 1
      })

      wallet.SLP.getXPubKey().then(function (xpub) {
        vm.$store.commit('global/updateXPubKey', {
          type: 'slp',
          xPubKey: xpub
        })
        vm.steps += 1
      })

      wallet.sBCH.subscribeWallet().then(function () {
        vm.$store.commit('global/updateWallet', {
          type: 'sbch',
          derivationPath: wallet.sBCH.derivationPath,
          walletHash: wallet.sBCH.walletHash,
          lastAddress: wallet.sBCH._wallet ? wallet.sBCH._wallet.address : ''
        })
      })

      const walletHashes = [
        wallet.BCH.getWalletHash(),
        wallet.SLP.getWalletHash(),
        wallet.sBCH.getWalletHash(),
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
    const eng = ['en-us', 'en-uk', 'en-gb', 'en']
    const supportedLangs = [
      { value: 'en-us', label: 'English' },
      { value: 'es', label: 'Spanish' }
    ]
    let finalLang = ''

    // get walletIndex
    this.walletIndex = this.$store.getters['global/getVault'].length

    if (this.$store.getters['global/isVaultEmpty']) {
      this.walletIndex = 0
    }

    console.log(this.walletIndex)
    console.log('current vault: ')
    console.log(this.$store.getters['global/getVault'])

    // Adjust paytaca language according to phone's language (if supported by paytaca)
    let deviceLang = null
    try {
      deviceLang = await Device.getLanguageCode()
      deviceLang = deviceLang.value.toLowerCase()
    } catch (error) {
      deviceLang = supportedLangs[0]
      console.error(error)
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
    this.$q.localStorage.set('lang', finalLang)

    const vm = this

    vm.$axios.get('https://watchtower.cash', { timeout: 30000 }).then(function (response) {
      if (response.status !== 200) return Promise.reject()
      vm.serverOnline = true
    }).catch(function () {
      vm.serverOnline = false
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
