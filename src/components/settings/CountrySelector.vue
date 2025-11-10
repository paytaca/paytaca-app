<template>
  <q-btn 
    flat 
    align="left" 
    padding="0px"
    @click="openCountryDialog"
    class="full-width"
  >
    <span class="pt-label" :class="getDarkModeClass(darkMode)">{{ currentCountry }}</span>
    <q-icon name="arrow_drop_down"/>
  </q-btn>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import CountryListDialog from './dialogs/CountryListDialog.vue'
import { supportedLangs } from '../../i18n'

export default {
  props: {
    darkMode: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    currentCountry () {
      return this.$store.getters['global/country'].name
    },
    currencyOptions () {
      return this.$store.getters['market/currencyOptions']
    }
  },
  methods: {
    getDarkModeClass,
    openCountryDialog () {
      const vm = this
      this.$q.dialog({
        component: CountryListDialog
      })
      .onOk(selectedCountry => {
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
        }
        
        // Persist preferences to backend if wallet hash exists
        vm.$store.dispatch('global/saveWalletPreferences').catch(() => {
          // Silently fail if wallet hash doesn't exist yet (e.g., during registration)
        })
      })
    }
  }
}
</script>
