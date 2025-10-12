<template>
  <q-select
    :style="{ width: this.$q.platform.is.mobile ? '75%' : '100%' }"
    v-model="theme"
    :options="themeOptions"
    :dark="darkMode"
    @filter="filterThemeSelection"
    popup-content-style="color: black;"
    dense
    use-input
    fill-input
    borderless
    hide-selected
  >
    <template v-slot:option="scope">
      <q-item v-bind="scope.itemProps">
        <q-item-section>
          <q-item-label :class="{ 'text-black': !darkMode && !scope.selected }">
            {{ scope.opt.label }}
          </q-item-label>
        </q-item-section>
      </q-item>
    </template>
  </q-select>
</template>

<script>
export default {
  props: {
    darkMode: { type: Boolean }
  },
  data () {
    return {
      themeOptions: [
        { value: 'glassmorphic-blue', label: this.$t('GlassmorphicBlue') },
        { value: 'glassmorphic-red', label: this.$t('GlassmorphicRed') },
        { value: 'payhero', label: 'PayHero' }
      ],
      filteredThemeOptions: []
    }
  },
  methods: {
    filterThemeSelection (val, update) {
      if (!val) {
        this.filteredThemeOptions = this.hkSelection(this.themeOptions)
      } else {
        const needle = String(val).toLowerCase()
        this.filteredThemeOptions = this.hkSelection(this.themeOptions)
          .filter(denom => String(denom?.label).toLowerCase().indexOf(needle) >= 0)
      }
      update()
    },
    hkSelection (options) {
      // get rid of duplicate PayHero entry from language switching
      if (options.length > 1) {
        options.pop()
      }
      if (this.currentCountry === 'HK' && !options.some((a) => a.value === 'PayHero')) {
        options.push({ value: 'payhero', label: 'PayHero' })
      } else if (this.currentCountry !== 'HK' && options.some((a) => a.value === 'PayHero')) {
        options.pop()
      }
      return options
    }
  },
  computed: {
    currentCountry () {
      return this.$store.getters['global/country'].code
    },
    language () {
      return this.$store.getters['global/language'].value
    },
    theme: {
      get () {
        const currentTheme = this.$store.getters['global/theme']
        let filteredTheme = ''
        try {
          filteredTheme = this.themeOptions.filter(a => a.value === currentTheme)[0].label
        } catch {
          filteredTheme = 'PayHero'
        }
        return filteredTheme
      },
      set (th) {
        const newTheme = th.value
        this.$store.commit('global/setTheme', newTheme)
      }
    }
  },
  watch: {
    language () {
      this.themeOptions[0].label = this.$t('GlassmorphicBlue')
    }
  }
}
</script>
