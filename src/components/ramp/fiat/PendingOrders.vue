<template>
	<div class="orders-container text-black" v-if="orders.length !== 0">
		<q-scroll-area style="height: 100px" class="full-width">
      		<div class="row no-wrap">
        		<div v-for="order in orders" class="orders-card q-pa-sm q-mx-xs br-15" :class="order.trade_type === 'BUY' ? 'buy-order' : 'sell-order'">        
					<div>Order #{{ order.id}}</div>	
					<div>{{ order.type }}</div>	
        		</div>
      		</div>
    	</q-scroll-area>	
	</div> 
</template>
<script>
import { backend } from 'src/exchange/backend'

export default {
	data () {
		return {
			orders: [
				{
					name: 'Nikki',
					status: 'Escrowed',
					amount: 'PHP 50',
					type: 'Buy'
				},	
				{
					name: 'Azzy',
					status: 'Escrowed',
					amount: 'PHP 50',
					type: 'Sell'
				},
				{
					name: 'Heart',
					status: 'Escrowed',
					amount: 'PHP 50',
					type: 'Buy'
				},
				{
					name: 'Hani',
					status: 'Escrowed',
					amount: 'PHP 50',
					type: 'Sell'
				},
				{
					name: 'Elle',
					status: 'Escrowed',
					amount: 'PHP 50',
					type: 'Buy'
				},
			],
			ongoingStatuses: [		       
		        { value: 'ESCRW_PN', label: this.$t('EscrowPending') },
		        { value: 'ESCRW', label: this.$t('Escrowed') },
		        { value: 'PD_PN', label: this.$t('PaidPending') },
		        { value: 'PD', label: this.$t('Paid') },
		        { value: 'APL', label: this.$t('Appealed') },
		        { value: 'RLS_PN', label: this.$t('ReleasePending') },
		        { value: 'RFN_PN', label: this.$t('RefundPending') }
		      ],

		}
	},
	async mounted () {
		const here = this.getStatus('sell')

		await this.fetchOrders()
		this.sortOrders()
		console.log('status: ', here)
	},
	methods: {
		async fetchOrders () {
			let tempList = []
			let apiURL = '/ramp-p2p/order/'
			let params = {
				page: 1,
				limit: 50,
				status_type: 'ONGOING',				
			}	

			const temp = this.getStatus('buy')

			if (temp?.length > 0) {
		        const status = temp.join('&status=')
		        const prefix = '?'
		        apiURL = `${apiURL}${prefix}status=${status}`	     
		      }
			// for buy
		      console.log('apiURL: ', apiURL)
		    params.trade_type = 'BUY'
			await backend.get(apiURL, { params: params, authorize: true})
				.then(response => {
					console.log('here: ', response.data)
					if (response.data.count > 0) {
						tempList.push(...response.data?.orders)					}					
				})

			// sell
			params.trade_type = 'SELL'
			await backend.get(apiURL, { params: params, authorize: true })
				.then(response => {
					console.log('here: ', response.data)
					if (response.data.count > 0) {
						tempList.push(...response.data?.orders)
					}					
				})

			this.orders = tempList
			console.log('temp: ', tempList)
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
			this.orders = this.orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

			console.log('sorted: ', this.orders)
		}
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
	width: 150px;
	height: 100px;
	background: #fff;
}
.sell-order {
	border: 2px solid #ed5f59;
}
.buy-order {
	border: 2px solid rgb(60, 100, 246);
}
</style>