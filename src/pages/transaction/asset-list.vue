<template>
	<div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkmode)">
		<header-nav
	      :title="$t(isHongKong(currentCountry) ? 'Points' : 'Tokens')"
	      backnavpath=""
	    ></header-nav>
	    
	    <!-- Instructional Text -->
	    <div v-if="isloaded" class="q-px-lg text-center" style="padding-top: 4px; padding-bottom: 8px;">
	    	<p :class="darkmode ? 'text-grey-4' : 'text-grey-8'" class="text-body2" style="font-size: 14px; line-height: 1.5; letter-spacing: 0.2px; margin: 0;">
	    		{{ $t('TokensInstruction') }}
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
	    		<div v-for="i in 8" :key="i" class="q-my-sm">
	    			<div class="asset-row" :class="getDarkModeClass(darkmode)">
	    				<div style="width: 28px; flex-shrink: 0;">
	    					<q-skeleton type="QIcon" size="20px" />
	    				</div>
	    				<div style="width: 48px; height: 48px; flex-shrink: 0; border-radius: 14px; overflow: hidden;">
	    					<q-skeleton type="QAvatar" size="48px" />
	    				</div>
	    				<div style="flex: 1; min-width: 0;">
	    					<q-skeleton type="text" width="60%" height="18px" />
	    					<q-skeleton type="text" width="40%" height="14px" class="q-mt-xs" />
	    				</div>
	    				<div style="flex-shrink: 0;">
	    					<q-skeleton type="QBtn" width="30px" height="30px" />
	    				</div>
	    			</div>
	    		</div>
	    	</q-list>
	    </div>
	    
		<div :class="darkmode ? 'text-white' : 'text-black'" v-show="isloaded">

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

			<div class="full-width tokens-list-container" :class="darkmode ? 'text-white' : 'text-black'" style="margin-top: 12px ;">
			    <q-list v-if="visibleAssetList.length > 0" :key="assetListKey" class="q-ma-md">
				       	<draggable			      		
			       			:list="visibleAssetList" 
							group="assets" 
							@start="drag=true" 
							@change="onDragChange"
							@end="onDragEnd" 
							handle=".handle"
							item-key="id"
							:animation="600"
							:transition-duration="600"
							class="asset-list-transition"
			       		>
			      	    <template #item="{element: asset, index}"> 
			      	    	<q-slide-item ref="slideRefs" @right="onSwipeRight(asset, $event)" right-color="grey" class="q-my-sm">
			      	    		<template v-slot:right>
			      	    			<div class="row items-center q-px-md">
			      	    				<q-icon name="visibility_off" size="24px" color="white" />
			      	    			</div>
			      	    		</template>
			      	    		<div
			      	    		  class="asset-row"
			      	    		  :class="[
			      	    		    getDarkModeClass(darkmode),
			      	    		    { 'has-drag-handle': asset.favorite === 1 || asset.favorite === true }
			      	    		  ]"
			      	    		>
			      	    		  <div
			      	    		    v-if="asset.favorite === 1 || asset.favorite === true"
			      	    		    class="asset-left handle drag-handle"
			      	    		  >
			      	    		    <q-icon name="drag_indicator" size="20px" :color="darkmode ? 'grey-5' : 'grey-7'" />
			      	    		  </div>
			      	    		  <div
			      	    		    v-else
			      	    		    class="asset-left hide-btn"
			      	    		    @click.stop="hideAsset(asset)"
			      	    		  >
			      	    		    <q-icon name="visibility" size="20px" :color="darkmode ? 'grey-5' : 'grey-7'" />
			      	    		  </div>
			      	    		  <div class="asset-icon-tile">
			      	    		    <q-avatar>
			      	    		      <img
			      	    		        :src="getImageUrl(asset)"
			      	    		        class="asset-icon"
			      	    		        @contextmenu.prevent
			      	    		        @selectstart.prevent
			      	    		      >
			      	    		    </q-avatar>
			      	    		  </div>
			      	    		  <div class="asset-info">
			      	    		    <div class="asset-name" :class="getDarkModeClass(darkmode)">{{ asset.name }}</div>
			      	    		    <div class="asset-balance" :class="getDarkModeClass(darkmode)">{{ formatAssetTokenAmount(asset) }} {{ asset.symbol }}</div>
			      	    		  </div>
			      	    		  <div class="asset-right">
			      	    		    <q-spinner
			      	    		      v-if="favoriteLoading[asset.id]"
			      	    		      size="2em"
			      	    		      color="amber-6"
			      	    		    />
			      	    		    <q-rating
			      	    		      v-else
			      	    		      readonly
			      	    		      v-model="asset.favorite"
			      	    		      max="1"
			      	    		      size="2em"
			      	    		      color="amber-6"
			      	    		      icon="star_border"
			      	    		      icon-selected="star"
			      	    		      @click.stop="updateFavorite(asset)"
			      	    		    />
			      	    		  </div>
			      	    		</div>
						      </q-slide-item>
			      	    </template>			      
			        </draggable>  
			    </q-list>
			    <div v-else-if="isloaded && !networkError" class="text-center" style="margin-top: 50px;">
		            <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
		            <p :class="darkmode ? 'text-white' : 'text-black'">{{ $t('NoTokensToDisplay') }}</p>
		          </div>

			    <!-- Hidden assets section -->
			    <div v-if="hiddenAssetList.length > 0" class="hidden-assets-section q-ma-md">
			      <q-btn
			        flat
			        no-caps
			        dense
			        class="show-hidden-btn"
			        :class="getDarkModeClass(darkmode)"
			        :icon="showHidden ? 'expand_less' : 'expand_more'"
			        :label="showHidden
			          ? $t('HideHiddenAssets', {}, 'Hide hidden assets')
			                            : $t('ShowHiddenAssets', { count: hiddenAssetList.length }, 'Show hidden assets')"
			        @click="showHidden = !showHidden"
			      />
			      <q-list v-if="showHidden" class="q-mt-sm">
			        <q-slide-item
			          v-for="asset in hiddenAssetList"
			          :key="'hidden-' + asset.id"
			          @right="onSwipeUnhide(asset)"
			          right-color="green"
			          class="q-my-sm"
			        >
			          <template v-slot:right>
			            <div class="row items-center q-px-md">
			              <q-icon name="visibility" size="24px" color="white" />
			            </div>
			          </template>
			          <div
			            class="asset-row asset-row-hidden"
			            :class="getDarkModeClass(darkmode)"
			          >
			            <div class="asset-left hide-btn" @click.stop="onSwipeUnhide(asset)">
			              <q-icon name="visibility_off" size="20px" :color="darkmode ? 'grey-5' : 'grey-7'" />
			            </div>
			            <div class="asset-icon-tile">
			              <q-avatar>
			                <img :src="getImageUrl(asset)" class="asset-icon" @contextmenu.prevent @selectstart.prevent>
			              </q-avatar>
			            </div>
			            <div class="asset-info">
			              <div class="asset-name" :class="getDarkModeClass(darkmode)">{{ asset.name }}</div>
			              <div class="asset-balance" :class="getDarkModeClass(darkmode)">{{ formatAssetTokenAmount(asset) }} {{ asset.symbol }}</div>
			            </div>
			          </div>
			        </q-slide-item>
			      </q-list>
			    </div>

		      <div class="banner" v-if="networkError">
		      	<q-banner class="bg-primary text-white">
		      		<div class="row justify-between q-pt-xs q-px-sm">
                <div class="text-italic" style="font-size: 15px;">
                  {{ $t('NetworkErrorTryAgainLater') }}
                </div>
	              <div>
	              	<q-btn flat padding="none" color="white" size="md" icon="refresh" @click="loadData()"/>
	              </div>
              </div>                      
		      	</q-banner>
		      </div>
			  </div>	
			  
		</div>

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
import { hideAsset, unhideAsset, getHiddenAssetIds } from 'src/utils/hidden-assets'

