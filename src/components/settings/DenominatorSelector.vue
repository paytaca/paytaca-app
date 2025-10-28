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
      if (this.currentCountry === 'HK' && !options.some((a) => a.value === this.$t('DEEM'))) {
        options.push({ value: this.$t('DEEM'), label: this.$t('DEEM') })
      } else if (this.currentCountry !== 'HK' && options.some((a) => a.value === this.$t('DEEM'))) {
        options = options.filter(a => a.value !== this.$t('DEEM'))
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
      const currentDenomValue = this.denomination.value
      if (this.currentCountry === 'HK' &&
          this.language !== 'zh-tw' &&
          currentDenomValue !== this.$t('DEEM') &&
          !['BCH', 'mBCH', 'Satoshis'].includes(currentDenomValue)
      ) {
        this.$store.commit('global/setDenomination', 'DEEM')
      } else {
        const translatedDenom = this.$t(currentDenomValue)
        this.$store.commit('global/setDenomination', translatedDenom)
      }
    }
  }
}
</script>
