<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;padding-top:70px;">
    <header-nav title="Collectibles" backnavpath="/apps" style="position: fixed; top: 0; width: 100%; z-index: 150 !important;"></header-nav>
    <q-icon id="context-menu" size="35px" name="more_vert">
      <q-menu>
        <q-list style="min-width: 100px">
          <q-item clickable v-close-popup>
            <q-item-section @click="showAddress = !showAddress">Show Receiving Address</q-item-section>
          </q-item>
          <q-item clickable v-close-popup>
            <q-item-section @click="getCollectibles()">Refresh List</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-icon>
    <q-tabs
      dense
      active-color="brandblue"
      class="col-12 q-px-lg"
      :value="selectedNetwork"
      @input="changeNetwork"
    >
      <q-tab name="BCH" label="BCH"/>
      <q-tab name="sBCH" label="SEP20"/>
    </q-tabs>
    <q-slide-transition>
      <div v-if="showAddress" @click="copyAddress(receivingAddress)" style="text-align: center; padding-top: 20px;">
        <div style="margin-bottom: 5px;">click to copy</div>
        <qr-code
          :text="receivingAddress"
          style="width: 160px; margin-left: auto; margin-right: auto;"
          color="#253933"
          :size="160"
          error-level="H"
          class="q-mb-sm"
        />
      </div>
    </q-slide-transition>
    <div style="text-align: center;" v-if="showAddress" @click="showAddress = !showAddress">
      <q-btn :icon="showAddress ? 'close' : 'close'" flat round dense />
    </div>
    <SLPCollectibles
      ref="slpCollectibles"
      :wallet="wallet"
      style="margin:auto;"
    />
    <div style="padding-bottom:60px;"></div>
    <footer-menu />
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import { getMnemonic, Wallet } from '../../wallet'
import SLPCollectibles from 'components/collectibles/SLPCollectibles.vue'

export default {
  name: 'app-wallet-info',
  components: { HeaderNav, SLPCollectibles },
  data () {
    return {
      collectibleDetail: {
        show: false,
        collectible: null,
      },
      collectibles: [],
      collectiblesLoaded: false,
      showAddress: false,
      wallet: null
    }
  },
  computed: {
    isSep20() {
      return this.selectedNetwork === 'sBCH'
    },
    selectedNetwork: {
      get () {
        return this.$store.getters['global/network']
      },
      set (value) {
        return this.$store.commit('global/setNetwork', value)
      }
    },
    receivingAddress () {
      if (!this.wallet) return ''

      if (this.isSep20) return this.wallet.sBCH._wallet.address
      return this.$store.getters['global/getAddress']('slp')
    }
  },
  methods: {
    changeNetwork (newNetwork='BCH') {
      const prevNetwork = this.selectedNetwork
      this.selectedNetwork = newNetwork
      if (prevNetwork !== this.selectedNetwork) {
        this.getCollectibles()
      }
    },
    getCollectibles () {
      this.$refs.slpCollectibles.fetchCollectibles()
    },
    copyAddress (address) {
      this.$copyText(address)
      this.$q.notify({
        message: 'Copied address',
        timeout: 800
      })
    }
  },
  mounted () {
    const vm = this
    getMnemonic().then(function (mnemonic) {
      vm.wallet = new Wallet(mnemonic)
      vm.getCollectibles()
    })
  }
}
</script>

<style scoped>
#app {
  padding: 10px;
  overflow-y: auto;
  z-index: -10 !important;
}

.collectible-card {
  width: 100%;
  max-width: 130px;
}

#context-menu {
  position: fixed;
  top: 16px;
  right: 10px;
  z-index: 150 !important;
  color: #3b7bf6;
}
</style>
