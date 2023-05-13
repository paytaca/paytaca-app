<template>
  <div id="app-container" class="" :class="{'pt-dark': darkMode}">
    <header-nav
      backnavpath="/"
      :title="$t('Connect to Paytaca')"
    ></header-nav>
    <div class="">
      <div class="q-pa-md" style="padding-top: 70px;">
        <div class="col-12 q-mt-lg items-center">
          <p class="text-lg">Origin:</p><textarea readonly class="ro-text" v-text="origin"></textarea>

          <p>Select the addresses to use on this site</p>
          <div v-for="(address, index) in addresses" :key="index">
            <input type="radio" v-model="connectedAddressIndex" :id="address" name="connectedAddressIndex" :value="index">
            <label style="padding-left: 5px" :for="address">{{ address.split(':')[1] }}</label>
          </div>
          <hr />
          <p>Permissions: see address, account balance, activity and suggest transactions to approve</p>
          <p>Only connect with sites you trust.</p>
        </div>
      </div>
      <hr />
      <div class="q-mt-lg text-center row justify-evenly">
        <q-btn size="lg" class="btn text-white" :label="$t('Cancel')" @click="cancel" />
        <q-btn :disable="!addresses.length" size="lg" class="btn text-white" :label="$t('Connect')" @click="connect" />
      </div>
    </div>
  </div>
</template>

<script>
import { markRaw } from '@vue/reactivity'
import { getMnemonic, Wallet } from '../../wallet'
import HeaderNav from '../../components/header-nav'

export default {
  name: 'connect',
  components: {
    HeaderNav
  },
  props: {
    origin: {
      type: String,
      required: true
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
      lastAddressIndex: 0,
      addresses: [],
      assetId: "bch",
      connectedAddressIndex: 0,
    }
  },

  computed: {
  },

  watch: {
  },

  methods: {
    async cancel () {
      this.$q.bex.send('background.paytaca.connectResponse', {origin: this.origin, connected: false, eventResponseKey: this.eventResponseKey})
      window.close()
    },

    async connect () {
      this.$q.bex.send('background.paytaca.connectResponse', {origin: this.origin, connected: true, address: this.addresses[this.connectedAddressIndex], addressIndex: '0/' + this.connectedAddressIndex, eventResponseKey: this.eventResponseKey})
      window.close()
    },
  },

  async mounted () {
    const walletInfo = this.$store.getters['global/getWallet'](this.assetId)
    if (walletInfo) {
      const { lastAddressIndex } = walletInfo
      this.lastAddressIndex = lastAddressIndex
    }

    // Load wallets
    const mnemonic = await getMnemonic()
    const network = {bch: "BCH", slp: "BCH", sbch: "sBCH"}[this.assetId]
    const wallet = new Wallet(mnemonic, network)
    this.wallet = markRaw(wallet)
    if (this.assetId === 'sbch') {
      await this.wallet.sBCH.getOrInitWallet();
      this.addresses = [this.wallet.sBCH._wallet.address]
    } else {
      const addresses = [];
      for (let i = 0; i <= this.lastAddressIndex; i++) {
        addresses.push((await this.wallet.BCH.getAddressSetAt(i)).receiving);
      }
      this.addresses = [...addresses];
    }
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
  #app-container {
    // position: relative !important;
    background-color: #ECF3F3;
    min-height: 100vh;
    flex-direction: column;
    display: flex;
  }
  .connect-tittle {
    color: #3B7BF6;
    font-size: 30px;
    font-weight: 400;
    display: flex;
    justify-content: center;
  }
  .text-sm {
    font-size: 12px;
  }
  .text-lg {
    font-size: 20px;
  }
  .btn {
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
    color: white;
  }
  .btn-dark {
    background-image: linear-gradient(to right bottom, #204589, #35538b, #813c6d, #9c3356, #a5403d);
    color: white;
  }
</style>
