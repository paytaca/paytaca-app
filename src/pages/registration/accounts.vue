<template>
  <q-page>
    <div>
      <q-btn @click="createAccount">Create Account</q-btn>
    </div>
  </q-page>
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
      vm.$store.dispatch('global/updateOnboardingStep', 1).then(function () {
        vm.$router.push('/')
      })
    }
  },
  mounted () {
    if (!this.$aes256.getSecretKey()) {
      const secretKey = crypto.randomBytes(16).toString('hex')
      LocalStorage.set('secretkey', secretKey)
    }
  }
}
</script>
