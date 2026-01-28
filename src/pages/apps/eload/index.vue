<template>
	<div id="app-container" class="row" :class="getDarkModeClass(darkMode)">
		<HeaderNav title="Eload Service" backnavpath="/apps" class="header-nav" />
		<router-view v-if="isloaded" :key="$route.path"></router-view>

		<div v-else>
			<div class="text-black text-center">Add skeleton loader</div>			
		</div>

		<div v-if="errorMsg">
			{{ errorMsg }}
		</div>			
	</div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import * as eloadServiceAPI from 'src/utils/eload-service.js'

export default{
	data (){
		return {
			darkMode: this.$store.getters['darkmode/getStatus'],
			isloaded: false, // change later			
			errorMsg: ''
		}
	},
	components: {
		HeaderNav
	},
	methods: {
		getDarkModeClass
	},
	async mounted () {
		const vm = this
		// Request Services & check api availability
		const resp = await eloadServiceAPI.authUser()

		if (resp) {
			vm.isloaded = true
			vm.$router.push({ name: 'eload-service-form' })
		} else {
			vm.errorMsg = 'Unable to get Auth Token or Register User'
		}

		// if (vm.isloaded) {
		// 	vm.$router.push({ name: 'eload-service-form' })
		// }
	}
}
</script>