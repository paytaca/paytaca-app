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
      default: true
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
        if (!this.abbreviate) return 'CASHTOKENS'
      }
      if (assetId === 'SLP') {
        return 'SLP TOKENS'
      }
      return assetId
    },
    color () {
      const type = this.tokenType
      if (type === 'SLP')
        return 'grey-7'
      if (['CASHTOKENS', 'CT'].includes(type))
        return 'green-7'
      return 'blue-5'
    },
  }
}
</script>
