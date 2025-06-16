<template>
	<div id="app-container" :class="darkmode ? 'dark' : 'light'">
		 <header-nav :title="$t('Transactions')" class="apps-header" />
		<div class="text-primary" style="padding-top: 100px">Transaction List</div>



		<footer-menu ref="footerMenu" />
	</div>
</template>
<script>
import headerNav from 'src/components/header-nav'

export default {
	computed: {
		darkmode () {
	      return this.$store.getters['darkmode/getStatus']
	    },

	},
	components: {
		headerNav
	}
}
</script>