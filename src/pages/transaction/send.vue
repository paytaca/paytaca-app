<template>
	<div id="app-container" class="grad">
		<header-nav :useEmitBack="step > 1" @back="handleBack"></header-nav>
		
		<div class="send-container" :style="{ 'margin-top': $q.platform.is.ios ? '69px' : '49px' }">
			<div v-if="step === 1">
				<div class="title-large">Step #1</div>
				<div class="body-large q-pt-md">Select Asset</div>

				<div v-if="assets">
					<div v-show="selectedNetwork === networks.BCH.name">
						<AssetFilter @filterTokens="isCT => isCashToken = isCT" />
						<div>&nbsp</div>			          
			        </div>
			        <div style="margin-top: 20px;">
			        	<q-list>
			        		<q-item clickable v-ripple v-for="(asset, index) in assets" :key="index" class="asset-button" @click="selectAsset(asset)">
			        			<q-item-section avatar>
						          <q-avatar>
						            <img :src="getImageUrl(asset)" width="50" alt="">
						          </q-avatar>
						        </q-item-section>

						        <q-item-section class="text-dark text-left">
						        	<q-item-label class="title-medium">{{ asset.name }}</q-item-label>
							        <q-item-label v-if="asset.id.startsWith('ct/')">
							        	{{ convertTokenAmount(asset.balance, asset.decimals, decimalPlaces=asset.decimals) }} {{ asset.symbol }}
							    	</q-item-label>
							        <q-item-label v-else>
							        	{{ parseAssetDenomination(denomination, asset) }}
							        </q-item-label>						          
						        </q-item-section>
			        		</q-item>
			        	</q-list>
			      </div>
				</div>
					
			</div>	
			<div v-if="step === 2">
				<div class="title-large">Step #2</div>			
				<sendForm
					:assetId="selectedAsset.id"
					:tokenType="1"
					:network="selectedNetwork"
					:address="address"
				/>	
			</div>		
		</div>

		<footer-menu :visible="step === 1"/>	
	</div>
</template>
<script>
import HeaderNav from '../../components/header-nav'
import AssetFilter from '../../components/AssetFilter'
import sendForm from '../../components/ui-revamp/send/send-form.vue'

import { convertTokenAmount } from 'src/wallet/chipnet'
import { parseAssetDenomination } from 'src/utils/denomination-utils'
import { getDarkModeClass, isNotDefaultTheme, isHongKong } from 'src/utils/theme-darkmode-utils'

export default {
	data () {
		return {
			step: 1,
			isCashToken: true,
			networks: { BCH: { name: 'BCH' } },
			selectedAsset: null
		}
	},
	props: {
		address: {
	      type: String,
	      default: ''
	    },
	},
	computed: {
		darkMode () {
	      return this.$store.getters['darkmode/getStatus']
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
		assets () {
	      const vm = this

	      // eslint-disable-next-line array-callback-return
	      const assets = vm.$store.getters['assets/getAssets'].filter(function (item) {
	        if (item) {
	          const isBch = item?.id === 'bch'
	          const tokenType = item?.id?.split?.('/')?.[0]

	          if (vm.isCashToken) return tokenType === 'ct' || isBch
	          return tokenType === 'slp' || isBch
	        }
	      })

	      if (vm.address !== '' && vm.address.includes('bitcoincash:zq')) {
	        return assets.splice(1)
	      }

	      return assets
	    }
	},
	components: {
		HeaderNav,
		AssetFilter,
		sendForm
	},
	async mounted () {
		const vm = this
	    vm.$store.dispatch('market/updateAssetPrices', {})
	    const assets = vm.$store.getters['assets/getAssets']
	    // assets.forEach(a => vm.$store.dispatch('assets/getAssetMetadata', a.id))

	    console.log('assets: ', assets)
	},
	methods: {
		convertTokenAmount,
		parseAssetDenomination,
		getDarkModeClass,
		isNotDefaultTheme,
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
	  selectAsset(asset) {
	  	this.selectedAsset = asset
	  	this.step++	  
	  	console.log('asset: ', asset)
	  },
	  handleBack() {
	  	console.log('handling back btn')
	  	this.step--
	  }
	}
}
</script>
<style lang="scss" scoped>
.send-container {
	text-align: center;
	margin-top: 50px;
}
.group-currency {
    width: 100%;
    border-radius: 7px;
    margin-top: 5px;
    margin-bottom: 5px;
  }
  .pt-label {
    font-size: 16px;
    font-weight: 300;
  }
  .asset-button {
  	background-color: #fff;
    margin: 10px 20px 10px;
    padding: 15px;
    border: 2px solid #4174d9; 
    border-radius: 10px;
  }
</style>