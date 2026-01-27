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

		<!-- Info Card -->		
		<q-card v-if="step > 0" class="q-mx-lg br-15 q-pt-sm q-pb-md q-px-lg q-mt-md">
			<div>
				<div class="sm-font-size q-pt-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Purchase Type</div>

				<div class="row justify-between">
					<div class="text-weight-bold md-font-size">{{ filters.service.name }}</div>				
					<q-icon size="20px" name="sym_o_edit_square" :color="darkMode ? 'grey-5' : 'grey-8'" @click="changeValue('service')"/>
				</div>				
			</div>

			<div v-if="step > 1">
				<div class="sm-font-size q-pt-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Service Provider</div>

				<div class="row justify-between">
					<div class="text-weight-bold md-font-size">{{ filters.serviceGroup.name }}</div>
					<q-icon size="20px" name="sym_o_edit_square" :color="darkMode ? 'grey-5' : 'grey-8'" @click="changeValue('serviceGroup')"/>
				</div>			
			</div>

			<div v-if="step > 2 && filters.category">
				<div class="sm-font-size q-pt-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Category</div>

				<div class="row justify-between">
					<div class="text-weight-bold md-font-size">{{ filters.category.name }}</div>
					<q-icon size="20px" name="sym_o_edit_square" :color="darkMode ? 'grey-5' : 'grey-8'" @click="changeValue('category')"/>
				</div>
			</div>	
		</q-card>

		<!-- Selecting Service Group -->
		<div>
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
					        <q-card outlined class="br-15 text-center text-wrap q-pa-md full-height bg-grad text-white flex flex-center" @click="updateFilters('serviceGroup', group)"> 
					        	<div class="sm-font-size text-weight-bold service-group-text">{{ group.name }}</div>			          
					        </q-card>
				      	</div>
				    </div>
				</div>
			</div>
		</div>

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
						<q-card  v-ripple class="br-15 text-center text-wrap q-pa-md full-height bg-grad text-white flex flex-center" @click="updateFilters('category', category)"> 
					    	<div class="sm-font-size text-weight-bold service-group-text">{{ category.name }}</div>			          
						</q-card>
					</div>
				</div>
			</div>

			<div class="text-center text-grad q-pt-md md-font-size text-bold see-more" v-if="!isLastPage('category')" @click="nextPage('category')">See More</div>
		</div>

		<!-- Select Promo -->
		<div v-if="step === 3">
			<div  class="q-px-lg q-pt-md md-font-size text-italic" :class="darkMode ? 'text-white' : 'text-grey-8'">Select Promo</div>

			<!-- <q-card class="br-15 q-mx-lg"> -->
				<q-list class="scroll-y" @touchstart="preventPull" :style="`max-height: ${minHeight - 250}px`" ref="scrollTarget">
					<q-card class="q-pa-md br-15 q-my-sm q-mx-lg bg-grad text-white" v-ripple v-for="(promo, index) in promos" :key="index" style="overflow: auto;">
						<!-- <q-item-section class="q-pb-sm"> -->
							<div class="md-font-size text-bold">{{ promo.name }}</div>
							<!-- <div :class="darkMode ? 'text-grey-5' : 'text-grey-8'"> -->
								<div>{{ promo.amount }} PHP</div>
								<div>{{ promo.validity }}</div>
							<!-- </div>						 -->
						<!-- </q-item-section> -->
					</q-card>

					<div class="text-center text-grad q-pt-sm md-font-size text-bold see-more" v-if="!isLastPage('promo')" @click="nextPage('promo')">See More</div>		
				</q-list>
			<!-- </q-card>			 -->

			<!-- <div v-for="promo in promos" class="q-px-lg">
				<q-card class="q-pa-md q-my-sm br-15 bg-grad text-white">
					<div class="md-font-size text-weight-bold">
						{{ promo.name }}
					</div>
				</q-card>				
			</div> -->
			
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

			selectedPromo: null,			

			filters:{				
				service: null,
				serviceGroup: null,
				category: null,
			},

			// List
			services: [],
			serviceGroups: [],
			categories: [],
			promos: [],


			paginationSettings: {
				serviceGroup: {
					limit: 20,
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
		'filters.category'(val) {
			if (val) {
				this.step++
				this.fetchPromos()
				// fetch promos
			}
		},
		step (val) {
			if (val === 3) {
				// Get Promos
			}
		}
	},
	computed: {
		minHeight () {
	      return this.$q.platform.is.ios ? this.$q.screen.height - (80 + 120) : this.$q.screen.height - (50 + 100)
	    },
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
					this.resetFilters('service')					
					break
				case 'serviceGroup':
					this.step = 1				
					this.resetFilters('serviceGroup')
					break
				case 'category':
					this.step = 2					

					this.resetFilters('category')
					break
				default:
					this.step--
			}		

			this.resetPagination('category')
			this.resetPagination('promo')
			// this.fetchCategory()
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

			if (type === 'category') {
				this.fetchCategory(true)	
			} else if (type === 'promo') {
				this.fetchPromos(true)
			}
			
		},
		resetPagination (type) {
			this.paginationSettings[type] = {
					limit: type === 'serviceGroup' ? 20 : 9,
					page: 1,
					totalPages: 0
				}
		},		
		resetFilters (type) {
			if (type === 'service') {
				this.filters.service = null		
			}

			if (type === 'service' || type === 'serviceGroup') {
				this.filters.serviceGroup = null	
			}
			
			if (type === 'service' || type === 'serviceGroup' || type === 'category') {
				this.filters.category = null
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
					this.fetchPromos()
				}				
			}			

		},
		async fetchPromos (overflow=false) {
			const vm = this
			const setting = vm.paginationSettings.promo

			let data = {
				limit: setting.limit,
				page: setting.page,
				service: vm.filters.service.name,
				serviceGroup: vm.filters.serviceGroup.name,
			}

			if (vm.filters.category) {
				data.category = vm.filters.category.name
			}

			let result = await eloadServiceAPI.fetchPromo(data)

			if (result.success) {
				if (overflow) {
					this.promos.push(...result.data.promos)
				} else {
					this.promos = result.data.promos
				}				
			}

			this.paginationSettings.promo.totalPages = result.data.total_pages			
		},
		preventPull (e) {
	      let parent = e.target
	      // eslint-disable-next-line no-void
	      while (parent !== void 0 && !parent.classList.contains('scroll-y')) {
	        parent = parent.parentNode
	      }
	      // eslint-disable-next-line no-void
	      if (parent !== void 0 && parent.scrollTop > 0) {
	        e.stopPropagation()
	      }
	    },
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
 .see-more {
 	cursor: pointer;
 }
</style>