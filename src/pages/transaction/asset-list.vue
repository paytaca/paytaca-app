<template>
	<div id="app-container" :class="getDarkModeClass(darkmode)">
		<header-nav
	      :title="$t(isHongKong(currentCountry) ? 'Points' : 'Tokens')"
	      backnavpath=""
	    ></header-nav>
		<div :class="darkmode ? 'text-white' : 'text-black'">

			<AssetFilter v-if="!stablehedgeView" @filterTokens="isCT => isCashToken = isCT" />
			<div class="full-width" style="margin-top: 20px ;">
			    <q-list :key="assetListKey" separator class="br-15 q-pa-md">
			      <q-item clickable v-ripple v-for="(asset, index) in assets" class="q-pa-sm">
			      	<q-item-section avatar>
			          <q-avatar>
			            <img :src="asset.logo">
			          </q-avatar>
			        </q-item-section>
			        <q-item-section>
			        	<div class="text-bold ">{{ asset.name}}</div>
			        	<div class="text-grey-8">
			      			{{ formatAssetTokenAmount(asset) }}			      			
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
			     			      
			    </q-list>
			  </div>	
		</div>
		<footer-menu ref="footerMenu" />
	</div>
</template>
<script>
import { isNotDefaultTheme, getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'
import { convertToTokenAmountWithDecimals } from 'src/wallet/chipnet'

import headerNav from 'src/components/header-nav'
import AssetFilter from '../../components/AssetFilter'

export default {
	data () {
		return {
			isCashToken: true,
			favorites: [],
			assetListKey: 0
		}
	},
	computed: {
		darkmode () {
	      return this.$store.getters['darkmode/getStatus']
	    },
	    currentCountry () {
	      return this.$store.getters['global/country'].code
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
	      console.log('here: ')
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
		AssetFilter
	},
	watch: {		
	},
	async mounted () {
		this.checkEmptyFavorites()

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
	    	// vm.refreshList()
	    }
	}	
}
</script>