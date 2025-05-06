<template>
	<div class="container">
		<div class="image-container">
	      <div class="centered-items">
	        <img height="85px" width="85px" src="paytaca-logo.png" alt="">
	        <!-- <div class="title-medium text-center">Paytaca</div> -->
	      </div>
	    </div>

	    <!-- Initial Login -->
	    <div class="login-container full-width">
	    	<q-card class="login-card card-light br-15">
	    		<div v-if="step === 1">
	    			<div class="text-center title-medium">Account Login</div>
		    	
			    	<q-btn no-caps label="Log In" class="full-width button-default" style="margin-top: 24px; border-radius: 10px;" @click="step++"/>
			    	
			    	<div class="text-center title-small text-link" style="padding-top: 24px;">Don't have an account?</div>
			    	<div class="text-center body-small text-capitalize" style="padding-top: 24px;">{{ $t('or') }}</div>

			    	<div class="full-width" style="padding-top: 24px;">
			    		<q-btn no-caps class="full-width" style="border-radius: 10px;">		    			
						    <img height="18px" width="18px" src="google.png" class="q-mr-sm">		     
						    <span class="title-small">Continue with Google</span>
			    		</q-btn>
			    	</div>
			    	<div class="full-width" style="padding-top: 10px;">
			    		<q-btn no-caps class="full-width" style="border-radius: 10px;">		    			
						    <img height="18px" width="18px" src="facebook.png" class="q-mr-sm">		     
						    <span class="title-small">Continue with Facebook</span>
			    		</q-btn>
			    	</div>		    	
	    		</div>
	    		<div v-if="step === 2">
	    			Select Login Type
	    		</div>		    	
		    </q-card>
	    </div>	
	</div>
</template>
<script>

export default {
	data () {
		return {
			step: 1
		}
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
.login-container {
	position: absolute;
	top: 35%;
}
.login-card {
	margin: 0px 34px 0px;
	padding: 24px;
}
</style>