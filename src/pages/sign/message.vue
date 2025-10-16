<template>
  <div id="app-container" class="" :class="{'pt-card-3': darkMode}">
    <header-nav
      backnavpath="/"
      :title="$t('Sign Message')"
    ></header-nav>
    <div class="text-white">
      <div class="q-pa-md" style="padding-top: 70px;">
        <div class="col-12 q-mt-sm items-center">
          <span v-if="userPrompt" class="text-lg text-bold span-text-center" v-text="userPrompt"></span>
          <p class="text-lg">{{$t('Signer')}}:</p><textarea readonly class="ro-text" v-text="connectedAddress.split(':')[1]"></textarea>
          <p class="text-lg">{{$t('Origin')}}:</p><textarea readonly class="ro-text" v-text="origin"></textarea>
          <p class="text-lg">{{$t('Message')}}:</p><textarea readonly class="ro-text" v-text="message"></textarea>
        </div>
      </div>
      <hr />
      <div v-if="false" class="row q-pa-md">
        <textarea readonly class="ro-text signed" v-text="signedMessage"></textarea>
      </div>
      <div class="q-mt-lg text-center row justify-evenly">
        <q-btn size="lg" class="btn text-white" :label="$t('Cancel')" @click="cancel" />
        <q-btn size="lg" class="btn text-white" :label="$t('Sign')" @click="executeSecurityChecking" />
      </div>
    </div>\

    <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="onPinDialogCompletion" />
  </div>
</template>

<script>
import { markRaw } from '@vue/reactivity'
import { getMnemonic, Wallet } from '../../wallet'
import HeaderNav from '../../components/header-nav'
import { secp256k1, sha256, binToBase64, utf8ToBin, hexToBin, decodePrivateKeyWif } from "@bitauth/libauth"
import pinDialog from '../../components/pin'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'


export default {
  name: 'sign-message',
  components: {
    HeaderNav,
    pinDialog,
  },
  props: {
    origin: {
      type: String,
      required: true
    },
    assetId: {
      type: String,
      required: false,
      default: "bch",
    },
    message: {
      type: String,
      required: true
    },
    userPrompt: {
      type: String,
      required: false,
    },
    eventResponseKey: {
      type: String,
      required: true
    },
  },
  data () {
    return {
      asset: {},
      wallet: null,

      darkMode: this.$store.getters['darkmode/getStatus'],
      connectedAddress: '',
      connectedAddressIndex: '0/0',
      signedMessage: '',
      sentResponse: false,
      pinDialogAction: '',
    }
  },

  computed: {
  },

  watch: {
  },

  methods: {
    async executeSecurityChecking () {
      try {
        const vm = this
        setTimeout(() => {
          vm.pinDialogAction = 'VERIFY'
        }, 500)
      } catch (err) {
        console.error(err)
      }
    },

    async onPinDialogCompletion (action) {
      this.pinDialogAction = "";
      if (action === "proceed") {
        this.sign();
      }
    },

    async sign () {
      this.signedMessage = this.assetId === "sbch" ?
        await this.signSmartBCH() :
        await this.signBCH()
      this.$q.bex.send('background.paytaca.signMessageResponse', {signedMessage: this.signedMessage, eventResponseKey: this.eventResponseKey})
      this.sentResponse = true
      window.close()
    },

    async signBCH () {
      const message_magic = (str) => {
        const length = utf8ToBin(str).length.toString(16)
        let payload = `\x18Bitcoin Signed Message:\n`
        return new Uint8Array([
          ...utf8ToBin(payload),
          ...hexToBin(length),
          ...utf8ToBin(str),
        ])
      }

      const hash_message = (message) => {
        const h = sha256.hash
        return h(h(message_magic(message)))
      }

      let messageHash = hash_message(this.message)
      const privateKeyWif = await this.wallet.BCH.getPrivateKey(this.connectedAddressIndex)
      const decodeResult = decodePrivateKeyWif(privateKeyWif)
      const privateKey = decodeResult.privateKey
      let rs = secp256k1.signMessageHashRecoverableCompact(
        privateKey,
        messageHash
      )

      let electronEncoding = new Uint8Array([
        ...[31 + rs.recoveryId],
        ...rs.signature,
      ])
      return binToBase64(electronEncoding)
    },

    async signSmartBCH () {
      return this.wallet.sBCH._wallet.signMessage(this.message)
    },

    async cancel () {
      this.$q.bex.send('background.paytaca.signMessageResponse', {signedMessage: undefined, eventResponseKey: this.eventResponseKey})
      this.sentResponse = true
      window.close()
    },
  },

  async mounted () {
    // use the currently selected address as signer
    const walletInfo = this.$store.getters['global/getWallet'](this.assetId)
    const { connectedAddress, connectedAddressIndex } = walletInfo
    this.connectedAddress = connectedAddress;
    this.connectedAddressIndex = connectedAddressIndex;
    // Load wallets
    const mnemonic = await getMnemonic(this.$store.getters['global/getWalletIndex'])
    const network = {bch: "BCH", slp: "BCH", sbch: "sBCH"}[this.assetId]
    const wallet = new Wallet(mnemonic, network)
    this.wallet = markRaw(wallet)
    if (this.assetId === 'sbch') this.wallet.sBCH.getOrInitWallet()
  },
}
</script>

<style lang="scss">
  .ro-text {
    width: 100%;
    overflow-wrap: anywhere;
    border-color: transparent;
    background-color: transparent;
    resize: none;
  }
  .signed {
    height: 80px;
  }
  .text-sm {
    font-size: 12px;
  }
  .text-lg {
    font-size: 20px;
  }
  .text-bold {
    font-weight: 400;
  }
  .span-text-center {
    justify-content: center;
    display: flex;
    width: 100%;
    text-align: center;
  }
  .btn {
    background-image: linear-gradient(to right bottom, #3b7bf6, #3681e8, #318bda, #2c95cc, #279fbe);
    color: white;
  }
  .btn-dark {
    background-image: linear-gradient(to right bottom, #204589, #1d5479, #1a6369, #177159, #147f49);
    color: white;
  }
</style>
