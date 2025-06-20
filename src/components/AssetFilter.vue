<template>
  <q-btn-dropdown
    :content-style="contentStyle"
    :text-color="darkMode ? 'white' : ''"
    unelevated class="float-right q-mr-md"
    style="color: white"
  >
    <template v-slot:label>
      <TokenTypeBadge :assetId="assetId" />
    </template>
    <q-list>
      <q-item clickable v-close-popup @click="filterTokens('ct')">
        <q-item-section>
          <q-item-label>{{ $t('CashTokens') }}</q-item-label>
        </q-item-section>
      </q-item>
      <q-item clickable v-close-popup @click="filterTokens('slp')">
        <q-item-section>
          <q-item-label>{{ $t('SLPTokens') }}</q-item-label>
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
      this.$emit('filterTokens', tokenType === 'ct')
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
