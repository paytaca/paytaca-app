<template>
  <q-select
    :style="{ width: this.$q.platform.is.mobile ? '75%' : '100%' }"
    dense
    use-input
    fill-input
    hide-selected
    borderless
    :dark="darkMode"
    :option-label="opt => String(opt && opt.name)" 
    v-model="selectedCurrency" id="selected-currency"
    :options="filteredCurrencyOptions"
    @filter="filterCurrencyOptionSelection"
  >
    <template v-slot:option="scope">
      <q-item
        v-bind="scope.itemProps"
      >
        <q-item-section>
          <q-item-label :class="{ 'text-black': !darkMode && !scope.selected }"> 
            {{ String(scope.opt.symbol).toUpperCase() }}
          </q-item-label>
          <q-item-label
            v-if="scope.opt.name"
            caption
            :class="{ 'text-black': !darkMode && !scope.selected }"
          >
            {{ scope.opt.name }}
          </q-item-label>
        </q-item-section>
      </q-item>
    </template>
  </q-select>
</template>

<script>
export default {
  props: {
    darkMode: {
      type: Boolean,
      default: false
    },
    width: {
      type: String,
      required: false
    }
  },
  data () {
    return {
      filteredCurrencyOptions: []
    }
  },
  methods: {
    filterCurrencyOptionSelection (val, update) {
      if (!val) {
        this.filteredCurrencyOptions = this.currencyOptions
      } else {
        const needle = String(val).toLowerCase()
        this.filteredCurrencyOptions = this.currencyOptions
          .filter(currency =>
            String(currency && currency.name).toLowerCase().indexOf(needle) >= 0 ||
            String(currency && currency.symbol).toLowerCase().indexOf(needle) >= 0
          )
      }

      update()
    }
  },
  computed: {
    currencyOptions () {
      return this.$store.getters['market/currencyOptions']
    },
    selectedCurrency: {
      get () {
        return this.$store.getters['market/selectedCurrency']
      },
      set (value) {
        this.$store.commit('market/updateSelectedCurrency', value)
        this.$store.dispatch('global/saveWalletPreferences')
      }
    }
  },
  watch: {
    selectedCurrency () {
      this.$store.dispatch('market/updateAssetPrices', {})
    }
  },
  mounted () {
    this.$store.dispatch('market/updateSupportedCurrencies', {})
    this.$store.dispatch('global/refetchWalletPreferences')
  }
}
</script>
