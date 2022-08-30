<template>
  <div id="registration-container">
    <div class="row q-pb-sm">
      <div class="col pt-brand" :style="{ 'margin-top': this.$q.platform.is.ios ? '50px' : '0px'}">
        <img src="~/assets/paytaca_logo.png" height="60">
        <p class="pt-brandname">Paytaca</p>
      </div>
    </div>
    <div class="row pt-wallet q-mt-sm" :class="{'pt-dark': $store.getters['darkmode/getStatus']}" v-if="mnemonic.length === 0 && importSeedPhrase === false && steps === -1">
      <div v-if="show" v-cloak>
        <div class="col-12 q-mt-md q-px-lg q-py-none">
          <div class="row">
            <div class="col-12 q-py-sm">
              <q-btn class="full-width bg-blue-9 text-white" @click="() => { if (steps === -1) { steps = 0 }; $forceUpdate(); }" label="Create New Wallet" rounded />
            </div>
            <div class="col-12 text-center q-py-sm">
              <p class="q-my-none q-py-none" style="font-size: 14px; color: #2E73D2;">OR</p>
            </div>
            <div class="col-12 q-py-sm">
              <q-btn class="full-width bg-blue-9 text-white" @click="() => { importSeedPhrase = true }" label="Restore from Seed Phrase" rounded />
            </div>
          </div>
        </div>
      </div>
      <div class="row" v-else style="margin-top: 60px;">
        <div class="col" v-if="error">
          <div class="col q-mt-sm pt-internet-required" :class="{'pt-dark': $store.getters['darkmode/getStatus']}">
            Our backend server is unreachable. This could be due to your internet connection or our server being temporarily down. &#128533;
          </div>
        </div>
        <div class="col transparent" v-else>
          <div class="col q-mt-sm text-center">
            <ProgressLoader color="white" />
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
        >Restore your Paytaca wallet from its mnemonic backup phrase.</p>
        <q-input type="textarea" class="q-mt-xs bg-grey-3 q-px-md q-py-sm br-15" v-model="seedPhraseBackup" />
        <q-btn class="full-width bg-blue-9 text-white q-mt-md" @click="createWallets" label="Restore Wallet" rounded />
      </div>
    </div>

    <div class="row" v-if="mnemonic.length > 0">
      <div class="pt-get-started q-mt-sm q-pa-lg">

        <template v-if="steps === totalSteps">
          <h5 class="q-ma-none get-started-text text-black">Mnemonic Backup Phrase</h5>
          <p v-if="importSeedPhrase" class="dim-text" style="margin-top: 10px;">
            Double check if this matches your mnemonic backup phrase.
          </p>
          <p v-else class="dim-text" style="margin-top: 10px;">
            Write on paper or take a screenshot and keep it somewhere safe.
          </p>
        </template>
        <p class="dim-text" style="text-align: center;" v-else>{{ importSeedPhrase ? 'Restoring' : 'Creating' }} your wallet...</p>

        <div class="row" id="mnemonic">
          <div class="col q-mb-sm text-caption" v-if="steps === totalSteps">
            <ul>
              <li v-for="(word, index) in mnemonic.split(' ')" :key="'word-' + index">
                <pre class="q-mr-sm">{{ index + 1 }}</pre><span>{{ word }}</span>
              </li>
            </ul>
          </div>
        </div>
        <div class="row" v-if="steps === totalSteps">
          <q-btn class="full-width bg-blue-9 text-white" @click="choosePreferedSecurity" label="Continue" rounded />
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
import securityOptionDialog from '../../components/authOption'
import { NativeBiometric } from 'capacitor-native-biometric'

export default {
  name: 'registration-accounts',
  components: { ProgressLoader, pinDialog, securityOptionDialog },
  data () {
    return {
      show: false,
      error: false,
      importSeedPhrase: false,
      seedPhraseBackup: null,
      mnemonic: '',
      steps: -1,
      totalSteps: 5,
      seedInput: true,
      pinDialogAction: '',
      pin: '',
      counter: 0,
      validationMsg: '',
      pinKeys: [{ key: '' }, { key: '' }, { key: '' }, { key: '' }, { key: '' }, { key: '' }],
      countKeys: 0,
      securityOptionDialogStatus: 'dismiss'
    }
  },
  watch: {
    steps (val) {
      if (val === 0) {
        this.createWallets()
      }
    }
  },
  methods: {
    continueToDashboard () {
      const vm = this

      this.$store.dispatch('global/updateOnboardingStep', 1).then(function () {
        vm.$router.push('/')
      })
    },
    async createWallets () {
      const vm = this

      // Create mnemonic seed, encrypt, and store
      if (vm.importSeedPhrase) {
        vm.mnemonic = await storeMnemonic(this.seedPhraseBackup)
      } else {
        vm.mnemonic = await generateMnemonic()
      }
      vm.steps += 1

      const bchWallet = new Wallet(this.mnemonic, 'BCH')

      bchWallet.BCH.getNewAddressSet(0).then(function (addresses) {
        vm.$store.commit('global/updateWallet', {
          type: 'bch',
          walletHash: bchWallet.BCH.walletHash,
          derivationPath: bchWallet.BCH.derivationPath,
          lastAddress: addresses !== null ? addresses.receiving : '',
          lastChangeAddress: addresses !== null ? addresses.change : '',
          lastAddressIndex: 0
        })
        vm.steps += 1
      })

      bchWallet.BCH.getXPubKey().then(function (xpub) {
        vm.$store.commit('global/updateXPubKey', {
          type: 'bch',
          xPubKey: xpub
        })
        vm.steps += 1
      })

      bchWallet.SLP.getNewAddressSet(0).then(function (addresses) {
        vm.$store.commit('global/updateWallet', {
          type: 'slp',
          walletHash: bchWallet.SLP.walletHash,
          derivationPath: bchWallet.SLP.derivationPath,
          lastAddress: addresses !== null ? addresses.receiving : '',
          lastChangeAddress: addresses !== null ? addresses.change : '',
          lastAddressIndex: 0
        })
        vm.steps += 1
      })

      bchWallet.SLP.getXPubKey().then(function (xpub) {
        vm.$store.commit('global/updateXPubKey', {
          type: 'slp',
          xPubKey: xpub
        })
        vm.steps += 1
      })

      const sbchWallet = new Wallet(this.mnemonic, 'sBCH')
      sbchWallet.sBCH.getOrInitWallet().then(function () {
        sbchWallet.sBCH.subscribeWallet()
        vm.$store.commit('global/updateWallet', {
          type: 'sbch',
          derivationPath: sbchWallet.sBCH.derivationPath,
          walletHash: sbchWallet.sBCH.walletHash,
          lastAddress: sbchWallet.sBCH._wallet ? sbchWallet.sBCH._wallet.address : ''
        })
      })
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
        reason: 'For easy log in',
        title: 'Security Authentication',
        subtitle: 'Verify your account using fingerprint.',
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
  mounted () {
    const vm = this
    vm.$axios.get('https://watchtower.cash', { timeout: 30000 }).then(function (response) {
      if (response.status === 200) {
        vm.show = true
      }
    }).catch(function () {
      vm.error = true
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
