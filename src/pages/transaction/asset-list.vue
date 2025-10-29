<template>
	<div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkmode)">
		<header-nav
	      :title="$t(isHongKong(currentCountry) ? 'Points' : 'Tokens')"
	      backnavpath=""
	    ></header-nav>
	    
	    <!-- Skeleton Loading State -->
	    <div v-if="!isloaded" class="q-pa-md">
	    	<div class="row q-mb-md">
	    		<div class="col">
	    			<q-skeleton type="QBtn" width="40px" height="40px" />
	    		</div>
	    		<div class="col text-right">
	    			<q-skeleton type="QBtn" width="40px" height="40px" class="float-right" />
	    		</div>
	    	</div>
	    	
	    	<q-list class="q-ma-md">
	    		<q-card v-for="i in 8" :key="i" class="q-py-sm q-my-sm br-15">
	    			<q-item>
	    				<q-item-section avatar>
	    					<q-skeleton type="QAvatar" size="50px" />
	    				</q-item-section>
	    				<q-item-section>
	    					<q-skeleton type="text" width="60%" />
	    					<q-skeleton type="text" width="40%" class="q-mt-xs" />
	    				</q-item-section>
	    				<q-item-section side>
	    					<q-skeleton type="QBtn" width="30px" height="30px" />
	    				</q-item-section>
	    			</q-item>
	    		</q-card>
	    	</q-list>
	    </div>
	    
		<div :class="darkmode ? 'text-white' : 'text-black'" v-if="isloaded">

			<div class="row"> 
				<div class="col">
					<div class="row q-px-lg">						
						<q-btn round flat padding="3px" @click="checkMissingAssets({autoOpen: true})">
							<q-icon class="primary-filter" size="25px" name="img:scan.svg"/>
						</q-btn>
					</div>					
				</div>

				<div class="col text-right">
					<div class="row">
						<div v-if="enableSLP" class="col">
							<AssetFilter :float="false" @filterTokens="isCT => isCashToken = isCT" />
						</div>
						<div class="col">
							<q-btn round flat padding="3px" @click="addNewAsset()">
								<q-icon size="30px" name="add" class="q-pr-lg primary-filter"/>
							</q-btn>							
						</div>						
					</div>					
				</div>				
			</div>

			<div class="full-width" :class="darkmode ? 'text-white' : 'text-black'" style="margin-top: 20px ; margin-bottom: 40px;">
			    <q-list v-if="assetList.length > 0" :key="assetListKey" class="q-ma-md">
			      	<draggable			      		
			      		:list="assetList" 
						group="assets" 
						@start="drag=true" 
						@end="onDragEnd" 
						handle=".handle"
						item-key="id"
						:animation="600"
						:transition-duration="600"
						class="asset-list-transition"
			      	>
			      	    <template #item="{element: asset, index}"> 
			      	    	<q-slide-item @right="onSwipeRight(asset)" right-color="red" class="q-my-sm">
			      	    		<template v-slot:right>
			      	    			<div class="row items-center q-px-md">
			      	    				<q-icon name="delete" size="24px" color="white" />
			      	    			</div>
			      	    		</template>
				      	    	<q-card class="q-py-sm br-15 asset-card" :class="{'has-drag-handle': asset.favorite === 1}">
				      	    		<q-item>
				      	    			<q-item-section v-if="asset.favorite === 1" side class="handle drag-handle">
				      	    				<q-icon name="drag_indicator" size="20px" :color="darkmode ? 'grey-5' : 'grey-7'" />
				      	    			</q-item-section>		      	    			      	    	
									      <q-item-section avatar :class="{'q-pl-md': asset.favorite !== 1}">
									          <q-avatar>
									            <img :src="getImageUrl(asset)">
									          </q-avatar>
									        </q-item-section>
									        <q-item-section>
									        	<div class="text-bold ">{{ asset.name}}</div>
									        	<div :class="darkmode ? 'text-grey-5' : 'text-grey-8'">
									      			{{ formatAssetTokenAmount(asset) }} {{ asset.symbol }}			      			
									      		</div>
									        </q-item-section>
									      	<q-item-section side>			      		
									      		<q-rating
									      			readonly
											        v-model="asset.favorite"
											        max="1"
											        size="2em"
											        color="amber-6"
											        icon="star_border"
											        icon-selected="star"
											        @click.stop="updateFavorite(asset)"					      
											      />			      						      				      	
									      	</q-item-section>
				      	    		</q-item>			      	    	
							      </q-card>
						      </q-slide-item>
			      	    </template>			      
			        </draggable>  
			    </q-list>
			    <div v-else class="text-center" style="margin-top: 50px;">
		            <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
		            <p :class="{ 'text-black': !darkMode }">{{ $t('No Assets To Display') }}</p>
		          </div>
		      <div class="banner" v-if="networkError">
		      	<q-banner class="bg-primary text-white">
		      		<div class="row justify-between q-pt-xs q-px-sm">
                <div class="text-italic" style="font-size: 15px;">
                  Network Error. Try again later
                </div>
	              <div>
	              	<q-btn flat padding="none" color="white" size="md" icon="refresh" @click="loadData()"/>
	              </div>
              </div>                      
		      	</q-banner>
		      </div>
			  </div>	
			  
		</div>

		<footer-menu ref="footerMenu" />
		<TokenSuggestionsDialog
	      ref="tokenSuggestionsDialog"
	      v-model="showTokenSuggestionsDialog"
	      :bch-wallet-hash="getWallet('bch').walletHash"
	      :slp-wallet-hash="getWallet('slp').walletHash"
	      :sbch-address="getWallet('sbch').lastAddress"
	      @added="addUnlistedToken = true"
	      @update:modelValue="() => { 	      	
	      	     	   
	      }"
	    />

	</div>
