<template>
	<div class="container">
		<div class="image-container">
	      <div class="centered-items">
	        <img height="85px" width="85px" src="~/assets/paytaca_logo.png" alt="">
	        <div class="title-medium text-center">Paytaca</div>
	      </div>
	    </div>

	    <div class="selector full-width">
	    	<div>
	    		<span class="title-medium ">Select Your Country</span>
		    	<CountrySelector class="full-width q-mt-sm"/>
	    	</div>	    	
	    </div>		
	</div>	
</template>
<script>
import { getCountryFlag } from 'src/utils/theme-ui-revamp-utils.js'

import CountrySelector from 'src/components/settings/CountrySelector.vue'

export default {
	data () {
		return {
			model: null,
			options: ['apple', 'banana', 'grapes'],
			selectedCountry: null,
			selectedLanguage: null
		}
	},
	components: {
		CountrySelector
	},
	methods: {
		getCountryFlag
	}
}
</script>
<style lang="scss" scoped>
.container {
display: flex;
  justify-content: center;
  align-items: center;	
}
.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  transition: opacity 1s ease-in-out;
}
.centered-items {
    position: absolute;
    top: 25%;
    left: 50%;
    transform: translate(-50%, -50%);
}

.selector {
	padding: 0px 34px 0px;
	position: absolute;
	top: 40%;
} 
</style>