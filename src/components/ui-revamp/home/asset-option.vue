<template>
	<div class="asset-option text-center" :class="darkmode ? 'text-light' : 'text-dark'">
		<div v-if="enabledStableHedge">
			stablehedge
		</div>
		<div v-else>
			bch
		</div>
	</div>
</template>
<script>

export default {
	data () {
		return {
			
		}
	},
	props: {
		stablehedgeView: {
			type: Boolean,
			default: false
		}
	},
	computed: {
		darkmode () {
			return this.$store.getters['darkmode/getStatus']
		}
	}
}
</script>