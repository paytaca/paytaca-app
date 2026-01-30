<template>
	<div>
		<q-input
			dense
			outlined
			clearable
			v-model="searchVal"
			:loading="loading"
			autocomplete="off"
			placeholder="Search for Promos..."
			color="pt-primary1"
			debounce="500"
			:bg-color="darkMode ? 'pt-dark' : 'pt-light'"
			@update:modelValue="search"			
		>
			<template v-slot:append>
		    	<q-icon name="search" />
		    </template>		    
		
			<q-menu
				v-if="searchVal"
				v-model="showPromos"
				fit no-focus				
			>
				<q-list style="min-width: 200px"> 
		    		<q-item v-for="(promo, index) in searchResult" :key="index" clickable @click=""> 
		    			<q-item-section class="text-black">{{ promo.name }}</q-item-section> 
		    		</q-item> 
		    	</q-list> 
			</q-menu>
		</q-input>
	</div>
</template>
<script>
import * as eloadServiceAPI from 'src/utils/eload-service.js'

export default {
	data () {
		return {
			darkMode: this.$store.getters['darkmode/getStatus'],
			searchVal: '',
			searchResult: [],
			loading: false,
			lastSearch: '',
			showPromos: false
		}
	},
	props: {
		promoName: String
	},
	methods: {
		async search () {
			this.loading = true
			console.log('search: ', this.searchVal)

			let data = {
				promoName: this.searchVal
			}

			let result = await eloadServiceAPI.fetchPromo(data)

			if (result.success) {
				this.searchResult = result.data.promos

				this.lastSearch = this.searchVal
				this.showPromos = true
				this.loading = false
			} else {
				this.loading = false
			}
		}
	}
}
	
</script>