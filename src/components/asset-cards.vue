<template>
  <div class="row no-wrap q-gutter-md q-pl-lg q-mb-md no-scrollbar" id="asset-container" v-show="assets || isLoadingInitial">
    
    <!-- Skeleton loaders for initial loading -->
    <template v-if="isLoadingInitial && (!assets || assets.length === 0 || !filteredFavAssets || filteredFavAssets.length === 0)">
      <div
        v-for="n in 3"
        :key="`skeleton-${n}`"
        class="method-cards asset-card-border q-mr-none"
        :style="{ 'margin-left': n === 1 ? '0px' : '12px' }"
      >
        <div class="row items-center no-wrap justify-between q-mb-xs">
          <q-skeleton type="circle" size="28px" class="q-mr-xs" />
          <q-skeleton type="rect" width="60px" height="15px" class="text-right" />
        </div>
        <div class="row items-end justify-end">
          <div class="text-right">
            <q-skeleton type="rect" width="80px" height="18px" class="q-mb-none" />
            <q-skeleton type="rect" width="60px" height="11px" class="q-mt-xs" />
          </div>
        </div>
      </div>
    </template>
    
    <!-- Actual asset cards -->
    <div
      v-for="(asset, index) in filteredFavAssets"
      :key="index"
      class="method-cards asset-card-border q-mr-none"
      :class="[{ selected: isSelectableAsset(asset) && asset?.id === selectedAsset?.id }, { 'is-disabled-card': !isSelectableAsset(asset) }]"
      @click="(event) => onAssetClick(event, asset)"
      v-touch-hold.mouse="() => onAssetHold(asset)"
      :style="{ 'margin-left': index === 0 ? '0px' : '12px' }"
      v-touch-pan="handlePan"
    >
      <div class="row items-center no-wrap justify-between q-mb-xs">
        <img 
          :src="getImageUrl(asset)" 
          height="28" 
          class="q-mr-xs asset-icon" 
          alt=""
          @contextmenu.prevent
          @selectstart.prevent
        >
        <p class="col text-right asset-symbol">
          {{ asset.symbol }}
        </p>
      </div>
      <div class="row items-end justify-end">
        <div v-if="(!balanceLoaded && asset.id === selectedAsset.id) || refreshingTokenIds.includes(asset.id)" class="text-right">
          <q-skeleton type="rect" width="80px" height="18px" class="q-mb-none" />
          <template v-if="asset.id !== 'bch'">
            <q-skeleton type="rect" width="60px" height="11px" class="q-mt-xs" />
          </template>
        </div>
        <template v-else>
          <div class="text-right">
            <p class="asset-balance q-mb-none">
              {{ formatTokenCardBalance(asset) }}
            </p>
            <template v-if="asset.id !== 'bch'">
              <p v-if="getAssetFiatValue(asset)" class="asset-fiat-value q-mb-none q-mt-xs">
                {{ getAssetFiatValue(asset) }}
              </p>
            </template>
          </div>
        </template>
      </div>
      <button class="q-ml-sm" style="border: none; background-color: transparent"></button>
    </div>
    <!-- Manage button moved to inline with Tokens label in transaction/index.vue -->
    
  </div>
</template>

<script>
import * as assetSettings from 'src/utils/asset-settings'
import { parseAssetDenomination, parseFiatCurrency, getLocaleSeparators } from 'src/utils/denomination-utils'
import { convertIpfsUrl } from 'src/wallet/cashtokens'
import AddNewAsset from '../pages/transaction/dialog/AddNewAsset'

