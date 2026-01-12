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
            <div v-if="enableSLP && !selectedCategory" class="row items-center justify-end">
              <AssetFilter style="float:none" @filterTokens="filterTokens"/>
            </div>
            <!-- Categories View -->
            <CashTokensNFTs
              v-if="bchNftType === 'ct' && !selectedCategory"
              ref="cashtokenNFTs"
              :wallet="wallet"
              @select-category="handleCategorySelect"
              @open-nft="handleOpenNft"
            />
            <!-- Items View -->
            <div v-else-if="bchNftType === 'ct' && selectedCategory" class="items-view">
              <div class="row items-center q-pa-md">
                <q-btn
                  flat
                  round
                  dense
                  icon="arrow_back"
                  :class="getDarkModeClass(darkMode)"
                  @click="clearCategory"
                  class="q-mr-sm"
                />
                <div class="text-h6" :class="getDarkModeClass(darkMode)">
                  {{ formatCategoryName(selectedCategoryName, selectedCategory) }}
                </div>
              </div>
              <CashTokensNFTGroup
                ref="cashtokenNFTItems"
                :wallet="wallet"
                :category="selectedCategory"
                :dark-mode="darkMode"
                @open-nft="handleOpenNft"
              />
            </div>
            <!-- SLP Collectibles -->
            <SLPCollectibles
              v-else-if="enableSLP"
              ref="slpCollectibles"
              :wallet="wallet"
              style="margin:auto;"
            />
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
        <div 
          ref="historyList"
          class="transaction-list scroll-y"
          @scroll="onHistoryScroll"
          @touchstart="preventPull"
        >
          <template v-if="historyLoaded">
            <div class="transactions-content">
              <TransactionListItem
                v-for="(transaction, index) in historyTransactions"
                :key="'tx-' + index"
                :transaction="transaction"
                :selected-asset="historySelectedAsset"
                :denominationTabSelected="denominationTabSelected"
                @click="() => showTransactionDetails(transaction)"
              />
            </div>
            
            <!-- Loading indicator for infinite scroll -->
            <div v-if="historyAppending && historyTransactions.length > 0" class="loading-more">
              <q-spinner color="primary" size="32px" />
              <p class="loading-text" :class="getDarkModeClass(darkMode)">{{ $t('LoadingMore', {}, 'Loading more') }}...</p>
            </div>
            
            <!-- End of list indicator -->
            <div v-else-if="historyTransactions.length > 0 && !historyHasNext" class="end-of-list">
              <q-icon name="check_circle" size="24px" :class="getDarkModeClass(darkMode)" />
              <p class="end-text" :class="getDarkModeClass(darkMode)">{{ $t('AllTransactionsLoaded', {}, 'All transactions loaded') }}</p>
            </div>
            
            <!-- Empty state -->
            <div v-else-if="historyTransactions.length === 0" class="empty-state">
              <q-img class="no-transaction-img" src="empty-wallet.svg" />
              <p class="empty-state-text text-bow" :class="getDarkModeClass(darkMode)">{{ $t('NoTransactionsToDisplay') }}</p>
            </div>
            
            <!-- Scroll sentinel for intersection observer -->
            <div ref="historyScrollSentinel" class="scroll-sentinel"></div>
          </template>
          <div v-else class="loading-state">
            <TransactionListItemSkeleton v-for="i in 12" :key="i"/>
          </div>
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

    <!-- NFT Detail Dialog -->
    <CashTokenNFTDialog 
      v-model="nftDialog.show" 
      :nft="nftDialog.nft" 
      :dark-mode="darkMode"
    />
  </q-pull-to-refresh>
</template>

