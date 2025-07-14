<template>
	<div class="pending-order" :class="getDarkModeClass(darkMode)">
		<div class="q-ml-lg q-mb-sm q-gutter-x-sm button button-text-primary" style="font-size: 20px;">                
        	{{ $t('Pending') }}
        </div>
        <div class="pending-list q-ma-lg " :class="darkMode ? 'text-white': 'text-black'">
        	<div v-for="item in pending" class="pending-card q-pa-md">
        		<div>Order# {{ item.id }}</div>

        		<q-badge>P2P Exchange</q-badge>
        	</div>
        </div>
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
		}
	},
	computed: {
		darkMode () {
	      return this.$store.getters['darkmode/getStatus']
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
		}
	}
}	
</script>
<style lang="scss" scoped>
.pending-list {

}
.pending-card {
	border: 1.5px solid #000;
	border-radius: 5px;
}
</style>