import headerNav from 'src/components/header-nav'
import AssetFilter from '../../components/AssetFilter'
import RemoveAsset from 'src/pages/transaction/dialog/RemoveAsset'
import { showLimitDialogWithDeps } from 'src/composables/useTieredLimitGate'

export default {
	data () {
		return {
			isCashToken: true,
			assetList: [],
			assetListKey: 0,			
			wallet: null,	
			drag: false,	
			isloaded: false,
			networkError: false,
			favoriteLoading: {}, // { [assetId]: boolean }
			showHidden: false,
			hiddenIds: [],
		}
	},
	computed: {
		darkmode () {
	      return this.$store.getters['darkmode/getStatus']
	    },
	    favoriteMutationInProgress () {
	    	// Avoid Object.values for older WebViews without polyfills
	    	const loadingMap = this.favoriteLoading || {}
	    	for (const key in loadingMap) {
	    		if (loadingMap[key]) return true
	    	}
	    	return false
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
	    walletHash () {
	      return this.wallet?.BCH?.walletHash || this.wallet?.bch?.walletHash || ''
	    },
	    visibleAssetList () {
	      const hidden = this.hiddenIds
	      if (!hidden.length) return this.assetList
	      return this.assetList.filter(a => !hidden.includes(a.id))
	    },
	    hiddenAssetList () {
	      const hidden = this.hiddenIds
	      if (!hidden.length) return []
	      return this.assetList.filter(a => hidden.includes(a.id))
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
	unmounted() {
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
	    async loadData(silent = false) {
	    	if (!silent) this.isloaded = false
	    	this.networkError = false

	    	// register / get auth
		    // IMPORTANT: favorites endpoints require the correct wallet-hash header AND matching auth token.
		    // When viewing SLP tokens, authenticate using the SLP wallet hash.
		    const slpWalletHash = this.wallet?.SLP?.walletHash || this.wallet?.slp?.walletHash
		    if (this.isCashToken) {
		    	await assetSettings.authToken()
		    } else if (slpWalletHash) {
		    	await assetSettings.authTokenForWallet({ walletHash: slpWalletHash })
		    } else {
		    	// Fallback to BCH auth (may be insufficient for saving SLP favorites)
		    	await assetSettings.authToken()
		    }

		    // Always fetch tokens directly from API - completely ignore Vuex store
		    // Fetch either CashTokens or SLP fungible tokens depending on selector.
		    if (this.isCashToken) {
		    	try {
		    		const directTokens = await this.fetchTokensDirectlyFromAPI()
		    		this.assetList = directTokens

		    		directTokens.forEach(token => {
		    			if (!token.name || token.name === 'Unknown Token' || !token.symbol || !token.logo) {
		    				this.$store.dispatch('assets/getAssetMetadata', token.id).then(metadata => {
		    					if (metadata) {
		    						const idx = this.assetList.findIndex(t => t.id === token.id)
		    						if (idx !== -1) {
		    							this.assetList = [
		    								...this.assetList.slice(0, idx),
		    								{ ...this.assetList[idx], ...metadata },
		    								...this.assetList.slice(idx + 1),
		    							]
		    							this.assetListKey++
		    						}
		    					}
		    				}).catch(err => {
		    					console.warn(`[AssetList] Failed to fetch BCMR metadata for ${token.id}:`, err)
		    				})
		    			}
		    		})
		    	} catch (error) {
		    		console.error('Error fetching tokens from API:', error)
		    		this.networkError = true
		    		this.assetList = []
		    	}
		    } else {
		    	try {
		    		const slpTokens = await this.fetchSlpTokensDirectlyFromAPI()
		    		this.assetList = slpTokens
		    	} catch (error) {
		    		console.error('Error fetching SLP tokens from API:', error)
		    		this.networkError = true
		    		this.assetList = []
		    	}
		    }

		    this.isloaded = true
		    this.refreshHiddenIds()
	    },
	    refreshHiddenIds () {
	    	this.hiddenIds = getHiddenAssetIds(this.walletHash)
	    },
	    refreshList() {
	    	this.assetListKey++
	    },
    onDragChange (event) {
      if (event.moved) {
        const hidden = this.hiddenIds
        const reorderedVisible = [...this.visibleAssetList]
        const hiddenAssets = this.assetList.filter(a => hidden.includes(a.id))
        this.assetList = [...reorderedVisible, ...hiddenAssets]
      }
    },
    async onDragEnd() {
    		this.drag = false
    		
    		// Ensure favorites remain grouped at the top after manual reordering
    		// Only reorder visible (non-hidden) assets
    		const hidden = this.hiddenIds
    		const visible = this.assetList.filter(a => !hidden.includes(a.id))
    		const favorites = visible.filter(asset => asset.favorite === 1 || asset.favorite === true)
    		const nonFavorites = visible.filter(asset => asset.favorite === 0 || asset.favorite === false)
    		const reorderedVisible = [...favorites, ...nonFavorites]
    		// Merge reordered visible assets back with hidden ones
    		const hiddenAssets = this.assetList.filter(a => hidden.includes(a.id))
    		this.assetList = [...reorderedVisible, ...hiddenAssets]
    		
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
    		let allFavoritesData = [...favoritesWithOrder, ...nonFavoritesData]
    		
		// Preserve hidden favorites that aren't in the current view
		// Assign them sequential orders after visible favorites to avoid conflicts
		const hiddenFavorites = this.assetList.filter(a => hidden.includes(a.id) && (a.favorite === 1 || a.favorite === true))
		let hiddenOrder = favorites.length + 1
		hiddenFavorites.forEach(fav => {
			if (!allFavoritesData.some(data => data.id === fav.id)) {
				allFavoritesData.push({
					id: fav.id,
					favorite: 1,
					favorite_order: hiddenOrder++
				})
			}
		})
    		
    		try {
    			const slpWalletHash = this.wallet?.SLP?.walletHash || this.wallet?.slp?.walletHash
    			await assetSettings.saveFavorites(allFavoritesData, {
    				walletHash: this.isCashToken ? undefined : slpWalletHash
    			})
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
    async updateFavorite (favAsset) {
    	if (!favAsset?.id) return
    	if (this.favoriteMutationInProgress) return
    	this.favoriteLoading = { ...this.favoriteLoading, [favAsset.id]: true }

    	const wasFavorite = favAsset.favorite === 1 || favAsset.favorite === true

    	try {
    		// If adding a favorite, check subscription limit first
    		if (!wasFavorite) {
    			const limit = this.$store.getters['subscription/getLimit']('favoriteTokens')
    			let tokenFavoritesIds = new Set()
    			try {
    				const tokens = this.isCashToken
    					? await this.fetchTokensDirectlyFromAPI()
    					: await this.fetchSlpTokensDirectlyFromAPI()
    				tokenFavoritesIds = new Set(
    					(Array.isArray(tokens) ? tokens : [])
    						.filter(t => t && t.id && (t.favorite === 1 || t.favorite === true))
    						.map(t => t.id)
    				)
    			} catch (e) { /* best-effort */ }

    			const currentFavoriteCount = tokenFavoritesIds.size
    			const isAlreadyFavorite = tokenFavoritesIds.has(favAsset.id)

    			if (!isAlreadyFavorite && currentFavoriteCount >= limit) {
    				await showLimitDialogWithDeps(
    					{ $q: this.$q, $store: this.$store },
    					'favoriteTokens',
    					{ darkMode: this.darkmode, forceRefresh: true }
    				)
    				return
    			}
    		}

    		// Toggle favorite locally for immediate UI feedback
    		this.assetList = this.assetList.map(asset =>
    			asset.id === favAsset.id ? { ...asset, favorite: wasFavorite ? 0 : 1 } : asset
    		)

    		// Build favorites data from current state
    		const slpWalletHash = this.wallet?.SLP?.walletHash || this.wallet?.slp?.walletHash
    		const currentFavorites = await assetSettings.fetchFavorites({
    			forceRefresh: true,
    			walletHash: this.isCashToken ? undefined : slpWalletHash
    		})
    		const apiFavorites = Array.isArray(currentFavorites) ? currentFavorites : []

    		// Build the full favorites list to save
    		// Favorites in current view get sequential orders; out-of-view favorites follow
    		const inViewFavorites = this.assetList.filter(a => a.favorite === 1 || a.favorite === true)
    		const inViewNonFavorites = this.assetList.filter(a => a.favorite === 0 || a.favorite === false)
    		const inViewIds = new Set(this.assetList.map(a => a.id))

    		let order = 1
    		const favoritesData = inViewFavorites.map(a => ({
    			id: a.id,
    			favorite: 1,
    			favorite_order: order++
    		}))

    		inViewNonFavorites.forEach(a => {
    			favoritesData.push({ id: a.id, favorite: 0, favorite_order: null })
    		})

    		// Preserve out-of-view favorites (zero balance, etc.) with non-conflicting orders
    		apiFavorites.forEach(fav => {
    			if (!inViewIds.has(fav.id) && (fav.favorite === 1 || fav.favorite === true)) {
    				favoritesData.push({ id: fav.id, favorite: 1, favorite_order: order++ })
    			}
    		})

    		await assetSettings.saveFavorites(favoritesData, {
    			walletHash: this.isCashToken ? undefined : slpWalletHash
    		})

    		// Reload from API to get the correct ordering (source of truth)
    		await this.loadData(true)
    	} finally {
    		this.favoriteLoading = { ...this.favoriteLoading, [favAsset.id]: false }
    	}
    },
	    getWallet (type) {
	      return this.$store.getters['global/getWallet'](type)
	    },
	    onSwipeRight(asset, evt) {
	      this.hideAsset(asset, evt)
	    },
	    hideAsset (asset, slideEvt) {
	      const vm = this
	      vm.$q.dialog({
	        component: RemoveAsset,
	        componentProps: {
	          assetName: asset.name
	        }
	      }).onOk(() => {
	        hideAsset(vm.walletHash, asset.id)
	        vm.refreshHiddenIds()
	        vm.$emit('removed-asset', asset)
	      }).onCancel(() => {
	        if (slideEvt?.reset) slideEvt.reset()
	      })
	    },
	    onSwipeUnhide(asset) {
	      unhideAsset(this.walletHash, asset.id)
	      this.refreshHiddenIds()
	      const index = this.assetList.findIndex(a => a.id === asset.id)
	      if (index !== -1) {
	        const [unhidden] = this.assetList.splice(index, 1)
	        this.assetList.push(unhidden)
	      }
	    },
	    async fetchTokensDirectlyFromAPI () {
	    	if (!this.isCashToken) {
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
	    				const logo = result.image_url ? convertIpfsUrl(result.image_url) : null

	    				const storeAssets = this.$store.getters['assets/getAsset'](result.id)
	    				const storeAsset = Array.isArray(storeAssets) && storeAssets.length > 0 ? storeAssets[0] : null

	    				return {
	    					id: result.id,
	    					name: storeAsset?.name || result.name || 'Unknown Token',
	    					symbol: storeAsset?.symbol || result.symbol || '',
	    					decimals: storeAsset?.decimals !== undefined ? storeAsset.decimals : (result.decimals || 0),
	    					logo: storeAsset?.logo || logo,
	    					balance: result.balance !== undefined ? result.balance : 0,
	    					favorite: result.favorite === true || result.favorite === 1 ? 1 : 0,
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
	    async fetchSlpTokensDirectlyFromAPI () {
	    	if (this.isCashToken) return []

	    	// Use wallet from component data instead of calling getWallet (which might trigger balance API calls)
	    	if (!this.wallet) {
	    		console.warn('Wallet not loaded, cannot fetch SLP tokens')
	    		return []
	    	}

	    	const walletHash = this.wallet.SLP?.walletHash || this.wallet.slp?.walletHash
	    	if (!walletHash) {
	    		console.warn('SLP wallet hash not available')
	    		return []
	    	}

	    	const isChipnet = this.$store.getters['global/isChipnet']
	    	const baseUrl = getWatchtowerApiUrl(isChipnet)

	    	const filterParams = {
	    		wallet_hash: walletHash,
	    		limit: 100
	    	}

	    	try {
	    		const url = `${baseUrl}/slp-tokens/fungible/`
	    		let allTokens = []
	    		let nextUrl = url
	    		let params = filterParams

	    		while (nextUrl) {
	    			const { data } = await axios.get(nextUrl, { params })

	    			if (!Array.isArray(data?.results)) {
	    				break
	    			}

	    			const tokens = data.results
	    				.map(result => {
	    					const logo = result?.image_url ? convertIpfsUrl(result.image_url) : null
	    					const tokenId = result?.id
	    					const assetId = tokenId
	    						? (String(tokenId).startsWith('slp/') ? String(tokenId) : `slp/${tokenId}`)
	    						: null
	    					return {
	    						// Normalize IDs to match other pages/store usage (`slp/<tokenId>`)
	    						id: assetId,
	    						name: result?.name || 'Unknown Token',
	    						symbol: result?.symbol || '',
	    						decimals: result?.decimals || 0,
	    						logo: logo,
	    						balance: result?.balance !== undefined ? result.balance : 0,
	    						favorite: result?.favorite === true || result?.favorite === 1 ? 1 : 0,
	    						favorite_order: result?.favorite_order !== null && result?.favorite_order !== undefined ? result.favorite_order : null
	    					}
	    				})
	    				.filter(token => token?.id)
	    				// Match existing behavior of showing tokens with balance
	    				.filter(token => Number(token.balance) > 0)

	    			allTokens = [...allTokens, ...tokens]

	    			if (data.next) {
	    				nextUrl = data.next
	    				params = {} // Don't send params again, URL already has them
	    			} else {
	    				nextUrl = null
	    			}
	    		}

	    		return allTokens
	    	} catch (error) {
	    		console.error('Error fetching SLP tokens from API:', error)
	    		return []
	    	}
	    },
	}	
}
</script>
<style lang="scss" scoped>
// Ensure the last token can scroll above the fixed footer menu
.tokens-list-container {
  padding-bottom: calc(140px + env(safe-area-inset-bottom));
}

// ---- Asset row (matching apps list design) ----
.asset-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 10px;
  cursor: default;
  position: relative;
  -webkit-user-select: none;
  user-select: none;
  border-radius: 10px;
  transition: background 0.15s ease, opacity 0.15s ease;

  &.dark {
    background: rgba(255,255,255,0.03);
    &:active { background: rgba(255,255,255,0.08); }
  }
  &.light {
    background: rgba(0,0,0,0.025);
    &:active { background: rgba(0,0,0,0.06); }
  }
}

.asset-row-hidden {
  opacity: 0.5;
}

.asset-left {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 48px;
  cursor: pointer;
  .q-icon {
    opacity: 0.4;
    transition: opacity 0.2s ease;
  }
  &:hover .q-icon { opacity: 0.8; }
  &.drag-handle {
    cursor: grab;
    &:active { cursor: grabbing; }
    .q-icon { opacity: 0.5; }
    &:hover .q-icon { opacity: 0.8; }
  }
}

.asset-icon-tile {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.asset-info {
  flex: 1;
  min-width: 0;
}

.asset-name {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &.dark { color: #ffffff; }
  &.light { color: #000000; }
}

.asset-balance {
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &.dark { color: rgba(255,255,255,0.75); }
  &.light { color: rgba(0,0,0,0.65); }
}

.asset-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
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
}

// Animation classes for sortable.js
:deep(.sortable-ghost) {
  opacity: 0.3;
  transform: scale(0.95);
}

:deep(.sortable-drag) {
  opacity: 0.9;
  transform: scale(1.05);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  .asset-left.drag-handle {
    cursor: grabbing !important;
  }
}

:deep(.sortable-chosen) {
  background-color: rgba(0, 0, 0, 0.05);
}

// Swipe-to-delete styling
:deep(.q-slide-item) {
  overflow: hidden;
  border-radius: 10px;
}

:deep(.q-slide-item__content) {
  overflow: visible;
}

// Hidden assets section
.hidden-assets-section {
  margin-top: 16px;
  padding-top: 8px;
  border-top: 1px solid rgba(128, 128, 128, 0.15);
}

.show-hidden-btn {
  width: 100%;
  font-size: 13px;
  font-weight: 500;
  opacity: 0.6;
  padding: 8px 0;
  border-radius: 8px;
  &:hover { opacity: 0.8; }
  &.dark { color: rgba(255,255,255,0.6); }
  &.light { color: rgba(0,0,0,0.5); }
}
</style>