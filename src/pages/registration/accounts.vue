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
          <div class="col q-mt-sm" v-if="steps === 5">
            <ul>
              <li v-for="(word, index) in mnemonic.split(' ')" :key="'word-' + index">
                <pre>{{ index + 1 }}</pre><span>{{ word }}</span>
              </li>
            </ul>
          </div>
          <div class="col q-mt-sm" v-if="steps < 5" style="text-align: center;">
            <loader></loader>
          </div>
        </div>
        <div class="row" v-if="steps === 5">
          <button class="submit-btn q-mt-md" @click="continueToDashboard" style="background: #3b7bf6; font-size: 18px;">Continue</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { generateMnemonic, Wallet } from '../../utils/wallet'
import Loader from '../../components/Loader.vue'

export default {
  name: 'registration-accounts',
  components: { Loader },
  data () {
    return {
      mnemonic: '',
      steps: 0
    }
  },
  methods: {
    continueToDashboard () {
      this.$router.push('/')
    },
    createWallets () {
      const vm = this

      // Create mnemonic seed, encrypt, and store
      this.mnemonic = generateMnemonic()
      console.log('Mnemonic:', this.mnemonic)
      const encryptedMnemonic = this.$aes256.encrypt(this.mnemonic)
      console.log('Encypted Mnemonic:', encryptedMnemonic)
      this.$store.commit('global/updateMnemonic', encryptedMnemonic)
      vm.steps += 1

      const wallet = new Wallet(this.mnemonic)

      wallet.BCH.getAddress(0).then(function (address) {
        console.log('BCH wallet hash:', wallet.BCH.getWalletHash())
        console.log('BCH wallet address at index 0:', address)
        vm.$store.commit('global/updateWallet', {
          type: 'bch',
          walletHash: wallet.BCH.walletHash,
          lastAddress: address,
          lastWalletIndex: 0
        })
        vm.steps += 1
      })

      wallet.BCH.getXPubKey().then(function (xpub) {
        console.log('BCH wallet xpub key:', xpub)
        vm.$store.commit('global/updateXPubKey', {
          type: 'bch',
          xPubKey: xpub
        })
        vm.steps += 1
      })

      wallet.SLP.getAddress(0).then(function (address) {
        console.log('SLP wallet hash:', wallet.SLP.getWalletHash())
        console.log('SLP wallet address at index 0:', address)
        vm.$store.commit('global/updateWallet', {
          type: 'slp',
          walletHash: wallet.BCH.walletHash,
          lastAddress: address,
          lastWalletIndex: 0
        })
        vm.steps += 1
      })

      wallet.SLP.getXPubKey().then(function (xpub) {
        console.log('SLP wallet xpub key:', xpub)
        vm.$store.commit('global/updateXPubKey', {
          type: 'slp',
          xPubKey: xpub
        })
        vm.steps += 1
      })
    },
    async generateAddresses () {
      // const seedBuffer = await bchjs.Mnemonic.toSeed(this.mnemonic)
      // const hdNode = bchjs.HDNode.fromSeed(seedBuffer)

      // var addresses = {}

      // const account1 = bchjs.HDNode.derive(hdNode, 0)
      // const account1Pk = account1.keyPair.toWIF()
      // addresses.escrow = {
      //   address: bchjs.Address.toCashAddress(account1.keyPair.getAddress()),
      //   privateKey: this.$aes256.encrypt(account1Pk)
      // }

      // const account2 = bchjs.HDNode.derive(hdNode, 1)
      // const account2Pk = account2.keyPair.toWIF()
      // // const account2Addr = account2.keyPair.address
      // addresses.private = {
      //   address: bchjs.Address.toCashAddress(account2.keyPair.getAddress()),
      //   privateKey: this.$aes256.encrypt(account2Pk)
      // }

      // const vm = this
      // const payload = {
      //   mnemonic_hash: vm.$aes256.encrypt(vm.mnemonic),
      //   first_name: 'Juan',
      //   last_name: 'Dela Cruz',
      //   mobile_number: '09281234567',
      //   user_public_key: bchjs.ECPair.toPublicKey(account1.keyPair).toString('hex'),
      //   hd_wallet_index: 0
      // }
      // vm.$axios.post('/escrow-account/create', payload).then(function (resp) {
      //   addresses.escrow.address = resp.data.aggregate_address
      //   vm.$store.dispatch('global/updateAddresses', addresses)
      // })
    }
  },
  mounted () {
    this.createWallets()
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
