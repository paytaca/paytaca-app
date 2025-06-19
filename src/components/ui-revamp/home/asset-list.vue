<template>
	<div class="row text-dark asset-list justify-center">
		<q-btn :disable="assetIndex === 0" class="col-2" icon="arrow_back_ios" flat @click="updateAssetIndex('dec')"/>
		<q-card class="col-8 asset-card br-15 gradient-bg text-light">
			<div class="row" v-if="loaded">
				<div class="col-3">
					<q-avatar size="50px">
				      <img src="https://cdn.quasar.dev/img/avatar.png">
				    </q-avatar>
				</div>				
				<div class="col-9 text-right" style="padding-top: 10px;">
					<div class="headline-small">{{ assetList[assetIndex].symbol }}</div>
					<div class="title-medium ">{{ formatAssetTokenAmount(assetList[assetIndex]) }}</div> 				
				</div>
			</div>
			<div v-else>Loading...</div>
		</q-card>
		<q-btn :disable="isLastIndex" class="col-2" icon="arrow_forward_ios" flat @click="updateAssetIndex('inc')"/>
	</div>
</template>
<script>
import { convertToTokenAmountWithDecimals } from 'src/wallet/chipnet'

export default {
	data () {
		return {
			assetIndex: 0,
			assetList: [],
			loaded: false
		}
	},
	computed: {
		isLastIndex() {
			return this.assetList.length === this.assetIndex + 1
		}
	},
	props: {
		network: {
	      type: String,
	      default: 'BCH',
	      wallet: { type: Object },
	    },	
		assets: { type: Array }
	},
	async mounted () {
		this.assetList = [...this.assets]
		console.log('assets: ', this.assetList)
		this.loaded = true
	},
	methods: {
		formatAssetTokenAmount(asset) {
	      return convertToTokenAmountWithDecimals(asset?.balance, asset?.decimals).toLocaleString(
	        'en-US', { maximumFractionDigits: parseInt(asset?.decimals) || 0 },
	      )
	    },
	    updateAssetIndex (func) { //inc, dev
	    	if (func === 'inc') {
	    		this.assetIndex++
	    	}
	    	if (func === 'dec') {
	    		this.assetIndex--
	    	}
	    }
	}
}
</script>
<style lang="scss" scoped>
.asset-list {
	margin: 10px 0px 10px;

}
.asset-card {
	padding: 20px;
}
</style>