<template>
	<div class="row text-dark asset-list justify-center">
		<q-btn :disable="assetIndex === 0" class="col-2" icon="arrow_back_ios" flat/>
		<q-card class="col-8 asset-card br-15 gradient-bg text-light">
			<div class="row">
				<div class="col-6">
					<q-avatar size="50px">
				      <img src="https://cdn.quasar.dev/img/avatar.png">
				    </q-avatar>
				</div>				
				<div class="col-6 title-medium text-right" style="padding-top: 10px;">
					<div>BCH</div>
					<div>0.05</div> 				
				</div>
			</div>
		</q-card>
		<q-btn class="col-2" icon="arrow_forward_ios" flat/>
	</div>
</template>
<script>

export default {
	data () {
		return {
			assetIndex: 0,
			assetList: [],
		}
	},
	computed: {

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
		console.log('assets: ', this.assets)
	}
}
</script>
<style lang="scss" scoped>
.asset-list {
	margin: 0px 0px 0px;

}
.asset-card {
	padding: 20px;
}
</style>