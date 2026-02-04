<template>
	<HeaderNav title="Eload Service" backnavpath="/apps/eload/form" class="header-nav"/>
	
	<div class="q-px-lg">	
		<div class="row justify-between">
			<div class="q-pt-md lg-font-size text-italic q-py-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Transactions</div>
			<q-btn 
				flat 
				round 
				unelevated
        		ripple
        		dense
				size="md"
        		icon="filter_list"
        		class="button button-text-primary"
        		@click=""
        	/>		
		</div>

		<!-- Order List -->
		<div v-if="!loading" class="scroll q-mt-md" style="height: 80vh;" :class="darkMode ? 'text-white' : 'text-black'">
			<q-pull-to-refresh @refresh="refresh">
				<div v-for="order in orders" class="pointer">
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
							<div class="md-font-size text-capitalize text-weight-bold subtext">{{ order.status }}</div>
						</div>
					</div>					

					<q-separator class="q-sy-md" :dark="darkMode"/>
				</div>

				<div class="text-center text-grad q-pt-md md-font-size text-bold pointer" v-if="!isLastPage" @click="nextPage()">See More</div>
			</q-pull-to-refresh>
		</div>
	</div>
</template>
<script>
import * as eloadServiceAPI from 'src/utils/eload-service.js'
import { formatDate } from 'src/exchange'
import HeaderNav from 'src/components/header-nav.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
	data () {
		return {
			darkMode: this.$store.getters['darkmode/getStatus'],
			theme: this.$store.getters['global/theme'],
			loading: true,
			orders: [],
			filters: {
				sort_type: 'DESCENDING', // newest first default
				service: 'ALL'
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
	},
	computed: {
		isLastPage () {
			const total_page = this.paginationSettings.total_pages
			const page = this.paginationSettings.page

			return page >= total_page
		},
	},
	async mounted () {				
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

	    	console.log('orders: ', vm.orders)

	    	vm.loading = false
	    },
	    getPromoSnapshotData(snapshot, key) {
	    	return snapshot[key]
	    },
	    nextPage() {
	    	this.paginationSettings.page++

	    	this.fetchOrders()
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