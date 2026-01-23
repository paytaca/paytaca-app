<template>
	<div class="text-black q-pt-md">
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
		<div  class="q-mt-lg" v-if="step === 1">
			<q-card v-for="service in services" id="service-card" class="text-center q-my-sm bg-grad" @click="updateFilters('service', service)">
				<div class="text-capitalize purchase-type text-white text-bold lg-font-size">{{ service.name.toLowerCase() }}</div>
			</q-card>			
		</div>

		<!-- Selecting Service Group -->
		<div v-if="step === 2" class="q-pt-md">
			<q-card class="q-mx-lg br-15 q-py-sm q-px-lg" @click="changeValue('service')">
				<div class="sm-font-size text-italic q-pt-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Click to change the Purchase Type...</div>
				<div class="text-h5 text-weight-bold lg-font-size text-grad">{{ filters.service.name }}</div>
				<!-- Service Group Selection -->
			</q-card>

			<div class="q-px-lg q-pt-sm md-font-size text-italic q-py-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Select Service Provider</div>

			<q-card v-for="group in serviceGroups" id="service-card" class="text-center q-my-sm bg-grad" style="height: 40px;" @click="updateFilters('serviceGroup', group)">
				<div class="text-capitalize text-white text-bold md-font-size">{{ group.name.toLowerCase() }}</div>
			</q-card>			

			<!-- <q-card class="q-mx-lg br-15 q-mt-md q-px-lg q-py-sm" v-if="serviceGroups.length > 0">
				<div class="sm-font-size text-italic q-py-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Select Service Provider</div>
				<div v-for="group in serviceGroups">
					<div class="md-font-size">{{ group.name }}</div>

					<q-separator :dark="darkMode" class="q-my-sm"/>
				</div>
			</q-card> -->
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
				category: 'all', // category // allow all
			},
			services: [],
			serviceGroups: []
		}
	},
	watch: {
		'filters.service'(item) {
			if (item) {
				this.step++
				this.fetchServiceGroup()
			}

		},
	},
	async mounted () {
		const vm = this

		let result = await eloadServiceAPI.fetchService()

		if (result.success) {			
			vm.services = result.data
		}	

		// Fetch Services
		vm.step++
		vm.loading = false
	},
	methods: {
		updateFilters(type, name) {
			this.filters[type] = name	
		},
		changeValue (type) {
			this.filters[type] = null
			this.step--
		},
		async fetchServiceGroup() {
			console.log('Fetching Sevice Group')
			// let page;
			// let limit;
			let data = {
				service: this.filters.service,
				limit: 10,
				page: 1
			}

			let result = await eloadServiceAPI.fetchServiceGroup(data)			
			if (result.success) {				
				this.serviceGroups = result.data.service_group				
			}
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
</style>