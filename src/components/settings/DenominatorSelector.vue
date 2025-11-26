<template>
  <q-select
    v-model="denomination"
    :options="denominationDisplayOptions"
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
export default {
  props: {
    darkMode: { type: Boolean, default: false }
  },
  data () {
    return {
      denominationOptions: [
        { value: 'BCH', label: 'BCH' },
        { value: 'mBCH', label: 'mBCH' },
        { value: 'Satoshis', label: 'Satoshis' }
      ]
    }
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
    denominationDisplayOptions () {
      let options = [...this.denominationOptions]
      // Handle Hong Kong specific DEEM option
      // Only add DEEM if i18n is available and country is HK
      if (this.currentCountry === 'HK' && this.$i18n && this.$i18n.global) {
        try {
          const deemValue = this.$t('DEEM')
          if (deemValue && deemValue !== 'DEEM' && !options.some((a) => a.value === deemValue)) {
            options.push({ value: deemValue, label: deemValue })
          }
        } catch (error) {
          // i18n might not be initialized yet, skip DEEM option
          console.warn('Could not translate DEEM:', error)
        }
      } else if (this.currentCountry !== 'HK') {
        // Remove DEEM option if country is not HK
        try {
          if (this.$i18n && this.$i18n.global) {
            const deemValue = this.$t('DEEM')
            if (deemValue) {
              options = options.filter(a => a.value !== deemValue)
            }
          }
        } catch (error) {
          // Ignore if i18n not available
        }
      }
      return options
    },
    denomination: {
      get () {
        const currentDenom = this.$store.getters['global/denomination']
        // Return the full option object instead of just the string
        const found = this.denominationDisplayOptions.find(opt => opt.value === currentDenom)
        return found || { value: 'BCH', label: 'BCH' }
      },
      set (denom) {
        const newDenomination = denom.value
        this.$store.commit('global/setDenomination', newDenomination)
      }
    }
  },
  watch: {
    language () {
      try {
        const currentDenomValue = this.denomination.value
        const deemValue = this.$t('DEEM')
        if (this.currentCountry === 'HK' &&
            this.language !== 'zh-tw' &&
            currentDenomValue !== deemValue &&
            !['BCH', 'mBCH', 'Satoshis'].includes(currentDenomValue)
        ) {
          this.$store.commit('global/setDenomination', 'DEEM')
        } else if (!['BCH', 'mBCH', 'Satoshis', 'DEEM'].includes(currentDenomValue)) {
          // Only translate if it's not a standard denomination
          try {
            const translatedDenom = this.$t(currentDenomValue)
            this.$store.commit('global/setDenomination', translatedDenom)
          } catch (error) {
            // If translation fails, keep current denomination
            console.warn('Could not translate denomination:', currentDenomValue, error)
          }
        }
      } catch (error) {
        console.warn('Error in language watcher:', error)
      }
    }
  }
}
</script>
