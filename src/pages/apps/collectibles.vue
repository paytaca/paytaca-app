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
      <q-tab name="sBCH" label="SmartBCH"/>
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
        <AddERC721AssetFormDialog v-model="showAddERC721Form"/>
        <ERC721AssetDetailDialog v-model="erc721AssetDetailDialog.show" :asset="erc721AssetDetailDialog.asset"/>
        <div class="row items-start justify-end q-px-sm">
          <q-btn
            flat
            rounded
            padding="sm"
            size="sm"
            icon="add"
            style="color: #3B7BF6;"
            class="q-mx-sm"
            @click="showAddERC721Form = true"
          />
          <q-btn
            flat
            rounded
            padding="sm"
            size="sm"
            icon="app_registration"
            style="color: #3B7BF6;"
            class="q-mx-sm"
            @click="toggleManageAssets"
          />
        </div>
        <p
          v-if="erc721Assets && erc721Assets.length === 0"
          style="font-size: 20px; color: gray; text-align: center;"
          class="q-py-md"
        >
          Asset list empty
        </p>
        <template v-else>
          <q-expansion-item v-model="selectERC721AssetExpanded" dense dense-toggle>
            <template v-slot:header>
              <div class="row no-wrap items-center q-space q-pl-md" style="min-height:40px">
                <template v-if="erc721Assets[selectedERC721AssetIndex]">
                  <q-btn
                    flat
                    rounded
                    padding="sm"
                    icon="info"
                    style="color: #3B7BF6;"
                    @click.stop="showERC721Asset(erc721Assets[selectedERC721AssetIndex])"
                  />
                  <div class="text-subtitle1">{{ erc721Assets[selectedERC721AssetIndex].name }}</div>
                </template>
                <div v-else class="text-grey">
                  Select Collection
                </div>
              </div>
            </template>

            <q-item
              v-for="(asset, index) in erc721Assets"
              :key="index"
              clickable
              :active="index === selectedERC721AssetIndex"
              @click="
                selectedERC721AssetIndex = index
                selectERC721AssetExpanded = false
              "
            >
              <q-item-section side>
                <q-btn
                  v-if="enableManageAssets"
                  flat
                  rounded
                  padding="sm"
                  icon="delete"
                  style="color: #3B7BF6;"
                  @click.stop="confirmRemoveERC721Asset(asset)"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ asset.name }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  flat
                  rounded
                  padding="sm"
                  icon="info"
                  style="color: #3B7BF6;"
                  @click.stop="showERC721Asset(asset)"
                />
              </q-item-section>
            </q-item>
          </q-expansion-item>
          <q-separator spaced inset/>
        </template>
        <q-tab-panels v-model="selectedERC721AssetIndex" keep-alive style="background:inherit;">
          <q-tab-panel
            v-for="(asset, index) in erc721Assets"
            :key="index"
            :name="index"
            class="q-pa-none"
          >
            <ERC721Collectibles
              ref='erc721Collectibles'
              :contract-address="asset.address"
              :wallet="wallet"
            />
          </q-tab-panel>
        </q-tab-panels>
      </q-tab-panel>
    </q-tab-panels>
    <div style="padding-bottom:60px;"></div>
    <footer-menu />
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import { getMnemonic, Wallet } from '../../wallet'
import AddERC721AssetFormDialog from 'components/collectibles/AddERC721AssetFormDialog.vue'
import ERC721Collectibles from 'src/components/collectibles/ERC721Collectibles.vue'
import ERC721AssetDetailDialog from 'components/collectibles/ERC721AssetDetailDialog.vue'
import SLPCollectibles from 'components/collectibles/SLPCollectibles.vue'

export default {
  name: 'app-wallet-info',
  components: { HeaderNav, AddERC721AssetFormDialog, ERC721Collectibles, ERC721AssetDetailDialog, SLPCollectibles },
  data () {
    return {
      collectibleDetail: {
        show: false,
        collectible: null
      },
      enableManageAssets: false,
      showAddERC721Form: false,
      selectERC721AssetExpanded: false,
      erc721AssetDetailDialog: {
        show: false,
        asset: null
      },
      selectedERC721AssetIndex: -1,
      showAddress: false,
      wallet: null
    }
  },
  computed: {
    isSep20 () {
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
    changeNetwork (newNetwork = 'BCH') {
      this.selectedNetwork = newNetwork
    },
    toggleManageAssets () {
      this.enableManageAssets = !Boolean(this.enableManageAssets)
      this.selectERC721AssetExpanded = this.enableManageAssets
    },
    showERC721Asset (asset) {
      this.erc721AssetDetailDialog.asset = asset
      this.erc721AssetDetailDialog.show = true
    },
    confirmRemoveERC721Asset (asset) {
      const title = 'Remove asset'
      const message = 'Remove asset "' + asset.name + '". Are you sure?'
      this.$q.dialog({
        title: title,
        message: message,
        cancel: true,
        persistent: true
      }).onOk(() => {
        console.log('removing asset', asset)
        const commitName = 'sep20/removeNftAsset'
        this.$store.commit(commitName, asset.address)
      })
    },
    getCollectibles () {
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
    loadWallet () {
      const vm = this
      getMnemonic().then(function (mnemonic) {
        const wallet = new Wallet(mnemonic)
        wallet.sBCH.getOrInitWallet()
          .then(() => {
            vm.wallet = wallet
          })
      })
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
