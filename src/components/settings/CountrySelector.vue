<template>
  <q-select
    :style="{ width: $q.platform.is.mobile === true ? '50%' : '100%' }"
    v-model="country"
    :options="countryOptions"
    :dark="darkMode"
    @filter="filtercountrieselection"
    popup-content-style="color: black;"
    dense
    use-input
    fill-input
    borderless
    hide-selected
  ></q-select>
</template>

<script>

const COUNTRIES = require('../../countries-info.json')

export default {
  props: {
    darkMode: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      country: this.$store.getters['global/country'].name,
      countries: [],
      defaultCountryOptions: [],
      countryOptions: []
    }
  },
  computed: {
    currencyOptions () {
      return this.$store.getters['market/currencyOptions']
    }
  },
  async mounted () {
    this.defaultCountryOptions = COUNTRIES.map(o => {
      return {
        label: o.name,
        value: o.name
      }
    })
    this.countries = COUNTRIES
  },
  methods: {
    filtercountrieselection (val, update) {
      if (!val) {
        this.countryOptions = this.defaultCountryOptions
      } else {
        const needle = String(val).toLowerCase()
        this.countryOptions = this.defaultCountryOptions
          .filter(lang =>
            String(lang && lang.label).toLowerCase().indexOf(needle) >= 0 ||
            String(lang && lang.value).toLowerCase().indexOf(needle) >= 0
          )
      }

      update()
    }
  },
  watch: {
    country (n, o) {
      const vm = this

      this.defaultCountryOptions = this.defaultCountryOptions.filter((o, index) => {
        o.label = vm.countries[index].name
        
        if (n.value === o.value) {
          const selectedCountry = vm.countries[index]
          vm.$store.commit('global/setCountry', selectedCountry)

          let currency = vm.currencyOptions.filter(o => o.symbol === selectedCountry.currency)

          if (currency.length !== 0) {
            currency = currency[0]
            vm.$store.commit('market/updateSelectedCurrency', currency)
            vm.$store.dispatch('global/saveWalletPreferences')
          }
        }
        return o
      })
    }
  }
}
</script>
