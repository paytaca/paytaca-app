<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="getCollectibles"
  >
    <header-nav :title="$t('Collectibles')" backnavpath="/apps" />
    <q-icon id="context-menu" size="35px" name="more_vert" :style="{ 'margin-top': $q.platform.is.ios ? '42px' : '0px'}" class="text-pt-primary1">
      <q-menu>
        <q-list class="pt-card" :class="getDarkModeClass(darkMode)" style="min-width: 100px">
          <q-item clickable v-close-popup>
            <q-item-section
              class="pt-label"
              :class="getDarkModeClass(darkMode)"
              @click="showAddress = !showAddress"
            >
              {{ $t('ShowReceivingAddress') }}
            </q-item-section>
          </q-item>
          <q-item clickable v-close-popup>
            <q-item-section
              class="pt-label"
              :class="getDarkModeClass(darkMode)"
              @click="getCollectibles()"
            >
              {{ $t('RefreshList') }}
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-icon>
    <q-tabs
      dense
      v-if="enableSmartBCH"
      active-color="brandblue"
      
      class="col-12 q-px-lg"
      :style="{ 'margin-top': $q.platform.is.ios ? '45px' : '0px'}"
      :modelValue="selectedNetwork"
      @update:modelValue="changeNetwork"
    >
      <q-tab
        class="network-selection-tab"
        :class="getDarkModeClass(darkMode)"
        name="BCH"
        label="BCH"
      />
      <q-tab
        class="network-selection-tab"
        :class="getDarkModeClass(darkMode)"
        name="sBCH"
        label="SmartBCH"
      />
    </q-tabs>
    <div v-if="showAddress" class="flex flex-center" style="padding-top: 30px;">
      <div class="q-pa-md br-15 justify-center">
        <qr-code
          :text="receivingAddress"
          :size="200"
          icon="/ct-logo.png"
          @click="copyAddress(receivingAddress)"
        />
      </div>
    </div>
    <div v-if="showAddress" class="row">
      <div class="col receiving-address-container">
        <span class="qr-code-text text-weight-light text-center">
          <div
            class="text-nowrap text-bow receiving-address"
            @click="copyAddress(receivingAddress)" :class="getDarkModeClass(darkMode)"
          >
            {{ receivingAddress }}
          </div>
        </span>
      </div>
    </div>
    <div class="text-center text-bow" :class="getDarkModeClass(darkMode)" v-if="showAddress" @click="showAddress = !showAddress">
      <q-btn icon="close" flat round dense class="close-button" />
    </div>
    <q-tab-panels v-if="!showAddress" v-model="selectedNetwork" keep-alive style="background:inherit;" class="collectibles-panel">
      <q-tab-panel name="BCH">
        <div class="row items-center justify-end">
          <AssetFilter style="float:none" @filterTokens="filterTokens"/>
        </div>
        <keep-alive>
          <CashTokensNFTs
            v-if="bchNftType === 'ct'"
            ref="cashtokenNFTs"
            :wallet="wallet"
          />
          <SLPCollectibles
            v-else
            ref="slpCollectibles"
            :wallet="wallet"
            style="margin:auto;"
          />
        </keep-alive>
      </q-tab-panel>
      <q-tab-panel name="sBCH">
        <AddERC721AssetFormDialog v-model="showAddERC721Form" :darkMode="darkMode" :currentCountry="currentCountry" />
        <ERC721AssetDetailDialog v-model="erc721AssetDetailDialog.show" :darkMode="darkMode" :asset="erc721AssetDetailDialog.asset"/>
        <div class="row items-start justify-end q-px-sm">
          <q-btn
            flat
            rounded
            padding="sm"
            size="sm"
            icon="add"
            class="q-mx-sm button button-icon"
            :class="getDarkModeClass(darkMode)"
            @click="showAddERC721Form = true"
          />
          <q-btn
            flat
            rounded
            padding="sm"
            size="sm"
            icon="app_registration"
            class="q-mx-sm button button-icon"
            :class="getDarkModeClass(darkMode)"
            @click="toggleManageAssets"
          />
        </div>
        <p v-if="erc721Assets && erc721Assets.length === 0" style="color: gray;" class="q-py-md text-center text-h6">
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
                    class="button button-icon"
                    :class="getDarkModeClass(darkMode)"
                    @click.stop="showERC721Asset(erc721Assets[selectedERC721AssetIndex])"
                  />
                  <div class="text-subtitle1 pt-label" :class="getDarkModeClass(darkMode)">
                    {{ erc721Assets[selectedERC721AssetIndex].name }}
                  </div>
                </template>
                <div v-else class="pt-label" :class="getDarkModeClass(darkMode)">
                  {{ $t('SelectCollection') }}
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
                  class="button button-icon"
                  :class="getDarkModeClass(darkMode)"
                  @click.stop="confirmRemoveERC721Asset(asset)"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">{{ asset.name }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  flat
                  rounded
                  padding="sm"
                  icon="info"
                  class="button button-icon"
                  :class="getDarkModeClass(darkMode)"
                  @click.stop="showERC721Asset(asset)"
                />
              </q-item-section>
            </q-item>
          </q-expansion-item>
          <q-separator spaced inset/>
        </template>
        <q-tab-panels v-model="selectedERC721AssetIndex" keep-alive style="background:inherit;" class="collectibles-panel">
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
  </q-pull-to-refresh>
