<template>
  <q-select
    :style="{ width: this.$q.platform.is.mobile ? '75%' : '100%' }"
    v-model="country"
    :options="countryOptions"
    :dark="darkMode"
    @filter="filterCountries"
    popup-content-style="color: black;"
    dense
    use-input
    fill-input
    borderless
    hide-selected
  >
    <template v-slot:option="scope">
      <q-item
        v-bind="scope.itemProps"
      >
        <q-item-section> 
          <q-item-label :class="{ 'text-black': !darkMode && !scope.selected }" :data-country="scope.opt.label"> 
            {{ scope.opt.label }}
          </q-item-label>
          <q-item-label
            v-if="scope.opt.code"
            caption
            :class="{ 'text-black': !darkMode && !scope.selected }"
          >
            {{ scope.opt.code }}
          </q-item-label>
        </q-item-section>
      </q-item>
    </template>
  </q-select>
</template>

<script>

const COUNTRIES = require('../../countries-info.json')
import { supportedLangs } from '../../i18n'

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
        value: o.name,
        code: o.code
      }
    })
    this.countries = COUNTRIES
  },
  methods: {
    filterCountries (val, update) {
      if (!val) {
        this.countryOptions = this.defaultCountryOptions
      } else {
        const needle = String(val).toLowerCase()
        this.countryOptions = this.defaultCountryOptions
          .filter(lang =>
            String(lang && lang.label).toLowerCase().indexOf(needle) >= 0
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
          let language = Object.keys(supportedLangs).filter(langCode => langCode === selectedCountry.language)
          if (language.length === 0) {
            language = ['en-us']
          }
          this.$i18n.locale = language[0]
          vm.$store.commit('global/setLanguage', language[0])
          vm.$store.commit('global/setCountry', {
            country: selectedCountry,
            denomination: this.$store.getters['global/denomination']
          })

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
