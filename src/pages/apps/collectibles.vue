<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="getCollectibles"
  >
    <header-nav :title="$t('Collectibles')" backnavpath="/apps" />
    
    <!-- Main Tabs -->
    <div class="tabs-wrapper q-mx-md q-mt-sm q-mb-sm">
      <div class="collectibles-tabs q-px-sm q-py-xs" :class="getDarkModeClass(darkMode)">
        <button
          class="collectibles-tab"
          :class="[
            darkMode ? 'dark' : '',
            viewTab === 'gallery' ? 'active' : '',
            `theme-${theme}`
          ]"
          :style="viewTab === 'gallery' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
          @click="viewTab = 'gallery'"
        >
          {{ $t('Gallery') }}
        </button>
        <button
          class="collectibles-tab"
          :class="[
            darkMode ? 'dark' : '',
            viewTab === 'receive' ? 'active' : '',
            `theme-${theme}`
          ]"
          :style="viewTab === 'receive' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
          @click="viewTab = 'receive'"
        >
          {{ $t('Receive') }}
        </button>
      </div>
    </div>

    <!-- Tab Panels -->
    <q-tab-panels
      animated
      v-model="viewTab"
      class="text-bow tab-panels-wrapper"
      :class="getDarkModeClass(darkMode)"
    >
      <!-- Gallery Tab -->
      <q-tab-panel name="gallery" class="q-pa-none tab-panel-content">
        <!-- Network Tabs for Gallery -->
        <q-tabs
          dense
          v-if="enableSmartBCH"
          active-color="brandblue"
          class="col-12 q-px-lg"
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
        <q-tab-panels v-model="selectedNetwork" keep-alive style="background:inherit;" class="collectibles-panel">
          <q-tab-panel name="BCH">
            <div v-if="enableSLP" class="row items-center justify-end">
              <AssetFilter style="float:none" @filterTokens="filterTokens"/>
            </div>
            <keep-alive>
              <CashTokensNFTs
                v-if="bchNftType === 'ct' || !enableSLP"
                ref="cashtokenNFTs"
                :wallet="wallet"
              />
              <SLPCollectibles
                v-else-if="enableSLP"
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
      </q-tab-panel>
      
      <!-- Receive Tab -->
      <q-tab-panel name="receive" class="q-pa-none tab-panel-content">
        <div class="receive-tab-content">
          <!-- Network Selector -->
          <q-tabs
            dense
            v-if="enableSmartBCH"
            active-color="brandblue"
            class="col-12 q-px-lg q-mb-md"
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
          
          <!-- BCH Token Type Filter -->
          <div v-if="selectedNetwork === 'BCH' && enableSLP" class="row items-center justify-center q-mb-md">
            <AssetFilter style="float:none" @filterTokens="filterTokens"/>
          </div>
          
          <!-- QR Code Display -->
          <div class="flex flex-center" style="padding-top: 30px;">
            <div class="q-pa-md br-15 justify-center">
              <q-spinner v-if="!receivingAddress" color="primary" size="50px" />
              <qr-code
                v-else
                :text="receivingAddress"
                :size="200"
                icon="/ct-logo.png"
                @click="copyAddress(receivingAddress)"
              />
            </div>
          </div>
          
          <!-- Address Display -->
          <div v-if="receivingAddress" class="row">
            <div class="col receiving-address-container">
              <span class="qr-code-text text-weight-light text-center">
                <div
                  class="text-nowrap text-bow receiving-address"
                  @click="copyAddress(receivingAddress)" 
                  :class="getDarkModeClass(darkMode)"
                >
                  {{ receivingAddress }}
                </div>
              </span>
            </div>
          </div>
        </div>
      </q-tab-panel>
    </q-tab-panels>
    
    <div style="padding-bottom:60px;"></div>
  </q-pull-to-refresh>
</template>

