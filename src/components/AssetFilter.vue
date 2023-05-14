<template>
  <q-btn-dropdown
    :content-style="contentStyle"
    unelevated class="float-right q-mr-md"
  >
    <template v-slot:label>
      <TokenTypeBadge :assetId="assetId" :abbreviate="assetId !== 'ct'" />
    </template>
    <q-list>
      <q-item clickable v-close-popup @click="filterTokens('ct')">
        <q-item-section>
          <q-item-label>CashTokens</q-item-label>
        </q-item-section>
      </q-item>
      <q-item clickable v-close-popup @click="filterTokens('slp')">
        <q-item-section>
          <q-item-label>SLP Tokens</q-item-label>
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
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    filterTokens (tokenType) {
      this.assetId = tokenType
      this.$emit('filterTokens', tokenType)
    }
  },
  computed: {
    contentStyle () {
      return {
        backgroundColor: this.darkMode ? '#1C2833' : 'white',
        color: this.darkMode ? 'white' : 'black'
      }
    },
    tokenTypeLabel (tokenType) {
      return {'ct': 'CashTokens', 'slp': 'SLP Tokens'}[tokenType]
    }
  }
}
</script>
