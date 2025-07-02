<template>
	<div id="app-container" :class="getDarkModeClass(darkmode)">
		<div>Asset List</div>
		<footer-menu ref="footerMenu" />
	</div>
</template>
<script>
import { isNotDefaultTheme, getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import headerNav from 'src/components/header-nav'

export default {
	data () {
		return {

		}
	},
	computed: {
		darkmode () {
	      return this.$store.getters['darkmode/getStatus']
	    },
	},
	components: {
		headerNav
	},
	methods: {
		getDarkModeClass
	}
}
</script>