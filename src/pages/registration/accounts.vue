<template>
  <div id="registration-container">
    <div class="row">
      <div class="col" style="text-align: center; padding: 20px 0px 0px 0px;">
        <img src="~/assets/paytaca_logo.png" height="60">
        <p style="color: #EAEEFF; font-size: 28px;">Paytaca</p>
      </div>
    </div>
    <div class="row">
      <div class="get-started q-mt-sm q-pa-lg">
        <h5 class="q-ma-none get-started-text">Mnemonic Backup Phrase</h5>
        <p class="dim-text">Write on paper and keep it somewhere safe</p>

        <div class="row" id="mnemonic">
          <div class="col q-mt-sm">
            <ul>
              <li v-for="(word, index) in mnemonic.split(' ')" :key="'word-' + index">
                <pre>{{ index + 1 }}</pre><span>{{ word }}</span>
              </li>
            </ul>
          </div>
        </div>
        <div class="row">
          <button class="submit-btn q-mt-md" @click="continueToDashboard" style="background: #3b7bf6; font-size: 18px;">Continue</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import crypto from 'crypto'
import { LocalStorage } from 'quasar'

const BCHJS = require('@psf/bch-js')

const bchjs = new BCHJS({
  restURL: 'https://bchn.fullstack.cash/v3/'
})
export default {
  name: 'registration-accounts',
  data () {
    return {
      mnemonic: ''
    }
  },
  methods: {
    continueToDashboard () {
      this.$router.push('/')
    },
    generateMnemonic () {
      this.mnemonic = bchjs.Mnemonic.generate(128)
      const encryptedMnemonic = this.$aes256.encrypt(this.mnemonic)
      this.$store.commit('global/updateMnemonic', encryptedMnemonic)
    },
    async generateAddresses () {
      const seedBuffer = await bchjs.Mnemonic.toSeed(this.mnemonic)
      const hdNode = bchjs.HDNode.fromSeed(seedBuffer)

      var addresses = {}

      const account1 = bchjs.HDNode.derive(hdNode, 0)
      const account1Pk = account1.keyPair.toWIF()
      addresses.escrow = {
        address: bchjs.Address.toCashAddress(account1.keyPair.getAddress()),
        privateKey: this.$aes256.encrypt(account1Pk)
      }

      const account2 = bchjs.HDNode.derive(hdNode, 1)
      const account2Pk = account2.keyPair.toWIF()
      // const account2Addr = account2.keyPair.address
      addresses.private = {
        address: bchjs.Address.toCashAddress(account2.keyPair.getAddress()),
        privateKey: this.$aes256.encrypt(account2Pk)
      }

      this.$store.dispatch('global/updateAddresses', addresses)
    },
    createAccount () {
      const vm = this
      vm.generateMnemonic()
      vm.generateAddresses()
      // vm.$store.dispatch('global/updateOnboardingStep', 1).then(function () {
      //   vm.$router.push('/')
      // })
    }
  },
  mounted () {
    this.createAccount()
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