export default {
  name: 'asset-cards',
  emits: [
    'hide-asset-info',
    'show-asset-info',
    'select-asset'
  ],
  props: {
    network: {
      type: String,
      default: 'BCH'
    },
    wallet: { type: Object },
    forcePropsAssets: { type: Boolean },
    assets: { type: Array },
    selectedAsset: { type: Object },
    balanceLoaded: { type: Boolean },
    refreshingTokenIds: {
      type: Array,
      default: () => []
    },
    isCashToken: { type: Boolean },
    currentLanguage: { type: String },
    currentCountry: { type: String },
    isLoadingInitial: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      assetClickCounter: 0,
      assetClickTimer: null,
      darkMode: this.$store.getters['darkmode/getStatus'],
      scrollContainer: null,
      scrollContainerClientX: null,
      isloaded: false,
      customListIDs: null,
      customList: null,
      networkError: false,
      favorites: [],
      favResult: []
    }
  },
  computed: {
    isSep20 () {
      return this.network === 'sBCH'
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    assetPrices () {
      // Force reactivity by accessing the store getter
      return this.$store.getters['market/assetPrices']
    },
    filteredFavAssets () {
      if (this.networkError || this.forcePropsAssets) {
        return this.assets.slice(0,10)
      }

      if (this.customList) { 
        return this.customList.filter(asset => asset && this.favorites.includes(asset.id))
      } 
      
      // For CashTokens on BCH network, tokens from API already have favorite field
      // Use the favorite field directly from tokens instead of separate favorites array
      if (this.assets && this.assets.length > 0) {
        // Check if tokens have favorite field (from API)
        const hasFavoriteField = this.assets.some(asset => asset && typeof asset.favorite !== 'undefined')
        
        if (hasFavoriteField) {
          // Use favorite field from tokens (API provides this)
          return this.assets.filter(asset => asset && (asset.favorite === 1 || asset.favorite === true))
        } else {
          // Fall back to old favorites array system (for sBCH/SLP)
          if (Array.isArray(this.favorites)) {
            return this.assets.filter(asset => asset && this.favorites.includes(asset.id))
          }
        }
      }
      
      return []
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    hasMoreTokens() {
      if (this.customList) {
        // Check if there are tokens that are not favorites
        const nonFavoriteTokens = this.customList.filter(asset => asset && !this.favorites.includes(asset.id))
        return nonFavoriteTokens.length > 0
      }
      return false
    }
  },
  watch: {
    // For CashTokens on BCH, assets come from API with favorite field - no need to watch/save
    // Only watch for sBCH/SLP which still use the old system
    async assets (newAssets, oldAssets) {
      // Skip for CashTokens on BCH network - API handles everything
      if (this.network === 'BCH' && this.isCashToken) {
        return
      }
      
      // Only process if we have customListIDs initialized and new assets (for sBCH/SLP)
      if (!this.customListIDs || !newAssets || newAssets.length === 0) {
        return
      }
      
      const newAssetIds = newAssets.map(a => a.id)
      const oldAssetIds = oldAssets ? oldAssets.map(a => a.id) : []
      
      // Check if there are new assets that aren't in the old list
      const hasNewAssets = newAssetIds.some(id => !oldAssetIds.includes(id))
      
      if (!hasNewAssets) {
        return
      }
      
      // Refresh customList to include new tokens
      // If customList is null, try to build it first
      await this.getCustomAssetList()
      
      // Check for unsaved assets and save them
      const assetIDs = newAssets.map(asset => asset.id)
      const unsavedAsset = assetIDs.filter(asset => !this.customListIDs[this.network]?.includes(asset))
      
      if (unsavedAsset.length > 0) {
        try {
          await assetSettings.authToken()
          
          const tempList = this.customListIDs
          const tempFav = this.favResult || []
          
          const unsavedAssetFavFormat = unsavedAsset.map(asset => ({ id: asset, favorite: 0 }))
          
          if (!tempList[this.network]) {
            tempList[this.network] = []
          }
          tempList[this.network].push(...unsavedAsset)
          tempFav.push(...unsavedAssetFavFormat)
          
          assetSettings.saveCustomList(tempList)
          assetSettings.saveFavorites(tempFav)
          
          // Refresh customList after saving
          await this.getCustomAssetList()
        } catch (error) {
          console.error('Error saving new assets:', error)
        }
      }
    }
  },
  async mounted() {
    // For CashTokens on BCH, API provides all data - no need for old favorites/customList APIs
    if (this.network === 'BCH' && this.isCashToken) {
      // Assets come from API with favorite field already set - nothing to do here
      return
    }
    
    // For sBCH/SLP, still use old system
    this.customListIDs = await assetSettings.fetchCustomList()      

    if (this.customListIDs) {
      
      // if not in server, initialize
      if ('error' in this.customListIDs || Object.keys(this.customListIDs).length === 0) {  
        await assetSettings.registerUser()

        // initilize custom list
        const assetIDs = this.assets.map(asset => asset.id)

        if (this.network === 'BCH') {
          await assetSettings.initializeCustomList(assetIDs, [])        
        } else {        
          await assetSettings.initializeCustomList([], assetIDs)
        }

        // initialize favorites
        await assetSettings.initializeFavorites(this.assets)   

      } else {
        await this.getFavorites()
        await this.getCustomAssetList()                 

        if (this.customList) {          
          // check for unsaved assets
          let assetIDs = this.assets.map(asset => asset.id)
          let unsavedAsset = assetIDs.filter(asset => !this.customListIDs[this.network].includes(asset))                  
        
          // save unsaved Assets           
          if (unsavedAsset.length > 0) {            
            await assetSettings.authToken()
            
            let tempList = this.customListIDs            
            let tempFav = this.favResult

            let unsavedAssetFavFormat = unsavedAsset.map(asset => ({ id: asset, favorite: 0}))
            
            await tempList[this.network].push(...unsavedAsset)
            await tempFav.push(...unsavedAssetFavFormat)


            assetSettings.saveCustomList(tempList)
            assetSettings.saveFavorites(tempFav)
            
            // Refresh customList after saving new assets
            await this.getCustomAssetList()
          }
        } else {
          // If customList is null but we have assets, try to build it from assets
          // This handles the case where tokens are loaded before customList is initialized
          if (this.assets && this.assets.length > 0) {
            // Wait a bit for assets to be fully loaded, then refresh
            this.$nextTick(async () => {
              await this.getCustomAssetList()
            })
          }
        }   
      }      
    } else {      
      this.networkError = true
    }     
  },
  methods: {
    parseAssetDenomination,
    isSelectableAsset (asset) {
      // Requirement: SLP token cards must not be clickable (only SLP; CashTokens unaffected).
      // On the home page, `isCashToken === false` corresponds to the SLP selector.
      if (!this.isCashToken && String(asset?.id || '').startsWith('slp/')) return false
      return true
    },
    onAssetClick (event, asset) {
      if (!this.isSelectableAsset(asset)) return
      this.selectAsset(event, asset)
    },
    onAssetHold (asset) {
      if (!this.isSelectableAsset(asset)) return
      this.showAssetInfo(asset)
    },
    formatTokenCardBalance (asset) {
      const base = parseAssetDenomination(this.denomination, { ...asset, excludeSymbol: true })

      // Only apply rounding rule to token cards (not BCH) when the value is visually too long.
      // The "too long" heuristic is based on formatted string length and presence of decimals.
      if (!asset || asset.id === 'bch') return base

      const { decimal } = getLocaleSeparators()
      const hasDecimalPart = typeof base === 'string' && base.includes(decimal)
      const tooLong = typeof base === 'string' && base.length > 12 && hasDecimalPart && (asset.decimals || 0) > 2
      if (!tooLong) return base

      return parseAssetDenomination(this.denomination, { ...asset, excludeSymbol: true }, false, 0, 2)
    },
    goToAssetList() {
      this.$router.push({ name: 'asset-list' })
    },
    async getCustomAssetList () {
      let temp = []
      if (!this.customListIDs || !this.customListIDs[this.network]) {
        return
      }
      
      for (const id of this.customListIDs[this.network]) {          
          const asset = await this.$store.getters['assets/getAsset'](id)

          if (asset) {            
            temp.push(asset[0])
          }         
        }      
      this.customList = temp
    },
    async getFavorites() {
      let temp = await assetSettings.fetchFavorites()
      this.favResult = temp
      
      try { // temporary error handling to resolve temp being null
        this.favorites = temp.filter(asset => asset.favorite === 1).map(asset => asset.id)
      } catch { }
    },
    formatAssetTokenAmount(asset) {
      return convertToTokenAmountWithDecimals(asset?.balance, asset?.decimals).toLocaleString(
        'en-US', { maximumFractionDigits: parseInt(asset?.decimals) || 0 },
      )
    },
    getAssetMarketBalance (asset) {
      if (!asset || !asset.id) return ''
      
      const selectedCurrency = this.$store.getters['market/selectedCurrency']
      const currencySymbol = selectedCurrency?.symbol
      if (!currencySymbol) return ''
      
      const assetPrice = this.$store.getters['market/getAssetPrice'](asset.id, currencySymbol)
      if (!assetPrice || assetPrice === 0) return ''

      let balance = Number(asset.balance || 0)
      
      // Adjust for token decimals (balance is in smallest units)
      // For BCH, use balance directly (matching home page calculation)
      // For tokens, divide by 10^decimals to get token units
      if (asset.id !== 'bch' && asset.decimals) {
        const decimals = parseInt(asset.decimals) || 0
        if (decimals > 0) {
          balance = balance / (10 ** decimals)
        }
      }
      
      const computedBalance = balance * Number(assetPrice)
      
      return parseFiatCurrency(computedBalance.toFixed(2), currencySymbol)
    },
    getAssetFiatValue (asset) {
      // Access assetPrices to ensure reactivity
      const _ = this.assetPrices
      // Wrapper method to ensure reactivity
      return this.getAssetMarketBalance(asset)
    },
    getFallbackAssetLogo (asset) {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(asset && asset.id))
    },
    getImageUrl (asset) {
      if (this.denomination === this.$t('DEEM') && asset.symbol === 'BCH') {
        return 'assets/img/theme/payhero/deem-logo.png'
      } else {
        if (asset.logo) {
          // Convert ipfs:// URLs to https://ipfs.paytaca.com/ipfs/ format
          const convertedLogo = convertIpfsUrl(asset.logo)
          if (convertedLogo.startsWith('https://ipfs.paytaca.com/ipfs')) {
            return convertedLogo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
          } else {
            return convertedLogo
          }
        } else {
          return this.getFallbackAssetLogo(asset)
        }
      }
    },
    selectAsset (event, asset) {
      const vm = this
      vm.assetClickCounter += 1
      if (vm.assetClickCounter >= 2) {
        vm.$emit('show-asset-info', asset)
        vm.assetClickTimer = setTimeout(() => {
          clearTimeout(vm.assetClickTimer)
          vm.assetClickTimer = null
          vm.assetClickCounter = 0
        }, 200)
      } else {
        vm.$emit('hide-asset-info')
        vm.assetClickTimer = setTimeout(() => {
          if (vm.assetClickCounter === 1) {
            vm.$emit('select-asset', asset)
          }
          clearTimeout(vm.assetClickTimer)
          vm.assetClickTimer = null
          vm.assetClickCounter = 0
        }, 200)
      }
    },
    showAssetInfo (asset) {
      // Handle long press to show asset info dialog
      this.$emit('show-asset-info', asset)
    },
    addNewAsset () {
      const vm = this
      vm.$q.dialog({
        // need both in passing props for now for backwards compatibility
        componentProps: {
          network: vm.network,
          darkMode: vm.darkMode,
          isCashToken: vm.isCashToken,
          wallet: vm.$parent.$parent.wallet,
          currentCountry: vm.currentCountry
        },
        component: AddNewAsset
      }).onOk((asset) => {
        if (asset.data?.id) vm.selectAsset(null, asset.data)
      })
    },
    handlePan (evt) {
      if (!this.$q.platform.is.mobile) {
        this.scrollContainer = document.querySelector('#asset-container')
        if (this.scrollContainerClientX) {
          const deltaX = evt.evt.clientX - this.scrollContainerClientX
          this.scrollContainer.scrollLeft -= deltaX
        }
        this.scrollContainerClientX = evt.evt.clientX
      }
    },
    // REMOVED: checkEmptyFavorites - Never update favorites in Vuex state
    // Favorites should only be stored in the backend API, not in Vuex
    // Components should fetch favorites from the API using assetSettings.fetchFavorites()
    // checkEmptyFavorites () {
    //     const vm = this
    //     vm.assets.forEach((asset) => {                
    //       if (!('favorite' in asset)) {
    //         let temp = {
    //           id: asset.id,
    //           favorite: 0
    //         }           
    //         vm.$store.commit('assets/updateAssetFavorite',  temp)
    //       }
    //     })      
    // }
  }
}
</script>

