<template>
<q-btn 
	flat 
	round 
	unelevated
	ripple
	dense
	size="md"
	icon="filter_list"
	class="button button-text-primary"
	padding="none"
	:disable="loading"
	@click="filterDialog = true"
/>

<q-dialog  v-model="filterDialog" :class="darkMode ? 'text-white' : 'text-black'">
	<q-card class="q-pa-md br-15 full-width">
		<div class="text-center text-weight-bold lg-font-size">Filter and Sort Orders</div>

		<q-separator :dark="darkMode" class="q-my-md"/>

		<!-- Sort Type -->
		<div class="md-fomt-size text text-weight-bold">Sort Type</div>
		<div class="q-gutter-sm q-pt-sm">			
			<q-badge class="q-px-sm q-py-sm" rounded :outline="filterData.sort_type !== 'DESCENDING'" :color="darkMode ? 'blue-grey-5' : 'blue-grey-6'" label="Default: Newest First" @click="updateFilter('sort_type', 'DESCENDING')"/>
			<q-badge class="q-px-sm q-py-sm" rounded :outline="filterData.sort_type !== 'ASCENDING'" :color="darkMode ? 'blue-grey-5' : 'blue-grey-6'" label="Oldest First" @click="updateFilter('sort_type', 'ASCENDING')"/>
		</div>

		<!-- Services -->
		<div class="md-font-size text text-weight-bold q-pt-md">Services</div>
		<div class="q-gutter-sm q-pt-sm" v-if="filterOption.services">			
			<q-badge size="md" class="q-px-sm q-py-sm" rounded :outline="!isAllServicesSelected" :color="darkMode ? 'blue-grey-5' : 'blue-grey-6'" label="Default: ALL" @click="updateFilter('service', 'ALL')"/>
			<q-badge size="md" class="q-px-sm q-py-sm" rounded color="red" label="Clear" @click="updateFilter('service', 'CLEAR')"/>
			<q-badge v-for="service in filterOption.services" size="md" class="q-px-sm q-py-sm" rounded :outline="!selectedServices.includes(service.name)" :color="darkMode ? 'blue-grey-5' : 'blue-grey-6'" :label="service.name"  @click="updateFilter('service', service.name)"/>
		</div>

		<div class="text-center q-pt-sm q-px-sm q-pb-sm">
            <div class="row justify-center q-gutter-sm q-pt-md">
              <q-btn
                rounded
                no-caps
                :label="$t('Reset')"
                class="col-grow button button-text-primary"
                :class="getDarkModeClass(darkMode)"
                outline
                @click="resetFilters()"
              />
              <q-btn	                               
                rounded
                no-caps
                :label="$t('Filter')"
                class="col-grow button"
                :class="getDarkModeClass(darkMode)"
                @click="submitData()"
                v-close-popup
              />
            </div>
          </div>
	</q-card>
</q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
	data () {
		return {
			darkMode: this.$store.getters['darkmode/getStatus'],
			filterDialog: false,
			filterData: {
				sort_type: 'DESCENDING',
				service: []
			},
			loading: true,				
			filterOption: {
				services: [],
				sort_types: [ 'DESCENDING', 'ASCENDING']				
			}
		}
	},
	props: {
		filters: Object,
		services: Array		
	},
	computed: {
		selectedServices () {
			return Array.isArray(this.filterData?.service) ? this.filterData.service : []
		},
		isAllServicesSelected() {			
			const allCount = Array.isArray(this.filterOption?.services) ? this.filterOption.services.length : 0
			if (allCount <= 0) return false
			return this.selectedServices.length === allCount
		}
	},
	emits: ['submitData'],
	watch: {
		filterDialog (val) {
			const vm = this		
			// Initialize safe defaults when opening the dialog.
			if (val) {
				vm.applyIncomingFilters(vm.filters, { defaultAllIfEmpty: false })
			}
		},
		services (val) {
			if (val) {
				this.filterOption.services = val
				// If service filter isn't initialized yet, default to ALL.
				if (!Array.isArray(this.filterData?.service) || this.filterData.service.length === 0) {
					this.setServiceAll()
				}
			}			
		},
	},
	methods: {
		getDarkModeClass,
		clonePlainObject (value) {
			// JSON clone always produces a plain object (not a Vue Proxy).
			// Also avoids `JSON.parse(undefined)` throwing when `filters` is undefined.
			if (value === undefined) return undefined
			try {
				return JSON.parse(JSON.stringify(value))
			} catch (e) {
				return undefined
			}
		},
		applyIncomingFilters (filters, opts = { defaultAllIfEmpty: false }) {
			const vm = this
			const cloned = vm.clonePlainObject(filters)

			vm.filterData = cloned || {}
			if (!vm.filterData.sort_type) vm.filterData.sort_type = 'DESCENDING'

			// Service filter behavior:
			// - If not an array: default to ALL when services exist; otherwise empty array.
			// - If it's an empty array: only default to ALL when requested.
			const hasServices = Array.isArray(vm.filterOption?.services) && vm.filterOption.services.length
			if (!Array.isArray(vm.filterData.service)) {
				if (hasServices) vm.setServiceAll()
				else vm.filterData.service = []
				return
			}

			if (opts?.defaultAllIfEmpty && vm.filterData.service.length === 0 && hasServices) {
				vm.setServiceAll()
			}
		},
		ensureServiceArray () {
			if (!Array.isArray(this.filterData.service)) this.filterData.service = []
		},
		updateFilter (type, data) {
			if (type === 'service') {
				this.ensureServiceArray()
				if (data === 'ALL') {
					if (!this.isAllServicesSelected) {
						this.setServiceAll()
					}					
				} else if (data === 'CLEAR'){
					this.filterData.service = []
				} else {
					if (this.filterData.service.includes(data)) {
						this.filterData.service = this.filterData.service.filter(item => item !== data)
					} else {
						this.filterData.service.push(data)
					}
				}				
			} else {
				this.filterData[type] = data
			}			
		},
		submitData() {
			this.$emit('submitData', this.filterData)
		},
		resetFilters () {
			this.filterData.sort_type = 'DESCENDING'
			this.setServiceAll()
		},
		setServiceAll () {
			this.ensureServiceArray()
			this.filterData.service = this.filterOption.services.map(e => e.name)
		}
	},
	mounted () {		
		const vm = this
		
	    vm.filterOption.services = vm.services || []
	    vm.applyIncomingFilters(vm.filters, { defaultAllIfEmpty: true })
	    

		// initalize service filter
		// this.setServiceAll()		

		vm.loading = false
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

/* ==================== CUSTOM STYLE ==================== */
</style>