<template>
	<div id="app-container" class="row" :class="getDarkModeClass(darkMode)">
		<HeaderNav title="Eload Service" backnavpath="/apps" class="header-nav" />
		<router-view v-if="isloaded" :key="$route.path"></router-view>

		<div v-else>
			<div class="text-black">Add loader here</div>
		</div>
	</div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'

export default{
	data (){
		return {
			darkMode: this.$store.getters['darkmode/getStatus'],
			isloaded: true, // change later			
		}
	},
	components: {
		HeaderNav
	},
	methods: {
		getDarkModeClass
	},
	mounted () {
		const vm = this
		// Request Services & check api availability

		if (vm.isloaded) {
			vm.$router.push({ name: 'eload-service-form' })
		}
	}
}
</script>