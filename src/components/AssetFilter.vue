<template>
  <q-btn-dropdown id="token-popup"
    :content-style="contentStyle"
    :text-color="darkMode ? 'white' : ''"
    unelevated class="q-mr-md"
    :style="{color: darkMode ? 'white' : 'black'}"
    :class="float ? 'float-right' : ''"
  >
    <template v-slot:label>
      <TokenTypeBadge :assetId="assetId" />
    </template>
    <q-list>
      <q-item 
        clickable v-close-popup @click="filterTokens('ct')">
        <q-item-section>
          <q-item-label id="CashTokens">{{ $t('CashTokens') }}</q-item-label>
        </q-item-section>
      </q-item>
      <q-item clickable v-close-popup @click="filterTokens('slp')">
        <q-item-section>
          <q-item-label id="SLPtokens">{{ $t('SLPTokens') }}</q-item-label>
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
  props: {
    float: {
      type: Boolean,
      default: true
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
