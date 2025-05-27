<template>
	<q-card class="card-light card"> 
		<div class="text-center">
			<q-icon name="minimize" size="30px"/>			
		</div>
	</q-card>
</template>
<script>

export default {
	data () {
		return {
			tokenList: []
		}
	},
	props: {
		assets: {
			type: Object,
			default: null
		}
	},
	mounted () {
		console.log('token list: ', this.assets)
	}
}
</script>
<style lang="scss" scoped>
.card {
	position: absolute;
	bottom: 0;
	width: 100%;
	min-height: 225px;
}
</style>