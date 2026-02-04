<template>
	<q-dialog 
		ref="dialog" 
		full-width		
	    position="top"
	    transition-show="fade"
	    transition-hide="fade"
	>
		<q-card class="br-15 q-mt-xl q-mx-sm wallet-card" :class="getDarkModeClass(darkMode)">
			<div class="row no-wrap items-center justify-center q-pl-lg q-pr-sm q-pt-md">
		        <div class="text-bold q-space q-mt-sm pt-label" :class="getDarkModeClass(darkMode)">{{ $t('SelectCountry') }}</div>
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
		          :placeholder="$t('SearchCountry')"
		        >
		          <template v-slot:append>
		            <q-icon name="search" color="grey-5" />
		          </template>
		        </q-input>
		      </q-card-section>
			<div :class="darkMode ? 'text-white' : 'text-black'">
				<q-list separator class="q-px-lg">
					<q-item 
						class="q-py-md" 
						clickable 
						v-ripple 
						v-for="country in filteredList" 
						@click="onOKClick(country)" 
						:key="country.code"
					>
		        <q-item-section class="text-bold">
							{{ country.name }}
						</q-item-section>
						<q-item-section side>
							<q-item-label caption>{{ country.code }}</q-item-label>
						</q-item-section>
					</q-item>
				</q-list>
			</div>
		</q-card>
	</q-dialog>	
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
const COUNTRIES = require('../../../countries-info.json')

export default {
	data () {
		return {
			searchText: '',
			countries: COUNTRIES
		}
	},
	computed: {
		darkMode () {
	    return this.$store.getters['darkmode/getStatus']
	  },
	  filteredList () {
      if (!this.searchText) return this.countries

      const needle = String(this.searchText).toLowerCase()

      return this.countries
        .filter(country => {
          if (!this.searchText) return true
          if (!country) return false

          return String(country.name).toLowerCase().includes(needle) || 
                 String(country.code).toLowerCase().includes(needle)
        })
    }
	},
	methods: {
		getDarkModeClass,
		onOKClick (country) {
      this.$emit('ok', country)
      this.$refs.dialog.hide()
    }
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
}
</style>

