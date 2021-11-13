<template>
  <div id="registration-container">
    <div class="row">
      <div class="col pt-brand">
        <img src="~/assets/paytaca_logo.png" height="60">
        <p class="pt-brandname">Paytaca</p>
      </div>
    </div>
    <div class="row pt-wallet q-mt-sm" v-if="mnemonic.length === 0 && importSeedPhrase === false">
      <div class="col-12 q-mt-md q-px-lg q-py-none">
        <div class="row">
          <div class="col-12 q-py-sm">
            <button class="pt-btn-wallet" @click="createWallets">Create New Wallet</button>
          </div>
          <div class="col-12 text-center q-py-sm">
            <p class="q-my-none q-py-none" style="font-size: 14px">OR</p>
          </div>
          <div class="col-12 q-py-sm">
            <button class="pt-btn-wallet" @click="() => { importSeedPhrase = true }">Restore from Seed Phrase</button>
          </div>
        </div>
      </div>
    </div>
    <div class="row pt-wallet q-mt-sm" v-if="importSeedPhrase && mnemonic.length === 0">
      <div class="col-12 q-px-lg">
        <p style="text-align: center; font-size: 16px;">Restore your Paytaca wallet from its mnemonic backup phrase.</p>
        <textarea class="form-textarea q-mt-xs pt-input" rows="4" v-model="seedPhraseBackup"></textarea>
        <button class="pt-btn-wallet" @click="createWallets">Restore Wallet</button>
      </div>
    </div>

    <div class="row" v-if="mnemonic.length > 0">
      <div class="pt-get-started q-mt-sm q-pa-lg">

        <template v-if="steps === totalSteps">
          <h5 class="q-ma-none get-started-text">Mnemonic Backup Phrase</h5>
          <p v-if="importSeedPhrase" class="dim-text" style="margin-top: 10px;">
            Double check if this matches your mnemonic backup phrase.
          </p>
          <p v-else class="dim-text" style="margin-top: 10px;">
            Write on paper or take a screenshot and keep it somewhere safe.
          </p>
        </template>
        <p class="dim-text" style="text-align: center;" v-else>{{ importSeedPhrase ? 'Restoring' : 'Creating' }} your wallet...</p>

        <div class="row" id="mnemonic">
          <div class="col q-mt-sm" v-if="steps === totalSteps">
            <ul>
              <li v-for="(word, index) in mnemonic.split(' ')" :key="'word-' + index">
                <pre>{{ index + 1 }}</pre><span>{{ word }}</span>
              </li>
            </ul>
          </div>
          <div class="col q-mt-sm" v-if="steps < totalSteps" style="text-align: center;">
            <loader></loader>
          </div>
        </div>
        <div class="row" v-if="steps === totalSteps">
          <button class="submit-btn q-mt-md" @click="continueToDashboard" style="background: #3b7bf6; font-size: 18px; margin-top: 25px;">Continue</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Wallet, storeMnemonic, generateMnemonic } from '../../wallet'
import Loader from '../../components/loader'

export default {
  name: 'registration-accounts',
  components: { Loader },
  data () {
    return {
      importSeedPhrase: false,
      seedPhraseBackup: null,
      mnemonic: '',
      steps: 0,
      totalSteps: 5,
      seedInput: true
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
          lastAddress: addresses.receiving,
          lastChangeAddress: addresses.change,
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
          lastAddress: addresses.receiving,
          lastChangeAddress: addresses.change,
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
    }
  }
}
</script>

<style>
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
.form-textarea {
  width: 100%;
  border-radius: 18px;
  border: 1px solid #008BF1;
  outline: 0;
  padding-left: 14px;
  padding-top: 10px;
}
.form-textarea:focus {
  border-color: #89BFF4;
  box-shadow: 0px 0px 2px 2px rgba(137, 191, 244, .5);
}
.pt-btn-wallet {
  background-color: #2E73D2;
  border: 1px solid #15568E;
  width: 100%;
  height: 40px;
  margin-top: 10px;
  font-size: 15px;
  font-family: Arial, Helvetica, sans-serif;
  border-radius: 20px;
  color: #fff;
  outline: 0;
}
.pt-btn-wallet:focus {
  box-shadow: 0px 0px 2px 2px rgba(93, 173, 226, .8);
}
</style>
