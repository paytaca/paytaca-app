<template>
	<q-card class="q-pa-md br-15" v-if="filters">			
		<div>
			<!-- <div class="sm-font-size q-pt-sm">Purchase Type</div> -->

			<div class="row justify-between">
				<div class="md-font-size text-weight-bold">
					<q-icon :name="icon" color="primary" size="25px" class="q-pr-sm"/>
					{{ service }}
				</div>				
				<q-icon size="20px" name="sym_o_edit_square"  :color="darkMode ? 'grey-5' : 'grey-8'" @click="changeValue('service')"/>
			</div>				
		</div>		

		<div v-if="step > 1">
			<q-separator class="q-my-sm"/>

			<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Service Provider</div>

			<div class="row justify-between">
				<div class="text-weight-bold">
					{{ serviceGroup }}
				</div>
					
				<q-icon size="20px" name="sym_o_edit_square" :color="darkMode ? 'grey-5' : 'grey-8'" @click="changeValue('serviceGroup')"/>
			</div>			
		</div>

		<div v-if="step > 2 && filters.category">
			<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Category</div>

			<div class="row justify-between">
				<div class="text-weight-bold">
					{{ category }}
				</div>
				
				<q-icon size="20px" name="sym_o_edit_square" :color="darkMode ? 'grey-5' : 'grey-8'" @click="changeValue('category')"/>
			</div>
		</div>	

	</q-card>
</template>
<script>
	
export default {
	data () {
		return {
			darkMode: this.$store.getters['darkmode/getStatus'],
			serviceInfo: {
				eload: {
					altName: 'Mobile E-load',
					icon: 'phone_in_talk',			
				},
				cable: {
					altName: 'Cable Services',
					icon: 'tv',					
				},
				gamepins: {
					altName: 'Gamepins',
					icon: 'gamepad',					
				}
			}
		}
	},
	emits: ['update'],
	props: {
		filters: {
			type: Object,
			default: null
		},
		step: Number,		
	},
	computed: {
		service () {
			const name = this.filters.service.name.toLowerCase()
			return this.serviceInfo[name].altName
		},
		icon () {
			const name = this.filters.service.name.toLowerCase()
			return this.serviceInfo[name].icon
		},
		serviceGroup () {
			return this.filters.serviceGroup.name
		},
		category () {
			return this.filters.category.name
		}
	},
	methods: {
		changeValue(type) {
			this.$emit('update', type)
		}
	}
}
</script>
<style lang="scss" scoped>
/* ==================== FONT SIZES ==================== */
.sm-font-size {
	font-size: small;
}
.md-font-size {
	font-size: medium;
}
.lg-font-size {
	font-size: large;
}
</style>