</template>

<script>
import { markRaw } from '@vue/reactivity'
import HeaderNav from '../../components/header-nav'
import { getMnemonic, Wallet } from '../../wallet'
import AddERC721AssetFormDialog from 'components/collectibles/AddERC721AssetFormDialog.vue'
import ERC721Collectibles from 'src/components/collectibles/ERC721Collectibles.vue'
import ERC721AssetDetailDialog from 'components/collectibles/ERC721AssetDetailDialog.vue'
import SLPCollectibles from 'components/collectibles/SLPCollectibles.vue'
import CashTokensNFTs from 'src/components/collectibles/CashTokensNFTs.vue'
import AssetFilter from 'src/components/AssetFilter.vue'
import { convertCashAddress } from 'src/wallet/chipnet'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'app-wallet-info',
  components: {
    HeaderNav,
    AddERC721AssetFormDialog,
    ERC721Collectibles,
    ERC721AssetDetailDialog,
    SLPCollectibles,
    CashTokensNFTs,
    AssetFilter
  },
  data () {
    return {
      collectibleDetail: {
        show: false,
        collectible: null
      },
      bchNftType: 'ct', // slp | ct
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
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    currentCountry () {
      return this.$store.getters['global/country'].code
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    enableSmartBCH () {
      return this.$store.getters['global/enableSmartBCH']
    },
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
      if (this.bchNftType === 'ct') {
        const bchAddress = this.$store.getters['global/getAddress']('bch')
        return convertCashAddress(bchAddress, false, true)
      }
      return this.$store.getters['global/getAddress']('slp')
    }
  },
  methods: {
    getDarkModeClass,
    filterTokens (isCashToken) {
      this.bchNftType = isCashToken ? 'ct' : 'slp'
    },
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
      const message = this.$t(
        'RemoveAssetPrompt',
        { assetName: asset.name },
        `Remove asset ${asset.name}. Are you sure?`
      )
      let dialogStyleClass = `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
      dialogStyleClass += ' br-15'

      this.$q.dialog({
        title: title,
        message: message,
        persistent: true,
        seamless: true,
        class: dialogStyleClass,
        ok: {
          rounded: true,
          label: this.$t('OK')
        },
        cancel: {
          rounded: true,
          flat: true,
          label: this.$t('Cancel')
        }
      }).onOk(() => {
        const commitName = 'sep20/removeNftAsset'
        this.$store.commit(commitName, asset.address)
      })
    },
    getCollectibles (done=() => {}) {
      try {
        if (this?.$refs?.slpCollectibles?.fetchCollectibles?.call) {
          this.$refs.slpCollectibles.fetchCollectibles()
        }

        if (this?.$refs?.cashtokenNFTs?.refresh?.call) {
          this.$refs.cashtokenNFTs.refresh()
        }

        if (this?.$refs?.erc721Collectibles?.fetchCollectibles?.call) {
          this.$refs.erc721Collectibles.fetchCollectibles()
        } else if (Array.isArray(this?.$refs?.erc721Collectibles)) {
          this.$refs.erc721Collectibles.forEach(component => {
            if (component?.fetchCollectibles?.call) component.fetchCollectibles()
          })
        }
      } finally {
        done()
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
      getMnemonic(vm.$store.getters['global/getWalletIndex']).then(function (mnemonic) {
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

<style lang="scss" scoped>
  #app {
    padding: 10px;
    overflow-y: auto;
    z-index: -10 !important;
  }
  #context-menu {
    position: fixed;
    top: 16px;
    right: 10px;
    z-index: 150 !important;
  }
  .receiving-address-container {
    padding: 20px 40px;
    overflow-wrap: break-word;
    .receiving-address {
      letter-spacing: 1px;
      font-size: 18px;
    }
  }
</style>
