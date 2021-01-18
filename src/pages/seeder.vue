<template>
  <div class="q-pa-md">
    <div class="">
      <q-btn
        icon="home"
        to="/"
      />
    </div>
    <div class="text-center q-mt-lg">
      <div class="text-h6">
        Seeder
      </div>
      <div class="text-subtitle2">
        Set wallet for private address by setting address(cashaddress) and mnemonic
      </div>
      <div class="text-subtitle2">
        For testing purposes only
      </div>
    </div>
    <div class="q-pa-lg">
      <q-form
        @submit="setAddress"
        class="q-gutter-y-md"
      >
        <q-input
          label="Mnemonic"
          type="password"
          v-model="formData.mnemonic"
        />
        <q-input
          label="Address"
          v-model="formData.address"
        />

        <q-input
          label="WIF"
          type="password"
          v-model="formData.wif"
        />

        <div class="q-mt-md">
          <q-btn  
            no-caps
            type="submit"
            label="Update"
          />
        </div>
      </q-form>

      <q-dialog v-model="showSuccessDialog">
        <q-card>
          <q-card-section>
            Success!
          </q-card-section>
        </q-card>
      </q-dialog>
    </div>
  </div>
</template>
<script>
import walletUtils from '../utils/common.js'

const bchjs = walletUtils.getBCHJS(walletUtils.NET_MAINNET)

export default {
  name: 'WalletSetter',

  data () {
    return {
      showSuccessDialog: false,
      formData: {
        mnemonic: '',
        address: '',
        wif: ''
      }
    }
  },

  computed: {
    address () {
      return this.$store.getters['global/address']
    },
    privateKey () {
      this.$store.getters['global/getWIF'](this.address)
    }
  },

  methods: {
    async setAddress() {
      const address = this.formData.address

      const seed = await bchjs.Mnemonic.toSeed(this.formData.mnemonic)
      const hdnode = bchjs.HDNode.fromSeed(seed)
      let privateKey = this.$aes256.encrypt(hdnode.keyPair.toWIF())
      if (this.formData.wif) {
        privateKey = this.$aes256.encrypt(this.formData.wif)
      }

      console.log(address)
      console.log(privateKey)

      this.$store.commit('global/updatePrivateAddress', {
        address,
        privateKey
      })
      this.showSuccessDialog = true
    }
  }
}
</script>