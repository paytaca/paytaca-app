<template>
  <q-pull-to-refresh
    id="app-container"
    :class="[getDarkModeClass(darkMode), `theme-${theme}`]"
    @refresh="getCollectibles"
  >
    <header-nav :title="$t('Collectibles')" backnavpath="/apps">
      <template v-slot:top-right-menu>
        <q-btn
          flat
          round
          dense
          icon="inbox"
          :class="getDarkModeClass(darkMode)"
          @click="showReceiveDialog = true"
        />
      </template>
    </header-nav>
    
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
            tabButtonClass('history'),
            `theme-${theme}`
          ]"
          :style="viewTab === 'history' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
          @click="viewTab = 'history'"
        >
          {{ $t('History') }}
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
      
      <!-- History Tab -->
      <q-tab-panel name="history" class="q-pa-none tab-panel-content">
        <div class="history-tab-content q-pa-md text-center">
          <p class="text-h6" :class="getDarkModeClass(darkMode)">
            {{ $t('CollectiblesHistory', {}, 'Collectibles transaction history coming soon') }}
          </p>
        </div>
      </q-tab-panel>
    </q-tab-panels>
    
    <div style="padding-bottom:60px;"></div>

    <!-- Receive Dialog -->
    <q-dialog v-model="showReceiveDialog" position="bottom">
      <q-card class="receive-dialog-card" :class="[getDarkModeClass(darkMode), `theme-${theme}`]">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-bow" :class="getDarkModeClass(darkMode)">{{ $t('Receive') }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup :class="getDarkModeClass(darkMode)" />
        </q-card-section>

        <q-card-section>
          <!-- BCH Token Type Filter -->
          <div v-if="enableSLP" class="row items-center justify-center q-mb-md">
            <AssetFilter style="float:none" @filterTokens="filterTokens"/>
          </div>
          
          <!-- QR Code Display -->
          <div class="flex flex-center" style="padding-top: 10px;">
            <div class="q-pa-md br-15 justify-center">
              <template v-if="!receivingAddress">
                <!-- Skeleton Loader for QR Code -->
                <q-skeleton
                  type="rect"
                  width="200px"
                  height="200px"
                  :class="getDarkModeClass(darkMode)"
                  style="border-radius: 8px;"
                />
              </template>
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
          <div class="row">
            <div class="col receiving-address-container">
              <template v-if="!receivingAddress">
                <!-- Skeleton Loader for Address -->
                <div class="text-center">
                  <q-skeleton
                    type="text"
                    width="80%"
                    height="24px"
                    :class="getDarkModeClass(darkMode)"
                    style="margin: 0 auto;"
                  />
                </div>
              </template>
              <div v-else class="text-center">
                <div
                  class="text-bow receiving-address"
                  style="letter-spacing: 1px; word-break: break-all; margin-bottom: 8px;"
                  @click="copyAddress(receivingAddress)" 
                  :class="getDarkModeClass(darkMode)"
                >
                  {{ receivingAddress }}
                </div>
                <q-btn
                  outline
                  no-caps
                  class="br-15"
                  color="grey-7"
                  icon="content_copy"
                  padding="xs md"
                  :label="$t('ClickToCopyAddress')"
                  @click="copyAddress(receivingAddress)"
                />
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
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
      receivingAddress: '',
      showReceiveDialog: false
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
    async showReceiveDialog (newVal) {
      if (newVal) {
        await this.getReceivingAddress()
      }
    },
    async selectedNetwork () {
      if (this.showReceiveDialog) {
        await this.getReceivingAddress()
      }
    },
    async bchNftType () {
      if (this.showReceiveDialog) {
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

  #app-container {
    min-height: 100vh;
    
    // Light mode backgrounds
    &.theme-glassmorphic-blue:not(.dark) {
      background: linear-gradient(135deg, rgba(220,236,255,0.4) 0%, rgba(220,236,255,0.2) 100%);
    }
    &.theme-glassmorphic-gold:not(.dark) {
      background: linear-gradient(135deg, rgba(255,246,220,0.4) 0%, rgba(255,246,220,0.2) 100%);
    }
    &.theme-glassmorphic-green:not(.dark) {
      background: linear-gradient(135deg, rgba(220,255,236,0.4) 0%, rgba(220,255,236,0.2) 100%);
    }
    &.theme-glassmorphic-red:not(.dark) {
      background: linear-gradient(135deg, rgba(255,220,228,0.4) 0%, rgba(255,220,228,0.2) 100%);
    }
    
    // Dark mode backgrounds
    &.theme-glassmorphic-blue.dark {
      background: linear-gradient(135deg, rgba(39,55,70,0.6) 0%, rgba(39,55,70,0.3) 100%);
    }
    &.theme-glassmorphic-gold.dark {
      background: linear-gradient(135deg, rgba(70,60,39,0.6) 0%, rgba(70,60,39,0.3) 100%);
    }
    &.theme-glassmorphic-green.dark {
      background: linear-gradient(135deg, rgba(39,70,55,0.6) 0%, rgba(39,70,55,0.3) 100%);
    }
    &.theme-glassmorphic-red.dark {
      background: linear-gradient(135deg, rgba(70,39,49,0.6) 0%, rgba(70,39,49,0.3) 100%);
    }
  }
  
  .tabs-wrapper {
    position: sticky;
    top: 0;
    z-index: 100;
    background: inherit;
    text-align: center;
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
  
  .history-tab-content {
    padding: 40px 16px;
  }

  .receive-dialog-card {
    border-radius: 16px 16px 0 0;
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    min-height: 400px;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    
    // Light mode glassmorphic backgrounds
    &.theme-glassmorphic-blue:not(.dark) {
      background: rgba(220, 236, 255, 0.85);
    }
    &.theme-glassmorphic-gold:not(.dark) {
      background: rgba(255, 246, 220, 0.85);
    }
    &.theme-glassmorphic-green:not(.dark) {
      background: rgba(220, 255, 236, 0.85);
    }
    &.theme-glassmorphic-red:not(.dark) {
      background: rgba(255, 220, 228, 0.85);
    }
    
    // Dark mode glassmorphic backgrounds
    &.theme-glassmorphic-blue.dark {
      background: rgba(39, 55, 70, 0.9);
      border: 1px solid rgba(66, 165, 245, 0.3);
    }
    &.theme-glassmorphic-gold.dark {
      background: rgba(70, 60, 39, 0.9);
      border: 1px solid rgba(255, 167, 38, 0.3);
    }
    &.theme-glassmorphic-green.dark {
      background: rgba(39, 70, 55, 0.9);
      border: 1px solid rgba(76, 175, 80, 0.3);
    }
    &.theme-glassmorphic-red.dark {
      background: rgba(70, 39, 49, 0.9);
      border: 1px solid rgba(245, 66, 112, 0.3);
    }
  }
  
  .receiving-address-container {
    padding: 10px 20px;
    overflow-wrap: break-word;
    .receiving-address {
      letter-spacing: 1px;
      font-size: 16px;
      cursor: pointer;
      
      &:hover {
        opacity: 0.8;
      }
    }
  }
</style>

