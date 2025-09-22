<template>
	<div id="app-container" :class="getDarkModeClass(darkmode)">
		<header-nav
	      :title="$t(isHongKong(currentCountry) ? 'Points' : 'Tokens')"
	      backnavpath=""
	    ></header-nav>
		<div :class="darkmode ? 'text-white' : 'text-black'">

			<div class="row" v-if="!editAssets"> 
				<div class="col">
					<div class="row q-px-lg">						
						<q-btn round flat padding="3px" @click="checkMissingAssets({autoOpen: true})">
							<q-icon class="primary-filter" size="25px" name="img:scan.svg"/>
						</q-btn>
						<q-btn round class="q-ml-sm" flat padding="3px" @click="editAssets = true">
							<q-icon class="primary-filter" size="25px" name="edit"/>
						</q-btn>
					</div>					
				</div>

				<div class="col text-right">
					<div class="row">
						<div class="col">
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
			<div v-else>
				<div class="q-px-lg text-right">
					<q-btn class="q-mr-md" flat round size="18px" padding="3px" icon="save_as" color="primary" @click="saveCustomList()"/>
					<q-btn flat round padding="3px" icon="close" color="red" @click="editAssets = false"/>
				</div>
			</div>

			<div class="full-width" :class="darkmode ? 'text-white' : 'text-black'" style="margin-top: 20px ; margin-bottom: 120px;">
			    <q-list v-if="assetList.length > 0" :key="assetListKey" class="q-ma-md">
			      	<draggable			      		
			      		:list="assetList" 
						group="assets" 
						@start="drag=true" 
						@end="drag=false" 
						handle=".handle"
						item-key="id"
			      	>
			      	    <template #item="{element: asset, index}"> 
			      	    	<q-card class="q-py-sm q-my-sm br-15">
			      	    		<q-item>
			      	    			<i v-if="editAssets" class="q-pl-sm fa fa-align-justify handle"></i>			      	    			      	    	
								      <q-item-section avatar class="q-pl-md">
								          <q-avatar>
								            <img :src="asset.logo">
								          </q-avatar>
								        </q-item-section>
								        <q-item-section>
								        	<div class="text-bold ">{{ asset.name}}</div>
								        	<div :class="darkmode ? 'text-grey-5' : 'text-grey-8'">
								      			{{ formatAssetTokenAmount(asset) }}			      			
								      		</div>
								        </q-item-section>
								      	<q-item-section side  v-if="!editAssets">			      		
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
								      	<q-item-section side v-else>	
								      		<q-btn round flat padding="3px" @click="removeAsset(asset)">		      		
								      			<q-icon name="delete" color="gray"></q-icon>			      						      				      	
								      		</q-btn>
								      	</q-item-section>

								      	<!-- <q-separator class="q-mt-md"/> -->
			      	    		</q-item>			      	    	
						      </q-card>
			      	    </template>			      
			        </draggable>  
			    </q-list>
			    <div v-else class="text-center" style="margin-top: 50px;">
		            <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
		            <p :class="{ 'text-black': !darkMode }">{{ $t('No Assets To Display') }}</p>
		          </div>
			  </div>	
		</div>

		<!-- <div class="text-black">
			<draggable 
			  v-model="assetList" 
			  group="assets" 
			  @start="drag=true" 
			  @end="drag=false" 
			  item-key="id">
			  <template #item="{element}">
			    <div>{{element.name}}</div>
			   </template>
			</draggable>
		</div> -->
		<footer-menu ref="footerMenu" />
		<TokenSuggestionsDialog
	      ref="tokenSuggestionsDialog"
	      v-model="showTokenSuggestionsDialog"
	      :bch-wallet-hash="getWallet('bch').walletHash"
	      :slp-wallet-hash="getWallet('slp').walletHash"
	      :sbch-address="getWallet('sbch').lastAddress"
	      @update:modelValue="() => { 
	      	assetList = assets	      	
	      }"
	    />
	</div>
