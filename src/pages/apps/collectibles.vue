<template>
  <div
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:70px;"
    :class="{'pt-dark': darkMode}"
  >
    <header-nav title="Collectibles" backnavpath="/apps" style="position: fixed; top: 0; width: 100%; z-index: 150 !important;"></header-nav>
    <q-icon id="context-menu" size="35px" name="more_vert" :style="{ 'margin-top': $q.platform.is.ios ? '30px' : '0px'}">
      <q-menu>
        <q-list :class="{'pt-dark-card': darkMode}" style="min-width: 100px">
          <q-item clickable v-close-popup>
            <q-item-section :class="[darkMode ? 'pt-dark-label' : 'pp-text']" @click="showAddress = !showAddress">Show Receiving Address</q-item-section>
          </q-item>
          <q-item clickable v-close-popup>
            <q-item-section :class="[darkMode ? 'pt-dark-label' : 'pp-text']" @click="getCollectibles()">Refresh List</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-icon>
    <q-tabs
      dense
      active-color="brandblue"
      class="col-12 q-px-lg pp-fcolor"
      :style="{ 'margin-top': $q.platform.is.ios ? '25px' : '0px'}"
      :modelValue="selectedNetwork"
      @update:modelValue="changeNetwork"
    >
      <q-tab :class="{'text-blue-5': darkMode}" name="BCH" label="BCH"/>
      <q-tab :class="{'text-blue-5': darkMode}" name="sBCH" label="SmartBCH"/>
    </q-tabs>
    <div v-if="showAddress" class="flex flex-center" style="padding-top: 30px;">
      <div class="q-pa-md br-15 col-qr-code">
        <qr-code
          :text="receivingAddress"
          style="width: 200px; margin-left: auto; margin-right: auto;"
          color="#253933"
          :size="200"
          error-level="H"
          class="q-mb-sm"
        />
      </div>
    </div>
    <div v-if="showAddress" class="row">
      <div class="col" style="padding: 20px 40px 20px 40px; overflow-wrap: break-word;">
        <span class="qr-code-text text-weight-light text-center">
          <div
            class="text-nowrap"
            style="letter-spacing: 1px; font-size: 18px;"
            @click="copyAddress(receivingAddress)" :class="darkMode ? 'text-white' : 'pp-text'"
          >
            {{ receivingAddress }}
          </div>
        </span>
      </div>
    </div>
    <div style="text-align: center;" :class="darkMode ? 'text-white' : 'text-black'" v-if="showAddress" @click="showAddress = !showAddress">
      <q-btn icon="close" flat round dense />
    </div>
    <q-tab-panels v-if="!showAddress" v-model="selectedNetwork" keep-alive style="background:inherit;">
      <q-tab-panel name="BCH">
        <SLPCollectibles
          ref="slpCollectibles"
          :wallet="wallet"
          style="margin:auto;"
        />
      </q-tab-panel>
      <q-tab-panel name="sBCH">
        <AddERC721AssetFormDialog v-model="showAddERC721Form" :darkMode="darkMode" />
        <ERC721AssetDetailDialog v-model="erc721AssetDetailDialog.show" :darkMode="darkMode" :asset="erc721AssetDetailDialog.asset"/>
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
                  <div class="text-subtitle1" :class="darkMode ? 'pt-dark-label' : 'text-black'">{{ erc721Assets[selectedERC721AssetIndex].name }}</div>
                </template>
                <div v-else class="text-grey" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
                  Select Collection
                </div>
              </div>
            </template>

            <q-item
              v-for="(asset, index) in erc721Assets"
              :key="index"
              clickable
              :active="index === selectedERC721AssetIndex"
              @click="function() {
                selectedERC721AssetIndex = index
                selectERC721AssetExpanded = false
              }"
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
                <q-item-label :class="[darkMode ? 'pt-dark-label' : 'pp-text']">{{ asset.name }}</q-item-label>
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
  </div>
</template>

<script>
import { markRaw } from '@vue/reactivity'
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
      wallet: null,
      darkMode: this.$store.getters['darkmode/getStatus']
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

      if (this.isSep20) return this.$store.getters['global/getAddress']('sbch')
      return this.$store.getters['global/getAddress']('slp')
    }
  },
  methods: {
    changeNetwork (newNetwork = 'BCH') {
      this.selectedNetwork = newNetwork
    },
    toggleManageAssets () {
      this.enableManageAssets = !this.enableManageAssets
      this.selectERC721AssetExpanded = this.enableManageAssets
    },
    showERC721Asset (asset) {
      this.erc721AssetDetailDialog.asset = asset
      this.erc721AssetDetailDialog.show = true
    },
    confirmRemoveERC721Asset (asset) {
      const title = this.$t('RemoveAsset')
      const message = 'Remove asset "' + asset.name + '". Are you sure?'
      let dialogStyleClass = this.darkMode ? 'text-white pt-dark-card' : 'text-black'
      dialogStyleClass += ' br-15'

      this.$q.dialog({
        title: title,
        message: message,
        persistent: true,
        class: dialogStyleClass,
        ok: {
          rounded: true
        },
        cancel: {
          rounded: true,
          flat: true
        }
      }).onOk(() => {
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
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        icon: 'mdi-clipboard-check',
        color: 'blue-9'
      })
    },
    loadWallet () {
      const vm = this
      getMnemonic().then(function (mnemonic) {
        const wallet = new Wallet(mnemonic, vm.selectedNetwork)
        vm.wallet = markRaw(wallet)
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
.pp-text {
  color: #000 !important;
}
.img-bg-white {
  background: white;
  margin-top: -60px;
  height: 100vh;
}
.col-qr-code {
  background: white;
  border: 4px solid #ed5f59;
  padding: 30px;
}
</style>
