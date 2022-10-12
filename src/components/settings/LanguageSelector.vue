<template>
  <q-select
    :style="{ width: $q.platform.is.mobile === true ? '50%' : '100%' }"
    v-model="locale"
    :options="localeOptions"
    :dark="darkMode"
    @filter="filterLangSelection"
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
      langs: [
        'English',
        'Spanish',
      ],
      defaultLocaleOptions: [
        { value: 'en-us', label: this.$t('English') },
        { value: 'es', label: this.$t('Spanish') }
      ],
      localeOptions: []
    }
  },
  methods: {
    filterLangSelection (val, update) {
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
      this.$i18n.locale = n.value
      this.defaultLocaleOptions = this.defaultLocaleOptions.filter((o, index) => {
        o.label = this.$t(this.langs[index])
        
        if (n.value === o.value) {
          this.$q.localStorage.set('lang', this.langs[index])
        }
        return o
      })
    }
  }
}
</script>