<style lang="scss" scoped>

  #asset-container {
    overflow-x: auto;
    overflow-y: hidden;
    margin-left: 0px;
    margin-right: 0px;
    padding-right: 20px;
    
    /* Hide scrollbar for Chrome, Safari and Opera */
    &::-webkit-scrollbar {
      display: none;
    }
    
    /* Hide scrollbar for IE, Edge and Firefox */
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
  }
  .add-asset-button {
    border: 1px solid rgba(255, 255, 255, 0.18);
    padding: 10px 20px;
    border-radius: 16px;
    font-size: 13px;
    height: 78px;
    min-width: 100px;
    margin-left: 15px;
    margin-right: 12px;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    &:hover {
      transform: scale(1.05);
    }
    
    .q-icon {
      margin-bottom: 4px;
    }
  }

  .method-cards {
    min-height: 90px;
    height: auto;
    min-width: 150px;
    border-radius: 16px;
    margin-bottom: 5px !important;
    padding: 12px !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    
    .asset-symbol {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #EAEEFF;
      font-size: 15px;
      font-weight: 500;
      line-height: 1.2;
      margin: 0;
    }
    .asset-balance {
      overflow: hidden;
      text-overflow: ellipsis;
      color: #EAEEFF;
      font-size: 18px;
      font-weight: 600;
      line-height: 1.2;
      margin: 0;
    }
    .asset-fiat-value {
      overflow: hidden;
      text-overflow: ellipsis;
      color: #EAEEFF;
      font-size: 11px;
      font-weight: 400;
      opacity: 0.7;
      line-height: 1.3;
      margin: 0;
    }
    .remove-asset-button {
      background: red;
      color: white;
    }
  }

  .is-disabled-card {
    cursor: default !important;
    pointer-events: auto; // keep horizontal scroll/pan working
    opacity: 0.95;
  }
  .view-all-button {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
