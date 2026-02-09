<template>
	<HeaderNav title="Eload Service" backnavpath="/apps/eload/form" class="header-nav"/>
	
	<div class="">	
		<div class="row justify-between q-px-lg">
			<div class="q-pt-md lg-font-size text-italic q-py-sm" :class="darkMode ? '' : 'text-grey-8'">Orders</div>
			<FilterBtn v-if="!loading" :filters="filters" :services="services" @submit-data="filterOrder"/>	
			<q-btn v-else flat round unelevated ripple dense size="md" icon="filter_list" class="button button-text-primary" padding="none" disable/>
		</div>
	<!-- 	<div v-else class="row justify-between q-px-lg q-pt-md">
			<q-skeleton type="text" width="50%" height="30px" class="q-mb-xs br-15" />  
			<q-skeleton type="text" width="10%" height="30px" class="q-mb-xs br-15" />  
		</div>
 -->

		<!-- Order List -->
		<div v-if="!loading" class="scroll q-mt-md q-px-lg" style="height: 80vh;" :class="darkMode ? 'text-white' : 'text-black'">
			<q-pull-to-refresh @refresh="refresh">
				<div v-if="orders.length == 0" class="relative text-center" style="margin-top: 50px;">
	        <div>
	          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
	          <p :class="{ 'text-black': !darkMode }">{{ $t('NoOrderstoDisplay') }}</p>
	        </div>
	      </div>
				<div v-for="order in orders" class="pointer" @click="selectOrder(order)">
					<div class="row justify-between q-pa-sm">
						<div class="col-8">						
							<div class="text-weight-bold md-font-size">
								{{ getPromoSnapshotData(order.promo_snapshot, 'name') }}
							</div>
							<div class="md-font-size text-grad text-weight-bold">
								PHP {{ getPromoSnapshotData(order.promo_snapshot, 'amount') }}
							</div>
							<div class="sm-font-size subtext">{{ order.bch_amount }} BCH</div>

							<div class="sm-font-size subtext">{{ formatDate(order.created_at, true) }}</div>
						</div>					
						<div class="col-4 text-right">
							<div class="text-capitalize text-weight-bold subtext">{{ order.status }}</div>
						</div>
					</div>					

					<q-separator class="q-my-sm" :dark="darkMode"/>
				</div>

				<div class="text-center text-grad q-pt-md md-font-size text-bold pointer" v-if="!isLastPage" @click="nextPage()">See More</div>
			</q-pull-to-refresh>
		</div>

		<div v-else class="q-mt-md q-px-sm" style="height: 60vh;">
			<q-list>
      	<q-item v-for="n in 4" :key="n">
        	<q-item-section>
          	<div class="q-pb-sm">
            	<div class="row justify-between">
              	<div class="col">
                	<!-- Promo Name -->
                  <q-skeleton type="text" width="50%" height="20px" class="q-mb-xs" />
                  <!-- Amount -->
                  <q-skeleton type="text" width="30%" height="20px" class="q-mb-xs" />
                  <!-- BCH -->
                  <q-skeleton type="text" width="35%" height="22px" class="q-mb-xs" />
                  <!-- Date -->
                  <q-skeleton type="text" width="15%" height="14px" class="q-mb-xs" />                                 
                </div>

                <!-- <div class="col text-right">
	              	<q-skeleton type="text" width="20%" height="20px" class="q-mb-xs" /> 
	              </div> -->                
              </div>              
            </div>

            <q-separator class="q-my-sm"/>
         	</q-item-section>         	
        </q-item>
      </q-list>
		</div>
	</div>
</template>
<script>
import * as eloadServiceAPI from 'src/utils/eload-service.js'
import { formatDate } from 'src/exchange'
import HeaderNav from 'src/components/header-nav.vue'
import FilterBtn from 'src/components/eload/FilterBtn.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
	data () {
		return {
			darkMode: this.$store.getters['darkmode/getStatus'],
			theme: this.$store.getters['global/theme'],
			loading: true,
			orders: [],
			services: [],
			filters: {
				sort_type: 'DESCENDING', // newest first default
				service: []
			},
			paginationSettings: {
				limit: 10,
				page: 1,
				total_pages: 0
			}			
		}
	},
	components: {
		HeaderNav,
		FilterBtn
	},
	computed: {
		isLastPage () {
			const total_page = this.paginationSettings.total_pages
			const page = this.paginationSettings.page

			return page >= total_page
		},
	},
	async mounted () {	
		const vm = this			
		let result = await eloadServiceAPI.fetchService()

		if (result.success) {			
			vm.services = result.data
		}

		this.filters.service = this.services.map(e => e.name)

		await this.fetchOrders()
	},
	methods: {
		getDarkModeClass,
		formatDate,
	    async fetchOrders (overwrite=false) {
	    	let vm = this
	    	vm.loading = true

	    	let data = {
	    		limit: vm.paginationSettings.limit,
	    		page: vm.paginationSettings.page,
	    		filters: vm.filters
	    	}

	    	let result = await eloadServiceAPI.fetchOrders(data)	    	

	    	if (result.success) {
	    		if (overwrite) {
	    			vm.orders = result.data.transactions
	    		} else {	    			
	    			vm.orders.push(...result.data.transactions)
	    		}	    		
	    		vm.paginationSettings.total_pages = result.data.total_pages
	    	}

	    	vm.loading = false
	    },
	    getPromoSnapshotData(snapshot, key) {
	    	return snapshot[key]
	    },	  
	    nextPage() {
	    	this.paginationSettings.page++

	    	this.fetchOrders()
	    },
	    selectOrder (order) {	    	
	    	this.$router.push({ name: 'eload-service-order-details', params: { orderId: order?.id } })
	    },
	    async filterOrder (filter) {
	    	this.filters = filter
	    	await this.fetchOrders(true)
	    },
	    async refresh(done) {
	    	await this.fetchOrders(true)
	    	done()
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
  .subtext {
    font-size: 13px;
    opacity: .5;
  }
   .pointer {
 	cursor: pointer;
 }
</style>