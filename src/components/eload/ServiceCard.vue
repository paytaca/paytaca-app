<template>
	<q-card class="q-mx-lg q-mb-md br-15 q-pa-md" v-if="service">
		<div class="md-font-size text-weight-bold">
        	<q-icon :name="icon" color="primary" size="25px" class="q-pr-sm"/>
        	{{ altName }}
       	</div>        
       	<div class="sm-font-size">
       		{{ description }}
       	</div>
      <!-- <q-card-section class="bg-grad text-white">
        <div class="md-font-size text-weight-bold">
        	<q-icon :name="icons[service.name.toLowerCase()]" color="white" size="25px" class="q-pr-sm"/>
        	{{ service.name }}
       	</div>        
      </q-card-section>

      <q-separator />

      <q-card-section>
      	<div>
      		{{ description[service.name.toLowerCase()] }}
      	</div>
      </q-card-section> -->
    </q-card>
</template>
<script>
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";

export default {
	data () {
		return {
			serviceName: this.service.name.toLowerCase(),
			serviceInfo: {
				eload: {
					altName: 'Mobile E-load',
					icon: 'phone_in_talk',
					description: 'Instantly top up prepaid mobile credits for calls, texts, and data.'
				},
				cable: {
					altName: 'Cable Services',
					icon: 'tv',
					description: 'Pay for your cable TV subscription quickly and conveniently.'
				},
				gamepins: {
					altName: 'Gamepins',
					icon: 'gamepad',
					description: 'Purchase digital codes or credits to unlock in‑game items and play online games.'
				}
			}
		}
	},
	computed: {
		altName () {			
			return this.serviceInfo[this.serviceName].altName
		},
		description () {
			return this.serviceInfo[this.serviceName].description
		},
		icon () {
			return this.serviceInfo[this.serviceName].icon
		}

	},
	props: {
		service: Object
	},
	methods: {
		getDarkModeClass
	}
}
</script>
<style lang="scss" scoped>
/* ==================== FONT SIZES ==================== */
.sm-font-size {
	font-size: small;
}
.md-font-size {
	font-size: medium;
}
.lg-font-size {
	font-size: large;
}
</style>