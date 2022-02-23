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
    <q-tab-panels v-model="selectedNetwork" keep-alive style="background:inherit;">
      <q-tab-panel name="BCH">
        <SLPCollectibles
          ref="slpCollectibles"
          :wallet="wallet"
          style="margin:auto;"
        />
      </q-tab-panel>
      <q-tab-panel name="sBCH">
        <div v-for="(asset, index) in erc721Assets" :key="index">
          <q-expansion-item :label="asset.name">
            <ERC721Collectibles
              ref='erc721Collectibles'
              :contract-address="asset.address"
              :wallet="wallet"
            />
          </q-expansion-item>
          <q-separator/>
        </div>
      </q-tab-panel>
    </q-tab-panels>
    <div style="padding-bottom:60px;"></div>
    <footer-menu />
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import { getMnemonic, Wallet } from '../../wallet'
import ERC721Collectibles from 'src/components/collectibles/ERC721Collectibles.vue'
import SLPCollectibles from 'components/collectibles/SLPCollectibles.vue'

export default {
  name: 'app-wallet-info',
  components: { HeaderNav, ERC721Collectibles, SLPCollectibles },
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
    isTestnet() {
      return this.$store.getters['global/isTestnet']
    },
    isSep20() {
      return this.selectedNetwork === 'sBCH'
    },
    erc721Assets () {
      return this.$store.getters['sep20/getNftAssets']
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
      this.selectedNetwork = newNetwork
    },
    getCollectibles() {
      if (this?.$refs?.slpCollectibles?.fetchCollectibles?.call) {
        this.$refs.slpCollectibles.fetchCollectibles()
      }

      if (this?.$refs?.erc721Collectibles?.fetchCollectibles?.call) {
        this.$refs.erc721Collectibles.fetchCollectibles()
      } else if (Array.isArray(this?.$refs?.erc721Collectibles)) {
        this.$refs.erc721Collectibles.forEach(component => {
          if (component?.fetchCollectibles?.call) component.fetchCollectibles()
        })
      }
    },
    copyAddress (address) {
      this.$copyText(address)
      this.$q.notify({
        message: 'Copied address',
        timeout: 800
      })
    },
    loadWallet() {
      const vm = this
      getMnemonic().then(function (mnemonic) {
        vm.wallet = new Wallet(mnemonic, this.isTestnet)
      })
    }
  },
  watch: {
    isTestnet() {
      if (!this.wallet) return this.loadWallet()

      if (Boolean(this.wallet._testnet) !== Boolean(this.isTestnet)) {
        this.wallet.setTestnet(this.isTestnet)
        this.getCollectibles()
      }
    }
  },
  mounted () {
    this.loadWallet()
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
