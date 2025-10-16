<template>
  <q-btn-dropdown
    unelevated
    class="denomination-text-dropdown"
    v-if="selectedNetwork === 'BCH'"
    :style="{color: darkMode ? 'white' : 'black'}"
  >
    <q-list v-for="denom in denominationOptions" :key="denom.id" :style="{color: darkMode ? 'white' : 'black'}">
      <q-item clickable v-close-popup @click="selectDenomination(denom.value)">
        <q-item-section>
          <q-item-label>{{denom.label}}</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script>

export default {
  props: {
    selectedNetwork: { type: String },
    darkMode: { type: Boolean },
    theme: { type: String },
    currentCountry: { type: String }
  },
  emits: ['on-selected-denomination'],
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
  methods: {
    selectDenomination (value) {
      this.$emit('on-selected-denomination', value)
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
