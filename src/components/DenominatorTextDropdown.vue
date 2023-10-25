<template>
  <q-btn-dropdown
    unelevated
    class="denomination-text-dropdown"
    v-if="selectedNetwork !== 'sBCH'"
    :text-color="darkMode ? white : black"
  >
    <template v-slot:label>
      <div style="font-size: 24px;" :class="{'text-grad' : isDefaultTheme(theme)}">
        {{ denomination }}
      </div>
    </template>

    <q-list v-for="denom in denominationOptions" :key="denom.id">
      <q-item clickable v-close-popup @click="selectDenomination(denom.value)">
        <q-item-section>
          <q-item-label>{{denom.label}}</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script>
import { isDefaultTheme } from 'src/utils/theme-darkmode-utils'

export default {
  props: {
    selectedNetwork: { type: String },
    darkMode: { type: Boolean },
    theme: { type: String },
    currentCountry: { type: String }
  },
  data () {
    return {
      denominationOptions: [
        { id: 0, value: 'BCH', label: 'BCH' },
        { id: 1, value: 'mBCH', label: 'mBCH' },
        { id: 2, value: 'Satoshis', label: 'Satoshis' }
      ]
    }
  },
  mounted () {
    if (this.denominationOptions.length > 3) {
      this.denominationOptions.pop()
    }
    if (this.currentCountry === 'HK' && !this.denominationOptions.some((a) => a.value === this.$t('DEEM'))) {
      this.denominationOptions.push({ value: this.$t('DEEM'), label: this.$t('DEEM') })
    } else if (this.currentCountry !== 'HK' && this.denominationOptions.some((a) => a.value === this.$t('DEEM'))) {
      this.denominationOptions.pop()
    }
  },
  computed: {
    denomination () {
      return this.$store.getters['global/denomination']
    },
    language () {
      return this.$store.getters['global/language'].value
    }
  },
  methods: {
    isDefaultTheme,
    selectDenomination (value) {
      console.log('denomination click yey', value)
    }
  }
}
</script>

<style scoped>
.denomination-text-dropdown {
  padding: 0;
  font-weight: 500;
}
</style>
