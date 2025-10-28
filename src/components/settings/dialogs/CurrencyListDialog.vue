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
		        <div class="text-bold q-space q-mt-sm pt-label" :class="getDarkModeClass(darkMode)">{{ $t('SelectCurrency') }}</div>
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
		          :placeholder="$t('SearchCurrency')"
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
						v-for="currency in filteredList" 
						@click="onOKClick(currency)" 
						:key="currency.symbol"
					>
		        <q-item-section class="text-bold">
							{{ String(currency.symbol).toUpperCase() }}
						</q-item-section>
						<q-item-section side>
							<q-item-label caption>{{ currency.name }}</q-item-label>
						</q-item-section>
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
		currencies () {
			return this.$store.getters['market/currencyOptions']
		},
	  filteredList () {
      if (!this.searchText) return this.currencies

      const needle = String(this.searchText).toLowerCase()

      return this.currencies
        .filter(currency => {
          if (!this.searchText) return true
          if (!currency) return false

          return String(currency.name).toLowerCase().includes(needle) || 
                 String(currency.symbol).toLowerCase().includes(needle)
        })
    }
	},
	mounted () {
		this.$store.dispatch('market/updateSupportedCurrencies', {})
	},
	methods: {
		getDarkModeClass,
		onOKClick (currency) {
      this.$emit('ok', currency)
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

