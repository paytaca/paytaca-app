<template>
  <q-badge :color="color">
    <span :style="labelStyle">{{ tokenType }}</span>
  </q-badge>
</template>

<script>
export default {
  props: {
    assetId: {
      type: String,
      required: true
    },
    abbreviate: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    labelStyle () {
      if (this.tokenType.length > 4) {
        return 'font-size: 9px'
      }
      return ''
    },
    tokenType () {
      const assetId = this.assetId.split('/')[0].toUpperCase()
      if (assetId === 'CT') {
        if (!this.abbreviate) return this.$t('CashTokens')
      }
      if (assetId === 'SLP') {
        if (this.abbreviate) return 'SLP'
        return this.$t('SLPTokens')
      }
      return assetId
    },
    color () {
      const type = this.tokenType
      if ([this.$t('CashTokens'), 'CT'].includes(type))
        return 'teal-5'
      return 'blue-5'
    },
  }
}
</script>
