<template>
	<div class="asset-option text-center" :class="darkmode ? 'text-light' : 'text-dark'">
		<div v-if="stablehedgeView">
			<div class="row">
				<div class="col" v-for="opt in stablehedgeOpt">
		            <q-btn  class="button-default" round :disable="!loaded" @click="handleButton(opt.name)">
		            	<q-icon size="18px" :name="opt.icon"/>
		            </q-btn>
		            <div class="q-pt-sm text-center text-capitalize title-smaller text-primary">{{ opt.name }}</div>
		        </div>	         
			</div>			
		</div>
		<div v-else>
			<div class="row">	             
	              <div class="col" v-for="opt in bchOpt">	              	
	                <q-btn  class="button-default" round :disable="!loaded" @click="handleButton(opt.name)">
	                  <q-icon size="18px" :name="opt.icon"/>
	                </q-btn>
	                <div class="q-pt-sm text-center text-capitalize title-smaller text-primary">{{ opt.name }}</div>
	              </div>
	            </div>
		</div>
	</div>
</template>
<script>

export default {
	data () {
		return {
			bchOpt: [				
		        { name: 'send', icon: 'img:ui-revamp/send-bch.png', path: 'transaction-send-select-asset'},
		        { name: 'receive', icon: 'img:ui-revamp/receive-bch.png', path: 'transaction-receive-select-asset'},
		        { name: 'cashin', icon: 'img:ui-revamp/cashin.png', path: ''},
		        { name: 'chart', icon: 'query_stats', path: ''}
			],
			stablehedgeOpt: [		
		        { name: 'freeze', icon: 'ac_unit', path: ''},
		        { name: 'unfreeze', icon: 'img:ui-revamp/unfreeze.svg', path: ''},		        
		        { name: 'price chart', icon: 'query_stats', path: ''}
			],
		}
	},
	props: {
		stablehedgeView: {
			type: Boolean,
			default: false
		},
		loaded: {
			type: Boolean,
			default: false
		}
	},
	emits: ['cashin', 'price-chart'],
	computed: {
		darkmode () {
			return this.$store.getters['darkmode/getStatus']
		}
	},
	methods: {
		handleButton(name) {
			switch (name) {
		        case 'freeze': 
		          break
		        case 'send':
		          this.$router.push({ name: 'transaction-send-select-asset' })
		          break 
		        case 'receive':
		          this.$router.push({ name: 'transaction-receive-select-asset' })
		          break
		        case 'cashin':
		          this.$emit('cashin')
		          break
		        case 'price chart':
		          this.$emit('chart')
		          break
		      } 
		}
	}
}
</script>
<style lang="scss" scoped>
.asset-option {
	margin: 25px 0px 25px;
}
</style>