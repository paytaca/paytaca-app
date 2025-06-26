<template>
	<div class="orders-container text-black" v-if="visible">
		<q-scroll-area style="height: 90px" class="full-width" v-if="isSorted">
      		<div class="row no-wrap">
        		<q-card bordered @click="selectOrder(order)" v-for="order in orders" class="orders-card pt-card q-pa-sm q-px-md q-mx-xs br-15" 
        			:class="[getDarkModeClass(darkMode), darkMode ? 'text-white' : 'text-black']">        
					<div class="text-bold">Order #{{ order.id}}</div>	
					<div>{{ userNameView(counterparty(order)) }}</div>	
					<div>
						<span v-if="order.is_cash_in"><q-badge outline rounded size="sm" color="warning"  label="Cashin" /> &nbsp;</span>
						<span class="text-grey-5" style="font-size: 12px">{{ order.status.label }}</span>
					</div>
        		</q-card>
      		</div>
    	</q-scroll-area>	
	</div> 
</template>
<script>
import { backend } from 'src/exchange/backend'
import { wallet } from 'src/exchange/wallet'
import { bus } from 'src/wallet/event-bus.js'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
	data () {
		return {
			darkMode: this.$store.getters['darkmode/getStatus'],
			orders: [],
			ongoingStatuses: [		       
		        { value: 'ESCRW_PN', label: this.$t('EscrowPending') },
		        { value: 'ESCRW', label: this.$t('Escrowed') },
		        { value: 'PD_PN', label: this.$t('PaidPending') },
		        { value: 'PD', label: this.$t('Paid') },
		        { value: 'APL', label: this.$t('Appealed') },
		        { value: 'RLS_PN', label: this.$t('ReleasePending') },
		        { value: 'RFN_PN', label: this.$t('RefundPending') }
		      ],
			isSorted: false

		}
	},
	computed: {
		userInfo () {
	      return this.$store.getters['ramp/getUser']
	    },
	},
	props: {
		visible: {
			type: Boolean,
			default: true
		}
	},
	async mounted () {

		const here = this.getStatus('sell')

		await this.fetchOrders()
		this.sortOrders()		
	},
	methods: {
		getDarkModeClass,
		async fetchOrders () {
			this.isSorted = false
			let tempList = []
			let apiURL = '/ramp-p2p/order/'
			let params = {
				page: 1,
				limit: 50,
				status_type: 'ONGOING',	
				sort_by: 'ASCENDING'			
			}	

			let temp = null			
			// Fetch Cashout Orders
			const parameters = {
		      wallet_hash: wallet.walletHash,
		      page: 1,
		      limit: 50,
		      status_type: 'ONGOING',
		      owned: false
		    }
		   	let url = '/ramp-p2p/order/cash-in/'
		    await backend.get(url, { params: parameters })
		    	.then(response => {		    		
		    		if (response.data.count > 0) {
						tempList.push(...response.data?.orders)					
					}
		    	})
		    	.catch(error => {
		    		bus.emit('handle-request-error', error)
		    	})
			
			// Fetch Buy Orders
			temp = this.getStatus('buy')

			if (temp?.length > 0) {
		        const status = temp.join('&status=')
		        const prefix = '?'
		        apiURL = `${apiURL}${prefix}status=${status}`	     
		      }		      
		    params.trade_type = 'BUY'
			await backend.get(apiURL, { params: params, authorize: true})
				.then(response => {					
					if (response.data.count > 0) {
						tempList.push(...response.data?.orders)					
					}					
				})
				.catch(error => {
		    		bus.emit('handle-request-error', error)
		    	})

			apiURL = '/ramp-p2p/order/'

			// Fetch Sell Orders
			temp = this.getStatus('sell')

			if (temp?.length > 0) {
		        const status = temp.join('&status=')
		        const prefix = '?'
		        apiURL = `${apiURL}${prefix}status=${status}`	     
		      }		    
			params.trade_type = 'SELL'
			await backend.get(apiURL, { params: params, authorize: true })
				.then(response => {					
					if (response.data.count > 0) {
						tempList.push(...response.data?.orders)
					}					
				})
				.catch(error => {
		    		bus.emit('handle-request-error', error)
		    	})

			this.orders = tempList			
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
		sortOrders () {
			this.orders = this.orders.sort((a, b) => new Date(b.last_modified_at) - new Date(a.last_modified_at));

			this.isSorted = true			
		},
		selectOrder (data) {
			this.$router.push({ name: 'p2p-order', params: { order: data?.id } })
		},
		counterparty (order) {
	      if (order?.owner?.name === this.userInfo?.name) {
	        return order?.ad?.owner?.name
	      }
	      return order?.owner?.name
	    },
	    userNameView (name) {
	      if (!name) return
	      const limitedView = name.length > 15 ? name.substring(0, 15) + '...' : name
	      return limitedView
	    },
	}
}

</script>
<style lang="scss" scoped>
.orders-container {
	position: fixed;
	width: 100%;
	bottom: 90px;
	z-index: 7;
	margin: 0px 10px 0px;
}
.orders-card {
	width: 185px;	
	background: #fff;
}
.sell-order {
	border: 2px solid #ed5f59;
}
.buy-order {
	border: 2px solid rgb(60, 100, 246);
}
</style>