<template>
  <q-select
    v-model="theme"
    :options="themeOptions"
    :dark="darkMode"
    :color="themeColor"
    dense
    outlined
    rounded
    hide-bottom-space
    class="glass-input"
  >
    <template v-slot:option="scope">
      <q-item v-bind="scope.itemProps">
        <q-item-section>
          <q-item-label :style="darkMode ? 'color: white;' : 'color: black;'">
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
  computed: {
    currentCountry () {
      return this.$store.getters['global/country'].code
    },
    language () {
      return this.$store.getters['global/language'].value
    },
    themeColor () {
      const themeMap = {
        'glassmorphic-blue': 'blue-6',
        'glassmorphic-green': 'green-6',
        'glassmorphic-gold': 'orange-6',
        'glassmorphic-red': 'pink-6'
      }
      const currentTheme = this.$store.getters['global/theme']
      return themeMap[currentTheme] || 'blue-6'
    },
    themeOptions() {
      const themes = [
        { value: 'glassmorphic-blue', label: this.$t('GlassmorphicBlue') },
        { value: 'glassmorphic-red', label: this.$t('GlassmorphicRed') },
        { value: 'glassmorphic-green', label: this.$t('GlassmorphicGreen') },
        { value: 'glassmorphic-gold', label: this.$t('GlassmorphicGold') },
      ]
      return themes
    },
    theme: {
      get () {
        const currentTheme = this.$store.getters['global/theme']
        let filteredTheme = ''
        try {
          filteredTheme = this.themeOptions.filter(a => a.value === currentTheme)[0]
        } catch {
          filteredTheme = { value: 'glassmorphic-blue', label: this.$t('GlassmorphicBlue') }
        }
        return filteredTheme
      },
      set (th) {
        const newTheme = th.value
        this.$store.commit('global/setTheme', newTheme)
        updateCssThemeColors(newTheme);
      }
    }
  }
}
</script>
