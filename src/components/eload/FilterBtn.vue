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

<q-dialog  v-model="filterDialog" :class="darkMode ? 'text-white' : 'text-black'" class="">
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
			<q-badge v-for="service in filterOption.services" size="md" class="q-px-sm q-py-sm" rounded :outline="!filterData.service.includes(service.name)" :color="darkMode ? 'blue-grey-5' : 'blue-grey-6'" :label="service.name"  @click="updateFilter('service', service.name)"/>
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
import * as eloadServiceAPI from 'src/utils/eload-service.js'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { isProxy, toRaw } from 'vue'

export default {
	data () {
		return {
			darkMode: this.$store.getters['darkmode/getStatus'],
			filterDialog: false,
			filterData: {},
			loading: true,				
			filterOption: {
				services: [],
				sort_types: [ 'DESCENDING', 'ASCENDING']				
			}
		}
	},
	props: {
		filters: Object,		
	},
	computed: {
		isAllServicesSelected() {			
			return this.filterData.service.length === this.filterOption.services.length
		}
	},
	emits: ['updateFilter'],
	watch: {
		filterDialog (val) {
			const vm = this		
			if (!val) {
				let filters = JSON.parse(JSON.stringify(vm.filters))		
			    if (isProxy(filters)) {		
			    	filters = toRaw(filters)
			    }	     

			    if (!Array.isArray(vm.filterData.service)) {
			    	this.setServiceAll()
			    }
			    vm.filterData = filters
			}
		}
	},
	methods: {
		getDarkModeClass,
		updateFilter (type, data) {
			if (type === 'service') {
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

		},
		resetFilters () {
			this.filterData.sort_type = 'DESCENDING'
			this.setServiceAll()
		},
		setServiceAll () {
			this.filterData.service = this.filterOption.services.map(e => e.name)
		}
	},
	async mounted () {		
		const vm = this
		

		let filters = JSON.parse(JSON.stringify(vm.filters))		
	    if (isProxy(filters)) {	    	
	    	filters = toRaw(filters)
	    }	     

	    vm.filterData = filters	    

		let result = await eloadServiceAPI.fetchService()

		if (result.success) {			
			vm.filterOption.services = result.data
		}			

		// initalize service filter
		this.setServiceAll()		

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