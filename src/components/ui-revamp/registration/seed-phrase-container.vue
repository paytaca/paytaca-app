<template>
	<headerNav title="Account Login" subtitle="Seed Phrase" :useEmitBack="true" :hasGradient="true" @back="$emit('back')"/>

	<!--<div class="container" style="margin-top: 84px;">
		<q-card dark="false" class="card-container card-light br-15">
			<div class="title-small">Enter Seed Phrase</div>
			<div class="body-small">Select each word in the order it was presented to you.</div>

			
		</q-card>
	</div>	-->
	<div class="card-container full-width">
		<q-card class="main-card br-15" :dark="false" :class="darkmode ? 'card-dark' : 'card-light'">
			<div class="title-small">Enter Seed Phrase</div>
			<div class="body-small" style="padding-bottom: 24px;">Select each word in the order it was presented to you.</div>

			<q-card class="br-15" style="border: 1px dashed #295BF6; padding: 16px;">
				<div class="grid-container">
					<div class="grid-item" v-for="i in 12" contenteditable="true">Hello</div>
				</div>
			</q-card>
		</q-card>	
	</div>	
</template>
<script>
import headerNav from 'src/components/header-nav.vue'

export default{
	data () {
		return {
			darkmode: this.$store.getters['darkmode/getStatus'],
		}		
	},
	components: {
		headerNav
	},
	emits: ['back'],
	mounted () {
		console.log('here: ', this.darkmode)
	}
}	
</script>
<style lang="scss" scoped>
.main-card {
	margin: 106px 16px;
	padding: 24px;	
}
.seed-phrase-container {
	background-color: aqua;	

}
.grid-container {
	display: grid;
    grid-template-columns: repeat(3, 1fr); /* 3 equal columns */
    grid-template-rows: repeat(4, auto); /* 4 rows */
    gap: 10px; /* Space between grid items */
    width: 100%; /* Make it flexible */   
    margin: auto; /* Center the grid */    

}
.grid-item {
     background-color: lightblue;
    padding: 20px;
    text-align: center;
    font-weight: bold;
    border: 1px solid #ccc;
    border-radius: 10px;
}
</style>