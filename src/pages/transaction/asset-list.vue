<template>
	<div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkmode)">
		<header-nav
	      :title="$t(isHongKong(currentCountry) ? 'Points' : 'Tokens')"
	      backnavpath=""
	    ></header-nav>
	    
	    <!-- Instructional Text -->
	    <div v-if="isloaded" class="q-px-lg text-center" style="padding-top: 4px; padding-bottom: 8px;">
	    	<p :class="darkmode ? 'text-grey-4' : 'text-grey-6'" class="text-body2" style="font-size: 14px; line-height: 1.5; letter-spacing: 0.2px; margin: 0;">
	    		Click on star button to mark token as favorite. You may also customize the ordering of your favorite tokens.
	    	</p>
	    </div>
	    
	    <!-- Skeleton Loading State -->
	    <div v-if="!isloaded" class="q-pa-md">
	    	<!-- Skeleton for instructional text -->
	    	<div class="q-px-lg text-center" style="padding-top: 4px; padding-bottom: 8px;">
	    		<q-skeleton type="text" width="85%" class="q-mx-auto" height="20px" />
	    	</div>
	    	
	    	<div class="row q-mb-md" v-if="enableSLP">
	    		<div class="col text-right">
	    			<q-skeleton type="QBtn" width="80px" height="40px" class="float-right" />
	    		</div>
	    	</div>
	    	
	    	<q-list class="q-ma-md" style="margin-top: 12px;">
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
					<!-- Left side empty - can be used for future features -->
				</div>

				<div class="col text-right">
					<div class="row">
						<div v-if="enableSLP" class="col">
							<AssetFilter :float="false" @filterTokens="isCT => isCashToken = isCT" />
						</div>
					</div>					
				</div>				
			</div>

			<div class="full-width" :class="darkmode ? 'text-white' : 'text-black'" style="margin-top: 12px ; margin-bottom: 40px;">
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
		            <p :class="darkmode ? 'text-white' : 'text-black'">{{ $t('NoTokensToDisplay') }}</p>
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

	</div>
