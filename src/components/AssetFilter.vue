<template>
  <q-btn-dropdown unelevated class="float-right q-mr-md">
    <template v-slot:label>
      <TokenTypeBadge :assetId="assetId" />
    </template>
    <q-list>
      <q-item clickable v-close-popup @click="filterTokens('slp')">
        <q-item-section>
          <q-item-label>SLP Tokens</q-item-label>
        </q-item-section>
      </q-item>

      <q-item clickable v-close-popup @click="filterTokens('ct')">
        <q-item-section>
          <q-item-label>CashTokens</q-item-label>
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
      assetId: 'slp'
    }
  },
  methods: {
    filterTokens (tokenType) {
      this.assetId = tokenType
      this.$emit('filterTokens', tokenType)
    }
  }
}
</script>
