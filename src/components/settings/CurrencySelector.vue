<template>
  <q-btn 
    flat 
    align="left" 
    padding="0px"
    @click="openCurrencyDialog"
    class="full-width"
  >
    <span class="pt-label" :class="getDarkModeClass(darkMode)">{{ currentCurrencyLabel }}</span>
    <q-icon name="arrow_drop_down"/>
  </q-btn>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import CurrencyListDialog from './dialogs/CurrencyListDialog.vue'

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
  computed: {
    selectedCurrency () {
      return this.$store.getters['market/selectedCurrency']
    },
    currentCurrencyLabel () {
      return String(this.selectedCurrency?.symbol || '').toUpperCase()
    }
  },
  methods: {
    getDarkModeClass,
    openCurrencyDialog () {
      this.$q.dialog({
        component: CurrencyListDialog
      })
      .onOk(value => {
        this.$store.commit('market/updateSelectedCurrency', value)
        this.$store.dispatch('global/saveWalletPreferences')
        this.$store.dispatch('market/updateAssetPrices', {})
      })
    }
  },
  mounted () {
    this.$store.dispatch('market/updateSupportedCurrencies', {})
    this.$store.dispatch('global/refetchWalletPreferences')
  }
}
</script>
