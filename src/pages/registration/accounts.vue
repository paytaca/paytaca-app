<template>
  <div id="registration-container">
    <div class="row q-pb-sm">
      <div class="col pt-brand" :style="{ 'margin-top': this.$q.platform.is.ios ? '50px' : '0px'}">
        <img src="~/assets/paytaca_logo.png" height="60">
        <p class="pt-brandname">Paytaca</p>
      </div>
    </div>
    <div class="row pt-wallet q-mt-sm" :class="{'pt-dark': $store.getters['darkmode/getStatus']}" v-if="mnemonic.length === 0 && importSeedPhrase === false">
      <div class="col-12 q-mt-md q-px-lg q-py-none">
        <div class="row">
          <div class="col-12 q-py-sm">
            <q-btn class="full-width bg-blue-9 text-white" @click="createWallets" label="Create New Wallet" rounded />
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
          <div class="col q-mt-sm" v-if="steps < totalSteps" style="text-align: center;">
            <ProgressLoader/>
          </div>
        </div>
        <div class="row" v-if="steps === totalSteps">
          <q-btn class="full-width bg-blue-9 text-white" @click="choosePreferedSecurity" label="Continue" rounded />
        </div>
      </div>
    </div>

    <securityOptionDialog :security-option-dialog-status="securityOptionDialogStatus" v-on:preferredSecurity="setPreferredSecurity" />
    <pinDialog :pin-dialog-action="pinDialogAction" v-on:nextAction="executeActionTaken" />

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
      importSeedPhrase: false,
      seedPhraseBackup: null,
      mnemonic: '',
      steps: 0,
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
        this.mnemonic = await storeMnemonic(this.seedPhraseBackup)
      } else {
        this.mnemonic = await generateMnemonic()
      }
      vm.steps += 1

      const wallet = new Wallet(this.mnemonic)

      wallet.BCH.getNewAddressSet(0).then(function (addresses) {
        vm.$store.commit('global/updateWallet', {
          type: 'bch',
          walletHash: wallet.BCH.walletHash,
          derivationPath: wallet.BCH.derivationPath,
          lastAddress: addresses !== null ? addresses.receiving : '',
          lastChangeAddress: addresses !== null ? addresses.change : '',
          lastAddressIndex: 0
        })
        vm.steps += 1
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
      wallet.sBCH.getOrInitWallet().then(function () {
        wallet.sBCH.subscribeWallet()
        vm.$store.commit('global/updateWallet', {
          type: 'sbch',
          derivationPath: wallet.sBCH.derivationPath,
          walletHash: wallet.sBCH.walletHash,
          lastAddress: wallet.sBCH._wallet ? wallet.sBCH._wallet.address : ''
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
  }
}
</script>

<style lang="scss">
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
</style>
