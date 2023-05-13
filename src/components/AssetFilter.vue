<template>
  <q-btn-dropdown :content-style="{ backgroundColor: 'gray' }" unelevated class="float-right q-mr-md">
    <template v-slot:label>
      {{  tokenTypeLabel(assetId) }}
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
    },
    tokenTypeLabel (tokenType) {
      return {'ct': 'CashTokens', 'slp': 'SLP'}[tokenType]
    }
  }
}
</script>
