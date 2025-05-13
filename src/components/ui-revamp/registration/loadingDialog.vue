<template>
	<q-dialog position="bottom" persistent>
		<q-card :dark="darkmode" :class="darkmode ? 'card-dark' : 'card-light'" class="loading-card">
			<div class="text-center">				
				<div class="headline-small" style="padding-bottom: 10px;">
					Generating Wallet
				</div>
				<q-spinner-oval color="primary" size="5em"/>
			</div>			
		</q-card>
	</q-dialog>
</template>
<script>
	
export default {
	data() {
		return {
			darkmode: this.$store.getters['darkmode/getStatus'],
		}
	}
}
</script>
<style lang="scss" scoped>
.loading-card {
	padding: 24px;
}
</style>