</template>
<script>
import { getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'
import * as assetSettings from 'src/utils/asset-settings'
import { convertToTokenAmountWithDecimals } from 'src/wallet/chipnet'
import { cachedLoadWallet } from '../../wallet'
import { markRaw } from '@vue/reactivity'
import draggable from 'vuedraggable'

import headerNav from 'src/components/header-nav'
import AssetFilter from '../../components/AssetFilter'
import TokenSuggestionsDialog from '../../components/TokenSuggestionsDialog'
import AddNewAsset from 'src/pages/transaction/dialog/AddNewAsset'
import RemoveAsset from 'src/pages/transaction/dialog/RemoveAsset'

export default {
	data () {
		return {
			isCashToken: true,
			customList: [],
			assetList: [],
			assetListKey: 0,			
			unlistedToken: [],
			showTokenSuggestionsDialog: false,
			wallet: null,	
			drag: false,	
			isloaded: false,
			networkError: false,
			addUnlistedToken: false	
		}
	},
	computed: {
		darkmode () {
	      return this.$store.getters['darkmode/getStatus']
	    },
	    enableSLP () {
	      return this.$store.getters['global/enableSLP']
	    },
	    currentCountry () {
	      return this.$store.getters['global/country'].code
	    },
	    denomination () {
	      return this.$store.getters['global/denomination']
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
	    assets () {
	      const vm = this	      
	      if (vm.selectedNetwork === 'sBCH') return this.smartchainAssets
	      
	      // if (vm.stablehedgeView) {
	      //   return vm.$store.getters['stablehedge/tokenBalancesAsAssets']
	      // }

	      return vm.mainchainAssets.filter(token => {
	        const assetId = token.id?.split?.('/')?.[0]
	        return (
	          vm.isCashToken && assetId === 'ct' ||
	          !vm.isCashToken && assetId === 'slp'
	        )
	      })
	    },
	    isChipnet () {
	      return this.$store.getters['global/isChipnet']
	    },
	    mainchainAssets() {
	      return this.$store.getters['assets/getAssets'].filter(function (item) {
	        if (item && item.id !== 'bch') return item
	      })
	    },
	    smartchainAssets() {
	      return this.$store.getters['sep20/getAssets'].filter(function (item) {
	        if (item && item.id !== 'bch') return item
	      })
	    },
	},
	components: {
		headerNav,
		AssetFilter,
		TokenSuggestionsDialog,
		AddNewAsset,
		RemoveAsset,
		draggable
	},
	watch: {
		isCashToken () {
			this.assetList = this.assets
		},
		isloaded (val) {
			// Skeleton loaders handle loading state
		},
		addUnlistedToken (val) {
			if (val) {				
				this.checkUpdatedAssets()
			}
		}
	},
	unmount() {
		// Cleanup if needed
	},	
	async mounted () {		
		const wallet = await cachedLoadWallet('BCH', this.$store.getters['global/getWalletIndex'])
    this.wallet = markRaw(wallet)

		this.loadData()
	},
	methods: {
		getDarkModeClass,
		isHongKong,		
		formatAssetTokenAmount(asset) {
	      return convertToTokenAmountWithDecimals(asset?.balance, asset?.decimals).toLocaleString(
	        'en-US', { maximumFractionDigits: parseInt(asset?.decimals) || 0 },
	      )
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
	          if (asset.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
	            return asset.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
	          } else {
	            return asset.logo
	          }
	        } else {
	          return this.getFallbackAssetLogo(asset)
	        }
	      }
	    },
	    async loadData() {
	    	this.isloaded = false
	    	this.networkError = false

	    	// register / get auth 
		    await assetSettings.authToken()

		    // fetching unlisted tokens // skip if reloading from readding unlisted token
		    if (!this.addUnlistedToken) {
		    	this.unlistedToken = await assetSettings.fetchUnlistedTokens()
		    	await this.getUnlistedTokens()
		    }		    		    
		    this.addUnlistedToken = false

		    // fetching custom order list
				this.customList = await assetSettings.fetchCustomList()
				
				if (!this.customList) {
					this.networkError = true

					this.checkEmptyFavorites()
					this.$store.dispatch('assets/initializeFavorites', this.assets)
					
					this.assetList = this.assets
					this.isloaded = true
				} else {
					// Initialize Asset Custom List // Saving initial asset list (BCH/sBCH) to server
			    if ('error' in this.customList || Object.keys(this.customList).length === 0) {     	
			    	const assetIDs = this.assets.map((asset) => asset.id)
			    	if (this.selectedNetwork === 'BCH') {
			    		assetSettings.initializeCustomList(assetIDs, [])    		
			    	} else {    		
			    		assetSettings.initializeCustomList([], assetIDs)
			    	}


			    	await assetSettings.initializeFavorites(this.assets)  
			    } else {
			    	// Update Here to checking Favorites from server. Currently using Local storage    	
			    	// this.checkEmptyFavorites()
						// this.$store.dispatch('assets/initializeFavorites', this.assets)

						let fav = await assetSettings.fetchFavorites()
						try { // temporary error handling to resolve fav being null
							fav =  fav.filter(asset => asset.favorite === 1).map(asset => asset.id)
						} catch {
							fav = []
						} finally {
							this.assetList = await this.fetchAssetInfo(this.customList[this.selectedNetwork])
							this.assetList = this.assetList.map(asset => ({...asset, favorite: fav.includes(asset.id) ? 1 : 0}))
						}
			    }

			    // remove from asset list
			    const temp = this.unlistedToken.map(token => token.id)
			    
			    this.assetList = this.assetList.filter(asset => {
			    	if (asset) { 
			    			return !temp.includes(asset.id) 
			    	}
			    })
				}
		    

		    this.isloaded = true
	    },
	    refreshList() {
	    	this.assetListKey++
	    },
	    onDragEnd() {
	    	this.drag = false
	    	
	    	// Ensure favorites remain grouped at the top after manual reordering
	    	const favorites = this.assetList.filter(asset => asset.favorite === 1)
	    	const nonFavorites = this.assetList.filter(asset => asset.favorite === 0)
	    	this.assetList = [...favorites, ...nonFavorites]
	    	
	    	// Save the manually reordered custom list
	    	this.customList[this.selectedNetwork] = this.assetList.map((asset) => asset.id)
	    	assetSettings.saveCustomList(this.customList)
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
	    updateFavorite (favAsset) {
	    	// Toggle favorite status
	    	this.assetList = this.assetList.map(asset => asset.id === favAsset.id ? {...asset, favorite: favAsset.favorite === 0 ? 1 : 0} : asset)
	    	
	    	// Add a small delay to make the animation more noticeable
	    	setTimeout(() => {
		    	// Sort list: favorites first, then non-favorites
		    	this.assetList = this.assetList.sort((a, b) => {
		    		// If one is favorite and other is not, favorite comes first
		    		if (a.favorite === 1 && b.favorite === 0) return -1
		    		if (a.favorite === 0 && b.favorite === 1) return 1
		    		// If both have same favorite status, maintain their relative order
		    		return 0
		    	})
		    	
		    	const tempFavorites = this.assetList.map(({id, favorite}) =>({ id, favorite }))
		    	assetSettings.saveFavorites(tempFavorites)
		    	
		    	// Save the reordered custom list
		    	this.customList[this.selectedNetwork] = this.assetList.map((asset) => asset.id)
		    	assetSettings.saveCustomList(this.customList)
	    	}, 100)
	    },
	    getWallet (type) {
	      return this.$store.getters['global/getWallet'](type)
	    },
	    async checkMissingAssets (opts = { autoOpen: false }) {
	      if (!this.$refs.tokenSuggestionsDialog) return Promise.reject()
	      this.showTokenSuggestionsDialog = Boolean(opts && opts.autoOpen)
	      return this.$refs.tokenSuggestionsDialog.updateList(opts)
	    },
	    addNewAsset () {
	      const vm = this
	      vm.$q.dialog({
	        // need both in passing props for now for backwards compatibility
	        componentProps: {
	          network: vm.selectedNetwork,
	          darkMode: vm.darkmode,
	          isCashToken: vm.isCashToken,
	          wallet: vm.wallet,
	          currentCountry: vm.currentCountry
	        },
	        component: AddNewAsset
	      }).onOk((asset) => {	  
	      	 this.loadData()	      	
	      })
	    },
	    onSwipeRight(asset) {
	      this.removeAsset(asset)
	    },
	    removeAsset (asset) {
	      const vm = this
	      const assetName = asset.name
	      const walletIndex = vm.$store.getters['global/getWalletIndex']
	      vm.$q.dialog({
	        component: RemoveAsset,
	        componentProps: {
	          assetName
	        }
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

	        vm.loadData()
	        vm.$emit('removed-asset', asset)
	      })
	    },
	    async fetchAssetInfo (list) {
	    	let temp = []
	    	
	    	for (const id of list) {	    		
	    		const asset = await this.$store.getters['assets/getAsset'](id)
	    		
	    		if (asset.length > 0) {	    			
	    			temp.push(asset[0])
	    		}	    		
	    	}	    	
	    	return temp
	    },
	    async getUnlistedTokens (opts = { includeIgnored: false }) {
	    	if (!this.unlistedToken) { return }
	    		
	      const tokenWalletHashes = [this.getWallet('bch').walletHash, this.getWallet('slp').walletHash]	      

	      let tokenIDs = []
	      for (const tokenWalletHash of tokenWalletHashes) {
	        const isCashToken = tokenWalletHashes.indexOf(tokenWalletHash) === 0

	        const tokens = await this.$store.dispatch(
	          'assets/getMissingAssets',
	          {
	            isCashToken,
	            walletHash: tokenWalletHash,
	            includeIgnoredTokens: opts.includeIgnored,
	          }
	        )

	        tokenIDs.push(...tokens.map(asset => asset.id))
	      }

	      const diff = tokenIDs.filter(asset => !this.unlistedToken.includes(asset))	      

	      this.unlistedToken.push(...diff)

	     	this.unlistedToken = await assetSettings.saveUnlistedTokens(this.unlistedToken)		      
	    },
	    async checkUpdatedAssets () {
	    	this.isloaded = false

	    	const assetIDs = this.assets.map(asset => asset.id)
	    	const diff = this.unlistedToken.filter(asset => assetIDs.includes(asset))	

	    	// removing readded tokens from unlisted token list    	
	    	const temp = this.unlistedToken.filter(asset => !diff.includes(asset))
	    	
	    	this.unlistedToken = await assetSettings.saveUnlistedTokens(temp)
				this.showTokenSuggestionsDialog = false

				await this.loadData()
	    }
	}	
}
</script>
<style lang="scss" scoped>
.drag-handle {
  cursor: grab;
  user-select: none;
  padding: 0 !important;
  min-width: 30px !important;
  
  &:active {
    cursor: grabbing;
  }
  
  .q-icon {
    opacity: 0.5;
    transition: opacity 0.2s ease;
  }
  
  &:hover .q-icon {
    opacity: 0.8;
  }
}

.asset-card {
  &.has-drag-handle:hover .drag-handle .q-icon {
    opacity: 0.7;
  }
  
  // Non-favorites should not appear draggable
  &:not(.has-drag-handle) {
    cursor: default;
  }
}

.banner {
	z-index: 6;
	position: fixed;
	bottom: 0;
	width: 100%;
	padding: 0px 10px 12vh 10px;
}

// Smooth transition animation for reordering
.asset-list-transition {
  transition: all 0.6s ease;
  
  .q-card {
    transition: all 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
    transition-property: transform, opacity;
  }
}

// Animation classes for sortable.js
:deep(.sortable-ghost) {
  opacity: 0.4;
  transform: scale(1.02);
}

:deep(.sortable-drag) {
  opacity: 0.8;
  transform: scale(1.05);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  
  .drag-handle {
    cursor: grabbing !important;
  }
}

:deep(.sortable-chosen) {
  background-color: rgba(0, 0, 0, 0.05);
}

// Swipe-to-delete styling
:deep(.q-slide-item) {
  overflow: visible;
}

:deep(.q-slide-item__content) {
  border-radius: 15px;
  overflow: hidden;
}
</style>