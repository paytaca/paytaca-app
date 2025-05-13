<template>
	<div class="container">
		<!-- <q-btn outline icon="arrow_back_ios" style="padding-left: 5px;" size="sm" class="button-border" @click="back()"/> -->
		<div class="image-container">
	      <div class="centered-items">
	        <img height="85px" width="85px" src="paytaca-logo.png" alt="">
	        <!-- <div class="title-medium text-center">Paytaca</div> -->
	      </div>
	    </div>

	    <!-- Initial Login -->
	    <div class="login-container full-width">
	    	<q-card dark="false" class="login-card card-light br-15">
	    		<div v-if="step === 1">
	    			<div class="text-center title-medium">Account Login</div>
		    	
			    	<q-btn no-caps label="Log In" class="full-width button-default" style="margin-top: 24px; border-radius: 10px;" @click="step++"/>
			    	
			    	<div class="text-center title-small text-link constant-padding" @click="proceedCreateAccount()">Create New Wallet?</div>
			    	<div class="text-center body-small text-capitalize constant-padding">{{ $t('or') }}</div>

			    	<div class="full-width constant-padding">
			    		<q-btn no-caps class="full-width" style="border-radius: 10px;">		    			
						    <img height="18px" width="18px" src="google.png" class="q-mr-sm">		     
						    <span class="title-small">Continue with Google</span>
			    		</q-btn>
			    	</div>			   		    
	    		</div>

	    		<div v-if="step === 2">	    			
	    			<div class="text-center title-medium">{{ createAccount ? 'Create Account' : 'Select Type of Login' }}</div>

		    		<div class="constant-padding">
		    			<q-btn @click="selectLoginType('shards')" class="full-width button-default" no-caps label="Shards" style="border-radius: 10px; padding: 10px 24px 10px;"/>
		    		</div>
		    		<div class="text-center body-small text-capitalize constant-padding">{{ $t('or') }}</div>
		    		<div class="constant-padding">
		    			<q-btn @click="selectLoginType('seed-phrase')" class="full-width button-default" no-caps label="Seed Phrase" style="border-radius: 10px; padding: 10px 24px 10px;"/>
		    		</div>
		    		<div class="text-center title-small text-link constant-padding" @click="back()">Back to Log In</div>
	    		</div>	    				    				   
		    </q-card>
	    </div>	
	</div>
</template>
<script>

export default {
	data () {
		return {
			step: 1,
			createAccount: false,
		}
	},
	emits: ['back', 'proceed'],
	methods: {
		back () {
			this.step--
			this.createAccount = false;
		},
		proceedCreateAccount () {
			this.createAccount = true
			this.step++
		},
		selectLoginType (type) {
			this.$emit('proceed', { type: type, createAccount: this.createAccount})
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
	margin: 0px 16px 0px;
	padding: 24px;
}
.button-border {
  position: absolute;
  left: 16px;
  top: 24px;
  padding: 0;
  border-radius: 10px;
  width: 30px;
  height: 30px;
  opacity: 0.8;
}
.constant-padding {
	padding-top: 24px;
}
</style>