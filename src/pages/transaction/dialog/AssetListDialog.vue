<template>
	<q-dialog 
		ref="dialog" 
		full-width		
	    position="top"
	    transition-show="fade"
	    transition-hide="fade"
	>
		<q-card  class="br-15 q-mt-xl q-mx-sm wallet-card" :class="getDarkModeClass(darkMode)">
			<div class="row no-wrap items-center justify-center q-pl-lg q-pr-sm q-pt-md">
		        <div class="text-bold q-space q-mt-sm pt-label" :class="getDarkModeClass(darkMode)"></div>
		        <q-btn
		          flat
		          padding="sm"
		          icon="close"
		          class="close-button"
		          v-close-popup
		        />
		    </div>
		    <q-card-section>
		        <q-input
		          dense
		          outlined
		          rounded
		          v-model="searchText"
		          :placeholder="$t('Search Asset')"
		        >
		          <template v-slot:append>
		            <q-icon name="search" color="grey-5" />
		          </template>
		        </q-input>
		      </q-card-section>
			<div :class="darkMode ? 'text-white' : 'text-black'">
				<q-list separator class="q-px-lg">
					<q-item class="q-py-md" clickable v-ripple v-for="asset in filteredList" @click="onOKClick(asset)" :key="asset.id">
						<q-item-section avatar>
		          <q-avatar>
		            <img :src="getImageUrl(asset)">
		          </q-avatar>
		        </q-item-section>
		        <q-item-section class="text-bold">{{ asset.name }}</q-item-section>
					</q-item>

				</q-list>
			</div>
		</q-card>
	</q-dialog>	
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
	data () {
		return {
			searchText: ''
		}
	},
	computed: {
		darkMode () {
	    return this.$store.getters['darkmode/getStatus']
	  },
	  filteredList () {
      if (!this.searchText) return this.assets

      const needle = String(this.searchText).toLowerCase()

      return this.assets
        .filter(asset => {
          if (!this.searchText) return true
          if (!asset) return false
          if (/0x[0-9a-f]+/.test(needle) && (asset.symbol.toLowerCase() === needle || asset.name.toLowerCase() === needle)) return true

          return String(asset.symbol).toLowerCase().includes(needle) || String(asset.name).toLowerCase().includes(needle)
        })
    }
	},
	props: {
		assets: Array
	},
	mounted () {
		// console.log('assets: ', this.assets)
	},
	methods: {
		getDarkModeClass,
		getImageUrl (asset) {
			if (asset?.logo) {
				if (asset.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
					return asset.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
				} else {
					return asset.logo
				}
			}
			return ''
		},
		onOKClick (asset) {
      // if (coin.offline === false) {
      this.$emit('ok', asset)
      this.$refs.dialog.hide()
      // }
    },
	}
}
</script>
<style lang="scss" scoped>
.wallet-card {
  height: 525px;
  .title {
    font-size: 18px;
  }
  .bottom-border {
    border-bottom-width: 1px;
    border-bottom-style: solid;
  }
  .address, .market-currency {
    font-size: 12px;
  }
}
</style>