<script>
import { markRaw } from '@vue/reactivity'
import HeaderNav from '../../components/header-nav'
import { getMnemonic, Wallet } from '../../wallet'
import SLPCollectibles from 'components/collectibles/SLPCollectibles.vue'
import CashTokensNFTs from 'src/components/collectibles/CashTokensNFTs.vue'
import CashTokensNFTGroup from 'src/components/collectibles/CashTokensNFTGroup.vue'
import CashTokenNFTDialog from 'src/components/collectibles/CashTokenNFTDialog.vue'
import AssetFilter from 'src/components/AssetFilter.vue'
import TransactionListItem from 'src/components/transactions/TransactionListItem.vue'
import TransactionListItemSkeleton from 'src/components/transactions/TransactionListItemSkeleton.vue'
import { convertCashAddress, getWatchtowerApiUrl, getWalletByNetwork } from 'src/wallet/chipnet'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  generateReceivingAddress,
  getDerivationPathForWalletType
} from 'src/utils/address-generation-utils.js'
import { getBcmrBackend, CashNonFungibleToken, convertIpfsUrl } from 'src/wallet/cashtokens'
import axios from 'axios'

export default {
  name: 'app-wallet-info',
  components: {
    HeaderNav,
    SLPCollectibles,
    CashTokensNFTs,
    CashTokensNFTGroup,
    CashTokenNFTDialog,
    AssetFilter,
    TransactionListItem,
    TransactionListItemSkeleton
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
      showReceiveDialog: false,
      selectedCategory: null,
      selectedCategoryName: '',
      nftDialog: {
        show: false,
        nft: null
      },
      historyTransactions: [],
      historyPage: 1,
      historyHasNext: false,
      historyLoaded: false,
      historyAppending: false,
      historyScrollObserver: null,
      denominationTabSelected: 'BCH'
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
    },
    hasCollectibles () {
      if (!this.wallet) return false
      
      // Check CashToken NFTs
      const cashTokenNfts = this.$refs.cashtokenNFTs?.parsedNftGroups
      const hasCashTokenNfts = Array.isArray(cashTokenNfts) && cashTokenNfts.length > 0
      
      // Check SLP Collectibles
      const slpCollectibles = this.$refs.slpCollectibles?.collectibles
      const hasSlpCollectibles = Array.isArray(slpCollectibles) && slpCollectibles.length > 0
      
      return hasCashTokenNfts || hasSlpCollectibles
    },
    historySelectedAsset () {
      return {
        id: 'all',
        symbol: 'NFT',
        name: 'Collectibles',
        logo: null,
        decimals: 0
      }
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
          // After refreshing groups, update category name if needed
          this.$nextTick(() => {
            this.updateCategoryNameFromGroups()
          })
        }

        if (this?.$refs?.cashtokenNFTItems?.fetchNfts?.call) {
          this.$refs.cashtokenNFTItems.fetchNfts()
        }
      } finally {
        done()
      }
    },
    handleCategorySelect (category) {
      this.selectedCategory = category
      // Update URL query parameter
      this.$router.replace({
        query: {
          ...this.$route.query,
          category: category
        }
      })
      // Find category name from the groups
      if (this?.$refs?.cashtokenNFTs?.parsedNftGroups) {
        const group = this.$refs.cashtokenNFTs.parsedNftGroups.find(g => g?.category === category)
        this.selectedCategoryName = group?.parsedMetadata?.name || group?.metadata?.name || category || 'Collection'
      } else {
        this.selectedCategoryName = category || 'Collection'
      }
    },
    async handleCategoryFromUrl (category) {
      // Set NFT type to CashTokens if not already set
      if (this.bchNftType !== 'ct') {
        this.bchNftType = 'ct'
      }
      // Ensure we're on gallery tab
      if (this.viewTab !== 'gallery') {
        this.viewTab = 'gallery'
      }
      // Set the category
      this.selectedCategory = category
      
      // Always fetch from BCMR indexer to get the category name
      try {
        const response = await getBcmrBackend().get(`tokens/${category}/`)
        const metadata = response?.data
        if (metadata) {
          // Extract name from metadata - for groups, name is at top level
          const name = metadata.name
          if (name && name !== category) {
            this.selectedCategoryName = name
          } else {
            // If no name found or name is same as category, fallback to groups if available
            if (this?.$refs?.cashtokenNFTs?.parsedNftGroups) {
              const group = this.$refs.cashtokenNFTs.parsedNftGroups.find(g => g?.category === category)
              if (group) {
                const groupName = group?.parsedMetadata?.name || group?.metadata?.name
                if (groupName && groupName !== category) {
                  this.selectedCategoryName = groupName
                } else {
                  this.selectedCategoryName = category || 'Collection'
                }
              } else {
                this.selectedCategoryName = category || 'Collection'
              }
            } else {
              this.selectedCategoryName = category || 'Collection'
            }
          }
        } else {
          // No metadata found, try groups as fallback
          if (this?.$refs?.cashtokenNFTs?.parsedNftGroups) {
            const group = this.$refs.cashtokenNFTs.parsedNftGroups.find(g => g?.category === category)
            if (group) {
              const groupName = group?.parsedMetadata?.name || group?.metadata?.name
              this.selectedCategoryName = groupName || category || 'Collection'
            } else {
              this.selectedCategoryName = category || 'Collection'
            }
          } else {
            this.selectedCategoryName = category || 'Collection'
          }
        }
      } catch (error) {
        console.error('[Collectibles] Error fetching category metadata from BCMR:', error)
        // Fallback to groups if available
        if (this?.$refs?.cashtokenNFTs?.parsedNftGroups) {
          const group = this.$refs.cashtokenNFTs.parsedNftGroups.find(g => g?.category === category)
          if (group) {
            const groupName = group?.parsedMetadata?.name || group?.metadata?.name
            this.selectedCategoryName = groupName || category || 'Collection'
          } else {
            this.selectedCategoryName = category || 'Collection'
          }
        } else {
          this.selectedCategoryName = category || 'Collection'
        }
      }
    },
    clearCategory () {
      this.selectedCategory = null
      this.selectedCategoryName = ''
      // Remove category from URL query
      const query = { ...this.$route.query }
      delete query.category
      this.$router.replace({ query })
    },
    updateCategoryNameFromGroups () {
      // Update category name from groups if available
      if (this.selectedCategory && this.$refs?.cashtokenNFTs?.parsedNftGroups) {
        const groups = this.$refs.cashtokenNFTs.parsedNftGroups
        if (Array.isArray(groups) && groups.length > 0) {
          const group = groups.find(g => g?.category === this.selectedCategory)
          if (group) {
            const groupName = group?.parsedMetadata?.name || group?.metadata?.name
            // Update name if we have a better one (not just the category ID)
            if (groupName && groupName !== this.selectedCategory) {
              this.selectedCategoryName = groupName
              return true // Successfully updated
            }
          }
        }
      }
      return false // Not updated
    },
    formatCategoryName (name, category) {
      // If name exists and is not the same as category ID, return it as is
      if (name && name !== category) {
        return name
      }
      // If it's a category ID (long hex string), truncate it
      if (category && category.length > 15) {
        return `${category.substring(0, 6)}...${category.substring(category.length - 6)}`
      }
      // Otherwise return the name or category as fallback
      return name || category || 'Collection'
    },
    async loadHistory (page = 1, append = false) {
      if (!this.wallet) return
      
      try {
        if (!append) {
          this.historyLoaded = false
          this.historyTransactions = []
        } else {
          this.historyAppending = true
        }
        
        const walletHash = getWalletByNetwork(this.wallet, 'bch').getWalletHash()
        const baseUrl = getWatchtowerApiUrl(this.isChipnet)
        const url = `${baseUrl}/history/wallet/${walletHash}/`
        
        const params = {
          page: page,
          page_size: 10,
          type: 'all',
          exclude_attr: true,
          all: false,
          token_type: 'nft'
        }
        
        const response = await axios.get(url, { params })
        const transactions = response.data.history || []
        
        if (!Array.isArray(transactions)) {
          this.historyTransactions = []
          this.historyLoaded = true
          this.historyAppending = false
          return
        }
        
        // Enrich transactions with asset information
        const enrichedTransactions = await this.enrichHistoryTransactions(transactions)
        
        if (append) {
          this.historyTransactions.push(...enrichedTransactions)
        } else {
          this.historyTransactions = enrichedTransactions
        }
        
        this.historyPage = page
        this.historyHasNext = response.data?.has_next || false
        this.historyLoaded = true
        this.historyAppending = false
        
        // Setup scroll observer for next page
        this.$nextTick(() => {
          this.setupHistoryScrollObserver()
        })
      } catch (error) {
        console.error('Error loading collectibles history:', error)
        this.historyTransactions = []
        this.historyLoaded = true
        this.historyAppending = false
      }
    },
    async enrichHistoryTransactions (transactions) {
      const bchAsset = {
        id: 'bch',
        symbol: 'BCH',
        name: 'Bitcoin Cash',
        logo: 'bch-logo.png',
        decimals: 8
      }
      
      // Collect unique category/commitment pairs that need metadata fetching
      const metadataKeys = new Set() // Store as "category:commitment" strings
      const transactionMetadataMap = new Map() // Map transaction index to metadata key
      
      transactions.forEach((transaction, index) => {
        const assetId = transaction?.token?.asset_id || 
                        transaction?.asset_id || 
                        transaction?.token_id ||
                        null
        
        if (assetId && typeof assetId === 'string' && assetId.startsWith('ct/')) {
          const tokenId = assetId.split('/')[1]
          const commitment = transaction?.token?.commitment || transaction?.commitment
          
          if (commitment) {
            const metadataKey = `${tokenId}:${commitment}`
            metadataKeys.add(metadataKey)
            transactionMetadataMap.set(index, metadataKey)
          }
        }
      })
      
      // Fetch metadata for all unique category/commitment pairs
      const metadataCache = new Map()
      const fetchPromises = Array.from(metadataKeys).map(async (metadataKey) => {
        const [category, commitment] = metadataKey.split(':')
        try {
          const response = await getBcmrBackend().get(`tokens/${category}/${commitment}/`)
          const metadata = response?.data
          if (metadata) {
            // Create a CashNonFungibleToken instance to properly parse the metadata
            const nftToken = CashNonFungibleToken.parse({
              category: category,
              commitment: commitment,
              metadata: metadata
            })
            
            // Extract collection name (from top-level name field)
            const collectionName = metadata.name || 'NFT'
            
            // Extract type name (from type_metadata.name)
            const typeName = metadata.type_metadata?.name || collectionName
            
            // Extract icon from uris.icon
            let logo = metadata.uris?.icon || null
            
            // Convert IPFS URL if needed
            if (logo && logo.startsWith('ipfs://')) {
              logo = convertIpfsUrl(logo)
            }
            
            // Don't add pinataGatewayToken here - TransactionListItem will add it when displaying
            // This matches the behavior in TransactionList.vue where logos are stored without the token
            
            // Extract symbol (from token.symbol or fallback)
            const symbol = metadata.token?.symbol || metadata.type_metadata?.symbol || 'NFT'
            
            metadataCache.set(metadataKey, {
              collectionName,
              typeName,
              logo,
              symbol
            })
          }
        } catch (error) {
          console.error(`[Collectibles] Error fetching metadata for ${category}/${commitment}:`, error)
        }
      })
      
      await Promise.allSettled(fetchPromises)
      
      // Now enrich transactions with fetched metadata
      const enrichedTransactions = []
      
      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i]
        const enrichedTx = { ...transaction }
        
        const assetId = transaction?.token?.asset_id || 
                        transaction?.asset_id || 
                        transaction?.token_id ||
                        null
        
        if (!assetId || assetId === null || assetId === '' || assetId === 'bch') {
          enrichedTx.asset = bchAsset
        } else if (typeof assetId === 'string' && assetId.startsWith('ct/')) {
          // CashToken NFT transaction
          const tokenId = assetId.split('/')[1]
          const commitment = transaction?.token?.commitment || transaction?.commitment
          
          // Check existing assets first
          const existingAssets = this.$store.getters['assets/getAssets']
          let asset = existingAssets.find(a => a?.id === assetId)
          
          if (asset && asset.logo && asset.symbol && asset.decimals !== undefined) {
            enrichedTx.asset = asset
          } else {
            // Use fetched metadata if available
            const metadataKey = transactionMetadataMap.get(i)
            const metadata = metadataKey ? metadataCache.get(metadataKey) : null
            
            if (metadata) {
              enrichedTx.asset = {
                id: assetId,
                symbol: metadata.symbol,
                name: metadata.typeName, // Use type name for display
                logo: metadata.logo || null,
                decimals: 0,
                category: tokenId,
                commitment: commitment || null,
                collectionName: metadata.collectionName // Store collection name separately if needed
              }
            } else {
              // Fallback if metadata fetch failed or no commitment
              enrichedTx.asset = {
                id: assetId,
                symbol: 'NFT',
                name: 'NFT',
                logo: null,
                decimals: 0,
                category: tokenId
              }
            }
          }
        } else if (typeof assetId === 'string' && assetId.startsWith('slp/')) {
          // SLP NFT transaction
          const tokenId = assetId.split('/')[1]
          const existingAssets = this.$store.getters['assets/getAssets']
          let asset = existingAssets.find(a => a?.id === assetId)
          
          if (asset && asset.logo && asset.symbol && asset.decimals !== undefined) {
            enrichedTx.asset = asset
          } else {
            enrichedTx.asset = {
              id: assetId,
              symbol: 'SLP NFT',
              name: 'SLP NFT',
              logo: null,
              decimals: 0,
              tokenId: tokenId
            }
          }
        } else {
          enrichedTx.asset = bchAsset
        }
        
        enrichedTransactions.push(enrichedTx)
      }
      
      return enrichedTransactions
    },
    setupHistoryScrollObserver () {
      if (this.historyScrollObserver) {
        this.historyScrollObserver.disconnect()
      }
      
      if (!this.$refs.historyScrollSentinel) return
      
      this.historyScrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && this.historyHasNext && !this.historyAppending) {
            this.loadHistory(this.historyPage + 1, true)
          }
        })
      }, {
        root: this.$refs.historyList,
        rootMargin: '100px',
        threshold: 0.1
      })
      
      this.historyScrollObserver.observe(this.$refs.historyScrollSentinel)
    },
    onHistoryScroll () {
      // Handle scroll if needed
    },
    preventPull (e) {
      // Prevent pull-to-refresh when scrolling history
      e.stopPropagation()
    },
    showTransactionDetails (transaction) {
      const txid = transaction?.txid
      if (!txid) return
      
      const assetId = transaction?.asset?.id || 'bch'
      const query = (() => {
        if (assetId === 'bch' || (assetId.startsWith('bch') && !assetId.includes('/'))) {
          return {}
        }
        const parts = assetId.split('/')
        if (parts.length === 2 && (parts[0] === 'ct' || parts[0] === 'slp')) {
          return { category: parts[1] }
        }
        return {}
      })()
      
      this.$router.push({
        name: 'transaction-detail',
        params: { txid },
        query: { ...query, from: 'collectibles' }
      })
    },
    handleOpenNft (nft) {
      // Open NFT dialog
      this.nftDialog.nft = nft
      this.nftDialog.show = true
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
    '$route.query.category' (newCategory) {
      // Handle category parameter from URL
      if (newCategory) {
        this.handleCategoryFromUrl(newCategory)
      } else {
        // Clear category selection if parameter is removed
        this.selectedCategory = null
        this.selectedCategoryName = ''
      }
    },
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
      // Reset category selection when switching NFT types (but preserve URL param)
      if (!this.$route?.query?.category) {
        this.selectedCategory = null
      }
    },
    hasCollectibles (newVal) {
      // When collectibles become available, update category name if needed
      if (newVal && this.selectedCategory) {
        this.$nextTick(() => {
          this.updateCategoryNameFromGroups()
        })
      }
    },
    viewTab (newTab) {
      // Load history when switching to history tab
      if (newTab === 'history' && !this.historyLoaded && this.wallet) {
        this.loadHistory(1, false)
      }
    },
    wallet (newWallet) {
      // Load history if wallet is ready and we're on history tab
      if (newWallet && this.viewTab === 'history' && !this.historyLoaded) {
        this.loadHistory(1, false)
      }
      // When wallet loads, check if we need to update category name from groups
      if (newWallet && this.selectedCategory) {
        this.updateCategoryNameFromGroups()
      }
    }
  },
  mounted () {
    // Check for category parameter in URL
    const categoryParam = this.$route?.query?.category
    if (categoryParam) {
      // Use nextTick to ensure component refs are available
      this.$nextTick(() => {
        this.handleCategoryFromUrl(categoryParam)
      })
    }
    this.loadWallet()
    // After wallet loads, check again for category name if we have a category selected
    // This handles the case when loading directly with a category parameter
    this.$nextTick(() => {
      if (this.selectedCategory && this.wallet) {
        // Wait a bit for groups to load, then check multiple times
        setTimeout(() => {
          this.updateCategoryNameFromGroups()
          // Check again after a longer delay to catch groups that load later
          setTimeout(() => {
            this.updateCategoryNameFromGroups()
          }, 2000)
        }, 1000)
      }
    })
  },
  beforeUnmount () {
    if (this.historyScrollObserver) {
      this.historyScrollObserver.disconnect()
    }
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
    
    // Payhero theme - matches .pt-header background
    &.theme-payhero {
      background: rgba(0, 0, 0, 0.5) !important;
    }
    
    // Glassmorphic themes - match .pt-header backgrounds
    // Light mode backgrounds
    &.theme-glassmorphic-blue:not(.dark) {
      background: #ecf3f3;
    }
    &.theme-glassmorphic-gold:not(.dark) {
      background: #fff8e1;
    }
    &.theme-glassmorphic-green:not(.dark) {
      background: #e8f5e9;
    }
    &.theme-glassmorphic-red:not(.dark) {
      background: #f3ecec;
    }
    
    // Dark mode backgrounds
    &.theme-glassmorphic-blue.dark {
      background: #273746;
    }
    &.theme-glassmorphic-gold.dark {
      background: #3d3224;
    }
    &.theme-glassmorphic-green.dark {
      background: #263d32;
    }
    &.theme-glassmorphic-red.dark {
      background: #462733;
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

    &:hover:not(.active-theme-btn):not(.disabled) {
      background-color: rgba(0, 0, 0, 0.05);

      &.dark {
        background-color: rgba(255, 255, 255, 0.15);
      }
    }

    &.dark {
      color: rgba(255, 255, 255, 0.8);
    }

    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
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
  
  .transaction-list {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    // overflow set by parent
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    
    // Custom scrollbar styling
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.05);
      border-radius: 10px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 10px;
      
      &:hover {
        background: rgba(0, 0, 0, 0.3);
      }
    }
  }

  .transactions-content {
    flex-shrink: 0; // Don't compress content
  }

  .loading-more {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    gap: 12px;
  }

  .loading-text {
    font-size: 14px;
    opacity: 0.7;
    margin: 0;
    
    &.dark {
      color: #e0e2e5;
    }
    
    &.light {
      color: rgba(0, 0, 0, 0.7);
    }
  }

  .end-of-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    gap: 8px;
    opacity: 0.6;
  }

  .end-text {
    font-size: 13px;
    margin: 0;
    
    &.dark {
      color: #a6acaf;
    }
    
    &.light {
      color: rgba(0, 0, 0, 0.6);
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
  }

  .no-transaction-img {
    width: 50px;
    height: 50px;
    margin-bottom: 12px;
    opacity: 0.6;
  }

  .empty-state-text {
    font-size: 16px;
    opacity: 0.7;
    margin: 0;
  }

  .loading-state {
    padding: 16px 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .scroll-sentinel {
    height: 1px;
    width: 100%;
    visibility: hidden;
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

