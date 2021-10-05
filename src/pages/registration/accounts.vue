<template>
  <div id="registration-container" style="background-color: #ECF3F3; min-height: 100vh;">
    <div class="row">
      <div class="col" style="text-align: center; padding: 20px 0px 0px 0px;">
        <img src="~/assets/paytaca_logo.png" height="60">
        <p style="color: #EAEEFF; font-size: 28px;">Paytaca</p>
      </div>
    </div>
    <div class="row get-started" v-if="mnemonic.length === 0 && importSeedPhrase === false">
      <div style="height: 100px;">
        <q-btn @click="createWallets">Create New Wallet</q-btn>
      </div>
      <p>OR</p>
      <div style="height: 100px;">
        <q-btn @click="() => {importSeedPhrase = true }">Restore from Seed Phrase</q-btn>
      </div>
    </div>
    <div class="row get-started" v-if="importSeedPhrase && mnemonic.length === 0">
      <q-input
        v-model="seedPhraseBackup"
        filled
        autogrow
        style="width: 100%;"
      />
      <div style="width: 100%;">
        <q-btn @click="createWallets">Restore Wallet</q-btn>
      </div>
    </div>

    <div class="row" v-if="mnemonic.length > 0">
      <div class="get-started q-mt-sm q-pa-lg">

        <template v-if="steps === totalSteps">
          <h5 class="q-ma-none get-started-text">Mnemonic Backup Phrase</h5>
          <p class="dim-text" style="margin-top: 10px;">
            Write on paper or take a screenshot and keep it somewhere safe.
          </p>
        </template>
        <p class="dim-text" style="text-align: center;" v-else>Creating your wallet...</p>

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
      totalSteps: 5
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
</style>
