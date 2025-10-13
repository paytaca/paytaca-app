<template>
  <q-select
    :style="{ width: this.$q.platform.is.mobile ? '75%' : '100%' }"
    v-model="theme"
    :options="filteredThemeOptions"
    :dark="darkMode"
    @filter="filterThemeSelection"
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
import { updateCssThemeColors } from 'src/utils/theme-utils';

export default {
  props: {
    darkMode: { type: Boolean }
  },
  data () {
    return {
      themeOptions: [
        { value: 'glassmorphic-blue', label: this.$t('GlassmorphicBlue') },
        { value: 'glassmorphic-red', label: this.$t('GlassmorphicRed') },
        { value: 'glassmorphic-green', label: this.$t('GlassmorphicGreen') },
        { value: 'glassmorphic-gold', label: this.$t('GlassmorphicGold') },
        { value: 'payhero', label: 'PayHero' }
      ],
      filteredThemeOptions: []
    }
  },
  computed: {
    currentCountry () {
      return this.$store.getters['global/country'].code
    },
    language () {
      return this.$store.getters['global/language'].value
    },
    themeOptions() {
      const themes = [
        { value: 'glassmorphic-blue', label: this.$t('GlassmorphicBlue') },
        { value: 'glassmorphic-red', label: this.$t('GlassmorphicRed') },
        { value: 'glassmorphic-green', label: this.$t('GlassmorphicGreen') },
        { value: 'glassmorphic-gold', label: this.$t('GlassmorphicGold') },
      ]
      if (this.currentCountry === 'HK') {
        themes.push({ value: 'payhero', label: 'PayHero' })
      }
      return themes
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
        updateCssThemeColors(newTheme);
      }
    }
  },
  methods: {
    filterThemeSelection (val, update) {
      if (val === '') {
        update(() => {
          this.filteredThemeOptions = this.themeOptions
        })
        return
      }

      update(() => {
        const needle = val.toLowerCase()
        this.filteredThemeOptions = this.themeOptions.filter(v => v.label.toLowerCase().indexOf(needle) > -1)
      })
    }
  },
  watch: {
    language () {
      this.themeOptions[0].label = this.$t('GlassmorphicBlue')
      this.themeOptions[1].label = this.$t('GlassmorphicRed')
      this.themeOptions[2].label = this.$t('GlassmorphicGreen')
      this.themeOptions[3].label = this.$t('GlassmorphicGold')
    }
  }
}
</script>
