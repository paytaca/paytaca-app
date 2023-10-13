<template>
  <q-btn-dropdown
    :content-style="contentStyle"
    :text-color="darkMode ? 'white' : ''"
    unelevated class="float-right q-mr-md"
    :style="{color: darkMode ? 'white' : 'black'}"
  >
    <template v-slot:label>
      <TokenTypeBadge :assetId="assetId" :currentCountry="currentCountry" />
    </template>
    <q-list>
      <q-item clickable v-close-popup @click="filterTokens('ct')">
        <q-item-section>
          <q-item-label>{{ $t(this.isHongKong() ? 'CashPoints' : 'CashTokens') }}</q-item-label>
        </q-item-section>
      </q-item>
      <q-item clickable v-close-popup @click="filterTokens('slp')">
        <q-item-section>
          <q-item-label>{{ $t(this.isHongKong() ? 'SLPPoints' : 'SLPTokens') }}</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script>
import TokenTypeBadge from './TokenTypeBadge'

export default {
  components: {
    TokenTypeBadge,
  },
  data () {
    return {
      assetId: 'ct',
      darkMode: this.$store.getters['darkmode/getStatus'],
      currentCountry: this.$store.getters['global/country'].code
    }
  },
  methods: {
    filterTokens (tokenType) {
      this.assetId = tokenType
      this.$emit('filterTokens', tokenType === 'ct')
    },
    isHongKong () {
      return this.currentCountry === 'HK'
    }
  },
  computed: {
    contentStyle () {
      return {
        backgroundColor: this.darkMode ? '#1C2833' : 'white',
        color: this.darkMode ? 'white' : 'black'
      }
    }
  }
}
</script>
