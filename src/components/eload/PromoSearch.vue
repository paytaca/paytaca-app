<template>
	<div>
		<q-input
			ref="searchInput"
			dense
			outlined
			clearable
			v-model="searchVal"
			:loading="loading"
			autocomplete="off"
			placeholder="Search for Promos..."
			color="pt-primary1"
			debounce="500"
			:bg-color="darkMode ? 'pt-dark' : 'pt-light'"
			@update:modelValue="search"
		>
			<template v-slot:append>
				<q-icon name="search" />
			</template>

			<q-menu
				v-if="searchVal"
				v-model="showPromos"
				fit
				no-focus
				max-height="60vh"
				class="q-pa-md"
				:style="{ width: inputWidth + 'px' }"
				:dark="darkMode"
				:content-class="darkMode ? 'bg-grey-10 text-white' : 'bg-white text-black'"
			>
				<div class="q-pt-sm">
					<div
						v-for="(promo, index) in searchResult"
						:key="index"
						class="promo-result"
						:class="darkMode ? 'text-white' : 'text-black'"
						@click="selectPromo(promo)"
					>
						<div class="md-font-size text-weight-bold text-overflow">
							{{ formatPromoLabel(promo) }}
						</div>

						<div class="sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
							{{ promo.amount }} PHP
						</div>

						<q-separator class="q-my-sm" :dark="darkMode"/>
					</div>

					<div
						v-if="!loading && searchResult.length === 0"
						class="text-center sm-font-size q-py-sm"
						:class="darkMode ? 'text-grey-5' : 'text-grey-8'"
					>
						No results
					</div>
				</div>
			</q-menu>
		</q-input>
	</div>
</template>

<script>
import * as eloadServiceAPI from 'src/utils/eload-service.js'

export default {
	emits: ['select-promo'],
	data () {
		return {
			darkMode: this.$store.getters['darkmode/getStatus'],
			searchVal: '',
			searchResult: [],
			loading: false,
			lastSearch: '',
			showPromos: false
		}
	},
	computed: {
		inputWidth () {
			const el = this.$refs.searchInput?.$el
			return el ? el.offsetWidth : 200
		}
	},
	props: {
		promoName: String
	},
	methods: {
		formatPromoLabel (promo) {
			const service = String(promo?.service || '').trim()
			const group = String(promo?.service_group || '').trim()
			const name = String(promo?.name || '').trim()
			return [service, group, name].filter(Boolean).join(' > ')
		},
		async selectPromo (promo) {
			this.showPromos = false

			const id = promo?.id
			const resp = id ? await eloadServiceAPI.fetchPromoDetails(id) : null
			const resolvedPromo = resp?.success ? resp.data : promo

			this.searchVal = resolvedPromo?.name || promo?.name || this.searchVal
			this.$emit('select-promo', resolvedPromo)
		},
		async search () {
			const q = typeof this.searchVal === 'string' ? this.searchVal.trim() : ''

			// Quasar `clearable` sets v-model to null; avoid calling the API with promoName=null.
			if (!q) {
				this.loading = false
				this.showPromos = false
				this.searchResult = []
				this.lastSearch = ''
				return
			}

			this.loading = true
			try {
				const result = await eloadServiceAPI.fetchPromo({ promoName: q })
				if (result.success) {
					this.searchResult = result.data.promos
					this.lastSearch = q
					this.showPromos = true
				}
			} finally {
				this.loading = false
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.sm-font-size {
	font-size: small;
}
.md-font-size {
	font-size: medium;
}
.lg-font-size {
	font-size: large;
}

.promo-result {
	cursor: pointer;
}
.text-overflow {
	white-space: normal;
	word-break: break-word;
	overflow-wrap: anywhere;
}
</style>