<script>
import { markRaw } from '@vue/reactivity'
import HeaderNav from '../../components/header-nav'
import { getMnemonic, Wallet } from '../../wallet'
import SLPCollectibles from 'components/collectibles/SLPCollectibles.vue'
import CashTokensNFTs from 'src/components/collectibles/CashTokensNFTs.vue'
import AssetFilter from 'src/components/AssetFilter.vue'
import { convertCashAddress } from 'src/wallet/chipnet'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  generateReceivingAddress,
  getDerivationPathForWalletType
} from 'src/utils/address-generation-utils.js'

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
      viewTab: 'gallery',
      wallet: null,
      receivingAddress: ''
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
    enableSLP () {
      return this.$store.getters['global/enableSLP']
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
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    theme () {
      return this.$store.getters['global/theme']
    }
  },
  methods: {
    getDarkModeClass,
    getThemeColor() {
      const themeColors = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-red': '#f54270'
      }
      return themeColors[this.theme] || themeColors['glassmorphic-blue']
    },
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
    },
    async getReceivingAddress () {
      // Dynamically generate address like the Receive page
      if (this.isSep20) {
        // For sBCH, generate dynamically
        try {
          const address = await generateSbchAddress({
            walletIndex: this.$store.getters['global/getWalletIndex']
          })
          if (!address) {
            throw new Error('Failed to generate and subscribe sBCH address')
          }
          this.receivingAddress = address
        } catch (error) {
          console.error('Error generating sBCH address:', error)
          this.$q.notify({
            message: this.$t('FailedToGenerateAddress') || 'Failed to generate address. Please try again.',
            color: 'negative',
            icon: 'warning'
          })
          // Don't fallback to store - address generation must succeed
          this.receivingAddress = null
        }
      } else {
        // For BCH/SLP/CashTokens, generate dynamically
        const walletType = this.bchNftType === 'ct' ? 'bch' : 'slp'
        try {
          const addressIndex = this.$store.getters['global/getLastAddressIndex'](walletType)
          // Ensure addressIndex is a valid number (default to 0 if undefined/null)
          const validAddressIndex = typeof addressIndex === 'number' && addressIndex >= 0 ? addressIndex : 0
          let address = await generateReceivingAddress({
            walletIndex: this.$store.getters['global/getWalletIndex'],
            derivationPath: getDerivationPathForWalletType(walletType),
            addressIndex: validAddressIndex,
            isChipnet: this.isChipnet
          })
          
          // Check if subscription failed (returns null)
          if (!address) {
            throw new Error('Failed to subscribe address to watchtower')
          }
          
          // Convert to CashToken format if needed
          if (this.bchNftType === 'ct') {
            address = convertCashAddress(address, this.isChipnet, true)
          }
          
          this.receivingAddress = address
        } catch (error) {
          console.error('Error generating address:', error)
          this.$q.notify({
            message: this.$t('FailedToGenerateAddress') || 'Failed to generate address. Please try again.',
            color: 'negative',
            icon: 'warning'
          })
          // Don't fallback to store - address generation must succeed
          this.receivingAddress = null
        }
      }
    }
  },
  watch: {
    async viewTab (newVal) {
      if (newVal === 'receive') {
        await this.getReceivingAddress()
      }
    },
    async selectedNetwork () {
      if (this.viewTab === 'receive') {
        await this.getReceivingAddress()
      }
    },
    async bchNftType () {
      if (this.viewTab === 'receive') {
        await this.getReceivingAddress()
      }
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
  
  .tabs-wrapper {
    position: sticky;
    top: 0;
    z-index: 100;
    background: inherit;
  }
  
  .collectibles-tabs {
    display: flex;
    gap: 8px;
    background: rgba(0, 0, 0, 0.03);
    border-radius: 12px;
    padding: 4px;
    
    &.dark {
      background: rgba(255, 255, 255, 0.05);
    }
    
    .collectibles-tab {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #666;
      background: transparent;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &.dark {
        color: rgba(255, 255, 255, 0.7);
      }
      
      &:hover:not(.active) {
        background-color: rgba(0, 0, 0, 0.05);
        
        &.dark {
          background-color: rgba(255, 255, 255, 0.08);
        }
      }
      
      &.active {
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        
        &.dark {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        }
      }
    }
  }
  
  .tab-panels-wrapper {
    background: inherit;
  }
  
  .tab-panel-content {
    min-height: 300px;
  }
  
  .receive-tab-content {
    padding: 20px 16px;
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

