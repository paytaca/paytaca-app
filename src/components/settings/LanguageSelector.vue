<template>
  <q-select
    :style="{ width: $q.platform.is.mobile === true ? '50%' : '100%' }"
    v-model="locale"
    :options="localeOptions"
    :dark="darkMode"
    :option-label="localeOptions[locale]"
    @filter="filterCurrencyOptionSelection"
    dense
    use-input
    fill-input
    borderless
    hide-selected
  />
</template>

<script>
export default {
  props: {
    darkMode: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      locale: this.$q.localStorage.getItem('lang'),
      defaultLocaleOptions: [
        { value: 'en-us', label: 'English' },
        { value: 'es', label: 'Spanish' }
      ],
      localeOptions: [
        { value: 'en-us', label: 'English' },
        { value: 'es', label: 'Spanish' }
      ]
    }
  },
  methods: {
    filterCurrencyOptionSelection (val, update) {
      if (!val) {
        this.localeOptions = this.defaultLocaleOptions
      } else {
        const needle = String(val).toLowerCase()
        this.localeOptions = this.defaultLocaleOptions
          .filter(lang =>
            String(lang && lang.label).toLowerCase().indexOf(needle) >= 0
          )
      }

      update()
    }
  },
  watch: {
    locale (n, o) {
      this.$i18n.locale = n
      this.$q.localStorage.set('lang', n)
    }
  }
}
</script>
