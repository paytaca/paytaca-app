<template>
	<div id="app-container" :class="darkmode ? 'dark' : 'light'">
		<header-nav :title="$t('Wallets')" class="apps-header" />

		<multi-wallet/>

		<!-- <footer-menu ref="footerMenu" /> -->
	</div>
</template>
<script>
import headerNav from 'src/components/header-nav'
import multiWallet from 'src/components/multi-wallet/index.vue'

export default {
	computed: {
		darkmode () {
	      return this.$store.getters['darkmode/getStatus']
	    },

	},
	components: {
		headerNav,
		multiWallet
	}
}
</script>