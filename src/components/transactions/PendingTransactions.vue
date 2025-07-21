<template>
	<div v-if="pending.length > 0" class="pending-order" :class="getDarkModeClass(darkMode)">		 
		<div class="q-ml-lg q-gutter-x-sm button button-text-primary" style="font-size: 20px;">                
        	{{ $t('Pending') }}
        </div>
        <div class="pending-list q-mx-lg " :class="darkMode ? 'text-white': 'text-black'">
        	<div v-for="item in pending" class="pending-card q-pa-md" @click="selectTransaction(item)" style="border-bottom: 1px solid #fff;">
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
        				<div class="text-bold" :class="darkMode ? 'text-blue-grey-5' : 'text-blue-grey-6'">
        					{{ item.status.label }}
        				</div>
        			</div>
        		</div> 
        		<q-separator class="q-mt-md"/>       		
        	</div>
        </div>
        <div style="height: 120px"></div>
	</div>
</template>
<script>
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
			marketplaceOrders: []
		}
	},
	computed: {
		darkMode () {
	      return this.$store.getters['darkmode/getStatus']
	    },	
	    userInfo () {
	      return this.$store.getters['ramp/getUser']
	    },
	},
	components: {

	},
	mounted () {
		console.log('pending')
		this.fetchOrders()

	},
	methods: {
		getDarkModeClass,
		async fetchOrders () {
			console.log('fetching order')
			console.log('wallet hash: ', this.$store.getters['global/getWallet']('bch').walletHash)

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
					console.log('here whazzup')

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
	    selectTransaction(order) {
	    	console.log('order: ', order.id)
	    	const params = {
	    		order: order.id,
	    		redirect: true
	    	}
	    	this.$router.push({ name: 'exchange', query: { order_id: order.id } })
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