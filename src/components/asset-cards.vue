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
        <div class="row items-start no-wrap justify-between" style="margin-top: -6px;">
          <q-skeleton type="circle" size="30px" class="q-mr-xs" />
          <q-skeleton type="rect" width="60px" height="20px" class="q-ml-sm" />
        </div>
        <div class="row" style="margin-top: -7px;">
          <q-space />
          <q-skeleton type="rect" width="80px" height="18px" />
        </div>
      </div>
    </template>
    
    <!-- Actual asset cards -->
    <div
      v-for="(asset, index) in filteredFavAssets"
      :key="index"
      class="method-cards asset-card-border q-mr-none"
      :class="[{ selected: asset?.id === selectedAsset?.id }]"
      @click="(event) => {
        selectAsset(event, asset)
      }"
      v-touch-hold.mouse="() => showAssetInfo(asset)"
      :style="{ 'margin-left': index === 0 ? '0px' : '12px' }"
      v-touch-pan="handlePan"
    >
      <div class="row items-center no-wrap justify-between q-mb-xs">
        <img :src="getImageUrl(asset)" height="28" class="q-mr-xs" alt="">
        <p class="col text-right asset-symbol">
          {{ asset.symbol }}
        </p>
      </div>
      <div class="row items-end justify-end">
        <div v-if="(!balanceLoaded && asset.id === selectedAsset.id) || refreshingTokenIds.includes(asset.id)" class="text-right">
          <q-skeleton type="rect" width="80px" height="20px" />
        </div>
        <template v-else>
          <div class="text-right">
            <p class="asset-balance q-mb-none">
              {{ parseAssetDenomination(denomination, { ...asset, excludeSymbol: true }) }}
            </p>
            <template v-if="asset.id !== 'bch'">
              <p v-if="getAssetFiatValue(asset)" class="asset-fiat-value q-mb-none q-mt-xs">
                {{ getAssetFiatValue(asset) }}
              </p>
              <p v-else-if="hasPriceLoading(asset)" class="asset-fiat-value q-mb-none q-mt-xs">
                <q-skeleton type="rect" width="60px" height="12px" />
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
import { parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
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
  // watch: {
  //   customListIDs(val) {
  //     if (val) {
        
  //     }
  //   }
  // },
  async mounted() {        
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
          }
        }   
      }      
    } else {      
      this.networkError = true
    }     
  },
  methods: {
    parseAssetDenomination,
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
      
      // For tokens, if price is not available, show 0.00 instead of empty
      if (asset.id !== 'bch' && (!assetPrice || assetPrice === 0)) {
        return parseFiatCurrency('0.00', currencySymbol)
      }
      
      // For BCH, return empty if no price
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
    hasPriceLoading (asset) {
      // Check if price might be loading (price doesn't exist but we expect it to)
      if (!asset || !asset.id || asset.id === 'bch') return false
      
      const selectedCurrency = this.$store.getters['market/selectedCurrency']
      const currencySymbol = selectedCurrency?.symbol
      if (!currencySymbol) return false
      
      // If we have a balance but no price, it might be loading
      const hasBalance = Number(asset.balance || 0) > 0
      const hasPrice = this.$store.getters['market/getAssetPrice'](asset.id, currencySymbol)
      return hasBalance && !hasPrice
    },
    getFallbackAssetLogo (asset) {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(asset && asset.id))
    },
    getImageUrl (asset) {
      if (asset.logo) {
        if (asset.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
          return asset.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
        } else {
          return asset.logo
        }
      } else {
        return this.getFallbackAssetLogo(asset)
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
    checkEmptyFavorites () {
        const vm = this

        vm.assets.forEach((asset) => {                
          if (!('favorite' in asset)) {
            let temp = {
              id: asset.id,
              favorite: 0
            }           
            vm.$store.commit('assets/updateAssetFavorite',  temp)
          }
        })      
      }
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
  .view-all-button {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