</template>
<script>
import { getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'
import * as assetSettings from 'src/utils/asset-settings'
import { convertToTokenAmountWithDecimals, getWatchtowerApiUrl } from 'src/wallet/chipnet'
import { cachedLoadWallet } from '../../wallet'
import { markRaw } from '@vue/reactivity'
import draggable from 'vuedraggable'
import axios from 'axios'
import { convertIpfsUrl } from 'src/wallet/cashtokens'

import headerNav from 'src/components/header-nav'
import AssetFilter from '../../components/AssetFilter'
import RemoveAsset from 'src/pages/transaction/dialog/RemoveAsset'

export default {
	data () {
		return {
			isCashToken: true,
			assetList: [],
			assetListKey: 0,			
			wallet: null,	
			drag: false,	
			isloaded: false,
			networkError: false
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
	    isChipnet () {
	      return this.$store.getters['global/isChipnet']
	    },
	},
	components: {
		headerNav,
		AssetFilter,
		RemoveAsset,
		draggable
	},
	watch: {
		isCashToken () {
			// Reload data from API when filter changes instead of using store assets
			// This prevents triggering balance API calls from store assets
			this.loadData()
		},
		isloaded (val) {
			// Skeleton loaders handle loading state
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

		    // Always fetch tokens directly from API - completely ignore Vuex store
		    // Only CashTokens on BCH network are supported by the fungible API
		    if (this.selectedNetwork !== 'sBCH' && this.isCashToken) {
		    	try {
		    		const directTokens = await this.fetchTokensDirectlyFromAPI()
		    		// Use API data only - no fallback to store
		    		this.assetList = directTokens
		    	} catch (error) {
		    		console.error('Error fetching tokens from API:', error)
		    		this.networkError = true
		    		// On error, show empty list - do not fall back to store
		    		this.assetList = []
		    	}
		    } else {
		    	// For SLP and sBCH, the fungible API doesn't support them yet
		    	// Show empty list instead of using store data
		    	this.assetList = []
		    }

		    this.isloaded = true
	    },
	    refreshList() {
	    	this.assetListKey++
	    },
	    async onDragEnd() {
	    	this.drag = false
	    	
	    	// Ensure favorites remain grouped at the top after manual reordering
	    	const favorites = this.assetList.filter(asset => asset.favorite === 1)
	    	const nonFavorites = this.assetList.filter(asset => asset.favorite === 0)
	    	this.assetList = [...favorites, ...nonFavorites]
	    	
	    	// Update favorite_order based on new position and save to backend
	    	if (favorites.length > 0) {
	    		// Map favorites with their new favorite_order (index + 1, starting from 1)
	    		const favoritesWithOrder = favorites.map((asset, index) => ({
	    			id: asset.id,
	    			favorite: asset.favorite,
	    			favorite_order: index + 1 // favorite_order starts from 1
	    		}))
	    		
	    		// Also include non-favorites with favorite: 0 and favorite_order: null
	    		const nonFavoritesData = nonFavorites.map(asset => ({
	    			id: asset.id,
	    			favorite: 0,
	    			favorite_order: null
	    		}))
	    		
	    		// Combine all assets and save to backend
	    		const allFavoritesData = [...favoritesWithOrder, ...nonFavoritesData]
	    		
	    		try {
	    			await assetSettings.saveFavorites(allFavoritesData)
	    		} catch (error) {
	    			console.error('Error saving favorite order:', error)
	    		}
	    	}
	    },
	    // REMOVED: checkEmptyFavorites - Never update favorites in Vuex state
	    // Favorites should only be stored in the backend API, not in Vuex
	    // Components should fetch favorites from the API using assetSettings.fetchFavorites()
	    // checkEmptyFavorites () {
	    // 	const vm = this
	    // 	vm.assets.forEach((asset) => {	    		    	
	    // 		if (!('favorite' in asset)) {
	    // 			let temp = {
	    // 				id: asset.id,
	    // 				favorite: 0
	    // 			}	    			
	    // 			vm.$store.commit('assets/updateAssetFavorite',  temp)
	    // 		}
	    // 	})	    
	    // },
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
	    	
	    	// Note: Ordering is now handled by the API, so we don't need to save custom list
	    	// The API will maintain the order based on favorites and favorite_order
	    	}, 100)
	    },
	    getWallet (type) {
	      return this.$store.getters['global/getWallet'](type)
	    },
	    onSwipeRight(asset) {
	      this.removeAsset(asset)
	    },
	    removeAsset (asset) {
	      const vm = this
	      const assetName = asset.name
	      vm.$q.dialog({
	        component: RemoveAsset,
	        componentProps: {
	          assetName
	        }
	      }).onOk(() => {
	        // Note: Asset removal is handled by the backend API
	        // The removed asset will not appear in future API responses
	        // We don't need to update Vuex store since we only use API data
	        
	        // Reload data from API - the removed asset will no longer appear
	        vm.loadData()
	        vm.$emit('removed-asset', asset)
	      })
	    },
	    async fetchTokensDirectlyFromAPI () {
	    	if (this.selectedNetwork === 'sBCH' || !this.isCashToken) {
	    		return []
	    	}
	    	
	    	// Use wallet from component data instead of calling getWallet (which might trigger balance API calls)
	    	if (!this.wallet) {
	    		console.warn('Wallet not loaded, cannot fetch tokens')
	    		return []
	    	}
	    	
	    	const walletHash = this.wallet.BCH?.walletHash || this.wallet.bch?.walletHash
	    	if (!walletHash) {
	    		console.warn('Wallet hash not available')
	    		return []
	    	}
	    	
	    	const isChipnet = this.$store.getters['global/isChipnet']
	    	const baseUrl = getWatchtowerApiUrl(isChipnet)
	    	
	    	const filterParams = {
	    		has_balance: true,
	    		token_type: 1,
	    		wallet_hash: walletHash,
	    		limit: 100 // Fetch more tokens per page
	    	}
	    	
	    	try {
	    		const url = `${baseUrl}/cashtokens/fungible/`
	    		let allTokens = []
	    		let nextUrl = url
	    		let params = filterParams
	    		
	    		// Fetch all pages if there are more results
	    		while (nextUrl) {
	    			const { data } = await axios.get(nextUrl, { params })
	    			
	    			if (!Array.isArray(data.results)) {
	    				break
	    			}
	    			
	    			// Map API response to asset format expected by the component
	    			// API already returns tokens ordered by favorites and favorite_order
	    			const tokens = data.results.map(result => {
	    				// Convert IPFS URLs if needed
	    				const logo = result.image_url ? convertIpfsUrl(result.image_url) : null
	    				
	    				return {
	    					id: result.id,
	    					name: result.name || 'Unknown Token',
	    					symbol: result.symbol || '',
	    					decimals: result.decimals || 0,
	    					logo: logo,
	    					balance: result.balance !== undefined ? result.balance : 0,
	    					favorite: result.favorite === true ? 1 : 0, // Convert boolean to 1/0 format
	    					favorite_order: result.favorite_order !== null && result.favorite_order !== undefined ? result.favorite_order : null
	    				}
	    			})
	    			
	    			allTokens = [...allTokens, ...tokens]
	    			
	    			// Check if there's a next page
	    			if (data.next) {
	    				nextUrl = data.next
	    				params = {} // Don't send params again, URL already has them
	    			} else {
	    				nextUrl = null
	    			}
	    		}
	    		
	    		return allTokens
	    	} catch (error) {
	    		console.error('Error fetching tokens from API:', error)
	    		return []
	    	}
	    },
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