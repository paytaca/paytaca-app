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

		<div v-if="showCategory">
			<div v-if="step > 2 && filters.category">
				<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Category</div>

				<div class="row justify-between">
					<div class="text-weight-bold">
						{{ category }}
					</div>
					
					<q-icon size="20px" name="sym_o_edit_square" :color="darkMode ? 'grey-5' : 'grey-8'" @click="changeValue('category')"/>
				</div>
			</div>
		</div>			
	</q-card>
</template>
<script>
import { getEloadServiceInfo } from 'src/utils/eload-service-info'
	
export default {
	data () {
		return {
			darkMode: this.$store.getters['darkmode/getStatus'],
		}
	},
	emits: ['update'],
	props: {
		filters: {
			type: Object,
			default: null
		},
		step: Number,
		showCategory: {
			type: Boolean,
			default: true
		}	
	},
	computed: {
		serviceMeta () {
			const filters = this.filters || {}
			const service = filters.service || {}
			const rawName = typeof service.name === 'string' ? service.name : ''
			return getEloadServiceInfo(rawName)
		},
		service () {
			const filters = this.filters || {}
			const service = filters.service || {}
			const rawName = typeof service.name === 'string' ? service.name : ''

			if (this.serviceMeta?.altName) return this.serviceMeta.altName

			// Fallback to original service name or empty string
			return rawName || ''
		},
		icon () {
			// Fallback to mapped icon if available; otherwise a generic icon
			return this.serviceMeta?.icon || 'help_outline'
		},
		serviceGroup () {
			const filters = this.filters || {}
			const group = filters.serviceGroup || {}
			return group.name || ''
		},
		category () {
			const filters = this.filters || {}
			const category = filters.category || {}
			return category.name || ''
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