</template>
<script>
import { isNotDefaultTheme, getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'
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
			favorites: [],
			assetListKey: 0,
			showTokenSuggestionsDialog: false,
			editAssets: false,
			wallet: null,	
			drag: false,				
		}
	},
	computed: {
		darkmode () {
	      return this.$store.getters['darkmode/getStatus']
	    },
	    currentCountry () {
	      return this.$store.getters['global/country'].code
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
		}		
	},
	async mounted () {
		const wallet = await cachedLoadWallet('BCH', this.$store.getters['global/getWalletIndex'])
    this.wallet = markRaw(wallet)
    
		// this.customList = await assetSettings.fetchCustomList()

    // // Initialize Asset Custom List // Saving initial asset list (BCH/sBCH) to server
    // if ('error' in this.customList || Object.keys(this.customList).length === 0) {     	
    // 	const assetIDs = this.assets.map((asset) => asset.id)
    // 	if (this.selectedNetwork === 'BCH') {
    // 		assetSettings.initializeCustomList(assetIDs, [])    		
    // 	} else {    		
    // 		assetSettings.initializeCustomList([], assetIDs)
    // 	}

    // } else {
    // 	// Update Here to checking Favorites from server. Currently using Local storage    	
    // 	this.checkEmptyFavorites()
		// 	this.$store.dispatch('assets/initializeFavorites', this.assets)

		// 	this.assetList = await this.fetchAssetInfo(this.customList[this.selectedNetwork])
    // }

    // this.fetchAssetInfo()

    this.checkEmptyFavorites()
		this.$store.dispatch('assets/initializeFavorites', this.assets)
		
		this.assetList = this.assets

		this.favorites = this.assets.map(asset => asset.favorite)
	},
	methods: {
		getDarkModeClass,
		isHongKong,
		formatAssetTokenAmount(asset) {
	      return convertToTokenAmountWithDecimals(asset?.balance, asset?.decimals).toLocaleString(
	        'en-US', { maximumFractionDigits: parseInt(asset?.decimals) || 0 },
	      )
	    },
	    refreshList() {
	    	this.assetListKey++
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
	    updateFavorite (asset) {
	    	const vm = this	    	
	    	const temp = {
	    		id: asset.id,
	    		favorite: asset.favorite === 0 ? 1 : 0
	    	}	    	
	    	vm.$store.commit('assets/updateAssetFavorite',  temp)
	    	const tempFavorites = this.assets.map(({id, favorite}) =>({ id, favorite }))

	    	saveFavorites(tempFavorites)
	    	// vm.refreshList()
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
	          wallet: vm.$parent.$parent.wallet,
	          currentCountry: vm.currentCountry
	        },
	        component: AddNewAsset
	      }).onOk((asset) => {	       	
	      	vm.assetList = this.assets // update later // add new asset to end
	        // if (asset.data?.id) vm.selectAsset(null, asset.data)
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

	        vm.assetList = this.assets
	        vm.editAssets = false
	        vm.$emit('removed-asset', asset)
	      }).onCancel(() => {
	      	// this.editAssets = false	      	
	      })
	    },
	    saveCustomList () {
	    	this.customList[this.selectedNetwork] = this.assets.map((asset) => asset.id)



	    	assetSettings.saveCustomList(this.customList)
	    	this.editAssets = false
	    },
	    async fetchAssetInfo (list) {
	    	let temp = []

	    	for (const id of list) {	    		
	    		const asset = await this.$store.getters['assets/getAsset'](id)

	    		if (asset) {	    			
	    			temp.push(asset[0])
	    		}	    		
	    	}	    	
	    	return temp
	    }
	}	
}
</script>
<style lang="scss" scoped>
.handle {
  float: left;
  padding-top: 8px;
  padding-bottom: 8px;
  color:gray; 
}
.asset-item {	
	background-color: #dce9e9 !important; 
}
</style>