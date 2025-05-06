<template>
	<div class="container">
		<div class="image-container">
	      <div class="centered-items">
	        <img height="85px" width="85px" src="paytaca-logo.png" alt="">	        
	      </div>
	    </div>

	    <div class="selector full-width">
	    	<div class="country-selector">
	    		<span class="title-medium ">Select Your Country</span>
		    	<CountrySelector class="full-width q-mt-sm"/>
	    	</div>	  
	    	<div class="language-selector q-pt-md">
	    		<span class="title-medium ">Select Language</span>
		    	<LanguageSelector class="full-width q-mt-sm"/>
	    	</div>  	
	    </div>		
	    <div class="button-container">
          <div class="">
            <q-btn outline label="Continue" class="full-width" style="border-radius: 10px; padding: 10px 0px 10px;" @click="$emit('done')"/>
          </div>
        </div>
	</div>	
</template>
<script>
import CountrySelector from 'src/components/settings/CountrySelector.vue'
import LanguageSelector from 'src/components/settings/LanguageSelector.vue'


export default {
	data () {
		return {		
		}
	},
	components: {
		CountrySelector,
		LanguageSelector
	},
	emits: ['done']
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
	padding: 0px 16px 0px;
	position: absolute;
	top: 35%;
} 
.button-container {
  position: absolute;
  width: 100%;
  padding: 0px 16px 25px;
  // margin: 0px 16px 25px;
  bottom: 0;
}
</style>