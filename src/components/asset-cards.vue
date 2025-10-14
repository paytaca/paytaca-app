<template>
  <div class="row no-wrap q-gutter-md q-pl-lg q-mb-md no-scrollbar" id="asset-container" v-show="assets">
    <button v-show="manageAssets" class="add-asset-button q-ml-lg shadow-5 bg-grad text-white" @click="addNewAsset">+</button>
    <div
      v-for="(asset, index) in filteredFavAssets"
      :key="index"
      class="method-cards asset-card-border q-pa-md q-mr-none"
      :class="[{ selected: asset?.id === selectedAsset?.id }, {'pt-dark-box-shadow': darkMode}]"
      @click="(event) => {
        selectAsset(event, asset)
      }"
      :style="{ 'margin-left': index === 0 ? '0px' : '12px' }"
      v-touch-pan="handlePan"
    >
      <q-intersection>
        <div class="row items-start no-wrap justify-between" style="margin-top: -6px;">
          <img :src="getImageUrl(asset)" height="30" class="q-mr-xs" alt="">
          <p class="col q-pl-sm text-right asset-symbol" :class="{'text-grad' : isNotDefaultTheme}">
            {{ asset.symbol }}
          </p>
        </div>
      </q-intersection>
      <div class="row" style="margin-top: -7px;">
        <q-space />
        <div v-if="!balanceLoaded && !manageAssets && asset.id === selectedAsset.id" style="width: 100%;">
          <q-skeleton type="rect"/>
        </div>
        <template v-else>
          <p v-if="!manageAssets" class="float-right text-no-wrap asset-balance">
            {{ parseAssetDenomination(denomination, { ...asset, excludeSymbol: true }) }}
          </p>
        </template>

        <div
          v-if="manageAssets && asset.symbol !== 'BCH'"
          @click="() => removeAsset(asset)"
          style="float: right; width: 20px; margin-top: -5px;">
          <q-btn icon="close" class="remove-asset-button" size="8px" flat round dense v-close-popup />
        </div>
      </div>
      <button class="q-ml-sm" style="border: none; background-color: transparent"></button>
    </div>
  </div>
</template>

<script>
import * as assetSettings from 'src/utils/asset-settings'
import { parseAssetDenomination } from 'src/utils/denomination-utils'
import AddNewAsset from '../pages/transaction/dialog/AddNewAsset'
import RemoveAsset from '../pages/transaction/dialog/RemoveAsset'

export default {
  name: 'asset-cards',
  emits: [
    'hide-asset-info',
    'show-asset-info',
    'select-asset',
    'removed-asset'
  ],
  props: {
    network: {
      type: String,
      default: 'BCH'
    },
    wallet: { type: Object },
    forcePropsAssets: { type: Boolean },
    assets: { type: Array },
    manageAssets: { type: Boolean },
    selectedAsset: { type: Object },
    balanceLoaded: { type: Boolean },
    isCashToken: { type: Boolean },
    currentLanguage: { type: String },
    currentCountry: { type: String }
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
    isNotDefaultTheme () {
      return this.$store.getters['global/theme'] === 'payhero'
    },
    filteredFavAssets () {
      if (this.networkError || this.forcePropsAssets) {
        return this.assets.slice(0,10)
      }

      if (this.customList) {        
        return this.customList.filter(asset => this.favorites.includes(asset.id))            
      } 
    },
    denomination () {
      return this.$store.getters['global/denomination']
    }
  },
  // watch: {
  //   customListIDs(val) {
  //     if (val) {
        
  //     }
  //   }
  // },
  async mounted() {    
    // this.checkEmptyFavorites()
    // const isInitFav = this.$store.getters['assets/initializedFavorites']
    // await this.$store.dispatch('assets/initializeFavorites', this.assets) 

    // if (!isInitFav) {
    //   await assetSettings.registerUser()
    //   const favsList = this.assets.map(asset => asset.id)
    //   await assetSettings.saveFavorites(favsList)
    // }

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
      
      this.favorites = temp.filter(asset => asset.favorite === 1).map(asset => asset.id)
    },
    formatAssetTokenAmount(asset) {
      return convertToTokenAmountWithDecimals(asset?.balance, asset?.decimals).toLocaleString(
        'en-US', { maximumFractionDigits: parseInt(asset?.decimals) || 0 },
      )
    },
    getAssetMarketBalance (asset) {
      if (!asset || !asset.id) return ''

      const assetPrice = this.$store.getters['market/getAssetPrice'](asset.id, this.selectedMarketCurrency)
      if (!assetPrice) return ''

      const computedBalance = Number(asset.balance || 0) * Number(assetPrice)

      return computedBalance.toFixed(2)
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
    removeAsset (asset) {
      const vm = this
      const assetName = asset.name
      const walletIndex = vm.$store.getters['global/getWalletIndex']
      vm.$q.dialog({
        component: RemoveAsset,
        assetName
      }).onOk(() => {
        if (this.isSep20) {
          vm.$store.commit('sep20/addRemovedAssetIds', asset.id)
          const commitName = 'sep20/removeAsset'
          return vm.$store.commit(commitName, asset.id)
        }
        vm.$store.commit('assets/removeAsset', asset.id)
        vm.$store.commit('assets/addRemovedAssetIds', {
          vaultIndex: walletIndex,
          id: asset.id
        })
        vm.$emit('removed-asset', asset)
      }).onCancel(() => {
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
      },
  }
}
</script>

<style lang="scss" scoped>

  #asset-container {
    overflow-x: auto;
    overflow-y: hidden;
    margin-left: 20px;
    margin-right: 20px;
    padding-left: 0px;
    
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
    padding: 20px 20px 34px 20px;
    border-radius: 16px;
    font-size: 25px;
    height: 78px;
    margin-left: 2px;
    margin-right: 12px;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 4px 20px 0 rgba(31, 38, 135, 0.1);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    &:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 24px 0 rgba(31, 38, 135, 0.15);
    }
  }

  .method-cards {
    height: 78px;
    min-width: 150px;
    border-radius: 16px;
    margin-bottom: 5px !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    
    .asset-symbol {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #EAEEFF;
      font-size: 19px;
    }
    .asset-balance {
      overflow: hidden;
      text-overflow: ellipsis;
      color: #EAEEFF;
      margin-top: -5px;
      font-size: 18px;
    }
    .remove-asset-button {
      background: red;
      color: white;
    }
  }
  .pt-dark-box-shadow {
    box-shadow: 2px 2px 2px 2px #212f3d !important;
  }
</style>
