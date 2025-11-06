<template>
	<div class="pending-order" :class="getDarkModeClass(darkMode)" v-if="!emptyList">
		<div class="row items-center justify-between q-mb-sm">
			<div class="q-ml-lg button button-text-primary" style="font-size: 20px;">                
				{{ $t('Pending') }}
			</div>
		</div>
		
		<div class="row no-wrap q-pl-lg q-mb-lg no-scrollbar pending-container">
			<div
				v-if="pending"
				v-for="(item, index) in pending"
				:key="item.id"
				class="pending-card pt-card"
				:class="darkMode ? 'dark' : 'light'"
				:style="{ 'margin-left': index === 0 ? '0px' : '12px' }"
				@click="selectTransaction(item.id, 'exchange')"
			>
				<q-badge 
					v-if="item.is_cash_in" 
					:color="darkMode ? 'blue-4' : 'blue-6'" 
					class="q-mb-sm"
					style="font-size: 9px; padding: 3px 8px;"
				>
					Cash In
				</q-badge>
				<q-badge 
					v-else 
					:color="darkMode ? 'blue-4' : 'blue-6'"
					class="q-mb-sm"
					style="font-size: 9px; padding: 3px 8px;"
				>
					P2P Exchange
				</q-badge>

				<div class="order-number" :class="darkMode ? 'text-white' : 'text-black'">Order #{{ item.id }}</div>
				<div class="order-counterparty" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
					by {{ counterparty(item) }}
				</div>
				<div class="order-status" :class="darkMode ? 'text-grey-4' : 'text-grey-8'">
					{{ item.status.label }}
				</div>
			</div>
			<div 
				v-if="pendingAppeals"				
				v-for="(item, index) in pendingAppeals"
				:key="item.id"
				class="pending-card pt-card"
				:class="darkMode ? 'dark' : 'light'"
				:style="{ 'margin-left': index === 0 ? '0px' : '12px' }"
				@click="selectTransaction(item.order.id, 'appeal')"
			>
				<q-badge 	
					outline				
					:color="darkMode ? 'blue-4' : 'blue-6'" 
					class="q-mb-sm"
					style="font-size: 9px; padding: 3px 8px;"
				>
					{{ item.type.label }}
				</q-badge>				

				<div class="order-number" :class="darkMode ? 'text-white' : 'text-black'">Appeal #{{ item.id }}</div>
				<div class="order-counterparty" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
					Order #{{ item.order.id }}
				</div>
				<div class="order-status" :class="darkMode ? 'text-grey-4' : 'text-grey-8'">
					{{ item.reasons[0] }}
				</div>
			</div>
        	<!-- <q-card v-for="item in marketplaceOrders" class="pending-card q-pa-md q-my-sm br-15"
   				@click="selectTransaction(item.id, 'marketplace')"
        	>
        		<div class="row">
        			<div class="col-7">
        				<-- Label --		        		
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
        	</q-card> -->
        </div>
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
			pendingAppeals: [],
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
				limit: 100, // Increased from 10 to show all pending orders
				offset: 0				
			},
			fetchingOrders: false,
			orderPage: 1,
			orderTotal: 0,
			appealPage: 1,
			appealTotal: 0
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
	    	return this.pending.length === 0 && this.marketplaceOrders.length === 0 && this.pendingAppeals.length == 0
	    }
	},
	components: {

	},
	async mounted () {		
		this.fetchOrders()
		this.fetchAppeals()
		this.fetchMarketOrders()

	},
	methods: {
		getDarkModeClass,
		async fetchOrders (overwrite = false) {
			const vm = this 

			vm.isSorted = false
			let apiURL = '/ramp-p2p/order/public/'

			let params = {
				wallet_hash: this.$store.getters['global/getWallet']('bch').walletHash,
				page_size: 100, // Increased from 3 to show all pending orders
				page: this.orderPage 
			}

			await backend.get(apiURL, { params: params})
				.then(response => {					
					this.orderTotal = response.data.count
					if (overwrite) {
						this.pending.push(...response.data.results)
					} else {
						this.pending = response.data.results
					}															
					// console.log('pending: ', this.pending)

				})
				.catch(error => {
					console.error(error)
				})
		},
		async fetchAppeals (overwrite = false) {
			const vm = this

			let apiURL = '/ramp-p2p/appeal/public/'

			let params = {
				wallet_hash: vm.$store.getters['global/getWallet']('bch').walletHash,
				page_size: 100,
				page: vm.appealPage
			}

			await backend.get(apiURL, { params: params })
				.then(response => {					
					vm.appealTotal = response.data.count
					if (overwrite) {
						this.pendingAppeals.push(...response.data.results)
					} else {
						this.pendingAppeals = response.data.results
					}
				})
				.catch(error => {
					console.log(error)
				})
		},
		seeMoreOrders () {
			this.orderPage++
			this.fetchOrders(true)
		},
		seeAllOrders () {
			// Navigate to P2P Exchange orders page
			this.$router.push({ name: 'exchange', query: { tab: 'orders' } })
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
	    selectTransaction(transactionID, type) {
	    	if (type === 'exchange') {
	    		const params = {
		    		order: transactionID,
		    		redirect: true
		    	}
		    	this.$router.push({ name: 'exchange', query: { order_id: transactionID } })
	    	} else if (type === 'marketplace') {
	    		this.$router.push({ name: 'app-marketplace-order', params: { orderId: transactionID } })
	    	} else if (type === 'appeal') {
	    		this.$router.push({ name: 'exchange', query: { appeal_id: transactionID }})
	    	}
	    },
	    async fetchMarketOrders(opts={limit: 0, offset: 0 }) {	    	
	    	const vm = this	
		  	const params = {
			    ref: await vm.$store.dispatch('marketplace/getCartRef'),
			    limit: vm.marketplacePagination?.limit || 100,
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
.pending-container {
  overflow-x: auto;
  overflow-y: hidden;
  padding-right: 20px;
  
  /* Hide scrollbar for Chrome, Safari and Opera */
  &::-webkit-scrollbar {
    display: none;
  }
  
  /* Hide scrollbar for IE, Edge and Firefox */
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.pending-card {
  min-width: 180px;
  max-width: 180px;
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: transform 0.2s ease;
  position: relative;
  overflow: hidden;
  
  &:active {
    transform: scale(0.96);
  }
  
  // Shimmer effect overlay
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    animation: shimmer-sweep 3s ease-in-out infinite;
    z-index: 0;
    pointer-events: none;
  }
  
  &.dark::before {
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.08),
      transparent
    );
  }
  
  // Ensure content is above shimmer
  > * {
    position: relative;
    z-index: 1;
  }
}

@keyframes shimmer-sweep {
  0% {
    transform: translateX(-100%) translateY(-100%) rotate(45deg);
  }
  50%, 100% {
    transform: translateX(100%) translateY(100%) rotate(45deg);
  }
}

.order-number {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
  margin-top: 8px;
}

.order-counterparty {
  font-size: 12px;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-status {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
</style>