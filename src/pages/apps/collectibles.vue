<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="getCollectibles"
  >
    <header-nav :title="$t('Collectibles')" backnavpath="/apps" />
    
    <!-- Main Tabs -->
    <div class="tabs-wrapper q-mt-sm q-mb-sm">
      <div
        class="collectibles-tabs q-pa-xs"
        :class="getDarkModeClass(darkMode)"
      >
        <button
          class="collectibles-tab"
          :class="[
            darkMode ? 'dark' : '',
            tabButtonClass('gallery'),
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
            tabButtonClass('receive'),
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
            <!-- SmartBCH support has been removed -->
            <div class="q-pa-lg text-center">
              <p class="text-h6" :class="getDarkModeClass(darkMode)">
                {{ $t('SmartBCHDeprecated', {}, 'SmartBCH is no longer supported') }}
              </p>
            </div>
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
    tabButtonClass(tabName) {
      return {
        'active-theme-btn': this.viewTab === tabName
      }
    },
    filterTokens (isCashToken) {
      this.bchNftType = isCashToken ? 'ct' : 'slp'
    },
    changeNetwork (newNetwork = 'BCH') {
      this.selectedNetwork = newNetwork
    },
    getCollectibles (done=() => {}) {
      try {
        if (this?.$refs?.slpCollectibles?.fetchCollectibles?.call) {
          this.$refs.slpCollectibles.fetchCollectibles()
        }

        if (this?.$refs?.cashtokenNFTs?.refresh?.call) {
          this.$refs.cashtokenNFTs.refresh()
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
    display: inline-flex;
    gap: clamp(4px, 1.5vw, 8px);
    background-color: rgb(242, 243, 252);
    border-radius: 24px;
    padding: 4px;
    max-width: 100%;
    box-sizing: border-box;

    &.dark {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }

  .collectibles-tab {
    min-width: clamp(90px, 25vw, 120px);
    height: 40px;
    border-radius: 20px;
    border: none;
    color: #4C4F4F;
    background-color: transparent;
    outline: 0;
    cursor: pointer;
    transition: all 0.3s;
    font-weight: 500;
    font-size: clamp(12px, 3vw, 14px);
    padding: 0 clamp(12px, 4vw, 20px);
    flex: 1 1 auto;

    &:hover:not(.active-theme-btn) {
      background-color: rgba(0, 0, 0, 0.05);

      &.dark {
        background-color: rgba(255, 255, 255, 0.15);
      }
    }

    &.dark {
      color: rgba(255, 255, 255, 0.8);
    }
  }

  // Theme-based active button styles
  .collectibles-tab.active-theme-btn {
    color: #fff !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .collectibles-tab.active-theme-btn.theme-glassmorphic-blue {
    background-color: #42a5f5 !important;
  }

  .collectibles-tab.active-theme-btn.theme-glassmorphic-gold {
    background-color: #ffa726 !important;
  }

  .collectibles-tab.active-theme-btn.theme-glassmorphic-green {
    background-color: #4caf50 !important;
  }

  .collectibles-tab.active-theme-btn.theme-glassmorphic-red {
    background-color: #f54270 !important;
  }

  // Dark mode active button
  .collectibles-tab.active-theme-btn.dark {
    color: #fff !important;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  }

  // Active button hover effects - slightly darken
  .collectibles-tab.active-theme-btn.theme-glassmorphic-blue:hover {
    background-color: #1e88e5 !important;
  }

  .collectibles-tab.active-theme-btn.theme-glassmorphic-gold:hover {
    background-color: #fb8c00 !important;
  }

  .collectibles-tab.active-theme-btn.theme-glassmorphic-green:hover {
    background-color: #43a047 !important;
  }

  .collectibles-tab.active-theme-btn.theme-glassmorphic-red:hover {
    background-color: #e91e63 !important;
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

