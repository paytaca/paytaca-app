<template>
	<div class="pending-order" :class="getDarkModeClass(darkMode)" v-if="!emptyList">		 
		<div class="q-ml-lg q-gutter-x-sm button button-text-primary" style="font-size: 20px;">                
        	{{ $t('Pending') }}
        </div>        
        <div class="pending-list q-mx-lg " :class="darkMode ? 'text-white': 'text-black'">
        	<q-card v-for="item in pending" class="pending-card q-pa-md q-my-sm br-15" @click="selectTransaction(item.id, 'exchange')">
        		<div class="row">
        			<div class="col-7">
        				<!-- Label -->
		        		<q-badge v-if="item.is_cash_in" outline color="primary">Cash In</q-badge>
		        		<q-badge v-else outline color="primary">P2P Exchange</q-badge>

		        		<div class="q-pt-sm text-bold">Order# {{ item.id }}</div>     
		        		<div style="font-size: 12px;">
		        			by {{ counterparty(item) }}
		        		</div>   			
        			</div>
        			<div class="col-5 text-right q-py-lg">
        				<div class="text-bold" :class="darkMode ? 'text-blue-grey-3' : 'text-blue-grey-6'">
        					{{ item.status.label }}
        				</div>
        			</div>
        		</div>         		     	
        	</q-card>
        	<q-card v-for="item in marketplaceOrders" class="pending-card q-pa-md q-my-sm br-15"
   				@click="selectTransaction(item.id, 'marketplace')"
        	>
        		<div class="row">
        			<div class="col-7">
        				<!-- Label -->		        		
		        		<q-badge outline color="primary">Marketplace</q-badge>

		        		<div class="q-pt-sm text-bold">Order# {{ item.id }}</div>     
		        		<div style="font-size: 15px;">
		        			{{ item.storefront.name }}
		        		</div>   			
        			</div>
        			<div class="col-5 text-right q-py-lg">
        				<div class="text-bold text-capitalize" :class="darkMode ? 'text-blue-grey-3' : 'text-blue-grey-6'">
        					{{ item.status }}
        				</div>
        			</div>
        		</div>         		
        	</q-card>
        </div>
        <div style="height: 120px"></div>
	</div>
</template>
<script>
import { Order, Storefront } from 'src/marketplace/objects'
import { backend as marketBackend} from 'src/marketplace/backend'
import { backend } from 'src/exchange/backend'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { wallet } from 'src/exchange/wallet'
import { bus } from 'src/wallet/event-bus.js'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
	data () {
		return {
			isSorted: false,
			pending: [],
			ongoingStatuses: [		       
		        { value: 'ESCRW_PN', label: this.$t('EscrowPending') },
		        { value: 'ESCRW', label: this.$t('Escrowed') },
		        { value: 'PD_PN', label: this.$t('PaidPending') },
		        { value: 'PD', label: this.$t('Paid') },
		        { value: 'APL', label: this.$t('Appealed') },
		        { value: 'RLS_PN', label: this.$t('ReleasePending') },
		        { value: 'RFN_PN', label: this.$t('RefundPending') }
		      ],
			exchangeOrders: [],
			marketplaceOrders: [],
			marketplacePagination: {
				count: 0,
				limit: 10,
				offset: 0				
			},
			fetchingOrders: false
		}
	},
	computed: {
		darkMode () {
	      return this.$store.getters['darkmode/getStatus']
	    },	
	    userInfo () {
	      return this.$store.getters['ramp/getUser']
	    },
	    emptyList () {
	    	return this.pending.length === 0 && this.marketplaceOrders.length === 0
	    }
	},
	components: {

	},
	async mounted () {		
		this.fetchOrders()
		this.fetchMarketOrders()

	},
	methods: {
		getDarkModeClass,
		async fetchOrders () {
			const vm = this 

			vm.isSorted = false
			let apiURL = '/ramp-p2p/order/public/'

			let params = {
				wallet_hash: this.$store.getters['global/getWallet']('bch').walletHash,
				page_size: 10,
				page: 1 
			}

			await backend.get(apiURL, { params: params})
				.then(response => {										
					this.pending = response.data.results
					console.log('pending: ', this.pending)

				})
				.catch(error => {
					console.error(error)
				})
		},
		getStatus (type = 'buy') {
			let temp = this.ongoingStatuses

			temp = this.ongoingStatuses
				.filter(status => {
					if (type === 'buy') {
						if (status.value !== 'ESCRW_PN') {
							return status
						}
					} else {
						return status
					}
				})
				.map(status => status.value)

			return temp
		},
		counterparty (order) {			
	      if (order?.owner?.name === this.userInfo?.name) {
	        return order?.ad_snapshot?.owner?.name
	      }
	      return order?.owner?.name
	    },
	    selectTransaction(orderID, type) {
	    	console.log('order: ', orderID)

	    	if (type === 'exchange') {
	    		const params = {
		    		order: orderID,
		    		redirect: true
		    	}
		    	this.$router.push({ name: 'exchange', query: { order_id: orderID } })
	    	} else if (type === 'marketplace') {
	    		this.$router.push({ name: 'app-marketplace-order', params: { orderId: orderID } })
	    	}
	    },
	    async fetchMarketOrders(opts={limit: 0, offset: 0 }) {	    	
	    	const vm = this	
		  	const params = {
			    ref: await vm.$store.dispatch('marketplace/getCartRef'),
			    limit: vm.marketplacePagination?.limit || 10,
			    offset: vm.marketplacePagination?.offset || undefined,
			    storefront_id: undefined,
			    exclude_statuses: ['completed', 'cancelled'].join(',')
			  }

		  	vm.fetchingOrders = true
		  	return marketBackend.get(`connecta/orders/`, { params })
		    	.then(response => {		    		
		      		if(!Array.isArray(response?.data?.results)) return Promise.reject({ response })
		      		
		      		vm.marketplaceOrders = response?.data?.results?.map(Order.parse)

		      		vm.marketplaceOrders.forEach(order => {
				        if (!order?.storefrontId) return
				        order.storefront = vm.$store.getters['marketplace/storefronts']
				          .find(storefront => storefront?.id == order?.storefrontId)

		        	// if (order.storefront) return

			        // order.fetchStorefront()?.then(() => {
			        //   $store.commit('marketplace/cacheStorefront', order.storefront?.raw)
			        // })
			      })
			      vm.marketplacePagination.count = response?.data?.count
			      vm.marketplacePagination.limit = response?.data?.limit
			      vm.marketplacePagination.offset = response?.data?.offset
			      // setStorefront(params.storefront_id)
			      
			      return response
			    })
			    .finally(() => {
			      vm.fetchingOrders = false
			    })
		}
	}
}	
</script>
<style lang="scss" scoped>
.pending-list {

}
.pending-card {
	
}
</style>