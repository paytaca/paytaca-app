<template>
	<headerNav title="Account Login" subtitle="Seed Phrase" :useEmitBack="true" :hasGradient="true" @back="$emit('back')"/>

	<div class="container full-width">
		<q-card dark="false" class="card card-light br-15">
			<div class="title-small">Enter Seed Phrase</div>
			<p class="body-small">Select each word in the order it was presented to you.</p>
		</q-card>
	</div>	
</template>
<script>
import headerNav from 'src/components/header-nav.vue'

export default{
	components: {
		headerNav
	},
	emits: ['back']
}	
</script>
<style lang="scss" scoped>
.container {
	margin-top: 84px;
}
.card {
	margin: 108px 16px 24px;
	padding: 24px;	
}
</style>