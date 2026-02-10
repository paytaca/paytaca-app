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
export default {
	data () {
		return {
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
		serviceKey () {
			const rawName = typeof this.service?.name === 'string' ? this.service.name : ''
			return rawName.trim().toLowerCase()
		},
		serviceMeta () {
			const key = this.serviceKey
			return (key && this.serviceInfo[key]) || null
		},
		altName () {
			// Prefer mapped altName, otherwise fall back to API-provided name
			return this.serviceMeta?.altName || this.service?.name || ''
		},
		description () {
			// Prefer mapped description; otherwise show nothing (avoids misleading text for unknown services)
			return this.serviceMeta?.description || ''
		},
		icon () {
			// Prefer mapped icon, otherwise a generic icon
			return this.serviceMeta?.icon || 'help_outline'
		}

	},
	props: {
		service: Object
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