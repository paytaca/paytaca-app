<template>
	<div>
		<q-input
			ref="searchInput"
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
				max-height="60vh;"				
				class="q-pa-md"
				:style="{ width: inputWidth + 'px' }"
			>	
				<div class="q-pt-sm">
					<div v-for="(promo, index) in searchResult" :key="index" @click="selectPromo(promo)" :class="darkMode ? 'text-white' : 'text-black'">
						<div class="md-font-style text-weight-bold text-overflow">{{ promo.name }}</div>

		    			<div :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
		    				{{ promo.amount }} PHP
		    			</div>

		    			<div class="q-gutter-sm q-pt-sm">
		    				<q-badge class="q-px-sm" rounded outline color="primary" :label="promo.service" />
		    				<q-badge class="q-px-sm" rounded outline color="primary" :label="promo.service_group" />		    				
		    			</div>
		    				
		    			<q-separator class="q-my-sm" :dark="darkMode"/>
					</div>
				</div>
				<!-- <q-list style="min-width: 200px" class="q-pt-sm"> 
		    		<q-item v-for="(promo, index) in searchResult" :key="index" clickable @click=""> 
		    			<q-item-section  :class="darkMode ? 'text-white' : 'text-black'" class="overflow-text">
		    				<div class="md-font-style text-weight-bold">{{ promo.name }}</div>

		    				<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
		    					{{ promo.amount }} PHP
		    				</div>
		    				<q-separator class="q-mt-sm" :dark="darkMode"/>
		    			</q-item-section> 		    					    			
		    		</q-item> 
		    	</q-list>  -->
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
	computed: {
		inputWidth() {
			const el = this.$refs.searchInput.$el
			if (el) {
				return el.offsetWidth
			}

			return 200
		}
	},
	props: {
		promoName: String
	},
	emits: ['selectPromo'],
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
		},
		async selectPromo (promo) {
			// Fetch Detailed Promo

			const _promo = await eloadServiceAPI.fetchPromoDetails(promo.id)

			if (_promo.success) {
				this.$emit('selectPromo', _promo.data)	
			}
			
			this.searchVal = ''
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
 .overflow-text {
 	white-space: normal; /* allow wrapping */ 
 	word-wrap: break-word; /* legacy support */ 
 	overflow-wrap: break-word; /* modern browsers */
 }
</style>