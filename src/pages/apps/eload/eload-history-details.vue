<template>
	<HeaderNav title="Eload Service" :backnavpath="{ name: 'eload-service-orders'}" class="header-nav"/>

	<div class="text-h1">
		History
	</div>
</template>
<script>
import * as eloadServiceAPI from 'src/utils/eload-service.js'
import HeaderNav from 'src/components/header-nav.vue'

export default {
	data () {
		return {

		}
	},
	components: {
		HeaderNav
	},
	mounted () {
		console.log(this.$route.params.orderId)
	}
}
</script>