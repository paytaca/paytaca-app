<template>
	<div id="app-container" class="row" :class="getDarkModeClass(darkMode)">
		<HeaderNav title="Eload Service" backnavpath="/apps" class="header-nav" />
		<router-view v-if="isloaded" :key="$route.path"></router-view>

		<div v-else-if="!errorMsg" class="eload-skeleton q-pa-lg full-width">
			<!-- Search input -->
			<q-skeleton animation="wave" type="rect" height="52px" class="br-10 q-mb-lg" />

			<!-- "Select Purchase Type" label -->
			<q-skeleton animation="wave" type="text" width="190px" class="q-mb-md" />

			<!-- Service cards (stacked like the home page) -->
			<q-skeleton
				v-for="i in 3"
				:key="'svc-' + i"
				animation="wave"
				type="rect"
				height="118px"
				class="br-15 q-mb-md"
			/>
		</div>

		<div v-if="errorMsg" class="q-pa-lg full-width">
			<div class="text-center" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
				{{ errorMsg }}
			</div>
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
		const minSkeletonMs = 400
		const startTs = Date.now()

		// Give the browser a chance to paint the skeleton before awaiting network.
		await vm.$nextTick()
		await new Promise(resolve => setTimeout(resolve, 16))

		// Request Services & check api availability
		const resp = await eloadServiceAPI.authUser()

		// Keep skeleton visible for a minimum time (avoids "no loader" flash).
		const elapsed = Date.now() - startTs
		if (elapsed < minSkeletonMs) {
			await new Promise(resolve => setTimeout(resolve, minSkeletonMs - elapsed))
		}

		if (resp) {
			vm.isloaded = true
			vm.$router.replace({ name: 'eload-service-form' })
		} else {
			vm.errorMsg = 'Unable to get Auth Token or Register User'
		}

		// if (vm.isloaded) {
		// 	vm.$router.push({ name: 'eload-service-form' })
		// }
	}
}
</script>
<style scoped>
.eload-skeleton .br-10 {
	border-radius: 10px;
}
.eload-skeleton .br-15 {
	border-radius: 15px;
}
</style>