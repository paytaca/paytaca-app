<template>
	<q-dialog position="bottom" persistent>
		<q-card :dark="darkmode" :class="darkmode ? 'card-dark' : 'card-light'" class="loading-card">
			<div class="text-center">								
				<div v-if="isloading">
					<div class="headline-small" style="padding-bottom: 10px;">
						{{ getMessage() }}
					</div>
					<div class="body-medium" style="padding-bottom: 10px;">Please wait while we authenticate your login</div>

					<q-spinner-oval color="primary" size="5em"/>
				</div>				
				<div v-else>
					<q-icon name="check_circle" size="5em" style="color: #5FA522;"/>
					<div class="headline-small" style="padding-top: 10px;">
						Authentication Success
					</div>
				</div>
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
	},
	props: {
		type: {
			type: String,
			default: 'wallet-create'
		},
		title: {
			type: String,
			default: ''
		},		
		isloading: {
			type: Boolean,
			default: false
		}
	},
	// mounted () {
	// 	if (this.type === 'wallet-create') {
	// 		this.isloading = true
	// 	}
	// },	
	methods: {		
		getMessage () {
			switch (this.type) {
				case 'wallet-create':
					return 'Generating Wallet' 
				case '': 
					return
			}
		}
	}
}
</script>
<style lang="scss" scoped>
.loading-card {
	padding: 24px;
}
</style>