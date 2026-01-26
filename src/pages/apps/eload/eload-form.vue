<template>
	<div class="text-black q-py-md">
		<q-input
			class="q-px-lg"
			dense
			outlined
			rounded
			placeholder="Seach for Promos..."
		>
			<template v-slot:append>
	          <q-icon name="search" />
	        </template>
		</q-input>

		<!-- Selecting Service -->
		<div  class="q-mt-lg" v-if="step === 0">
			<q-card v-for="service in services" id="service-card" class="text-center q-my-sm bg-grad" @click="updateFilters('service', service)">
				<div class="text-capitalize purchase-type text-white text-bold lg-font-size">{{ service.name.toLowerCase() }}</div>
			</q-card>			
		</div>

		<!-- Selecting Service Group -->
		<div class="q-pt-md">
			<!-- Service Display/Edit Card -->
			<q-card v-if="step > 0" class="q-mx-lg br-15 q-py-sm q-px-lg">
				<div class="sm-font-size q-pt-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Purchase Type</div>

				<div class="row justify-between">
					<div class="text-h5 text-weight-bold lg-font-size text-grad">{{ filters.service.name }}</div>				
					<q-icon size="sm" name="sym_o_edit_square" :color="darkMode ? 'grey-5' : 'grey-8'" @click="changeValue('service')"/>
				</div>				
			</q-card>	

			<!-- Service Group Selection -->
			<div v-if="step === 1">
				<div  class="q-px-lg q-pt-md md-font-size text-italic q-py-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Select Service Provider</div>

				<div class="q-px-lg">
				    <div class="row q-col-gutter-sm">
				    	<div
				    		v-for="(group, index) in serviceGroups"
				    		:key="index"
				    		class="col-4 col-sm-4"
				     	>
					        <q-card class="br-15 text-center text-wrap q-pa-md full-height bg-grad text-white flex flex-center" @click="updateFilters('serviceGroup', group)"> 
					        	<div class="sm-font-size text-weight-bold service-group-text">{{ group.name }}</div>			          
					        </q-card>
				      	</div>
				    </div>
				</div>
			</div>
		</div>

		<!-- Service Group Display/Edit Card -->
		<q-card v-if="step > 1" class="q-mx-lg br-15 q-py-sm q-px-lg q-mt-lg">
			<div class="sm-font-size q-pt-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Service Provider</div>

			<div class="row justify-between">
				<div class="text-h5 text-weight-bold lg-font-size text-grad">{{ filters.serviceGroup.name }}</div>
				<q-icon size="sm" name="sym_o_edit_square" :color="darkMode ? 'grey-5' : 'grey-8'" @click="changeValue('serviceGroup')"/>
			</div>			
		</q-card>	

		<!-- Category Selection -->
		<div v-if="step === 2">
			<div  class="q-px-lg q-pt-md md-font-size text-italic q-py-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Select Category</div>

			<div class="q-px-lg">
				<div class="row q-col-gutter-sm">
					<div
						v-for="(category, index) in categories"
				    	:key="index"
				    	class="col-4 col-sm-4"
					>
						<q-card class="br-15 text-center text-wrap q-pa-md full-height bg-grad text-white flex flex-center" @click="updateFilters('category', category)"> 
					    	<div class="sm-font-size text-weight-bold service-group-text">{{ category.name }}</div>			          
						</q-card>
					</div>
				</div>
			</div>

			<div class="text-center text-grad q-pt-md md-font-size text-bold" v-if="!isLastPage('category')" style="cursor: pointer;" @click="nextPage('category')">See More</div>
		</div>

		<!-- Select Promo -->
		<div v-if="step === 3">
			<div  class="q-px-lg q-pt-md md-font-size text-italic q-py-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Select Promo</div>
		</div>
	</div>
</template>
<script>
import * as eloadServiceAPI from 'src/utils/eload-service.js'
// Note: service = purchaseType; service-group = serviceProviders

export default {
	data() {
		return {
			darkMode: this.$store.getters['darkmode/getStatus'],
			loading: true,
			step: 0,
			icons: {

			},			
			filters:{				
				service: null, //service
				serviceGroup: null, //service-group
				category: null, // category // allow all
			},
			services: [],
			serviceGroups: [],
			categories: [],
			promos: [],
			paginationSettings: {
				serviceGroup: {
					limit: 9,
					page: 1,
					totalPages: 0
				},
				category: {
					limit: 9,
					page: 1,
					totalPages: 0
				},
				promo: {
					limit: 9,
					page: 1,
					totalPages: 0
				}
			}
		}
	},
	watch: {
		'filters.service'(val) {
			if (val) {
				this.step++
				this.fetchServiceGroup()
			}
		},
		'filters.serviceGroup'(val) {
			if (val) {
				this.step++
				this.fetchCategory()

			}
		},
		step (val) {
			if (val === 3) {
				// Get Promos
			}
		}
	},
	async mounted () {
		const vm = this

		let result = await eloadServiceAPI.fetchService()

		if (result.success) {			
			vm.services = result.data
		}	

		// Fetch Services
		vm.loading = false
	},
	methods: {
		updateFilters(type, name) {
			this.filters[type] = name	
		},
		changeValue (type) {
			this.filters[type] = null

			switch (type) {
				case 'service':
					this.step = 0
					break
				case 'serviceGroup':
					this.step = 1
					this.resetPagination('category')
					break
				default:
					this.step--
			}			

		},
		getTotalPages (type) {
			return this.paginationSettings[type].totalPages
		},	
		isLastPage (type) {
			const total_page = this.getTotalPages(type)
			const page = this.paginationSettings[type].page

			return page >= total_page
		},
		nextPage(type) {
			this.paginationSettings[type].page++

			this.fetchCategory(true)
		},
		resetPagination (type) {
			this.paginationSettings[type] = {
					limit: 9,
					page: 1,
					totalPages: 0
				}
		},
		async fetchServiceGroup() {			
			let data = {
				service: this.filters.service,
				limit: 10,
				page: 1
			}

			let result = await eloadServiceAPI.fetchServiceGroup(data)			
			if (result.success) {				
				this.serviceGroups = result.data.service_group
				this.paginationSettings.serviceGroup.totalPages = result.data.total_pages
			}
		},
		async fetchCategory(overflow=false) {
			const vm = this
			const setting = vm.paginationSettings.category
			
			let data = {
				serviceGroup: this.filters.serviceGroup,
				limit: setting.limit,
				page: setting.page
			}

			let result = await eloadServiceAPI.fetchCategory(data)

			if (result.success) {
				if (overflow) {
					this.categories.push(...result.data.category)
				} else {
					this.categories = result.data.category
				}
				this.paginationSettings.category.totalPages = result.data.total_pages	

				if (this.categories.length <= 1) {
					this.step++
				}				
			}			

		},
		async fetchPromos () {
			const vm = this


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

/* ==================== CUSTOM STYLE ==================== */
  #service-card {
    margin: 0px 20px 10px 20px;
    border-radius: 15px;
    height: 80px;
    .bch-skeleton {
      height: 53px;
      width: 100%
    }
  }
  .purchase-type { 
  	margin-top: 28px; 	  	
 } 
 .service-group-text {
 	white-space: normal; /* allow wrapping */ 
 	word-wrap: break-word; /* legacy support */ 
 	overflow-wrap: break-word; /* modern browsers */
 }
</style>